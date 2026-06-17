import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4E-J Sprint 1 adds shared setup-first stage helpers", async () => {
  const stages = await frontend("src/utils/auctionStages.js");

  for (const symbol of [
    "AUCTION_STAGE",
    "getFestivalAuctionStage",
    "getSportAuctionStage",
    "shouldShowInAuctionDirectory",
    "getStageLabel",
  ]) {
    assert.match(stages, new RegExp(symbol));
  }

  assert.match(stages, /SETUP: "setup"/);
  assert.match(stages, /READY: "ready"/);
  assert.match(stages, /LIVE: "live"/);
  assert.match(stages, /COMPLETED: "completed"/);
});

test("Phase 4E-J Sprint 1 makes contextual navigation stage-aware", async () => {
  const navigation = await frontend("src/components/AuctionContextNavigation.jsx");

  assert.match(navigation, /stageItems/);
  assert.match(navigation, /AUCTION_STAGE\.SETUP/);
  assert.match(navigation, /\["Overview", commandCenter\]/);
  assert.match(navigation, /\["Setup", management\]/);
  assert.match(navigation, /\["Auction Details", hub\]/);
  assert.match(navigation, /\["Live Auction", arena\]/);
  assert.match(navigation, /shouldShowResults/);
});

test("Phase 4E-J Sprint 1 makes Festival Overview setup-first", async () => {
  const commandCenter = await frontend("src/pages/FestivalCommandCenter.jsx");

  for (const label of [
    "Setup Progress",
    "Continue Festival Setup",
    "Next required step",
    "Continue Setup",
    "Refresh Setup Check",
    "Setup Issues",
  ]) {
    assert.match(commandCenter, new RegExp(label));
  }

  assert.match(commandCenter, /getFestivalAuctionStage/);
  assert.match(commandCenter, /stage=\{festivalStage\}/);
  assert.match(commandCenter, /!setupStage && \(/);
  assert.doesNotMatch(commandCenter, /Competition Setup/);
});

test("Phase 4E-J Sprint 1 cleans up Festival Management setup navigation", async () => {
  const detail = await frontend("src/pages/FestivalDetail.jsx");
  const overview = await frontend("src/components/FestivalOverview.jsx");

  assert.match(detail, /visibleOperationTabs/);
  assert.match(detail, /"Auction Preparation", "Bid History", "Results"/);
  assert.match(detail, /setupStage \? "Continue Setup" : "View Auction Details"/);
  assert.match(detail, /stage=\{festivalStage\}/);
  assert.match(detail, /operationsView && !setupStage && activeTab === "Bid History"/);
  assert.doesNotMatch(overview, /Unsold Players/);
  assert.doesNotMatch(overview, /Auction Status/);
});

test("Phase 4E-J Sprint 1 filters Auction Directory to ready, live, and completed auctions", async () => {
  const directory = await frontend("src/pages/AuctionDirectory.jsx");

  assert.match(directory, /shouldShowInAuctionDirectory/);
  assert.match(directory, /getFestivalAuctionStage/);
  assert.match(directory, /getSportAuctionStage/);
  assert.match(directory, /Review & Launch/);
  assert.match(directory, /No ready, live, or completed auctions match this view yet/);
  assert.match(directory, /entry\.stage === AUCTION_STAGE\.LIVE/);
  assert.doesNotMatch(directory, /Setup-stage.*Open Live Auction/);
});
