import test from "node:test";
import assert from "node:assert/strict";
import {
  getMigrationStatus,
  runMigrations,
} from "../src/database/migrator.js";
import * as employeeIdentityMigration from "../migrations/202606090003-employee-identity.js";

const typeFactory = (...args) => ({ args });
const Sequelize = {
  STRING: Object.assign(typeFactory, { key: "STRING" }),
  DATE: { key: "DATE" },
  ENUM: typeFactory,
  fn: (name) => ({ fn: name }),
};

const createHarness = ({
  employeesExists = false,
  employeeIdExists = false,
  employeeIndexesExist = false,
  participantIndexesExist = false,
} = {}) => {
  const applied = [];
  const mutationEvents = [];
  const tables = new Map([
    ["Users", { id: {}, name: {}, email: {} }],
    [
      "FestivalParticipants",
      {
        id: {},
        festivalId: {},
        userId: { allowNull: false },
        status: {},
        registeredAt: {},
        createdAt: {},
        updatedAt: {},
        ...(employeeIdExists ? { employeeId: { allowNull: true } } : {}),
      },
    ],
  ]);
  if (employeesExists) {
    tables.set("Employees", {
      id: {},
      employeeNumber: { allowNull: true },
      name: {},
      email: { allowNull: true },
      department: { allowNull: true },
      employmentStatus: {},
      source: {},
      identityStatus: {},
      userId: { allowNull: true },
      createdAt: {},
      updatedAt: {},
    });
  }

  const indexes = new Map();
  if (employeeIndexesExist) {
    indexes.set("Employees", [
      {
        name: "employees_employee_number_uq",
        unique: true,
        fields: [{ attribute: "employeeNumber" }],
      },
      {
        name: "employees_user_id_uq",
        unique: true,
        fields: [{ attribute: "userId" }],
      },
      {
        name: "employees_email_idx",
        unique: false,
        fields: [{ attribute: "email" }],
      },
      {
        name: "employees_status_name_idx",
        unique: false,
        fields: [
          { attribute: "employmentStatus" },
          { attribute: "name" },
        ],
      },
    ]);
  }
  if (participantIndexesExist) {
    indexes.set("FestivalParticipants", [
      {
        name: "festival_participants_festival_employee_uq",
        unique: true,
        fields: [
          { attribute: "festivalId" },
          { attribute: "employeeId" },
        ],
      },
      {
        name: "festival_participants_employee_status_idx",
        unique: false,
        fields: [{ attribute: "employeeId" }, { attribute: "status" }],
      },
    ]);
  }

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
    async changeColumn(tableName, columnName, definition) {
      tables.get(tableName)[columnName] = {
        ...tables.get(tableName)[columnName],
        ...definition,
      };
      mutationEvents.push(`changeColumn:${tableName}.${columnName}`);
    },
    async bulkInsert(tableName, rows) {
      if (tableName === "SequelizeMeta") {
        applied.push(...rows.map(({ name }) => name));
      }
    },
    async bulkUpdate() {},
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
  name: "202606090003-employee-identity.js",
  ...employeeIdentityMigration,
};

const assertFinalSchema = (harness) => {
  assert.equal(harness.tables.has("Employees"), true);
  assert.ok(harness.tables.get("FestivalParticipants").employeeId);

  const employeeIndexNames = new Set(
    (harness.indexes.get("Employees") || []).map(({ name }) => name)
  );
  assert.deepEqual(
    employeeIndexNames,
    new Set([
      "employees_employee_number_uq",
      "employees_user_id_uq",
      "employees_email_idx",
      "employees_status_name_idx",
    ])
  );

  const participantIndexNames = new Set(
    (harness.indexes.get("FestivalParticipants") || []).map(({ name }) => name)
  );
  assert.deepEqual(
    participantIndexNames,
    new Set([
      "festival_participants_festival_employee_uq",
      "festival_participants_employee_status_idx",
    ])
  );

  assert.ok(
    (harness.foreignKeys.get("FestivalParticipants") || []).some(
      ({ constraintName }) =>
        constraintName === "festival_participants_employee_id_fk"
    )
  );
};

for (const scenario of [
  {
    name: "fresh employee schema",
    options: {},
  },
  {
    name: "Employees exists and participant employeeId is missing",
    options: { employeesExists: true },
  },
  {
    name: "tables and employeeId exist but indexes are missing",
    options: { employeesExists: true, employeeIdExists: true },
  },
]) {
  test(`employee identity migration recovers ${scenario.name}`, async () => {
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

test("direct migration rerun is idempotent when SequelizeMeta is unavailable", async () => {
  const harness = createHarness({
    employeesExists: true,
    employeeIdExists: true,
    employeeIndexesExist: true,
    participantIndexesExist: true,
  });

  await employeeIdentityMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });
  const mutationCount = harness.mutationEvents.length;
  await employeeIdentityMigration.up({
    queryInterface: harness.queryInterface,
    Sequelize,
  });

  assertFinalSchema(harness);
  assert.equal(harness.mutationEvents.length, mutationCount);
});

test("migrator records SequelizeMeta only after migration up succeeds", async () => {
  const harness = createHarness();
  const failingMigration = {
    name: migration.name,
    async up() {
      throw new Error("simulated DDL failure");
    },
  };

  await assert.rejects(
    runMigrations({
      sequelize: harness.sequelize,
      migrations: [failingMigration],
    }),
    /simulated DDL failure/
  );
  assert.deepEqual(harness.applied, []);
});
