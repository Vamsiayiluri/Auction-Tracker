import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  archiveTournamentSchema,
  updateTournamentSchema,
} from "../src/validation/tournament.validation.js";
import {
  isArchivableTournamentStatus,
  isEditableTournamentStatus,
  isValidTournamentTransition,
} from "../src/utils/tournamentStatus.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const validPlayers = [
  {
    id: "player-1",
    name: "Player One",
    sportId: "cricket",
    role: "Batsman",
    basePrice: 500000,
  },
];

test("F-005 allows editing only upcoming tournaments", () => {
  assert.equal(isEditableTournamentStatus("upcoming"), true);
  assert.equal(isEditableTournamentStatus("live"), false);
  assert.equal(isEditableTournamentStatus("completed"), false);
  assert.equal(isEditableTournamentStatus("archived"), false);

  assert.equal(
    updateTournamentSchema.safeParse({
      params: { id: "tournament-1" },
      body: {
        name: "Edited Tournament",
        sportId: "cricket",
        budget: 20000000,
        teams: ["Team One"],
        players: validPlayers,
      },
    }).success,
    true
  );
});

test("F-005 archives only completed tournaments and keeps archived terminal", () => {
  assert.equal(isArchivableTournamentStatus("completed"), true);
  assert.equal(isArchivableTournamentStatus("live"), false);
  assert.equal(isArchivableTournamentStatus("upcoming"), false);
  assert.equal(isArchivableTournamentStatus("archived"), false);

  assert.equal(isValidTournamentTransition("completed", "archived"), true);
  assert.equal(isValidTournamentTransition("archived", "completed"), false);
  assert.equal(isValidTournamentTransition("archived", "live"), false);

  assert.equal(
    archiveTournamentSchema.safeParse({
      params: { id: "tournament-1" },
    }).success,
    true
  );
});

test("F-005 tournament routes are admin-protected and validated", async () => {
  const route = await readBackendFile("src/routes/tournmentRoutes.js");
  const controller = await readBackendFile("src/controllers/tournment.controller.js");

  assert.match(route, /"\/:id\/archive"/);
  assert.match(route, /validate\(archiveTournamentSchema\)/);
  assert.match(route, /validate\(updateTournamentSchema\)/);
  assert.match(route, /authMiddleware,\s*adminMiddleware,\s*validate\(archiveTournamentSchema\)/s);
  assert.match(route, /authMiddleware,\s*adminMiddleware,\s*validate\(updateTournamentSchema\)/s);

  assert.match(controller, /isEditableTournamentStatus\(tournament\.status\)/);
  assert.match(controller, /isArchivableTournamentStatus\(tournament\.status\)/);
  assert.match(controller, /TournamentTeam\.destroy/);
  assert.match(controller, /Player\.destroy/);
});

test("F-005 schema, model, and migration include archived status", async () => {
  const [model, migration, commonValidation] = await Promise.all([
    readBackendFile("src/models/tournment.model.js"),
    readBackendFile("migrations/202606080004-tournament-archive-status.js"),
    readBackendFile("src/validation/common.validation.js"),
  ]);

  assert.match(model, /"archived"/);
  assert.match(migration, /"archived"/);
  assert.match(migration, /contains archived rows/);
  assert.match(commonValidation, /TOURNAMENT_STATUSES/);
});

test("F-005 admin UI exposes edit, archive, archived label, and filters", async () => {
  const ui = await readRepoFile(
    "ipl-auction-tracker/src/components/AuctionManagement.jsx"
  );

  assert.match(ui, /Edit Tournament/);
  assert.match(ui, /Archive Tournament/);
  assert.match(ui, /Archived/);
  assert.match(ui, /statusFilters/);
  assert.match(ui, /tournament\.status === "upcoming"/);
  assert.match(ui, /tournament\.status === "completed"/);
  assert.match(ui, /statusFilter === "all"/);
});
