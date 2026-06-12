import {
  User,
  Team,
  TournamentTeam,
  Player,
} from "../models/index.js";
import {
  toPlayerReportResponse,
  toPublicTeamResponse,
  toTeamResponse,
} from "../utils/teamResponse.js";

const toTournamentTeamResponse = (
  tournamentTeam,
  { publicOnly = false } = {}
) => {
  const plain = tournamentTeam.toJSON();
  const team = plain.team || {};

  const response = {
    id: team.id || plain.teamId,
    name: team.name,
    tournamentId: plain.tournamentId,
    totalAmount: plain.totalAmount,
    amountSpent: plain.amountSpent,
    amountLeft: Number(plain.totalAmount || 0) - Number(plain.amountSpent || 0),
  };

  if (!publicOnly) {
    response.tournamentTeamId = plain.id;
    response.ownerId = team.ownerId;
  }

  return response;
};

const isAdmin = (req) => req.user?.role === "admin";
const isTeamOwner = (req) => req.user?.role === "team_owner";

const forbidden = (res, message = "Access denied") =>
  res.status(403).json({ message });

const findOwnedTeam = (ownerId) => Team.findOne({ where: { ownerId } });

export const getTeams = async (req, res) => {
  try {
    const { tournamentId } = req.query;

    let teams;

    if (tournamentId) {
      if (isTeamOwner(req)) {
        const ownedTeam = await findOwnedTeam(req.user.id);
        if (!ownedTeam) {
          return res.status(404).json({ message: "Team not found" });
        }

        const tournamentTeam = await TournamentTeam.findOne({
          where: { tournamentId, teamId: ownedTeam.id },
          include: [{ model: Team, as: "team" }],
        });

        if (tournamentTeam) {
          return res
            .status(200)
            .json([toTournamentTeamResponse(tournamentTeam)]);
        }

        if (ownedTeam.tournamentId === tournamentId) {
          return res.status(200).json([toTeamResponse(ownedTeam)]);
        }

        return res.status(200).json([]);
      }

      const tournamentTeams = await TournamentTeam.findAll({
        where: { tournamentId },
        include: [{ model: Team, as: "team" }],
      });

      if (tournamentTeams.length) {
        teams = tournamentTeams.map((team) =>
          toTournamentTeamResponse(team, { publicOnly: !isAdmin(req) })
        );
      } else {
        // Backward compatibility for tournaments created before TournamentTeams.
        teams = await Team.findAll({ where: { tournamentId } });
        teams = teams.map((team) =>
          isAdmin(req) ? toTeamResponse(team) : toPublicTeamResponse(team)
        );
      }
    } else {
      if (!isAdmin(req)) {
        return forbidden(res, "Only admins can access broad team reports");
      }

      teams = await Team.findAll({
        include: [{ model: User, as: "owner" }],
      });
      teams = teams.map((team) => toTeamResponse(team, { includeOwner: true }));
    }
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Failed to load teams" });
  }
};

export const getTeamByOwner = async (req, res) => {
  try {
    if (!isTeamOwner(req)) {
      return forbidden(res, "Only team owners can access owner-scoped team data");
    }

    const ownerId = req.user.id;
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
          return res
            .status(200)
            .json({ message: "team data", team: toTeamResponse(team) });
        }

        return res
          .status(404)
          .json({ message: "Team is not part of this tournament" });
      }

      return res.status(200).json({
        message: "team data",
        team: toTournamentTeamResponse(tournamentTeam),
      });
    }

    res.status(200).json({ message: "team data", team: toTeamResponse(team) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load team" });
  }
};
export const getTeamAndPlayersbyOwnerId = async (req, res) => {
  try {
    if (!isTeamOwner(req)) {
      return forbidden(
        res,
        "Only team owners can access owner-scoped team reports"
      );
    }

    const ownerId = req.user.id;
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
          scopedTeam = toTeamResponse(team);
        } else {
          return res
            .status(404)
            .json({ message: "Team is not part of this tournament" });
        }
      } else {
        scopedTeam = toTournamentTeamResponse(tournamentTeam);
      }
    } else {
      scopedTeam = toTeamResponse(team);
    }

    const where = { teamId: team.id };
    if (tournamentId) where.tournamentId = tournamentId;

    const players = await Player.findAll({ where });

    res.status(200).json({
      message: "Team data with players",
      team: scopedTeam,
      players: players.map(toPlayerReportResponse),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load team report" });
  }
};
export const getAllTeamsWithPlayers = async (req, res) => {
  try {
    const teams = await Team.findAll({
      include: [{ model: User, as: "owner" }],
    });

    if (!teams || teams.length === 0) {
      return res.status(404).json({ message: "No teams found" });
    }

    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        const players = await Player.findAll({ where: { teamId: team.id } });
        return {
          ...toTeamResponse(team, { includeOwner: true }),
          players: players.map(toPlayerReportResponse),
        };
      })
    );

    res
      .status(200)
      .json({ message: "All teams with players", teams: teamsWithPlayers });
  } catch (error) {
    res.status(500).json({ message: "Failed to load team reports" });
  }
};
