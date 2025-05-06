import express from "express";
import {
  getCurrentPlayerInAuction,
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

export default router;
