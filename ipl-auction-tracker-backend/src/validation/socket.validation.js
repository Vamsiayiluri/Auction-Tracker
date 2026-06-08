import { z } from "zod";
import { idSchema, positiveNumber } from "./common.validation.js";

export const placeBidSocketSchema = z.object({
  id: idSchema("Bid ID"),
  playerId: idSchema("Player ID"),
  tournamentId: idSchema("Tournament ID"),
  bidAmount: positiveNumber("Bid amount"),
});
