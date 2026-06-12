import { z } from "zod";
import {
  idSchema,
  nonEmptyString,
  optionalPlayerRoleSchema,
  positiveNumber,
  sportIdSchema,
  tournamentStatusSchema,
  validateSportRole,
} from "./common.validation.js";

const tournamentPlayerSchema = z
  .object({
    id: idSchema("Player ID"),
    name: nonEmptyString("Player name"),
    sportId: sportIdSchema,
    role: optionalPlayerRoleSchema,
    basePrice: positiveNumber("Base price"),
  })
  .superRefine((player, context) => validateSportRole(player, context));

const validateTournamentPlayerSports = (body, context) => {
  if (!body.players) return;

  body.players.forEach((player, index) => {
    if (body.sportId && player.sportId !== body.sportId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players", index, "sportId"],
        message: "Player sport must match tournament sport",
      });
    }
  });
};

export const createTournamentSchema = z.object({
  body: z
    .object({
      id: idSchema("Tournament ID"),
      name: nonEmptyString("Tournament name"),
      sportId: sportIdSchema,
      budget: positiveNumber("Budget"),
      teams: z
        .array(nonEmptyString("Team name"), {
          required_error: "Teams are required",
          invalid_type_error: "Teams must be an array",
        })
        .min(1, "At least one team is required"),
      players: z
        .array(tournamentPlayerSchema, {
          required_error: "Players are required",
          invalid_type_error: "Players must be an array",
        })
        .min(1, "At least one player is required"),
    })
    .superRefine(validateTournamentPlayerSports),
});

export const updateTournamentStatusSchema = z.object({
  params: z.object({
    id: idSchema("Tournament ID"),
  }),
  body: z.object({
    status: tournamentStatusSchema,
  }),
});

export const updateTournamentSchema = z
  .object({
    params: z.object({
      id: idSchema("Tournament ID"),
    }),
    body: z.object({
      name: nonEmptyString("Tournament name").optional(),
      sportId: sportIdSchema.optional(),
      budget: positiveNumber("Budget").optional(),
      teams: z
        .array(nonEmptyString("Team name"), {
          invalid_type_error: "Teams must be an array",
        })
        .min(1, "At least one team is required")
        .optional(),
      players: z
        .array(tournamentPlayerSchema, {
          invalid_type_error: "Players must be an array",
        })
        .min(1, "At least one player is required")
        .optional(),
    }),
  })
  .refine(
    ({ body }) =>
      body.name !== undefined ||
      body.sportId !== undefined ||
      body.budget !== undefined ||
      body.teams !== undefined ||
      body.players !== undefined,
    {
      path: ["body"],
      message: "At least one tournament field is required",
    }
  )
  .superRefine(({ body }, context) => validateTournamentPlayerSports(body, context));

export const archiveTournamentSchema = z.object({
  params: z.object({
    id: idSchema("Tournament ID"),
  }),
});
