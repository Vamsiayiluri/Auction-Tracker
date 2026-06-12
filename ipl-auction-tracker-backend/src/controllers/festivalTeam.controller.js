import crypto from "node:crypto";
import { Op } from "sequelize";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  Festival,
  FestivalAuctionResult,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalTeam,
  FestivalTeamMembership,
  Sport,
} from "../models/index.js";
import {
  toFestivalParticipantResponse,
  toFestivalTeamMembershipResponse,
  toFestivalTeamResponse,
} from "../utils/festivalResponse.js";
import { requireFestivalConfigurationOpen } from "../utils/festivalLocking.js";
import { createFestivalAudit } from "../utils/festivalAudit.js";
import { snakeBalanceParticipants } from "../utils/festivalTeamBalance.js";

const isUniqueConflict = (error) =>
  error?.name === "SequelizeUniqueConstraintError";

const conflictResponse = (res, message) =>
  res.status(409).json({ success: false, message });

const loadFestival = async (festivalId, res, transaction) => {
  const festival = await Festival.findByPk(festivalId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!festival) {
    res.status(404).json({ success: false, message: "Festival not found" });
    return null;
  }
  return festival;
};

const requireTeamConfigurationOpen = async (festivalId, res) => {
  const festival = await loadFestival(festivalId, res);
  if (!festival) return null;
  const lockState = await requireFestivalConfigurationOpen({
      festivalId,
      res,
      section: "Festival Team management",
    });
  if (!lockState) {
    return null;
  }
  if (
    festival.rosterFormationMode === "manual" &&
    festival.teamAssignmentStatus !== "draft"
  ) {
    res.status(400).json({
      success: false,
      message: "Festival teams cannot be changed after assignment building starts",
    });
    return null;
  }
  if (
    festival.status === "archived" ||
    (festival.status === "completed" && !lockState.overrideActive)
  ) {
    res.status(400).json({
      success: false,
      message: "Completed or archived festivals cannot be changed",
    });
    return null;
  }
  if (festival.rosterFormationMode === "auction") {
    const membershipCount = await FestivalTeamMembership.count({
      where: { festivalId: festival.id },
    });
    if (membershipCount && !lockState.overrideActive) {
      res.status(400).json({
        success: false,
        message: "Festival teams cannot be changed after auction roster activity starts",
      });
      return null;
    }
  }
  return festival;
};

const requireManualRosterMode = (festival, res, action) => {
  if (festival.rosterFormationMode === "manual") return true;
  res.status(400).json({
    success: false,
    message: `${action} is disabled when roster formation mode is auction`,
  });
  return false;
};

const membershipIncludes = [
  {
    model: FestivalParticipant,
    as: "participant",
    include: [
      { model: Employee, as: "employee" },
      {
        model: FestivalParticipantSport,
        as: "sportRegistrations",
        include: [{ model: Sport, as: "sport" }],
      },
    ],
  },
  { model: FestivalTeam, as: "team" },
];

const teamSummary = (team, memberships) => {
  const plainTeam = toFestivalTeamResponse(team);
  const teamMemberships = memberships.filter(
    (membership) => membership.festivalTeamId === team.id
  );

  return {
    ...plainTeam,
    participantCount: teamMemberships.length,
    strengthScore: teamMemberships.reduce(
      (total, membership) =>
        total + (membership.participant?.sportRegistrations?.length || 0),
      0
    ),
    members: teamMemberships.map(toFestivalTeamMembershipResponse),
  };
};

export const createFestivalTeam = async (req, res) => {
  try {
    const festival = await requireTeamConfigurationOpen(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const team = await sequelize.transaction(async (transaction) => {
      const created = await FestivalTeam.create(
        {
          id: crypto.randomUUID(),
          festivalId: festival.id,
          ...req.body,
          status: "active",
        },
        { transaction }
      );
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_team_created",
        entityType: "festival_team",
        entityId: created.id,
        details: { name: created.name, code: created.code },
        transaction,
      });
      return created;
    });
    return res.status(201).json({ data: toFestivalTeamResponse(team) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(
        res,
        "Festival team name or code already exists in this festival"
      );
    }
    console.error("Error creating festival team:", error);
    return res.status(500).json({ message: "Failed to create festival team" });
  }
};

