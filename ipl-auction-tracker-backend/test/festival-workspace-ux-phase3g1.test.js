import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FESTIVAL_OPERATION_TABS,
  FESTIVAL_SETUP_STEPS,
  getQuickActions,
  getSetupCompletion,
  getStoredSetupStep,
  getWorkspaceMode,
} from "../../ipl-auction-tracker/src/utils/festivalWorkspace.js";

const frontendFile = (path) =>
  readFile(new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url), "utf8");

test("wizard exposes the complete setup journey and validates progression", () => {
  assert.equal(FESTIVAL_SETUP_STEPS.length, 9);
  assert.deepEqual(FESTIVAL_SETUP_STEPS.slice(0, 5), [
    "Festival Details",
    "Setup Foundation",
    "Participants",
    "Teams",
    "Budget",
  ]);

  const incomplete = getSetupCompletion({
    setupSteps: {
      festivalDetails: true,
      setupFoundation: true,
      participants: true,
      teams: true,
      budget: true,
      owners: false,
      retentions: true,
      auctionPool: true,
      reviewAndLaunch: false,
    },
    overallStatus: "NOT_READY",
  });
  assert.equal(incomplete[4], true);
  assert.equal(incomplete[5], false);
  assert.equal(incomplete[8], false);
  assert.equal(getStoredSetupStep("Budget"), 4);
  assert.equal(getStoredSetupStep("Removed Step"), 0);
});

test("operations navigation contains only Phase 3G.1 workspaces", () => {
  assert.deepEqual(FESTIVAL_OPERATION_TABS, [
    "Overview",
    "Participants",
    "Teams",
    "Owners",
    "Retentions",
    "Auction",
    "Bid History",
    "Results",
    "Audit",
  ]);
  assert.equal(FESTIVAL_OPERATION_TABS.includes("Sport Teams"), false);
  assert.equal(FESTIVAL_OPERATION_TABS.includes("Sport Auctions"), false);
});

test("workspace mode and quick actions follow auction lifecycle state", () => {
  assert.equal(getWorkspaceMode("setup"), "setup");
  assert.equal(getWorkspaceMode("live"), "operations");
  assert.deepEqual(getQuickActions("setup"), ["start"]);
  assert.deepEqual(getQuickActions("live"), ["open", "pause"]);
  assert.deepEqual(getQuickActions("paused"), ["resume", "open"]);
  assert.deepEqual(getQuickActions("completed"), ["results", "history"]);
});

test("workspace preserves state and mounts only the active tab or step", async () => {
  const source = await frontendFile("pages/FestivalDetail.jsx");
  assert.match(source, /festival-setup-step-v2:/);
  assert.match(source, /festival-workspace-tab:/);
  assert.match(source, /activeStep === 2/);
  assert.match(source, /activeTab === "Auction"/);
  assert.match(source, /activeTab === "Bid History"/);
  assert.match(source, /activeTab === "Results"/);
  assert.match(source, /activeTab === "Audit"/);
  assert.match(source, /lazy\(\(\) => import/);
  assert.match(source, /loadRegistrationData/);
});

test("control center, overview, history, and responsive navigation are wired", async () => {
  const [controlCenter, overview, history, bidHistory, detail] = await Promise.all([
    frontendFile("components/FestivalControlCenter.jsx"),
    frontendFile("components/FestivalOverview.jsx"),
    frontendFile("components/FestivalHistory.jsx"),
    frontendFile("components/FestivalBidHistory.jsx"),
    frontendFile("pages/FestivalDetail.jsx"),
  ]);

  assert.match(controlCenter, /Participants/);
  assert.match(controlCenter, /Auction Pool/);
  assert.match(controlCenter, /Open Auction/);
  assert.match(overview, /Exact blockers|blockers/);
  assert.match(overview, /Owners Activated/);
  assert.match(history, /Auction Results/);
  assert.match(history, /Re-Auction History/);
  assert.match(history, /Owner Activity/);
  assert.match(history, /Retentions/);
  assert.match(history, /Audit Log/);
  assert.match(bidHistory, /View Bids/);
  assert.match(bidHistory, /Own Bids/);
  assert.match(bidHistory, /Won Bids/);
  assert.match(bidHistory, /Lost Bids/);
  assert.match(detail, /variant="scrollable"/);
  assert.match(detail, /allowScrollButtonsMobile/);
});
