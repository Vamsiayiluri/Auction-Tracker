import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readFrontend = (path) =>
  readFile(
    new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url),
    "utf8"
  );

test("Festival Teams reuse the Tournament expandable team pattern", async () => {
  const [tournamentTeams, festivalTeams] = await Promise.all([
    readFrontend("components/AdminDashboardLayout/TeamsOverview.jsx"),
    readFrontend("components/FestivalTeamsDirectory.jsx"),
  ]);
  assert.match(tournamentTeams, /<Accordion/);
  assert.match(festivalTeams, /<Accordion/);
  assert.match(festivalTeams, /Owner/);
  assert.match(festivalTeams, /Remaining Purse/);
  assert.match(festivalTeams, /Retentions/);
  assert.match(festivalTeams, /Purchased Players/);
  assert.match(festivalTeams, /Current Roster/);
  assert.match(festivalTeams, /rosterSource === "auction"/);
  assert.match(festivalTeams, /rosterSource === "retention"/);
});

test("Festival Bid History reuses the Tournament player-first dialog pattern", async () => {
  const [tournamentHistory, festivalHistory] = await Promise.all([
    readFrontend("components/TeamOwnerDashboard/BidHistory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
  ]);
  assert.match(tournamentHistory, /View Bids/);
  assert.match(tournamentHistory, /<Dialog/);
  assert.match(festivalHistory, /Auctioned Player/);
  assert.match(festivalHistory, /View Bids/);
  assert.match(festivalHistory, /<Dialog/);
  assert.match(festivalHistory, /Base Price/);
  assert.match(festivalHistory, /Sold Price/);
  assert.match(festivalHistory, /Sold Team/);
  assert.match(festivalHistory, /bid\.placedAt/);
  assert.match(festivalHistory, /bid\.bidNumber/);
});

test("Owner Bid History separates own, won, and lost bids", async () => {
  const history = await readFrontend("components/FestivalBidHistory.jsx");
  assert.match(history, /Own Bids/);
  assert.match(history, /Won Bids/);
  assert.match(history, /Lost Bids/);
  assert.match(history, /festivalTeamId === ownerTeamId/);
  assert.match(history, /auction\.result\?\.festivalTeamId === ownerTeamId/);
  assert.match(history, /Your Bid/);
});

test("Festival workspace exposes aligned admin and Owner navigation", async () => {
  const [workspace, detail, viewer] = await Promise.all([
    readFrontend("utils/festivalWorkspace.js"),
    readFrontend("pages/FestivalDetail.jsx"),
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
  ]);
  for (const tab of ["Teams", "Bid History", "Results", "Audit"]) {
    assert.match(workspace, new RegExp(`"${tab}"`));
  }
  assert.match(detail, /FestivalTeamsDirectory/);
  assert.match(detail, /FestivalBidHistory/);
  assert.match(
    viewer,
    /const ownerTabs = \["Overview", "My Team", "Auction", "Bid History"\]/
  );
});

test("alignment changes do not add auction mutations or Phase 4 concepts", async () => {
  const files = await Promise.all([
    readFrontend("components/FestivalTeamsDirectory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /api\.(post|patch|put|delete)\(/);
  assert.doesNotMatch(source, /Sport Team|Captain|Match Scheduling/);
});
