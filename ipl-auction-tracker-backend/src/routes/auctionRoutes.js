import express from "express";
import {
  extendAuction,
  getCurrentPlayerInAuction,
  markUnsold,
  sellPlayer,
  startAuction,
  stopAuction,
} from "../controllers/auction.controller.js";
import {
  authMiddleware,
  adminMiddleware,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  playerAuctionActionSchema,
  startAuctionSchema,
} from "../validation/auction.validation.js";

const router = express.Router();

router.post(
  "/start/:playerId",
  authMiddleware,
  adminMiddleware,
  validate(startAuctionSchema),
  startAuction
);
router.get("/currentPlayer", getCurrentPlayerInAuction);

router.post(
  "/stop/:playerId",
  authMiddleware,
  adminMiddleware,
  validate(playerAuctionActionSchema),
  stopAuction
);
router.post(
  "/extend/:playerId",
  authMiddleware,
  adminMiddleware,
  validate(playerAuctionActionSchema),
  extendAuction
);
router.post(
  "/sell/:playerId",
  authMiddleware,
  adminMiddleware,
  validate(playerAuctionActionSchema),
  sellPlayer
);
router.post(
  "/unsold/:playerId",
  authMiddleware,
  adminMiddleware,
  validate(playerAuctionActionSchema),
  markUnsold
);

export default router;
