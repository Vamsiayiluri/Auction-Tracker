import express from "express";
import {
  getTeams,
  getTeamByOwner,
  getTeamAndPlayersbyOwnerId,
  getAllTeamsWithPlayers,
} from "../controllers/team.controller.js";
import {
  authMiddleware,
  adminMiddleware,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  listTeamsSchema,
  ownerScopedTeamSchema,
} from "../validation/team.validation.js";

const router = express.Router();

router.get("/", authMiddleware, validate(listTeamsSchema), getTeams);
router.get(
  "/getTeamByid/:id",
  authMiddleware,
  validate(ownerScopedTeamSchema),
  getTeamByOwner
);
router.get(
  "/getTeamAndPlayers/:id",
  authMiddleware,
  validate(ownerScopedTeamSchema),
  getTeamAndPlayersbyOwnerId
);
router.get(
  "/getAllteamsAndPlayers",
  authMiddleware,
  adminMiddleware,
  getAllTeamsWithPlayers
);

export default router;
