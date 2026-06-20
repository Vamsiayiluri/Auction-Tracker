import express from "express";
import {
  exportFestivalTeamsToExcel,
  exportSportTournamentTeamsToExcel,
} from "../controllers/teamExport.controller.js";
import {
  authMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/festivals/:festivalId/export/excel",
  exportFestivalTeamsToExcel
);
router.get(
  "/sport-tournaments/:id/export/excel",
  exportSportTournamentTeamsToExcel
);

export default router;
