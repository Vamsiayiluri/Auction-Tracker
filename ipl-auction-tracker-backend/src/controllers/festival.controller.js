import crypto from "crypto";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  Festival,
  FestivalAuction,
  FestivalAuctionConfig,
  FestivalAuctionPool,
  FestivalAuctionResult,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalSport,
  FestivalTeamMembership,
  FestivalTeamOwner,
  FestivalRetention,
  Sport,
} from "../models/index.js";
import {
  toFestivalParticipantResponse,
  toFestivalParticipantSportResponse,
  toFestivalResponse,
  toFestivalSportResponse,
} from "../utils/festivalResponse.js";
import {
  festivalParticipantImportTemplate,
  parseFestivalParticipantCsv,
} from "../utils/festivalParticipantImport.js";
import { Op } from "sequelize";
import {
  getFestivalLockState,
  requireFestivalConfigurationOpen,
} from "../utils/festivalLocking.js";
import { createFestivalAudit } from "../utils/festivalAudit.js";

const conflictResponse = (res, message) =>
  res.status(409).json({ success: false, message });

const isUniqueConflict = (error) =>
  error?.name === "SequelizeUniqueConstraintError";

const requireDraftFestival = async (festivalId, res) => {
  const festival = await Festival.findByPk(festivalId);
  if (!festival) {
    res.status(404).json({ success: false, message: "Festival not found" });
    return null;
  }
  if (festival.status !== "draft") {
    res.status(400).json({
      success: false,
      message: "Festival configuration is locked after draft status",
    });
    return null;
  }
  if (
    !(await requireFestivalConfigurationOpen({
      festivalId,
      res,
      section: "Festival Sports",
      allowWhenUnlocked: false,
    }))
  ) {
    return null;
  }
  return festival;
};

const requireOpenRegistrationFestival = async (festivalId, res) => {
  const festival = await Festival.findByPk(festivalId);
  if (!festival) {
    res.status(404).json({ success: false, message: "Festival not found" });
    return null;
  }
  if (festival.status === "archived") {
    res.status(400).json({
      success: false,
      message: "Archived Festivals cannot be changed",
    });
    return null;
  }
  const lockState = await requireFestivalConfigurationOpen({
      festivalId,
      res,
      section: "Festival Participants and Employee imports",
    });
  if (!lockState) {
    return null;
  }
  if (
    !["draft", "registration_open"].includes(festival.status) &&
    lockState.configurationLockState !== "unlocked"
  ) {
    res.status(400).json({
      success: false,
      message: "Festival sport registration is closed",
    });
    return null;
  }
  if (
    festival.rosterFormationMode === "manual" &&
    festival.teamAssignmentStatus === "locked"
  ) {
    res.status(400).json({
      success: false,
      message: "Festival participants and sport selections are locked",
    });
    return null;
  }
  return festival;
};

const requireFestivalParticipant = async (
  festivalId,
  participantId,
  res,
  { activeOnly = false } = {}
) => {
  const participant = await FestivalParticipant.findOne({
    where: {
      id: participantId,
      festivalId,
      ...(activeOnly ? { status: "registered" } : {}),
    },
  });
  if (!participant) {
    res
      .status(404)
      .json({ success: false, message: "Festival participant not found" });
    return null;
  }
  return participant;
};

const requireParticipantReadAccess = async (req, participant, res) => {
  if (req.user.role === "admin") {
    return true;
  }

  const employee = await Employee.findOne({
    where: { id: participant.employeeId, userId: req.user.id },
  });
  if (employee) return true;

  res.status(403).json({
    success: false,
    message: "Access denied",
  });
  return false;
};

const getEnabledFestivalSports = (festivalId, sportIds) =>
  FestivalSport.findAll({
    where: {
      festivalId,
      ...(sportIds ? { sportId: sportIds } : {}),
    },
    include: [{ model: Sport, as: "sport" }],
  });

const addParticipantToActiveAuctionPool = async (
  festivalId,
  participantId,
  transaction
) => {
  const config = await FestivalAuctionConfig.findOne({
    where: { festivalId },
    attributes: ["auctionStatus"],
    transaction,
  });
  if (!config || config.auctionStatus === "setup") return;
  await FestivalAuctionPool.findOrCreate({
    where: {
      festivalId,
      festivalParticipantId: participantId,
    },
    defaults: {
      id: crypto.randomUUID(),
      state: "available",
      reauctionCount: 0,
      generatedAt: new Date(),
    },
    transaction,
  });
};

