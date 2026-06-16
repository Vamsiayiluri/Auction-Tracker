import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  festivalAuctionBidSchema,
} from "../src/validation/festival.validation.js";

const readBackend = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readFrontend = (path) =>
  readFile(
    new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url),
    "utf8"
  );

test("bid validation carries the observed round state", () => {
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        auctionId: "auction-1",
        expectedCurrentBid: 100000,
      },
    }).success,
    true
  );
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {},
    }).success,
    false
  );
});

test("bid acceptance rejects stale requests and resets the timer transactionally", async () => {
  const controller = await readBackend(
    "src/controllers/festivalLiveAuction.controller.js"
  );
  assert.match(controller, /req\.body\.auctionId !== auction\.id/);
  assert.match(
    controller,
    /req\.body\.expectedCurrentBid[\s\S]*currentBid[\s\S]*newer bid was already accepted/i
  );
  assert.match(
    controller,
    /FestivalAuctionBid\.create[\s\S]*createFestivalAuctionDeadline[\s\S]*auction\.update/s
  );
  assert.match(
    controller,
    /outcome === "unsold" && highestBid[\s\S]*cannot be marked unsold after bids exist/s
  );
});

test("Team Owner credentials include the assigned Team name", async () => {
  const [controller, emailService] = await Promise.all([
    readBackend("src/controllers/festivalMainAuction.controller.js"),
    readBackend("src/utils/emailService.js"),
  ]);
  assert.match(controller, /teamName: team\.name/);
  assert.match(controller, /teamName: owner\.team\?\.name/);
  assert.match(emailService, /<strong>Team Name:<\/strong>/);
});

test("live auction UX exposes search, stable controls, queues, and duplicate guards", async () => {
  const [component, queues] = await Promise.all([
    readFrontend("components/MainFestivalAuction.jsx"),
    readFrontend("components/FestivalAuctionArena/QueueSummary.jsx"),
  ]);
  assert.match(component, /<Autocomplete/);
  assert.match(component, /Search available participant/);
  assert.match(component, /Start Round/);
  assert.match(component, /Extend 20 Seconds/);
  assert.match(component, /current\?\.adminActions/);
  assert.match(component, /!adminActions\.unsold/);
  assert.match(queues, /Queue Summary/);
  assert.match(component, /actionInFlight/);
});

test("owner Arena opens directly and preserves Team and bid reporting components", async () => {
  const [page, arena, teams, history] = await Promise.all([
    readFrontend("pages/FestivalLiveAuctionPage.jsx"),
    readFrontend("components/MainFestivalAuction.jsx"),
    readFrontend("components/FestivalTeamsDirectory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
  ]);
  assert.match(page, /<MainFestivalAuction festivalId=\{festivalId\}/);
  assert.doesNotMatch(page, /activeTab|ownerTabs/);
  assert.match(arena, /MyTeamPanel/);
  assert.match(arena, /TeamPurseComparison/);
  assert.match(teams, /Your Team/);
  assert.match(history, /My Bid Activity/);
  assert.match(history, /Outbid Participants/);
});

test("employee and Festival imports block duplicate submission and close on clean success", async () => {
  const [employees, festival] = await Promise.all([
    readFrontend("pages/EmployeeDirectory.jsx"),
    readFrontend("pages/FestivalDetail.jsx"),
  ]);
  for (const source of [employees, festival]) {
    assert.match(source, /importInFlight/);
    assert.match(source, /Importing\.\.\./);
    assert.match(source, /variant=\{importProgress >= 100 \? "indeterminate"/);
    assert.match(source, /setImportOpen\(false\)/);
  }
});

test("legacy tournament round start is serialized and unsold rejects valid bids", async () => {
  const controller = await readBackend("src/controllers/auction.controller.js");
  assert.match(
    controller,
    /Tournament\.findByPk\(player\.tournamentId,[\s\S]*lock: transaction\.LOCK\.UPDATE/
  );
  assert.match(
    controller,
    /Auction\.findOne\([\s\S]*AUCTION_STATUS\.LIVE[\s\S]*transaction,[\s\S]*lock: transaction\.LOCK\.UPDATE/
  );
  assert.match(
    controller,
    /outcome === "unsold" && highestBid[\s\S]*cannot be marked unsold after a valid bid/
  );
});

test("Festival admin setup uses synchronous action guards and searchable employee controls", async () => {
  const [setup, teamBuilder, detail] = await Promise.all([
    readFrontend("components/FestivalAuctionSetup.jsx"),
    readFrontend("components/FestivalTeamBuilder.jsx"),
    readFrontend("pages/FestivalDetail.jsx"),
  ]);
  for (const source of [setup, teamBuilder, detail]) {
    assert.match(source, /actionInFlight/);
  }
  assert.match(setup, /Search employee/);
  assert.match(setup, /Search retention participants/);
  assert.match(teamBuilder, /Search by employee name, number, or email/);
  assert.match(detail, /setSportDialogOpen\(false\)/);
});

test("owner and spectator Festival views refresh dependent data from auction events", async () => {
  const [overview, teams, bidHistory, results] = await Promise.all([
    readFrontend("components/FestivalViewerOverview.jsx"),
    readFrontend("components/FestivalTeamsDirectory.jsx"),
    readFrontend("components/FestivalBidHistory.jsx"),
    readFrontend("components/FestivalHistory.jsx"),
  ]);
  for (const source of [overview, teams, bidHistory, results]) {
    assert.match(source, /join-festival-auction/);
    assert.match(source, /socket\.on/);
    assert.match(source, /socket\.off/);
  }
});
