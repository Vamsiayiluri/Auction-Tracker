import { randomUUID } from "node:crypto";
import { Op, Transaction } from "sequelize";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  FestivalParticipant,
  SportAuction,
  SportAuctionBid,
  SportAuctionConfig,
  SportAuctionPool,
  SportAuctionResult,
  SportOperationAudit,
  SportTeam,
  SportTeamCaptain,
  SportTeamMembership,
  SportTournament,
} from "../models/index.js";
import { io } from "../index.js";
import { getFestivalBidProgression } from "../utils/festivalBidProgression.js";
import {
  createFestivalAuctionDeadline,
  getFestivalAuctionRemainingMs,
} from "../utils/festivalAuctionTimer.js";
import {
  canManageFestivalTeamSports,
  findActiveSportCaptainForUser,
} from "../utils/sportTournamentAuthorization.js";
import { getSportTournamentReadiness } from "../utils/sportTournamentReadiness.js";
import { getSportTournamentBudgetSummary } from "../utils/sportTeamBudget.js";
import { getSportTournamentEligibility } from "../utils/sportTournamentEligibility.js";
import { createAuctionSynchronizationService } from "../utils/auctionSynchronization.js";
import {
  elapsedMs,
  logBidLatencyTrace,
  nowMs,
  payloadSizeBytes,
  requestCacheGetOrSet,
  transactionScopedCacheKey,
} from "../utils/requestPerformance.js";

const timers = new Map();
const DEADLINE_MATCH_TOLERANCE_MS = 1_500;
const roomName = (id) => `sport-auction:${id}`;
const emit = (id, event, payload) => io.to(roomName(id)).emit(event, payload);
const eventPayload = (sportTournamentId, payload = {}) => ({
  sportTournamentId,
  serverTime: new Date().toISOString(),
  ...payload,
});
const toNumber = (value) => Number(value || 0);
let sportSynchronizationService;
const durationMs = (config) => Number(config?.timerDurationSeconds || 20) * 1000;
const deadline = (config, now = Date.now()) =>
  createFestivalAuctionDeadline(now, durationMs(config));
const progression = (auction, config, currentBid = 0) =>
  getFestivalBidProgression({
    basePrice: auction.baseCredits,
    currentBid,
    incrementPercentage: config?.incrementPercentage || 20,
  });

const participantInclude = {
  model: FestivalParticipant,
  as: "participant",
  include: [{ model: Employee, as: "employee" }],
};
const compactParticipantInclude = {
  model: FestivalParticipant,
  as: "participant",
  attributes: ["id", "festivalId", "employeeId", "status", "registeredAt"],
  include: [
    {
      model: Employee,
      as: "employee",
      attributes: ["id", "name", "employeeNumber", "department", "gender"],
    },
  ],
};
const compactRoundAttributes = [
  "id",
  "sportTournamentId",
  "festivalParticipantId",
  "status",
  "baseCredits",
  "startedAt",
  "endsAt",
  "pausedRemainingMs",
  "attemptNumber",
  "finalizedAt",
];
const auctionInclude = [
  participantInclude,
  {
    model: SportAuctionBid,
    as: "bids",
    include: [{ model: SportTeam, as: "team" }],
    separate: true,
    order: [["placedAt", "ASC"], ["createdAt", "ASC"]],
  },
  {
    model: SportAuctionResult,
    as: "result",
    include: [{ model: SportTeam, as: "team" }],
  },
];

const clearTimer = (auctionId) => {
  const active = timers.get(auctionId);
  if (active) clearTimeout(active.timer);
  timers.delete(auctionId);
};

const HISTORY_LIMIT = 100;
const ACTIVITY_LIMIT = 50;

const loadConfig = (sportTournamentId, transaction, lock = false) =>
  requestCacheGetOrSet(
    transactionScopedCacheKey(
      "sport-auction-config",
      sportTournamentId,
      transaction,
      lock ? "lock" : "read"
    ),
    () => SportAuctionConfig.findOne({
      where: { sportTournamentId },
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    })
  );

