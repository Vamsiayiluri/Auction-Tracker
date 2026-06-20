import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSportExportRosterRows,
  createFestivalTeamsWorkbook,
  createSportTournamentTeamsWorkbook,
} from "../src/utils/teamExportWorkbook.js";
import {
  filterExportDataByTeamIds,
  resolveFestivalExportCompletionState,
} from "../src/controllers/teamExport.controller.js";

const repo = new URL("../", import.meta.url);
const backend = (path) => readFile(new URL(path, repo), "utf8");
const frontend = (path) =>
  readFile(new URL(`../ipl-auction-tracker/${path}`, repo), "utf8");

test("team export APIs are authenticated and mounted on exact and v2 paths", async () => {
  const [index, festivalRoutes, sportRoutes, exportRoutes] = await Promise.all([
    backend("src/index.js"),
    backend("src/routes/festivalRoutes.js"),
    backend("src/routes/sportTournamentRoutes.js"),
    backend("src/routes/teamExportRoutes.js"),
  ]);

  assert.match(index, /app\.use\("\/api", TeamExportRoutes\)/);
  assert.match(index, /app\.use\("\/api\/v2\/festivals", FestivalRoutes\)/);
  assert.match(index, /app\.use\("\/api\/v2", SportTournamentRoutes\)/);
  assert.doesNotMatch(exportRoutes, /adminMiddleware/);
  assert.doesNotMatch(
    festivalRoutes,
    /"\/:festivalId\/export\/excel"[\s\S]{0,80}adminMiddleware/
  );
  assert.doesNotMatch(
    sportRoutes,
    /"\/sport-tournaments\/:sportTournamentId\/export\/excel"[\s\S]{0,80}adminMiddleware/
  );
});

test("team export workbook keeps scorecard-compatible columns", async () => {
  const [pkg, workbook, controller] = await Promise.all([
    backend("package.json"),
    backend("src/utils/teamExportWorkbook.js"),
    backend("src/controllers/teamExport.controller.js"),
  ]);

  assert.match(pkg, /"exceljs"/);
  for (const column of [
    "Team Name",
    "Player Name",
    "Employee ID",
    "Email",
    "Department",
    "Base Price",
    "Sold Price",
    "Festival Team",
    "Credits Used",
    "Role",
  ]) {
    assert.match(workbook, new RegExp(column));
  }
  assert.match(workbook, /workbook\.addWorksheet\("ImportData"\)/);
  assert.match(workbook, /worksheet\.autoFilter/);
  assert.match(workbook, /worksheet\.views = \[\{ state: "frozen", ySplit: 1 \}\]/);
  assert.match(workbook, /worksheet\.getRow\(1\)\.font = \{ bold: true \}/);
  assert.match(controller, /Auction must be completed before export\./);
  assert.match(controller, /workbook\.xlsx\.write\(res\)/);
});

test("Festival export validation uses auction completion state, not Festival status alone", async () => {
  const controller = await backend("src/controllers/teamExport.controller.js");

  assert.doesNotMatch(controller, /festival\.status !== "completed"/);
  assert.match(controller, /resolveFestivalExportCompletionState/);
  assert.match(controller, /auctionConfigAuctionStatus: auctionConfig\?\.auctionStatus/);
  assert.match(controller, /resolvedCompletionState !== "completed"/);
  assert.match(controller, /"festival\.status": festival\.status/);
  assert.match(controller, /"auctionConfig\.status": auctionConfig\?\.status/);
  assert.match(controller, /"auctionConfig\.auctionStatus": auctionConfig\?\.auctionStatus/);
  assert.match(controller, /resolvedCompletionState/);
});

test("Festival export completion resolver allows only completed auction config", () => {
  assert.equal(
    resolveFestivalExportCompletionState({
      festivalStatus: "draft",
      auctionConfigStatus: "completed",
      auctionConfigAuctionStatus: "completed",
    }),
    "completed"
  );
  assert.equal(
    resolveFestivalExportCompletionState({
      festivalStatus: "draft",
      auctionConfigStatus: "started",
      auctionConfigAuctionStatus: "live",
    }),
    "live"
  );
  assert.equal(
    resolveFestivalExportCompletionState({
      festivalStatus: "draft",
      auctionConfigStatus: "setup",
      auctionConfigAuctionStatus: "setup",
    }),
    "setup"
  );
});

