import crypto from "node:crypto";
import { Op, Transaction } from "sequelize";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  Festival,
  FestivalAuction,
  FestivalAuctionBid,
  FestivalAuctionConfig,
  FestivalAuctionPool,
  FestivalAuctionResult,
  FestivalOperationAudit,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalRetention,
  FestivalTeam,
  FestivalTeamMembership,
  FestivalTeamOwner,
  Sport,
} from "../models/index.js";
import { io } from "../index.js";
import { getFestivalBidProgression } from "../utils/festivalBidProgression.js";
import {
  createFestivalAuctionDeadline,
  FESTIVAL_AUCTION_DURATION_MS,
  getFestivalAuctionRemainingMs,
} from "../utils/festivalAuctionTimer.js";
import {
  calculateTeamBudgets,
  toAuctionConfigResponse,
} from "./festivalMainAuction.controller.js";
import { getFestivalReadiness } from "../utils/festivalReadiness.js";
import {
  toFestivalParticipantResponse,
  toFestivalTeamMembershipResponse,
  toFestivalTeamResponse,
} from "../utils/festivalResponse.js";
import { createAuctionSynchronizationService } from "../utils/auctionSynchronization.js";
import {
  elapsedMs,
  logBidLatencyTrace,
  nowMs,
  payloadSizeBytes,
  requestCacheGetOrSet,
  transactionScopedCacheKey,
} from "../utils/requestPerformance.js";

const roomName = (festivalId) => `festival-auction:${festivalId}`;
const festivalAuctionTimers = new Map();
const DEADLINE_MATCH_TOLERANCE_MS = 1_500;
const emitFestivalEvent = (festivalId, event, payload) =>
  io.to(roomName(festivalId)).emit(event, payload);
const logExpiry = (message, details) =>
  console.info(`[festival-auction-expiry] ${message}`, details);
const toMoney = (value) => Number(value || 0);
let festivalSynchronizationService;
const getBidProgression = (auction, config, currentBid) =>
  getFestivalBidProgression({
    basePrice: auction.basePrice,
    currentBid,
    incrementPercentage: config?.incrementPercentage || 20,
  });

const clearFestivalAuctionTimer = (auctionId) => {
  const activeTimer = festivalAuctionTimers.get(auctionId);
  if (activeTimer) clearTimeout(activeTimer.timer);
  festivalAuctionTimers.delete(auctionId);
};

