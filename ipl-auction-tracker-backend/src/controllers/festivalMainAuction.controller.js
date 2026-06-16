import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { col, fn, Op, where } from "sequelize";
import sequelize from "../config/dbconfig.js";
import {
  Employee,
  Festival,
  FestivalAuctionConfig,
  FestivalAuction,
  FestivalAuctionPool,
  FestivalAuctionResult,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalRetention,
  FestivalTeam,
  FestivalTeamMembership,
  FestivalTeamOwner,
  Sport,
  User,
} from "../models/index.js";
import {
  toFestivalParticipantResponse,
  toFestivalTeamResponse,
} from "../utils/festivalResponse.js";
import { requireFestivalConfigurationOpen } from "../utils/festivalLocking.js";
import { calculateFestivalTeamBudget } from "../utils/festivalAuctionBudget.js";
import { createFestivalAudit } from "../utils/festivalAudit.js";
import { normalizeIdentityEmail } from "../utils/employeeUserLinking.js";
import { sendTeamOwnerCredentialsEmail } from "../utils/emailService.js";

const isUniqueConflict = (error) =>
  error?.name === "SequelizeUniqueConstraintError";

const conflictResponse = (res, message) =>
  res.status(409).json({ success: false, message });

const participantInclude = {
  model: FestivalParticipant,
  as: "participant",
  include: [
    {
      model: Employee,
      as: "employee",
      include: [{ model: User, as: "user", required: false }],
    },
    {
      model: FestivalParticipantSport,
      as: "sportRegistrations",
      include: [{ model: Sport, as: "sport" }],
    },
  ],
};

const toMoney = (value) => Number(value || 0);

export const toAuctionConfigResponse = (config) =>
  config
    ? {
        id: config.id,
        festivalId: config.festivalId,
        totalBudget: toMoney(config.totalBudget),
        ownerCost: toMoney(config.ownerCost),
        status: config.status,
        auctionStatus: config.auctionStatus,
        currentParticipantId: config.currentParticipantId,
        startedAt: config.startedAt,
        completedAt: config.completedAt,
        incrementPercentage: Number(config.incrementPercentage || 20),
        configuredBy: config.configuredBy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      }
    : null;

const toOwnerResponse = (owner) => ({
  id: owner.id,
  festivalId: owner.festivalId,
  festivalTeamId: owner.festivalTeamId,
  festivalParticipantId: owner.festivalParticipantId,
  ownerCost: toMoney(owner.ownerCost),
  assignedBy: owner.assignedBy,
  assignedAt: owner.assignedAt,
  status: owner.status,
  userProvisioningStatus: owner.userProvisioningStatus,
  credentialsSentAt: owner.credentialsSentAt,
  userStatus:
    owner.userProvisioningStatus === "auto_created"
      ? "Auto Created"
      : owner.userProvisioningStatus === "existing_user"
        ? "Existing User"
        : null,
  team: owner.team ? toFestivalTeamResponse(owner.team) : undefined,
  participant: owner.participant
    ? toFestivalParticipantResponse(owner.participant)
    : undefined,
});

const toRetentionResponse = (retention) => ({
  id: retention.id,
  festivalId: retention.festivalId,
  festivalTeamId: retention.festivalTeamId,
  festivalParticipantId: retention.festivalParticipantId,
  amount: toMoney(retention.amount),
  retainedBy: retention.retainedBy,
  retainedAt: retention.retainedAt,
  team: retention.team ? toFestivalTeamResponse(retention.team) : undefined,
  participant: retention.participant
    ? toFestivalParticipantResponse(retention.participant)
    : undefined,
});

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

