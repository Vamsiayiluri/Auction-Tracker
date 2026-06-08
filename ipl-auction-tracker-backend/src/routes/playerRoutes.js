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
import { validate } from "../middleware/validate.middleware.js";
import { createPlayerSchema } from "../validation/player.validation.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  validate(createPlayerSchema),
  createPlayer
);

router.get("/", getPlayers);
router.get("/playerBids/:tournamentId", getPlayersWithBidsByTournamentId);

export default router;
