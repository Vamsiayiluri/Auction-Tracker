import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const startAuctionSchema = z.object({
  params: z.object({
    playerId: idSchema("Player ID"),
  }),
  body: z.object({
    auctionId: idSchema("Auction ID"),
    tournamentId: idSchema("Tournament ID").optional(),
  }),
});

export const playerAuctionActionSchema = z.object({
  params: z.object({
    playerId: idSchema("Player ID"),
  }),
});
