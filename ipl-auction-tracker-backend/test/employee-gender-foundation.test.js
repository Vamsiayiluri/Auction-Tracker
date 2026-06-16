import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEmployeeSchema,
  listEmployeesSchema,
  updateEmployeeSchema,
} from "../src/validation/employee.validation.js";
import {
  buildEmployeeExportCsv,
  parseEmployeeCsv,
} from "../src/utils/employeeCsvImport.js";
import { toEmployeeResponse } from "../src/utils/employeeResponse.js";
import * as employeeGenderMigration from "../migrations/202606140001-employee-gender.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Employee gender validation is required and normalized by imports", () => {
  assert.equal(
    createEmployeeSchema.safeParse({
      body: {
        employeeNumber: "EMP001",
        name: "John",
        gender: "male",
      },
    }).success,
    true
  );
  assert.equal(
    createEmployeeSchema.safeParse({
      body: { employeeNumber: "EMP001", name: "John" },
    }).success,
    false
  );
  assert.equal(
    updateEmployeeSchema.safeParse({
      params: { employeeId: "employee-1" },
      body: { gender: "female" },
    }).success,
    true
  );
  assert.equal(
    listEmployeesSchema.safeParse({
      query: { page: "1", pageSize: "25", gender: "female" },
    }).success,
    true
  );

  const parsed = parseEmployeeCsv(
    [
      "EmployeeNumber,Name,Email,Department,Gender",
      "EMP001,John,john@example.com,Finance,mAlE",
      "EMP002,Priya,priya@example.com,HR,FEMALE",
    ].join("\n")
  );
  assert.deepEqual(
    parsed.rows.map(({ employee }) => employee.gender),
    ["male", "female"]
  );
});

test("Employee DTO and export include canonical gender", () => {
  const response = toEmployeeResponse({
    id: "employee-1",
    employeeNumber: "EMP001",
    name: "Priya",
    email: "priya@example.com",
    department: "HR",
    gender: "female",
    employmentStatus: "active",
    source: "manual",
    identityStatus: "verified",
    userId: null,
  });
  assert.equal(response.gender, "female");

  const csv = buildEmployeeExportCsv([response]);
  assert.match(csv, /EmployeeNumber,Name,Email,Department,Gender/);
  assert.match(csv, /EMP001,Priya,priya@example\.com,HR,Female/);
});

test("Employee gender migration is staged, idempotent, and flags backfills", async () => {
  const migration = await readBackendFile(
    "migrations/202606140001-employee-gender.js"
  );

  assert.match(migration, /if \(!columns\.gender\)/);
  assert.match(migration, /allowNull: true/);
  assert.match(migration, /WHERE gender IS NULL/);
  assert.match(migration, /identityStatus = 'needs_review'/);
  assert.match(migration, /allowNull: false/);
  assert.match(migration, /employees_gender_idx/);
});

test("Employee gender migration recovers after the nullable column already exists", async () => {
  const columns = {
    id: { allowNull: false },
    identityStatus: { allowNull: false },
    updatedAt: { allowNull: false },
    gender: { allowNull: true },
  };
  const indexes = [];
  const mutations = [];
  const queryInterface = {
    sequelize: {
      async query(sql) {
        assert.match(sql, /WHERE gender IS NULL/);
      },
    },
    async showAllTables() {
      return ["Employees"];
    },
    async describeTable() {
      return columns;
    },
    async addColumn() {
      throw new Error("gender column should not be added twice");
    },
    async changeColumn(tableName, columnName, definition) {
      Object.assign(columns[columnName], definition);
      mutations.push(`change:${tableName}.${columnName}`);
    },
    async showIndex() {
      return indexes;
    },
    async addIndex(tableName, fields, options) {
      indexes.push({
        name: options.name,
        unique: Boolean(options.unique),
        fields: fields.map((attribute) => ({ attribute })),
      });
      mutations.push(`index:${tableName}.${options.name}`);
    },
  };
  const Sequelize = {
    ENUM: (...values) => ({ values }),
  };

  await employeeGenderMigration.up({ queryInterface, Sequelize });
  await employeeGenderMigration.up({ queryInterface, Sequelize });

  assert.equal(columns.gender.allowNull, false);
  assert.deepEqual(mutations, [
    "change:Employees.gender",
    "index:Employees.employees_gender_idx",
  ]);
});

test("Employee UI and participant views expose gender without participant storage", async () => {
  const [directory, detail, participantModel] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/pages/EmployeeDirectory.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readBackendFile("src/models/festivalParticipant.model.js"),
  ]);

  assert.match(directory, /Export Employees/);
  assert.match(directory, /<TableCell>Gender<\/TableCell>/);
  assert.match(directory, /value="female"/);
  assert.match(detail, /participant\.employee\?\.gender/);
  assert.doesNotMatch(participantModel, /\bgender\b/);
});
