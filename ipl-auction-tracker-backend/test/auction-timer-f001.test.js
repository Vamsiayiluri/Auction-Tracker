import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("F-001 migration and model persist auction start and deadline timestamps", async () => {
  const [migration, auctionModel] = await Promise.all([
    readBackendFile("migrations/202606080003-auction-timer-persistence.js"),
    readBackendFile("src/models/auction.model.js"),
  ]);

  assert.match(migration, /addColumnIfMissing\(queryInterface, "Auctions", "startedAt"/);
  assert.match(migration, /addColumnIfMissing\(queryInterface, "Auctions", "endsAt"/);
  assert.match(auctionModel, /startedAt:\s*\{\s*type: DataTypes\.DATE/s);
  assert.match(auctionModel, /endsAt:\s*\{\s*type: DataTypes\.DATE/s);
});

test("auction start stores startedAt and endsAt before scheduling the timer", async () => {
  const controller = await readBackendFile("src/controllers/auction.controller.js");
  const startAuction = controller.slice(controller.indexOf("export const startAuction"));

  assert.match(startAuction, /const startedAt = new Date\(\);/);
  assert.match(
    startAuction,
    /const endsAt = new Date\(startedAt\.getTime\(\) \+ AUCTION_DURATION_MS\);/
  );
  assert.match(startAuction, /Auction\.create\(\{\s*id: auctionId,[\s\S]*startedAt,[\s\S]*endsAt,/);
  assert.match(startAuction, /scheduleAuctionEnd\(player\.id, endsAt\);/);
});

test("timer reset and extension persist the new deadline", async () => {
  const controller = await readBackendFile("src/controllers/auction.controller.js");
  const resetTimer = controller.slice(
    controller.indexOf("export const resetAuctionTimer"),
    controller.indexOf("export const isBiddingOpen")
  );
  const extendAuction = controller.slice(controller.indexOf("export const extendAuction"));

  assert.match(resetTimer, /const endsAt = new Date\(Date\.now\(\) \+ AUCTION_DURATION_MS\);/);
  assert.match(resetTimer, /Auction\.update\(\s*\{\s*status: AUCTION_STATUS\.LIVE,\s*endsAt\s*\}/);
  assert.match(resetTimer, /scheduleAuctionEnd\(playerId, endsAt\);/);
  assert.match(extendAuction, /const endsAt = await resetAuctionTimer\(req\.params\.playerId\);/);
});

test("bidding and current auction reads use persisted endsAt", async () => {
  const controller = await readBackendFile("src/controllers/auction.controller.js");
  const biddingOpen = controller.slice(
    controller.indexOf("export const isBiddingOpen"),
    controller.indexOf("export const restoreAuctionTimers")
  );
  const currentPlayer = controller.slice(
    controller.indexOf("export const getCurrentPlayerInAuction")
  );

  assert.match(biddingOpen, /const deadline = getAuctionDeadline\(liveAuction\);/);
  assert.doesNotMatch(biddingOpen, /auctionTimers\.get/);
  assert.match(currentPlayer, /endsAt: liveAuction\.endsAt \|\| null/);
});

test("startup recovery restores persisted deadlines and expires overdue auctions", async () => {
  const controller = await readBackendFile("src/controllers/auction.controller.js");
  const restoreTimers = controller.slice(
    controller.indexOf("export const restoreAuctionTimers"),
    controller.indexOf("export const startAuction")
  );

  assert.match(restoreTimers, /where: \{ status: AUCTION_STATUS\.LIVE \}/);
  assert.match(restoreTimers, /const endsAt = getAuctionDeadline\(auction\);/);
  assert.match(restoreTimers, /if \(!endsAt \|\| endsAt\.getTime\(\) <= Date\.now\(\)\) \{/);
  assert.match(restoreTimers, /await markAuctionPendingFinalization\(player\.id\);/);
  assert.match(restoreTimers, /scheduleAuctionEnd\(player\.id, endsAt\);/);
  assert.doesNotMatch(restoreTimers, /Date\.now\(\) \+ AUCTION_DURATION_MS/);
});
