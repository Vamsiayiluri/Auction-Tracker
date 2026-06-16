import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  festivalAuctionBidSchema,
  festivalAuctionLifecycleSchema,
  festivalAuctionParticipantSchema,
} from "../src/validation/festival.validation.js";
import { calculateFestivalTeamBudget } from "../src/utils/festivalAuctionBudget.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Phase 3B includes auction spending in remaining purse", () => {
  assert.deepEqual(
    calculateFestivalTeamBudget({
      totalBudget: 20_000_000,
      ownerCost: 2_000_000,
      retentionAmounts: [500_000],
      auctionAmounts: [700_000, 800_000],
    }),
    {
      totalBudget: 20_000_000,
      ownerCost: 2_000_000,
      retentionSpent: 500_000,
      auctionSpent: 1_500_000,
      spentBudget: 4_000_000,
      remainingBudget: 16_000_000,
    }
  );
});

test("Phase 3B validates lifecycle, participant, and bid commands", () => {
  assert.equal(
    festivalAuctionLifecycleSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {},
    }).success,
    true
  );
  assert.equal(
    festivalAuctionParticipantSchema.safeParse({
      params: {
        festivalId: "festival-1",
        participantId: "participant-1",
      },
      body: {},
    }).success,
    true
  );
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        auctionId: "auction-1",
        expectedCurrentBid: 700000,
      },
    }).success,
    true
  );
  assert.equal(
    festivalAuctionBidSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { amount: 700000 },
    }).success,
    false
  );
});

test("Phase 3B migration is additive and isolated from legacy auctions", async () => {
  const migration = await readBackendFile(
    "migrations/202606100001-main-festival-live-auction.js"
  );

  assert.match(migration, /const AUCTIONS_TABLE = "FestivalAuctions"/);
  assert.match(migration, /const BIDS_TABLE = "FestivalAuctionBids"/);
  assert.match(migration, /const RESULTS_TABLE = "FestivalAuctionResults"/);
  assert.match(migration, /const ensureTable = async/);
  assert.match(migration, /await createAuctionTables/);
  assert.match(migration, /"auctionStatus"/);
  assert.match(migration, /"currentParticipantId"/);
  assert.match(migration, /festival_auction_bids_auction_amount_uq/);
  assert.match(migration, /festival_auction_results_festival_participant_uq/);
  assert.doesNotMatch(
    migration,
    /(?:addColumn|changeColumn|createTable)\("(?:Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
});

test("Phase 3B routes enforce admin lifecycle and server-derived owner bids", async () => {
  const routes = await readBackendFile("src/routes/festivalRoutes.js");
  const controller = await readBackendFile(
    "src/controllers/festivalLiveAuction.controller.js"
  );

  [
    "auction/start",
    "auction/pause",
    "auction/resume",
    "auction/complete",
    "auction/participants/:participantId/start",
    "auction/participants/:participantId/sell",
    "auction/participants/:participantId/unsold",
    "auction/bid",
    "auction/current",
    "auction/history",
  ].forEach((path) => assert.match(routes, new RegExp(path)));
  assert.match(routes, /"\/:festivalId\/auction\/start",\s*adminMiddleware/s);
  assert.match(
    routes,
    /"\/:festivalId\/auction\/participants\/:participantId\/sell",\s*adminMiddleware/s
  );
  assert.match(controller, /findOwnerForUser/);
  assert.match(controller, /where: \{ userId \}/);
  assert.doesNotMatch(controller, /req\.body\.(?:teamId|ownerId)/);
});

test("Phase 3B serializes bids and sale finalization through transactions", async () => {
  const controller = await readBackendFile(
    "src/controllers/festivalLiveAuction.controller.js"
  );

  assert.match(controller, /sequelize\.transaction/);
  assert.match(controller, /lock: transaction\.LOCK\.UPDATE/);
  assert.match(controller, /getBidProgression/);
  assert.match(controller, /Bid exceeds the team's remaining purse/);
  assert.match(controller, /Winning team no longer has sufficient purse/);
  assert.match(controller, /FestivalTeamMembership\.create/);
  assert.match(controller, /rosterSource: "auction"/);
  assert.match(controller, /FestivalAuctionResult\.create/);
  assert.match(controller, /FestivalAuctionPool\.destroy/);
  assert.match(controller, /Participant is already finalized/);
});

test("Phase 3B uses authenticated festival rooms and required events", async () => {
  const [server, controller, socketClient] = await Promise.all([
    readBackendFile("src/index.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
    readRepoFile("ipl-auction-tracker/src/webSocket/socket.js"),
  ]);

  assert.match(server, /join-festival-auction/);
  assert.match(server, /Festival\.findByPk/);
  assert.match(server, /festival-auction:\$\{festival\.id\}/);
  assert.match(socketClient, /socket\.auth = \{ token \}/);
  [
    "participant-started",
    "bid-placed",
    "participant-sold",
    "participant-unsold",
    "auction-paused",
    "auction-resumed",
    "auction-completed",
  ].forEach((eventName) =>
    assert.match(controller, new RegExp(`"${eventName}"`))
  );
});

test("Phase 3B UI behavior is preserved in the dedicated Festival Arena", async () => {
  const [component, detail, page, directory, app, participant, recent] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/MainFestivalAuction.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalLiveAuctionPage.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalAuctionDirectory.jsx"),
    readRepoFile("ipl-auction-tracker/src/App.jsx"),
    readRepoFile(
      "ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx"
    ),
    readRepoFile(
      "ipl-auction-tracker/src/components/FestivalAuctionArena/RecentResultsStrip.jsx"
    ),
  ]);

  assert.doesNotMatch(detail, /<MainFestivalAuction/);
  assert.match(detail, /Open Auction Arena/);
  assert.match(page, /<MainFestivalAuction/);
  assert.match(app, /festivals\/:festivalId\/live-auction/);
  assert.match(app, /auctions\/festivals\/:festivalId/);
  assert.match(app, /festival-auctions/);
  assert.match(directory, /Open Main Auction/);
  assert.match(component, /Start Auction/);
  assert.match(component, /Start Round/);
  assert.match(component, /Place Bid/);
  assert.match(participant, /Current Participant/);
  assert.match(recent, /Recent Results/);
  assert.match(component, /join-festival-auction/);
  assert.doesNotMatch(
    component,
    /sport auction|cricket team|volleyball team|throwball team|captain/i
  );
});
