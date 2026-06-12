import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPlayerImport,
  parsePlayerCsv,
  playerImportTemplates,
} from "../src/utils/playerCsvImport.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

const tournament = (sportId) => ({ id: `${sportId}-tournament`, sportId });

test("F-004 imports valid cricket CSV rows", () => {
  const result = buildPlayerImport({
    csvText: "name,sport,role,basePrice\nVirat,cricket,Batsman,500000\nBumrah,cricket,Bowler,400000",
    tournament: tournament("cricket"),
  });

  assert.equal(result.imported, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.errors.length, 0);
  assert.equal(result.players[0].sportId, "cricket");
  assert.equal(result.players[0].role, "Batsman");
});

test("F-004 imports valid chess CSV rows without roles", () => {
  const result = buildPlayerImport({
    csvText: "name,sport,basePrice\nMagnus,chess,500000",
    tournament: tournament("chess"),
  });

  assert.equal(result.imported, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.players[0].role, null);
});

test("F-004 imports valid table tennis CSV rows without roles", () => {
  const result = buildPlayerImport({
    csvText: "name,sport,basePrice\nRahul,tt,100000",
    tournament: tournament("tt"),
  });

  assert.equal(result.imported, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.players[0].sportId, "tt");
});

test("F-004 supports mixed-format CSV and rejects rows outside tournament sport", () => {
  const result = buildPlayerImport({
    csvText: playerImportTemplates.mixed,
    tournament: tournament("cricket"),
  });

  assert.equal(result.imported, 1);
  assert.equal(result.failed, 2);
  assert.match(
    result.errors.map((error) => error.message).join(" "),
    /Player sport must match tournament sport/
  );
});

test("F-004 reports invalid sport and missing cricket role by row", () => {
  const result = buildPlayerImport({
    csvText: "name,sport,role,basePrice\nBad,kabaddi,,500000\nNoRole,cricket,,400000",
    tournament: tournament("cricket"),
  });

  assert.equal(result.imported, 0);
  assert.equal(result.failed, 2);
  assert.deepEqual(
    result.errors.map((error) => error.row),
    [2, 2, 3]
  );
  assert.match(
    result.errors.map((error) => error.message).join(" "),
    /Sport must exist/
  );
  assert.match(
    result.errors.map((error) => error.message).join(" "),
    /Role required for cricket player/
  );
});

test("F-004 reports malformed CSV rows and invalid base prices", () => {
  const parsed = parsePlayerCsv("name,sport,basePrice\nBroken,chess\nQuote,\"chess,100000");
  assert.equal(parsed.errors.length, 2);
  assert.equal(parsed.errors[0].message, "Malformed CSV row");

  const result = buildPlayerImport({
    csvText: "name,sport,basePrice\nMagnus,chess,not-a-number",
    tournament: tournament("chess"),
  });
  assert.equal(result.imported, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.errors[0].message, "Base price must be a positive number");
});

test("F-004 rejects duplicate player IDs from CSV and existing players", () => {
  const result = buildPlayerImport({
    csvText: "id,name,sport,basePrice\np1,One,chess,100000\np1,Two,chess,200000\np2,Three,chess,300000",
    tournament: tournament("chess"),
    existingPlayerIds: ["p2"],
  });

  assert.equal(result.imported, 1);
  assert.equal(result.failed, 2);
  assert.equal(
    result.errors.filter((error) => error.message === "Duplicate player ID rejected")
      .length,
    2
  );
});

test("F-004 import summary counts rows, not individual validation messages", () => {
  const result = buildPlayerImport({
    csvText: "name,sport,role,basePrice\n,kabaddi,,bad\nGood,chess,,100000",
    tournament: tournament("chess"),
  });

  assert.equal(result.imported, 1);
  assert.equal(result.failed, 1);
  assert.ok(result.errors.length > result.failed);
});

test("F-004 API routes and admin UI expose CSV import and templates", async () => {
  const [routes, controller, middleware, ui, apiDocs] = await Promise.all([
    readBackendFile("src/routes/playerRoutes.js"),
    readBackendFile("src/controllers/player.controller.js"),
    readBackendFile("src/middleware/multipartCsv.middleware.js"),
    readRepoFile("ipl-auction-tracker/src/components/AuctionManagement.jsx"),
    readRepoFile("API.md"),
  ]);

  assert.match(routes, /"\/import"/);
  assert.match(routes, /authMiddleware,\s*adminMiddleware,\s*multipartCsvUpload/);
  assert.match(routes, /"\/import\/templates\/:type"/);
  assert.match(controller, /bulkCreate\(result\.players\)/);
  assert.match(middleware, /multipart\/form-data/);
  assert.match(ui, /Import Players/);
  assert.match(ui, /onUploadProgress/);
  assert.match(ui, /player-import-\$\{type\}\.csv/);
  assert.match(apiDocs, /POST `\/api\/players\/import`/);
});
