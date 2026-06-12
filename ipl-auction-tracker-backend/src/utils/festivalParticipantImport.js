const SPORT_COLUMNS = Object.freeze([
  { header: "chess", sportId: "chess" },
  { header: "badminton", sportId: "badminton" },
  { header: "carrom", sportId: "carrom" },
  { header: "tabletennis", sportId: "tt" },
  { header: "cricket", sportId: "cricket" },
  { header: "volleyball", sportId: "volleyball" },
  { header: "throwball", sportId: "throwball" },
]);

const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

export const normalizeEmployeeNumber = (value) =>
  String(value || "").trim().toUpperCase();

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (inQuotes) return { malformed: true, values: [] };
  values.push(current.trim());
  return { malformed: false, values };
};

const isValidEmail = (value) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const parseFestivalParticipantCsv = (csvText, enabledSportIds = []) => {
  const lines = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim());

  if (headerIndex === -1) {
    return {
      processed: 0,
      rows: [],
      errors: [{ row: 1, message: "CSV file is empty" }],
    };
  }

  const headerResult = parseCsvLine(lines[headerIndex]);
  const headers = headerResult.values.map(normalizeHeader);
  const requiredHeaders = [
    "employeenumber",
    "name",
    ...SPORT_COLUMNS.map(({ header }) => header),
  ];
  const missing = requiredHeaders.filter((header) => !headers.includes(header));

  if (headerResult.malformed || missing.length) {
    return {
      processed: 0,
      rows: [],
      errors: [
        {
          row: headerIndex + 1,
          message:
            "CSV header must include EmployeeNumber, Name, Chess, Badminton, Carrom, TableTennis, Cricket, Volleyball, Throwball",
        },
      ],
    };
  }

  const enabled = new Set(enabledSportIds);
  const seenEmployeeNumbers = new Set();
  const rows = [];
  const errors = [];
  let processed = 0;

  lines.slice(headerIndex + 1).forEach((line, offset) => {
    const rowNumber = headerIndex + offset + 2;
    if (!line.trim()) return;
    processed += 1;

    const result = parseCsvLine(line);
    if (result.malformed || result.values.length !== headers.length) {
      errors.push({ row: rowNumber, message: "Malformed CSV row" });
      return;
    }

    const raw = {};
    headers.forEach((header, index) => {
      raw[header] = result.values[index];
    });

    const rowErrors = [];
    const employeeNumber = normalizeEmployeeNumber(raw.employeenumber);
    const name = String(raw.name || "").trim();
    const email = String(raw.email || "").trim().toLowerCase() || null;
    const department = String(raw.department || "").trim() || null;

    if (!employeeNumber) rowErrors.push("EmployeeNumber is required");
    if (!name) rowErrors.push("Name is required");
    if (employeeNumber && seenEmployeeNumbers.has(employeeNumber)) {
      rowErrors.push("EmployeeNumber is duplicated in this file");
    }
    if (!isValidEmail(email)) rowErrors.push("Email is invalid");

    const selectedSportIds = [];
    const deselectedSportIds = [];
    SPORT_COLUMNS.forEach(({ header, sportId }) => {
      const value = String(raw[header] || "").trim().toLowerCase();
      if (value !== "yes" && value !== "no") {
        rowErrors.push(`${header} must be Yes or No`);
      } else if (value === "yes") {
        if (!enabled.has(sportId)) {
          rowErrors.push(`${sportId} is not enabled for this festival`);
        } else {
          selectedSportIds.push(sportId);
        }
      } else {
        deselectedSportIds.push(sportId);
      }
    });

    if (employeeNumber) seenEmployeeNumbers.add(employeeNumber);
    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push({ row: rowNumber, message }));
      return;
    }

    rows.push({
      rowNumber,
      employee: { employeeNumber, name, email, department },
      selectedSportIds,
      deselectedSportIds,
    });
  });

  return { processed, rows, errors };
};

export const festivalParticipantImportTemplate = [
  "EmployeeNumber,Name,Email,Department,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball",
  "EMP001,John,john@example.com,Finance,Yes,No,No,No,Yes,Yes,No",
  "EMP002,Smith,smith@example.com,Operations,Yes,Yes,No,No,No,Yes,No",
].join("\n");
