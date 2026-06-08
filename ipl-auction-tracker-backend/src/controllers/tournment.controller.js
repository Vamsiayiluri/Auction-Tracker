import { Op } from "sequelize";
import crypto from "crypto";
import { Player, Team, Tournament, TournamentTeam } from "../models/index.js";
import {
  isValidTournamentTransition,
  tournamentTransitionValidationError,
} from "../utils/tournamentStatus.js";

export const createTournament = async (req, res) => {
  try {
    const { id, name, budget, teams, players } = req.body;

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
