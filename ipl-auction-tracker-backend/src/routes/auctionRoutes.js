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

const router = express.Router();

router.post("/start/:playerId", authMiddleware, adminMiddleware, startAuction);
router.get("/currentPlayer", getCurrentPlayerInAuction);

router.post("/stop/:playerId", authMiddleware, adminMiddleware, stopAuction);
router.post("/extend/:playerId", authMiddleware, adminMiddleware, extendAuction);
router.post("/sell/:playerId", authMiddleware, adminMiddleware, sellPlayer);
router.post("/unsold/:playerId", authMiddleware, adminMiddleware, markUnsold);

export default router;
