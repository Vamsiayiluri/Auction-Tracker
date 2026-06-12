import express from "express";
import {
  archiveTournament,
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  updateStatus,
} from "../controllers/tournment.controller.js";
import {
  adminMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  archiveTournamentSchema,
  createTournamentSchema,
  updateTournamentSchema,
  updateTournamentStatusSchema,
} from "../validation/tournament.validation.js";

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  adminMiddleware,
  validate(createTournamentSchema),
  createTournament
);
router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  validate(updateTournamentStatusSchema),
  updateStatus
);
router.patch(
  "/:id/archive",
  authMiddleware,
  adminMiddleware,
  validate(archiveTournamentSchema),
  archiveTournament
);
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(updateTournamentSchema),
  updateTournament
);
router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);

export default router;
