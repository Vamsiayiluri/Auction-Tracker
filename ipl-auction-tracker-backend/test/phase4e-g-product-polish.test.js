import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(path.join(root, "ipl-auction-tracker", relativePath), "utf8");

test("Phase 4E-G consolidates primary Auction navigation", async () => {
  const [app, shell, directory] = await Promise.all([
    frontend("src/App.jsx"),
    frontend("src/components/AppShell.jsx"),
    frontend("src/pages/AuctionDirectory.jsx"),
  ]);

  assert.match(app, /<Navigate to="\/auctions\?type=festival" replace \/>/);
  assert.equal((shell.match(/label: "Auctions"/g) || []).length, 3);
  assert.doesNotMatch(shell, /label: "Festival Auctions"/);
  assert.doesNotMatch(shell, /label: "Sport Auctions"/);
  assert.match(directory, /route: `\/sport-tournaments\/\$\{tournament\.id\}\/auction-hub`/);
  assert.match(directory, /arenaRoute: `\/auctions\/sports\/\$\{tournament\.id\}`/);
  assert.doesNotMatch(directory, /actionLabel: .*Open Management/);
});

test("Phase 4E-G forces Arena reconciliation for expiry and rejected actions", async () => {
  const [festivalArena, sportArena] = await Promise.all([
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
  ]);

  assert.match(festivalArena, /forceState = false/);
  assert.match(festivalArena, /socketAdvancedDuringRequest/);
  assert.match(
    festivalArena,
    /refreshHistory: false, forceState: true/
  );
  assert.match(sportArena, /forceState = false/);
  assert.match(sportArena, /socketAdvancedDuringRequest/);
  assert.match(sportArena, /queuedForceState/);
  assert.match(sportArena, /locallyExpired/);
  assert.match(
    sportArena,
    /load\(\{ background: true, forceState: true \}\)/
  );
  assert.equal((sportArena.match(/socket\.on\("auction-state"/g) || []).length, 1);
});

test("Phase 4E-G exposes retry and accessibility affordances", async () => {
  const [directory, workspace, festivalQueue, sportQueue] = await Promise.all([
    frontend("src/pages/AuctionDirectory.jsx"),
    frontend("src/pages/SportTournamentWorkspace.jsx"),
    frontend("src/components/FestivalAuctionArena/QueueSummary.jsx"),
    frontend("src/components/SportAuctionArena/SportQueueSummary.jsx"),
  ]);

  assert.match(directory, /onClick=\{loadAuctions\}>Retry/);
  assert.match(workspace, /onClick=\{loadWorkspace\}>Retry/);
  assert.match(festivalQueue, /aria-label/);
  assert.match(sportQueue, /aria-label/);
});
