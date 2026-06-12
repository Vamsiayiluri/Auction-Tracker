import { Op } from "sequelize";
import { Bid, Player, Sport, Team, Tournament } from "../models/index.js";
import {
  buildPlayerImport,
  parsePlayerCsv,
  playerImportTemplates,
} from "../utils/playerCsvImport.js";
import {
  isEditableTournamentStatus,
  tournamentReadOnlyValidationError,
} from "../utils/tournamentStatus.js";

export const createPlayer = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.body.tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isEditableTournamentStatus(tournament.status)) {
      return res
        .status(400)
        .json(tournamentReadOnlyValidationError(tournament.status));
    }

    if (req.body.sportId !== tournament.sportId) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            path: "body.sportId",
            message: "Player sport must match tournament sport",
          },
        ],
      });
    }

    const player = await Player.create(req.body);

    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importPlayers = async (req, res) => {
  try {
    const tournamentId = req.body?.tournamentId;

    if (!tournamentId || !req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            row: null,
            message: "Tournament ID and CSV file are required",
          },
        ],
      });
    }

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isEditableTournamentStatus(tournament.status)) {
      return res
        .status(400)
        .json(tournamentReadOnlyValidationError(tournament.status));
    }

    const activeSports = await Sport.findAll({
      where: { isActive: true },
      attributes: ["id"],
    });
    const csvText = req.file.buffer.toString("utf8");
    const parsedCsv = parsePlayerCsv(csvText);
    const uploadedIds = parsedCsv.rows
      .map(({ row }) => row.id?.trim())
      .filter(Boolean);
    const existingPlayers = uploadedIds.length
      ? await Player.findAll({
          where: { id: { [Op.in]: uploadedIds } },
          attributes: ["id"],
        })
      : [];
    const result = buildPlayerImport({
      csvText,
      tournament,
      sportIds: activeSports.map((sport) => sport.id),
      existingPlayerIds: existingPlayers.map((player) => player.id),
    });

    if (result.players.length) {
      await Player.bulkCreate(result.players);
    }

    return res.status(200).json({
      success: true,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
    });
  } catch {
    return res.status(500).json({ message: "Player import failed" });
  }
};

export const downloadPlayerImportTemplate = (req, res) => {
  const type = req.params.type === "mixed" ? "mixed" : "cricket";
  const csv = playerImportTemplates[type];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="player-import-${type}.csv"`
  );
  return res.status(200).send(csv);
};

export const getPlayers = async (req, res) => {
  try {
    const { tournamentId } = req.query;

    let players;

    if (tournamentId) {
      // Get players by tournament ID
      players = await Player.findAll({ where: { tournamentId } });
    } else {
      players = await Player.findAll({
        include: [{ model: Team, as: "team" }],
      });
    }
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPlayersWithBidsByTournamentId = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const players = await Player.findAll({
      where: { tournamentId },
    });

    if (!players || players.length === 0) {
      return res
        .status(404)
        .json({ message: "No players found for this tournament" });
    }

    const playersWithBids = await Promise.all(
      players.map(async (player) => {
        const bids = await Bid.findAll({
          where: { playerId: player.id, tournamentId },
          order: [["bidAmount", "DESC"]],
        });

        return {
          ...player.toJSON(),
          bids,
        };
      })
    );

    res.status(200).json(playersWithBids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
