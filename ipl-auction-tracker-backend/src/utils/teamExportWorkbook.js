import ExcelJS from "exceljs";

const INVALID_SHEET_CHARS = /[\\/?*[\]:]/g;

export const sanitizeWorkbookFilename = (name = "Tournament") =>
  `${String(name || "Tournament")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Tournament"}_Teams.xlsx`;

const sanitizeSheetName = (name, fallback, usedNames) => {
  const clean =
    String(name || fallback || "Team")
      .replace(INVALID_SHEET_CHARS, " ")
      .trim()
      .slice(0, 31) || "Team";
  let nextName = clean;
  let suffix = 2;
  while (usedNames.has(nextName.toLowerCase())) {
    const tail = ` ${suffix}`;
    nextName = `${clean.slice(0, 31 - tail.length)}${tail}`;
    suffix += 1;
  }
  usedNames.add(nextName.toLowerCase());
  return nextName;
};

const toNumberOrBlank = (value) =>
  value === null || value === undefined || value === "" ? "" : Number(value);

const formatWorksheet = (worksheet, { autoFilter = false } = {}) => {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  if (autoFilter) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
  }
  worksheet.columns.forEach((column) => {
    const maxLength = Math.max(
      12,
      ...column.values
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).length)
    );
    column.width = Math.min(maxLength + 2, 42);
  });
};

const addTournamentInfoSheet = (workbook, rows) => {
  const worksheet = workbook.addWorksheet("Tournament Info");
  worksheet.columns = [
    { header: "Field", key: "field" },
    { header: "Value", key: "value" },
  ];
  rows.forEach(([field, value]) => worksheet.addRow({ field, value }));
  formatWorksheet(worksheet);
};

const addImportDataSheet = (workbook, columns, rows) => {
  const worksheet = workbook.addWorksheet("ImportData");
  worksheet.columns = columns;
  rows.forEach((row) => worksheet.addRow(row));
  formatWorksheet(worksheet, { autoFilter: true });
};

const festivalImportColumns = [
  { header: "Team Name", key: "teamName" },
  { header: "Player Name", key: "playerName" },
  { header: "Employee ID", key: "employeeId" },
  { header: "Email", key: "email" },
  { header: "Department", key: "department" },
  { header: "Role", key: "role" },
  { header: "Base Price", key: "basePrice" },
  { header: "Sold Price", key: "soldPrice" },
];

const sportImportColumns = [
  { header: "Team Name", key: "teamName" },
  { header: "Player Name", key: "playerName" },
  { header: "Employee ID", key: "employeeId" },
  { header: "Email", key: "email" },
  { header: "Department", key: "department" },
  { header: "Festival Team", key: "festivalTeam" },
  { header: "Credits Used", key: "creditsUsed" },
  { header: "Role", key: "role" },
];

const getParticipantKey = (participant) => {
  const employee = participant?.employee;
  return String(
    participant?.id ||
      employee?.id ||
      employee?.employeeNumber ||
      employee?.email ||
      employee?.name ||
      ""
  );
};

const createSportResultRow = ({ result, team }) => {
  const employee = result.participant?.employee;
  return {
    teamId: result.sportTeamId,
    teamName: team?.name || "",
    playerName: employee?.name || "",
    employeeId: employee?.employeeNumber || employee?.id || "",
    email: employee?.email || "",
    department: employee?.department || "",
    festivalTeam: result.participant?.teamMembership?.team?.name || "",
    creditsUsed: toNumberOrBlank(result.finalCredits),
    role: "Player",
    participantKey: getParticipantKey(result.participant),
  };
};

const createSportCaptainRow = ({ captain, team, matchingResult }) => {
  const participant = captain.participant || matchingResult?.participant;
  const employee = participant?.employee;
  return {
    teamId: captain.sportTeamId,
    teamName: team?.name || captain.team?.name || "",
    playerName: employee?.name || "",
    employeeId: employee?.employeeNumber || employee?.id || "",
    email: employee?.email || "",
    department: employee?.department || "",
    festivalTeam: participant?.teamMembership?.team?.name || "",
    creditsUsed: matchingResult ? toNumberOrBlank(matchingResult.finalCredits) : "",
    role: "Captain",
    participantKey: getParticipantKey(participant),
  };
};

export const buildSportExportRosterRows = ({ teams, results, captains = [] }) => {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const resultByParticipantKey = new Map();
  results.forEach((result) => {
    const participantKey = getParticipantKey(result.participant);
    if (participantKey && !resultByParticipantKey.has(participantKey)) {
      resultByParticipantKey.set(participantKey, result);
    }
  });

  const rowsByParticipantKey = new Map();
  const rowsWithoutParticipantKey = [];

  captains.forEach((captain) => {
    const participantKey = getParticipantKey(captain.participant);
    const matchingResult = participantKey
      ? resultByParticipantKey.get(participantKey)
      : null;
    const row = createSportCaptainRow({
      captain,
      team: teamById.get(captain.sportTeamId),
      matchingResult,
    });
    if (participantKey) {
      rowsByParticipantKey.set(participantKey, row);
    } else {
      rowsWithoutParticipantKey.push(row);
    }
  });

  results.forEach((result) => {
    const participantKey = getParticipantKey(result.participant);
    if (participantKey && rowsByParticipantKey.has(participantKey)) return;
    const row = createSportResultRow({
      result,
      team: result.team || teamById.get(result.sportTeamId),
    });
    if (participantKey) {
      rowsByParticipantKey.set(participantKey, row);
    } else {
      rowsWithoutParticipantKey.push(row);
    }
  });

  return [...rowsByParticipantKey.values(), ...rowsWithoutParticipantKey];
};

