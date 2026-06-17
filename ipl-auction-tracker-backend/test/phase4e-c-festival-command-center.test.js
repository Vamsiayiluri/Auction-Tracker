import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4E-C makes the Festival Command Center the operational Festival home", async () => {
  const [directory, commandCenter] = await Promise.all([
    frontend("src/pages/FestivalDashboard.jsx"),
    frontend("src/pages/FestivalCommandCenter.jsx"),
  ]);

  assert.match(directory, /\/festivals\/\$\{festival\.id\}\/command-center/);
  assert.match(commandCenter, /Festival Overview/);
  assert.match(commandCenter, /Festival: \$\{formatStatus/);
  assert.match(commandCenter, /getStageLabel\(festivalStage\)/);
});

test("Phase 4E-C keeps the Festival home stage-aware and setup-first", async () => {
  const commandCenter = await frontend(
    "src/pages/FestivalCommandCenter.jsx"
  );

  for (const section of [
    "Setup Progress",
    "Setup Issues",
    "Sport Tournament Status",
    "Continue Festival Setup",
  ]) {
    assert.match(commandCenter, new RegExp(section));
  }

  assert.match(commandCenter, /AuctionContextNavigation/);
  assert.match(commandCenter, /stage=\{festivalStage\}/);
  assert.match(commandCenter, /\/festivals\/\$\{festivalId\}\/results/);
  assert.doesNotMatch(commandCenter, /Competition Setup/);
});

test("Phase 4E-C keeps setup actions separate from live Auction actions", async () => {
  const commandCenter = await frontend(
    "src/pages/FestivalCommandCenter.jsx"
  );

  for (const action of [
    "Continue Setup",
    "Refresh Setup Check",
    "Create Sport Tournament",
    "Launch Festival Auction",
  ]) {
    assert.match(commandCenter, new RegExp(action));
  }

  assert.match(commandCenter, /\/auctions\/festivals\/\$\{festivalId\}/);
  assert.match(commandCenter, /sportArenaRoute/);
  assert.match(commandCenter, /\/festivals\/\$\{festivalId\}\/manage/);
  assert.match(
    commandCenter,
    /\/sport-tournaments\?festivalId=\$\{festivalId\}&create=1/
  );
  assert.doesNotMatch(commandCenter, /\/competitions|\/fixtures|\/matches/);
});

test("Phase 4E-C categorizes actionable Festival and Sport blockers", async () => {
  const commandCenter = await frontend(
    "src/pages/FestivalCommandCenter.jsx"
  );

  for (const blocker of [
    "Missing Owners",
    "Missing Captains",
    "Missing Budgets",
    "Pool Not Generated",
    "Tournament Not Ready",
  ]) {
    assert.match(commandCenter, new RegExp(blocker));
  }

  assert.match(commandCenter, /festivalReadiness\?\.blockers/);
  assert.match(commandCenter, /tournament\.readiness\?\.blockers/);
  assert.match(commandCenter, /severity="warning"/);
});

test("Phase 4E-C aggregates existing read APIs and preserves server permissions", async () => {
  const hook = await frontend(
    "src/hooks/useFestivalCommandCenterData.js"
  );

  for (const endpoint of [
    "auction/readiness",
    "auction/current",
    "auction/history",
    'api.get("/v2/sport-tournaments")',
    "/readiness",
  ]) {
    assert.match(
      hook,
      new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }

  assert.match(hook, /tournament\.permissions\?\.canManage/);
  assert.match(hook, /Promise\.allSettled/);
  assert.doesNotMatch(hook, /api\.(?:post|patch|put|delete)/);
  assert.doesNotMatch(hook, /\/competitions|\/fixtures|\/matches/);
});

test("Phase 4E-C Create Sport Tournament action reuses the existing authorized dialog", async () => {
  const directory = await frontend(
    "src/pages/SportTournamentDirectory.jsx"
  );

  assert.match(directory, /useSearchParams/);
  assert.match(directory, /searchParams\.get\("create"\) !== "1"/);
  assert.match(directory, /searchParams\.get\("festivalId"\)/);
  assert.match(directory, /if \(\s*!canCreate/);
  assert.match(directory, /setDialogOpen\(true\)/);
});