const loadSetupConfig = async (festivalId, res, transaction) => {
  const lockState = await requireFestivalConfigurationOpen({
      festivalId,
      res,
      transaction,
      section: "Festival Auction setup",
    });
  if (!lockState) {
    return null;
  }
  const config = await FestivalAuctionConfig.findOne({
    where: { festivalId },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!config) {
    res.status(400).json({
      success: false,
      message: "Configure the festival auction budget and owner cost first",
    });
    return null;
  }
  if (config.status !== "setup" && !lockState.overrideActive) {
    res.status(400).json({
      success: false,
      message: "Main festival auction setup can no longer be modified",
    });
    return null;
  }
  return config;
};

const requireAuctionRosterMode = (festival, res, action) => {
  if (festival.rosterFormationMode === "auction") return true;
  res.status(400).json({
    success: false,
    message: `${action} is disabled when roster formation mode is manual`,
  });
  return false;
};

export const calculateTeamBudgets = async (
  festivalId,
  config,
  transaction
) => {
  const [teams, owners, retentions, auctionResults] = await Promise.all([
    FestivalTeam.findAll({
      where: { festivalId, status: "active" },
      order: [["name", "ASC"]],
      transaction,
    }),
    FestivalTeamOwner.findAll({ where: { festivalId }, transaction }),
    FestivalRetention.findAll({ where: { festivalId }, transaction }),
    FestivalAuctionResult.findAll({
      where: { festivalId, outcome: "sold" },
      transaction,
    }),
  ]);
  const ownerByTeamId = new Map(
    owners.map((owner) => [owner.festivalTeamId, owner])
  );

  return teams.map((team) => {
    const owner = ownerByTeamId.get(team.id);
    const retentionAmounts = retentions
      .filter((retention) => retention.festivalTeamId === team.id)
      .map((retention) => retention.amount);
    const auctionAmounts = auctionResults
      .filter((result) => result.festivalTeamId === team.id)
      .map((result) => result.finalAmount);
    const budget = calculateFestivalTeamBudget({
      totalBudget: config?.totalBudget,
      ownerCost: owner?.ownerCost,
      retentionAmounts,
      auctionAmounts,
    });

    return {
      festivalTeamId: team.id,
      team: toFestivalTeamResponse(team),
      ...budget,
    };
  });
};

const requireAdminOrOwner = async (req, festivalId, res) => {
  if (req.user.role === "admin") return true;
  if (req.user.role !== "team_owner") {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }

  const employee = await Employee.findOne({
    where: { userId: req.user.id, employmentStatus: "active" },
  });
  if (!employee) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  const participant = await FestivalParticipant.findOne({
    where: { festivalId, employeeId: employee.id, status: "registered" },
  });
  if (!participant) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  const owner = await FestivalTeamOwner.findOne({
    where: {
      festivalId,
      festivalParticipantId: participant.id,
      status: "active",
    },
  });
  if (!owner) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  return true;
};

export const updateFestivalAuctionConfig = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (
        !requireAuctionRosterMode(
          festival,
          res,
          "Auction configuration"
        )
      ) {
        return null;
      }
      const lockState = await requireFestivalConfigurationOpen({
        festivalId: festival.id,
        res,
        transaction,
        section: "Festival Auction budget",
      });
      if (!lockState) return null;

      let config = await FestivalAuctionConfig.findOne({
        where: { festivalId: festival.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        config &&
        config.status !== "setup" &&
        !lockState.overrideActive
      ) {
        res.status(400).json({
          success: false,
          message: "Main festival auction setup can no longer be modified",
        });
        return null;
      }
      const soldResultCount = await FestivalAuctionResult.count({
        where: { festivalId: festival.id, outcome: "sold" },
        transaction,
      });
      if (soldResultCount) {
        res.status(409).json({
          success: false,
          message:
            "Festival budget is read-only after a participant has been sold",
        });
        return null;
      }

      const ownerCount = await FestivalTeamOwner.count({
        where: { festivalId: festival.id },
        transaction,
      });
      if (
        config &&
        ownerCount &&
        req.body.ownerCost !== undefined &&
        req.body.ownerCost !== toMoney(config.ownerCost)
      ) {
        res.status(400).json({
          success: false,
          message: "Owner cost cannot change after owners are assigned",
        });
        return null;
      }

      const values = {
        totalBudget: req.body.totalBudget ?? toMoney(config?.totalBudget),
        ownerCost: req.body.ownerCost ?? toMoney(config?.ownerCost),
        incrementPercentage:
          req.body.incrementPercentage ??
          Number(config?.incrementPercentage || 20),
      };
      if (!values.totalBudget || values.ownerCost === undefined) {
        res.status(400).json({
          success: false,
          message: "Total budget and owner cost are required",
        });
        return null;
      }
      if (values.ownerCost > values.totalBudget) {
        res.status(400).json({
          success: false,
          message: "Owner cost cannot exceed the team budget",
        });
        return null;
      }

      const previousConfig = config
        ? toAuctionConfigResponse(config)
        : null;
      if (!config) {
        config = await FestivalAuctionConfig.create(
          {
            id: crypto.randomUUID(),
            festivalId: festival.id,
            ...values,
            status: "setup",
            configuredBy: req.user.id,
          },
          { transaction }
        );
      } else {
        const budgets = await calculateTeamBudgets(
          festival.id,
          config,
          transaction
        );
        const highestSpent = Math.max(
          0,
          ...budgets.map(({ spentBudget }) => spentBudget)
        );
        if (values.totalBudget < highestSpent) {
          res.status(400).json({
            success: false,
            message: "Total budget cannot be less than existing team spending",
          });
          return null;
        }
        await config.update(
          { ...values, configuredBy: req.user.id },
          { transaction }
        );
      }
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_budget_updated",
        entityType: "festival_auction_config",
        entityId: config.id,
        details: {
          before: previousConfig,
          after: toAuctionConfigResponse(config),
        },
        transaction,
      });

      return {
        config: toAuctionConfigResponse(config),
        budgets: await calculateTeamBudgets(
          festival.id,
          config,
          transaction
        ),
      };
    });
    if (!result) return;
    return res.status(200).json({ data: result.config, budgets: result.budgets });
  } catch (error) {
    console.error("Error updating festival auction config:", error);
    return res
      .status(500)
      .json({ message: "Failed to update festival auction configuration" });
  }
};