export const getFestivalTeams = async (req, res) => {
  try {
    const festival = await loadFestival(req.params.festivalId, res);
    if (!festival) return;

    const [teams, memberships] = await Promise.all([
      FestivalTeam.findAll({
        where: { festivalId: festival.id },
        order: [
          ["name", "ASC"],
          ["id", "ASC"],
        ],
      }),
      FestivalTeamMembership.findAll({
        where: { festivalId: festival.id },
        include: membershipIncludes,
        order: [["assignedAt", "ASC"]],
      }),
    ]);

    return res.status(200).json({
      data: teams.map((team) => teamSummary(team, memberships)),
      meta: {
        count: teams.length,
        assignmentStatus: festival.teamAssignmentStatus,
        rosterFormationMode: festival.rosterFormationMode,
      },
    });
  } catch (error) {
    console.error("Error fetching festival teams:", error);
    return res.status(500).json({ message: "Failed to fetch festival teams" });
  }
};

export const updateFestivalTeam = async (req, res) => {
  try {
    const festival = await requireTeamConfigurationOpen(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const team = await FestivalTeam.findOne({
      where: { id: req.params.teamId, festivalId: festival.id },
    });
    if (!team) {
      return res
        .status(404)
        .json({ success: false, message: "Festival team not found" });
    }

    if (req.body.status === "inactive") {
      const soldResultCount = await FestivalAuctionResult.count({
        where: {
          festivalId: festival.id,
          festivalTeamId: team.id,
          outcome: "sold",
        },
      });
      if (soldResultCount) {
        return conflictResponse(
          res,
          "A team with sold auction assignments cannot be deactivated"
        );
      }
    }
    const before = toFestivalTeamResponse(team);
    await sequelize.transaction(async (transaction) => {
      await team.update(req.body, { transaction });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_team_updated",
        entityType: "festival_team",
        entityId: team.id,
        details: { before, after: toFestivalTeamResponse(team) },
        transaction,
      });
    });
    return res.status(200).json({ data: toFestivalTeamResponse(team) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(
        res,
        "Festival team name or code already exists in this festival"
      );
    }
    console.error("Error updating festival team:", error);
    return res.status(500).json({ message: "Failed to update festival team" });
  }
};

export const deleteFestivalTeam = async (req, res) => {
  try {
    const festival = await requireTeamConfigurationOpen(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const team = await FestivalTeam.findOne({
      where: { id: req.params.teamId, festivalId: festival.id },
    });
    if (!team) {
      return res
        .status(404)
        .json({ success: false, message: "Festival team not found" });
    }

    const membershipCount = await FestivalTeamMembership.count({
      where: { festivalId: festival.id, festivalTeamId: team.id },
    });
    if (membershipCount) {
      return conflictResponse(
        res,
        "Festival team cannot be deleted while participants are assigned"
      );
    }

    await sequelize.transaction(async (transaction) => {
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_team_deleted",
        entityType: "festival_team",
        entityId: team.id,
        details: { name: team.name, code: team.code },
        transaction,
      });
      await team.destroy({ transaction });
    });
    return res.status(200).json({ success: true, deletedTeamId: team.id });
  } catch (error) {
    console.error("Error deleting festival team:", error);
    return res.status(500).json({ message: "Failed to delete festival team" });
  }
};

