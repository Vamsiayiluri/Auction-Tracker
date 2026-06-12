import test from "node:test";
import assert from "node:assert/strict";
import {
  getMigrationStatus,
  runMigrations,
} from "../src/database/migrator.js";
import * as liveAuctionMigration from "../migrations/202606100001-main-festival-live-auction.js";

const typeFactory = (...args) => ({ args });
const Sequelize = {
  STRING: Object.assign(typeFactory, { key: "STRING" }),
  BIGINT: { key: "BIGINT" },
  DATE: { key: "DATE" },
  ENUM: typeFactory,
  fn: (name) => ({ fn: name }),
};

const BASE_TABLES = [
  "Festivals",
  "FestivalParticipants",
  "FestivalTeams",
  "FestivalTeamOwners",
  "Users",
];

const createHarness = ({
  configColumns = {},
  partialAuctionTables = false,
} = {}) => {
  const applied = [];
  const mutationEvents = [];
  const tables = new Map(
    BASE_TABLES.map((tableName) => [tableName, { id: {} }])
  );
  tables.set("FestivalAuctionConfigs", {
    id: {},
    festivalId: {},
    totalBudget: {},
    ownerCost: {},
    status: {},
    configuredBy: {},
    createdAt: {},
    updatedAt: {},
    ...configColumns,
  });
  if (partialAuctionTables) {
    tables.set("FestivalAuctions", { id: {}, festivalId: {} });
    tables.set("FestivalAuctionBids", { id: {} });
    tables.set("FestivalAuctionResults", { id: {}, festivalId: {} });
  }

  const indexes = new Map();
  const foreignKeys = new Map();

  const queryInterface = {
    async showAllTables() {
      return [...tables.keys()];
    },
    async createTable(tableName, columns) {
      if (!tables.has(tableName)) {
        tables.set(tableName, { ...columns });
        mutationEvents.push(`createTable:${tableName}`);
      }
    },
    async describeTable(tableName) {
      return tables.get(tableName);
    },
    async addColumn(tableName, columnName, definition) {
      tables.get(tableName)[columnName] = { ...definition };
      mutationEvents.push(`addColumn:${tableName}.${columnName}`);
    },
    async showIndex(tableName) {
      return indexes.get(tableName) || [];
    },
    async addIndex(tableName, fields, options) {
      const tableIndexes = indexes.get(tableName) || [];
      tableIndexes.push({
        name: options.name,
        unique: Boolean(options.unique),
        fields: fields.map((attribute) => ({ attribute })),
      });
      indexes.set(tableName, tableIndexes);
      mutationEvents.push(`addIndex:${options.name}`);
    },
    async getForeignKeyReferencesForTable(tableName) {
      return foreignKeys.get(tableName) || [];
    },
    async addConstraint(tableName, options) {
      const tableForeignKeys = foreignKeys.get(tableName) || [];
      tableForeignKeys.push({
        constraintName: options.name,
        columnName: options.fields[0],
        referencedTableName: options.references.table,
      });
      foreignKeys.set(tableName, tableForeignKeys);
      mutationEvents.push(`addConstraint:${options.name}`);
    },
    async bulkInsert(tableName, rows) {
      if (tableName === "SequelizeMeta") {
        applied.push(...rows.map(({ name }) => name));
      }
    },
  };

  const sequelize = {
    constructor: Sequelize,
    getQueryInterface() {
      return queryInterface;
    },
    async query(sql) {
      if (sql.includes("FROM `SequelizeMeta`")) {
        return [applied.map((name) => ({ name }))];
      }
      return [[], undefined];
    },
  };
  queryInterface.sequelize = sequelize;

  return {
    applied,
    foreignKeys,
    indexes,
    mutationEvents,
    queryInterface,
    sequelize,
    tables,
  };
};

const migration = {
  name: "202606100001-main-festival-live-auction.js",
  ...liveAuctionMigration,
};

const expectedIndexes = new Set([
  "festival_auction_configs_current_participant_idx",
  "festival_auctions_festival_participant_uq",
  "festival_auctions_festival_status_idx",
  "festival_auction_bids_auction_amount_uq",
  "festival_auction_bids_auction_created_idx",
  "festival_auction_bids_team_festival_idx",
  "festival_auction_results_festival_participant_uq",
  "festival_auction_results_auction_uq",
  "festival_auction_results_team_festival_idx",
]);

