import { z } from "zod";

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
  ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"],
  {
    required_error: "Player role is required",
    invalid_type_error: "Player role is invalid",
  }
);

export const tournamentStatusSchema = z.enum(
  ["upcoming", "live", "completed"],
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