const loadCurrentRound = async (config, transaction, lock = false) => {
  if (!config?.currentParticipantId) return null;
  return SportAuction.findOne({
    where: {
      sportTournamentId: config.sportTournamentId,
      festivalParticipantId: config.currentParticipantId,
    },
    order: [["attemptNumber", "DESC"]],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
};

const highestBid = (auctionId, transaction, lock = false) =>
  SportAuctionBid.findOne({
    where: { sportAuctionId: auctionId },
    order: [["amount", "DESC"], ["createdAt", "ASC"]],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });

const toConfig = (config) => config ? ({
  id: config.id,
  sportTournamentId: config.sportTournamentId,
  timerDurationSeconds: Number(config.timerDurationSeconds),
  incrementPercentage: Number(config.incrementPercentage),
  reauctionEnabled: Boolean(config.reauctionEnabled),
  currentParticipantId: config.currentParticipantId,
  startedAt: config.startedAt,
  completedAt: config.completedAt,
}) : null;

const toBid = (bid, index) => ({
  id: bid.id,
  sportAuctionId: bid.sportAuctionId,
  sportTeamId: bid.sportTeamId,
  teamName: bid.team?.name,
  amount: toNumber(bid.amount),
  placedAt: bid.placedAt,
  bidNumber: index + 1,
});

const toRound = (auction, config) => {
  if (!auction) return null;
  const bids = (auction.bids || []).map(toBid);
  const lead = bids.at(-1);
  const bidProgression = progression(
    auction,
    config,
    lead?.amount ?? 0
  );
  const pending = auction.status === "pending";
  return {
    id: auction.id,
    sportTournamentId: auction.sportTournamentId,
    festivalParticipantId: auction.festivalParticipantId,
    participant: auction.participant ? {
      id: auction.participant.id,
      employee: auction.participant.employee,
    } : undefined,
    status: auction.status,
    lifecycleState: auction.status === "live" ? "ACTIVE" : pending ? "OWNER_DECISION" : auction.status.toUpperCase(),
    adminActions: {
      extend: pending,
      sell: pending && Boolean(lead),
      unsold: pending && !lead,
    },
    baseCredits: bidProgression.basePrice,
    currentCredits: bidProgression.currentBid,
    nextCredits: bidProgression.nextBid,
    incrementPercentage: bidProgression.incrementPercentage,
    incrementCredits: bidProgression.incrementAmount,
    leadingTeam: lead?.teamName || null,
    bidCount: bids.length,
    bids,
    attemptNumber: auction.attemptNumber,
    startedAt: auction.startedAt,
    endsAt: auction.endsAt,
    pausedRemainingMs: auction.pausedRemainingMs,
    finalizedAt: auction.finalizedAt,
    result: auction.result ? {
      id: auction.result.id,
      outcome: auction.result.outcome,
      sportTeamId: auction.result.sportTeamId,
      teamName: auction.result.team?.name,
      finalCredits: auction.result.finalCredits === null
        ? null
        : toNumber(auction.result.finalCredits),
      finalizedAt: auction.result.finalizedAt,
    } : null,
  };
};

const groupedCountMap = (rows, key = "state") =>
  new Map(
    rows.map((row) => {
      const plain =
        typeof row?.get === "function" ? row.get({ plain: true }) : row;
      return [plain[key], Number(plain.count || 0)];
    })
  );

const toCompactRound = async (auction, config, transaction) => {
  if (!auction) return null;
  const [lead, bidCount] = await Promise.all([
    SportAuctionBid.findOne({
      where: { sportAuctionId: auction.id },
      attributes: ["id", "sportAuctionId", "sportTeamId", "amount", "placedAt"],
      include: [{ model: SportTeam, as: "team", attributes: ["id", "name"] }],
      order: [["amount", "DESC"], ["createdAt", "ASC"]],
      transaction,
    }),
    SportAuctionBid.count({
      where: { sportAuctionId: auction.id },
      transaction,
    }),
  ]);
  const currentBid = lead ? toNumber(lead.amount) : 0;
  const bidProgression = progression(auction, config, currentBid);
  const pending = auction.status === "pending";
  return {
    id: auction.id,
    sportTournamentId: auction.sportTournamentId,
    festivalParticipantId: auction.festivalParticipantId,
    participant: auction.participant
      ? {
          id: auction.participant.id,
          employee: auction.participant.employee
            ? {
                id: auction.participant.employee.id,
                name: auction.participant.employee.name,
                employeeNumber: auction.participant.employee.employeeNumber,
                department: auction.participant.employee.department,
                gender: auction.participant.employee.gender,
              }
            : null,
        }
      : undefined,
    status: auction.status,
    lifecycleState: auction.status === "live" ? "ACTIVE" : pending ? "OWNER_DECISION" : auction.status.toUpperCase(),
    adminActions: {
      extend: pending,
      sell: pending && Boolean(lead),
      unsold: pending && !lead,
    },
    baseCredits: bidProgression.basePrice,
    currentCredits: bidProgression.currentBid,
    nextCredits: bidProgression.nextBid,
    incrementPercentage: bidProgression.incrementPercentage,
    incrementCredits: bidProgression.incrementAmount,
    leadingTeam: lead?.team?.name || null,
    bidCount,
    bids: lead
      ? [
          {
            id: lead.id,
            sportAuctionId: lead.sportAuctionId,
            sportTeamId: lead.sportTeamId,
            teamName: lead.team?.name,
            amount: currentBid,
            placedAt: lead.placedAt,
            bidNumber: bidCount,
          },
        ]
      : [],
    attemptNumber: auction.attemptNumber,
    startedAt: auction.startedAt,
    endsAt: auction.endsAt,
    pausedRemainingMs: auction.pausedRemainingMs,
    finalizedAt: auction.finalizedAt,
    result: null,
  };
};

const loadRoundResponse = (id) =>
  SportAuction.findByPk(id, { include: auctionInclude });

const loadSportAuctionSharedState = async (sportTournamentId, transaction) => {
  const tournament = await SportTournament.findByPk(sportTournamentId, {
    transaction,
  });
  if (!tournament) return null;
  const config = await loadConfig(tournament.id, transaction);
  const round = config?.currentParticipantId
    ? await SportAuction.findOne({
        where: {
          sportTournamentId: tournament.id,
          festivalParticipantId: config.currentParticipantId,
        },
        include: auctionInclude,
        order: [["attemptNumber", "DESC"]],
        transaction,
      })
    : null;
  const [budgets, poolEntries, results, memberships] = await Promise.all([
    getSportTournamentBudgetSummary(tournament.id, transaction),
    SportAuctionPool.findAll({
      where: { sportTournamentId: tournament.id },
      include: [participantInclude],
      order: [["state", "ASC"], ["updatedAt", "DESC"]],
      transaction,
    }),
    SportAuctionResult.findAll({
      where: { sportTournamentId: tournament.id },
      transaction,
    }),
    SportTeamMembership.findAll({
      where: { sportTournamentId: tournament.id },
      include: [{ model: SportTeam, as: "team" }, participantInclude],
      order: [["assignedAt", "ASC"]],
      transaction,
    }),
  ]);
  const rostersByTeamId = new Map();
  memberships.forEach((membership) => {
    const roster = rostersByTeamId.get(membership.sportTeamId) || [];
    roster.push({
      id: membership.id,
      source: membership.source,
      assignedAt: membership.assignedAt,
      participant: membership.participant
        ? {
            id: membership.participant.id,
            employee: membership.participant.employee,
          }
        : null,
    });
    rostersByTeamId.set(membership.sportTeamId, roster);
  });
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
    },
    config: toConfig(config),
    current: toRound(round, config),
    budgets,
    pool: poolEntries.map((entry) => ({
      id: entry.id,
      festivalParticipantId: entry.festivalParticipantId,
      state: entry.state,
      reauctionCount: Number(entry.reauctionCount || 0),
      isCurrent: entry.festivalParticipantId === config?.currentParticipantId,
      participant: entry.participant
        ? {
            id: entry.participant.id,
            employee: entry.participant.employee,
          }
        : null,
    })),
    counts: {
      available: poolEntries.filter(
        ({ state, festivalParticipantId }) =>
          state === "available" &&
          festivalParticipantId !== config?.currentParticipantId
      ).length,
      sold: poolEntries.filter(({ state }) => state === "sold").length,
      unsold: poolEntries.filter(({ state }) => state === "unsold").length,
      soldAttempts: results.filter(({ outcome }) => outcome === "sold").length,
      unsoldAttempts: results.filter(({ outcome }) => outcome === "unsold")
        .length,
    },
    teams: budgets.teams.map((budget) => ({
      ...budget,
      roster: rostersByTeamId.get(budget.sportTeamId) || [],
    })),
  };
};

