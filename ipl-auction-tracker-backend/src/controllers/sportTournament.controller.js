import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  Festival,
  FestivalAuctionConfig,
  FestivalParticipant,
  FestivalSport,
  FestivalTeam,
  FestivalTeamOwner,
  Sport,
  SportTeam,
  SportTeamCaptain,
  SportTeamMembership,
  SportTournament,
} from "../models/index.js";
import {
  canManageFestivalTeamSports,
  findActiveSportCaptainForUser,
  loadAuthorizedSportTournament,
} from "../utils/sportTournamentAuthorization.js";
import { getSportTournamentEligibility } from "../utils/sportTournamentEligibility.js";
import { getSportTournamentReadiness } from "../utils/sportTournamentReadiness.js";
import {
  toSportCaptainResponse,
  toSportTeamResponse,
  toSportTournamentResponse,
} from "../utils/sportTournamentResponse.js";

const setupStatuses = new Set(["draft", "setup", "ready"]);
const isUniqueConflict = (error) =>
  error?.name === "SequelizeUniqueConstraintError";

const captainInclude = {
  model: SportTeamCaptain,
  as: "captainAssignment",
  required: false,
  include: [
    {
      model: FestivalParticipant,
      as: "participant",
      required: false,
      include: [{ model: Employee, as: "employee", required: false }],
    },
  ],
};

const tournamentInclude = [
  { model: Festival, as: "festival" },
  { model: FestivalTeam, as: "festivalTeam" },
  { model: Sport, as: "sport" },
  {
    model: SportTeam,
    as: "teams",
    required: false,
    include: [captainInclude],
  },
];

const generatedTeamName = (sportName, index) =>
  `${sportName} Team ${String.fromCharCode(65 + index)}`;

const generatedTeamCode = (tournamentCode, index) =>
  `${tournamentCode}-${String.fromCharCode(65 + index)}`.toUpperCase();

const createGeneratedTeams = async (tournament, sportName, transaction) => {
  const teams = Array.from({ length: tournament.teamCount }, (_, index) => ({
    id: randomUUID(),
    sportTournamentId: tournament.id,
    festivalId: tournament.festivalId,
    festivalTeamId: tournament.festivalTeamId,
    name: generatedTeamName(sportName, index),
    code: generatedTeamCode(tournament.code, index),
    status: "active",
  }));
  await SportTeam.bulkCreate(teams, { transaction });
};