const participantInclude = {
  model: FestivalParticipant,
  as: "participant",
  include: [
    { model: Employee, as: "employee" },
    {
      model: FestivalParticipantSport,
      as: "sportRegistrations",
      include: [{ model: Sport, as: "sport" }],
    },
  ],
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

const compactTeamAttributes = [
  "id",
  "festivalId",
  "name",
  "code",
  "color",
  "logoUrl",
  "status",
];

const compactAuctionAttributes = [
  "id",
  "festivalId",
  "festivalParticipantId",
  "status",
  "basePrice",
  "startedAt",
  "endsAt",
  "pausedRemainingMs",
  "attemptNumber",
  "finalizedAt",
];

const bidInclude = [
  { model: FestivalTeam, as: "team" },
  { model: FestivalTeamOwner, as: "ownerAssignment" },
];

const auctionInclude = [
  participantInclude,
  {
    model: FestivalAuctionBid,
    as: "bids",
    include: bidInclude,
    separate: true,
    order: [
      ["placedAt", "ASC"],
      ["createdAt", "ASC"],
    ],
  },
  {
    model: FestivalAuctionResult,
    as: "result",
    include: [{ model: FestivalTeam, as: "team" }],
  },
];

const toParticipant = (participant) => ({
  ...toFestivalParticipantResponse(participant),
  sportCount: participant?.sportRegistrations?.length || 0,
  poolState: participant?.poolState || "available",
  reauctionCount: Number(participant?.reauctionCount || 0),
});

const toBid = (bid) => ({
  id: bid.id,
  festivalAuctionId: bid.festivalAuctionId,
  festivalParticipantId: bid.festivalParticipantId,
  festivalTeamId: bid.festivalTeamId,
  teamName: bid.team?.name,
  amount: toMoney(bid.amount),
  placedAt: bid.placedAt,
});

const toResult = (result) =>
  result
    ? {
        id: result.id,
        outcome: result.outcome,
        festivalParticipantId: result.festivalParticipantId,
        festivalTeamId: result.festivalTeamId,
        teamName: result.team?.name,
        finalAmount:
          result.finalAmount === null ? null : toMoney(result.finalAmount),
        finalizedAt: result.finalizedAt,
      }
    : null;

const toAuction = (auction, configOrBudget = 0) => {
  if (!auction) return null;
  const config =
    typeof configOrBudget === "object"
      ? configOrBudget
      : { totalBudget: configOrBudget };
  const bids = (auction.bids || []).map((bid, index) => ({
    ...toBid(bid),
    bidNumber: index + 1,
  }));
  const highestBid = bids.at(-1);
  const currentBid = highestBid?.amount ?? 0;
  const progression = getBidProgression(auction, config, currentBid);
  const awaitingAdminDecision = auction.status === "pending";
  return {
    id: auction.id,
    festivalId: auction.festivalId,
    festivalParticipantId: auction.festivalParticipantId,
    status: auction.status,
    lifecycleState:
      auction.status === "live"
        ? "ACTIVE"
        : awaitingAdminDecision
          ? "ADMIN_DECISION"
          : auction.status.toUpperCase(),
    expiryState: awaitingAdminDecision ? "EXPIRED" : null,
    expired: awaitingAdminDecision,
    adminActions: {
      extend: awaitingAdminDecision,
      sell: awaitingAdminDecision && Boolean(highestBid),
      unsold: awaitingAdminDecision && !highestBid,
    },
    basePrice: progression.basePrice,
    incrementPercentage: progression.incrementPercentage,
    incrementAmount: progression.incrementAmount,
    participant: auction.participant
      ? toParticipant(auction.participant)
      : undefined,
    bids,
    bidCount: bids.length,
    currentBid: progression.currentBid,
    leadingTeam: highestBid?.teamName || null,
    attemptNumber: auction.attemptNumber,
    nextBid: progression.nextBid,
    timerDurationSeconds: FESTIVAL_AUCTION_DURATION_MS / 1000,
    startedAt: auction.startedAt,
    endsAt: auction.endsAt,
    pausedRemainingMs: auction.pausedRemainingMs,
    finalizedAt: auction.finalizedAt,
    result: toResult(auction.result),
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

const toCompactAuction = async (auction, config, transaction) => {
  if (!auction) return null;
  const [lead, bidCount] = await Promise.all([
    FestivalAuctionBid.findOne({
      where: { festivalAuctionId: auction.id },
      attributes: ["id", "festivalAuctionId", "festivalTeamId", "amount", "placedAt"],
      include: [
        {
          model: FestivalTeam,
          as: "team",
          attributes: ["id", "name"],
        },
      ],
      order: [
        ["amount", "DESC"],
        ["createdAt", "ASC"],
      ],
      transaction,
    }),
    FestivalAuctionBid.count({
      where: { festivalAuctionId: auction.id },
      transaction,
    }),
  ]);
  const currentBid = lead ? toMoney(lead.amount) : 0;
  const bidProgression = getBidProgression(auction, config, currentBid);
  const pending = auction.status === "pending";
  return {
    id: auction.id,
    festivalId: auction.festivalId,
    festivalParticipantId: auction.festivalParticipantId,
    status: auction.status,
    lifecycleState: auction.status === "live" ? "ACTIVE" : pending ? "ADMIN_DECISION" : auction.status.toUpperCase(),
    expired: pending,
    adminActions: {
      extend: pending,
      sell: pending && Boolean(lead),
      unsold: pending && !lead,
    },
    basePrice: bidProgression.basePrice,
    incrementPercentage: bidProgression.incrementPercentage,
    incrementAmount: bidProgression.incrementAmount,
    participant: auction.participant
      ? {
          id: auction.participant.id,
          festivalId: auction.participant.festivalId,
          employeeId: auction.participant.employeeId,
          status: auction.participant.status,
          employee: auction.participant.employee
            ? {
                id: auction.participant.employee.id,
                name: auction.participant.employee.name,
                employeeNumber: auction.participant.employee.employeeNumber,
                department: auction.participant.employee.department,
                gender: auction.participant.employee.gender,
              }
            : undefined,
        }
      : undefined,
    bids: lead
      ? [
          {
            id: lead.id,
            festivalAuctionId: lead.festivalAuctionId,
            festivalTeamId: lead.festivalTeamId,
            teamName: lead.team?.name,
            amount: currentBid,
            placedAt: lead.placedAt,
            bidNumber: bidCount,
          },
        ]
      : [],
    bidCount,
    currentBid: bidProgression.currentBid,
    leadingTeam: lead?.team?.name || null,
    attemptNumber: auction.attemptNumber,
    nextBid: bidProgression.nextBid,
    timerDurationSeconds: FESTIVAL_AUCTION_DURATION_MS / 1000,
    startedAt: auction.startedAt,
    endsAt: auction.endsAt,
    pausedRemainingMs: auction.pausedRemainingMs,
    finalizedAt: auction.finalizedAt,
    result: null,
  };
};

const HISTORY_LIMIT = 100;
const ACTIVITY_LIMIT = 50;

const loadConfig = async (festivalId, transaction, lock = false) =>
  requestCacheGetOrSet(
    transactionScopedCacheKey(
      "festival-auction-config",
      festivalId,
      transaction,
      lock ? "lock" : "read"
    ),
    () => FestivalAuctionConfig.findOne({
      where: { festivalId },
      transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    })
  );

const findOwnerForUser = async (festivalId, userId, transaction, lock = false) => {
  return requestCacheGetOrSet(
    transactionScopedCacheKey(
      "festival-owner-for-user",
      `${userId}:${festivalId}`,
      transaction,
      lock ? "lock" : "read"
    ),
    async () => {
      const employee = await Employee.findOne({
        where: { userId },
        transaction,
      });
      if (!employee || employee.employmentStatus !== "active") return null;
      const participant = await FestivalParticipant.findOne({
        where: {
          festivalId,
          employeeId: employee.id,
          status: "registered",
        },
        transaction,
      });
      if (!participant) return null;
      return FestivalTeamOwner.findOne({
        where: {
          festivalId,
          festivalParticipantId: participant.id,
          status: "active",
        },
        include: [{ model: FestivalTeam, as: "team" }],
        transaction,
        ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
      });
    }
  );
};

const loadCurrentAuction = async (config, transaction, lock = false) => {
  if (!config?.currentParticipantId) return null;
  return FestivalAuction.findOne({
    where: {
      festivalId: config.festivalId,
      festivalParticipantId: config.currentParticipantId,
    },
    order: [["attemptNumber", "DESC"]],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
};

const loadAuctionResponse = (auctionId) =>
  FestivalAuction.findByPk(auctionId, { include: auctionInclude });

const toUnsoldParticipant = (entry) => {
  entry.participant.setDataValue("poolState", entry.state);
  entry.participant.setDataValue("reauctionCount", entry.reauctionCount);
  return toParticipant(entry.participant);
};

const loadFestivalAuctionSharedState = async (festivalId, transaction) => {
  const config = await loadConfig(festivalId, transaction);
  if (!config) return null;
  const auction = config.currentParticipantId
    ? await FestivalAuction.findOne({
        where: {
          festivalId,
          festivalParticipantId: config.currentParticipantId,
        },
        include: auctionInclude,
        order: [["attemptNumber", "DESC"]],
        transaction,
      })
    : null;
  const [teamSummaries, pool, unsoldEntries, teams, memberships] =
    await Promise.all([
    getTeamSummaries(festivalId, config, transaction),
    getPoolParticipants(festivalId, transaction),
    FestivalAuctionPool.findAll({
      where: { festivalId, state: "unsold" },
      include: [participantInclude],
      order: [["updatedAt", "DESC"]],
      transaction,
    }),
    FestivalTeam.findAll({
      where: { festivalId },
      order: [["name", "ASC"], ["id", "ASC"]],
      transaction,
    }),
    FestivalTeamMembership.findAll({
      where: { festivalId },
      include: [participantInclude, { model: FestivalTeam, as: "team" }],
      order: [["assignedAt", "ASC"]],
      transaction,
    }),
  ]);
  return {
    config: toAuctionConfigResponse(config),
    current: toAuction(auction, config),
    budgets: teamSummaries,
    teamSummaries,
    teams: teams.map((team) => ({
      ...toFestivalTeamResponse(team),
      members: memberships
        .filter(({ festivalTeamId }) => festivalTeamId === team.id)
        .map(toFestivalTeamMembershipResponse),
    })),
    pool: pool.map(toParticipant),
    unsold: unsoldEntries.map(toUnsoldParticipant),
  };
};

const loadFestivalAuctionSummaryState = async (
  festivalId,
  { includeTeamContext = false } = {},
  transaction
) => {
  const config = await loadConfig(festivalId, transaction);
  if (!config) return null;
  const currentRoundPromise = config.currentParticipantId
    ? FestivalAuction.findOne({
        where: {
          festivalId,
          festivalParticipantId: config.currentParticipantId,
        },
        attributes: compactAuctionAttributes,
        include: [compactParticipantInclude],
        order: [["attemptNumber", "DESC"]],
        transaction,
      })
    : Promise.resolve(null);
  const poolCountsPromise = FestivalAuctionPool.count({
    where: { festivalId },
    attributes: ["state"],
    group: ["state"],
    transaction,
  });
  const teamContextPromise = includeTeamContext
    ? Promise.all([
        calculateTeamBudgets(festivalId, config, transaction),
        FestivalTeam.findAll({
          where: { festivalId, status: "active" },
          attributes: compactTeamAttributes,
          order: [["name", "ASC"], ["id", "ASC"]],
          transaction,
        }),
        FestivalTeamMembership.count({
          where: { festivalId },
          attributes: ["festivalTeamId"],
          group: ["festivalTeamId"],
          transaction,
        }),
      ])
    : Promise.resolve([[], [], []]);

  const [currentRound, poolCountRows, [teamSummaries, teams, memberCountRows]] =
    await Promise.all([currentRoundPromise, poolCountsPromise, teamContextPromise]);
  const poolCounts = groupedCountMap(poolCountRows);
  const memberCounts = groupedCountMap(memberCountRows, "festivalTeamId");

  return {
    config: toAuctionConfigResponse(config),
    current: await toCompactAuction(currentRound, config, transaction),
    counts: {
      available: poolCounts.get("available") || 0,
      sold: poolCounts.get("sold") || 0,
      unsold: poolCounts.get("unsold") || 0,
    },
    teamSummaries,
    teams: teams.map((team) => ({
      ...toFestivalTeamResponse(team),
      members: new Array(memberCounts.get(team.id) || 0).fill(null),
    })),
    pool: [],
    unsold: [],
  };
};

const loadFestivalAuctionHistory = async (festivalId, transaction) => {
  const [auctions, audits, config] = await Promise.all([
    FestivalAuction.findAll({
      where: { festivalId },
      include: auctionInclude,
      order: [["startedAt", "DESC"]],
      limit: HISTORY_LIMIT,
      transaction,
    }),
    FestivalOperationAudit.findAll({
      where: { festivalId },
      order: [["createdAt", "DESC"]],
      limit: ACTIVITY_LIMIT,
      transaction,
    }),
    loadConfig(festivalId, transaction),
  ]);
  return {
    history: auctions.map((auction) => toAuction(auction, config)),
    audits: audits.map((audit) => ({
      id: audit.id,
      action: audit.action,
      entityType: audit.entityType,
      entityId: audit.entityId,
      details: audit.details,
      createdAt: audit.createdAt,
    })),
  };
};

const parseIds = (ids) =>
  String(ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const recentFestivalOutcome = (result) => ({
  id: result.id,
  auctionId: result.festivalAuctionId,
  festivalId: result.festivalId,
  type: "Festival Auction",
  title:
    result.participant?.employee?.name ||
    result.participant?.name ||
    "Participant",
  outcome: result.outcome,
  teamName: result.team?.name,
  value: result.finalAmount === null ? null : toMoney(result.finalAmount),
  unit: "INR",
  date: result.finalizedAt,
});

const loadRecentFestivalOutcomes = async (festivalIds) => {
  if (!festivalIds.length) return new Map();
  const results = await FestivalAuctionResult.findAll({
    where: { festivalId: { [Op.in]: festivalIds } },
    attributes: [
      "id",
      "festivalAuctionId",
      "festivalId",
      "festivalParticipantId",
      "festivalTeamId",
      "outcome",
      "finalAmount",
      "finalizedAt",
    ],
    include: [
      {
        model: FestivalParticipant,
        as: "participant",
        attributes: ["id", "employeeId"],
        include: [{ model: Employee, as: "employee", attributes: ["id", "name"] }],
      },
      { model: FestivalTeam, as: "team", attributes: ["id", "name"] },
    ],
    order: [["finalizedAt", "DESC"]],
    limit: 20,
  });
  const byFestivalId = new Map();
  results.forEach((result) => {
    const list = byFestivalId.get(result.festivalId) || [];
    list.push(recentFestivalOutcome(result));
    byFestivalId.set(result.festivalId, list);
  });
  return byFestivalId;
};

export const getFestivalAuctionSynchronizationSnapshot = async (festivalId) => {
  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      readOnly: true,
    },
    async (transaction) => {
      const [state, historyPayload] = await Promise.all([
        loadFestivalAuctionSharedState(festivalId, transaction),
        loadFestivalAuctionHistory(festivalId, transaction),
      ]);
      return { state, ...historyPayload };
    }
  );
};

export const getFestivalAuctionSummaries = async (req, res) => {
  try {
    const festivalIds = parseIds(req.query.ids);
    const includeReadiness =
      req.user.role === "admin" && req.query.includeReadiness !== "false";
    const includeOutcomes = req.query.includeOutcomes !== "false";
    const configs = await FestivalAuctionConfig.findAll({
      where: festivalIds.length
        ? { festivalId: { [Op.in]: festivalIds } }
        : undefined,
      attributes: ["festivalId"],
    });
    const scopedFestivalIds = festivalIds.length
      ? festivalIds
      : configs.map(({ festivalId }) => festivalId);
    const [states, readinessResults, outcomesByFestivalId] =
      await Promise.all([
        Promise.all(
          scopedFestivalIds.map(async (festivalId) => ({
            festivalId,
            current: await loadFestivalAuctionSummaryState(festivalId, {
              includeTeamContext: req.user.role === "team_owner",
            }),
          }))
        ),
        includeReadiness
          ? Promise.all(
              scopedFestivalIds.map(async (festivalId) => ({
                festivalId,
                readiness: await getFestivalReadiness(festivalId),
              }))
            )
          : Promise.resolve([]),
        includeOutcomes
          ? loadRecentFestivalOutcomes(scopedFestivalIds)
          : Promise.resolve(new Map()),
      ]);
    const readinessByFestivalId = new Map(
      readinessResults.map(({ festivalId, readiness }) => [
        festivalId,
        readiness,
      ])
    );
    const data = await Promise.all(
      states.map(async ({ festivalId, current }) => {
        const owner =
          req.user.role === "team_owner"
            ? await findOwnerForUser(festivalId, req.user.id)
            : null;
        return {
          festivalId,
          current: current
            ? {
                ...current,
                serverTime: new Date().toISOString(),
                viewer: {
                  isAdmin: req.user.role === "admin",
                  isOwner: Boolean(owner),
                  festivalTeamId: owner?.festivalTeamId || null,
                },
              }
            : null,
          readiness: readinessByFestivalId.get(festivalId) || null,
          recentOutcomes: outcomesByFestivalId.get(festivalId) || [],
        };
      })
    );
    return res.status(200).json({ data, meta: { count: data.length } });
  } catch (error) {
    console.error("Error fetching festival auction summaries:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch festival auction summaries" });
  }
};

const getFestivalSynchronizationService = () => {
  if (!festivalSynchronizationService) {
    festivalSynchronizationService = createAuctionSynchronizationService({
      io,
      scopeType: "festival",
      roomName,
      loadSnapshot: getFestivalAuctionSynchronizationSnapshot,
    });
  }
  return festivalSynchronizationService;
};

const publishFestivalAuctionState = async (festivalId, reason) => {
  const publishStartedAt = nowMs();
  if (reason === "bid-placed") {
    logBidLatencyTrace({
      scopeType: "festival",
      festivalId,
      phase: "publishAuctionStateStarted",
      reason,
    });
  }
  try {
    const payload = await getFestivalSynchronizationService().publish(
      festivalId,
      reason
    );
    if (reason === "bid-placed") {
      logBidLatencyTrace({
        scopeType: "festival",
        festivalId,
        phase: "publishAuctionStateFinished",
        reason,
        publishState: elapsedMs(publishStartedAt),
      });
    }
    return payload;
  } catch (error) {
    console.error("Failed to publish Festival Auction state:", error.message);
    return null;
  }
};

export const sendFestivalAuctionStateToSocket = (socket, festivalId, reason) =>
  getFestivalSynchronizationService().sendToSocket(socket, festivalId, reason);

const getAuctionBidState = async (auction, config, transaction) => {
  const highestBid = await FestivalAuctionBid.findOne({
    where: { festivalAuctionId: auction.id },
    order: [
      ["amount", "DESC"],
      ["createdAt", "ASC"],
    ],
    transaction,
  });
  const currentBid = highestBid?.amount ?? 0;
  const progression = getBidProgression(auction, config, currentBid);
  return {
    highestBid,
    ...progression,
  };
};

const markFestivalAuctionPending = async (auctionId, expectedEndsAt = null) => {
  logExpiry("expiry processing started", {
    auctionId,
    expectedEndsAt,
    processedAt: new Date().toISOString(),
  });
  const result = await sequelize.transaction(async (transaction) => {
    const auction = await FestivalAuction.findByPk(auctionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!auction || auction.status !== "live") {
      return { outcome: "ignored", auctionId };
    }
    const storedDeadline = auction.endsAt
      ? new Date(auction.endsAt).getTime()
      : null;
    if (expectedEndsAt) {
      const scheduledDeadline = new Date(expectedEndsAt).getTime();
      if (
        storedDeadline === null ||
        Math.abs(storedDeadline - scheduledDeadline) >
          DEADLINE_MATCH_TOLERANCE_MS
      ) {
        return {
          outcome: "stale",
          auctionId,
          endsAt: auction.endsAt,
        };
      }
    }
    if (storedDeadline && storedDeadline > Date.now()) {
      return {
        outcome: "not_due",
        auctionId,
        endsAt: auction.endsAt,
      };
    }
    const config = await loadConfig(auction.festivalId, transaction, true);
    if (
      !config ||
      config.currentParticipantId !== auction.festivalParticipantId
    ) {
      return { outcome: "ignored", auctionId };
    }
    await auction.update(
      { status: "pending", endsAt: null, pausedRemainingMs: null },
      { transaction }
    );
    const bidState = await getAuctionBidState(auction, config, transaction);
    return {
      outcome: "expired",
      festivalId: auction.festivalId,
      auctionId: auction.id,
      festivalParticipantId: auction.festivalParticipantId,
      auctionStatus: config.auctionStatus,
      roundStatus: "pending",
      ...bidState,
    };
  });
  if (result.outcome === "not_due") {
    scheduleFestivalAuctionEnd(result.auctionId, result.endsAt);
    logExpiry("expiry processing deferred", {
      auctionId: result.auctionId,
      endsAt: result.endsAt,
    });
    return result;
  }
  if (result.outcome !== "expired") {
    logExpiry("expiry processing completed without transition", result);
    return result;
  }
  clearFestivalAuctionTimer(auctionId);
  logExpiry("expiry processing completed", {
    auctionId: result.auctionId,
    festivalId: result.festivalId,
    roundStatus: result.roundStatus,
    hasValidBid: Boolean(result.highestBid),
  });
  emitFestivalEvent(
    result.festivalId,
    "auction-pending-finalization",
    result
  );
  await publishFestivalAuctionState(
    result.festivalId,
    "auction-pending-finalization"
  );
  logExpiry("socket event emitted", {
    auctionId: result.auctionId,
    festivalId: result.festivalId,
    event: "auction-pending-finalization",
  });
  return result;
};

const scheduleFestivalAuctionEnd = (auctionId, endsAt) => {
  clearFestivalAuctionTimer(auctionId);
  const deadline = new Date(endsAt);
  const remainingMs = Math.max(0, deadline.getTime() - Date.now());
  const timer = setTimeout(async () => {
    const active = festivalAuctionTimers.get(auctionId);
    if (!active || new Date(active.endsAt).getTime() !== deadline.getTime()) {
      return;
    }
    logExpiry("timer reached zero", {
      auctionId,
      endsAt: deadline.toISOString(),
      triggeredAt: new Date().toISOString(),
    });
    try {
      await markFestivalAuctionPending(auctionId, deadline);
    } catch (error) {
      console.error("Error expiring festival auction:", error.message);
    }
  }, remainingMs + 10);
  festivalAuctionTimers.set(auctionId, { timer, endsAt: deadline });
};

export const restoreFestivalAuctionTimers = async () => {
  const liveAuctions = await FestivalAuction.findAll({
    where: { status: "live" },
  });
  await Promise.all(
    liveAuctions.map(async (auction) => {
      if (!auction.endsAt || new Date(auction.endsAt).getTime() <= Date.now()) {
        await markFestivalAuctionPending(auction.id);
        return;
      }
      scheduleFestivalAuctionEnd(auction.id, auction.endsAt);
    })
  );
};

const getPoolParticipants = async (festivalId, transaction) => {
  const entries = await FestivalAuctionPool.findAll({
    where: { festivalId, state: "available" },
    include: [participantInclude],
    transaction,
  });
  return entries
    .map((entry) => {
      const participant = entry.participant;
      if (!participant) return null;
      participant.setDataValue("poolState", entry.state);
      participant.setDataValue("reauctionCount", entry.reauctionCount);
      return participant;
    })
    .filter(Boolean)
    .sort((left, right) =>
      String(left.employee?.name || "").localeCompare(
        String(right.employee?.name || "")
      )
    );
};

const syncPool = async (festivalId, transaction) => {
  const participants = await FestivalParticipant.findAll({
    where: { festivalId, status: "registered" },
    include: [
      {
        model: FestivalTeamMembership,
        as: "teamMembership",
        required: false,
      },
    ],
    transaction,
  });
  const existing = await FestivalAuctionPool.findAll({
    where: { festivalId },
    transaction,
  });
  const existingIds = new Set(existing.map(({ festivalParticipantId }) =>
    festivalParticipantId
  ));
  const newEntries = participants
    .filter((participant) => !participant.teamMembership)
    .filter((participant) => !existingIds.has(participant.id))
    .map((participant) => ({
      id: crypto.randomUUID(),
      festivalId,
      festivalParticipantId: participant.id,
      state: "available",
      reauctionCount: 0,
      generatedAt: new Date(),
    }));
  if (newEntries.length) {
    await FestivalAuctionPool.bulkCreate(newEntries, { transaction });
  }
  return getPoolParticipants(festivalId, transaction);
};

const getTeamSummaries = async (festivalId, config, transaction) => {
  const [budgets, owners, memberships, retentions] = await Promise.all([
    calculateTeamBudgets(festivalId, config, transaction),
    FestivalTeamOwner.findAll({
      where: { festivalId },
      include: [participantInclude],
      transaction,
    }),
    FestivalTeamMembership.findAll({ where: { festivalId }, transaction }),
    FestivalRetention.findAll({ where: { festivalId }, transaction }),
  ]);
  const ownerByTeam = new Map(
    owners.map((owner) => [owner.festivalTeamId, owner])
  );
  return budgets.map((budget) => {
    const teamMemberships = memberships.filter(
      (membership) => membership.festivalTeamId === budget.festivalTeamId
    );
    return {
      ...budget,
      owner: ownerByTeam.get(budget.festivalTeamId)?.participant
        ? toParticipant(ownerByTeam.get(budget.festivalTeamId).participant)
        : null,
      playersPurchased: teamMemberships.filter(
        (membership) => membership.rosterSource === "auction"
      ).length,
      retentions: retentions.filter(
        (retention) => retention.festivalTeamId === budget.festivalTeamId
      ).length,
      currentRosterCount: teamMemberships.length,
    };
  });
};

const lifecycleError = (res, message) =>
  res.status(400).json({ success: false, message });

export const startFestivalAuction = async (req, res) => {
  try {
    const payload = await sequelize.transaction(async (transaction) => {
      const festival = await Festival.findByPk(req.params.festivalId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!festival) return { status: 404, message: "Festival not found" };
      if (festival.rosterFormationMode !== "auction") {
        return {
          status: 400,
          message:
            "Main festival auction is disabled when roster formation mode is manual",
        };
      }
      const config = await loadConfig(festival.id, transaction, true);
      if (!config) {
        return {
          status: 400,
          message: "Configure the main festival auction first",
        };
      }
      if (config.auctionStatus !== "setup") {
        return { status: 400, message: "Auction can only start from setup" };
      }
      const readiness = await getFestivalReadiness(festival.id, transaction);
      if (readiness.overallStatus !== "READY") {
        return {
          status: 400,
          message: "Festival auction is not ready",
          blockers: readiness.blockers,
          readiness,
        };
      }
      const pool = await syncPool(festival.id, transaction);
      if (!pool.length) {
        return { status: 400, message: "Auction pool is empty" };
      }
      const startedAt = new Date();
      await config.update(
        {
          auctionStatus: "live",
          status: "started",
          startedAt,
          completedAt: null,
          currentParticipantId: null,
        },
        { transaction }
      );
      return {
        data: {
          config: toAuctionConfigResponse(config),
          poolCount: pool.length,
        },
      };
    });
    if (payload.status) return res.status(payload.status).json(payload);
    emitFestivalEvent(req.params.festivalId, "auction-started", payload.data);
    await publishFestivalAuctionState(req.params.festivalId, "auction-started");
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error starting festival auction:", error);
    return res.status(500).json({ message: "Failed to start festival auction" });
  }
};

export const pauseFestivalAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || config.auctionStatus !== "live") return null;
      const auction = await loadCurrentAuction(config, transaction, true);
      if (auction?.status === "live") {
        const remainingMs = getFestivalAuctionRemainingMs(auction.endsAt);
        await auction.update(
          {
            status: "paused",
            endsAt: null,
            pausedRemainingMs: remainingMs,
          },
          { transaction }
        );
      }
      await config.update({ auctionStatus: "paused" }, { transaction });
      return { auctionId: auction?.id || null, remainingMs: auction?.pausedRemainingMs };
    });
    if (!result) return lifecycleError(res, "Only a live auction can be paused");
    if (result.auctionId) clearFestivalAuctionTimer(result.auctionId);
    const payload = {
      festivalId: req.params.festivalId,
      auctionStatus: "paused",
      roundStatus: result.auctionId ? "paused" : null,
      remainingMs: result.remainingMs,
    };
    emitFestivalEvent(req.params.festivalId, "auction-paused", payload);
    await publishFestivalAuctionState(req.params.festivalId, "auction-paused");
    return res.status(200).json({ data: payload });
  } catch (error) {
    console.error("Error pausing festival auction:", error);
    return res.status(500).json({ message: "Failed to pause festival auction" });
  }
};

