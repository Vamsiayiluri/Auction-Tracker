import { randomUUID } from "node:crypto";
import sequelize from "../config/dbconfig.js";
import {
  SportAuction,
  SportTeam,
  SportTeamBudget,
  SportTournament,
} from "../models/index.js";
import {
  getSportAuctionPool,
  replaceSportAuctionPool,
} from "../utils/sportAuctionPool.js";
import { loadAuthorizedSportTournament } from "../utils/sportTournamentAuthorization.js";
import { getSportTournamentReadiness } from "../utils/sportTournamentReadiness.js";
import { getSportTournamentBudgetSummary } from "../utils/sportTeamBudget.js";

const setupStatuses = new Set(["draft", "setup", "ready"]);

const loadReadableTournament = async (sportTournamentId, transaction) =>
  SportTournament.findByPk(sportTournamentId, { transaction });

const requireManageableTournament = async (req, res, transaction) => {
  const { tournament, authorized } = await loadAuthorizedSportTournament({
    sportTournamentId: req.params.sportTournamentId,
    user: req.user,
    transaction,
  });
  if (!tournament) {
    res.status(404).json({ success: false, message: "Sport Tournament not found" });
    return null;
  }
  if (!authorized) {
    res.status(403).json({ success: false, message: "Access denied" });
    return null;
  }
  if (!setupStatuses.has(tournament.status)) {
    res.status(409).json({
      success: false,
      message: "Sport Tournament auction preparation is locked",
    });
    return null;
  }
  return tournament;
};

export const getSportTeamBudgets = async (req, res) => {
  try {
    const tournament = await loadReadableTournament(
      req.params.sportTournamentId
    );
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Sport Tournament not found",
      });
    }
    const summary = await getSportTournamentBudgetSummary(tournament.id);
    return res.status(200).json({ data: summary });
  } catch (error) {
    console.error("Failed to load Sport Team budgets:", error);
    return res.status(500).json({ message: "Failed to load Sport Team budgets" });
  }
};

export const distributeSportTeamBudgets = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireManageableTournament(
        req,
        res,
        transaction
      );
      if (!tournament) return;

      const teams = await SportTeam.findAll({
        where: { sportTournamentId: tournament.id, status: "active" },
        order: [["name", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!teams.length) {
        res.status(409).json({
          success: false,
          message: "Create Sport Teams before configuring budgets",
        });
        return;
      }
      if (req.body.totalCredits % teams.length !== 0) {
        res.status(400).json({
          success: false,
          message: "Total Tournament Credits must divide equally across active Teams",
        });
        return;
      }

      const allocatedCredits = req.body.totalCredits / teams.length;
      for (const team of teams) {
        const [budget] = await SportTeamBudget.findOrCreate({
          where: {
            sportTournamentId: tournament.id,
            sportTeamId: team.id,
          },
          defaults: {
            id: randomUUID(),
            allocatedCredits,
            adjustmentCredits: 0,
            status: "active",
            configuredByUserId: req.user.id,
            configuredAt: new Date(),
          },
          transaction,
        });
        await budget.update(
          {
            allocatedCredits,
            adjustmentCredits: 0,
            status: "active",
            configuredByUserId: req.user.id,
            configuredAt: new Date(),
          },
          { transaction }
        );
      }
      await getSportTournamentReadiness(tournament.id, transaction);
    });
    if (res.headersSent) return;
    return res.status(200).json({
      data: await getSportTournamentBudgetSummary(
        req.params.sportTournamentId
      ),
    });
  } catch (error) {
    console.error("Failed to distribute Sport Team budgets:", error);
    return res.status(500).json({ message: "Failed to distribute budgets" });
  }
};

export const updateSportTeamBudgets = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireManageableTournament(
        req,
        res,
        transaction
      );
      if (!tournament) return;

      const teams = await SportTeam.findAll({
        where: { sportTournamentId: tournament.id, status: "active" },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const teamIds = new Set(teams.map(({ id }) => id));
      if (
        req.body.budgets.some(
          ({ sportTeamId }) => !teamIds.has(sportTeamId)
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Every budget must belong to an active Team in this Tournament",
        });
        return;
      }

      for (const input of req.body.budgets) {
        const [budget] = await SportTeamBudget.findOrCreate({
          where: {
            sportTournamentId: tournament.id,
            sportTeamId: input.sportTeamId,
          },
          defaults: {
            id: randomUUID(),
            allocatedCredits: input.allocatedCredits,
            adjustmentCredits: input.adjustmentCredits,
            status: input.status,
            configuredByUserId: req.user.id,
            configuredAt: new Date(),
          },
          transaction,
        });
        await budget.update(
          {
            allocatedCredits: input.allocatedCredits,
            adjustmentCredits: input.adjustmentCredits,
            status: input.status,
            configuredByUserId: req.user.id,
            configuredAt: new Date(),
          },
          { transaction }
        );
      }
      await getSportTournamentReadiness(tournament.id, transaction);
    });
    if (res.headersSent) return;
    return res.status(200).json({
      data: await getSportTournamentBudgetSummary(
        req.params.sportTournamentId
      ),
    });
  } catch (error) {
    console.error("Failed to update Sport Team budgets:", error);
    return res.status(500).json({ message: "Failed to update budgets" });
  }
};

export const getSportTournamentPool = async (req, res) => {
  try {
    const tournament = await loadReadableTournament(
      req.params.sportTournamentId
    );
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Sport Tournament not found",
      });
    }
    return res.status(200).json({
      data: await getSportAuctionPool(tournament.id),
    });
  } catch (error) {
    console.error("Failed to load Sport Auction Pool:", error);
    return res.status(500).json({ message: "Failed to load Sport Auction Pool" });
  }
};

export const generateSportTournamentPool = async (req, res) => {
  try {
    let result;
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireManageableTournament(
        req,
        res,
        transaction
      );
      if (!tournament) return;
      const auctionRoundCount = await SportAuction.count({
        where: { sportTournamentId: tournament.id },
        transaction,
      });
      if (auctionRoundCount > 0) {
        res.status(409).json({
          success: false,
          message:
            "Auction Pool cannot be regenerated after Sport Auction history exists",
        });
        return;
      }
      result = await replaceSportAuctionPool({
        sportTournamentId: tournament.id,
        generatedByUserId: req.user.id,
        transaction,
      });
      await getSportTournamentReadiness(tournament.id, transaction);
    });
    if (res.headersSent) return;
    return res.status(200).json({
      data: {
        pool: result.pool,
        eligibleCount: result.eligibility.availablePoolCount,
        excludedCount:
          result.eligibility.totalParticipants -
          result.eligibility.availablePoolCount,
        excluded: [
          ...result.eligibility.excluded,
          ...result.eligibility.poolExcluded,
        ],
      },
    });
  } catch (error) {
    console.error("Failed to generate Sport Auction Pool:", error);
    return res.status(500).json({ message: "Failed to generate Sport Auction Pool" });
  }
};
