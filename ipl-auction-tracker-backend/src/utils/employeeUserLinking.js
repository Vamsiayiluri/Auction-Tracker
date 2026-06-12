import crypto from "crypto";
import { col, fn, where } from "sequelize";
import {
  Employee,
  EmployeeUserLinkAudit,
  FestivalParticipant,
  FestivalTeamOwner,
} from "../models/index.js";

export const normalizeIdentityEmail = (email) =>
  String(email || "").trim().toLowerCase();

const audit = ({
  userId,
  employeeId = null,
  normalizedEmail,
  source,
  outcome,
  details = null,
  transaction,
}) =>
  EmployeeUserLinkAudit.create(
    {
      id: crypto.randomUUID(),
      userId,
      employeeId,
      normalizedEmail,
      source,
      outcome,
      details,
    },
    { transaction }
  );

export const activateEmployeeOwnerAssignments = async (
  employeeId,
  userRole,
  transaction
) => {
  const employee = await Employee.findByPk(employeeId, { transaction });
  if (!employee) return;
  const participants = await FestivalParticipant.findAll({
    where: { employeeId, status: "registered" },
    attributes: ["id"],
    transaction,
  });
  const participantIds = participants.map(({ id }) => id);
  if (!participantIds.length) return;

  await FestivalTeamOwner.update(
    {
      status:
        employee.employmentStatus !== "active"
          ? "inactive"
          : !employee.userId
            ? "pending_user_registration"
            : userRole === "team_owner"
              ? "active"
              : "inactive",
    },
    {
      where: { festivalParticipantId: participantIds },
      transaction,
    }
  );
};

export const autoLinkEmployeeForUser = async ({
  user,
  source = "registration",
  transaction,
}) => {
  const normalizedEmail = normalizeIdentityEmail(user.email);
  const existingUserLink = await Employee.findOne({
    where: { userId: user.id },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
  if (existingUserLink) {
    await audit({
      userId: user.id,
      employeeId: existingUserLink.id,
      normalizedEmail,
      source,
      outcome: "user_already_linked",
      transaction,
    });
    return { outcome: "user_already_linked", employee: existingUserLink };
  }

  const matches = await Employee.findAll({
    where: where(fn("LOWER", col("email")), normalizedEmail),
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
  if (matches.length === 0) {
    await audit({
      userId: user.id,
      normalizedEmail,
      source,
      outcome: "no_match",
      transaction,
    });
    return { outcome: "no_match", employee: null };
  }
  if (matches.length > 1) {
    await audit({
      userId: user.id,
      normalizedEmail,
      source,
      outcome: "duplicate_email",
      details: { employeeIds: matches.map(({ id }) => id) },
      transaction,
    });
    return { outcome: "duplicate_email", employee: null };
  }

  const employee = matches[0];
  if (employee.userId && employee.userId !== user.id) {
    await audit({
      userId: user.id,
      employeeId: employee.id,
      normalizedEmail,
      source,
      outcome: "employee_already_linked",
      details: { existingUserId: employee.userId },
      transaction,
    });
    return { outcome: "employee_already_linked", employee: null };
  }

  if (!employee.userId) {
    await employee.update({ userId: user.id }, { transaction });
  }
  await activateEmployeeOwnerAssignments(employee.id, user.role, transaction);
  await audit({
    userId: user.id,
    employeeId: employee.id,
    normalizedEmail,
    source,
    outcome: "linked",
    transaction,
  });
  return { outcome: "linked", employee };
};

export const linkEmployeeToUser = async ({
  employee,
  user,
  transaction,
}) => {
  const normalizedEmail = normalizeIdentityEmail(user.email);
  const linkedEmployee = await Employee.findOne({
    where: { userId: user.id },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
  if (employee.userId && employee.userId !== user.id) {
    await audit({
      userId: user.id,
      employeeId: employee.id,
      normalizedEmail,
      source: "admin_manual",
      outcome: "employee_already_linked",
      details: { existingUserId: employee.userId },
      transaction,
    });
    return { outcome: "employee_already_linked" };
  }
  if (linkedEmployee && linkedEmployee.id !== employee.id) {
    await audit({
      userId: user.id,
      employeeId: employee.id,
      normalizedEmail,
      source: "admin_manual",
      outcome: "user_already_linked",
      details: { linkedEmployeeId: linkedEmployee.id },
      transaction,
    });
    return { outcome: "user_already_linked" };
  }

  if (!employee.userId) {
    await employee.update({ userId: user.id }, { transaction });
  }
  await activateEmployeeOwnerAssignments(
    employee.id,
    user.role,
    transaction
  );
  await audit({
    userId: user.id,
    employeeId: employee.id,
    normalizedEmail,
    source: "admin_manual",
    outcome: "linked",
    transaction,
  });
  return { outcome: "linked" };
};