export const resumeFestivalAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || config.auctionStatus !== "paused") return null;
      const auction = config.currentParticipantId
        ? await FestivalAuction.findOne({
            where: {
              festivalId: config.festivalId,
              festivalParticipantId: config.currentParticipantId,
              status: "paused",
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : null;
      let endsAt = null;
      if (auction) {
        endsAt = createFestivalAuctionDeadline(
          Date.now(),
          Math.max(
            1_000,
            toMoney(auction.pausedRemainingMs) || FESTIVAL_AUCTION_DURATION_MS
          )
        );
        await auction.update(
          { status: "live", endsAt, pausedRemainingMs: null },
          { transaction }
        );
      }
      await config.update({ auctionStatus: "live" }, { transaction });
      return { auctionId: auction?.id || null, endsAt };
    });
    if (!result) {
      return lifecycleError(res, "Only a paused auction can be resumed");
    }
    if (result.auctionId) scheduleFestivalAuctionEnd(result.auctionId, result.endsAt);
    const payload = {
      festivalId: req.params.festivalId,
      auctionStatus: "live",
      roundStatus: result.auctionId ? "live" : null,
      endsAt: result.endsAt,
    };
    emitFestivalEvent(req.params.festivalId, "auction-resumed", payload);
    await publishFestivalAuctionState(req.params.festivalId, "auction-resumed");
    return res.status(200).json({ data: payload });
  } catch (error) {
    console.error("Error resuming festival auction:", error);
    return res.status(500).json({ message: "Failed to resume festival auction" });
  }
};

