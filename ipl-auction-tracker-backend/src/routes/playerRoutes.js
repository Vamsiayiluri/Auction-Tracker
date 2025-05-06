import express from "express";
import {
  createPlayer,
  getPlayers,
  getPlayersWithBidsByTournamentId,
} from "../controllers/player.controller.js";
import {
  authMiddleware,
  adminMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createPlayer);

router.get("/", getPlayers);
router.get("/playerBids/:tournamentId", getPlayersWithBidsByTournamentId);

export default router;