test("owner export filtering keeps only owned Festival teams and rows", () => {
  const teams = [
    { id: "trojans", name: "Trojans" },
    { id: "demons", name: "Demons" },
  ];
  const results = [
    { festivalTeamId: "trojans", participant: { employee: { name: "Vamsi" } } },
    { festivalTeamId: "demons", participant: { employee: { name: "Kiran" } } },
  ];

  const scoped = filterExportDataByTeamIds({
    teams,
    results,
    teamIds: new Set(["trojans"]),
    resultTeamIdKey: "festivalTeamId",
  });

  assert.deepEqual(scoped.teams.map((team) => team.name), ["Trojans"]);
  assert.deepEqual(
    scoped.results.map((result) => result.participant.employee.name),
    ["Vamsi"]
  );
});

test("captain export filtering keeps only managed Sport teams and rows", () => {
  const teams = [
    { id: "cricket-a", name: "Cricket Team A" },
    { id: "cricket-b", name: "Cricket Team B" },
  ];
  const results = [
    { sportTeamId: "cricket-a", participant: { employee: { name: "Ravi" } } },
    { sportTeamId: "cricket-b", participant: { employee: { name: "Kiran" } } },
  ];

  const scoped = filterExportDataByTeamIds({
    teams,
    results,
    teamIds: new Set(["cricket-a"]),
    resultTeamIdKey: "sportTeamId",
  });

  assert.deepEqual(scoped.teams.map((team) => team.name), ["Cricket Team A"]);
  assert.deepEqual(
    scoped.results.map((result) => result.participant.employee.name),
    ["Ravi"]
  );
});

test("ImportData sheet is flat, second, and matches Festival exported player count", () => {
  const workbook = createFestivalTeamsWorkbook({
    festival: { name: "Cognine Premier League" },
    teams: [
      { id: "trojans", name: "Trojans" },
      { id: "demons", name: "Demons" },
    ],
    results: [
      {
        festivalTeamId: "trojans",
        team: { name: "Trojans" },
        participant: {
          employee: {
            id: "employee-1",
            employeeNumber: "EMP001",
            name: "Vamsi",
            email: "vamsi@example.com",
            department: "Engineering",
          },
        },
        auction: { basePrice: 100 },
        finalAmount: 250,
      },
      {
        festivalTeamId: "demons",
        team: { name: "Demons" },
        participant: {
          employee: {
            id: "employee-2",
            employeeNumber: "EMP002",
            name: "Kiran",
            email: "",
            department: "Finance",
          },
        },
        auction: { basePrice: 100 },
        finalAmount: 200,
      },
    ],
  });

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Tournament Info", "ImportData", "Trojans", "Demons"]
  );
  const importData = workbook.getWorksheet("ImportData");
  assert.equal(importData.actualRowCount - 1, 2);
  assert.deepEqual(importData.getRow(1).values.slice(1), [
    "Team Name",
    "Player Name",
    "Employee ID",
    "Email",
    "Department",
    "Role",
    "Base Price",
    "Sold Price",
  ]);
  assert.equal(importData.getRow(1).values.includes("Festival Team"), false);
  assert.equal(importData.getRow(1).values.includes("Credits Used"), false);
  assert.deepEqual(importData.getRow(2).values.slice(1), [
    "Trojans",
    "Vamsi",
    "EMP001",
    "vamsi@example.com",
    "Engineering",
    "Player",
    100,
    250,
  ]);
  assert.deepEqual(workbook.getWorksheet("Trojans").getRow(1).values.slice(1), [
    "Team Name",
    "Player Name",
    "Employee ID",
    "Email",
    "Department",
    "Role",
    "Base Price",
    "Sold Price",
  ]);
});