export const assignFestivalParticipant = async (req, res) => {
  try {
    const membership = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (
        !requireManualRosterMode(
          festival,
          res,
          "Manual team assignment"
        )
      ) {
        return null;
      }
      if (festival.teamAssignmentStatus === "locked") {
        res.status(400).json({
          success: false,
          message: "Festival team assignments are locked",
        });
        return null;
      }

      const [participant, team] = await Promise.all([
        FestivalParticipant.findOne({
          where: {
            id: req.body.participantId,
            festivalId: festival.id,
            status: "registered",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalTeam.findOne({
          where: {
            id: req.body.teamId,
            festivalId: festival.id,
            status: "active",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (!participant || !team) {
        res.status(404).json({
          success: false,
          message: !participant
            ? "Active festival participant not found"
            : "Active festival team not found",
        });
        return null;
      }

      const [record] = await FestivalTeamMembership.findOrCreate({
        where: {
          festivalId: festival.id,
          festivalParticipantId: participant.id,
        },
        defaults: {
          id: crypto.randomUUID(),
          festivalTeamId: team.id,
          assignmentMethod: "manual",
          rosterSource: "admin_override",
          assignedBy: req.user.id,
          assignedAt: new Date(),
        },
        transaction,
      });
      if (
        !["admin_override", "auto_balance", null].includes(record.rosterSource)
      ) {
        res.status(409).json({
          success: false,
          message: "Owner and retained roster memberships cannot be moved",
        });
        return null;
      }
      await record.update(
        {
          festivalTeamId: team.id,
          assignmentMethod: "manual",
          rosterSource: "admin_override",
          assignedBy: req.user.id,
          assignedAt: new Date(),
        },
        { transaction }
      );
      if (festival.teamAssignmentStatus === "draft") {
        await festival.update(
          { teamAssignmentStatus: "building" },
          { transaction }
        );
      }
      return record.id;
    });
    if (!membership) return;

    const loaded = await FestivalTeamMembership.findByPk(membership, {
      include: membershipIncludes,
    });
    return res
      .status(200)
      .json({ data: toFestivalTeamMembershipResponse(loaded) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(
        res,
        "Participant already belongs to a festival team"
      );
    }
    console.error("Error assigning festival participant:", error);
    return res
      .status(500)
      .json({ message: "Failed to assign festival participant" });
  }
};

export const autoBalanceFestivalParticipants = async (req, res) => {
  try {
    const summary = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (
        !requireManualRosterMode(
          festival,
          res,
          "Automatic team balancing"
        )
      ) {
        return null;
      }
      if (festival.teamAssignmentStatus === "locked") {
        res.status(400).json({
          success: false,
          message: "Festival team assignments are locked",
        });
        return null;
      }

      const teams = await FestivalTeam.findAll({
        where: { festivalId: festival.id, status: "active" },
        order: [
          ["name", "ASC"],
          ["id", "ASC"],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (teams.length < 2) {
        res.status(400).json({
          success: false,
          message: "At least two active festival teams are required",
        });
        return null;
      }

      const participants = await FestivalParticipant.findAll({
        where: { festivalId: festival.id, status: "registered" },
        include: [
          { model: Employee, as: "employee" },
          {
            model: FestivalParticipantSport,
            as: "sportRegistrations",
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!participants.length) {
        res.status(400).json({
          success: false,
          message: "At least one registered participant is required",
        });
        return null;
      }

      const protectedMemberships = await FestivalTeamMembership.findAll({
        where: {
          festivalId: festival.id,
          rosterSource: ["owner_retention", "retention", "auction"],
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const protectedParticipantIds = new Set(
        protectedMemberships.map(({ festivalParticipantId }) =>
          festivalParticipantId
        )
      );
      const balanceParticipants = participants.filter(
        ({ id }) => !protectedParticipantIds.has(id)
      );
      const assignments = balanceParticipants.length
        ? snakeBalanceParticipants(balanceParticipants, teams)
        : [];
      await FestivalTeamMembership.destroy({
        where: {
          festivalId: festival.id,
          [Op.or]: [
            { rosterSource: ["admin_override", "auto_balance"] },
            { rosterSource: null },
          ],
        },
        transaction,
      });
      if (assignments.length) {
        await FestivalTeamMembership.bulkCreate(
          assignments.map(({ participant, team }) => ({
            id: crypto.randomUUID(),
            festivalId: festival.id,
            festivalParticipantId: participant.id,
            festivalTeamId: team.id,
            assignmentMethod: "auto_balanced",
            rosterSource: "auto_balance",
            assignedBy: req.user.id,
            assignedAt: new Date(),
          })),
          { transaction }
        );
      }
      await festival.update(
        { teamAssignmentStatus: "building" },
        { transaction }
      );

      const teamTotals = teams.map((team) => {
        const assigned = assignments.filter(
          (assignment) => assignment.team.id === team.id
        );
        const protectedCount = protectedMemberships.filter(
          (membership) => membership.festivalTeamId === team.id
        ).length;
        return {
          festivalTeamId: team.id,
          name: team.name,
          participantCount: assigned.length + protectedCount,
          strengthScore: assigned.reduce(
            (total, assignment) => total + assignment.strengthScore,
            0
          ),
        };
      });
      return {
        assigned: assignments.length,
        protected: protectedMemberships.length,
        teams: teamTotals,
      };
    });
    if (!summary) return;

    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("Error auto-balancing festival participants:", error);
    return res
      .status(500)
      .json({ message: "Failed to auto-balance festival participants" });
  }
};

export const getFestivalTeamAssignments = async (req, res) => {
  try {
    const festival = await loadFestival(req.params.festivalId, res);
    if (!festival) return;

    const [memberships, unassignedParticipants] = await Promise.all([
      FestivalTeamMembership.findAll({
        where: { festivalId: festival.id },
        include: membershipIncludes,
        order: [["assignedAt", "ASC"]],
      }),
      FestivalParticipant.findAll({
        where: { festivalId: festival.id, status: "registered" },
        include: [
          { model: Employee, as: "employee" },
          {
            model: FestivalParticipantSport,
            as: "sportRegistrations",
            include: [{ model: Sport, as: "sport" }],
          },
          {
            model: FestivalTeamMembership,
            as: "teamMembership",
            required: false,
          },
        ],
        order: [[{ model: Employee, as: "employee" }, "name", "ASC"]],
      }),
    ]);

    const unassigned = unassignedParticipants
      .filter((participant) => !participant.teamMembership)
      .map((participant) => ({
        ...toFestivalParticipantResponse(participant),
        strengthScore: participant.sportRegistrations?.length || 0,
      }));

    return res.status(200).json({
      data: memberships.map(toFestivalTeamMembershipResponse),
      unassigned,
      meta: {
        count: memberships.length,
        unassignedCount: unassigned.length,
        assignmentStatus: festival.teamAssignmentStatus,
        rosterFormationMode: festival.rosterFormationMode,
      },
    });
  } catch (error) {
    console.error("Error fetching festival team assignments:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch festival team assignments" });
  }
};

export const lockFestivalTeamAssignments = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (
        !requireManualRosterMode(
          festival,
          res,
          "Team assignment locking"
        )
      ) {
        return null;
      }
      if (festival.teamAssignmentStatus === "locked") {
        return {
          assignmentStatus: "locked",
          alreadyLocked: true,
        };
      }

      const participants = await FestivalParticipant.findAll({
        where: { festivalId: festival.id, status: "registered" },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const memberships = await FestivalTeamMembership.findAll({
        where: { festivalId: festival.id },
        attributes: ["festivalParticipantId", "festivalTeamId"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const activeTeams = await FestivalTeam.findAll({
        where: { festivalId: festival.id, status: "active" },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const participantIds = new Set(participants.map(({ id }) => id));
      const activeTeamIds = new Set(activeTeams.map(({ id }) => id));
      const validMembershipParticipantIds = new Set(
        memberships
          .filter(
            ({ festivalParticipantId, festivalTeamId }) =>
              participantIds.has(festivalParticipantId) &&
              activeTeamIds.has(festivalTeamId)
          )
          .map(({ festivalParticipantId }) => festivalParticipantId)
      );
      const participantCount = participantIds.size;
      const membershipCount = validMembershipParticipantIds.size;
      if (
        !participantCount ||
        memberships.length !== participantCount ||
        membershipCount !== participantCount
      ) {
        res.status(400).json({
          success: false,
          message: "Every registered participant must have a festival team",
          meta: {
            participantCount,
            membershipCount,
            unassignedCount: participantCount - membershipCount,
          },
        });
        return null;
      }

      await festival.update(
        { teamAssignmentStatus: "locked" },
        { transaction }
      );
      return {
        assignmentStatus: "locked",
        participantCount,
        alreadyLocked: false,
      };
    });
    if (!result) return;

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Error locking festival team assignments:", error);
    return res
      .status(500)
      .json({ message: "Failed to lock festival team assignments" });
  }
};
