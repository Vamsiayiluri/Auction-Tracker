import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bulkAddFestivalParticipantsSchema,
  bulkRemoveFestivalParticipantsSchema,
  bulkParticipantSportsSchema,
  registerParticipantSportSchema,
} from "../src/validation/festival.validation.js";
import {
  createEmployeeSchema,
  listEmployeesSchema,
} from "../src/validation/employee.validation.js";
import {
  normalizeEmployeeNumber,
  parseFestivalParticipantCsv,
} from "../src/utils/festivalParticipantImport.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const enabledSportIds = [
  "chess",
  "badminton",
  "carrom",
  "tt",
  "cricket",
  "volleyball",
  "throwball",
];

test("Phase 2 validates employee and sport registration payloads", () => {
  assert.equal(
    createEmployeeSchema.safeParse({
      body: {
        employeeNumber: "emp001",
        name: "John",
        email: "john@example.com",
        department: "Finance",
      },
    }).success,
    true
  );
  assert.equal(
    listEmployeesSchema.safeParse({ query: { page: "1", pageSize: "25" } })
      .success,
    true
  );
  assert.equal(
    registerParticipantSportSchema.safeParse({
      params: { festivalId: "festival-1", participantId: "participant-1" },
      body: { sportId: "cricket" },
    }).success,
    true
  );
  assert.equal(
    bulkParticipantSportsSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        participantId: "participant-1",
        sports: ["cricket", "cricket"],
      },
    }).success,
    false
  );
  assert.equal(normalizeEmployeeNumber(" emp001 "), "EMP001");
  assert.equal(
    bulkAddFestivalParticipantsSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { employeeIds: ["employee-1", "employee-1"] },
    }).success,
    true
  );
  assert.equal(
    bulkRemoveFestivalParticipantsSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { participantIds: [] },
    }).success,
    false
  );
});

test("Phase 2 import parses EmployeeNumber and case-insensitive Yes/No", () => {
  const result = parseFestivalParticipantCsv(
    [
      "EmployeeNumber,Name,Email,Department,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball",
      "emp001,John,john@example.com,Finance,YES,no,No,nO,yes,Yes,NO",
    ].join("\n"),
    enabledSportIds
  );

  assert.equal(result.processed, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].employee.employeeNumber, "EMP001");
  assert.deepEqual(result.rows[0].selectedSportIds, [
    "chess",
    "cricket",
    "volleyball",
  ]);
  assert.ok(result.rows[0].deselectedSportIds.includes("throwball"));
});

test("Phase 2 import reports malformed, duplicate, and disabled sport rows", () => {
  const result = parseFestivalParticipantCsv(
    [
      "EmployeeNumber,Name,Email,Department,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball",
      "EMP001,John,john@example.com,Finance,Yes,No,No,No,Yes,No,No",
      "EMP001,Smith,invalid,Operations,Yes,No,No,No,No,No,No",
      "EMP003,Jane,jane@example.com,Sales,No,No,No,No,No,Yes,No",
      '"EMP004,Broken,row',
    ].join("\n"),
    ["chess", "cricket"]
  );

  assert.equal(result.processed, 4);
  assert.equal(result.rows.length, 1);
  assert.ok(result.errors.some(({ message }) => /duplicated/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /Email is invalid/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /not enabled/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /Malformed CSV row/i.test(message)));
});

test("Employee identity migration preserves participant and sport IDs", async () => {
  const migration = await readBackendFile(
    "migrations/202606090003-employee-identity.js"
  );

  assert.match(migration, /createTable\(EMPLOYEES_TABLE/);
  assert.match(migration, /PARTICIPANTS_TABLE,\s*"employeeId"/s);
  assert.match(migration, /festival_participants_festival_employee_uq/);
  assert.match(migration, /source: "legacy_user"/);
  assert.match(migration, /identityStatus: "needs_review"/);
  assert.doesNotMatch(migration, /dropTable\("FestivalParticipantSports"/);
  assert.doesNotMatch(
    migration,
    /addColumn\("(Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
});

test("Employee APIs are admin-only and participant writes use employeeId", async () => {
  const [employeeRoutes, festivalRoutes, controller] = await Promise.all([
    readBackendFile("src/routes/employeeRoutes.js"),
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/controllers/festival.controller.js"),
  ]);

  assert.match(employeeRoutes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(employeeRoutes, /router\.post\("\/",/);
  assert.match(employeeRoutes, /router\.patch\("\/:employeeId",/);
  assert.match(employeeRoutes, /"\/:employeeId\/link-user"/);
  assert.match(festivalRoutes, /"\/:festivalId\/participants\/import"/);
  assert.match(festivalRoutes, /"\/:festivalId\/participants\/bulk"/);
  assert.match(festivalRoutes, /"\/:festivalId\/participants\/add-all"/);
  assert.match(festivalRoutes, /"\/:festivalId\/participants\/bulk-remove"/);
  assert.match(controller, /req\.body\.employeeId/);
  assert.match(
    controller,
    /where: \{ id: participant\.employeeId, userId: req\.user\.id \}/
  );
  assert.match(controller, /sequelize\.transaction/);
  assert.match(controller, /sportRegistrationsRemoved/);
});

test("Phase 2 frontend provides employee and employee-based festival flows", async () => {
  const [app, shell, directory, detail] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/App.jsx"),
    readRepoFile("ipl-auction-tracker/src/components/AppShell.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/EmployeeDirectory.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
  ]);

  assert.match(app, /path="\/employees"/);
  assert.match(shell, /Employee Directory/);
  assert.match(directory, /Add Employee/);
  assert.match(directory, /Employee number/);
  assert.match(directory, /Optional existing User ID for login/);
  assert.match(detail, /Search employees/);
  assert.match(detail, /employeeIds: selectedEmployees/);
  assert.match(detail, /Selected Employees:/);
  assert.match(detail, /Add All Employees To Festival/);
  assert.match(detail, /Remove Selected Participants/);
  assert.match(detail, /\/participants\/import/);
  assert.doesNotMatch(detail, /Existing user ID/);
});

test("Phase 2 remains isolated from legacy auction and tournament handlers", async () => {
  const controller = await readBackendFile("src/controllers/festival.controller.js");
  assert.doesNotMatch(
    controller,
    /\b(Tournament|TournamentTeam|Player|Auction|Bid|Team)\b/
  );
});