const loadSportAuctionSummaryState = async (
  tournament,
  { includeTeamContext = false } = {},
  transaction
) => {
  if (!tournament) return null;
  const config = await loadConfig(tournament.id, transaction);
  const roundPromise = config?.currentParticipantId
    ? SportAuction.findOne({
        where: {
          sportTournamentId: tournament.id,
          festivalParticipantId: config.currentParticipantId,
        },
        attributes: compactRoundAttributes,
        include: [compactParticipantInclude],
        order: [["attemptNumber", "DESC"]],
        transaction,
      })
    : Promise.resolve(null);
  const countRowsPromise = SportAuctionPool.count({
    where: { sportTournamentId: tournament.id },
    attributes: ["state"],
    group: ["state"],
    transaction,
  });
  const resultCountRowsPromise = SportAuctionResult.count({
    where: { sportTournamentId: tournament.id },
    attributes: ["outcome"],
    group: ["outcome"],
    transaction,
  });
  const teamContextPromise = includeTeamContext
    ? Promise.all([
        getSportTournamentBudgetSummary(tournament.id, transaction),
        SportTeamMembership.count({
          where: { sportTournamentId: tournament.id },
          attributes: ["sportTeamId"],
          group: ["sportTeamId"],
          transaction,
        }),
      ])
    : Promise.resolve([null, []]);

  const [round, countRows, resultCountRows, [budgets, rosterCountRows]] = await Promise.all([
    roundPromise,
    countRowsPromise,
    resultCountRowsPromise,
    teamContextPromise,
  ]);
  const countsByState = groupedCountMap(countRows);
  const countsByOutcome = groupedCountMap(resultCountRows, "outcome");
  const rosterCounts = groupedCountMap(rosterCountRows, "sportTeamId");
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
    },
    config: toConfig(config),
    current: await toCompactRound(round, config, transaction),
    budgets,
    pool: [],
    counts: {
      available: countsByState.get("available") || 0,
      sold: countsByState.get("sold") || 0,
      unsold: countsByState.get("unsold") || 0,
      soldAttempts: countsByOutcome.get("sold") || 0,
      unsoldAttempts: countsByOutcome.get("unsold") || 0,
    },
    teams: (budgets?.teams || []).map((budget) => ({
      ...budget,
      roster: new Array(rosterCounts.get(budget.sportTeamId) || 0).fill(null),
    })),
  };
};

const loadSportAuctionHistory = async (sportTournamentId, transaction) => {
  const [rounds, audits, config] = await Promise.all([
    SportAuction.findAll({
      where: { sportTournamentId },
      include: auctionInclude,
      order: [["startedAt", "DESC"]],
      limit: HISTORY_LIMIT,
      transaction,
    }),
    SportOperationAudit.findAll({
      where: { sportTournamentId },
      order: [["createdAt", "DESC"]],
      limit: ACTIVITY_LIMIT,
      transaction,
    }),
    loadConfig(sportTournamentId, transaction),
  ]);
  return {
    history: rounds.map((round) => toRound(round, config)),
    audits: audits.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityId: entry.entityId,
      details: entry.details,
      createdAt: entry.createdAt,
    })),
  };
};

const parseIds = (ids) =>
  String(ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const recentSportOutcome = (result) => ({
  id: result.id,
  auctionId: result.sportAuctionId,
  sportTournamentId: result.sportTournamentId,
  type: "Sport Auction",
  title:
    result.participant?.employee?.name ||
    result.participant?.name ||
    "Participant",
  outcome: result.outcome,
  teamName: result.team?.name,
  value: result.finalCredits === null ? null : toNumber(result.finalCredits),
  unit: "credits",
  date: result.finalizedAt,
});

const loadRecentSportOutcomes = async (sportTournamentIds) => {
  if (!sportTournamentIds.length) return new Map();
  const results = await SportAuctionResult.findAll({
    where: { sportTournamentId: { [Op.in]: sportTournamentIds } },
    attributes: [
      "id",
      "sportAuctionId",
      "sportTournamentId",
      "festivalParticipantId",
      "sportTeamId",
      "outcome",
      "finalCredits",
      "finalizedAt",
    ],
    include: [
      {
        model: FestivalParticipant,
        as: "participant",
        attributes: ["id", "employeeId"],
        include: [{ model: Employee, as: "employee", attributes: ["id", "name"] }],
      },
      { model: SportTeam, as: "team", attributes: ["id", "name"] },
    ],
    order: [["finalizedAt", "DESC"]],
    limit: 20,
  });
  const byTournamentId = new Map();
  results.forEach((result) => {
    const list = byTournamentId.get(result.sportTournamentId) || [];
    list.push(recentSportOutcome(result));
    byTournamentId.set(result.sportTournamentId, list);
  });
  return byTournamentId;
};

export const getSportAuctionSynchronizationSnapshot = async (
  sportTournamentId
) => {
  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      readOnly: true,
    },
    async (transaction) => {
      const [state, historyPayload] = await Promise.all([
        loadSportAuctionSharedState(sportTournamentId, transaction),
        loadSportAuctionHistory(sportTournamentId, transaction),
      ]);
      return { state, ...historyPayload };
    }
  );
};

