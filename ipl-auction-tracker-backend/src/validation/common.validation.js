import { z } from "zod";
import { TOURNAMENT_STATUSES } from "../utils/tournamentStatus.js";
import {
  CRICKET_PLAYER_ROLES,
  CRICKET_SPORT_ID,
  SPORT_IDS,
} from "../utils/sports.js";

export const nonEmptyString = (fieldName) =>
  z
    .string({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a string`,
    })
    .trim()
    .min(1, `${fieldName} is required`);

export const idSchema = (fieldName = "ID") => nonEmptyString(fieldName);

export const positiveNumber = (fieldName) =>
  z.coerce
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .finite(`${fieldName} must be a finite number`)
    .positive(`${fieldName} must be greater than zero`);

export const playerRoleSchema = z.enum(
  CRICKET_PLAYER_ROLES,
  {
    required_error: "Player role is required",
    invalid_type_error: "Player role is invalid",
  }
);

export const optionalPlayerRoleSchema = z
  .union([playerRoleSchema, z.literal(null), z.literal("")])
  .optional()
  .transform((role) => (role === "" ? null : role));

export const sportIdSchema = z.enum(SPORT_IDS, {
  required_error: "Sport is required",
  invalid_type_error: "Sport is invalid",
});

export const validateSportRole = (payload, context, rolePath = ["role"]) => {
  if (payload.sportId === CRICKET_SPORT_ID && !payload.role) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: rolePath,
      message: "Player role is required for cricket",
    });
  }
};

export const tournamentStatusSchema = z.enum(
  TOURNAMENT_STATUSES,
  {
    required_error: "Tournament status is required",
    invalid_type_error: "Tournament status is invalid",
  }
);

export const normalizePayload = (payload) => {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.keys(payload).length === 1
  ) {
    const [onlyKey] = Object.keys(payload);
    if (typeof onlyKey === "string" && onlyKey.trim().startsWith("{")) {
      try {
        return JSON.parse(onlyKey);
      } catch {
        return payload;
      }
    }
  }

  return payload;
};

export const formatZodErrors = (issues = []) =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
