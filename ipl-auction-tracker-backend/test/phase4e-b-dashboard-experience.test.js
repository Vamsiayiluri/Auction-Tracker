import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4E-B routes Dashboard users by role and server-derived Captain capability", async () => {
  const dashboard = await frontend("src/pages/Dashboard.jsx");

  assert.match(dashboard, /AdminProductDashboard/);
  assert.match(dashboard, /OwnerProductDashboard/);
  assert.match(dashboard, /CaptainProductDashboard/);
  assert.match(dashboard, /SpectatorProductDashboard/);
  assert.match(dashboard, /tournament\.permissions\?\.canBid/);
  assert.match(dashboard, /user\.role === "team_owner"/);
  assert.match(dashboard, /user\.role === "spectator"/);
});

test("Phase 4E-B Admin Dashboard prioritizes approved action sections", async () => {
  const admin = await frontend(
    "src/components/ProductDashboard/AdminProductDashboard.jsx"
  );

  for (const section of [
    "Action Required",
    "Live Now",
    "Festival Progress",
    "Next Actions",
    "Recent Outcomes",
  ]) {
    assert.match(admin, new RegExp(section));
  }
  assert.match(admin, /Waiting for Confirmation/);
  assert.match(admin, /readiness\.blockers/);
  assert.match(admin, /tournament\.status === "ready"/);
  assert.doesNotMatch(admin, /StatCard|Total Festivals|Total Auctions/);
});

test("Phase 4E-B Owner and Captain Dashboards expose assignment-aware actions", async () => {
  const [owner, captain] = await Promise.all([
    frontend("src/components/ProductDashboard/OwnerProductDashboard.jsx"),
    frontend("src/components/ProductDashboard/CaptainProductDashboard.jsx"),
  ]);

  for (const section of [
    "Primary Action",
    "My Festival Team",
    "Sport Tournaments I Manage",
    "What Is Next",
  ]) {
    assert.match(owner, new RegExp(section));
  }
  assert.match(owner, /permissions\?\.canManage/);
  assert.match(owner, /CaptainProductDashboard/);

  for (const section of [
    "My Captain Assignments",
    "Active Sport Auctions",
    "My Sport Teams",
    "Upcoming Competitions",
  ]) {
    assert.match(captain, new RegExp(section));
  }
  assert.match(captain, /permissions\?\.canBid/);
  assert.match(captain, /Competition setup is planned for a later phase/);
  assert.doesNotMatch(captain, /\/competitions/);
});

test("Phase 4E-B Spectator Dashboard prioritizes live discovery and results", async () => {
  const spectator = await frontend(
    "src/components/ProductDashboard/SpectatorProductDashboard.jsx"
  );

  for (const section of [
    "Live Now",
    "Upcoming",
    "Recent Results",
    "Festivals",
  ]) {
    assert.match(spectator, new RegExp(section));
  }
  assert.match(spectator, /View Auction Details/);
  assert.match(spectator, /\/festivals\/\$\{festival\.id\}\/auction-hub/);
  assert.match(spectator, /\/sport-tournaments\/\$\{tournament\.id\}\/auction-hub/);
});

test("Phase 4E-B reuses existing APIs without backend or Competition dependencies", async () => {
  const hook = await frontend(
    "src/components/ProductDashboard/useProductDashboardData.js"
  );

  for (const endpoint of [
    'api.get("/v2/festivals")',
    'api.get("/v2/sport-tournaments")',
    'api.get("/v2/sport-tournaments/owner-contexts")',
    "auction/current",
    "auction/readiness",
    "auction/history",
  ]) {
    assert.match(hook, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(hook, /Promise\.allSettled/);
  assert.match(hook, /tournament\.permissions\?\.canBid/);
  assert.match(hook, /tournament\.permissions\?\.canManage/);
  assert.doesNotMatch(hook, /api\.(?:post|patch|put|delete)/);
  assert.doesNotMatch(hook, /\/competitions|\/fixtures|\/matches/);
});
