import { Op } from "sequelize";
import crypto from "crypto";
import sequelize from "../config/dbconfig.js";
import { Player, Team, Tournament, TournamentTeam } from "../models/index.js";
import {
  isArchivableTournamentStatus,
  isEditableTournamentStatus,
  isValidTournamentTransition,
  tournamentReadOnlyValidationError,
  tournamentTransitionValidationError,
} from "../utils/tournamentStatus.js";

export const createTournament = async (req, res) => {
  try {
    const { id, name, sportId, budget, teams, players } = req.body;

    const participatingTeams = await Team.findAll({
      where: { name: { [Op.in]: teams } },
    });

    if (participatingTeams.length !== teams.length) {
      return res
        .status(400)
        .json({ message: "One or more selected teams do not exist" });
    }

    const newTournament = await Tournament.create({
      id,
      name,
      sportId,
      budget,
      createdBy: req.user.id,
    });

    await TournamentTeam.bulkCreate(
      participatingTeams.map((team) => ({
        id: crypto.randomUUID(),
        tournamentId: id,
        teamId: team.id,
        totalAmount: budget,
        amountSpent: 0,
      }))
    );

    await Player.bulkCreate(
      players.map((player) => ({
        ...player,
        tournamentId: id,
        sportId,
        isSold: false,
        isInAuction: false,
        soldPrice: null,
        teamId: null,
        auctionId: "",
      }))
    );

    res.status(201).json({
      message: "Tournament created successfully",
      tournament: newTournament,
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.findAll();
    res.status(200).json(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByPk(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.status(200).json(tournament);
  } catch (error) {
    console.error("Error fetching tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tournament = await Tournament.findByPk(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isValidTournamentTransition(tournament.status, status)) {
      return res
        .status(400)
        .json(tournamentTransitionValidationError(tournament.status, status));
    }

    tournament.status = status;
    await tournament.save();

    res.status(200).json({ message: "Tournament status updated", tournament });
  } catch (error) {
    console.error("Error fetching tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTournament = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { name, sportId, budget, teams, players } = req.body;
    const tournament = await Tournament.findByPk(id, { transaction });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isEditableTournamentStatus(tournament.status)) {
      await transaction.rollback();
      return res
        .status(400)
        .json(tournamentReadOnlyValidationError(tournament.status));
    }

    if (sportId !== undefined && players === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            path: "body.players",
            message: "Players are required when changing tournament sport",
          },
        ],
      });
    }

    if (name !== undefined) tournament.name = name;
    if (sportId !== undefined) tournament.sportId = sportId;
    if (budget !== undefined) tournament.budget = budget;
    await tournament.save({ transaction });

    if (teams !== undefined) {
      const participatingTeams = await Team.findAll({
        where: { name: { [Op.in]: teams } },
        transaction,
      });

      if (participatingTeams.length !== teams.length) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: "One or more selected teams do not exist" });
      }

      await TournamentTeam.destroy({ where: { tournamentId: id }, transaction });
      await TournamentTeam.bulkCreate(
        participatingTeams.map((team) => ({
          id: crypto.randomUUID(),
          tournamentId: id,
          teamId: team.id,
          totalAmount: budget ?? tournament.budget,
          amountSpent: 0,
        })),
        { transaction }
      );
    } else if (budget !== undefined) {
      await TournamentTeam.update(
        { totalAmount: budget },
        { where: { tournamentId: id }, transaction }
      );
    }

    if (players !== undefined) {
      const mismatchedPlayer = players.find(
        (player) => player.sportId !== tournament.sportId
      );
      if (mismatchedPlayer) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: [
            {
              path: "body.players.sportId",
              message: "Player sport must match tournament sport",
            },
          ],
        });
      }

      await Player.destroy({ where: { tournamentId: id }, transaction });
      await Player.bulkCreate(
        players.map((player) => ({
          ...player,
          tournamentId: id,
          isSold: false,
          isInAuction: false,
          soldPrice: null,
          teamId: null,
          auctionId: "",
        })),
        { transaction }
      );
    }

    await transaction.commit();

    const updatedTournament = await Tournament.findByPk(id);
    res.status(200).json({
      message: "Tournament updated successfully",
      tournament: updatedTournament,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const archiveTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByPk(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isArchivableTournamentStatus(tournament.status)) {
      return res
        .status(400)
        .json(tournamentTransitionValidationError(tournament.status, "archived"));
    }

    tournament.status = "archived";
    await tournament.save();

    res.status(200).json({ message: "Tournament archived", tournament });
  } catch (error) {
    console.error("Error archiving tournament:", error);
    res.status(500).json({ message: "Server error" });
  }
};
