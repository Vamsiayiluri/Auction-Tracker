import { User, Team, Tournament, Player } from "../models/index.js";

export const getTeams = async (req, res) => {
  try {
    const { tournamentId } = req.query;

    let teams;

    if (tournamentId) {
      // Get players by tournament ID
      teams = await Team.findAll({ where: { tournamentId } });
    } else {
      teams = await Team.findAll({
        include: [{ model: User, as: "owner" }],
      });
    }
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamByOwner = async (req, res) => {
  const ownerId = req.params.id;
  const team = await Team.findOne({
    where: { ownerId },
  });
  res.status(200).json({ message: "team data", team });
};
export const getTeamAndPlayersbyOwnerId = async (req, res) => {
  try {
    const ownerId = req.params.id;

    const team = await Team.findOne({
      where: { ownerId },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const players = await Player.findAll({
      where: { teamId: team.id },
    });

    res.status(200).json({ message: "Team data with players", team, players });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllTeamsWithPlayers = async (req, res) => {
  try {
    const teams = await Team.findAll();

    if (!teams || teams.length === 0) {
      return res.status(404).json({ message: "No teams found" });
    }

    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        const players = await Player.findAll({ where: { teamId: team.id } });
        return { ...team.toJSON(), players };
      })
    );

    res
      .status(200)
      .json({ message: "All teams with players", teams: teamsWithPlayers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
