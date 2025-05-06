import express from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateStatus,
} from "../controllers/tournment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", createTournament);
router.patch("/:id/status", updateStatus);
router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);

export default router;
