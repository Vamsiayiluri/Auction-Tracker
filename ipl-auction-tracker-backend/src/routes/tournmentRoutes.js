import express from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateStatus,
} from "../controllers/tournment.controller.js";
import {
  adminMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, adminMiddleware, createTournament);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateStatus);
router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);

export default router;
