import { z } from "zod";
import {
  idSchema,
  nonEmptyString,
  playerRoleSchema,
  positiveNumber,
} from "./common.validation.js";

export const createPlayerSchema = z.object({
  body: z.object({
    id: idSchema("Player ID").optional(),
    name: nonEmptyString("Player name"),
    role: playerRoleSchema,
    basePrice: positiveNumber("Base price"),
    tournamentId: idSchema("Tournament ID"),
  }),
});