export const createFestival = async (req, res) => {
  try {
    const festival = await Festival.create({
      id: crypto.randomUUID(),
      ...req.body,
      status: "draft",
      createdByUserId: req.user.id,
    });

    return res.status(201).json({ data: toFestivalResponse(festival) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Festival code already exists");
    }
    console.error("Error creating festival:", error);
    return res.status(500).json({ message: "Failed to create festival" });
  }
};

export const getFestivals = async (req, res) => {
  try {
    const festivals = await Festival.findAll({
      attributes: [
        "id",
        "name",
        "code",
        "startDate",
        "endDate",
        "registrationOpensAt",
        "registrationClosesAt",
        "status",
        "teamAssignmentStatus",
        "rosterFormationMode",
        "timezone",
        "currencyCode",
        "configurationLockState",
        "createdByUserId",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["startDate", "DESC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      data: festivals.map(toFestivalResponse),
      meta: { count: festivals.length },
    });
  } catch (error) {
    console.error("Error fetching festivals:", error);
    return res.status(500).json({ message: "Failed to fetch festivals" });
  }
};

export const getFestivalById = async (req, res) => {
  try {
    const festival = await Festival.findByPk(req.params.festivalId);
    if (!festival) {
      return res
        .status(404)
        .json({ success: false, message: "Festival not found" });
    }

    return res.status(200).json({
      data: {
        ...toFestivalResponse(festival),
        lockState: await getFestivalLockState(festival.id),
      },
    });
  } catch (error) {
    console.error("Error fetching festival:", error);
    return res.status(500).json({ message: "Failed to fetch festival" });
  }
};

export const updateFestival = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await Festival.findByPk(req.params.festivalId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!festival) return { status: 404, message: "Festival not found" };
      const lockState = await requireFestivalConfigurationOpen({
        festivalId: festival.id,
        res,
        transaction,
        section: "Festival Details",
      });
      if (!lockState) return null;

      const nextStartDate = req.body.startDate || festival.startDate;
      const nextEndDate = req.body.endDate || festival.endDate;
      if (nextEndDate < nextStartDate) {
        return {
          status: 400,
          message: "End date must be on or after start date",
        };
      }
      const nextRegistrationOpen =
        req.body.registrationOpensAt === undefined
          ? festival.registrationOpensAt
          : req.body.registrationOpensAt;
      const nextRegistrationClose =
        req.body.registrationClosesAt === undefined
          ? festival.registrationClosesAt
          : req.body.registrationClosesAt;
      if (
        nextRegistrationOpen &&
        nextRegistrationClose &&
        new Date(nextRegistrationClose) <= new Date(nextRegistrationOpen)
      ) {
        return {
          status: 400,
          message: "Registration close must be after registration open",
        };
      }

      const before = toFestivalResponse(festival);
      await festival.update(req.body, { transaction });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_details_updated",
        entityType: "festival",
        entityId: festival.id,
        details: { before, after: toFestivalResponse(festival) },
        transaction,
      });
      return { festival };
    });
    if (!result) return;
    if (result.status) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }
    return res.status(200).json({
      success: true,
      data: {
        ...toFestivalResponse(result.festival),
        lockState: await getFestivalLockState(result.festival.id),
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Festival code already exists");
    }
    console.error("Error updating festival:", error);
    return res.status(500).json({ message: "Failed to update festival" });
  }
};

const setFestivalConfigurationLock = async (req, res, nextState) => {
  try {
    const expectedConfirmation =
      nextState === "unlocked" ? "UNLOCK" : "RELOCK";
    if (req.body.confirmation !== expectedConfirmation) {
      return res.status(400).json({
        success: false,
        message: `Type ${expectedConfirmation} to confirm`,
      });
    }
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await Festival.findByPk(req.params.festivalId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!festival) return null;
      const previousState =
        festival.configurationLockState || "locked";
      if (previousState !== nextState) {
        await festival.update(
          { configurationLockState: nextState },
          { transaction }
        );
      }
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action:
          nextState === "unlocked"
            ? "festival_configuration_unlocked"
            : "festival_configuration_relocked",
        entityType: "festival_configuration",
        entityId: festival.id,
        details: {
          previousState,
          nextState,
          confirmation: expectedConfirmation,
        },
        transaction,
      });
      return festival;
    });
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Festival not found" });
    }
    return res.status(200).json({
      success: true,
      data: {
        ...toFestivalResponse(result),
        lockState: await getFestivalLockState(result.id),
      },
    });
  } catch (error) {
    console.error("Error changing Festival configuration lock:", error);
    return res
      .status(500)
      .json({ message: "Failed to change configuration lock" });
  }
};

