import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readBackend = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readFrontend = (path) =>
  readFile(
    new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url),
    "utf8"
  );

test("Festival expiry tolerates database deadline precision and retries early timers", async () => {
  const controller = await readBackend(
    "src/controllers/festivalLiveAuction.controller.js"
  );

  assert.match(controller, /DEADLINE_MATCH_TOLERANCE_MS = 1_500/);
  assert.match(
    controller,
    /Math\.abs\(storedDeadline - scheduledDeadline\)[\s\S]*DEADLINE_MATCH_TOLERANCE_MS/
  );
  assert.match(
    controller,
    /outcome: "not_due"[\s\S]*scheduleFestivalAuctionEnd\(result\.auctionId, result\.endsAt\)/
  );
  assert.match(controller, /remainingMs \+ 10/);
});

test("Current-state reads reconcile overdue live rounds to pending", async () => {
  const controller = await readBackend(
    "src/controllers/festivalLiveAuction.controller.js"
  );

  assert.match(
    controller,
    /auction\?\.status === "live"[\s\S]*auction\.endsAt[\s\S]*<= Date\.now\(\)[\s\S]*markFestivalAuctionPending\(auction\.id, auction\.endsAt\)/
  );
  assert.match(controller, /status: "pending", endsAt: null/);
});

test("Server exposes deterministic admin decisions from pending state", async () => {
  const controller = await readBackend(
    "src/controllers/festivalLiveAuction.controller.js"
  );

  assert.match(controller, /lifecycleState:[\s\S]*"ACTIVE"/);
  assert.match(controller, /"ADMIN_DECISION"/);
  assert.match(controller, /expiryState: awaitingAdminDecision \? "EXPIRED"/);
  assert.match(controller, /extend: awaitingAdminDecision/);
  assert.match(
    controller,
    /sell: awaitingAdminDecision && Boolean\(highestBid\)/
  );
  assert.match(
    controller,
    /unsold: awaitingAdminDecision && !highestBid/
  );
});

test("Expiry emits and receives observable lifecycle logs", async () => {
  const [controller, component] = await Promise.all([
    readBackend("src/controllers/festivalLiveAuction.controller.js"),
    readFrontend("components/MainFestivalAuction.jsx"),
  ]);

  for (const message of [
    "timer reached zero",
    "expiry processing started",
    "expiry processing completed",
    "socket event emitted",
  ]) {
    assert.match(controller, new RegExp(message));
  }
  assert.match(component, /socket event received/);
});

test("Admin controls use server actions and local zero triggers bounded reconciliation", async () => {
  const component = await readFrontend("components/MainFestivalAuction.jsx");

  assert.match(component, /current\?\.adminActions/);
  assert.match(component, /disabled=\{busy \|\| !adminActions\.extend\}/);
  assert.match(component, /disabled=\{busy \|\| !adminActions\.sell\}/);
  assert.match(component, /disabled=\{busy \|\| !adminActions\.unsold\}/);
  assert.match(component, /window\.setInterval\(confirmServerExpiry, 1000\)/);
  assert.match(component, /setExpiryConfirmationDelayed\(true\)/);
  assert.doesNotMatch(component, /Waiting for server expiry confirmation/);
});
