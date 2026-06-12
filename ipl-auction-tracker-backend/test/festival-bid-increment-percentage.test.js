import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getFestivalBidProgression } from "../src/utils/festivalBidProgression.js";
import { updateFestivalAuctionConfigSchema } from "../src/validation/festival.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackend = (path) =>
  readFile(resolve(__dirname, "..", path), "utf8");
const readFrontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Festival percentage validation accepts only 20 and 25", () => {
  for (const incrementPercentage of [20, 25]) {
    assert.equal(
      updateFestivalAuctionConfigSchema.safeParse({
        params: { festivalId: "festival-1" },
        body: { incrementPercentage },
      }).success,
      true
    );
  }
  for (const incrementPercentage of [10, 21, 30]) {
    assert.equal(
      updateFestivalAuctionConfigSchema.safeParse({
        params: { festivalId: "festival-1" },
        body: { incrementPercentage },
      }).success,
      false
    );
  }
});

test("Festival progression does not compound", () => {
  const bids = [100, 120, 140, 160, 180];
  bids.forEach((currentBid, index) => {
    const progression = getFestivalBidProgression({
      basePrice: 100,
      currentBid,
      incrementPercentage: 20,
    });
    assert.equal(progression.incrementAmount, 20);
    assert.equal(progression.nextBid, bids[index + 1] || 200);
  });

  assert.deepEqual(
    getFestivalBidProgression({
      basePrice: 20_000,
      currentBid: 32_000,
      incrementPercentage: 20,
    }),
    {
      basePrice: 20_000,
      incrementPercentage: 20,
      incrementAmount: 4_000,
      currentBid: 32_000,
      nextBid: 36_000,
    }
  );
});

test("Festival config migration removes profiles and adds percentage", async () => {
  const [migration, model] = await Promise.all([
    readBackend(
      "migrations/202606110002-festival-bid-increment-percentage.js"
    ),
    readBackend("src/models/festivalAuctionConfig.model.js"),
  ]);
  assert.match(migration, /incrementPercentage/);
  assert.match(migration, /removeColumn\(TABLE, "incrementProfile"\)/);
  assert.match(migration, /removeColumn\(TABLE, "customIncrementRules"\)/);
  assert.match(model, /incrementPercentage/);
  assert.doesNotMatch(model, /incrementProfile|customIncrementRules/);
});

test("Festival API exposes the complete progression and uses it for bids", async () => {
  const [controller, configController] = await Promise.all([
    readBackend("src/controllers/festivalLiveAuction.controller.js"),
    readBackend("src/controllers/festivalMainAuction.controller.js"),
  ]);
  for (const field of [
    "basePrice",
    "incrementPercentage",
    "incrementAmount",
    "currentBid",
    "nextBid",
  ]) {
    assert.match(controller, new RegExp(field));
  }
  assert.match(controller, /const amount = progression\.nextBid/);
  assert.match(configController, /incrementPercentage/);
  assert.doesNotMatch(controller, /incrementProfile|customIncrementRules/);
});

test("Festival UI uses percentage setup and keeps owner bidding one-click", async () => {
  const [setup, live] = await Promise.all([
    readFrontend("src/components/FestivalAuctionSetup.jsx"),
    readFrontend("src/components/MainFestivalAuction.jsx"),
  ]);
  assert.match(setup, /Bid Increment Percentage/);
  assert.match(setup, /<MenuItem value=\{20\}>20%<\/MenuItem>/);
  assert.match(setup, /<MenuItem value=\{25\}>25%<\/MenuItem>/);
  assert.doesNotMatch(setup, /Increment Profile|conservative|aggressive/);
  assert.match(live, /current\.incrementPercentage/);
  assert.match(live, /current\.incrementAmount/);
  assert.match(live, />\s*Place Bid\s*<\/Button>/s);
  assert.doesNotMatch(live, /label="Bid Amount"/);
});