export const assignFestivalTeamOwner = async (req, res) => {
  try {
    const provisioning = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (
        !requireAuctionRosterMode(festival, res, "Owner assignment")
      ) {
        return null;
      }
      const config = await loadSetupConfig(festival.id, res, transaction);
      if (!config) return null;

      const [team, participant] = await Promise.all([
        FestivalTeam.findOne({
          where: {
            id: req.params.teamId,
            festivalId: festival.id,
            status: "active",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalParticipant.findOne({
          where: {
            id: req.body.participantId,
            festivalId: festival.id,
            status: "registered",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (!team || !participant) {
        res.status(404).json({
          success: false,
          message: !team
            ? "Active festival team not found"
            : "Active festival participant not found",
        });
        return null;
      }
      const [soldResult, currentConfig] = await Promise.all([
        FestivalAuctionResult.findOne({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participant.id,
            outcome: "sold",
          },
          transaction,
        }),
        FestivalAuctionConfig.findOne({
          where: { festivalId: festival.id },
          attributes: ["currentParticipantId"],
          transaction,
        }),
      ]);
      if (soldResult) {
        res.status(409).json({
          success: false,
          message: "A sold participant cannot be assigned as an owner",
        });
        return null;
      }
      if (currentConfig?.currentParticipantId === participant.id) {
        res.status(409).json({
          success: false,
          message: "The current auction participant cannot become an owner",
        });
        return null;
      }
      const employee = await Employee.findByPk(participant.employeeId, {
        include: [{ model: User, as: "user", required: false }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!employee) {
        res.status(404).json({
          success: false,
          message: "Employee record not found for this participant",
        });
        return null;
      }
      if (employee.employmentStatus !== "active") {
        res.status(400).json({
          success: false,
          message: "Inactive employees cannot be assigned as owners",
        });
        return null;
      }

      const normalizedEmail = normalizeIdentityEmail(
        employee.user?.email || employee.email
      );
      if (!normalizedEmail) {
        res.status(400).json({
          success: false,
          message: "Employee email is required to create Team Owner access",
        });
        return null;
      }

      let user = employee.user;
      let temporaryPassword = null;
      let userProvisioningStatus = "existing_user";
      if (!user) {
        user = await User.findOne({
          where: where(fn("LOWER", col("email")), normalizedEmail),
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      }
      if (user) {
        const conflictingEmployee = await Employee.findOne({
          where: {
            userId: user.id,
            id: { [Op.ne]: employee.id },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (conflictingEmployee) {
          res.status(409).json({
            success: false,
            message: "Existing user is already linked to another employee",
          });
          return null;
        }
        await user.update(
          {
            role: "team_owner",
            isVerified: true,
            verificationToken: null,
            verificationExpires: null,
          },
          { transaction }
        );
      } else {
        temporaryPassword = `${crypto
          .randomBytes(18)
          .toString("base64url")}!aA1`;
        user = await User.create(
          {
            id: crypto.randomUUID(),
            name: employee.name,
            email: normalizedEmail,
            password: await bcrypt.hash(temporaryPassword, 10),
            role: "team_owner",
            isVerified: true,
            mustChangePassword: true,
          },
          { transaction }
        );
        userProvisioningStatus = "auto_created";
        await createFestivalAudit({
          festivalId: festival.id,
          actorUserId: req.user.id,
          action: "user_auto_created",
          entityType: "user",
          entityId: user.id,
          details: { employeeId: employee.id, email: normalizedEmail },
          transaction,
        });
      }
      if (employee.userId !== user.id) {
        await employee.update({ userId: user.id }, { transaction });
      }

      const [teamOwner, participantOwner, retention, membership] =
        await Promise.all([
          FestivalTeamOwner.findOne({
            where: { festivalTeamId: team.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          FestivalTeamOwner.findOne({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participant.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          FestivalRetention.findOne({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participant.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          FestivalTeamMembership.findOne({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participant.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
        ]);
      if (
        participantOwner &&
        participantOwner.id !== teamOwner?.id
      ) {
        res.status(409).json({
          success: false,
          message: "Participant already owns a festival team",
        });
        return null;
      }
      if (
        teamOwner?.festivalParticipantId === participant.id
      ) {
        res.status(409).json({
          success: false,
          message: "Participant already owns this festival team",
        });
        return null;
      }
      if (retention) {
        res.status(409).json({
          success: false,
          message: "Retained participant cannot be assigned as owner again",
        });
        return null;
      }
      if (membership && membership.festivalTeamId !== team.id) {
        res.status(409).json({
          success: false,
          message: "Participant already belongs to another festival team",
        });
        return null;
      }
      const budgets = await calculateTeamBudgets(
        festival.id,
        config,
        transaction
      );
      const teamBudget = budgets.find(
        ({ festivalTeamId }) => festivalTeamId === team.id
      );
      if (
        !teamBudget ||
        (!teamOwner &&
          toMoney(config.ownerCost) > teamBudget.remainingBudget)
      ) {
        res.status(400).json({
          success: false,
          message: "Owner cost exceeds the team's remaining purse",
        });
        return null;
      }

      const ownerValues = {
        festivalParticipantId: participant.id,
        ownerCost: config.ownerCost,
        status: "active",
        userProvisioningStatus,
        credentialsSentAt: null,
        assignedBy: req.user.id,
        assignedAt: new Date(),
      };
      const previousOwnerParticipantId =
        teamOwner?.festivalParticipantId || null;
      let owner;
      if (teamOwner) {
        await FestivalTeamMembership.destroy({
          where: {
            festivalId: festival.id,
            festivalParticipantId: teamOwner.festivalParticipantId,
            festivalTeamId: team.id,
            rosterSource: "owner_retention",
          },
          transaction,
        });
        const activeConfig = await FestivalAuctionConfig.findOne({
          where: { festivalId: festival.id },
          attributes: ["auctionStatus"],
          transaction,
        });
        if (activeConfig?.auctionStatus !== "setup") {
          await FestivalAuctionPool.findOrCreate({
            where: {
              festivalId: festival.id,
              festivalParticipantId: teamOwner.festivalParticipantId,
            },
            defaults: {
              id: crypto.randomUUID(),
              state: "available",
              reauctionCount: 0,
              generatedAt: new Date(),
            },
            transaction,
          });
        }
        await teamOwner.update(ownerValues, { transaction });
        owner = teamOwner;
      } else {
        owner = await FestivalTeamOwner.create(
          {
            id: crypto.randomUUID(),
            festivalId: festival.id,
            festivalTeamId: team.id,
            ...ownerValues,
          },
          { transaction }
        );
      }
      if (membership) {
        await membership.update(
          {
            assignmentMethod: "manual",
            rosterSource: "owner_retention",
            assignedBy: req.user.id,
            assignedAt: new Date(),
          },
          { transaction }
        );
      } else {
        await FestivalTeamMembership.create(
          {
            id: crypto.randomUUID(),
            festivalId: festival.id,
            festivalParticipantId: participant.id,
            festivalTeamId: team.id,
            assignmentMethod: "manual",
            rosterSource: "owner_retention",
            assignedBy: req.user.id,
            assignedAt: new Date(),
          },
          { transaction }
        );
      }
      await FestivalAuctionPool.destroy({
        where: {
          festivalId: festival.id,
          festivalParticipantId: participant.id,
          state: "available",
        },
        transaction,
      });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_owner_changed",
        entityType: "festival_team_owner",
        entityId: owner.id,
        details: {
          festivalTeamId: team.id,
          festivalParticipantId: participant.id,
          previousParticipantId: previousOwnerParticipantId,
          change: teamOwner ? "reassigned" : "assigned",
        },
        transaction,
      });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "owner_assigned",
        entityType: "festival_team_owner",
        entityId: owner.id,
        details: {
          festivalTeamId: team.id,
          festivalParticipantId: participant.id,
          employeeId: employee.id,
          userId: user.id,
          userProvisioningStatus,
        },
        transaction,
      });
      return {
        ownerId: owner.id,
        festivalId: festival.id,
        actorUserId: req.user.id,
        userId: user.id,
        email: user.email,
        name: user.name || employee.name,
        teamName: team.name,
        temporaryPassword,
      };
    });
    if (!provisioning) return;

    let emailError = null;
    try {
      await sendTeamOwnerCredentialsEmail(provisioning);
      await sequelize.transaction(async (transaction) => {
        await FestivalTeamOwner.update(
          { credentialsSentAt: new Date() },
          { where: { id: provisioning.ownerId }, transaction }
        );
        await createFestivalAudit({
          festivalId: provisioning.festivalId,
          actorUserId: provisioning.actorUserId,
          action: "credentials_sent",
          entityType: "user",
          entityId: provisioning.userId,
          details: {
            festivalTeamOwnerId: provisioning.ownerId,
            email: provisioning.email,
            temporaryPasswordIncluded: Boolean(
              provisioning.temporaryPassword
            ),
          },
          transaction,
        });
      });
    } catch (error) {
      emailError = error;
      console.error("Failed to send Team Owner credentials:", error);
    }

    const owner = await FestivalTeamOwner.findByPk(provisioning.ownerId, {
      include: [
        { model: FestivalTeam, as: "team" },
        participantInclude,
      ],
    });
    if (emailError) {
      return res.status(502).json({
        success: false,
        message:
          "Owner assigned, but the credentials email could not be sent. Check email configuration and use Resend Credentials.",
        data: toOwnerResponse(owner),
      });
    }
    return res.status(201).json({ data: toOwnerResponse(owner) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Duplicate owner assignment rejected");
    }
    console.error("Error assigning festival team owner:", error);
    return res.status(500).json({ message: "Failed to assign team owner" });
  }
};

export const resendFestivalTeamOwnerCredentials = async (req, res) => {
  try {
    const owner = await FestivalTeamOwner.findOne({
      where: {
        festivalId: req.params.festivalId,
        festivalTeamId: req.params.teamId,
        status: "active",
      },
      include: [
        { model: FestivalTeam, as: "team" },
        participantInclude,
      ],
    });
    const employee = owner?.participant?.employee;
    const user = employee?.user;
    if (!owner || !employee || !user) {
      return res.status(404).json({
        success: false,
        message: "Active Team Owner account not found",
      });
    }

    let temporaryPassword = null;
    let temporaryPasswordHash = null;
    if (user.mustChangePassword) {
      temporaryPassword = `${crypto
        .randomBytes(18)
        .toString("base64url")}!aA1`;
      temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);
    }

    await sendTeamOwnerCredentialsEmail({
      email: user.email,
      name: user.name || employee.name,
      teamName: owner.team?.name,
      temporaryPassword,
    });
    await sequelize.transaction(async (transaction) => {
      if (temporaryPasswordHash) {
        await User.update(
          { password: temporaryPasswordHash },
          { where: { id: user.id }, transaction }
        );
      }
      await owner.update({ credentialsSentAt: new Date() }, { transaction });
      await createFestivalAudit({
        festivalId: owner.festivalId,
        actorUserId: req.user.id,
        action: "credentials_sent",
        entityType: "user",
        entityId: user.id,
        details: {
          festivalTeamOwnerId: owner.id,
          email: user.email,
          temporaryPasswordIncluded: Boolean(temporaryPassword),
          resend: true,
        },
        transaction,
      });
    });

    const refreshedOwner = await FestivalTeamOwner.findByPk(owner.id, {
      include: [
        { model: FestivalTeam, as: "team" },
        participantInclude,
      ],
    });
    return res.status(200).json({ data: toOwnerResponse(refreshedOwner) });
  } catch (error) {
    console.error("Failed to resend Team Owner credentials:", error);
    return res.status(502).json({
      success: false,
      message: "Credentials email could not be sent",
    });
  }
};

export const getFestivalTeamOwner = async (req, res) => {
  try {
    const team = await FestivalTeam.findOne({
      where: {
        id: req.params.teamId,
        festivalId: req.params.festivalId,
      },
    });
    if (!team) {
      return res
        .status(404)
        .json({ success: false, message: "Festival team not found" });
    }
    const owner = await FestivalTeamOwner.findOne({
      where: { festivalTeamId: team.id },
      include: [
        { model: FestivalTeam, as: "team" },
        participantInclude,
      ],
    });
    return res.status(200).json({
      data: owner ? toOwnerResponse(owner) : null,
    });
  } catch (error) {
    console.error("Error fetching festival team owner:", error);
    return res.status(500).json({ message: "Failed to fetch team owner" });
  }
};

export const createFestivalRetention = async (req, res) => {
  try {
    const retentionId = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (!requireAuctionRosterMode(festival, res, "Retention")) {
        return null;
      }
      const config = await loadSetupConfig(festival.id, res, transaction);
      if (!config) return null;

      const [team, participant] = await Promise.all([
        FestivalTeam.findOne({
          where: {
            id: req.body.teamId,
            festivalId: festival.id,
            status: "active",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalParticipant.findOne({
          where: {
            id: req.body.participantId,
            festivalId: festival.id,
            status: "registered",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (!team || !participant) {
        res.status(404).json({
          success: false,
          message: !team
            ? "Active festival team not found"
            : "Active festival participant not found",
        });
        return null;
      }
      const [soldResult, currentConfig] = await Promise.all([
        FestivalAuctionResult.findOne({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participant.id,
            outcome: "sold",
          },
          transaction,
        }),
        FestivalAuctionConfig.findOne({
          where: { festivalId: festival.id },
          attributes: ["currentParticipantId"],
          transaction,
        }),
      ]);
      if (soldResult) {
        res.status(409).json({
          success: false,
          message: "A sold participant cannot be retained",
        });
        return null;
      }
      if (currentConfig?.currentParticipantId === participant.id) {
        res.status(409).json({
          success: false,
          message: "The current auction participant cannot be retained",
        });
        return null;
      }

      const [owner, existingRetention, membership] = await Promise.all([
        FestivalTeamOwner.findOne({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participant.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalRetention.findOne({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participant.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        FestivalTeamMembership.findOne({
          where: {
            festivalId: festival.id,
            festivalParticipantId: participant.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      ]);
      if (owner) {
        res.status(409).json({
          success: false,
          message: "Team owner cannot be retained again",
        });
        return null;
      }
      if (existingRetention) {
        res.status(409).json({
          success: false,
          message: "Participant is already retained",
        });
        return null;
      }
      if (membership) {
        res.status(409).json({
          success: false,
          message: "Participant already belongs to a festival team",
        });
        return null;
      }

      const budgets = await calculateTeamBudgets(
        festival.id,
        config,
        transaction
      );
      const budget = budgets.find(
        ({ festivalTeamId }) => festivalTeamId === team.id
      );
      if (!budget || req.body.amount > budget.remainingBudget) {
        res.status(400).json({
          success: false,
          message: "Retention amount exceeds the team's remaining purse",
        });
        return null;
      }

      const retention = await FestivalRetention.create(
        {
          id: crypto.randomUUID(),
          festivalId: festival.id,
          festivalTeamId: team.id,
          festivalParticipantId: participant.id,
          amount: req.body.amount,
          retainedBy: req.user.id,
          retainedAt: new Date(),
        },
        { transaction }
      );
      await FestivalTeamMembership.create(
        {
          id: crypto.randomUUID(),
          festivalId: festival.id,
          festivalParticipantId: participant.id,
          festivalTeamId: team.id,
          assignmentMethod: "manual",
          rosterSource: "retention",
          assignedBy: req.user.id,
          assignedAt: new Date(),
        },
        { transaction }
      );
      await FestivalAuctionPool.destroy({
        where: {
          festivalId: festival.id,
          festivalParticipantId: participant.id,
          state: "available",
        },
        transaction,
      });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_retention_updated",
        entityType: "festival_retention",
        entityId: retention.id,
        details: {
          change: "created",
          festivalTeamId: team.id,
          festivalParticipantId: participant.id,
          amount: Number(req.body.amount),
        },
        transaction,
      });
      return retention.id;
    });
    if (!retentionId) return;

    const retention = await FestivalRetention.findByPk(retentionId, {
      include: [
        { model: FestivalTeam, as: "team" },
        participantInclude,
      ],
    });
    return res.status(201).json({ data: toRetentionResponse(retention) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Duplicate retention rejected");
    }
    console.error("Error creating festival retention:", error);
    return res.status(500).json({ message: "Failed to create retention" });
  }
};

export const bulkCreateFestivalRetentions = async (req, res) => {
  try {
    const summary = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (!requireAuctionRosterMode(festival, res, "Retention")) return null;
      const config = await loadSetupConfig(festival.id, res, transaction);
      if (!config) return null;

      const assignments = req.body.assignments;
      const participantIds = assignments.map(({ participantId }) =>
        participantId
      );
      const teamIds = assignments.map(({ teamId }) => teamId);
      const [
        participants,
        teams,
        existingRetentions,
        owners,
        memberships,
        soldResults,
        currentConfig,
      ] =
        await Promise.all([
          FestivalParticipant.findAll({
            where: {
              id: participantIds,
              festivalId: festival.id,
              status: "registered",
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          FestivalTeam.findAll({
            where: {
              id: teamIds,
              festivalId: festival.id,
              status: "active",
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          }),
          FestivalRetention.findAll({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participantIds,
            },
            transaction,
          }),
          FestivalTeamOwner.findAll({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participantIds,
            },
            transaction,
          }),
          FestivalTeamMembership.findAll({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participantIds,
            },
            transaction,
          }),
          FestivalAuctionResult.findAll({
            where: {
              festivalId: festival.id,
              festivalParticipantId: participantIds,
              outcome: "sold",
            },
            transaction,
          }),
          FestivalAuctionConfig.findOne({
            where: { festivalId: festival.id },
            attributes: ["currentParticipantId"],
            transaction,
          }),
        ]);
      if (
        participants.length !== new Set(participantIds).size ||
        teams.length !== new Set(teamIds).size
      ) {
        return {
          status: 400,
          message: "Bulk retention contains an invalid participant or team",
        };
      }
      if (existingRetentions.length || owners.length || memberships.length) {
        return {
          status: 409,
          message:
            "Bulk retention contains an owner, retained, or rostered participant",
        };
      }
      if (soldResults.length) {
        return {
          status: 409,
          message: "Bulk retention contains a sold participant",
        };
      }
      if (
        currentConfig?.currentParticipantId &&
        participantIds.includes(currentConfig.currentParticipantId)
      ) {
        return {
          status: 409,
          message: "Bulk retention contains the current auction participant",
        };
      }

      const budgets = await calculateTeamBudgets(
        festival.id,
        config,
        transaction
      );
      const requestedByTeam = new Map();
      assignments.forEach(({ teamId, amount }) =>
        requestedByTeam.set(
          teamId,
          (requestedByTeam.get(teamId) || 0) + Number(amount)
        )
      );
      for (const [teamId, requested] of requestedByTeam) {
        const budget = budgets.find(
          ({ festivalTeamId }) => festivalTeamId === teamId
        );
        if (!budget || requested > budget.remainingBudget) {
          return {
            status: 400,
            message: "Bulk retention exceeds a Team's remaining purse",
          };
        }
      }

      const retainedAt = new Date();
      await FestivalRetention.bulkCreate(
        assignments.map(({ participantId, teamId, amount }) => ({
          id: crypto.randomUUID(),
          festivalId: festival.id,
          festivalTeamId: teamId,
          festivalParticipantId: participantId,
          amount,
          retainedBy: req.user.id,
          retainedAt,
        })),
        { transaction }
      );
      await FestivalTeamMembership.bulkCreate(
        assignments.map(({ participantId, teamId }) => ({
          id: crypto.randomUUID(),
          festivalId: festival.id,
          festivalParticipantId: participantId,
          festivalTeamId: teamId,
          assignmentMethod: "manual",
          rosterSource: "retention",
          assignedBy: req.user.id,
          assignedAt: retainedAt,
        })),
        { transaction }
      );
      await FestivalAuctionPool.destroy({
        where: {
          festivalId: festival.id,
          festivalParticipantId: participantIds,
          state: "available",
        },
        transaction,
      });
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_retention_updated",
        entityType: "festival_retention",
        details: {
          change: "bulk_created",
          assignments,
        },
        transaction,
      });
      return { created: assignments.length };
    });
    if (!summary) return;
    if (summary.status) return res.status(summary.status).json(summary);
    return res.status(201).json({ success: true, ...summary });
  } catch (error) {
    console.error("Error bulk creating festival retentions:", error);
    return res.status(500).json({ message: "Failed to bulk create retentions" });
  }
};

export const deleteFestivalRetention = async (req, res) => {
  try {
    const deleted = await sequelize.transaction(async (transaction) => {
      const festival = await loadFestival(
        req.params.festivalId,
        res,
        transaction
      );
      if (!festival) return null;
      if (!requireAuctionRosterMode(festival, res, "Retention")) {
        return null;
      }
      const config = await loadSetupConfig(festival.id, res, transaction);
      if (!config) return null;

      const retention = await FestivalRetention.findOne({
        where: { id: req.params.id, festivalId: festival.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!retention) {
        res.status(404).json({
          success: false,
          message: "Festival retention not found",
        });
        return null;
      }
      await FestivalTeamMembership.destroy({
        where: {
          festivalId: festival.id,
          festivalParticipantId: retention.festivalParticipantId,
          festivalTeamId: retention.festivalTeamId,
          rosterSource: "retention",
        },
        transaction,
      });
      await retention.destroy({ transaction });
      const auctionConfig = await FestivalAuctionConfig.findOne({
        where: { festivalId: festival.id },
        attributes: ["auctionStatus"],
        transaction,
      });
      if (auctionConfig && auctionConfig.auctionStatus !== "setup") {
        await FestivalAuctionPool.findOrCreate({
          where: {
            festivalId: festival.id,
            festivalParticipantId: retention.festivalParticipantId,
          },
          defaults: {
            id: crypto.randomUUID(),
            state: "available",
            reauctionCount: 0,
            generatedAt: new Date(),
          },
          transaction,
        });
      }
      await createFestivalAudit({
        festivalId: festival.id,
        actorUserId: req.user.id,
        action: "festival_retention_updated",
        entityType: "festival_retention",
        entityId: retention.id,
        details: {
          change: "deleted",
          festivalTeamId: retention.festivalTeamId,
          festivalParticipantId: retention.festivalParticipantId,
          amount: toMoney(retention.amount),
        },
        transaction,
      });
      return retention.id;
    });
    if (!deleted) return;
    return res.status(200).json({ success: true, deletedRetentionId: deleted });
  } catch (error) {
    console.error("Error deleting festival retention:", error);
    return res.status(500).json({ message: "Failed to delete retention" });
  }
};

export const getFestivalRetentions = async (req, res) => {
  try {
    const festival = await loadFestival(req.params.festivalId, res);
    if (!festival) return;
    const { search, teamId } = req.query;
    const [config, retentions, soldResultCount] = await Promise.all([
      FestivalAuctionConfig.findOne({ where: { festivalId: festival.id } }),
      FestivalRetention.findAll({
        where: {
          festivalId: festival.id,
          ...(teamId ? { festivalTeamId: teamId } : {}),
        },
        include: [
          { model: FestivalTeam, as: "team" },
          {
            ...participantInclude,
            include: participantInclude.include.map((include) =>
              include.as === "employee" && search
                ? {
                    ...include,
                    where: {
                      [Op.or]: [
                        { employeeNumber: { [Op.like]: `%${search}%` } },
                        { name: { [Op.like]: `%${search}%` } },
                        { department: { [Op.like]: `%${search}%` } },
                        { gender: { [Op.like]: `%${search}%` } },
                      ],
                    },
                  }
                : include
            ),
          },
        ],
        order: [["retainedAt", "ASC"]],
      }),
      FestivalAuctionResult.count({
        where: { festivalId: festival.id, outcome: "sold" },
      }),
    ]);
    const budgets = await calculateTeamBudgets(festival.id, config);
    return res.status(200).json({
      data: retentions.map(toRetentionResponse),
      config: toAuctionConfigResponse(config),
      budgetReadOnly: soldResultCount > 0,
      budgets,
      meta: { count: retentions.length },
    });
  } catch (error) {
    console.error("Error fetching festival retentions:", error);
    return res.status(500).json({ message: "Failed to fetch retentions" });
  }
};

export const getFestivalAuctionPool = async (req, res) => {
  try {
    const festival = await loadFestival(req.params.festivalId, res);
    if (!festival) return;
    if (!(await requireAdminOrOwner(req, festival.id, res))) return;

    const config = await FestivalAuctionConfig.findOne({
      where: { festivalId: festival.id },
    });
    const soldResultCount = await FestivalAuctionResult.count({
      where: { festivalId: festival.id, outcome: "sold" },
    });

    if (!config || config.auctionStatus === "setup") {
      await sequelize.transaction(async (transaction) => {
        const participants = await FestivalParticipant.findAll({
          where: { festivalId: festival.id, status: "registered" },
          include: [
            {
              model: FestivalTeamMembership,
              as: "teamMembership",
              required: false,
            },
          ],
          transaction,
        });
        const existing = await FestivalAuctionPool.findAll({
          where: { festivalId: festival.id },
          transaction,
        });
        const existingIds = new Set(
          existing.map(({ festivalParticipantId }) => festivalParticipantId)
        );
        const missing = participants.filter(
          (participant) =>
            !participant.teamMembership && !existingIds.has(participant.id)
        );
        if (missing.length) {
          await FestivalAuctionPool.bulkCreate(
            missing.map((participant) => ({
              id: crypto.randomUUID(),
              festivalId: festival.id,
              festivalParticipantId: participant.id,
              state: "available",
              reauctionCount: 0,
              generatedAt: new Date(),
            })),
            { transaction }
          );
        }
      });
    }

    const { search, sportId, state = "available" } = req.query;
    const poolEntries = await FestivalAuctionPool.findAll({
      where: { festivalId: festival.id, ...(state ? { state } : {}) },
      include: [
        {
          model: FestivalParticipant,
          as: "participant",
          required: true,
          where: { status: "registered" },
          include: [
            {
              model: Employee,
              as: "employee",
              where: search
                ? {
                    [Op.or]: [
                      { employeeNumber: { [Op.like]: `%${search}%` } },
                      { name: { [Op.like]: `%${search}%` } },
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
        },
      ],
      order: [["updatedAt", "DESC"]],
    });
    const budgets = await calculateTeamBudgets(festival.id, config);
    return res.status(200).json({
      data: poolEntries.map((entry) => ({
        ...toFestivalParticipantResponse(entry.participant),
        sportCount: entry.participant.sportRegistrations?.length || 0,
        poolState: entry.state,
        reauctionCount: Number(entry.reauctionCount || 0),
      })),
      config: toAuctionConfigResponse(config),
      budgetReadOnly: soldResultCount > 0,
      budgets,
      meta: {
        count: poolEntries.length,
        state,
      },
    });
  } catch (error) {
    console.error("Error generating festival auction pool:", error);
    return res.status(500).json({ message: "Failed to generate auction pool" });
  }
};
