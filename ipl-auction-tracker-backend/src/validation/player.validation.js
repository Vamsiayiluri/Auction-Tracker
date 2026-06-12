import { z } from "zod";
import {
  idSchema,
  nonEmptyString,
  optionalPlayerRoleSchema,
  positiveNumber,
  sportIdSchema,
  validateSportRole,
} from "./common.validation.js";

export const createPlayerSchema = z.object({
  body: z
    .object({
      id: idSchema("Player ID").optional(),
      name: nonEmptyString("Player name"),
      sportId: sportIdSchema,
      role: optionalPlayerRoleSchema,
      basePrice: positiveNumber("Base price"),
      tournamentId: idSchema("Tournament ID"),
    })
    .superRefine((body, context) => validateSportRole(body, context)),
});
