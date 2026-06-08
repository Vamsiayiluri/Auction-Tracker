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
import { validate } from "../middleware/validate.middleware.js";
import {
  createTournamentSchema,
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
router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);

export default router;
