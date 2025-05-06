import express from "express";
import {
  getTeams,
  getTeamByOwner,
  getTeamAndPlayersbyOwnerId,
  getAllTeamsWithPlayers,
} from "../controllers/team.controller.js";
import {
  authMiddleware,
  teamOwnerMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getTeams);
router.get("/getTeamByid/:id", getTeamByOwner);
router.get("/getTeamAndPlayers/:id", getTeamAndPlayersbyOwnerId);
router.get("/getAllteamsAndPlayers", getAllTeamsWithPlayers);

export default router;
