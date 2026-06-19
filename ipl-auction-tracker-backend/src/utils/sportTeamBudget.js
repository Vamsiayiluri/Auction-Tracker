import {
  SportTeam,
  SportTeamBudget,
  SportAuctionResult,
  SportTournament,
} from "../models/index.js";
import {
  incrementRequestCounter,
  requestCacheGetOrSet,
  transactionScopedCacheKey,
} from "./requestPerformance.js";

const toNumber = (value) => Number(value || 0);

export const toSportTeamBudgetResponse = (budget, team, spentCredits = 0) => {
  const allocatedCredits = toNumber(budget?.allocatedCredits);
  const adjustmentCredits = toNumber(budget?.adjustmentCredits);
  return {
    id: budget?.id || null,
    sportTournamentId: team.sportTournamentId,
    sportTeamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    allocatedCredits,
    adjustmentCredits,
    effectiveCredits: allocatedCredits + adjustmentCredits,
    spentCredits: toNumber(spentCredits),
    remainingCredits:
      allocatedCredits + adjustmentCredits - toNumber(spentCredits),
    status: budget?.status || "missing",
    configuredByUserId: budget?.configuredByUserId || null,
    configuredAt: budget?.configuredAt || null,
  };
};

export const getSportTournamentBudgetSummary = async (
  sportTournamentId,
  transaction
) => {
  const cacheKey = transactionScopedCacheKey(
    "sport-team-budgets",
    sportTournamentId,
    transaction
  );
  return requestCacheGetOrSet(cacheKey, async () => {
    incrementRequestCounter("sportTeamBudgetCalculations");
    const tournament = await SportTournament.findByPk(sportTournamentId, {
      attributes: ["id"],
      transaction,
    });
    if (!tournament) return null;

    const [teams, budgets, results] = await Promise.all([
      SportTeam.findAll({
        where: { sportTournamentId, status: "active" },
        attributes: [
          "id",
          "sportTournamentId",
          "name",
          "code",
          "status",
        ],
        order: [["name", "ASC"]],
        transaction,
      }),
      SportTeamBudget.findAll({
        where: { sportTournamentId },
        attributes: [
          "id",
          "sportTournamentId",
          "sportTeamId",
          "allocatedCredits",
          "adjustmentCredits",
          "status",
          "configuredByUserId",
          "configuredAt",
        ],
        transaction,
      }),
      SportAuctionResult.findAll({
        where: { sportTournamentId, outcome: "sold" },
        attributes: ["sportTeamId", "finalCredits"],
        transaction,
      }),
    ]);
    const budgetByTeamId = new Map(
      budgets.map((budget) => [budget.sportTeamId, budget])
    );
    const spentByTeamId = new Map();
    results.forEach((result) => {
      spentByTeamId.set(
        result.sportTeamId,
        toNumber(spentByTeamId.get(result.sportTeamId)) +
          toNumber(result.finalCredits)
      );
    });
    const teamBudgets = teams.map((team) =>
      toSportTeamBudgetResponse(
        budgetByTeamId.get(team.id),
        team,
        spentByTeamId.get(team.id)
      )
    );

    return {
      sportTournamentId,
      configuredTeamCount: teamBudgets.filter(
        ({ status }) => status === "active"
      ).length,
      totalTeamCount: teams.length,
      totalAllocatedCredits: teamBudgets.reduce(
        (total, { allocatedCredits }) => total + allocatedCredits,
        0
      ),
      totalAdjustmentCredits: teamBudgets.reduce(
        (total, { adjustmentCredits }) => total + adjustmentCredits,
        0
      ),
      totalEffectiveCredits: teamBudgets.reduce(
        (total, { effectiveCredits }) => total + effectiveCredits,
        0
      ),
      totalSpentCredits: teamBudgets.reduce(
        (total, { spentCredits }) => total + spentCredits,
        0
      ),
      totalRemainingCredits: teamBudgets.reduce(
        (total, { remainingCredits }) => total + remainingCredits,
        0
      ),
      teams: teamBudgets,
    };
  });
};
