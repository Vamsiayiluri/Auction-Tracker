import { z } from "zod";
import {
  idSchema,
  nonEmptyString,
  playerRoleSchema,
  positiveNumber,
  tournamentStatusSchema,
} from "./common.validation.js";

const tournamentPlayerSchema = z.object({
  id: idSchema("Player ID"),
  name: nonEmptyString("Player name"),
  role: playerRoleSchema,
  basePrice: positiveNumber("Base price"),
});

export const createTournamentSchema = z.object({
  body: z.object({
    id: idSchema("Tournament ID"),
    name: nonEmptyString("Tournament name"),
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
  }),
});

export const updateTournamentStatusSchema = z.object({
  params: z.object({
    id: idSchema("Tournament ID"),
  }),
  body: z.object({
    status: tournamentStatusSchema,
  }),
});
