import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignSportTeamCaptainSchema,
  createSportTournamentSchema,
  updateSportTournamentSchema,
} from "../src/validation/sportTournament.validation.js";
import {
  evaluateSportTournamentParticipant,
  SPORT_ELIGIBILITY_REASONS,
} from "../src/utils/sportTournamentEligibility.js";
import { SPORT_TOURNAMENT_STATUSES } from "../src/models/sportTournament.model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const tournament = {
  festivalTeamId: "trojans",
  sportId: "cricket",
  participantGenderRule: "male",
};

const participant = ({
  id = "participant-1",
  status = "registered",
  employmentStatus = "active",
  gender = "male",
  festivalTeamId = "trojans",
  sports = ["cricket"],
} = {}) => ({
  id,
  status,
  employee: {
    id: `employee-${id}`,
    name: "Vamsi",
    gender,
    employmentStatus,
  },
  teamMembership: festivalTeamId ? { festivalTeamId } : null,
  sportRegistrations: sports.map((sportId) => ({ sportId })),
});

test("Phase 4A supports the complete approved status model", () => {
  assert.deepEqual(SPORT_TOURNAMENT_STATUSES, [
    "draft",
    "setup",
    "ready",
    "auction_live",
    "auction_paused",
    "auction_completed",
    "competition_pending",
    "competition_live",
    "competition_completed",
    "archived",
  ]);
});

test("Phase 4A eligibility includes an active parent Team sport participant", () => {
  const result = evaluateSportTournamentParticipant({
    tournament,
    participant: participant(),
  });
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
});

test("Phase 4A eligibility returns exact exclusion reasons", () => {
  const result = evaluateSportTournamentParticipant({
    tournament,
    participant: participant({
      status: "withdrawn",
      employmentStatus: "inactive",
      gender: "female",
      festivalTeamId: "demons",
      sports: ["volleyball"],
    }),
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(new Set(result.reasons), new Set([
    SPORT_ELIGIBILITY_REASONS.PARTICIPANT_WITHDRAWN,
    SPORT_ELIGIBILITY_REASONS.EMPLOYEE_INACTIVE,
    SPORT_ELIGIBILITY_REASONS.NOT_ON_PARENT_FESTIVAL_TEAM,
    SPORT_ELIGIBILITY_REASONS.SPORT_NOT_REGISTERED,
    SPORT_ELIGIBILITY_REASONS.GENDER_RULE_MISMATCH,
  ]));
});

test("Phase 4A does not exclude an eligible Festival Team Owner from Captain eligibility", () => {
  const ownerParticipant = participant({ id: "owner-participant" });
  ownerParticipant.ownerAssignment = {
    festivalTeamId: "trojans",
    status: "active",
  };
  const result = evaluateSportTournamentParticipant({
    tournament,
    participant: ownerParticipant,
  });
  assert.equal(result.eligible, true);
  assert.equal(result.availableForCaptainAssignment, true);
});

test("Phase 4A validates Tournament and Captain payloads", () => {
  assert.equal(
    createSportTournamentSchema.safeParse({
      params: { festivalId: "festival-1", festivalTeamId: "trojans" },
      body: {
        festivalSportId: "festival-sport-1",
        name: "Cricket Men",
        code: "TRJ-CRM",
        division: "men",
        participantGenderRule: "male",
        teamCount: 3,
      },
    }).success,
    true
  );
  assert.equal(
    createSportTournamentSchema.safeParse({
      params: { festivalId: "festival-1", festivalTeamId: "trojans" },
      body: {
        festivalSportId: "festival-sport-1",
        name: "Cricket Men",
        code: "TRJ-CRM",
        division: "men",
        participantGenderRule: "male",
        teamCount: 1,
      },
    }).success,
    false
  );
  assert.equal(
    updateSportTournamentSchema.safeParse({
      params: { sportTournamentId: "sport-tournament-1" },
      body: {},
    }).success,
    false
  );
  assert.equal(
    assignSportTeamCaptainSchema.safeParse({
      params: {
        sportTournamentId: "sport-tournament-1",
        sportTeamId: "sport-team-a",
      },
      body: { festivalParticipantId: "participant-1" },
    }).success,
    true
  );
});

test("Phase 4A migration is additive and creates only foundation tables", async () => {
  const migration = await readBackendFile(
    "migrations/202606140002-sport-tournament-foundation.js"
  );
  for (const table of [
    "SportTournaments",
    "SportTeams",
    "SportTeamMemberships",
    "SportTeamCaptains",
  ]) {
    assert.match(migration, new RegExp(`createTable\\("${table}"`));
  }
  assert.match(migration, /sport_team_captains_tournament_participant_uq/);
  assert.match(migration, /sport_team_memberships_tournament_participant_uq/);
  assert.doesNotMatch(
    migration,
    /createTable\("(?:SportAuctions|SportAuctionBids|SportAuctionResults|Matches|Fixtures|Standings)"/
  );
});

test("Sport Tournament routes retain Phase 4A authentication and authorization foundations", async () => {
  const [routes, controller, authorization] = await Promise.all([
    readBackendFile("src/routes/sportTournamentRoutes.js"),
    readBackendFile("src/controllers/sportTournament.controller.js"),
    readBackendFile("src/utils/sportTournamentAuthorization.js"),
  ]);
  assert.match(routes, /router\.use\(authMiddleware\)/);
  assert.match(routes, /sport-tournaments\/:sportTournamentId\/eligibility/);
  assert.match(routes, /sport-tournaments\/:sportTournamentId\/readiness/);
  assert.match(routes, /teams\/:sportTeamId\/captain/);
  assert.match(controller, /FestivalAuctionConfig/);
  assert.match(controller, /auctionStatus === "completed"/);
  assert.match(controller, /createGeneratedTeams/);
  assert.match(controller, /SportTeamMembership\.create/);
  assert.match(authorization, /FestivalTeamOwner/);
  assert.match(authorization, /status: "active"/);
  assert.doesNotMatch(routes, /fixtures|matches|standings|semi-finals|finals/);
});

test("Phase 4A readiness is server-authored with score, status, and blockers", async () => {
  const readiness = await readBackendFile(
    "src/utils/sportTournamentReadiness.js"
  );
  assert.match(readiness, /readinessScore/);
  assert.match(readiness, /readinessStatus/);
  assert.match(readiness, /Every Sport Team must have a Captain/);
  assert.match(readiness, /Every assigned Captain must be eligible/);
  assert.match(readiness, /No eligible participants remain after Captain assignments/);
  assert.match(readiness, /nextStatus = readinessStatus === "READY" \? "ready" : "setup"/);
});

test("Phase 4A UI provides the dedicated Owner directory and requested workspace sections", async () => {
  const [app, shell, directory, workspace] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/App.jsx"),
    readRepoFile("ipl-auction-tracker/src/components/AppShell.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/SportTournamentDirectory.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx"),
  ]);
  assert.match(app, /path="\/sport-tournaments"/);
  assert.match(app, /path="\/sport-tournaments\/:sportTournamentId"/);
  assert.match(shell, /label: "Sport Tournaments"/);
  assert.match(directory, /Create and Generate Teams/);
  for (const section of [
    "Overview",
    "Teams",
    "Captains",
    "Eligibility",
    "Readiness",
    "Settings",
  ]) {
    assert.match(workspace, new RegExp(`"${section}"`));
  }
  assert.match(workspace, /Festival Team Owners remain eligible Employees/);
  assert.doesNotMatch(workspace, /Fixtures|Standings|Semi Finals|Finals/);
});