const syncGeneratedTeamCount = async (
  tournament,
  sportName,
  nextCount,
  transaction
) => {
  const teams = await SportTeam.findAll({
    where: { sportTournamentId: tournament.id, status: "active" },
    order: [["createdAt", "ASC"], ["id", "ASC"]],
    include: [captainInclude],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (nextCount > teams.length) {
    const additions = Array.from(
      { length: nextCount - teams.length },
      (_, offset) => {
        const index = teams.length + offset;
        return {
          id: randomUUID(),
          sportTournamentId: tournament.id,
          festivalId: tournament.festivalId,
          festivalTeamId: tournament.festivalTeamId,
          name: generatedTeamName(sportName, index),
          code: generatedTeamCode(tournament.code, index),
          status: "active",
        };
      }
    );
    await SportTeam.bulkCreate(additions, { transaction });
  }

  if (nextCount < teams.length) {
    const removals = teams.slice(nextCount);
    if (removals.some(({ captainAssignment }) => captainAssignment)) {
      throw Object.assign(
        new Error("Remove Captain assignments before reducing Team count"),
        { statusCode: 409 }
      );
    }
    await SportTeam.destroy({
      where: { id: removals.map(({ id }) => id) },
      transaction,
    });
  }
};

const refreshTournament = (id, transaction) =>
  SportTournament.findByPk(id, {
    include: tournamentInclude,
    order: [[{ model: SportTeam, as: "teams" }, "name", "ASC"]],
    transaction,
  });

const requireSetupStatus = (tournament, res) => {
  if (!setupStatuses.has(tournament.status)) {
    res.status(409).json({
      success: false,
      message: "Sport Tournament setup is locked in its current status",
    });
    return false;
  }
  return true;
};

const requireAuthorizedTournament = async (req, res, transaction) => {
  const result = await loadAuthorizedSportTournament({
    sportTournamentId: req.params.sportTournamentId,
    user: req.user,
    transaction,
  });
  if (!result.tournament) {
    res.status(404).json({ success: false, message: "Sport Tournament not found" });
    return null;
  }
  if (!result.authorized) {
    res.status(403).json({ success: false, message: "Access denied" });
    return null;
  }
  return result.tournament;
};

const loadReadableTournament = async (req, res, transaction) => {
  const tournament = await SportTournament.findByPk(
    req.params.sportTournamentId,
    { transaction }
  );
  if (!tournament) {
    res.status(404).json({ success: false, message: "Sport Tournament not found" });
    return null;
  }
  return tournament;
};

export const getSportTournamentOwnerContexts = async (req, res) => {
  try {
    const where = { status: "active" };
    if (req.user.role !== "admin") {
      const employee = await Employee.findOne({
        where: { userId: req.user.id, employmentStatus: "active" },
      });
      if (!employee) return res.status(200).json({ data: [] });
      const participants = await FestivalParticipant.findAll({
        where: { employeeId: employee.id, status: "registered" },
        attributes: ["id"],
      });
      const owners = await FestivalTeamOwner.findAll({
        where: {
          festivalParticipantId: participants.map(({ id }) => id),
          status: "active",
        },
        attributes: ["festivalTeamId"],
      });
      where.id = owners.map(({ festivalTeamId }) => festivalTeamId);
    }

    const teams = await FestivalTeam.findAll({
      where,
      include: [
        { model: Festival, as: "festival" },
      ],
      order: [[{ model: Festival, as: "festival" }, "name", "ASC"], ["name", "ASC"]],
    });
    const festivalIds = [...new Set(teams.map(({ festivalId }) => festivalId))];
    const sports = await FestivalSport.findAll({
      where: { festivalId: festivalIds },
      include: [{ model: Sport, as: "sport" }],
      order: [[{ model: Sport, as: "sport" }, "name", "ASC"]],
    });
    const sportsByFestival = new Map();
    sports.forEach((festivalSport) => {
      const list = sportsByFestival.get(festivalSport.festivalId) || [];
      list.push({
        id: festivalSport.id,
        sportId: festivalSport.sportId,
        name: festivalSport.sport?.name,
        code: festivalSport.sport?.code,
      });
      sportsByFestival.set(festivalSport.festivalId, list);
    });

    return res.status(200).json({
      data: teams.map((team) => ({
        festivalId: team.festivalId,
        festivalName: team.festival?.name,
        festivalTeamId: team.id,
        festivalTeamName: team.name,
        sports: sportsByFestival.get(team.festivalId) || [],
      })),
    });
  } catch (error) {
    console.error("Failed to load Sport Tournament owner contexts:", error);
    return res.status(500).json({ message: "Failed to load owner contexts" });
  }
};

export const createSportTournament = async (req, res) => {
  try {
    const createdId = await sequelize.transaction(async (transaction) => {
      const team = await FestivalTeam.findOne({
        where: {
          id: req.params.festivalTeamId,
          festivalId: req.params.festivalId,
          status: "active",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!team) {
        throw Object.assign(new Error("Festival Team not found"), {
          statusCode: 404,
        });
      }
      if (
        !(await canManageFestivalTeamSports({
          user: req.user,
          festivalId: team.festivalId,
          festivalTeamId: team.id,
          transaction,
        }))
      ) {
        throw Object.assign(new Error("Access denied"), { statusCode: 403 });
      }

      const festivalSport = await FestivalSport.findOne({
        where: {
          id: req.body.festivalSportId,
          festivalId: team.festivalId,
        },
        include: [{ model: Sport, as: "sport" }],
        transaction,
      });
      if (!festivalSport?.sport?.isActive) {
        throw Object.assign(
          new Error("Selected Sport is not enabled for this Festival"),
          { statusCode: 400 }
        );
      }

      const festival = await Festival.findByPk(team.festivalId, { transaction });
      const auctionConfig = await FestivalAuctionConfig.findOne({
        where: { festivalId: team.festivalId },
        transaction,
      });
      const parentRosterReady =
        (festival.rosterFormationMode === "auction" &&
          auctionConfig?.auctionStatus === "completed") ||
        (festival.rosterFormationMode === "manual" &&
          festival.teamAssignmentStatus === "locked");
      if (!parentRosterReady) {
        throw Object.assign(
          new Error("Complete and finalize the Festival roster before creating Sport Tournaments"),
          { statusCode: 409 }
        );
      }

      const tournament = await SportTournament.create(
        {
          id: randomUUID(),
          festivalId: team.festivalId,
          festivalTeamId: team.id,
          festivalSportId: festivalSport.id,
          sportId: festivalSport.sportId,
          name: req.body.name,
          code: req.body.code.toUpperCase(),
          division: req.body.division,
          participantGenderRule: req.body.participantGenderRule,
          status: "draft",
          teamCount: req.body.teamCount,
          createdByUserId: req.user.id,
        },
        { transaction }
      );
      await createGeneratedTeams(tournament, festivalSport.sport.name, transaction);
      await getSportTournamentReadiness(tournament.id, transaction);
      return tournament.id;
    });

    const tournament = await refreshTournament(createdId);
    return res.status(201).json({ data: toSportTournamentResponse(tournament) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return res.status(409).json({
        success: false,
        message: "A Sport Tournament with this code or division already exists for the Festival Team",
      });
    }
    console.error("Failed to create Sport Tournament:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create Sport Tournament",
    });
  }
};

export const listSportTournaments = async (req, res) => {
  try {
    let where = {};
    if (req.user.role !== "admin") {
      const employee = await Employee.findOne({
        where: { userId: req.user.id, employmentStatus: "active" },
      });
      if (!employee) return res.status(200).json({ data: [] });
      const participants = await FestivalParticipant.findAll({
        where: { employeeId: employee.id, status: "registered" },
        attributes: ["id"],
      });
      const [owners, captainAssignments] = await Promise.all([
        FestivalTeamOwner.findAll({
        where: {
          festivalParticipantId: participants.map(({ id }) => id),
          status: "active",
        },
        attributes: ["festivalTeamId"],
        }),
        SportTeamCaptain.findAll({
          where: {
            festivalParticipantId: participants.map(({ id }) => id),
            status: "active",
          },
          attributes: ["sportTournamentId"],
        }),
      ]);
      where = {
        [Op.or]:
          req.user.role === "spectator"
            ? [
                {
                  status: {
                    [Op.in]: [
                      "auction_live",
                      "auction_paused",
                      "auction_completed",
                    ],
                  },
                },
                {
                  id: captainAssignments.map(
                    ({ sportTournamentId }) => sportTournamentId
                  ),
                },
              ]
            : [
                {
                  festivalTeamId: owners.map(
                    ({ festivalTeamId }) => festivalTeamId
                  ),
                },
                {
                  id: captainAssignments.map(
                    ({ sportTournamentId }) => sportTournamentId
                  ),
                },
              ],
      };
    }

    const tournaments = await SportTournament.findAll({
      where,
      include: tournamentInclude,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      data: tournaments.map(toSportTournamentResponse),
    });
  } catch (error) {
    console.error("Failed to list Sport Tournaments:", error);
    return res.status(500).json({ message: "Failed to list Sport Tournaments" });
  }
};

export const getSportTournament = async (req, res) => {
  try {
    const readable = await loadReadableTournament(req, res);
    if (!readable) return;
    const tournament = await refreshTournament(readable.id);
    const canManage = await canManageFestivalTeamSports({
      user: req.user,
      festivalId: readable.festivalId,
      festivalTeamId: readable.festivalTeamId,
    });
    const captain = await findActiveSportCaptainForUser({
      userId: req.user.id,
      sportTournamentId: readable.id,
    });
    return res.status(200).json({
      data: {
        ...toSportTournamentResponse(tournament),
        permissions: {
          canManage,
          canBid: Boolean(captain),
          sportTeamId: captain?.sportTeamId || null,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load Sport Tournament:", error);
    return res.status(500).json({ message: "Failed to load Sport Tournament" });
  }
};

export const updateSportTournament = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireAuthorizedTournament(req, res, transaction);
      if (!tournament) return;
      if (!requireSetupStatus(tournament, res)) return;

      if (req.body.teamCount && req.body.teamCount !== tournament.teamCount) {
        const sport = await Sport.findByPk(tournament.sportId, { transaction });
        await syncGeneratedTeamCount(
          tournament,
          sport.name,
          req.body.teamCount,
          transaction
        );
      }
      const updates = { ...req.body };
      if (updates.code) updates.code = updates.code.toUpperCase();
      await tournament.update(updates, { transaction });
      await getSportTournamentReadiness(tournament.id, transaction);
    });
    if (res.headersSent) return;
    const tournament = await refreshTournament(req.params.sportTournamentId);
    return res.status(200).json({ data: toSportTournamentResponse(tournament) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return res.status(409).json({ success: false, message: "Tournament code or division already exists" });
    }
    console.error("Failed to update Sport Tournament:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update Sport Tournament",
    });
  }
};

export const getSportTeams = async (req, res) => {
  try {
    const tournament = await loadReadableTournament(req, res);
    if (!tournament) return;
    const teams = await SportTeam.findAll({
      where: { sportTournamentId: tournament.id, status: "active" },
      include: [captainInclude],
      order: [["name", "ASC"]],
    });
    return res.status(200).json({ data: teams.map(toSportTeamResponse) });
  } catch (error) {
    console.error("Failed to load Sport Teams:", error);
    return res.status(500).json({ message: "Failed to load Sport Teams" });
  }
};

export const updateSportTeam = async (req, res) => {
  try {
    let teamId;
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireAuthorizedTournament(
        req,
        res,
        transaction
      );
      if (!tournament || !requireSetupStatus(tournament, res)) return;
      const team = await SportTeam.findOne({
        where: {
          id: req.params.sportTeamId,
          sportTournamentId: tournament.id,
          status: "active",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!team) {
        res
          .status(404)
          .json({ success: false, message: "Sport Team not found" });
        return;
      }
      const updates = { ...req.body };
      if (updates.code) updates.code = updates.code.toUpperCase();
      await team.update(updates, { transaction });
      await getSportTournamentReadiness(tournament.id, transaction);
      teamId = team.id;
    });
    if (res.headersSent || !teamId) return;
    const refreshed = await SportTeam.findByPk(teamId, {
      include: [captainInclude],
    });
    return res.status(200).json({ data: toSportTeamResponse(refreshed) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return res.status(409).json({ success: false, message: "Team name or code already exists" });
    }
    console.error("Failed to update Sport Team:", error);
    return res.status(500).json({ message: "Failed to update Sport Team" });
  }
};

export const assignSportTeamCaptain = async (req, res) => {
  try {
    const captainId = await sequelize.transaction(async (transaction) => {
      const tournament = await requireAuthorizedTournament(req, res, transaction);
      if (!tournament) return null;
      if (!requireSetupStatus(tournament, res)) return null;

      const team = await SportTeam.findOne({
        where: {
          id: req.params.sportTeamId,
          sportTournamentId: tournament.id,
          status: "active",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!team) {
        res.status(404).json({ success: false, message: "Sport Team not found" });
        return null;
      }

      const eligibility = await getSportTournamentEligibility(
        tournament.id,
        transaction
      );
      const candidate = eligibility.included.find(
        ({ festivalParticipantId }) =>
          festivalParticipantId === req.body.festivalParticipantId
      );
      if (!candidate) {
        res.status(400).json({
          success: false,
          message: "Selected Employee is not eligible to Captain this Tournament",
        });
        return null;
      }

      const participantCaptain = await SportTeamCaptain.findOne({
        where: {
          sportTournamentId: tournament.id,
          festivalParticipantId: req.body.festivalParticipantId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (participantCaptain && participantCaptain.sportTeamId !== team.id) {
        res.status(409).json({
          success: false,
          message: "This Employee already Captains another Team in the Tournament",
        });
        return null;
      }

      const existingCaptain = await SportTeamCaptain.findOne({
        where: { sportTeamId: team.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        existingCaptain?.festivalParticipantId ===
        req.body.festivalParticipantId
      ) {
        return existingCaptain.id;
      }

      if (existingCaptain) {
        await SportTeamMembership.destroy({
          where: {
            sportTournamentId: tournament.id,
            sportTeamId: team.id,
            festivalParticipantId: existingCaptain.festivalParticipantId,
            source: "captain_assignment",
          },
          transaction,
        });
        await existingCaptain.destroy({ transaction });
      }

      const captain = await SportTeamCaptain.create(
        {
          id: randomUUID(),
          sportTournamentId: tournament.id,
          sportTeamId: team.id,
          festivalParticipantId: req.body.festivalParticipantId,
          status: "active",
          assignedByUserId: req.user.id,
        },
        { transaction }
      );
      await SportTeamMembership.create(
        {
          id: randomUUID(),
          sportTournamentId: tournament.id,
          sportTeamId: team.id,
          festivalParticipantId: req.body.festivalParticipantId,
          source: "captain_assignment",
          assignedByUserId: req.user.id,
        },
        { transaction }
      );
      await getSportTournamentReadiness(tournament.id, transaction);
      return captain.id;
    });
    if (res.headersSent || !captainId) return;
    const captain = await SportTeamCaptain.findByPk(captainId, {
      include: [captainInclude.include[0]],
    });
    return res.status(200).json({ data: toSportCaptainResponse(captain) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return res.status(409).json({
        success: false,
        message: "Captain or Sport Team assignment conflicts with an existing assignment",
      });
    }
    console.error("Failed to assign Sport Team Captain:", error);
    return res.status(500).json({ message: "Failed to assign Sport Team Captain" });
  }
};

export const removeSportTeamCaptain = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const tournament = await requireAuthorizedTournament(req, res, transaction);
      if (!tournament) return;
      if (!requireSetupStatus(tournament, res)) return;
      const captain = await SportTeamCaptain.findOne({
        where: {
          sportTournamentId: tournament.id,
          sportTeamId: req.params.sportTeamId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!captain) {
        res.status(404).json({ success: false, message: "Captain assignment not found" });
        return;
      }
      await SportTeamMembership.destroy({
        where: {
          sportTournamentId: tournament.id,
          sportTeamId: captain.sportTeamId,
          festivalParticipantId: captain.festivalParticipantId,
          source: "captain_assignment",
        },
        transaction,
      });
      await captain.destroy({ transaction });
      await getSportTournamentReadiness(tournament.id, transaction);
    });
    if (res.headersSent) return;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to remove Sport Team Captain:", error);
    return res.status(500).json({ message: "Failed to remove Sport Team Captain" });
  }
};

export const getSportTournamentEligibilityController = async (req, res) => {
  try {
    const tournament = await loadReadableTournament(req, res);
    if (!tournament) return;
    const eligibility = await getSportTournamentEligibility(tournament.id);
    return res.status(200).json({ data: eligibility });
  } catch (error) {
    console.error("Failed to load Sport Tournament eligibility:", error);
    return res.status(500).json({ message: "Failed to load eligibility" });
  }
};

export const getSportTournamentReadinessController = async (req, res) => {
  try {
    const tournament = await loadReadableTournament(req, res);
    if (!tournament) return;
    const readiness = await getSportTournamentReadiness(
      tournament.id,
      undefined,
      { persistStatus: false }
    );
    return res.status(200).json({ data: readiness });
  } catch (error) {
    console.error("Failed to load Sport Tournament readiness:", error);
    return res.status(500).json({ message: "Failed to load readiness" });
  }
};
