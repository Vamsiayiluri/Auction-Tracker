import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4E-A adds canonical Festival, management, and Arena routes", async () => {
  const app = await frontend("src/App.jsx");

  for (const route of [
    "/festivals/:festivalId/command-center",
    "/festivals/:festivalId/manage",
    "/auctions",
    "/auctions/festivals/:festivalId",
    "/auctions/sports/:sportTournamentId",
    "/sport-tournaments/:sportTournamentId/manage",
  ]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(app, /FestivalAuctionCompatibilityRedirect/);
  assert.match(app, /SportAuctionCompatibilityRedirect/);
  assert.match(app, /to=\{`\/auctions\/festivals\/\$\{festivalId\}`\}/);
  assert.match(
    app,
    /to=\{`\/auctions\/sports\/\$\{sportTournamentId\}`\}/
  );
});

test("Phase 4E-A preserves existing screens and role boundaries", async () => {
  const app = await frontend("src/App.jsx");

  assert.match(app, /path="\/festivals\/:festivalId"/);
  assert.match(app, /path="\/festival-auctions"/);
  assert.match(app, /path="\/sport-tournaments\/:sportTournamentId"/);
  assert.match(app, /<FestivalDetail \/>/);
  assert.match(app, /<FestivalLiveAuctionPage \/>/);
  assert.match(app, /<SportTournamentWorkspace \/>/);
  assert.match(app, /<SportAuctionArena \/>/);
  assert.match(
    app,
    /allowedRoles=\{\["admin", "team_owner", "spectator"\]\}/
  );
});

test("Phase 4E-A adds Festival and Auction entry foundations", async () => {
  const [commandCenter, auctionDirectory] = await Promise.all([
    frontend("src/pages/FestivalCommandCenter.jsx"),
    frontend("src/pages/AuctionDirectory.jsx"),
  ]);

  assert.match(commandCenter, /Festival Command Center/);
  assert.match(commandCenter, /Festival Management/);
  assert.match(commandCenter, /Main Festival Auction/);
  assert.match(commandCenter, /Sport Tournaments/);
  assert.match(commandCenter, /\/auctions\/festivals\//);
  assert.match(commandCenter, /\/sport-tournaments\/\$\{tournament\.id\}\/manage/);

  assert.match(auctionDirectory, /Auction Directory/);
  assert.match(auctionDirectory, /Festival Auctions/);
  assert.match(auctionDirectory, /Sport Auctions/);
  assert.match(auctionDirectory, /api\.get\("\/v2\/festivals"\)/);
  assert.match(auctionDirectory, /api\.get\("\/v2\/sport-tournaments"\)/);
  assert.doesNotMatch(
    `${commandCenter}\n${auctionDirectory}`,
    /fixtures|standings|competition engine/i
  );
});

test("Phase 4E-A navigation and internal actions use canonical destinations", async () => {
  const [
    shell,
    festivalDirectory,
    festivalAuctions,
    sportDirectory,
    festivalControlCenter,
    sportControlCenter,
    sportArena,
  ] = await Promise.all([
    frontend("src/components/AppShell.jsx"),
    frontend("src/pages/FestivalDashboard.jsx"),
    frontend("src/pages/FestivalAuctionDirectory.jsx"),
    frontend("src/pages/SportTournamentDirectory.jsx"),
    frontend("src/components/FestivalControlCenter.jsx"),
    frontend("src/components/SportTournamentControlCenter.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
  ]);

  assert.match(shell, /label: "Auctions"/);
  assert.match(shell, /to: "\/auctions"/);
  assert.match(festivalDirectory, /\/command-center/);
  assert.match(festivalAuctions, /\/auctions\/festivals\//);
  assert.match(sportDirectory, /\/auctions\/sports\//);
  assert.match(sportDirectory, /\/manage/);
  assert.match(festivalControlCenter, /\/auctions\/festivals\//);
  assert.match(sportControlCenter, /\/auctions\/sports\//);
  assert.match(sportArena, /\/auction-hub/);
});