export const unlockFestivalConfiguration = (req, res) =>
  setFestivalConfigurationLock(req, res, "unlocked");

export const relockFestivalConfiguration = (req, res) =>
  setFestivalConfigurationLock(req, res, "locked");

export const updateRosterFormationMode = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await Festival.findByPk(req.params.festivalId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!festival) {
        return { status: 404, message: "Festival not found" };
      }
      const lockState = await requireFestivalConfigurationOpen({
        festivalId: festival.id,
        res,
        transaction,
        section: "Roster formation mode",
        allowWhenUnlocked: false,
      });
      if (!lockState) {
        return {
          responseSent: true,
        };
      }

      const nextMode = req.body.rosterFormationMode;
      if (festival.rosterFormationMode === nextMode) {
        return { festival };
      }
      if (["completed", "archived"].includes(festival.status)) {
        return {
          status: 400,
          message: "Completed or archived festivals cannot change roster mode",
        };
      }

      if (nextMode === "manual") {
        const [ownerCount, retentionCount, configCount, auctionCount, resultCount] =
          await Promise.all([
            FestivalTeamOwner.count({
              where: { festivalId: festival.id },
              transaction,
            }),
            FestivalRetention.count({
              where: { festivalId: festival.id },
              transaction,
            }),
            FestivalAuctionConfig.count({
              where: { festivalId: festival.id },
              transaction,
            }),
            FestivalAuction.count({
              where: { festivalId: festival.id },
              transaction,
            }),
            FestivalAuctionResult.count({
              where: { festivalId: festival.id },
              transaction,
            }),
          ]);
        if (
          ownerCount ||
          retentionCount ||
          configCount ||
          auctionCount ||
          resultCount
        ) {
          return {
            status: 409,
            message:
              "Manual mode cannot be enabled after auction setup or roster activity exists",
          };
        }
      }

      if (
        nextMode === "auction" &&
        festival.teamAssignmentStatus === "locked"
      ) {
        return {
          status: 409,
          message:
            "Auction mode cannot be enabled after manual assignments are locked",
        };
      }

      await festival.update(
        { rosterFormationMode: nextMode },
        { transaction }
      );
      return { festival };
    });

    if (result.responseSent) return;
    if (result.status) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }
    return res.status(200).json({
      success: true,
      data: toFestivalResponse(result.festival),
    });
  } catch (error) {
    console.error("Error updating roster formation mode:", error);
    return res
      .status(500)
      .json({ message: "Failed to update roster formation mode" });
  }
};