export const getSportAuctionSummaries = async (req, res) => {
  try {
    const requestedIds = parseIds(req.query.ids);
    const currentStatuses = new Set(parseIds(req.query.currentStatuses));
    const includeReadiness = req.query.includeReadiness !== "false";
    const includeOutcomes = req.query.includeOutcomes !== "false";
    const tournaments = await SportTournament.findAll({
      where: requestedIds.length ? { id: { [Op.in]: requestedIds } } : undefined,
      attributes: [
        "id",
        "festivalId",
        "festivalTeamId",
        "name",
        "status",
      ],
    });
    const sportTournamentIds = tournaments.map(({ id }) => id);
    const [states, readinessResults, outcomesByTournamentId] =
      await Promise.all([
        Promise.all(
          tournaments.map(async (tournament) => {
            const shouldLoadCurrent =
              !currentStatuses.size || currentStatuses.has(tournament.status);
            const [manager, captain] = await Promise.all([
              canManage(req.user, tournament),
              findActiveSportCaptainForUser({
                userId: req.user.id,
                sportTournamentId: tournament.id,
              }),
            ]);
            const current = shouldLoadCurrent
              ? await loadSportAuctionSummaryState(tournament, {
                  includeTeamContext: Boolean(manager || captain),
                })
              : null;
            return {
              sportTournamentId: tournament.id,
              current: current
                ? {
                    ...current,
                    serverTime: new Date().toISOString(),
                    viewer: {
                      canManage: manager,
                      canBid: Boolean(captain),
                      isSpectator: !manager && !captain,
                      sportTeamId: captain?.sportTeamId || null,
                      sportTeamName: captain?.team?.name || null,
                    },
                  }
                : null,
            };
          })
        ),
        includeReadiness
          ? Promise.all(
              sportTournamentIds.map(async (sportTournamentId) => ({
                sportTournamentId,
                readiness: await getSportTournamentReadiness(
                  sportTournamentId,
                  undefined,
                  { persistStatus: false }
                ),
              }))
            )
          : Promise.resolve([]),
        includeOutcomes
          ? loadRecentSportOutcomes(sportTournamentIds)
          : Promise.resolve(new Map()),
      ]);
    const readinessByTournamentId = new Map(
      readinessResults.map(({ sportTournamentId, readiness }) => [
        sportTournamentId,
        readiness,
      ])
    );
    const data = states.map(({ sportTournamentId, current }) => ({
      sportTournamentId,
      current,
      readiness: readinessByTournamentId.get(sportTournamentId) || null,
      recentOutcomes: outcomesByTournamentId.get(sportTournamentId) || [],
    }));
    return res.status(200).json({ data, meta: { count: data.length } });
  } catch (error) {
    console.error("Failed to load Sport Auction summaries:", error);
    return res
      .status(500)
      .json({ message: "Failed to load Sport Auction summaries" });
  }
};

const getSportSynchronizationService = () => {
  if (!sportSynchronizationService) {
    sportSynchronizationService = createAuctionSynchronizationService({
      io,
      scopeType: "sport",
      roomName,
      loadSnapshot: getSportAuctionSynchronizationSnapshot,
    });
  }
  return sportSynchronizationService;
};

const publishSportAuctionState = async (sportTournamentId, reason) => {
  try {
    return await getSportSynchronizationService().publish(
      sportTournamentId,
      reason
    );
  } catch (error) {
    console.error("Failed to publish Sport Auction state:", error.message);
    return null;
  }
};

export const sendSportAuctionStateToSocket = (
  socket,
  sportTournamentId,
  reason
) =>
  getSportSynchronizationService().sendToSocket(
    socket,
    sportTournamentId,
    reason
  );

const canManage = (user, tournament, transaction) =>
  canManageFestivalTeamSports({
    user,
    festivalId: tournament.festivalId,
    festivalTeamId: tournament.festivalTeamId,
    transaction,
  });

const audit = ({
  sportTournamentId,
  actorUserId,
  action,
  entityType = "festival_participant",
  entityId,
  details,
  transaction,
}) => SportOperationAudit.create({
  id: randomUUID(),
  sportTournamentId,
  actorUserId,
  action,
  entityType,
  entityId,
  details,
}, { transaction });

const expireRound = async (auctionId, expectedEndsAt = null) => {
  const snapshot = await SportAuction.findByPk(auctionId, {
    attributes: ["id", "sportTournamentId"],
  });
  if (!snapshot) return { outcome: "ignored" };
  const result = await sequelize.transaction(async (transaction) => {
    const tournament = await SportTournament.findByPk(
      snapshot.sportTournamentId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }
    );
    if (!tournament || tournament.status !== "auction_live") {
      return { outcome: "ignored" };
    }
    const config = await loadConfig(tournament.id, transaction, true);
    const auction = await SportAuction.findByPk(auctionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!auction || auction.status !== "live") return { outcome: "ignored" };
    const stored = auction.endsAt ? new Date(auction.endsAt).getTime() : null;
    if (expectedEndsAt) {
      const expected = new Date(expectedEndsAt).getTime();
      if (stored === null || Math.abs(stored - expected) > DEADLINE_MATCH_TOLERANCE_MS) {
        return { outcome: "stale" };
      }
    }
    if (stored && stored > Date.now()) {
      return { outcome: "not_due", auctionId, endsAt: auction.endsAt };
    }
    if (!config || config.currentParticipantId !== auction.festivalParticipantId) {
      return { outcome: "ignored" };
    }
    await auction.update({
      status: "pending",
      endsAt: null,
      pausedRemainingMs: null,
    }, { transaction });
    return {
      outcome: "expired",
      sportTournamentId: auction.sportTournamentId,
      auctionId: auction.id,
    };
  });
  if (result.outcome === "not_due") scheduleEnd(result.auctionId, result.endsAt);
  if (result.outcome === "expired") {
    clearTimer(auctionId);
    emit(
      result.sportTournamentId,
      "sport-auction-pending-finalization",
      eventPayload(result.sportTournamentId, result)
    );
    await publishSportAuctionState(
      result.sportTournamentId,
      "auction-pending-finalization"
    );
  }
  return result;
};

const scheduleEnd = (auctionId, endsAt) => {
  clearTimer(auctionId);
  const expected = new Date(endsAt);
  const remainingMs = Math.max(0, expected.getTime() - Date.now());
  const timer = setTimeout(async () => {
    const active = timers.get(auctionId);
    if (!active || new Date(active.endsAt).getTime() !== expected.getTime()) return;
    try {
      await expireRound(auctionId, expected);
    } catch (error) {
      console.error("Failed to expire Sport Auction round:", error.message);
    }
  }, remainingMs + 10);
  timers.set(auctionId, { timer, endsAt: expected });
};

