import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getFestivalBidProgression } from "../src/utils/festivalBidProgression.js";
import {
  sportAuctionBidSchema,
  startSportAuctionParticipantSchema,
  updateSportAuctionConfigSchema,
} from "../src/validation/sportTournament.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const backend = (path) => readFile(resolve(__dirname, "..", path), "utf8");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4C reuses fixed-base percentage bid progression", () => {
  const progression = getFestivalBidProgression({
    basePrice: 100,
    currentBid: 160,
    incrementPercentage: 20,
  });
  assert.equal(progression.incrementAmount, 20);
  assert.equal(progression.nextBid, 180);
});

test("Phase 4C uses base credits as the first accepted bid", () => {
  const opening = getFestivalBidProgression({
    basePrice: 100,
    incrementPercentage: 20,
  });
  assert.equal(opening.currentBid, 0);
  assert.equal(opening.nextBid, 100);
});

test("Phase 4C validates configuration, participant starts, and stale bid contracts", () => {
  assert.equal(updateSportAuctionConfigSchema.safeParse({
    params: { sportTournamentId: "tournament-1" },
    body: {
      timerDurationSeconds: 20,
      incrementPercentage: 20,
      reauctionEnabled: true,
    },
  }).success, true);
  assert.equal(startSportAuctionParticipantSchema.safeParse({
    params: {
      sportTournamentId: "tournament-1",
      participantId: "participant-1",
    },
    body: { baseCredits: 100 },
  }).success, true);
  assert.equal(sportAuctionBidSchema.safeParse({
    params: { sportTournamentId: "tournament-1" },
    body: {
      auctionId: "auction-1",
      expectedCurrentBid: 0,
    },
  }).success, true);
  assert.equal(sportAuctionBidSchema.safeParse({
    params: { sportTournamentId: "tournament-1" },
    body: {
      auctionId: "auction-1",
      expectedCurrentBid: 100,
      amount: 999,
    },
  }).success, false);
});

test("Phase 4C migration adds only Sport Auction engine tables", async () => {
  const migration = await backend(
    "migrations/202606140004-sport-auction-engine.js"
  );
  for (const table of [
    "SportAuctionConfigs",
    "SportAuctions",
    "SportAuctionBids",
    "SportAuctionResults",
    "SportOperationAudits",
  ]) {
    assert.match(migration, new RegExp(`createTable\\("${table}"`));
  }
  assert.match(migration, /reauctionCount/);
  assert.match(migration, /sport_auction_bids_auction_amount_uq/);
  assert.doesNotMatch(
    migration,
    /createTable\("(?:Fixtures|Matches|Standings|PointsTables|Finals)"/
  );
});

test("Phase 4C engine derives captain identity and uses transactional stale-bid protection", async () => {
  const [controller, authorization, budget] = await Promise.all([
    backend("src/controllers/sportLiveAuction.controller.js"),
    backend("src/utils/sportTournamentAuthorization.js"),
    backend("src/utils/sportTeamBudget.js"),
  ]);
  assert.match(controller, /findActiveSportCaptainForUser/);
  assert.match(controller, /expectedCurrentBid/);
  assert.match(controller, /transaction\.LOCK\.UPDATE/);
  assert.match(controller, /Your Team already holds the highest bid/);
  assert.match(controller, /remainingCredits/);
  assert.match(controller, /createFestivalAuctionDeadline/);
  assert.match(controller, /getFestivalBidProgression/);
  assert.match(controller, /finalCredits: outcome === "sold" \? lead\.amount/);
  assert.match(authorization, /SportTeamCaptain/);
  assert.match(authorization, /status: "active"/);
  assert.match(budget, /SportAuctionResult/);
  assert.match(budget, /result\.finalCredits/);
  assert.match(budget, /totalRemainingCredits/);
});

test("Phase 4C exposes full lifecycle APIs without competition APIs", async () => {
  const routes = await backend("src/routes/sportTournamentRoutes.js");
  for (const action of [
    "start",
    "pause",
    "resume",
    "extend",
    "complete",
    "bid",
    "reauction",
    "current",
    "history",
  ]) {
    assert.match(routes, new RegExp(`auction/${action}`));
  }
  assert.match(routes, /participants\/:participantId\/sell/);
  assert.match(routes, /participants\/:participantId\/unsold/);
  assert.doesNotMatch(routes, /fixtures|matches|standings|semi-finals|finals/);
});

test("Phase 4C arena keeps owner controls and captain bidding role-specific", async () => {
  const [app, arena, controls, controlCenter, socketServer] = await Promise.all([
    frontend("src/App.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportRoleControls.jsx"),
    frontend("src/components/SportTournamentControlCenter.jsx"),
    backend("src/index.js"),
  ]);
  assert.match(app, /sport-tournaments\/:sportTournamentId\/auction/);
  assert.match(controls, /Place Bid/);
  assert.match(arena, /expectedCurrentBid/);
  assert.match(arena, /canManage/);
  assert.match(arena, /canBid/);
  assert.doesNotMatch(`${arena}\n${controls}`, /label="Bid Amount"/);
  assert.match(controlCenter, /Open Sport Auction Arena/);
  assert.match(controls, /Start Auction/);
  assert.match(socketServer, /join-sport-auction/);
  assert.match(socketServer, /restoreSportAuctionTimers/);
});