export const extendFestivalAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || config.auctionStatus !== "live") {
        return { status: 400, message: "Auction must be live" };
      }
      const auction = await loadCurrentAuction(config, transaction, true);
      if (!auction || auction.status !== "pending") {
        return {
          status: 400,
          message: "Only an expired round can be extended",
        };
      }
      const endsAt = createFestivalAuctionDeadline();
      await auction.update(
        { status: "live", endsAt, pausedRemainingMs: null },
        { transaction }
      );
      return { auctionId: auction.id, endsAt };
    });
    if (result.status) return res.status(result.status).json(result);
    scheduleFestivalAuctionEnd(result.auctionId, result.endsAt);
    const payload = {
      festivalId: req.params.festivalId,
      auctionId: result.auctionId,
      roundStatus: "live",
      endsAt: result.endsAt,
    };
    emitFestivalEvent(req.params.festivalId, "auction-extended", payload);
    emitFestivalEvent(req.params.festivalId, "auction-timer-updated", payload);
    await publishFestivalAuctionState(req.params.festivalId, "auction-extended");
    return res.status(200).json({ data: payload });
  } catch (error) {
    console.error("Error extending festival auction:", error);
    return res.status(500).json({ message: "Failed to extend auction" });
  }
};

export const completeFestivalAuction = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config) return { status: 404, message: "Auction config not found" };
      if (!["live", "paused"].includes(config.auctionStatus)) {
        return { status: 400, message: "Auction is not active" };
      }
      if (config.currentParticipantId) {
        return {
          status: 400,
          message: "Finalize the current participant before ending the auction",
        };
      }
      const completedAt = new Date();
      await config.update(
        {
          auctionStatus: "completed",
          status: "completed",
          completedAt,
        },
        { transaction }
      );
      return { data: toAuctionConfigResponse(config) };
    });
    if (result.status) return res.status(result.status).json(result);
    emitFestivalEvent(
      req.params.festivalId,
      "auction-completed",
      result.data
    );
    await publishFestivalAuctionState(
      req.params.festivalId,
      "auction-completed"
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error completing festival auction:", error);
    return res.status(500).json({ message: "Failed to complete festival auction" });
  }
};

