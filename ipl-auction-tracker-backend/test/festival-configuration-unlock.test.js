import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { festivalConfigurationLockSchema } from "../src/validation/festival.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackend = (path) =>
  readFile(resolve(__dirname, "..", path), "utf8");
const readFrontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("configuration lock confirmation accepts only explicit unlock values", () => {
  assert.equal(
    festivalConfigurationLockSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { confirmation: "UNLOCK" },
    }).success,
    true
  );
  assert.equal(
    festivalConfigurationLockSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { confirmation: "yes" },
    }).success,
    false
  );
});

test("unlock and relock routes are admin-only and audited", async () => {
  const [routes, controller, audit] = await Promise.all([
    readBackend("src/routes/festivalRoutes.js"),
    readBackend("src/controllers/festival.controller.js"),
    readBackend("src/utils/festivalAudit.js"),
  ]);
  assert.match(
    routes,
    /configuration\/unlock",\s*adminMiddleware,\s*validate\(festivalConfigurationLockSchema\)/s
  );
  assert.match(
    routes,
    /configuration\/relock",\s*adminMiddleware,\s*validate\(festivalConfigurationLockSchema\)/s
  );
  assert.match(controller, /festival_configuration_unlocked/);
  assert.match(controller, /festival_configuration_relocked/);
  assert.match(controller, /confirmation: expectedConfirmation/);
  assert.match(audit, /FestivalOperationAudit\.create/);
});

test("persisted lock state bypasses only approved lifecycle restrictions", async () => {
  const [migration, model, locking, festivalController] = await Promise.all([
    readBackend(
      "migrations/202606110001-festival-configuration-unlock.js"
    ),
    readBackend("src/models/festival.model.js"),
    readBackend("src/utils/festivalLocking.js"),
    readBackend("src/controllers/festival.controller.js"),
  ]);
  assert.match(migration, /configurationLockState/);
  assert.match(model, /DataTypes\.ENUM\("locked", "unlocked"\)/);
  assert.match(locking, /overrideActive/);
  assert.match(locking, /allowWhenUnlocked/);
  assert.match(
    festivalController,
    /section: "Festival Sports",\s*allowWhenUnlocked: false/s
  );
  assert.match(
    festivalController,
    /section: "Roster formation mode",\s*allowWhenUnlocked: false/s
  );
});

test("configuration mutations audit changes and protect sold auction state", async () => {
  const [festival, teams, auctionSetup] = await Promise.all([
    readBackend("src/controllers/festival.controller.js"),
    readBackend("src/controllers/festivalTeam.controller.js"),
    readBackend("src/controllers/festivalMainAuction.controller.js"),
  ]);
  assert.match(festival, /festival_participants_added/);
  assert.match(festival, /festival_participants_removed/);
  assert.match(
    festival,
    /Sold participants and auction roster assignments cannot be removed/
  );
  assert.match(teams, /festival_team_updated/);
  assert.match(
    teams,
    /A team with sold auction assignments cannot be deactivated/
  );
  assert.match(auctionSetup, /festival_owner_changed/);
  assert.match(auctionSetup, /festival_retention_updated/);
  assert.match(auctionSetup, /festival_budget_updated/);
  assert.match(
    auctionSetup,
    /Festival budget is read-only after a participant has been sold/
  );
  assert.match(auctionSetup, /budgetReadOnly: soldResultCount > 0/);
  assert.match(auctionSetup, /A sold participant cannot be assigned as an owner/);
  assert.match(auctionSetup, /A sold participant cannot be retained/);
  assert.doesNotMatch(
    auctionSetup,
    /FestivalAuctionResult\.(update|destroy)/
  );
});

test("admin UI exposes status, confirmation, details editing, and relocking", async () => {
  const [detail, status, details, setup, teams] = await Promise.all([
    readFrontend("src/pages/FestivalDetail.jsx"),
    readFrontend("src/components/FestivalConfigurationStatus.jsx"),
    readFrontend("src/components/FestivalDetailsConfiguration.jsx"),
    readFrontend("src/components/FestivalAuctionSetup.jsx"),
    readFrontend("src/components/FestivalTeamBuilder.jsx"),
  ]);
  assert.match(detail, /FestivalConfigurationStatus/);
  assert.match(detail, /lifecycleLocked/);
  assert.match(status, /Configuration Status/);
  assert.match(status, /Unlock Configuration/);
  assert.match(status, /Relock Configuration/);
  assert.match(status, /confirmation !== expected/);
  assert.match(details, /Save Festival Details/);
  assert.match(setup, /const setupLocked = locked/);
  assert.match(setup, /budgetReadOnly/);
  assert.match(teams, /const teamConfigurationLocked =\s*locked/s);
});
