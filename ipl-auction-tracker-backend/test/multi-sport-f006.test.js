import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlayerSchema } from "../src/validation/player.validation.js";
import { createTournamentSchema } from "../src/validation/tournament.validation.js";
import { SPORT_IDS } from "../src/utils/sports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const cricketPlayer = {
  id: "player-1",
  name: "Player One",
  sportId: "cricket",
  role: "Batsman",
  basePrice: 500000,
};

test("F-006 sports catalog contains required active sport IDs", () => {
  assert.deepEqual(SPORT_IDS, [
    "cricket",
    "tt",
    "volleyball",
    "badminton",
    "chess",
    "carrom",
    "throwball",
    "other",
  ]);
});

test("F-006 migration seeds sports and backfills tournaments and players to cricket", async () => {
  const migration = await readBackendFile(
    "migrations/202606080005-multi-sport-foundation.js"
  );

  ["cricket", "tt", "volleyball", "badminton", "chess", "carrom", "other"].forEach(
    (sportId) => assert.match(migration, new RegExp(`id: "${sportId}"`))
  );
  assert.match(migration, /createTable\("Sports"/);
  assert.match(migration, /UPDATE Tournaments SET sportId = 'cricket'/);
  assert.match(migration, /UPDATE Players SET sportId = 'cricket'/);
  assert.match(migration, /tournaments_sport_id_fk/);
  assert.match(migration, /players_sport_id_fk/);
  assert.match(migration, /changeColumn\("Players", "role"/);
  assert.match(migration, /allowNull: true/);
});

test("F-006 validation requires cricket roles and allows no-role sports", () => {
  assert.equal(
    createPlayerSchema.safeParse({
      body: { ...cricketPlayer, tournamentId: "tournament-1" },
    }).success,
    true
  );
  assert.equal(
    createPlayerSchema.safeParse({
      body: { ...cricketPlayer, role: null, tournamentId: "tournament-1" },
    }).success,
    false
  );
  assert.equal(
    createPlayerSchema.safeParse({
      body: {
        id: "player-2",
        name: "TT Player",
        sportId: "tt",
        role: null,
        basePrice: 500000,
        tournamentId: "tournament-1",
      },
    }).success,
    true
  );
  assert.equal(
    createPlayerSchema.safeParse({
      body: {
        id: "player-3",
        name: "Chess Player",
        sportId: "chess",
        basePrice: 500000,
        tournamentId: "tournament-1",
      },
    }).success,
    true
  );
});

test("F-006 validation rejects invalid sports and mixed tournament player sports", () => {
  assert.equal(
    createPlayerSchema.safeParse({
      body: {
        id: "player-1",
        name: "Player One",
        sportId: "kabaddi",
        role: null,
        basePrice: 500000,
        tournamentId: "tournament-1",
      },
    }).success,
    false
  );
  assert.equal(
    createTournamentSchema.safeParse({
      body: {
        id: "tournament-1",
        name: "Tournament",
        sportId: "cricket",
        budget: 20000000,
        teams: ["Team One"],
        players: [{ ...cricketPlayer, sportId: "tt", role: null }],
      },
    }).success,
    false
  );
});

test("F-006 controllers enforce player and tournament sport matching", async () => {
  const [playerController, tournamentController] = await Promise.all([
    readBackendFile("src/controllers/player.controller.js"),
    readBackendFile("src/controllers/tournment.controller.js"),
  ]);

  assert.match(playerController, /req\.body\.sportId !== tournament\.sportId/);
  assert.match(tournamentController, /Player sport must match tournament sport/);
  assert.match(tournamentController, /sportId,\s*budget/);
});

test("F-006 UI exposes sport selection and preserves cricket role controls", async () => {
  const [managementUi, auctionUi] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/AuctionManagement.jsx"),
    readRepoFile(
      "ipl-auction-tracker/src/components/AdminDashboardLayout/AuctionLive.jsx"
    ),
  ]);

  assert.match(managementUi, /api\.get\("\/sports"\)/);
  assert.match(managementUi, /<InputLabel>Sport<\/InputLabel>/);
  assert.match(managementUi, /requiresRole\(playerForm\.sportId\)/);
  assert.match(managementUi, /Every cricket player needs a role/);
  assert.match(auctionUi, /isCricketTournament/);
  assert.match(auctionUi, /Player role/);
});

test("F-006 keeps auction flow player and tournament based", async () => {
  const auctionController = await readBackendFile(
    "src/controllers/auction.controller.js"
  );

  assert.match(auctionController, /Player\.findByPk\(playerId\)/);
  assert.match(auctionController, /player\.tournamentId !== tournamentId/);
  assert.match(auctionController, /role: player\.role/);
  assert.match(auctionController, /sportId: player\.sportId/);
});
