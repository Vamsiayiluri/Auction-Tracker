import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readFrontend = (path) =>
  readFile(
    new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url),
    "utf8"
  );

test("admin workspace keeps Operations and Edit Configuration modes", async () => {
  const detail = await readFrontend("pages/FestivalDetail.jsx");
  assert.match(detail, /Operations View/);
  assert.match(detail, /Edit Festival Configuration/);
  assert.match(
    detail,
    /adminWorkspaceMode === "auto" && auctionStatus === "setup"/
  );
  assert.match(detail, /configurationView && activeStep === 0/);
  assert.match(detail, /locked=\{locked\}/);
});

test("owner Arena opens directly and keeps Team reporting outside the live route", async () => {
  const [page, arena] = await Promise.all([
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
    readFrontend("components/MainFestivalAuction.jsx"),
  ]);
  assert.match(page, /<MainFestivalAuction festivalId=\{festivalId\}/);
  assert.doesNotMatch(page, /ownerTabs|activeTab|FestivalBidHistory/);
  assert.match(arena, /MyTeamPanel/);
  assert.match(arena, /OwnerBidControls/);
});

test("spectator Arena is tab-free and does not mount management reporting", async () => {
  const [page, arena] = await Promise.all([
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
    readFrontend("components/MainFestivalAuction.jsx"),
  ]);
  assert.doesNotMatch(page, /spectatorTabs|<Tabs|FestivalHistory/);
  assert.match(arena, /LiveBidStream/);
  assert.match(arena, /TeamPurseComparison/);
  assert.match(arena, /RecentResultsStrip/);
});

test("admin history is split into dedicated bid, result, and audit workspaces", async () => {
  const [detail, history, bidHistory] = await Promise.all([
    readFrontend("pages/FestivalDetail.jsx"),
    readFrontend("components/FestivalHistory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
  ]);
  for (const section of [
    "Auction Results",
    "Re-Auction History",
    "Owner Activity",
    "Retentions",
    "Audit Log",
  ]) {
    assert.match(history, new RegExp(section));
  }
  assert.match(detail, /activeTab === "Bid History"/);
  assert.match(detail, /activeTab === "Results"/);
  assert.match(detail, /activeTab === "Audit"/);
  assert.match(history, /activeSection === "Auction Results"/);
  assert.match(bidHistory, /Auctioned Player/);
  assert.match(bidHistory, /View Bids/);
});

test("Arena lazy loads one state owner while management reports remain separate", async () => {
  const [page, auction, teams, bidHistory, overview] = await Promise.all([
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
    readFrontend("components/MainFestivalAuction.jsx"),
    readFrontend("components/FestivalTeamsDirectory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
    readFrontend("components/FestivalViewerOverview.jsx"),
  ]);
  assert.match(page, /lazy\(/);
  assert.match(page, /<Suspense/);
  assert.doesNotMatch(page, /activeTab|FestivalTeamsDirectory/);
  assert.match(auction, /\/auction\/current/);
  assert.match(auction, /\/auction\/history/);
  assert.equal((auction.match(/socket\.on\("auction-state"/g) || []).length, 1);
  assert.match(teams, /\/teams`/);
  assert.match(teams, /\/auction\/current`/);
  assert.match(bidHistory, /\/auction\/history`/);
  assert.match(overview, /\/auction\/current`/);
});

test("workspace enhancement adds no Phase 4 or sport-team functionality", async () => {
  const files = await Promise.all([
    readFrontend("pages/FestivalDetail.jsx"),
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
    readFrontend("components/FestivalHistory.jsx"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /Sport Team/);
  assert.doesNotMatch(source, /Captain/);
  assert.doesNotMatch(source, /Match Scheduling/);
});