const buildWorkbook = ({ creator, subject, company = "Auction Tracker" }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator;
  workbook.lastModifiedBy = creator;
  workbook.company = company;
  workbook.subject = subject;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  return workbook;
};

export const createFestivalTeamsWorkbook = ({
  festival,
  teams,
  results,
  exportDate = new Date(),
}) => {
  const workbook = buildWorkbook({
    creator: "Auction Tracker",
    subject: "Festival finalized team allocations",
  });
  const resultsByTeamId = new Map();
  const teamById = new Map(teams.map((team) => [team.id, team]));
  results.forEach((result) => {
    const list = resultsByTeamId.get(result.festivalTeamId) || [];
    list.push(result);
    resultsByTeamId.set(result.festivalTeamId, list);
  });

  addTournamentInfoSheet(workbook, [
    ["Tournament Type", "Festival"],
    ["Tournament Name", festival.name],
    ["Export Date", exportDate],
    ["Total Teams", teams.length],
    ["Total Players", results.length],
  ]);

  addImportDataSheet(
    workbook,
    festivalImportColumns,
    results.map((result) => {
      const employee = result.participant?.employee;
      const team = result.team || teamById.get(result.festivalTeamId);
      return {
        teamName: team?.name || "",
        playerName: employee?.name || "",
        employeeId: employee?.employeeNumber || employee?.id || "",
        email: employee?.email || "",
        department: employee?.department || "",
        role: "Player",
        basePrice: toNumberOrBlank(result.auction?.basePrice),
        soldPrice: toNumberOrBlank(result.finalAmount),
      };
    })
  );

  const usedNames = new Set(["tournament info", "importdata"]);
  teams.forEach((team, index) => {
    const worksheet = workbook.addWorksheet(
      sanitizeSheetName(team.name, `Team ${index + 1}`, usedNames)
    );
    worksheet.columns = [
      { header: "Team Name", key: "teamName" },
      { header: "Player Name", key: "playerName" },
      { header: "Employee ID", key: "employeeId" },
      { header: "Email", key: "email" },
      { header: "Department", key: "department" },
      { header: "Role", key: "role" },
      { header: "Base Price", key: "basePrice" },
      { header: "Sold Price", key: "soldPrice" },
    ];
    (resultsByTeamId.get(team.id) || []).forEach((result) => {
      const employee = result.participant?.employee;
      worksheet.addRow({
        teamName: team.name,
        playerName: employee?.name || "",
        employeeId: employee?.employeeNumber || employee?.id || "",
        email: employee?.email || "",
        department: employee?.department || "",
        role: "Player",
        basePrice: toNumberOrBlank(result.auction?.basePrice),
        soldPrice: toNumberOrBlank(result.finalAmount),
      });
    });
    formatWorksheet(worksheet);
  });

  return workbook;
};

export const createSportTournamentTeamsWorkbook = ({
  tournament,
  teams,
  results,
  captains = [],
  exportDate = new Date(),
}) => {
  const workbook = buildWorkbook({
    creator: "Auction Tracker",
    subject: "Sport Tournament finalized team allocations",
  });
  const rosterRows = buildSportExportRosterRows({ teams, results, captains });
  const rosterRowsByTeamId = new Map();
  rosterRows.forEach((row) => {
    const list = rosterRowsByTeamId.get(row.teamId) || [];
    list.push(row);
    rosterRowsByTeamId.set(row.teamId, list);
  });

  addTournamentInfoSheet(workbook, [
    ["Tournament Type", "Sport Tournament"],
    ["Tournament Name", tournament.name],
    ["Export Date", exportDate],
    ["Total Teams", teams.length],
    ["Total Players", rosterRows.length],
  ]);

  addImportDataSheet(workbook, sportImportColumns, rosterRows);

  const usedNames = new Set(["tournament info", "importdata"]);
  teams.forEach((team, index) => {
    const worksheet = workbook.addWorksheet(
      sanitizeSheetName(team.name, `Team ${index + 1}`, usedNames)
    );
    worksheet.columns = [
      { header: "Team Name", key: "teamName" },
      { header: "Player Name", key: "playerName" },
      { header: "Employee ID", key: "employeeId" },
      { header: "Email", key: "email" },
      { header: "Department", key: "department" },
      { header: "Festival Team", key: "festivalTeam" },
      { header: "Credits Used", key: "creditsUsed" },
      { header: "Role", key: "role" },
    ];
    (rosterRowsByTeamId.get(team.id) || []).forEach((row) => {
      worksheet.addRow({
        teamName: team.name,
        playerName: row.playerName,
        employeeId: row.employeeId,
        email: row.email,
        department: row.department,
        festivalTeam: row.festivalTeam,
        creditsUsed: row.creditsUsed,
        role: row.role,
      });
    });
    formatWorksheet(worksheet);
  });

  return workbook;
};
