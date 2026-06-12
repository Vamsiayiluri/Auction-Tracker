import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBidIncrement,
  getNextMinimumBid,
} from "../src/utils/bidRules.js";
import { getFestivalBidProgression } from "../src/utils/festivalBidProgression.js";
import {
  createFestivalAuctionDeadline,
  getFestivalAuctionRemainingMs,
} from "../src/utils/festivalAuctionTimer.js";
import {
  festivalAuctionBidSchema,
  festivalAuctionStartParticipantSchema,
} from "../src/validation/festival.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (path) =>
  readFile(resolve(__dirname, "..", path), "utf8");
const readRepoFile = (path) => readFile(resolve(repoRoot, path), "utf8");

test("Tournament bid increments remain unchanged", () => {
  assert.equal(getBidIncrement(100_000, 20_000_000), 25_000);
  assert.equal(getNextMinimumBid(100_000, 20_000_000), 125_000);
  assert.equal(getNextMinimumBid(4_000_000, 20_000_000), 4_125_000);
  assert.equal(getNextMinimumBid(12_000_000, 20_000_000), 13_000_000);
});

test("Festival bids use a fixed percentage of the base price", () => {
  assert.deepEqual(
    getFestivalBidProgression({
      basePrice: 100,
      currentBid: 140,
      incrementPercentage: 20,
    }),
    {
      basePrice: 100,
      incrementPercentage: 20,
      incrementAmount: 20,
      currentBid: 140,
      nextBid: 160,
    }
  );
  assert.equal(
    getFestivalBidProgression({
      basePrice: 20_000,
      currentBid: 32_000,
      incrementPercentage: 20,
    }).nextBid,
    36_000
  );
  assert.equal(
    getFestivalBidProgression({
      basePrice: 200,
      currentBid: 250,
      incrementPercentage: 25,
    }).nextBid,
    300
  );
});

test("Phase 3F timer deadlines reset and preserve paused remaining time", () => {
  const deadline = createFestivalAuctionDeadline(1_000, 20_000);
  assert.equal(deadline.getTime(), 21_000);
  assert.equal(getFestivalAuctionRemainingMs(deadline, 6_000), 15_000);
  assert.equal(getFestivalAuctionRemainingMs(deadline, 25_000), 0);
});

test("Phase 3F accepts an admin base price and rejects owner-supplied amounts", () => {
  assert.equal(
    festivalAuctionStartParticipantSchema.safeParse({
      params: { festivalId: "festival-1", participantId: "participant-1" },
      body: { basePrice: 100000 },
    }).success,
    true
  );
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {},
    }).success,
    true
  );
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { amount: 110000 },
    }).success,
    false
  );
});

test("Phase 3F persists timer state and pending finalization", async () => {
  const [migration, model, controller] = await Promise.all([
    readBackendFile("migrations/202606100004-festival-auction-ux-alignment.js"),
    readBackendFile("src/models/festivalAuction.model.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
  ]);
  for (const field of ["basePrice", "endsAt", "pausedRemainingMs"]) {
    assert.match(migration, new RegExp(field));
    assert.match(model, new RegExp(field));
  }
  assert.match(model, /"paused", "pending"/);
  assert.match(controller, /markFestivalAuctionPending/);
  assert.match(controller, /resetFestivalAuctionTimer/);
  assert.match(controller, /restoreFestivalAuctionTimers/);
});

test("Phase 3F exposes ordered bids, results, team summaries, and live events", async () => {
  const [controller, routes, server] = await Promise.all([
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/index.js"),
  ]);
  assert.match(controller, /bidNumber: index \+ 1/);
  assert.match(controller, /playersPurchased/);
  assert.match(controller, /currentRosterCount/);
  assert.match(controller, /auction-timer-updated/);
  assert.match(controller, /auction-pending-finalization/);
  assert.match(controller, /participant-sold/);
  assert.match(controller, /participant-unsold/);
  assert.match(routes, /auction\/extend",\s*adminMiddleware/s);
  assert.match(server, /restoreFestivalAuctionTimers/);
});

test("Phase 3F keeps lifecycle authorization server-side", async () => {
  const [routes, controller] = await Promise.all([
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
  ]);
  for (const action of [
    "auction/start",
    "auction/pause",
    "auction/resume",
    "auction/extend",
    "auction/complete",
    "participants/:participantId/sell",
    "participants/:participantId/unsold",
  ]) {
    assert.match(
      routes,
      new RegExp(action.replaceAll("/", "\\/") + '"[\\s\\S]*?adminMiddleware')
    );
  }
  assert.match(controller, /req\.user\.role !== "team_owner"/);
  assert.match(controller, /Only an assigned Festival Team owner can bid/);
});

test("Phase 3F UI removes manual owner bids and renders aligned live panels", async () => {
  const component = await readRepoFile(
    "ipl-auction-tracker/src/components/MainFestivalAuction.jsx"
  );
  assert.doesNotMatch(component, /label="Bid Amount"/);
  assert.match(component, /label="Base Price"/);
  assert.match(component, /incrementPercentage/);
  assert.match(component, /incrementAmount/);
  assert.match(component, /Next bid:/);
  assert.match(component, /<VisualTimer/);
  assert.match(component, /Bid Number/);
  assert.match(component, /playersPurchased/);
  assert.match(component, /Auction History/);
});