test("ImportData sheet matches Sport exported roster and includes role", () => {
  const workbook = createSportTournamentTeamsWorkbook({
    tournament: { name: "Cricket League" },
    teams: [
      { id: "warriors", name: "Warriors" },
      { id: "titans", name: "Titans" },
    ],
    results: [
      {
        sportTeamId: "warriors",
        team: { name: "Warriors" },
        participant: {
          employee: {
            id: "employee-1",
            employeeNumber: "EMP001",
            name: "Vamsi",
            email: "vamsi@example.com",
            department: "Engineering",
          },
          teamMembership: { team: { name: "Trojans" } },
        },
        finalCredits: 45,
      },
      {
        sportTeamId: "titans",
        team: { name: "Titans" },
        participant: {
          employee: {
            id: "employee-2",
            employeeNumber: "EMP002",
            name: "Ravi",
            email: "",
            department: "",
          },
          teamMembership: { team: { name: "Demons" } },
        },
        finalCredits: 30,
      },
    ],
    captains: [
      {
        sportTeamId: "warriors",
        participant: {
          id: "participant-captain",
          employee: {
            id: "employee-3",
            employeeNumber: "EMP003",
            name: "Kiran",
            email: "kiran@example.com",
            department: "Operations",
          },
          teamMembership: { team: { name: "Trojans" } },
        },
      },
    ],
  });

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Tournament Info", "ImportData", "Warriors", "Titans"]
  );
  const importData = workbook.getWorksheet("ImportData");
  assert.equal(importData.actualRowCount - 1, 3);
  assert.deepEqual(importData.getRow(2).values.slice(1), [
    "Warriors",
    "Kiran",
    "EMP003",
    "kiran@example.com",
    "Operations",
    "Trojans",
    "",
    "Captain",
  ]);
  assert.deepEqual(importData.getRow(3).values.slice(1), [
    "Warriors",
    "Vamsi",
    "EMP001",
    "vamsi@example.com",
    "Engineering",
    "Trojans",
    45,
    "Player",
  ]);
  assert.deepEqual(importData.getRow(1).values.slice(1), [
    "Team Name",
    "Player Name",
    "Employee ID",
    "Email",
    "Department",
    "Festival Team",
    "Credits Used",
    "Role",
  ]);
  assert.deepEqual(workbook.getWorksheet("Warriors").getRow(1).values.slice(1), [
    "Team Name",
    "Player Name",
    "Employee ID",
    "Email",
    "Department",
    "Festival Team",
    "Credits Used",
    "Role",
  ]);
});

test("Sport export roster includes captains and suppresses duplicate player rows", () => {
  const teams = [
    { id: "warriors", name: "Warriors" },
    { id: "titans", name: "Titans" },
  ];
  const captainParticipant = {
    id: "participant-captain",
    employee: {
      id: "employee-1",
      employeeNumber: "EMP001",
      name: "Vamsi",
      email: "vamsi@example.com",
      department: "Engineering",
    },
    teamMembership: { team: { name: "Trojans" } },
  };
  const rows = buildSportExportRosterRows({
    teams,
    captains: [
      {
        sportTeamId: "warriors",
        participant: captainParticipant,
      },
      {
        sportTeamId: "titans",
        participant: {
          id: "participant-titans-captain",
          employee: {
            id: "employee-2",
            employeeNumber: "EMP002",
            name: "Ravi",
            email: "ravi@example.com",
            department: "Finance",
          },
          teamMembership: { team: { name: "Demons" } },
        },
      },
    ],
    results: [
      {
        sportTeamId: "warriors",
        participant: captainParticipant,
        finalCredits: 50,
      },
      {
        sportTeamId: "warriors",
        participant: {
          id: "participant-player",
          employee: {
            id: "employee-3",
            employeeNumber: "EMP003",
            name: "Kiran",
            email: "kiran@example.com",
            department: "Operations",
          },
          teamMembership: { team: { name: "Trojans" } },
        },
        finalCredits: 35,
      },
    ],
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => [row.teamName, row.playerName, row.role, row.creditsUsed]),
    [
      ["Warriors", "Vamsi", "Captain", 50],
      ["Titans", "Ravi", "Captain", ""],
      ["Warriors", "Kiran", "Player", 35],
    ]
  );
  assert.equal(rows.filter((row) => row.employeeId === "EMP001").length, 1);
});

test("completed auction screens expose export download actions", async () => {
  const files = await Promise.all([
    frontend("src/pages/FestivalAuctionResultsPage.jsx"),
    frontend("src/pages/FestivalDetail.jsx"),
    frontend("src/components/FestivalControlCenter.jsx"),
    frontend("src/components/FestivalOverview.jsx"),
    frontend("src/components/TeamExportButton.jsx"),
    frontend("src/pages/SportAuctionResultsPage.jsx"),
    frontend("src/pages/SportTournamentCommandCenter.jsx"),
    frontend("src/pages/SportTournamentWorkspace.jsx"),
  ]);
  const source = files.join("\n");

  assert.match(source, /TeamExportButton/);
  assert.match(source, /\/v2\/festivals\/\$\{festivalId\}\/export\/excel/);
  assert.match(source, /\/v2\/sport-tournaments\/\$\{(?:id|sportTournamentId)\}\/export\/excel/);
  assert.match(source, /user\?\.role === "admin"/);
  assert.match(source, /Export Teams to Excel/);
});