export const addFestivalSport = async (req, res) => {
  try {
    const festival = await requireDraftFestival(req.params.festivalId, res);
    if (!festival) return;

    const sport = await Sport.findOne({
      where: { id: req.body.sportId, isActive: true },
    });
    if (!sport) {
      return res
        .status(404)
        .json({ success: false, message: "Active sport not found" });
    }

    const festivalSport = await FestivalSport.create({
      id: crypto.randomUUID(),
      festivalId: festival.id,
      sportId: sport.id,
      status: "draft",
      configJson: req.body.config ?? null,
    });
    festivalSport.setDataValue("sport", sport);

    return res
      .status(201)
      .json({ data: toFestivalSportResponse(festivalSport) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Sport is already enabled for this festival");
    }
    console.error("Error adding festival sport:", error);
    return res.status(500).json({ message: "Failed to add festival sport" });
  }
};

export const bulkAddFestivalSports = async (req, res) => {
  try {
    const festival = await requireDraftFestival(req.params.festivalId, res);
    if (!festival) return;

    const sportIds = [...new Set(req.body.sportIds)];
    const summary = await sequelize.transaction(async (transaction) => {
      const [sports, existing] = await Promise.all([
        Sport.findAll({
          where: { id: sportIds, isActive: true },
          transaction,
        }),
        FestivalSport.findAll({
          where: { festivalId: festival.id, sportId: sportIds },
          attributes: ["sportId"],
          transaction,
        }),
      ]);
      if (sports.length !== sportIds.length) {
        return { invalid: true };
      }

      const existingIds = new Set(existing.map(({ sportId }) => sportId));
      const newSports = sports.filter(({ id }) => !existingIds.has(id));
      if (newSports.length) {
        await FestivalSport.bulkCreate(
          newSports.map((sport) => ({
            id: crypto.randomUUID(),
            festivalId: festival.id,
            sportId: sport.id,
            status: "draft",
            configJson: null,
          })),
          { transaction, ignoreDuplicates: true }
        );
      }
      return { added: newSports.length, alreadyEnabled: existing.length };
    });
    if (summary.invalid) {
      return res.status(400).json({
        success: false,
        message: "One or more selected sports are not active",
      });
    }

    return res.status(201).json({
      success: true,
      requested: sportIds.length,
      ...summary,
    });
  } catch (error) {
    console.error("Error bulk adding festival sports:", error);
    return res.status(500).json({ message: "Failed to add selected sports" });
  }
};

export const getFestivalSports = async (req, res) => {
  try {
    const festival = await Festival.findByPk(req.params.festivalId);
    if (!festival) {
      return res
        .status(404)
        .json({ success: false, message: "Festival not found" });
    }

    const festivalSports = await FestivalSport.findAll({
      where: { festivalId: festival.id },
      include: [{ model: Sport, as: "sport" }],
      order: [[{ model: Sport, as: "sport" }, "name", "ASC"]],
    });

    return res.status(200).json({
      data: festivalSports.map(toFestivalSportResponse),
      meta: { count: festivalSports.length },
    });
  } catch (error) {
    console.error("Error fetching festival sports:", error);
    return res.status(500).json({ message: "Failed to fetch festival sports" });
  }
};

export const addFestivalParticipant = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const employee = await Employee.findOne({
      where: {
        id: req.body.employeeId,
        employmentStatus: "active",
      },
    });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Active employee not found" });
    }

    const participant = await sequelize.transaction(async (transaction) => {
      const created = await FestivalParticipant.create(
        {
          id: crypto.randomUUID(),
          festivalId: festival.id,
          employeeId: employee.id,
          userId: null,
          status: "registered",
          registeredAt: new Date(),
        },
        { transaction }
      );
      await addParticipantToActiveAuctionPool(
        festival.id,
        created.id,
        transaction
      );
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_participant_added",
        entityType: "festival_participant",
        entityId: created.id,
        details: { employeeId: employee.id },
        transaction,
      });
      return created;
    });
    participant.setDataValue("employee", employee);

    return res
      .status(201)
      .json({ data: toFestivalParticipantResponse(participant) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Employee is already a festival participant");
    }
    console.error("Error adding festival participant:", error);
    return res
      .status(500)
      .json({ message: "Failed to add festival participant" });
  }
};

const addEmployeesToFestival = async (
  festivalId,
  employeeIds,
  actorUserId
) => {
  const uniqueEmployeeIds = [...new Set(employeeIds)];
  const employees = await Employee.findAll({
    where: {
      id: uniqueEmployeeIds,
      employmentStatus: "active",
    },
  });
  const existingParticipants = await FestivalParticipant.findAll({
    where: {
      festivalId,
      employeeId: uniqueEmployeeIds,
    },
  });
  const existingByEmployeeId = new Map(
    existingParticipants.map((participant) => [
      participant.employeeId,
      participant,
    ])
  );
  const activeEmployeeIds = new Set(employees.map(({ id }) => id));
  const summary = {
    requested: employeeIds.length,
    added: 0,
    reactivated: 0,
    duplicatesIgnored: 0,
    invalidIgnored: uniqueEmployeeIds.filter(
      (employeeId) => !activeEmployeeIds.has(employeeId)
    ).length,
  };
  const changedParticipantIds = [];

  await sequelize.transaction(async (transaction) => {
    const newParticipants = [];

    for (const employee of employees) {
      const existing = existingByEmployeeId.get(employee.id);
      if (!existing) {
        newParticipants.push({
          id: crypto.randomUUID(),
          festivalId,
          employeeId: employee.id,
          userId: null,
          status: "registered",
          registeredAt: new Date(),
        });
        summary.added += 1;
      } else if (existing.status === "withdrawn") {
        await existing.update(
          { status: "registered", registeredAt: new Date() },
          { transaction }
        );
        changedParticipantIds.push(existing.id);
        summary.reactivated += 1;
      } else {
        summary.duplicatesIgnored += 1;
      }
    }

    if (newParticipants.length) {
      await FestivalParticipant.bulkCreate(newParticipants, { transaction });
      changedParticipantIds.push(
        ...newParticipants.map(({ id }) => id)
      );
    }
    for (const participantId of changedParticipantIds) {
      await addParticipantToActiveAuctionPool(
        festivalId,
        participantId,
        transaction
      );
    }
    if (changedParticipantIds.length) {
      await createFestivalAudit({
        festivalId,
        actorUserId,
        action: "festival_participants_added",
        entityType: "festival_participant",
        details: {
          participantIds: changedParticipantIds,
          added: summary.added,
          reactivated: summary.reactivated,
        },
        transaction,
      });
    }
  });

  summary.duplicatesIgnored += employeeIds.length - uniqueEmployeeIds.length;
  return summary;
};

