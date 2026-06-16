import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4E-D makes the Festival Auction route a tab-free Arena", async () => {
  const page = await frontend("src/pages/FestivalLiveAuctionPage.jsx");

  assert.match(page, /<MainFestivalAuction festivalId=\{festivalId\}/);
  assert.doesNotMatch(page, /<Tabs|<Tab|ownerTabs|spectatorTabs|activeTab/);
  assert.doesNotMatch(
    page,
    /FestivalViewerOverview|FestivalTeamsDirectory|FestivalHistory|FestivalBidHistory/
  );
});

test("Phase 4E-D preserves one Auction state owner and existing synchronization behavior", async () => {
  const arena = await frontend("src/components/MainFestivalAuction.jsx");

  assert.match(arena, /api\.get\(`\/v2\/festivals\/\$\{festivalId\}\/auction\/current`\)/);
  assert.match(arena, /api\.get\(`\/v2\/festivals\/\$\{festivalId\}\/auction\/history`\)/);
  assert.match(arena, /join-festival-auction/);
  assert.match(arena, /leave-festival-auction/);
  assert.match(arena, /shouldApplyAuctionSnapshot/);
  assert.match(arena, /mergeAuctionSnapshotState/);
  assert.match(arena, /getAuctionRemainingSeconds/);
  assert.match(arena, /expectedCurrentBid: state\.current\.currentBid/);
  assert.equal((arena.match(/socket\.on\("auction-state"/g) || []).length, 1);
});

test("Phase 4E-D Arena exposes the approved live information architecture", async () => {
  const files = await Promise.all([
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/components/FestivalAuctionArena/ArenaHeader.jsx"),
    frontend("src/components/FestivalAuctionArena/ParticipantStage.jsx"),
    frontend("src/components/FestivalAuctionArena/TeamPanels.jsx"),
    frontend("src/components/FestivalAuctionArena/LiveBidStream.jsx"),
    frontend("src/components/FestivalAuctionArena/QueueSummary.jsx"),
    frontend("src/components/FestivalAuctionArena/RecentResultsStrip.jsx"),
  ]);
  const source = files.join("\n");

  for (const label of [
    "Auction Progress",
    "Current Participant",
    "Base Price",
    "Current Bid",
    "Next Bid",
    "Leading Team",
    "My Team",
    "Remaining Purse",
    "Spent Amount",
    "Purchased Participants",
    "Retained Participants",
    "Remaining Slots",
    "Team Purse Comparison",
    "Live Bid Stream",
    "Queue Summary",
    "Available",
    "Unsold",
    "Re-Auction Count",
    "Auction Lifecycle",
    "Round Controls",
    "Pending Finalization",
    "Recent Results",
    "View Full Results",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /\.slice\(\)\.reverse\(\)/);
  assert.match(source, /viewerTeamId/);
  assert.match(source, /bidDisabledReason/);
  assert.doesNotMatch(source, /Auction History|Full History|Audit Log/);
});

test("Phase 4E-D separates live execution from Festival Management", async () => {
  const [workspace, workspaceUtils] = await Promise.all([
    frontend("src/pages/FestivalDetail.jsx"),
    frontend("src/utils/festivalWorkspace.js"),
  ]);

  assert.match(workspaceUtils, /"Auction Preparation"/);
  assert.doesNotMatch(workspaceUtils, /^\s*"Auction",\s*$/m);
  assert.doesNotMatch(workspace, /import\("\.\.\/components\/MainFestivalAuction"\)/);
  assert.doesNotMatch(workspace, /<MainFestivalAuction/);
  assert.match(workspace, /activeTab === "Auction Preparation"/);
  assert.match(workspace, /Open Auction Arena/);
  assert.match(workspace, /<FestivalReadiness/);
  assert.match(workspace, /activeTab === "Bid History"/);
  assert.match(workspace, /activeTab === "Results"/);
  assert.match(workspace, /activeTab === "Audit"/);
});

test("Phase 4E-D keeps the canonical route and does not add backend behavior", async () => {
  const [app, arena, results] = await Promise.all([
    frontend("src/App.jsx"),
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/pages/FestivalAuctionResultsPage.jsx"),
  ]);

  assert.match(app, /path="\/auctions\/festivals\/:festivalId"/);
  assert.match(app, /path="\/festivals\/:festivalId\/results"/);
  assert.match(app, /<FestivalLiveAuctionPage \/>/);
  assert.match(results, /sections=\{\["Auction Results"\]\}/);
  assert.match(arena, /\/festivals\/\$\{festivalId\}\/results/);
  assert.match(arena, /\/festivals\/\$\{festivalId\}\/auction-hub/);
  assert.doesNotMatch(arena, /\/competitions|\/fixtures|\/matches/);
});
