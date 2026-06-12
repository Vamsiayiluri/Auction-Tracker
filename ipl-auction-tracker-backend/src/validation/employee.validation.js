import { z } from "zod";
import { idSchema, nonEmptyString } from "./common.validation.js";

const employeeNumberSchema = nonEmptyString("Employee number")
  .max(80, "Employee number must be at most 80 characters")
  .transform((value) => value.toUpperCase());

const optionalText = (fieldName, maxLength) =>
  z
    .union([
      nonEmptyString(fieldName).max(
        maxLength,
        `${fieldName} must be at most ${maxLength} characters`
      ),
      z.literal(null),
      z.literal(""),
    ])
    .optional()
    .transform((value) => (value === "" ? null : value));

const optionalEmail = z
  .union([
    z.string().trim().email("Email must be valid").max(255),
    z.literal(null),
    z.literal(""),
  ])
  .optional()
  .transform((value) =>
    value === "" || value === null ? null : value?.toLowerCase()
  );

const employeeBody = {
  employeeNumber: employeeNumberSchema,
  name: nonEmptyString("Employee name").max(
    160,
    "Employee name must be at most 160 characters"
  ),
  email: optionalEmail,
  department: optionalText("Department", 160),
  employmentStatus: z.enum(["active", "inactive"]).optional(),
};

export const createEmployeeSchema = z.object({
  body: z.object(employeeBody),
});

export const updateEmployeeSchema = z.object({
  params: z.object({ employeeId: idSchema("Employee ID") }),
  body: z
    .object({
      employeeNumber: employeeNumberSchema.optional(),
      name: employeeBody.name.optional(),
      email: optionalEmail,
      department: optionalText("Department", 160),
      employmentStatus: z.enum(["active", "inactive"]).optional(),
      identityStatus: z
        .enum(["verified", "provisional", "needs_review"])
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one employee field is required",
    }),
});

export const employeeIdSchema = z.object({
  params: z.object({ employeeId: idSchema("Employee ID") }),
});

export const linkEmployeeUserSchema = z.object({
  params: z.object({ employeeId: idSchema("Employee ID") }),
  body: z.object({ userId: idSchema("User ID") }),
});

export const listEmployeesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().max(160).optional(),
    employmentStatus: z.enum(["active", "inactive"]).optional(),
    identityStatus: z
      .enum(["verified", "provisional", "needs_review"])
      .optional(),
  }),
});

export const employeeImportSchema = z.object({
  body: z.object({}).passthrough(),
});
