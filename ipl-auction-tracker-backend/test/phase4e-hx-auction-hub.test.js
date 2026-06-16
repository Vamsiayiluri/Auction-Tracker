import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(path.join(root, "ipl-auction-tracker", relativePath), "utf8");

test("Phase 4E-HX registers dedicated Hub and Results routes without replacing Arenas", async () => {
  const app = await frontend("src/App.jsx");

  for (const route of [
    "/festivals/:festivalId/auction-hub",
    "/auctions/festivals/:festivalId",
    "/festivals/:festivalId/results",
    "/sport-tournaments/:id/auction-hub",
    "/auctions/sports/:sportTournamentId",
    "/sport-tournaments/:id/results",
  ]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("Phase 4E-HX Festival Hub contains monitoring and reporting sections", async () => {
  const hub = await frontend("src/pages/FestivalAuctionHub.jsx");

  for (const section of ["Overview", "Teams", "Bid History", "Results", "Statistics"]) {
    assert.match(hub, new RegExp(`"${section}"`));
  }
  assert.match(hub, /Open Arena/);
  assert.match(hub, /My Remaining Purse/);
  assert.match(hub, /My Spending/);
  assert.match(hub, /\/auction\/current/);
  assert.match(hub, /\/auction\/history/);
  assert.match(hub, /join-festival-auction/);
  assert.doesNotMatch(hub, /Place Bid|Start Auction|Pause Auction/);
});

test("Phase 4E-HX Sport Hub contains monitoring, allocations, and captain context", async () => {
  const hub = await frontend("src/pages/SportAuctionHub.jsx");

  for (const section of [
    "Overview",
    "Teams",
    "Bid History",
    "Results",
    "Allocations",
    "Statistics",
  ]) {
    assert.match(hub, new RegExp(`"${section}"`));
  }
  assert.match(hub, /My Team/);
  assert.match(hub, /Credits Remaining/);
  assert.match(hub, /Open Arena/);
  assert.match(hub, /join-sport-auction/);
  assert.equal((hub.match(/socket\.on\("auction-state"/g) || []).length, 1);
  assert.doesNotMatch(hub, /Place Bid|Start Auction|Pause Auction/);
});

test("Phase 4E-HX separates command, management, Hub, Arena, and Results navigation", async () => {
  const [navigation, festivalManagement, sportManagement] = await Promise.all([
    frontend("src/components/AuctionContextNavigation.jsx"),
    frontend("src/pages/FestivalDetail.jsx"),
    frontend("src/pages/SportTournamentWorkspace.jsx"),
  ]);

  for (const label of [
    "Command Center",
    "Management",
    "Auction Hub",
    "Arena",
    "Results",
  ]) {
    assert.match(navigation, new RegExp(label));
  }
  assert.doesNotMatch(festivalManagement, /<FestivalControlCenter/);
  assert.doesNotMatch(sportManagement, /<SportTournamentControlCenter/);
  assert.match(festivalManagement, /Open Auction Hub/);
  assert.match(sportManagement, /Open Auction Hub/);
});

test("Phase 4E-HX keeps compact Arena headers and routes exits to Hubs", async () => {
  const [festivalHeader, sportHeader, festivalArena, sportArena] = await Promise.all([
    frontend("src/components/FestivalAuctionArena/ArenaHeader.jsx"),
    frontend("src/components/SportAuctionArena/SportArenaHeader.jsx"),
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
  ]);

  assert.match(festivalHeader, /Auction Hub/);
  assert.match(sportHeader, /Auction Hub/);
  assert.doesNotMatch(festivalHeader, /gridTemplateColumns/);
  assert.doesNotMatch(sportHeader, /gridTemplateColumns/);
  assert.match(festivalArena, /\/auction-hub/);
  assert.match(sportArena, /\/auction-hub/);
});
