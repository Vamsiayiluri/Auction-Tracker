import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addFestivalParticipantSchema,
  addFestivalSportSchema,
  createFestivalSchema,
  createFestivalTeamSchema,
} from "../src/validation/festival.validation.js";
import { toFestivalParticipantResponse } from "../src/utils/festivalResponse.js";
import { SPORT_IDS } from "../src/utils/sports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

const validFestival = {
  name: "Corporate Sports Festival 2027",
  code: "csf-2027",
  startDate: "2027-02-01",
  endDate: "2027-02-15",
  registrationOpensAt: "2026-12-01T03:30:00.000Z",
  registrationClosesAt: "2026-12-20T18:29:59.000Z",
  timezone: "Asia/Kolkata",
  currencyCode: "inr",
};

test("Phase 1 festival validation accepts valid foundation payloads", () => {
  const festival = createFestivalSchema.safeParse({ body: validFestival });
  assert.equal(festival.success, true);
  assert.equal(festival.data.body.code, "CSF-2027");
  assert.equal(festival.data.body.currencyCode, "INR");

  assert.equal(
    addFestivalSportSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { sportId: "throwball", config: { enabled: true } },
    }).success,
    true
  );
  assert.equal(
    addFestivalParticipantSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { employeeId: "employee-1" },
    }).success,
    true
  );

  const team = createFestivalTeamSchema.safeParse({
    params: { festivalId: "festival-1" },
    body: {
      name: "Demons",
      code: "dmn",
      color: "#C62828",
      logoUrl: "https://example.com/demons.png",
    },
  });
  assert.equal(team.success, true);
  assert.equal(team.data.body.code, "DMN");
});

test("Phase 1 festival validation rejects invalid dates and child payloads", () => {
  assert.equal(
    createFestivalSchema.safeParse({
      body: { ...validFestival, endDate: "2027-01-31" },
    }).success,
    false
  );
  assert.equal(
    createFestivalSchema.safeParse({
      body: { ...validFestival, startDate: "2027-02-31" },
    }).success,
    false
  );
  assert.equal(
    createFestivalSchema.safeParse({
      body: {
        ...validFestival,
        registrationClosesAt: "2026-11-30T03:30:00.000Z",
      },
    }).success,
    false
  );
  assert.equal(
    addFestivalSportSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { sportId: "kabaddi" },
    }).success,
    false
  );
  assert.equal(
    createFestivalTeamSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { name: "Demons", code: "DMN", color: "red" },
    }).success,
    false
  );
});

test("Festival participant responses use canonical employee identity", () => {
  const response = toFestivalParticipantResponse({
    id: "participant-1",
    festivalId: "festival-1",
    employeeId: "employee-1",
    status: "registered",
    registeredAt: new Date("2026-12-01T00:00:00.000Z"),
    employee: {
      id: "employee-1",
      employeeNumber: "EMP001",
      name: "Employee One",
      email: "employee@example.com",
      department: "Finance",
      employmentStatus: "active",
      source: "manual",
      identityStatus: "verified",
      userId: null,
    },
  });

  assert.equal(response.employee.employeeNumber, "EMP001");
  assert.equal(response.employee.hasLogin, false);
  assert.deepEqual(Object.keys(response.employee), [
    "id",
    "employeeNumber",
    "name",
    "email",
    "department",
    "employmentStatus",
    "source",
    "identityStatus",
    "userId",
    "hasLogin",
    "createdAt",
    "updatedAt",
  ]);
});

test("Phase 1 migration is additive and isolated from legacy auction tables", async () => {
  const migration = await readBackendFile(
    "migrations/202606090001-festival-foundation.js"
  );

  [
    "Festivals",
    "FestivalSports",
    "FestivalParticipants",
    "FestivalTeams",
  ].forEach((tableName) =>
    assert.match(migration, new RegExp(`createTable\\("${tableName}"`))
  );

  assert.match(migration, /festival_sports_festival_sport_uq/);
  assert.match(migration, /festival_participants_festival_user_uq/);
  assert.match(migration, /festival_teams_festival_name_uq/);
  assert.match(migration, /festival_teams_festival_code_uq/);
  assert.match(migration, /id: "throwball"/);
  assert.doesNotMatch(
    migration,
    /addColumn\("(Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
  assert.doesNotMatch(
    migration,
    /changeColumn\("(Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
});

test("Phase 1 routes require authentication and admin authorization for mutations", async () => {
  const [routes, server] = await Promise.all([
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/index.js"),
  ]);

  assert.match(routes, /router\.use\(authMiddleware\)/);
  assert.match(
    routes,
    /router\.post\("\/", adminMiddleware, validate\(createFestivalSchema\), createFestival\)/
  );
  assert.match(routes, /"\/:festivalId\/sports",\s*adminMiddleware/s);
  assert.match(routes, /"\/:festivalId\/participants",\s*adminMiddleware/s);
  assert.match(routes, /"\/:festivalId\/teams",\s*adminMiddleware/s);
  assert.match(server, /app\.use\("\/api\/v2\/festivals", FestivalRoutes\)/);
});

test("Phase 1 keeps legacy tournament and auction handlers unchanged in scope", async () => {
  const [controller, routes] = await Promise.all([
    readBackendFile("src/controllers/festival.controller.js"),
    readBackendFile("src/routes/festivalRoutes.js"),
  ]);

  assert.doesNotMatch(
    controller,
    /\b(Tournament|TournamentTeam|Player|Auction|Bid|Team)\b/
  );
  assert.doesNotMatch(routes, /auction|tournament/i);
  assert.equal(SPORT_IDS.includes("throwball"), true);
});
