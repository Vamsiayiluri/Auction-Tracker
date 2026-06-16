import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuctionSynchronizationService } from "../src/utils/auctionSynchronization.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const backend = (path) => readFile(resolve(__dirname, "..", path), "utf8");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("shared synchronization service emits authoritative revisioned snapshots", async () => {
  const emitted = [];
  const io = {
    to: (room) => ({
      emit: (event, payload) => emitted.push({ room, event, payload }),
    }),
  };
  const service = createAuctionSynchronizationService({
    io,
    scopeType: "festival",
    roomName: (id) => `festival-auction:${id}`,
    loadSnapshot: async () => ({
      state: { current: { endsAt: "2026-06-14T12:00:20.000Z" } },
      history: [{ id: "round-1" }],
      audits: [],
    }),
  });

  const first = await service.publish("festival-1", "bid-placed");
  const second = await service.publish("festival-1", "auction-extended");

  assert.equal(first.deadlineAt, "2026-06-14T12:00:20.000Z");
  assert.ok(second.revision > first.revision);
  assert.equal(emitted[0].room, "festival-auction:festival-1");
  assert.equal(emitted[0].event, "auction-state");
  assert.deepEqual(emitted[0].payload.history, [{ id: "round-1" }]);
});

test("Festival and Sport mutations publish full state after every live action", async () => {
  const [festival, sport] = await Promise.all([
    backend("src/controllers/festivalLiveAuction.controller.js"),
    backend("src/controllers/sportLiveAuction.controller.js"),
  ]);
  for (const reason of [
    "auction-started",
    "auction-paused",
    "auction-resumed",
    "auction-extended",
    "auction-pending-finalization",
    "auction-completed",
    "participant-started",
    "bid-placed",
    "participants-reauctioned",
  ]) {
    assert.match(festival, new RegExp(`"${reason}"`));
    assert.match(sport, new RegExp(`"${reason}"`));
  }
  assert.match(festival, /publishFestivalAuctionState/);
  assert.match(sport, /publishSportAuctionState/);
  assert.match(festival, /history: auctions\.map/);
  assert.match(sport, /history: rounds\.map/);
});

test("room joins immediately push current Festival and Sport state", async () => {
  const server = await backend("src/index.js");
  assert.match(
    server,
    /join-festival-auction[\s\S]*sendFestivalAuctionStateToSocket/
  );
  assert.match(
    server,
    /join-sport-auction[\s\S]*sendSportAuctionStateToSocket/
  );
  assert.match(server, /acknowledge\?\.\(\{\s*success: true/s);
});

test("all live auction clients consume the same auction-state payload", async () => {
  const files = await Promise.all([
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/components/FestivalViewerOverview.jsx"),
    frontend("src/components/FestivalTeamsDirectory.jsx"),
    frontend("src/components/FestivalBidHistory.jsx"),
    frontend("src/components/FestivalHistory.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
  ]);
  for (const source of files) {
    assert.match(source, /socket\.on\("auction-state"/);
    assert.match(source, /socket\.on\("connect"/);
    assert.match(source, /join-(?:festival|sport)-auction/);
  }
  assert.match(files[0], /getAuctionRemainingSeconds/);
  assert.match(files[5], /getAuctionRemainingSeconds/);
});