export const restoreSportAuctionTimers = async () => {
  const rounds = await SportAuction.findAll({ where: { status: "live" } });
  await Promise.all(rounds.map(async (round) => {
    if (!round.endsAt || new Date(round.endsAt).getTime() <= Date.now()) {
      await expireRound(round.id);
    } else {
      scheduleEnd(round.id, round.endsAt);
    }
  }));
};

export const updateSportAuctionConfig = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament) return { status: 404, message: "Sport Tournament not found" };
      if (!(await canManage(req.user, tournament, transaction))) {
        return { status: 403, message: "Access denied" };
      }
      if (!["draft", "setup", "ready"].includes(tournament.status)) {
        return { status: 409, message: "Auction configuration is locked" };
      }
      const [config] = await SportAuctionConfig.findOrCreate({
        where: { sportTournamentId: tournament.id },
        defaults: {
          id: randomUUID(),
          configuredByUserId: req.user.id,
          ...req.body,
        },
        transaction,
      });
      await config.update({
        ...req.body,
        configuredByUserId: req.user.id,
      }, { transaction });
      await getSportTournamentReadiness(tournament.id, transaction);
      return { data: toConfig(config) };
    });
    if (!result.status) {
      await publishSportAuctionState(
        req.params.sportTournamentId,
        "auction-config-updated"
      );
    }
    return res.status(result.status || 200).json(result);
  } catch (error) {
    console.error("Failed to configure Sport Auction:", error);
    return res.status(500).json({ message: "Failed to configure Sport Auction" });
  }
};

export const startSportAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament) return { status: 404, message: "Sport Tournament not found" };
      if (!(await canManage(req.user, tournament, transaction))) {
        return { status: 403, message: "Access denied" };
      }
      if (tournament.status !== "ready") {
        return { status: 409, message: "Tournament must be READY before launch" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      if (!config) return { status: 409, message: "Configure the Sport Auction first" };
      const readiness = await getSportTournamentReadiness(
        tournament.id,
        transaction,
        { persistStatus: false }
      );
      if (readiness.readinessStatus !== "READY") {
        return {
          status: 409,
          message: "Sport Auction is not ready",
          blockers: readiness.blockers,
        };
      }
      const startedAt = new Date();
      await tournament.update({ status: "auction_live" }, { transaction });
      await config.update({
        currentParticipantId: null,
        startedAt,
        completedAt: null,
      }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_started",
        entityType: "sport_tournament",
        entityId: tournament.id,
        details: { startedAt },
        transaction,
      });
      return { data: { status: "auction_live", startedAt } };
    });
    if (result.status) return res.status(result.status).json(result);
    emit(
      req.params.sportTournamentId,
      "sport-auction-started",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "auction-started"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to start Sport Auction:", error);
    return res.status(500).json({ message: "Failed to start Sport Auction" });
  }
};

export const pauseSportAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (tournament.status !== "auction_live") {
        return { status: 409, message: "Only a live Sport Auction can be paused" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      const round = await loadCurrentRound(config, transaction, true);
      let remainingMs = null;
      if (round?.status === "live") {
        remainingMs = getFestivalAuctionRemainingMs(round.endsAt);
        await round.update({
          status: "paused",
          endsAt: null,
          pausedRemainingMs: remainingMs,
        }, { transaction });
      }
      await tournament.update({ status: "auction_paused" }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_paused",
        entityType: round ? "sport_auction" : "sport_tournament",
        entityId: round?.id || tournament.id,
        details: { remainingMs },
        transaction,
      });
      return { data: { auctionId: round?.id || null, remainingMs } };
    });
    if (result.status) return res.status(result.status).json(result);
    if (result.data.auctionId) clearTimer(result.data.auctionId);
    emit(
      req.params.sportTournamentId,
      "sport-auction-paused",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "auction-paused"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to pause Sport Auction:", error);
    return res.status(500).json({ message: "Failed to pause Sport Auction" });
  }
};

export const resumeSportAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (tournament.status !== "auction_paused") {
        return { status: 409, message: "Only a paused Sport Auction can be resumed" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      const round = await loadCurrentRound(config, transaction, true);
      let endsAt = null;
      if (round?.status === "paused") {
        endsAt = createFestivalAuctionDeadline(
          Date.now(),
          Math.max(1000, Number(round.pausedRemainingMs || durationMs(config)))
        );
        await round.update({
          status: "live",
          endsAt,
          pausedRemainingMs: null,
        }, { transaction });
      }
      await tournament.update({ status: "auction_live" }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_resumed",
        entityType: round ? "sport_auction" : "sport_tournament",
        entityId: round?.id || tournament.id,
        details: { endsAt },
        transaction,
      });
      return { data: { auctionId: round?.id || null, endsAt } };
    });
    if (result.status) return res.status(result.status).json(result);
    if (result.data.auctionId) scheduleEnd(result.data.auctionId, result.data.endsAt);
    emit(
      req.params.sportTournamentId,
      "sport-auction-resumed",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "auction-resumed"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to resume Sport Auction:", error);
    return res.status(500).json({ message: "Failed to resume Sport Auction" });
  }
};

export const extendSportAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (tournament.status !== "auction_live") {
        return { status: 409, message: "Sport Auction must be live" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      const round = await loadCurrentRound(config, transaction, true);
      if (!round || round.status !== "pending") {
        return { status: 409, message: "Only an expired round can be extended" };
      }
      const endsAt = deadline(config);
      await round.update({ status: "live", endsAt }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_round_extended",
        entityType: "sport_auction",
        entityId: round.id,
        details: { endsAt, attemptNumber: round.attemptNumber },
        transaction,
      });
      return { data: { auctionId: round.id, endsAt } };
    });
    if (result.status) return res.status(result.status).json(result);
    scheduleEnd(result.data.auctionId, result.data.endsAt);
    emit(
      req.params.sportTournamentId,
      "sport-auction-extended",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "auction-extended"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to extend Sport Auction:", error);
    return res.status(500).json({ message: "Failed to extend Sport Auction" });
  }
};