export const bulkAddFestivalParticipants = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const summary = await addEmployeesToFestival(
      festival.id,
      req.body.employeeIds,
      req.user.id
    );
    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("Error bulk adding festival participants:", error);
    return res
      .status(500)
      .json({ message: "Failed to bulk add festival participants" });
  }
};

export const addAllEmployeesToFestival = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const employees = await Employee.findAll({
      where: { employmentStatus: "active" },
      attributes: ["id"],
    });
    const summary = await addEmployeesToFestival(
      festival.id,
      employees.map(({ id }) => id),
      req.user.id
    );
    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("Error adding all employees to festival:", error);
    return res
      .status(500)
      .json({ message: "Failed to add all employees to festival" });
  }
};

export const bulkRemoveFestivalParticipants = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const uniqueParticipantIds = [...new Set(req.body.participantIds)];
    const participants = await FestivalParticipant.findAll({
      where: {
        id: uniqueParticipantIds,
        festivalId: festival.id,
      },
    });
    const registeredParticipants = participants.filter(
      ({ status }) => status === "registered"
    );

    if (registeredParticipants.length) {
      const participantIds = registeredParticipants.map(({ id }) => id);
      const [ownerCount, retentionCount, soldResultCount, soldMembershipCount, config] =
        await Promise.all([
        FestivalTeamOwner.count({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
          },
        }),
        FestivalRetention.count({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
          },
        }),
        FestivalAuctionResult.count({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
            outcome: "sold",
          },
        }),
        FestivalTeamMembership.count({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
            rosterSource: "auction",
          },
        }),
        FestivalAuctionConfig.findOne({
          where: { festivalId: festival.id },
          attributes: ["currentParticipantId"],
        }),
      ]);
      if (soldResultCount || soldMembershipCount) {
        return conflictResponse(
          res,
          "Sold participants and auction roster assignments cannot be removed"
        );
      }
      if (config?.currentParticipantId &&
          participantIds.includes(config.currentParticipantId)) {
        return conflictResponse(
          res,
          "The current auction participant cannot be removed"
        );
      }
      if (ownerCount || retentionCount) {
        return conflictResponse(
          res,
          "Owners and retained participants cannot be withdrawn"
        );
      }
      await sequelize.transaction(async (transaction) => {
        await FestivalTeamMembership.destroy({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
            [Op.or]: [
              { rosterSource: ["admin_override", "auto_balance"] },
              { rosterSource: null },
            ],
          },
          transaction,
        });
        await FestivalAuctionPool.destroy({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participantIds,
            state: "available",
          },
          transaction,
        });
        await FestivalParticipant.update(
          { status: "withdrawn" },
          {
            where: {
              id: participantIds,
              festivalId: festival.id,
            },
            transaction,
          }
        );
        await createFestivalAudit({
          festivalId: festival.id,
          actorUserId: req.user.id,
          action: "festival_participants_removed",
          entityType: "festival_participant",
          details: { participantIds },
          transaction,
        });
      });
    }

    return res.status(200).json({
      success: true,
      requested: req.body.participantIds.length,
      removed: registeredParticipants.length,
      alreadyRemoved: participants.length - registeredParticipants.length,
      notFound: uniqueParticipantIds.length - participants.length,
      duplicatesIgnored:
        req.body.participantIds.length - uniqueParticipantIds.length,
    });
  } catch (error) {
    console.error("Error removing festival participants:", error);
    return res
      .status(500)
      .json({ message: "Failed to remove festival participants" });
  }
};

