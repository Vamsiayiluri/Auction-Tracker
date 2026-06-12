import { z } from "zod";
import { idSchema, nonEmptyString } from "./common.validation.js";

const emailSchema = z
  .string({
    required_error: "Email is required",
    invalid_type_error: "Email must be a string",
  })
  .trim()
  .email("Email must be valid")
  .toLowerCase();

const passwordSchema = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  body: z
    .object({
      id: idSchema("User ID"),
      name: nonEmptyString("Name"),
      email: emailSchema,
      password: passwordSchema,
      role: z.literal("spectator", {
        required_error: "Role is required",
        invalid_type_error: "Role is invalid",
      }),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    }),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: nonEmptyString("Reset token"),
    password: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    password: passwordSchema,
  }),
});
