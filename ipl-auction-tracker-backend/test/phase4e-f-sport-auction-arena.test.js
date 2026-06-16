import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(path.join(root, "ipl-auction-tracker", relativePath), "utf8");

test("Phase 4E-F keeps the existing Sport Arena state and socket contracts", async () => {
  const arena = await frontend("src/pages/SportAuctionArena.jsx");

  assert.match(arena, /join-sport-auction/);
  assert.match(arena, /leave-sport-auction/);
  assert.equal((arena.match(/socket\.on\("auction-state"/g) || []).length, 1);
  assert.match(arena, /shouldApplyAuctionSnapshot/);
  assert.match(arena, /expectedCurrentBid: current\.currentCredits/);
  assert.match(arena, /\/auction\/current/);
  assert.match(arena, /\/auction\/history/);
});

test("Phase 4E-F composes the approved Arena-first information architecture", async () => {
  const arena = await frontend("src/pages/SportAuctionArena.jsx");

  for (const component of [
    "SportArenaHeader",
    "SportParticipantStage",
    "CaptainPanel",
    "TeamCreditComparison",
    "SportLiveBidStream",
    "SportQueueSummary",
    "SportRecentResultsStrip",
  ]) {
    assert.match(arena, new RegExp(`<${component}`));
  }

  assert.doesNotMatch(arena, /<Tabs|<Table|Team Allocations|History Sections/);
});

test("Phase 4E-F provides role-specific controls without changing action paths", async () => {
  const [arena, controls] = await Promise.all([
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportRoleControls.jsx"),
  ]);

  for (const action of [
    "Start Auction",
    "Pause Auction",
    "Resume Auction",
    "Complete Auction",
    "Extend",
    "Sell",
    "Unsold",
    "Place Bid",
  ]) {
    assert.match(controls, new RegExp(action));
  }
  assert.match(arena, /canManage &&/);
  assert.match(arena, /canBid &&/);
  assert.match(arena, /\/participants\/\$\{participant\.festivalParticipantId\}\/start/);
  assert.match(controls, /\/participants\/\$\{current\.festivalParticipantId\}\/sell/);
  assert.match(controls, /\/participants\/\$\{current\.festivalParticipantId\}\/unsold/);
});

test("Phase 4E-F extracts compact live-only Sport Arena panels", async () => {
  const files = await Promise.all([
    frontend("src/components/SportAuctionArena/SportArenaHeader.jsx"),
    frontend("src/components/SportAuctionArena/SportParticipantStage.jsx"),
    frontend("src/components/SportAuctionArena/SportTeamPanels.jsx"),
    frontend("src/components/SportAuctionArena/SportLiveBidStream.jsx"),
    frontend("src/components/SportAuctionArena/SportQueueSummary.jsx"),
    frontend("src/components/SportAuctionArena/SportRecentResultsStrip.jsx"),
  ]);
  const source = files.join("\n");

  for (const label of [
    "Players Auctioned",
    "Current Player",
    "Festival Team",
    "Remaining Credits",
    "Players Won",
    "Remaining Slots",
    "Team Credit Comparison",
    "Live Bid Stream",
    "Queue Summary",
    "Recent Results",
  ]) {
    assert.match(source, new RegExp(label));
  }
});
