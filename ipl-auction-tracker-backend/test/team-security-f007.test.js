import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  listTeamsSchema,
  ownerScopedTeamSchema,
} from "../src/validation/team.validation.js";
import {
  toPublicTeamResponse,
  toTeamResponse,
  toPlayerReportResponse,
} from "../src/utils/teamResponse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("team routes require authentication and validate params", async () => {
  const teamRoutes = await readProjectFile("src/routes/teamRoutes.js");

  assert.match(
    teamRoutes,
    /router\.get\(\s*"\/",\s*authMiddleware,\s*validate\(listTeamsSchema\),\s*getTeams\s*\);/
  );
  assert.match(
    teamRoutes,
    /"\/getTeamByid\/:id",\s*authMiddleware,\s*validate\(ownerScopedTeamSchema\),\s*getTeamByOwner/
  );
  assert.match(
    teamRoutes,
    /"\/getTeamAndPlayers\/:id",\s*authMiddleware,\s*validate\(ownerScopedTeamSchema\),\s*getTeamAndPlayersbyOwnerId/
  );
});

test("broad team reports require admin middleware", async () => {
  const teamRoutes = await readProjectFile("src/routes/teamRoutes.js");

  assert.match(
    teamRoutes,
    /"\/getAllteamsAndPlayers",\s*authMiddleware,\s*adminMiddleware,\s*getAllTeamsWithPlayers/
  );
});

test("owner-scoped team controllers derive owner from authenticated user", async () => {
  const teamController = await readProjectFile("src/controllers/team.controller.js");

  assert.match(teamController, /const ownerId = req\.user\.id;/);
  assert.doesNotMatch(teamController, /const ownerId = req\.params\.id;/);
  assert.doesNotMatch(teamController, /where:\s*\{\s*ownerId:\s*req\.params\.id\s*\}/);
});

test("team route validation rejects empty owner and tournament IDs", () => {
  assert.equal(
    ownerScopedTeamSchema.safeParse({
      params: { id: "owner-1" },
      query: { tournamentId: "tournament-1" },
    }).success,
    true
  );

  assert.equal(
    ownerScopedTeamSchema.safeParse({
      params: { id: " " },
      query: {},
    }).success,
    false
  );

  assert.equal(
    listTeamsSchema.safeParse({
      query: { tournamentId: " " },
    }).success,
    false
  );
});

test("public team DTO excludes owner identity and user objects", () => {
  const team = toPublicTeamResponse({
    id: "team-1",
    name: "Team One",
    ownerId: "owner-1",
    tournamentId: "tournament-1",
    totalAmount: 100,
    amountSpent: 40,
    owner: {
      id: "owner-1",
      email: "owner@example.com",
      password: "hash",
    },
  });

  assert.deepEqual(team, {
    id: "team-1",
    name: "Team One",
    tournamentId: "tournament-1",
    totalAmount: 100,
    amountSpent: 40,
    amountLeft: 60,
  });
});

test("admin team DTO sanitizes owner user fields", () => {
  const team = toTeamResponse(
    {
      id: "team-1",
      name: "Team One",
      ownerId: "owner-1",
      totalAmount: 100,
      amountSpent: 40,
      owner: {
        id: "owner-1",
        name: "Owner",
        email: "owner@example.com",
        role: "team_owner",
        isVerified: true,
        password: "hash",
        verificationToken: "token",
      },
    },
    { includeOwner: true }
  );

  assert.equal(team.ownerId, "owner-1");
  assert.deepEqual(team.owner, {
    id: "owner-1",
    name: "Owner",
    email: "owner@example.com",
    role: "team_owner",
    isVerified: true,
  });
});

test("team player report DTO omits internal auction linkage", () => {
  const player = toPlayerReportResponse({
    id: "player-1",
    name: "Player One",
    basePrice: 10,
    soldPrice: 20,
    role: "Batsman",
    isSold: true,
    teamId: "team-1",
    tournamentId: "tournament-1",
    sportId: "cricket",
    auctionId: "auction-1",
  });

  assert.equal(player.auctionId, undefined);
  assert.deepEqual(Object.keys(player), [
    "id",
    "name",
    "basePrice",
    "soldPrice",
    "role",
    "isSold",
    "teamId",
    "tournamentId",
    "sportId",
  ]);
});
