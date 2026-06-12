import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignFestivalParticipantSchema,
  createFestivalTeamSchema,
  updateFestivalTeamSchema,
} from "../src/validation/festival.validation.js";
import {
  participantStrengthScore,
  snakeBalanceParticipants,
} from "../src/utils/festivalTeamBalance.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const participant = (id, employeeNumber, strength) => ({
  id,
  employee: { employeeNumber, name: employeeNumber },
  sportRegistrations: Array.from({ length: strength }, (_, index) => ({
    id: `${id}-sport-${index}`,
  })),
});

test("Phase 3 calculates strength only from selected sport count", () => {
  assert.equal(participantStrengthScore(participant("p1", "EMP001", 3)), 3);
  assert.equal(
    participantStrengthScore({
      id: "p2",
      employee: { employeeNumber: "EMP002" },
      sportRegistrations: [],
      skillRating: 99,
    }),
    0
  );
});

test("Phase 3 snake balance is deterministic and distributes counts evenly", () => {
  const teams = [
    { id: "trojans", name: "Trojans" },
    { id: "demons", name: "Demons" },
  ];
  const participants = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1].map(
    (strength, index) =>
      participant(
        `participant-${index + 1}`,
        `EMP${String(index + 1).padStart(3, "0")}`,
        strength
      )
  );

  const first = snakeBalanceParticipants(participants, teams);
  const second = snakeBalanceParticipants(
    participants.slice().reverse(),
    teams.slice().reverse()
  );
  assert.deepEqual(
    first.map(({ participant: item, team }) => [item.id, team.id]),
    second.map(({ participant: item, team }) => [item.id, team.id])
  );
  assert.deepEqual(
    first.slice(0, 6).map(({ team }) => team.name),
    ["Demons", "Trojans", "Trojans", "Demons", "Demons", "Trojans"]
  );

  const counts = first.reduce((result, assignment) => {
    result[assignment.team.id] = (result[assignment.team.id] || 0) + 1;
    return result;
  }, {});
  assert.ok(Math.abs(counts.demons - counts.trojans) <= 1);
});

test("Phase 3 validates team creation, update, and manual assignment", () => {
  assert.equal(
    createFestivalTeamSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { name: "Demons", code: "dmn", color: "#C62828" },
    }).success,
    true
  );
  assert.equal(
    updateFestivalTeamSchema.safeParse({
      params: { festivalId: "festival-1", teamId: "team-1" },
      body: {},
    }).success,
    false
  );
  assert.equal(
    assignFestivalParticipantSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { participantId: "participant-1", teamId: "team-1" },
    }).success,
    true
  );
});

test("Phase 3 migration is additive and enforces participant uniqueness", async () => {
  const migration = await readBackendFile(
    "migrations/202606090004-festival-team-builder.js"
  );

  assert.match(migration, /addColumn\("Festivals", "teamAssignmentStatus"/);
  assert.match(migration, /createTable\("FestivalTeamMemberships"/);
  assert.match(
    migration,
    /festival_team_memberships_festival_participant_uq/
  );
  assert.match(migration, /unique: true/);
  assert.match(migration, /assignmentMethod/);
  assert.match(migration, /"manual", "auto_balanced"/);
  assert.match(migration, /assignedBy/);
  assert.doesNotMatch(
    migration,
    /(?:addColumn|changeColumn|createTable)\("(?:Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
});

test("Phase 3 APIs are admin-authorized and enforce lifecycle rules", async () => {
  const [routes, controller] = await Promise.all([
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/controllers/festivalTeam.controller.js"),
  ]);

  assert.match(routes, /"\/:festivalId\/teams\/:teamId",\s*adminMiddleware/s);
  assert.match(
    routes,
    /"\/:festivalId\/team-assignments",\s*adminMiddleware/s
  );
  assert.match(routes, /team-assignments\/auto-balance/);
  assert.match(routes, /team-assignments\/lock/);
  assert.match(controller, /teamAssignmentStatus === "locked"/);
  assert.match(controller, /teams\.length < 2/);
  assert.match(controller, /!participants\.length/);
  assert.match(controller, /membershipCount !== participantCount/);
  assert.match(controller, /FestivalTeamMembership\.findOrCreate/);
  assert.match(controller, /FestivalTeamMembership\.destroy/);
  assert.doesNotMatch(
    controller,
    /\b(Tournament|TournamentTeam|Player|Auction|Bid)\b/
  );
});

test("Phase 3 UI exposes team composition, moves, balancing, and locking", async () => {
  const [builder, detail] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/FestivalTeamBuilder.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
  ]);

  assert.match(detail, /<FestivalTeamBuilder/);
  assert.match(detail, /participantRevision=/);
  assert.match(builder, /Create Team/);
  assert.match(builder, /Participant[s]?:/);
  assert.match(builder, /Strength:/);
  assert.match(builder, /Auto Balance/);
  assert.match(builder, /Lock Assignments/);
  assert.match(builder, /Unassigned Participants/);
  assert.match(builder, /moveParticipant/);
  assert.match(builder, /Manual roster formation is active/);
  assert.doesNotMatch(builder, /sport auction|captain|sport team/i);
});