export const completeSportAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (!["auction_live", "auction_paused"].includes(tournament.status)) {
        return { status: 409, message: "Sport Auction is not active" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      if (config.currentParticipantId) {
        return { status: 409, message: "Finalize the current participant first" };
      }
      const completedAt = new Date();
      await tournament.update({ status: "auction_completed" }, { transaction });
      await config.update({ completedAt }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_completed",
        entityType: "sport_tournament",
        entityId: tournament.id,
        details: { completedAt },
        transaction,
      });
      return { data: { status: "auction_completed", completedAt } };
    });
    if (result.status) return res.status(result.status).json(result);
    emit(
      req.params.sportTournamentId,
      "sport-auction-completed",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "auction-completed"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to complete Sport Auction:", error);
    return res.status(500).json({ message: "Failed to complete Sport Auction" });
  }
};

export const startSportAuctionParticipant = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (tournament.status !== "auction_live") {
        return { status: 409, message: "Sport Auction must be live" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      if (config.currentParticipantId) {
        return { status: 409, message: "Finalize the current participant first" };
      }
      const bidProgression = getFestivalBidProgression({
        basePrice: req.body.baseCredits,
        incrementPercentage: config.incrementPercentage,
      });
      if (!Number.isSafeInteger(bidProgression.incrementAmount)) {
        return { status: 400, message: "Base credits must produce a whole-number increment" };
      }
      const [poolEntry, membership, attemptCount, eligibility, budgets] = await Promise.all([
        SportAuctionPool.findOne({
          where: {
            sportTournamentId: tournament.id,
            festivalParticipantId: req.params.participantId,
            state: "available",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        SportTeamMembership.findOne({
          where: {
            sportTournamentId: tournament.id,
            festivalParticipantId: req.params.participantId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        SportAuction.count({
          where: {
            sportTournamentId: tournament.id,
            festivalParticipantId: req.params.participantId,
          },
          transaction,
        }),
        getSportTournamentEligibility(tournament.id, transaction),
        getSportTournamentBudgetSummary(tournament.id, transaction),
      ]);
      if (!poolEntry || membership) {
        return { status: 409, message: "Participant is not available in the Sport Auction Pool" };
      }
      const eligibleParticipant = eligibility.included.find(
        ({ festivalParticipantId, availableParticipantPool }) =>
          festivalParticipantId === req.params.participantId &&
          availableParticipantPool
      );
      if (!eligibleParticipant) {
        return {
          status: 409,
          message:
            "Participant eligibility changed. Regenerate the Pool before starting this round.",
        };
      }
      const highestRemainingCredits = Math.max(
        0,
        ...budgets.teams
          .filter(({ status }) => status === "active")
          .map(({ remainingCredits }) => Number(remainingCredits || 0))
      );
      if (bidProgression.nextBid > highestRemainingCredits) {
        return {
          status: 400,
          message:
            "No Sport Team has enough remaining credits for the first bid at this base value.",
        };
      }
      const endsAt = deadline(config);
      const round = await SportAuction.create({
        id: randomUUID(),
        sportTournamentId: tournament.id,
        festivalParticipantId: req.params.participantId,
        status: "live",
        baseCredits: req.body.baseCredits,
        startedByUserId: req.user.id,
        startedAt: new Date(),
        endsAt,
        attemptNumber: attemptCount + 1,
      }, { transaction });
      await config.update({ currentParticipantId: req.params.participantId }, { transaction });
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: "sport_auction_round_started",
        entityType: "sport_auction",
        entityId: req.params.participantId,
        details: {
          sportAuctionId: round.id,
          attemptNumber: round.attemptNumber,
          baseCredits: Number(round.baseCredits),
          endsAt,
        },
        transaction,
      });
      return { data: { auctionId: round.id, endsAt } };
    });
    if (result.status) return res.status(result.status).json(result);
    const round = await loadRoundResponse(result.data.auctionId);
    const config = await loadConfig(req.params.sportTournamentId);
    scheduleEnd(round.id, round.endsAt);
    const payload = toRound(round, config);
    emit(
      req.params.sportTournamentId,
      "sport-participant-started",
      eventPayload(req.params.sportTournamentId, { current: payload })
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "participant-started"
    );
    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("Failed to start Sport Auction participant:", error);
    return res.status(500).json({ message: "Failed to start participant" });
  }
};

export const placeSportAuctionBid = async (req, res) => {
  const traceStartedAt = nowMs();
  const trace = {
    scopeType: "sport",
    sportTournamentId: req.params.sportTournamentId,
    endpoint: "Place Bid",
    validationMs: 0,
    dbMs: 0,
    socketBroadcastMs: 0,
    socketSerializationMs: 0,
    socketPayloadBytes: 0,
    publishAuctionStateMs: "deferred",
  };
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const validationStartedAt = nowMs();
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || tournament.status !== "auction_live") {
        return { status: 409, message: "Sport Auction is not accepting bids" };
      }
      const captain = await findActiveSportCaptainForUser({
        userId: req.user.id,
        sportTournamentId: tournament.id,
        transaction,
        lock: true,
      });
      if (!captain) {
        return { status: 403, message: "Only an active assigned Captain may bid" };
      }
      const eligibility = await getSportTournamentEligibility(
        tournament.id,
        transaction
      );
      const eligibleCaptain = eligibility.included.find(
        ({ festivalParticipantId, assignedCaptain }) =>
          festivalParticipantId === captain.festivalParticipantId &&
          assignedCaptain
      );
      if (!eligibleCaptain) {
        return {
          status: 403,
          message:
            "Captain eligibility changed. Ask the Tournament Owner to review the assignment.",
        };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      const round = await loadCurrentRound(config, transaction, true);
      if (!round || round.status !== "live" || !round.endsAt || new Date(round.endsAt) <= new Date()) {
        return { status: 409, message: "No participant is currently accepting bids" };
      }
      if (req.body.auctionId !== round.id) {
        return { status: 409, message: "Auction state changed. Refresh before bidding." };
      }
      const lead = await highestBid(round.id, transaction, true);
      if (lead?.sportTeamId === captain.sportTeamId) {
        return { status: 400, message: "Your Team already holds the highest bid" };
      }
      const currentBid = lead ? toNumber(lead.amount) : 0;
      if (toNumber(req.body.expectedCurrentBid) !== currentBid) {
        return { status: 409, message: "A newer bid was already accepted" };
      }
      const budget = (await getSportTournamentBudgetSummary(tournament.id, transaction))
        .teams.find(({ sportTeamId }) => sportTeamId === captain.sportTeamId);
      const nextBid = progression(round, config, currentBid).nextBid;
      if (!budget || nextBid > budget.remainingCredits) {
        return { status: 400, message: "Bid exceeds the Team's remaining credits" };
      }
      trace.validationMs = elapsedMs(validationStartedAt);
      const dbStartedAt = nowMs();
      const bid = await SportAuctionBid.create({
        id: randomUUID(),
        sportTournamentId: tournament.id,
        sportAuctionId: round.id,
        festivalParticipantId: round.festivalParticipantId,
        sportTeamId: captain.sportTeamId,
        sportTeamCaptainId: captain.id,
        placedByUserId: req.user.id,
        amount: nextBid,
        placedAt: new Date(),
      }, { transaction });
      const bidCount = await SportAuctionBid.count({
        where: { sportAuctionId: round.id },
        transaction,
      });
      const endsAt = deadline(config);
      await round.update({ endsAt, pausedRemainingMs: null }, { transaction });
      trace.dbMs = elapsedMs(dbStartedAt);
      return {
        data: {
          bidId: bid.id,
          auctionId: round.id,
          baseCredits: Number(round.baseCredits),
          bidCount,
          endsAt,
          incrementPercentage: config.incrementPercentage,
          amount: nextBid,
          placedAt: bid.placedAt,
          festivalParticipantId: round.festivalParticipantId,
          sportTeamId: captain.sportTeamId,
          teamName: captain.team?.name,
        },
      };
    });
    if (result.status) return res.status(result.status).json(result);
    scheduleEnd(result.data.auctionId, result.data.endsAt);
    const bidProgression = getFestivalBidProgression({
      basePrice: result.data.baseCredits,
      currentBid: result.data.amount,
      incrementPercentage: result.data.incrementPercentage || 20,
    });
    const payload = {
      id: result.data.bidId,
      sportAuctionId: result.data.auctionId,
      sportTeamId: result.data.sportTeamId,
      teamName: result.data.teamName,
      amount: toNumber(result.data.amount),
      placedAt: result.data.placedAt,
      bidNumber: result.data.bidCount,
      bidCount: result.data.bidCount,
      endsAt: result.data.endsAt,
      currentCredits: bidProgression.currentBid,
      nextCredits: bidProgression.nextBid,
      incrementCredits: bidProgression.incrementAmount,
    };
    const socketStartedAt = nowMs();
    const serializeStartedAt = nowMs();
    const socketPayload = eventPayload(req.params.sportTournamentId, payload);
    trace.socketPayloadBytes = payloadSizeBytes(socketPayload);
    trace.socketSerializationMs = elapsedMs(serializeStartedAt);
    emit(
      req.params.sportTournamentId,
      "sport-bid-placed",
      socketPayload
    );
    trace.socketBroadcastMs = elapsedMs(socketStartedAt);
    trace.httpResponseMs = elapsedMs(traceStartedAt);
    logBidLatencyTrace(trace);
    void publishSportAuctionState(req.params.sportTournamentId, "bid-placed");
    return res.status(201).json({ data: payload });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "A concurrent bid was accepted first" });
    }
    console.error("Failed to place Sport Auction bid:", error);
    return res.status(500).json({ message: "Failed to place bid" });
  }
};

