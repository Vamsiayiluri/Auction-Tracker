import { z } from "zod";
import { idSchema } from "./common.validation.js";

const optionalTournamentQuery = z.object({
  tournamentId: idSchema("Tournament ID").optional(),
});

export const listTeamsSchema = z.object({
  query: optionalTournamentQuery,
});

export const ownerScopedTeamSchema = z.object({
  params: z.object({
    id: idSchema("Owner ID"),
  }),
  query: optionalTournamentQuery,
});

