import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMigrationStatus,
  runMigrations,
} from "../src/database/migrator.js";
import { updateRosterFormationModeSchema } from "../src/validation/festival.validation.js";
import * as rosterModeMigration from "../migrations/202606100002-festival-roster-formation-mode.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const typeFactory = (...args) => ({ args });
const Sequelize = {
  STRING: Object.assign(typeFactory, { key: "STRING" }),
  ENUM: typeFactory,
};

const createMigrationHarness = ({ modeColumnExists = false } = {}) => {
  const applied = [];
  const ddlEvents = [];
  const tables = new Map([
    [
      "Festivals",
      {
        id: {},
        status: {},
        ...(modeColumnExists ? { rosterFormationMode: {} } : {}),
      },
    ],
  ]);
  const indexes = new Map();

  const queryInterface = {
    async showAllTables() {
      return [...tables.keys()];
    },
    async createTable(tableName, columns) {
      tables.set(tableName, { ...columns });
      ddlEvents.push(`createTable:${tableName}`);
    },
    async describeTable(tableName) {
      return tables.get(tableName);
    },
    async addColumn(tableName, columnName, definition) {
      tables.get(tableName)[columnName] = definition;
      ddlEvents.push(`addColumn:${tableName}.${columnName}`);
    },
    async showIndex(tableName) {
      return indexes.get(tableName) || [];
    },
    async addIndex(tableName, fields, options) {
      const values = indexes.get(tableName) || [];
      values.push({
        name: options.name,
        unique: Boolean(options.unique),
        fields: fields.map((attribute) => ({ attribute })),
      });
      indexes.set(tableName, values);
      ddlEvents.push(`addIndex:${options.name}`);
    },
    async bulkInsert(tableName, rows) {
      if (tableName === "SequelizeMeta") {
        applied.push(...rows.map(({ name }) => name));
      }
    },
  };

  const queries = [];
  const sequelize = {
    constructor: Sequelize,
    getQueryInterface() {
      return queryInterface;
    },
    async query(sql) {
      queries.push(sql);
      if (sql.includes("FROM `SequelizeMeta`")) {
        return [applied.map((name) => ({ name }))];
      }
      return [[], undefined];
    },
  };
  queryInterface.sequelize = sequelize;

  return { applied, ddlEvents, indexes, queries, queryInterface, sequelize, tables };
};

test("Phase 3C validates only auction and manual roster modes", () => {
  for (const rosterFormationMode of ["auction", "manual"]) {
    assert.equal(
      updateRosterFormationModeSchema.safeParse({
        params: { festivalId: "festival-1" },
        body: { rosterFormationMode },
      }).success,
      true
    );
  }
  assert.equal(
    updateRosterFormationModeSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { rosterFormationMode: "hybrid" },
    }).success,
    false
  );
});

for (const modeColumnExists of [false, true]) {
  test(`Phase 3C migration is recovery-safe when mode column exists=${modeColumnExists}`, async () => {
    const harness = createMigrationHarness({ modeColumnExists });
    const migration = {
      name: "202606100002-festival-roster-formation-mode.js",
      ...rosterModeMigration,
    };

    assert.deepEqual(
      await runMigrations({
        sequelize: harness.sequelize,
        migrations: [migration],
      }),
      [migration.name]
    );
    assert.ok(harness.tables.get("Festivals").rosterFormationMode);
    assert.equal(
      harness.indexes
        .get("Festivals")
        .some(({ name }) => name === "festivals_roster_formation_mode_idx"),
      true
    );
    assert.equal(
      harness.queries.some((sql) =>
        sql.includes("SET `rosterFormationMode` = 'auction'")
      ),
      true
    );
    assert.deepEqual(harness.applied, [migration.name]);

    const ddlCount = harness.ddlEvents.length;
    assert.deepEqual(
      await runMigrations({
        sequelize: harness.sequelize,
        migrations: [migration],
      }),
      []
    );
    assert.equal(harness.ddlEvents.length, ddlCount);
    const status = await getMigrationStatus({
      sequelize: harness.sequelize,
      migrations: [migration],
    });
    assert.equal(status[0].status, "up");
  });
}

test("Phase 3C direct migration rerun adds no duplicate DDL", async () => {
  const harness = createMigrationHarness();

  await rosterModeMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });
  const ddlCount = harness.ddlEvents.length;
  await rosterModeMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });

  assert.equal(harness.ddlEvents.length, ddlCount);
  assert.equal(
    harness.indexes
      .get("Festivals")
      .filter(({ name }) => name === "festivals_roster_formation_mode_idx")
      .length,
    1
  );
});

test("Phase 3C backend enforces mutually exclusive roster workflows", async () => {
  const [festival, team, setup, live, routes] = await Promise.all([
    readBackendFile("src/controllers/festival.controller.js"),
    readBackendFile("src/controllers/festivalTeam.controller.js"),
    readBackendFile("src/controllers/festivalMainAuction.controller.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
    readBackendFile("src/routes/festivalRoutes.js"),
  ]);

  assert.match(routes, /roster-formation-mode",\s*adminMiddleware/s);
  assert.match(festival, /Manual mode cannot be enabled after auction setup/);
  assert.match(festival, /Auction mode cannot be enabled after manual assignments are locked/);
  assert.match(team, /roster formation mode is auction/);
  assert.match(team, /"Manual team assignment"/);
  assert.match(team, /"Automatic team balancing"/);
  assert.match(team, /"Team assignment locking"/);
  assert.match(setup, /roster formation mode is manual/);
  assert.match(setup, /"Owner assignment"/);
  assert.match(setup, /"Retention"/);
  assert.match(setup, /"Auction configuration"/);
  assert.match(live, /Main festival auction is disabled when roster formation mode is manual/);
  assert.match(live, /Auction roster finalization is disabled when roster formation mode is manual/);
});

test("Phase 3C pool rules exclude every existing roster or auction outcome", async () => {
  const [setup, live] = await Promise.all([
    readBackendFile("src/controllers/festivalMainAuction.controller.js"),
    readBackendFile("src/controllers/festivalLiveAuction.controller.js"),
  ]);

  for (const source of [setup, live]) {
    assert.match(source, /!participant\.teamMembership/);
    assert.match(source, /!participant\.auctionResult/);
    assert.match(source, /!participant\.auctionRound/);
  }
});

test("Phase 3C workspace conditionally exposes manual or auction controls", async () => {
  const [detail, builder] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readRepoFile("ipl-auction-tracker/src/components/FestivalTeamBuilder.jsx"),
  ]);

  assert.match(detail, /Roster Formation Mode/);
  assert.match(detail, /value="auction"/);
  assert.match(detail, /value="manual"/);
  assert.match(detail, /rosterFormationMode === "auction"/);
  assert.match(detail, /<FestivalAuctionSetup/);
  assert.match(detail, /<MainFestivalAuction/);
  assert.match(builder, /const manualMode = rosterFormationMode === "manual"/);
  assert.match(builder, /\{manualMode && \(/);
  assert.match(builder, /Auto Balance/);
  assert.match(builder, /Lock Assignments/);
});