const finalize = async (req, res, outcome) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      if (!["auction_live", "auction_paused"].includes(tournament.status) ||
          config.currentParticipantId !== req.params.participantId) {
        return { status: 409, message: "Participant is not currently active" };
      }
      const round = await loadCurrentRound(config, transaction, true);
      if (!round || round.status !== "pending") {
        return { status: 409, message: "Bidding must expire before finalization" };
      }
      const lead = await highestBid(round.id, transaction, true);
      if (outcome === "sold" && !lead) {
        return { status: 400, message: "Participant cannot be sold without a bid" };
      }
      if (outcome === "unsold" && lead) {
        return { status: 400, message: "Participant cannot be unsold after bids exist" };
      }
      if (outcome === "sold") {
        const budget = (await getSportTournamentBudgetSummary(tournament.id, transaction))
          .teams.find(({ sportTeamId }) => sportTeamId === lead.sportTeamId);
        if (!budget || toNumber(lead.amount) > budget.remainingCredits) {
          return { status: 409, message: "Winning Team no longer has sufficient credits" };
        }
        const existing = await SportTeamMembership.findOne({
          where: {
            sportTournamentId: tournament.id,
            festivalParticipantId: round.festivalParticipantId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (existing) return { status: 409, message: "Participant already belongs to a Sport Team" };
        await SportTeamMembership.create({
          id: randomUUID(),
          sportTournamentId: tournament.id,
          sportTeamId: lead.sportTeamId,
          festivalParticipantId: round.festivalParticipantId,
          source: "auction",
          assignedByUserId: req.user.id,
          assignedAt: new Date(),
        }, { transaction });
      }
      const finalizedAt = new Date();
      await SportAuctionResult.create({
        id: randomUUID(),
        sportTournamentId: tournament.id,
        sportAuctionId: round.id,
        festivalParticipantId: round.festivalParticipantId,
        outcome,
        sportTeamId: outcome === "sold" ? lead.sportTeamId : null,
        winningBidId: outcome === "sold" ? lead.id : null,
        finalCredits: outcome === "sold" ? lead.amount : null,
        finalizedByUserId: req.user.id,
        finalizedAt,
      }, { transaction });
      await round.update({
        status: outcome,
        finalizedByUserId: req.user.id,
        finalizedAt,
      }, { transaction });
      await config.update({ currentParticipantId: null }, { transaction });
      const [updatedPoolRows] = await SportAuctionPool.update({ state: outcome }, {
        where: {
          sportTournamentId: tournament.id,
          festivalParticipantId: round.festivalParticipantId,
          state: "available",
        },
        transaction,
      });
      if (updatedPoolRows !== 1) {
        throw Object.assign(
          new Error("Auction Pool state changed before finalization"),
          { statusCode: 409 }
        );
      }
      await audit({
        sportTournamentId: tournament.id,
        actorUserId: req.user.id,
        action: `sport_auction_participant_${outcome}`,
        entityId: round.festivalParticipantId,
        details: {
          sportAuctionId: round.id,
          attemptNumber: round.attemptNumber,
          finalCredits: outcome === "sold" ? toNumber(lead.amount) : null,
        },
        transaction,
      });
      return { data: { auctionId: round.id } };
    });
    if (result.status) return res.status(result.status).json(result);
    clearTimer(result.data.auctionId);
    const round = await loadRoundResponse(result.data.auctionId);
    const config = await loadConfig(req.params.sportTournamentId);
    const payload = toRound(round, config);
    emit(
      req.params.sportTournamentId,
      outcome === "sold" ? "sport-participant-sold" : "sport-participant-unsold",
      eventPayload(req.params.sportTournamentId, { current: payload })
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      outcome === "sold" ? "participant-sold" : "participant-unsold"
    );
    return res.status(200).json({ data: payload });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(`Failed to mark Sport Auction participant ${outcome}:`, error);
    return res.status(500).json({ message: `Failed to mark participant ${outcome}` });
  }
};

