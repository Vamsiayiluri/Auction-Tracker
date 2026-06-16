import {
  SportTeam,
  SportTeamCaptain,
  SportAuctionPool,
  SportAuctionConfig,
  SportTournament,
} from "../models/index.js";
import { getSportTournamentBudgetSummary } from "./sportTeamBudget.js";
import { getSportTournamentEligibility } from "./sportTournamentEligibility.js";

export const getSportTournamentReadiness = async (
  sportTournamentId,
  transaction,
  { persistStatus = true } = {}
) => {
  const tournament = await SportTournament.findByPk(sportTournamentId, {
    transaction,
  });
  if (!tournament) return null;

  const [teams, captains, eligibility, budgetSummary, poolEntries, auctionConfig] =
    await Promise.all([
    SportTeam.findAll({
      where: { sportTournamentId, status: "active" },
      order: [["name", "ASC"]],
      transaction,
    }),
    SportTeamCaptain.findAll({
      where: { sportTournamentId, status: "active" },
      transaction,
    }),
    getSportTournamentEligibility(sportTournamentId, transaction),
    getSportTournamentBudgetSummary(sportTournamentId, transaction),
    SportAuctionPool.findAll({
      where: { sportTournamentId },
      attributes: ["state", "festivalParticipantId"],
      transaction,
    }),
    SportAuctionConfig.findOne({ where: { sportTournamentId }, transaction }),
  ]);

  const eligibleIds = new Set(
    eligibility.included.map(({ festivalParticipantId }) => festivalParticipantId)
  );
  const captainByTeamId = new Map(
    captains.map((captain) => [captain.sportTeamId, captain])
  );
  const activeBudgetByTeamId = new Map(
    budgetSummary.teams
      .filter(
        ({ status, effectiveCredits }) =>
          status === "active" && effectiveCredits > 0
      )
      .map((budget) => [budget.sportTeamId, budget])
  );
  const availablePoolCount = poolEntries.filter(
    ({ state }) => state === "available"
  ).length;
  const eligiblePoolIds = new Set(
    eligibility.included
      .filter(({ availableParticipantPool }) => availableParticipantPool)
      .map(({ festivalParticipantId }) => festivalParticipantId)
  );
  const storedAvailablePoolIds = new Set(
    poolEntries
      .filter(({ state }) => state === "available")
      .map(({ festivalParticipantId }) => festivalParticipantId)
  );
  const poolIsCurrent =
    eligiblePoolIds.size === storedAvailablePoolIds.size &&
    [...eligiblePoolIds].every((id) => storedAvailablePoolIds.has(id));
  const teamReadiness = teams.map((team) => {
    const captain = captainByTeamId.get(team.id);
    const blockers = [];
    if (!captain) blockers.push("Captain not assigned");
    if (captain && !eligibleIds.has(captain.festivalParticipantId)) {
      blockers.push("Assigned Captain is not eligible");
    }
    if (!activeBudgetByTeamId.has(team.id)) {
      blockers.push("Active positive credit budget is not configured");
    }
    return {
      sportTeamId: team.id,
      teamName: team.name,
      captainAssigned: Boolean(captain),
      captainEligible: Boolean(
        captain && eligibleIds.has(captain.festivalParticipantId)
      ),
      budgetConfigured: activeBudgetByTeamId.has(team.id),
      blockers,
    };
  });

  const checks = [
    {
      key: "auctionConfig",
      ready: Boolean(auctionConfig),
      blocker: "Sport Auction timer and increment settings are not configured",
    },
    {
      key: "tournament",
      ready: Boolean(tournament),
      blocker: "Sport Tournament does not exist",
    },
    {
      key: "teams",
      ready: teams.length === tournament.teamCount && teams.length > 0,
      blocker: `Expected ${tournament.teamCount} active Sport Teams, found ${teams.length}`,
    },
    {
      key: "captains",
      ready:
        teams.length > 0 &&
        teams.every((team) => captainByTeamId.has(team.id)),
      blocker: "Every Sport Team must have a Captain",
    },
    {
      key: "captainEligibility",
      ready: captains.every((captain) =>
        eligibleIds.has(captain.festivalParticipantId)
      ),
      blocker: "Every assigned Captain must be eligible",
    },
    {
      key: "eligiblePool",
      ready: eligibility.availablePoolCount > 0,
      blocker: "No eligible participants remain after Captain assignments",
    },
    {
      key: "budgets",
      ready:
        teams.length > 0 &&
        teams.every((team) => activeBudgetByTeamId.has(team.id)),
      blocker: "Every Sport Team must have an active positive credit budget",
    },
    {
      key: "poolExists",
      ready: poolEntries.length > 0,
      blocker: "Sport Auction Pool has not been generated",
    },
    {
      key: "poolAvailable",
      ready: availablePoolCount > 0,
      blocker: "Sport Auction Pool has no available participants",
    },
    {
      key: "poolCurrent",
      ready: poolEntries.length > 0 && poolIsCurrent,
      blocker: "Sport Auction Pool is stale and must be regenerated",
    },
  ];
  const blockers = checks.filter(({ ready }) => !ready).map(({ blocker }) => blocker);
  teamReadiness.forEach((team) =>
    team.blockers.forEach((blocker) => blockers.push(`${team.teamName}: ${blocker}`))
  );
  const readinessScore = Math.round(
    (checks.filter(({ ready }) => ready).length / checks.length) * 100
  );
  const readinessStatus = blockers.length ? "NOT_READY" : "READY";

  if (
    persistStatus &&
    !["auction_live", "auction_paused", "auction_completed", "competition_pending", "competition_live", "competition_completed", "archived"].includes(
      tournament.status
    )
  ) {
    const nextStatus = readinessStatus === "READY" ? "ready" : "setup";
    if (tournament.status !== nextStatus) {
      await tournament.update({ status: nextStatus }, { transaction });
    }
  }

  return {
    sportTournamentId,
    readinessScore,
    readinessStatus,
    blockers: [...new Set(blockers)],
    counts: {
      configuredTeams: tournament.teamCount,
      activeTeams: teams.length,
      captainsAssigned: captains.length,
      eligibleParticipants: eligibility.eligibleCount,
      availableParticipantPool: eligibility.availablePoolCount,
      budgetsConfigured: activeBudgetByTeamId.size,
      poolEntries: poolEntries.length,
      poolAvailable: availablePoolCount,
      poolCurrent: poolIsCurrent,
      auctionConfigured: Boolean(auctionConfig),
    },
    budgetSummary,
    checks: Object.fromEntries(checks.map(({ key, ready }) => [key, ready])),
    teams: teamReadiness,
  };
};
