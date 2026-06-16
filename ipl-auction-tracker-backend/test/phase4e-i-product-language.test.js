import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(path.join(root, "ipl-auction-tracker", relativePath), "utf8");

test("Phase 4E-I uses user-facing navigation names", async () => {
  const [navigation, shell] = await Promise.all([
    frontend("src/components/AuctionContextNavigation.jsx"),
    frontend("src/components/AppShell.jsx"),
  ]);

  for (const label of [
    "Overview",
    "Setup",
    "Auction Details",
    "Live Auction",
    "Results",
    "Festival Overview",
    "Sport Tournament Setup",
  ]) {
    assert.match(`${navigation}\n${shell}`, new RegExp(label));
  }

  assert.doesNotMatch(navigation, /Command Center|Auction Hub|Arena/);
});

test("Phase 4E-I rewrites dashboard action language", async () => {
  const [admin, owner, captain, spectator] = await Promise.all([
    frontend("src/components/ProductDashboard/AdminProductDashboard.jsx"),
    frontend("src/components/ProductDashboard/OwnerProductDashboard.jsx"),
    frontend("src/components/ProductDashboard/CaptainProductDashboard.jsx"),
    frontend("src/components/ProductDashboard/SpectatorProductDashboard.jsx"),
  ]);
  const source = `${admin}\n${owner}\n${captain}\n${spectator}`;

  for (const label of [
    "Action Required",
    "View Active Auctions",
    "Open Live Auction",
    "View Auction Details",
    "Fix Setup Issues",
    "Festival Progress",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.doesNotMatch(source, /Needs Attention|Open Arena|Open Auction Hub|Resolve Blockers|Festival Journey|Operate the Festival journey/);
});

test("Phase 4E-I rewrites live-auction status and control wording", async () => {
  const source = await Promise.all([
    frontend("src/components/FestivalAuctionArena/ArenaHeader.jsx"),
    frontend("src/components/SportAuctionArena/SportArenaHeader.jsx"),
    frontend("src/components/FestivalAuctionArena/ParticipantStage.jsx"),
    frontend("src/components/SportAuctionArena/SportParticipantStage.jsx"),
    frontend("src/components/MainFestivalAuction.jsx"),
    frontend("src/components/SportAuctionArena/SportRoleControls.jsx"),
  ]).then((files) => files.join("\n"));

  for (const label of [
    "Players Auctioned",
    "Waiting for Confirmation",
    "Auction Controls",
    "Select Next Participant",
    "Mark Unsold",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.doesNotMatch(source, /Pending Finalization|Auction Lifecycle|Round Controls|Auction Progress/);
});

test("Phase 4E-I documents the terminology standards", async () => {
  const document = await fs.readFile(
    path.join(root, "PHASE_4E_I_PRODUCT_LANGUAGE_AUDIT.md"),
    "utf8",
  );

  for (const section of [
    "Full Terminology Inventory",
    "Global Naming Dictionary",
    "Navigation Naming Standards",
    "Button Naming Standards",
    "Status Naming Standards",
    "Future Wording Guidelines",
  ]) {
    assert.match(document, new RegExp(section));
  }
});
