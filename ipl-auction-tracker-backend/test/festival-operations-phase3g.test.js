import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getFestivalBidProgression } from "../src/utils/festivalBidProgression.js";
import {
  bulkFestivalRetentionsSchema,
  bulkSportsAssignmentSchema,
  festivalReauctionSchema,
} from "../src/validation/festival.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackend = (path) => readFile(resolve(__dirname, "..", path), "utf8");
const readRepo = (path) => readFile(resolve(repoRoot, path), "utf8");

test("Phase 3G Festival increments remain fixed to the base price", () => {
  const first = getFestivalBidProgression({
    basePrice: 100,
    currentBid: 100,
    incrementPercentage: 20,
  });
  const later = getFestivalBidProgression({
    basePrice: 100,
    currentBid: 180,
    incrementPercentage: 20,
  });
  assert.equal(first.incrementAmount, 20);
  assert.equal(first.nextBid, 120);
  assert.equal(later.incrementAmount, 20);
  assert.equal(later.nextBid, 200);
});

test("Phase 3G validates bulk operations up to operational batch sizes", () => {
  assert.equal(
    festivalReauctionSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { participantIds: ["participant-1", "participant-2"] },
    }).success,
    true
  );
  assert.equal(
    bulkSportsAssignmentSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        participantIds: ["participant-1", "participant-2"],
        sportIds: ["cricket", "chess"],
      },
    }).success,
    true
  );
  assert.equal(
    bulkFestivalRetentionsSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        assignments: [
          {
            participantId: "participant-1",
            teamId: "team-1",
            amount: 100000,
          },
        ],
      },
    }).success,
    true
  );
});

test("Phase 3G migration preserves attempts and pool states", async () => {
  const [migration, auctionModel, poolModel, resultModel] = await Promise.all([
    readBackend(
      "migrations/202606100005-festival-operations-stabilization.js"
    ),
    readBackend("src/models/festivalAuction.model.js"),
    readBackend("src/models/festivalAuctionPool.model.js"),
    readBackend("src/models/festivalAuctionResult.model.js"),
  ]);
  assert.match(migration, /attemptNumber/);
  assert.match(migration, /"available", "sold", "unsold"/);
  assert.match(migration, /FestivalOperationAudits/);
  assert.match(auctionModel, /festival_auctions_participant_attempt_uq/);
  assert.match(poolModel, /reauctionCount/);
  assert.doesNotMatch(
    resultModel,
    /festival_auction_results_festival_participant_uq/
  );
});

test("Phase 3G protects configuration and exposes re-auction actions", async () => {
  const [routes, locking, live] = await Promise.all([
    readBackend("src/routes/festivalRoutes.js"),
    readBackend("src/utils/festivalLocking.js"),
    readBackend("src/controllers/festivalLiveAuction.controller.js"),
  ]);
  assert.match(routes, /auction\/reauction",\s*adminMiddleware/s);
  assert.match(routes, /retentions\/bulk",\s*adminMiddleware/s);
  assert.match(locking, /\["live", "paused", "completed"\]/);
  assert.match(live, /state: "available"/);
  assert.match(live, /auction_participant_reauctioned/);
  assert.match(live, /FestivalOperationAudit\.create/);
});

test("Phase 3G UI includes wizard, readiness, refresh, filters, and unsold actions", async () => {
  const [detail, setup, auction, readiness, wizard, workspace] = await Promise.all([
    readRepo("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readRepo("ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx"),
    readRepo("ipl-auction-tracker/src/components/MainFestivalAuction.jsx"),
    readRepo("ipl-auction-tracker/src/components/FestivalReadiness.jsx"),
    readRepo("ipl-auction-tracker/src/components/FestivalSetupWizard.jsx"),
    readRepo("ipl-auction-tracker/src/utils/festivalWorkspace.js"),
  ]);
  assert.match(detail, /onTeamsChanged/);
  assert.match(detail, /Search participants/);
  assert.match(setup, /operationRevision/);
  assert.match(setup, /Bid Increment Percentage/);
  assert.match(setup, /retentions\/bulk/);
  assert.match(auction, /Re-Auction Selected/);
  assert.match(auction, /Re-Auction All/);
  assert.match(readiness, /Team Readiness Cards/);
  assert.match(workspace, /Review & Launch/);
  assert.match(wizard, /localStorage/);
});

test("Festival creation supports checkbox multi-select for sports and participants", async () => {
  const [detail, routes, controller] = await Promise.all([
    readRepo("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readBackend("src/routes/festivalRoutes.js"),
    readBackend("src/controllers/festival.controller.js"),
  ]);
  assert.match(detail, /selectedSportIds/);
  assert.match(detail, /Add Selected Sports/);
  assert.match(detail, /renderOption=\{\(props, employee, \{ selected \}\)/);
  assert.match(detail, /<Checkbox checked=\{selected\}/);
  assert.match(routes, /sports\/bulk",\s*adminMiddleware/s);
  assert.match(controller, /export const bulkAddFestivalSports/);
  assert.match(controller, /FestivalSport\.bulkCreate/);
});