export const getFestivalParticipants = async (req, res) => {
  try {
    const festival = await Festival.findByPk(req.params.festivalId);
    if (!festival) {
      return res
        .status(404)
        .json({ success: false, message: "Festival not found" });
    }

    const { search, sportId, registrationStatus } = req.query;
    const participants = await FestivalParticipant.findAll({
      where: {
        festivalId: festival.id,
        ...(registrationStatus ? { status: registrationStatus } : {}),
      },
      include: [
        {
          model: Employee,
          as: "employee",
          where: search
            ? {
                [Op.or]: [
                  { employeeNumber: { [Op.like]: `%${search}%` } },
                  { name: { [Op.like]: `%${search}%` } },
                  { email: { [Op.like]: `%${search}%` } },
                  { department: { [Op.like]: `%${search}%` } },
                  { gender: { [Op.like]: `%${search}%` } },
                ],
              }
            : undefined,
        },
        {
          model: FestivalParticipantSport,
          as: "sportRegistrations",
          where: sportId ? { sportId } : undefined,
          required: Boolean(sportId),
          include: [{ model: Sport, as: "sport" }],
        },
      ],
      order: [["registeredAt", "ASC"]],
    });

    return res.status(200).json({
      data: participants.map(toFestivalParticipantResponse),
      meta: { count: participants.length },
    });
  } catch (error) {
    console.error("Error fetching festival participants:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch festival participants" });
  }
};

export const registerParticipantSport = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const participant = await requireFestivalParticipant(
      festival.id,
      req.params.participantId,
      res,
      { activeOnly: true }
    );
    if (!participant) return;

    const festivalSport = await FestivalSport.findOne({
      where: { festivalId: festival.id, sportId: req.body.sportId },
      include: [{ model: Sport, as: "sport" }],
    });
    if (!festivalSport) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            path: "body.sportId",
            message: "Sport is not enabled for this festival",
          },
        ],
      });
    }

    const registration = await FestivalParticipantSport.create({
      id: crypto.randomUUID(),
      festivalParticipantId: participant.id,
      sportId: festivalSport.sportId,
    });
    registration.setDataValue("sport", festivalSport.sport);

    return res.status(201).json({
      data: toFestivalParticipantSportResponse(registration),
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Participant is already registered for this sport");
    }
    console.error("Error registering participant sport:", error);
    return res
      .status(500)
      .json({ message: "Failed to register participant sport" });
  }
};

export const bulkRegisterParticipantSports = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const participant = await requireFestivalParticipant(
      festival.id,
      req.body.participantId,
      res,
      { activeOnly: true }
    );
    if (!participant) return;

    const enabledSports = await getEnabledFestivalSports(
      festival.id,
      req.body.sports
    );
    if (enabledSports.length !== req.body.sports.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            path: "body.sports",
            message: "One or more sports are not enabled for this festival",
          },
        ],
      });
    }

    const existing = await FestivalParticipantSport.findAll({
      where: {
        festivalParticipantId: participant.id,
        sportId: req.body.sports,
      },
    });
    if (existing.length) {
      return conflictResponse(
        res,
        "Participant is already registered for one or more selected sports"
      );
    }

    const registrations = await sequelize.transaction(async (transaction) =>
      FestivalParticipantSport.bulkCreate(
        req.body.sports.map((sportId) => ({
          id: crypto.randomUUID(),
          festivalParticipantId: participant.id,
          sportId,
        })),
        { transaction }
      )
    );

    const sportsById = new Map(
      enabledSports.map((festivalSport) => [
        festivalSport.sportId,
        festivalSport.sport,
      ])
    );
    registrations.forEach((registration) =>
      registration.setDataValue("sport", sportsById.get(registration.sportId))
    );

    return res.status(201).json({
      data: registrations.map(toFestivalParticipantSportResponse),
      meta: { count: registrations.length },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Duplicate sport registration rejected");
    }
    console.error("Error bulk registering participant sports:", error);
    return res
      .status(500)
      .json({ message: "Failed to register participant sports" });
  }
};

