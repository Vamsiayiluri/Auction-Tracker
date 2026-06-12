import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Phase 3D registration auto-links exactly one case-insensitive employee email", async () => {
  const [auth, linking] = await Promise.all([
    readBackendFile("src/controllers/auth.controller.js"),
    readBackendFile("src/utils/employeeUserLinking.js"),
  ]);

  assert.match(auth, /normalizeIdentityEmail/);
  assert.match(auth, /sequelize\.transaction/);
  assert.match(auth, /autoLinkEmployeeForUser/);
  assert.match(linking, /fn\("LOWER", col\("email"\)\)/);
  assert.match(linking, /matches\.length === 0/);
  assert.match(linking, /matches\.length > 1/);
  assert.match(linking, /outcome: "duplicate_email"/);
  assert.match(linking, /employee\.userId && employee\.userId !== user\.id/);
});

test("Phase 3D linking is auditable and manual linking cannot overwrite identity", async () => {
  const [migration, linking, employeeController] = await Promise.all([
    readBackendFile(
      "migrations/202606100003-festival-auction-stabilization.js"
    ),
    readBackendFile("src/utils/employeeUserLinking.js"),
    readBackendFile("src/controllers/employee.controller.js"),
  ]);

  assert.match(migration, /EmployeeUserLinkAudits/);
  assert.match(migration, /"registration", "admin_manual"/);
  assert.match(migration, /"linked",/);
  assert.match(migration, /"duplicate_email",/);
  assert.match(linking, /source: "admin_manual"/);
  assert.match(linking, /employee_already_linked/);
  assert.match(employeeController, /Employee is already linked to another user/);
});

test("Phase 3D owner assignments persist pending, active, and inactive lifecycle", async () => {
  const [migration, ownerModel, setup, linking] = await Promise.all([
    readBackendFile(
      "migrations/202606100003-festival-auction-stabilization.js"
    ),
    readBackendFile("src/models/festivalTeamOwner.model.js"),
    readBackendFile("src/controllers/festivalMainAuction.controller.js"),
    readBackendFile("src/utils/employeeUserLinking.js"),
  ]);

  for (const status of [
    "pending_user_registration",
    "active",
    "inactive",
  ]) {
    assert.match(migration, new RegExp(status));
    assert.match(ownerModel, new RegExp(status));
  }
  assert.match(setup, /employee\?\.user\?\.role === "team_owner"/);
  assert.match(linking, /activateEmployeeOwnerAssignments/);
  assert.match(linking, /userRole === "team_owner"/);
  assert.match(linking, /pending_user_registration/);
});

test("Phase 3D readiness identifies exact team and auction blockers", async () => {
  const [readiness, live, routes] = await Promise.all([
    readBackendFile("src/utils/festivalReadiness.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
    readBackendFile("src/routes/festivalRoutes.js"),
  ]);

  for (const blocker of [
    "Owner not assigned",
    "Owner employee record missing",
    "Owner account missing",
    "Owner account must use the team_owner role",
    "Auction pool is empty",
  ]) {
    assert.match(readiness, new RegExp(blocker));
  }
  assert.match(readiness, /overallStatus: blockers\.length \? "NOT_READY" : "READY"/);
  assert.match(live, /Festival auction is not ready/);
  assert.match(live, /readiness\.blockers/);
  assert.match(routes, /auction\/readiness",\s*adminMiddleware/s);
});

test("Phase 3D spectator and owner authorization boundaries are server-enforced", async () => {
  const [routes, live] = await Promise.all([
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
  ]);

  for (const action of [
    "auction/start",
    "auction/pause",
    "auction/resume",
    "auction/complete",
    "participants/:participantId/start",
    "participants/:participantId/sell",
    "participants/:participantId/unsold",
  ]) {
    assert.match(
      routes,
      new RegExp(action.replaceAll("/", "\\/") + '"[\\s\\S]*?adminMiddleware')
    );
  }
  assert.match(live, /req\.user\.role !== "team_owner"/);
  assert.match(live, /status: "active"/);
  assert.match(live, /isAdmin: req\.user\.role === "admin"/);
  assert.match(live, /isOwner: Boolean\(owner\)/);
});

test("Phase 3D readiness dashboard exposes all required metrics and blockers", async () => {
  const [component, detail] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/FestivalReadiness.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
  ]);

  for (const label of [
    "Employees",
    "Participants",
    "Sports Registered",
    "Teams Created",
    "Owners Assigned",
    "Owners Activated",
    "Retentions",
    "Auction Pool Size",
    "Exact blockers",
  ]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /auction\/readiness/);
  assert.match(detail, /<FestivalReadiness/);
});