const expectedForeignKeys = new Set([
  "festival_auction_configs_current_participant_fk",
  "festival_auctions_festival_id_fk",
  "festival_auctions_participant_id_fk",
  "festival_auctions_started_by_fk",
  "festival_auctions_finalized_by_fk",
  "festival_auction_bids_festival_id_fk",
  "festival_auction_bids_auction_id_fk",
  "festival_auction_bids_participant_id_fk",
  "festival_auction_bids_team_id_fk",
  "festival_auction_bids_owner_id_fk",
  "festival_auction_bids_placed_by_fk",
  "festival_auction_results_festival_id_fk",
  "festival_auction_results_auction_id_fk",
  "festival_auction_results_participant_id_fk",
  "festival_auction_results_team_id_fk",
  "festival_auction_results_winning_bid_id_fk",
  "festival_auction_results_finalized_by_fk",
]);

const allIndexNames = (harness) =>
  new Set(
    [...harness.indexes.values()]
      .flat()
      .map(({ name }) => name)
  );

const allForeignKeyNames = (harness) =>
  new Set(
    [...harness.foreignKeys.values()]
      .flat()
      .map(({ constraintName }) => constraintName)
  );

const assertFinalSchema = (harness) => {
  const config = harness.tables.get("FestivalAuctionConfigs");
  assert.ok(config.currentParticipantId);
  assert.ok(config.auctionStatus);
  assert.ok(config.startedAt);
  assert.ok(config.completedAt);

  for (const tableName of [
    "FestivalAuctions",
    "FestivalAuctionBids",
    "FestivalAuctionResults",
  ]) {
    assert.equal(harness.tables.has(tableName), true);
  }
  assert.ok(
    harness.tables.get("FestivalAuctions").festivalParticipantId
  );
  assert.ok(harness.tables.get("FestivalAuctionBids").festivalAuctionId);
  assert.ok(harness.tables.get("FestivalAuctionResults").winningBidId);
  assert.deepEqual(allIndexNames(harness), expectedIndexes);
  assert.deepEqual(allForeignKeyNames(harness), expectedForeignKeys);
};

for (const scenario of [
  {
    name: "fresh Phase 3B schema",
    options: {},
  },
  {
    name: "auctionStatus and timestamps exist but currentParticipantId is missing",
    options: {
      configColumns: {
        auctionStatus: {},
        startedAt: {},
        completedAt: {},
      },
    },
  },
  {
    name: "live auction tables exist with missing columns, indexes, and keys",
    options: {
      configColumns: {
        auctionStatus: {},
        currentParticipantId: {},
        startedAt: {},
        completedAt: {},
      },
      partialAuctionTables: true,
    },
  },
]) {
  test(`Phase 3B migration recovers ${scenario.name}`, async () => {
    const harness = createHarness(scenario.options);
    const firstRun = await runMigrations({
      sequelize: harness.sequelize,
      migrations: [migration],
    });

    assert.deepEqual(firstRun, [migration.name]);
    assertFinalSchema(harness);
    assert.deepEqual(harness.applied, [migration.name]);

    const mutationCount = harness.mutationEvents.length;
    const secondRun = await runMigrations({
      sequelize: harness.sequelize,
      migrations: [migration],
    });
    assert.deepEqual(secondRun, []);
    assert.equal(harness.mutationEvents.length, mutationCount);

    const status = await getMigrationStatus({
      sequelize: harness.sequelize,
      migrations: [migration],
    });
    assert.equal(status[0].status, "up");
  });
}

test("Phase 3B direct up rerun adds no duplicate DDL", async () => {
  const harness = createHarness({
    configColumns: {
      auctionStatus: {},
      startedAt: {},
      completedAt: {},
    },
  });

  await liveAuctionMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });
  const mutationCount = harness.mutationEvents.length;
  await liveAuctionMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });

  assertFinalSchema(harness);
  assert.equal(harness.mutationEvents.length, mutationCount);
});

test("Phase 3B recovery creates currentParticipantId before its index and FK", async () => {
  const harness = createHarness({
    configColumns: { auctionStatus: {}, startedAt: {}, completedAt: {} },
  });

  await liveAuctionMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });

  const columnEvent = harness.mutationEvents.indexOf(
    "addColumn:FestivalAuctionConfigs.currentParticipantId"
  );
  const indexEvent = harness.mutationEvents.indexOf(
    "addIndex:festival_auction_configs_current_participant_idx"
  );
  const foreignKeyEvent = harness.mutationEvents.indexOf(
    "addConstraint:festival_auction_configs_current_participant_fk"
  );
  assert.ok(columnEvent >= 0);
  assert.ok(indexEvent > columnEvent);
  assert.ok(foreignKeyEvent > columnEvent);
});

test("Phase 3B migrator records metadata only after recovery succeeds", async () => {
  const harness = createHarness();
  const failingMigration = {
    name: migration.name,
    async up() {
      throw new Error("simulated live auction DDL failure");
    },
  };

  await assert.rejects(
    runMigrations({
      sequelize: harness.sequelize,
      migrations: [failingMigration],
    }),
    /simulated live auction DDL failure/
  );
  assert.deepEqual(harness.applied, []);
});
