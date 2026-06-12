import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  employeeImportTemplate,
  parseEmployeeCsv,
} from "../src/utils/employeeCsvImport.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Phase 2.1 employee CSV accepts valid rows and normalizes identity fields", () => {
  const result = parseEmployeeCsv(
    [
      "EmployeeNumber,Name,Email,Department",
      " emp001 ,John Smith,JOHN@COMPANY.COM,Finance",
      "EMP002,Ravi Kumar,ravi@company.com,IT",
    ].join("\n")
  );

  assert.equal(result.processed, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].employee.employeeNumber, "EMP001");
  assert.equal(result.rows[0].employee.email, "john@company.com");
  assert.match(employeeImportTemplate, /^EmployeeNumber,Name,Email,Department/);
});

test("Phase 2.1 employee CSV reports duplicates, invalid email, missing fields, and malformed rows", () => {
  const result = parseEmployeeCsv(
    [
      "EmployeeNumber,Name,Email,Department",
      "EMP001,John,john@company.com,Finance",
      "EMP001,Ravi,ravi@company.com,IT",
      "EMP003,Jane,invalid,Sales",
      "EMP004,,employee@company.com,Operations",
      '"EMP005,Broken,row',
    ].join("\n")
  );

  assert.equal(result.processed, 5);
  assert.equal(result.rows.length, 1);
  assert.ok(result.errors.some(({ message }) => /duplicated/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /Email is invalid/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /Name is required/i.test(message)));
  assert.ok(result.errors.some(({ message }) => /Malformed CSV row/i.test(message)));
});

test("Phase 2.1 employee routes expose protected import and template endpoints", async () => {
  const [routes, controller] = await Promise.all([
    readBackendFile("src/routes/employeeRoutes.js"),
    readBackendFile("src/controllers/employee.controller.js"),
  ]);

  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(routes, /"\/import",\s*multipartCsvUpload/s);
  assert.match(routes, /router\.get\("\/import\/template"/);
  assert.match(controller, /where: \{ employeeNumber: row\.employee\.employeeNumber \}/);
  assert.match(controller, /created: 0/);
  assert.match(controller, /updated: 0/);
  assert.match(controller, /failed: parsed\.processed - parsed\.rows\.length/);
  assert.match(controller, /parsed\.processed === 0 && parsed\.errors\.length/);
  assert.match(controller, /message: "Validation failed"/);
  assert.match(controller, /userId: null/);
});

test("Phase 2.1 participant APIs ignore duplicates and expose bulk summaries", async () => {
  const [routes, controller] = await Promise.all([
    readBackendFile("src/routes/festivalRoutes.js"),
    readBackendFile("src/controllers/festival.controller.js"),
  ]);

  assert.match(routes, /"\/:festivalId\/participants\/bulk"/);
  assert.match(routes, /"\/:festivalId\/participants\/add-all"/);
  assert.match(routes, /"\/:festivalId\/participants\/bulk-remove"/);
  assert.match(controller, /const uniqueEmployeeIds = \[\.\.\.new Set\(employeeIds\)\]/);
  assert.match(controller, /duplicatesIgnored/);
  assert.match(controller, /reactivated/);
  assert.match(controller, /status: "withdrawn"/);
});

test("Phase 2.1 frontend provides debounced employee search and bulk participant UX", async () => {
  const [directory, detail] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/pages/EmployeeDirectory.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
  ]);

  assert.match(directory, /window\.setTimeout/);
  assert.match(directory, /Download Template/);
  assert.match(directory, /Import Employees/);
  assert.match(directory, /new Blob\(\[response\.data\]/);
  assert.match(directory, /setTimeout\(\(\) => URL\.revokeObjectURL\(href\), 1000\)/);
  assert.match(directory, /Created \{importResult\.created\}/);
  assert.doesNotMatch(directory, />\s*Search\s*</);

  assert.match(detail, /<Autocomplete/);
  assert.match(detail, /multiple/);
  assert.match(detail, /window\.setTimeout/);
  assert.match(detail, /Select All Results/);
  assert.match(detail, /Clear Selection/);
  assert.match(detail, /Selected Employees:/);
  assert.match(detail, /Add Selected Participants/);
  assert.match(detail, /Add All Employees To Festival/);
  assert.match(detail, /Remove Selected Participants/);
});

test("Phase 2.1 does not import legacy auction or festival team models", async () => {
  const employeeController = await readBackendFile(
    "src/controllers/employee.controller.js"
  );
  const employeeImport = await readBackendFile("src/utils/employeeCsvImport.js");

  assert.doesNotMatch(
    `${employeeController}\n${employeeImport}`,
    /\b(Tournament|TournamentTeam|Player|Auction|Bid|FestivalTeam)\b/
  );
});
