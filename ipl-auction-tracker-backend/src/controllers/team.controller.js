import {
  User,
  Team,
  TournamentTeam,
  Player,
} from "../models/index.js";

const toTournamentTeamResponse = (tournamentTeam) => {
  const plain = tournamentTeam.toJSON();
  const team = plain.team || {};

  return {
    id: team.id || plain.teamId,
    tournamentTeamId: plain.id,
    name: team.name,
    ownerId: team.ownerId,
    tournamentId: plain.tournamentId,
    totalAmount: plain.totalAmount,
    amountSpent: plain.amountSpent,
    amountLeft: Number(plain.totalAmount || 0) - Number(plain.amountSpent || 0),
  };
};

export const getTeams = async (req, res) => {
  try {
    const { tournamentId } = req.query;

    let teams;

    if (tournamentId) {
      const tournamentTeams = await TournamentTeam.findAll({
        where: { tournamentId },
        include: [{ model: Team, as: "team" }],
      });

      if (tournamentTeams.length) {
        teams = tournamentTeams.map(toTournamentTeamResponse);
      } else {
        // Backward compatibility for tournaments created before TournamentTeams.
        teams = await Team.findAll({ where: { tournamentId } });
      }
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
  const { tournamentId } = req.query;
  const team = await Team.findOne({
    where: { ownerId },
  });

  if (!team) return res.status(404).json({ message: "Team not found" });

  if (tournamentId) {
    const tournamentTeam = await TournamentTeam.findOne({
      where: { tournamentId, teamId: team.id },
      include: [{ model: Team, as: "team" }],
    });

    if (!tournamentTeam) {
      if (team.tournamentId === tournamentId) {
        return res.status(200).json({ message: "team data", team });
      }

      return res
        .status(404)
        .json({ message: "Team is not part of this tournament" });
    }

    return res
      .status(200)
      .json({ message: "team data", team: toTournamentTeamResponse(tournamentTeam) });
  }

  res.status(200).json({ message: "team data", team });
};
export const getTeamAndPlayersbyOwnerId = async (req, res) => {
  try {
    const ownerId = req.params.id;
    const { tournamentId } = req.query;

    const team = await Team.findOne({
      where: { ownerId },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    let scopedTeam = team;
    if (tournamentId) {
      const tournamentTeam = await TournamentTeam.findOne({
        where: { tournamentId, teamId: team.id },
        include: [{ model: Team, as: "team" }],
      });

      if (!tournamentTeam) {
        if (team.tournamentId === tournamentId) {
          scopedTeam = team;
        } else {
        return res
          .status(404)
          .json({ message: "Team is not part of this tournament" });
        }
      } else {
        scopedTeam = toTournamentTeamResponse(tournamentTeam);
      }
    }

    const where = { teamId: team.id };
    if (tournamentId) where.tournamentId = tournamentId;

    const players = await Player.findAll({ where });

    res
      .status(200)
      .json({ message: "Team data with players", team: scopedTeam, players });
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
