import { Bid, Player, Team } from "../models/index.js";

export const createPlayer = async (req, res) => {
  try {
    const player = await Player.create(req.body);

    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
    console.log(tournamentId, "tid");
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
          where: { playerId: player.id },
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
