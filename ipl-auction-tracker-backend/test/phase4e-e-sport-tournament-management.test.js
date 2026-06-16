import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(
    path.join(root, "ipl-auction-tracker", relativePath),
    "utf8"
  );

test("Phase 4E-E keeps Sport Tournament Management focused on setup", async () => {
  const workspace = await frontend("src/pages/SportTournamentWorkspace.jsx");

  for (const section of [
    "Overview",
    "Teams",
    "Captains",
    "Eligibility",
    "Budgets",
    "Pool",
    "Readiness",
    "Settings",
  ]) {
    assert.match(workspace, new RegExp(`"${section}"`));
  }

  assert.doesNotMatch(workspace, /activeSection === "Auction"/);
  assert.doesNotMatch(workspace, /PLACE BID|VisualTimer|Live Bid Stream/);
  assert.doesNotMatch(workspace, /auction\/history|join-sport-auction/);
  assert.match(workspace, /Sport Auction Settings/);
  assert.match(workspace, /Live bidding remains on the Live Auction page/);
});

test("Phase 4E-E exposes Auction status and a dedicated Arena entry", async () => {
  const controlCenter = await frontend(
    "src/components/SportTournamentControlCenter.jsx"
  );

  assert.match(controlCenter, /Auction Status:/);
  assert.match(controlCenter, /Open Live Sport Auction/);
  assert.match(controlCenter, /\/auctions\/sports\/\$\{tournament\.id\}/);
  assert.doesNotMatch(controlCenter, /auction\/start|Launch Auction/);
});

test("Phase 4E-E preserves launch behavior inside the existing Arena", async () => {
  const [arena, controls] = await Promise.all([
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportRoleControls.jsx"),
  ]);

  assert.match(controls, /onRun\("\/start", \{\}, "Auction launched\.", "launch"\)/);
  assert.match(controls, /status !== "ready"/);
  assert.match(controls, /Start Auction/);
  assert.match(arena, /join-sport-auction/);
  assert.match(arena, /expectedCurrentBid/);
});