export const bulkAssignParticipantSports = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    const participantIds = [...new Set(req.body.participantIds)];
    const sportIds = [...new Set(req.body.sportIds)];
    const [participants, enabledSports] = await Promise.all([
      FestivalParticipant.findAll({
        where: {
          id: participantIds,
          festivalId: festival.id,
          status: "registered",
        },
        attributes: ["id"],
      }),
      FestivalSport.findAll({
        where: { festivalId: festival.id, sportId: sportIds },
        attributes: ["sportId"],
      }),
    ]);
    if (participants.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more participants are not active in this Festival",
      });
    }
    if (enabledSports.length !== sportIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more sports are not enabled for this Festival",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await FestivalParticipantSport.destroy({
        where: { festivalParticipantId: participantIds },
        transaction,
      });
      if (sportIds.length) {
        await FestivalParticipantSport.bulkCreate(
          participantIds.flatMap((participantId) =>
            sportIds.map((sportId) => ({
              id: crypto.randomUUID(),
              festivalParticipantId: participantId,
              sportId,
            }))
          ),
          { transaction }
        );
      }
    });

    return res.status(200).json({
      success: true,
      participantsUpdated: participantIds.length,
      sportsAssigned: sportIds.length,
      registrationsSaved: participantIds.length * sportIds.length,
    });
  } catch (error) {
    console.error("Error bulk assigning participant sports:", error);
    return res.status(500).json({ message: "Failed to bulk save sports" });
  }
};

export const getParticipantSports = async (req, res) => {
  try {
    const participant = await requireFestivalParticipant(
      req.params.festivalId,
      req.params.participantId,
      res
    );
    if (
      !participant ||
      !(await requireParticipantReadAccess(req, participant, res))
    ) {
      return;
    }

    const registrations = await FestivalParticipantSport.findAll({
      where: { festivalParticipantId: participant.id },
      include: [{ model: Sport, as: "sport" }],
      order: [[{ model: Sport, as: "sport" }, "name", "ASC"]],
    });

    return res.status(200).json({
      data: registrations.map(toFestivalParticipantSportResponse),
      meta: { count: registrations.length },
    });
  } catch (error) {
    console.error("Error fetching participant sports:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch participant sports" });
  }
};

export const getSportParticipants = async (req, res) => {
  try {
    const festivalSport = await FestivalSport.findOne({
      where: {
        festivalId: req.params.festivalId,
        sportId: req.params.sportId,
      },
    });
    if (!festivalSport) {
      return res.status(404).json({
        success: false,
        message: "Festival sport not found",
      });
    }

    const registrations = await FestivalParticipantSport.findAll({
      where: { sportId: festivalSport.sportId },
      include: [
        {
          model: FestivalParticipant,
          as: "participant",
          where: { festivalId: req.params.festivalId },
          include: [{ model: Employee, as: "employee" }],
        },
        { model: Sport, as: "sport" },
      ],
      order: [
        [
          { model: FestivalParticipant, as: "participant" },
          { model: Employee, as: "employee" },
          "name",
          "ASC",
        ],
      ],
    });

    return res.status(200).json({
      data: registrations.map((registration) => ({
        ...toFestivalParticipantSportResponse(registration),
        participant: toFestivalParticipantResponse(registration.participant),
      })),
      meta: { count: registrations.length },
    });
  } catch (error) {
    console.error("Error fetching sport participants:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch sport participants" });
  }
};

