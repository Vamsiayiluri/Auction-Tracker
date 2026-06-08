import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMigrationStatus,
  runMigrations,
} from "../src/database/migrator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

const createMigrationHarness = () => {
  const applied = [];
  const events = [];
  let metaTableExists = false;

  const queryInterface = {
    async showAllTables() {
      return metaTableExists ? ["SequelizeMeta"] : [];
    },
    async createTable(tableName) {
      assert.equal(tableName, "SequelizeMeta");
      metaTableExists = true;
    },
    async bulkInsert(tableName, rows) {
      assert.equal(tableName, "SequelizeMeta");
      applied.push(...rows.map((row) => row.name));
    },
  };

  const sequelize = {
    constructor: class MockSequelize {},
    getQueryInterface() {
      return queryInterface;
    },
    async query() {
      return [applied.slice().sort().map((name) => ({ name }))];
    },
  };

  const migrations = ["002-second.js", "001-first.js"].map((name) => ({
    name,
    async up() {
      events.push(name);
    },
  }));

  return { applied, events, migrations, sequelize };
};

test("migration runner executes pending migrations once in filename order", async () => {
  const harness = createMigrationHarness();

  const firstRun = await runMigrations(harness);
  const secondRun = await runMigrations(harness);

  assert.deepEqual(firstRun, ["001-first.js", "002-second.js"]);
  assert.deepEqual(secondRun, []);
  assert.deepEqual(harness.events, ["001-first.js", "002-second.js"]);
  assert.deepEqual(harness.applied, ["001-first.js", "002-second.js"]);

  const status = await getMigrationStatus(harness);
  assert.deepEqual(
    status.map((migration) => migration.status),
    ["up", "up"]
  );
});

test("server startup does not sync or mutate schema at runtime", async () => {
  const server = await readBackendFile("src/index.js");
  const models = await readBackendFile("src/models/index.js");

  assert.doesNotMatch(server, /syncDB/);
  assert.doesNotMatch(models, /sequelizeDb\.sync|ensureColumn|backfill/);
});

test("Phase 5 migration declares query-driven indexes", async () => {
  const migration = await readBackendFile(
    "migrations/202606080002-phase5-integrity-indexes.js"
  );

  const expectedIndexes = [
    "teams_owner_id_idx",
    "players_tournament_auction_state_idx",
    "players_team_tournament_idx",
    "auctions_tournament_status_idx",
    "auctions_player_tournament_status_idx",
    "bids_player_tournament_amount_idx",
    "bids_player_tournament_created_at_idx",
  ];

  expectedIndexes.forEach((indexName) =>
    assert.match(migration, new RegExp(indexName))
  );
});

test("Phase 5 migration and models enforce enum-like fields", async () => {
  const [migration, userModel, tournamentModel, playerModel, auctionModel] =
    await Promise.all([
      readBackendFile("migrations/202606080002-phase5-integrity-indexes.js"),
      readBackendFile("src/models/user.model.js"),
      readBackendFile("src/models/tournment.model.js"),
      readBackendFile("src/models/player.model.js"),
      readBackendFile("src/models/auction.model.js"),
    ]);

  assert.match(migration, /unsupported role values/);
  assert.match(migration, /unsupported status values/);
  assert.match(userModel, /DataTypes\.ENUM\("admin", "team_owner", "spectator"\)/);
  assert.match(tournamentModel, /DataTypes\.ENUM\("upcoming", "live", "completed"\)/);
  assert.match(playerModel, /DataTypes\.ENUM\(/);
  assert.match(auctionModel, /DataTypes\.ENUM\("upcoming", "live", "pending", "completed"\)/);
});

test("foreign keys use explicit cascade and restriction policies", async () => {
  const migration = await readBackendFile(
    "migrations/202606080002-phase5-integrity-indexes.js"
  );

  const expectedConstraints = [
    "teams_owner_id_fk",
    "tournaments_created_by_fk",
    "tournament_teams_tournament_id_fk",
    "tournament_teams_team_id_fk",
    "players_team_id_fk",
    "players_tournament_id_fk",
    "auctions_current_player_id_fk",
    "auctions_tournament_id_fk",
    "bids_player_id_fk",
    "bids_tournament_id_fk",
    "bids_team_id_fk",
    "bids_owner_id_fk",
  ];

  expectedConstraints.forEach((constraintName) =>
    assert.match(migration, new RegExp(constraintName))
  );
  assert.match(migration, /"CASCADE"/);
  assert.match(migration, /"RESTRICT"/);
  assert.match(migration, /"SET NULL"/);
  assert.match(migration, /contains invalid/);
});
