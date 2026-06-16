import express from "express";
import {
  assignSportTeamCaptain,
  createSportTournament,
  getSportTeams,
  getSportTournament,
  getSportTournamentEligibilityController,
  getSportTournamentOwnerContexts,
  getSportTournamentReadinessController,
  listSportTournaments,
  removeSportTeamCaptain,
  updateSportTeam,
  updateSportTournament,
} from "../controllers/sportTournament.controller.js";
import {
  distributeSportTeamBudgets,
  generateSportTournamentPool,
  getSportTeamBudgets,
  getSportTournamentPool,
  updateSportTeamBudgets,
} from "../controllers/sportAuctionPreparation.controller.js";
import {
  completeSportAuction,
  extendSportAuction,
  getSportAuctionCurrent,
  getSportAuctionHistory,
  markSportAuctionParticipantUnsold,
  pauseSportAuction,
  placeSportAuctionBid,
  reauctionSportParticipants,
  resumeSportAuction,
  sellSportAuctionParticipant,
  startSportAuction,
  startSportAuctionParticipant,
  updateSportAuctionConfig,
} from "../controllers/sportLiveAuction.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  assignSportTeamCaptainSchema,
  createSportTournamentSchema,
  distributeSportTeamBudgetsSchema,
  sportTeamIdSchema,
  sportTournamentIdSchema,
  updateSportTeamSchema,
  updateSportTeamBudgetsSchema,
  updateSportAuctionConfigSchema,
  sportAuctionLifecycleSchema,
  sportAuctionParticipantSchema,
  startSportAuctionParticipantSchema,
  sportAuctionBidSchema,
  sportAuctionReauctionSchema,
  updateSportTournamentSchema,
} from "../validation/sportTournament.validation.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/sport-tournaments", listSportTournaments);
router.get("/sport-tournaments/owner-contexts", getSportTournamentOwnerContexts);
router.post(
  "/festivals/:festivalId/teams/:festivalTeamId/sport-tournaments",
  validate(createSportTournamentSchema),
  createSportTournament
);
router.get(
  "/sport-tournaments/:sportTournamentId",
  validate(sportTournamentIdSchema),
  getSportTournament
);
router.patch(
  "/sport-tournaments/:sportTournamentId",
  validate(updateSportTournamentSchema),
  updateSportTournament
);
router.get(
  "/sport-tournaments/:sportTournamentId/teams",
  validate(sportTournamentIdSchema),
  getSportTeams
);
router.patch(
  "/sport-tournaments/:sportTournamentId/teams/:sportTeamId",
  validate(updateSportTeamSchema),
  updateSportTeam
);
router.post(
  "/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain",
  validate(assignSportTeamCaptainSchema),
  assignSportTeamCaptain
);
router.delete(
  "/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain",
  validate(sportTeamIdSchema),
  removeSportTeamCaptain
);
router.get(
  "/sport-tournaments/:sportTournamentId/eligibility",
  validate(sportTournamentIdSchema),
  getSportTournamentEligibilityController
);
router.get(
  "/sport-tournaments/:sportTournamentId/readiness",
  validate(sportTournamentIdSchema),
  getSportTournamentReadinessController
);
router.get(
  "/sport-tournaments/:sportTournamentId/budgets",
  validate(sportTournamentIdSchema),
  getSportTeamBudgets
);
router.post(
  "/sport-tournaments/:sportTournamentId/budgets/equal-distribution",
  validate(distributeSportTeamBudgetsSchema),
  distributeSportTeamBudgets
);
router.put(
  "/sport-tournaments/:sportTournamentId/budgets",
  validate(updateSportTeamBudgetsSchema),
  updateSportTeamBudgets
);
router.get(
  "/sport-tournaments/:sportTournamentId/pool",
  validate(sportTournamentIdSchema),
  getSportTournamentPool
);
router.post(
  "/sport-tournaments/:sportTournamentId/pool/generate",
  validate(sportTournamentIdSchema),
  generateSportTournamentPool
);
router.patch(
  "/sport-tournaments/:sportTournamentId/auction/config",
  validate(updateSportAuctionConfigSchema),
  updateSportAuctionConfig
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/start",
  validate(sportAuctionLifecycleSchema),
  startSportAuction
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/pause",
  validate(sportAuctionLifecycleSchema),
  pauseSportAuction
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/resume",
  validate(sportAuctionLifecycleSchema),
  resumeSportAuction
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/extend",
  validate(sportAuctionLifecycleSchema),
  extendSportAuction
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/complete",
  validate(sportAuctionLifecycleSchema),
  completeSportAuction
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/participants/:participantId/start",
  validate(startSportAuctionParticipantSchema),
  startSportAuctionParticipant
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/participants/:participantId/sell",
  validate(sportAuctionParticipantSchema),
  sellSportAuctionParticipant
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/participants/:participantId/unsold",
  validate(sportAuctionParticipantSchema),
  markSportAuctionParticipantUnsold
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/reauction",
  validate(sportAuctionReauctionSchema),
  reauctionSportParticipants
);
router.post(
  "/sport-tournaments/:sportTournamentId/auction/bid",
  validate(sportAuctionBidSchema),
  placeSportAuctionBid
);
router.get(
  "/sport-tournaments/:sportTournamentId/auction/current",
  validate(sportTournamentIdSchema),
  getSportAuctionCurrent
);
router.get(
  "/sport-tournaments/:sportTournamentId/auction/history",
  validate(sportTournamentIdSchema),
  getSportAuctionHistory
);

export default router;