export const sellSportAuctionParticipant = (req, res) => finalize(req, res, "sold");
export const markSportAuctionParticipantUnsold = (req, res) => finalize(req, res, "unsold");

export const reauctionSportParticipants = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const tournament = await SportTournament.findByPk(req.params.sportTournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament || !(await canManage(req.user, tournament, transaction))) {
        return { status: tournament ? 403 : 404, message: tournament ? "Access denied" : "Sport Tournament not found" };
      }
      if (!["auction_live", "auction_paused"].includes(tournament.status)) {
        return { status: 409, message: "Sport Auction must be live or paused" };
      }
      const config = await loadConfig(tournament.id, transaction, true);
      if (!config.reauctionEnabled) return { status: 409, message: "Re-auction is disabled" };
      if (config.currentParticipantId) {
        return { status: 409, message: "Finalize the current participant first" };
      }
      const entries = await SportAuctionPool.findAll({
        where: {
          sportTournamentId: tournament.id,
          state: "unsold",
          ...(req.body.participantIds?.length
            ? { festivalParticipantId: req.body.participantIds }
            : {}),
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!entries.length) return { status: 400, message: "No unsold participants selected" };
      const requestedIds = [...new Set(req.body.participantIds || [])];
      if (requestedIds.length && entries.length !== requestedIds.length) {
        return {
          status: 409,
          message:
            "One or more selected participants are no longer unsold. Refresh and try again.",
        };
      }
      const at = new Date();
      for (const entry of entries) {
        await entry.update({
          state: "available",
          reauctionCount: Number(entry.reauctionCount || 0) + 1,
          lastReauctionedAt: at,
        }, { transaction });
        await audit({
          sportTournamentId: tournament.id,
          actorUserId: req.user.id,
          action: "sport_auction_participant_reauctioned",
          entityId: entry.festivalParticipantId,
          details: { reauctionCount: Number(entry.reauctionCount) },
          transaction,
        });
      }
      return {
        data: {
          participantIds: entries.map(({ festivalParticipantId }) => festivalParticipantId),
          count: entries.length,
        },
      };
    });
    if (result.status) return res.status(result.status).json(result);
    emit(
      req.params.sportTournamentId,
      "sport-participants-reauctioned",
      eventPayload(req.params.sportTournamentId, result.data)
    );
    await publishSportAuctionState(
      req.params.sportTournamentId,
      "participants-reauctioned"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to re-auction Sport participants:", error);
    return res.status(500).json({ message: "Failed to re-auction participants" });
  }
};

export const getSportAuctionCurrent = async (req, res) => {
  try {
    const tournament = await SportTournament.findByPk(req.params.sportTournamentId);
    if (!tournament) return res.status(404).json({ message: "Sport Tournament not found" });
    let config = await loadConfig(tournament.id);
    const manager = await canManage(req.user, tournament);
    const captain = await findActiveSportCaptainForUser({
      userId: req.user.id,
      sportTournamentId: tournament.id,
    });
    let round = config?.currentParticipantId
      ? await SportAuction.findOne({
          where: {
            sportTournamentId: tournament.id,
            festivalParticipantId: config.currentParticipantId,
          },
          include: auctionInclude,
          order: [["attemptNumber", "DESC"]],
        })
      : null;
    if (round?.status === "live" && round.endsAt && new Date(round.endsAt) <= new Date()) {
      await expireRound(round.id, round.endsAt);
      config = await loadConfig(tournament.id);
      round = await loadRoundResponse(round.id);
    }
    const sharedState = await loadSportAuctionSharedState(tournament.id);
    return res.status(200).json({
      data: {
        ...sharedState,
        serverTime: new Date().toISOString(),
        viewer: {
          canManage: manager,
          canBid: Boolean(captain),
          isSpectator: !manager && !captain,
          sportTeamId: captain?.sportTeamId || null,
          sportTeamName: captain?.team?.name || null,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load Sport Auction:", error);
    return res.status(500).json({ message: "Failed to load Sport Auction" });
  }
};

export const getSportAuctionHistory = async (req, res) => {
  try {
    const { history, audits } = await loadSportAuctionHistory(
      req.params.sportTournamentId
    );
    return res.status(200).json({
      data: history,
      audits,
    });
  } catch (error) {
    console.error("Failed to load Sport Auction history:", error);
    return res.status(500).json({ message: "Failed to load Sport Auction history" });
  }
};