export const importParticipantSports = async (req, res) => {
  try {
    const festival = await requireOpenRegistrationFestival(
      req.params.festivalId,
      res
    );
    if (!festival) return;

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [{ row: null, message: "CSV file is required" }],
      });
    }
    if (!req.file.originalname?.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            row: null,
            message: "Export the Excel worksheet as CSV before uploading",
          },
        ],
      });
    }

    const festivalSports = await FestivalSport.findAll({
      where: { festivalId: festival.id },
    });
    const parsed = parseFestivalParticipantCsv(
      req.file.buffer.toString("utf8"),
      festivalSports.map(({ sportId }) => sportId)
    );
    const summary = {
      processed: parsed.processed,
      succeeded: 0,
      failed: parsed.processed - parsed.rows.length,
      employeesCreated: 0,
      employeesUpdated: 0,
      participantsCreated: 0,
      participantsUpdated: 0,
      sportRegistrationsAdded: 0,
      sportRegistrationsRemoved: 0,
      errors: [...parsed.errors],
    };

    for (const row of parsed.rows) {
      try {
        const rowResult = await sequelize.transaction(async (transaction) => {
          let employee = await Employee.findOne({
            where: { employeeNumber: row.employee.employeeNumber },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          let reconciledLegacyEmployee = false;
          if (!employee && row.employee.email) {
            const provisionalMatches = await Employee.findAll({
              where: {
                employeeNumber: null,
                email: row.employee.email,
                identityStatus: "needs_review",
              },
              transaction,
              lock: transaction.LOCK.UPDATE,
              limit: 2,
            });
            if (provisionalMatches.length > 1) {
              throw new Error("Ambiguous provisional employee");
            }
            employee = provisionalMatches[0] || null;
            reconciledLegacyEmployee = Boolean(employee);
          }
          const employeeCreated = false;
          let employeeUpdated = false;

          if (!employee) {
            throw new Error(
              "Employee not found; import the Employee Directory CSV with Gender first"
            );
          } else {
            const updates = {
              ...(reconciledLegacyEmployee
                ? {
                    employeeNumber: row.employee.employeeNumber,
                    source: "hr_import",
                    identityStatus: "verified",
                  }
                : {}),
              name: row.employee.name,
              email: row.employee.email,
              department: row.employee.department,
              employmentStatus: "active",
            };
            employeeUpdated = Object.entries(updates).some(
              ([key, value]) => employee[key] !== value
            );
            if (employeeUpdated) await employee.update(updates, { transaction });
          }

          let participant = await FestivalParticipant.findOne({
            where: { festivalId: festival.id, employeeId: employee.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          let participantCreated = false;
          let participantUpdated = false;

          if (!participant) {
            participant = await FestivalParticipant.create(
              {
                id: crypto.randomUUID(),
                festivalId: festival.id,
                employeeId: employee.id,
                userId: null,
                status: "registered",
                registeredAt: new Date(),
              },
              { transaction }
            );
            participantCreated = true;
          } else if (participant.status !== "registered") {
            await participant.update(
              { status: "registered", registeredAt: new Date() },
              { transaction }
            );
            participantUpdated = true;
          }

          if (participantCreated || participantUpdated) {
            await addParticipantToActiveAuctionPool(
              festival.id,
              participant.id,
              transaction
            );
            await createFestivalAudit({
              festivalId: festival.id,
              actorUserId: req.user.id,
              action: participantCreated
                ? "festival_participant_added"
                : "festival_participant_reactivated",
              entityType: "festival_participant",
              entityId: participant.id,
              details: {
                employeeId: employee.id,
                source: "participant_csv_import",
              },
              transaction,
            });
          }

          const registrations = await FestivalParticipantSport.findAll({
            where: { festivalParticipantId: participant.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          const registeredSportIds = new Set(
            registrations.map(({ sportId }) => sportId)
          );
          const sportsToAdd = row.selectedSportIds.filter(
            (sportId) => !registeredSportIds.has(sportId)
          );
          const registrationsToRemove = registrations.filter(({ sportId }) =>
            row.deselectedSportIds.includes(sportId)
          );

          if (sportsToAdd.length) {
            await FestivalParticipantSport.bulkCreate(
              sportsToAdd.map((sportId) => ({
                id: crypto.randomUUID(),
                festivalParticipantId: participant.id,
                sportId,
              })),
              { transaction }
            );
          }
          if (registrationsToRemove.length) {
            await FestivalParticipantSport.destroy({
              where: {
                id: registrationsToRemove.map(({ id }) => id),
              },
              transaction,
            });
          }

          return {
            employeeCreated,
            employeeUpdated,
            participantCreated,
            participantUpdated,
            sportRegistrationsAdded: sportsToAdd.length,
            sportRegistrationsRemoved: registrationsToRemove.length,
          };
        });

        summary.succeeded += 1;
        summary.employeesCreated += Number(rowResult.employeeCreated);
        summary.employeesUpdated += Number(rowResult.employeeUpdated);
        summary.participantsCreated += Number(rowResult.participantCreated);
        summary.participantsUpdated += Number(rowResult.participantUpdated);
        summary.sportRegistrationsAdded += rowResult.sportRegistrationsAdded;
        summary.sportRegistrationsRemoved +=
          rowResult.sportRegistrationsRemoved;
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          row: row.rowNumber,
          message: isUniqueConflict(error)
            ? "Employee or participant conflicts with existing data"
            : error.message?.startsWith("Employee not found;")
              ? error.message
              : "Row could not be imported",
        });
      }
    }

    return res.status(200).json({
      ...summary,
      imported: summary.succeeded,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Duplicate sport registration rejected");
    }
    console.error("Error importing participant sports:", error);
    return res
      .status(500)
      .json({ message: "Failed to import participant sports" });
  }
};

export const downloadParticipantSportsTemplate = async (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="festival-employees-and-sports.csv"'
  );
  return res.status(200).send(festivalParticipantImportTemplate);
};