export const startFestivalAuctionParticipant = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config) return { status: 404, message: "Auction config not found" };
      if (config.auctionStatus !== "live") {
        return { status: 400, message: "Auction must be live" };
      }
      if (config.currentParticipantId) {
        return {
          status: 400,
          message: "Finalize the current participant first",
        };
      }
      const progression = getFestivalBidProgression({
        basePrice: req.body.basePrice,
        incrementPercentage: config.incrementPercentage || 20,
      });
      if (!Number.isSafeInteger(progression.incrementAmount)) {
        return {
          status: 400,
          message:
            "Base price must produce a whole-number bid increment for the configured percentage",
        };
      }
      const participant = await FestivalParticipant.findOne({
        where: {
          id: req.params.participantId,
          festivalId: req.params.festivalId,
          status: "registered",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!participant) {
        return { status: 404, message: "Festival participant not found" };
      }
      const [membership, poolEntry, attemptCount] = await Promise.all([
        FestivalTeamMembership.findOne({
          where: {
            festivalId: req.params.festivalId,
            festivalParticipantId: participant.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalAuctionPool.findOne({
          where: {
            festivalId: req.params.festivalId,
            festivalParticipantId: participant.id,
            state: "available",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalAuction.count({
          where: {
            festivalId: req.params.festivalId,
            festivalParticipantId: participant.id,
          },
          transaction,
        }),
      ]);
      if (membership || !poolEntry) {
        return {
          status: 409,
          message: "Participant is not available in the auction pool",
        };
      }
      const auction = await FestivalAuction.create(
        {
          id: crypto.randomUUID(),
          festivalId: req.params.festivalId,
          festivalParticipantId: participant.id,
          status: "live",
          basePrice: req.body.basePrice,
          startedBy: req.user.id,
          startedAt: new Date(),
          endsAt: null,
          attemptNumber: attemptCount + 1,
        },
        { transaction }
      );
      await config.update(
        { currentParticipantId: participant.id },
        { transaction }
      );
      await poolEntry.update({ state: "available" }, { transaction });
      return { auctionId: auction.id };
    });
    if (result.status) return res.status(result.status).json(result);
    const endsAt = createFestivalAuctionDeadline();
    await FestivalAuction.update(
      { endsAt, pausedRemainingMs: null },
      { where: { id: result.auctionId } }
    );
    const auction = await loadAuctionResponse(result.auctionId);
    scheduleFestivalAuctionEnd(auction.id, auction.endsAt);
    const config = await loadConfig(req.params.festivalId);
    const payload = toAuction(auction, config);
    emitFestivalEvent(
      req.params.festivalId,
      "participant-started",
      payload
    );
    await publishFestivalAuctionState(
      req.params.festivalId,
      "participant-started"
    );
    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("Error starting auction participant:", error);
    return res.status(500).json({ message: "Failed to start participant" });
  }
};

export const placeFestivalAuctionBid = async (req, res) => {
  const traceStartedAt = nowMs();
  const trace = {
    scopeType: "festival",
    festivalId: req.params.festivalId,
    endpoint: "Place Bid",
    phase: "bidRequest",
    requestReceivedAt: new Date().toISOString(),
    validationMs: 0,
    dbMs: 0,
    socketBroadcastMs: 0,
    socketSerializationMs: 0,
    socketPayloadBytes: 0,
    publishAuctionStateMs: "deferred",
  };
  logBidLatencyTrace(trace);
  res.on("finish", () => {
    logBidLatencyTrace({
      ...trace,
      phase: "httpResponseSent",
      statusCode: res.statusCode,
      response: elapsedMs(traceStartedAt),
    });
  });
  try {
    if (req.user.role !== "team_owner") {
      return res.status(403).json({
        success: false,
        message: "Only team_owner accounts can bid",
      });
    }
    const result = await sequelize.transaction(async (transaction) => {
      const validationStartedAt = nowMs();
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || config.auctionStatus !== "live") {
        return { status: 400, message: "Auction is not accepting bids" };
      }
      const auction = await loadCurrentAuction(config, transaction, true);
      if (
        !auction ||
        auction.status !== "live" ||
        !auction.endsAt ||
        new Date(auction.endsAt).getTime() <= Date.now()
      ) {
        return { status: 400, message: "No participant is currently active" };
      }
      const owner = await findOwnerForUser(
        req.params.festivalId,
        req.user.id,
        transaction,
        true
      );
      if (!owner) {
        return {
          status: 403,
          message: "Only an assigned Festival Team owner can bid",
        };
      }
      if (req.body.auctionId !== auction.id) {
        return {
          status: 409,
          message: "Auction state changed. Refresh before bidding again.",
        };
      }
      const highestBid = await FestivalAuctionBid.findOne({
        where: { festivalAuctionId: auction.id },
        order: [
          ["amount", "DESC"],
          ["createdAt", "ASC"],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (highestBid?.festivalTeamId === owner.festivalTeamId) {
        return {
          status: 400,
          message: "Your team already holds the highest bid",
        };
      }
      const currentBid = highestBid?.amount ?? 0;
      if (toMoney(req.body.expectedCurrentBid) !== toMoney(currentBid)) {
        return {
          status: 409,
          message: "A newer bid was already accepted. Review the latest bid.",
        };
      }
      const budgets = await calculateTeamBudgets(
        req.params.festivalId,
        config,
        transaction
      );
      const budget = budgets.find(
        ({ festivalTeamId }) => festivalTeamId === owner.festivalTeamId
      );
      const progression = getBidProgression(
        auction,
        config,
        currentBid
      );
      const amount = progression.nextBid;
      if (!budget || amount > budget.remainingBudget) {
        return {
          status: 400,
          message: "Bid exceeds the team's remaining purse",
        };
      }
      trace.validationMs = elapsedMs(validationStartedAt);
      trace.validationCompleteAt = new Date().toISOString();
      const dbStartedAt = nowMs();
      const bid = await FestivalAuctionBid.create(
        {
          id: crypto.randomUUID(),
          festivalId: req.params.festivalId,
          festivalAuctionId: auction.id,
          festivalParticipantId: auction.festivalParticipantId,
          festivalTeamId: owner.festivalTeamId,
          festivalTeamOwnerId: owner.id,
          placedByUserId: req.user.id,
          amount,
          placedAt: new Date(),
        },
        { transaction }
      );
      const bidCount = await FestivalAuctionBid.count({
        where: { festivalAuctionId: auction.id },
        transaction,
      });
      const endsAt = createFestivalAuctionDeadline();
      await auction.update(
        { endsAt, pausedRemainingMs: null },
        { transaction }
      );
      trace.dbMs = elapsedMs(dbStartedAt);
      trace.dbWriteCompleteAt = new Date().toISOString();
      return {
        bidId: bid.id,
        auctionId: auction.id,
        basePrice: progression.basePrice,
        bidCount,
        endsAt,
        incrementPercentage: config.incrementPercentage,
        amount,
        placedAt: bid.placedAt,
        festivalParticipantId: auction.festivalParticipantId,
        festivalTeamId: owner.festivalTeamId,
        teamName: owner.team?.name,
      };
    });
    if (result.status) return res.status(result.status).json(result);
    scheduleFestivalAuctionEnd(result.auctionId, result.endsAt);
    const progression = getFestivalBidProgression({
      basePrice: result.basePrice,
      currentBid: result.amount,
      incrementPercentage: result.incrementPercentage || 20,
    });
    const payload = {
      id: result.bidId,
      festivalAuctionId: result.auctionId,
      festivalParticipantId: result.festivalParticipantId,
      festivalTeamId: result.festivalTeamId,
      teamName: result.teamName,
      amount: toMoney(result.amount),
      placedAt: result.placedAt,
      bidNumber: result.bidCount,
      bidCount: result.bidCount,
      timerDurationSeconds: FESTIVAL_AUCTION_DURATION_MS / 1000,
      endsAt: result.endsAt,
      ...progression,
    };
    const socketStartedAt = nowMs();
    const serializeStartedAt = nowMs();
    const bidPayloadBytes = payloadSizeBytes(payload);
    const timerPayload = {
      festivalId: req.params.festivalId,
      auctionId: result.auctionId,
      endsAt: result.endsAt,
      roundStatus: "live",
    };
    const timerPayloadBytes = payloadSizeBytes(timerPayload);
    trace.socketSerializationMs = elapsedMs(serializeStartedAt);
    trace.socketPayloadBytes = bidPayloadBytes + timerPayloadBytes;
    emitFestivalEvent(req.params.festivalId, "bid-placed", payload);
    emitFestivalEvent(
      req.params.festivalId,
      "auction-timer-updated",
      timerPayload
    );
    trace.socketBroadcastMs = elapsedMs(socketStartedAt);
    trace.socketBid = trace.socketBroadcastMs;
    trace.immediateBidSocketEmittedAt = new Date().toISOString();
    trace.httpResponseMs = elapsedMs(traceStartedAt);
    trace.response = trace.httpResponseMs;
    logBidLatencyTrace(trace);
    void publishFestivalAuctionState(req.params.festivalId, "bid-placed");
    return res.status(201).json({ data: payload });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ success: false, message: "Duplicate bid amount rejected" });
    }
    console.error("Error placing festival auction bid:", error);
    return res.status(500).json({ message: "Failed to place bid" });
  }
};

const finalizeParticipant = async (req, res, outcome) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await Festival.findByPk(req.params.festivalId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!festival) return { status: 404, message: "Festival not found" };
      if (festival.rosterFormationMode !== "auction") {
        return {
          status: 400,
          message:
            "Auction roster finalization is disabled when roster formation mode is manual",
        };
      }
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || !["live", "paused"].includes(config.auctionStatus)) {
        return { status: 400, message: "Auction is not active" };
      }
      if (config.currentParticipantId !== req.params.participantId) {
        return { status: 400, message: "Participant is not currently active" };
      }
      const auction = await loadCurrentAuction(config, transaction, true);
      if (!auction || auction.status !== "pending") {
        return {
          status: 400,
          message: "Bidding must expire before admin finalization",
        };
      }
      const existingResult = await FestivalAuctionResult.findOne({
        where: { festivalAuctionId: auction.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingResult) {
        return { status: 409, message: "Participant is already finalized" };
      }
      const highestBid = await FestivalAuctionBid.findOne({
        where: { festivalAuctionId: auction.id },
        order: [
          ["amount", "DESC"],
          ["createdAt", "ASC"],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (outcome === "sold" && !highestBid) {
        return {
          status: 400,
          message: "Participant cannot be sold without a winning bid",
        };
      }
      if (outcome === "unsold" && highestBid) {
        return {
          status: 400,
          message: "Participant cannot be marked unsold after bids exist",
        };
      }
      if (outcome === "sold") {
        const membership = await FestivalTeamMembership.findOne({
          where: {
            festivalId: req.params.festivalId,
            festivalParticipantId: auction.festivalParticipantId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (membership) {
          return {
            status: 409,
            message: "Participant already belongs to a festival team",
          };
        }
        const budgets = await calculateTeamBudgets(
          req.params.festivalId,
          config,
          transaction
        );
        const winningBudget = budgets.find(
          ({ festivalTeamId }) =>
            festivalTeamId === highestBid.festivalTeamId
        );
        if (
          !winningBudget ||
          toMoney(highestBid.amount) > winningBudget.remainingBudget
        ) {
          return {
            status: 400,
            message: "Winning team no longer has sufficient purse",
          };
        }
        await FestivalTeamMembership.create(
          {
            id: crypto.randomUUID(),
            festivalId: req.params.festivalId,
            festivalParticipantId: auction.festivalParticipantId,
            festivalTeamId: highestBid.festivalTeamId,
            assignmentMethod: "manual",
            rosterSource: "auction",
            assignedBy: req.user.id,
            assignedAt: new Date(),
          },
          { transaction }
        );
      }
      const finalizedAt = new Date();
      const auctionResult = await FestivalAuctionResult.create(
        {
          id: crypto.randomUUID(),
          festivalId: req.params.festivalId,
          festivalAuctionId: auction.id,
          festivalParticipantId: auction.festivalParticipantId,
          outcome,
          festivalTeamId:
            outcome === "sold" ? highestBid.festivalTeamId : null,
          winningBidId: outcome === "sold" ? highestBid.id : null,
          finalAmount: outcome === "sold" ? highestBid.amount : null,
          finalizedBy: req.user.id,
          finalizedAt,
        },
        { transaction }
      );
      await auction.update(
        {
          status: outcome,
          finalizedBy: req.user.id,
          finalizedAt,
        },
        { transaction }
      );
      await config.update({ currentParticipantId: null }, { transaction });
      const [poolEntry] = await FestivalAuctionPool.findOrCreate({
        where: {
          festivalId: req.params.festivalId,
          festivalParticipantId: auction.festivalParticipantId,
        },
        defaults: {
          id: crypto.randomUUID(),
          state: outcome,
          reauctionCount: Math.max(0, auction.attemptNumber - 1),
          generatedAt: new Date(),
        },
        transaction,
      });
      await poolEntry.update({ state: outcome }, { transaction });
      await FestivalOperationAudit.create(
        {
          id: crypto.randomUUID(),
          festivalId: req.params.festivalId,
          actorUserId: req.user.id,
          action: `auction_participant_${outcome}`,
          entityType: "festival_participant",
          entityId: auction.festivalParticipantId,
          details: {
            festivalAuctionId: auction.id,
            attemptNumber: auction.attemptNumber,
            finalAmount:
              outcome === "sold" ? toMoney(highestBid.amount) : null,
          },
        },
        { transaction }
      );
      return { resultId: auctionResult.id, auctionId: auction.id };
    });
    if (result.status) return res.status(result.status).json(result);
    const auction = await loadAuctionResponse(result.auctionId);
    clearFestivalAuctionTimer(result.auctionId);
    const config = await loadConfig(req.params.festivalId);
    const payload = toAuction(auction, config);
    emitFestivalEvent(
      req.params.festivalId,
      outcome === "sold" ? "participant-sold" : "participant-unsold",
      payload
    );
    await publishFestivalAuctionState(
      req.params.festivalId,
      outcome === "sold" ? "participant-sold" : "participant-unsold"
    );
    return res.status(200).json({ data: payload });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ success: false, message: "Participant is already finalized" });
    }
    console.error(`Error marking participant ${outcome}:`, error);
    return res.status(500).json({ message: `Failed to mark participant ${outcome}` });
  }
};

export const sellFestivalAuctionParticipant = (req, res) =>
  finalizeParticipant(req, res, "sold");

export const markFestivalAuctionParticipantUnsold = (req, res) =>
  finalizeParticipant(req, res, "unsold");

export const getFestivalAuctionCurrent = async (req, res) => {
  try {
    let config = await FestivalAuctionConfig.findOne({
      where: { festivalId: req.params.festivalId },
    });
    if (!config) {
      return res.status(404).json({ success: false, message: "Auction not configured" });
    }
    let auction = config.currentParticipantId
      ? await FestivalAuction.findOne({
          where: {
            festivalId: req.params.festivalId,
            festivalParticipantId: config.currentParticipantId,
          },
          include: auctionInclude,
          order: [["attemptNumber", "DESC"]],
        })
      : null;
    if (
      auction?.status === "live" &&
      auction.endsAt &&
      new Date(auction.endsAt).getTime() <= Date.now()
    ) {
      logExpiry("overdue round detected during current-state read", {
        auctionId: auction.id,
        festivalId: req.params.festivalId,
        endsAt: auction.endsAt,
      });
      await markFestivalAuctionPending(auction.id, auction.endsAt);
      config = await FestivalAuctionConfig.findOne({
        where: { festivalId: req.params.festivalId },
      });
      auction = await FestivalAuction.findByPk(auction.id, {
        include: auctionInclude,
      });
    }
    const [sharedState, owner] = await Promise.all([
      loadFestivalAuctionSharedState(req.params.festivalId),
      req.user.role === "team_owner"
        ? findOwnerForUser(req.params.festivalId, req.user.id)
        : null,
    ]);
    return res.status(200).json({
      data: {
        ...sharedState,
        serverTime: new Date().toISOString(),
        viewer: {
          isAdmin: req.user.role === "admin",
          isOwner: Boolean(owner),
          festivalTeamId: owner?.festivalTeamId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching current festival auction:", error);
    return res.status(500).json({ message: "Failed to fetch current auction" });
  }
};

export const reauctionFestivalParticipants = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const config = await loadConfig(req.params.festivalId, transaction, true);
      if (!config || !["live", "paused"].includes(config.auctionStatus)) {
        return { status: 400, message: "Auction must be live or paused" };
      }
      if (config.currentParticipantId) {
        return {
          status: 400,
          message: "Finalize the current participant before changing the pool",
        };
      }
      const where = {
        festivalId: req.params.festivalId,
        state: "unsold",
        ...(req.body.participantIds?.length
          ? { festivalParticipantId: req.body.participantIds }
          : {}),
      };
      const entries = await FestivalAuctionPool.findAll({
        where,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!entries.length) {
        return { status: 400, message: "No unsold participants were selected" };
      }
      const reauctionedAt = new Date();
      for (const entry of entries) {
        await entry.update(
          {
            state: "available",
            reauctionCount: Number(entry.reauctionCount || 0) + 1,
            lastReauctionedAt: reauctionedAt,
          },
          { transaction }
        );
        await FestivalOperationAudit.create(
          {
            id: crypto.randomUUID(),
            festivalId: req.params.festivalId,
            actorUserId: req.user.id,
            action: "auction_participant_reauctioned",
            entityType: "festival_participant",
            entityId: entry.festivalParticipantId,
            details: { reauctionCount: Number(entry.reauctionCount) },
          },
          { transaction }
        );
      }
      return {
        participantIds: entries.map(({ festivalParticipantId }) =>
          festivalParticipantId
        ),
        count: entries.length,
      };
    });
    if (result.status) return res.status(result.status).json(result);
    emitFestivalEvent(req.params.festivalId, "participants-reauctioned", result);
    await publishFestivalAuctionState(
      req.params.festivalId,
      "participants-reauctioned"
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Error re-auctioning festival participants:", error);
    return res.status(500).json({ message: "Failed to re-auction participants" });
  }
};

export const getFestivalAuctionReadiness = async (req, res) => {
  try {
    const readiness = await getFestivalReadiness(req.params.festivalId);
    if (!readiness) {
      return res
        .status(404)
        .json({ success: false, message: "Festival not found" });
    }
    return res.status(200).json({ data: readiness });
  } catch (error) {
    console.error("Error fetching festival readiness:", error);
    return res.status(500).json({ message: "Failed to fetch festival readiness" });
  }
};

export const getFestivalAuctionHistory = async (req, res) => {
  try {
    const { history, audits } = await loadFestivalAuctionHistory(
      req.params.festivalId
    );
    return res.status(200).json({
      data: history,
      audits,
      meta: { count: history.length, auditCount: audits.length },
    });
  } catch (error) {
    console.error("Error fetching festival auction history:", error);
    return res.status(500).json({ message: "Failed to fetch auction history" });
  }
};
