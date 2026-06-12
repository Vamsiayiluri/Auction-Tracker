import { randomUUID } from "node:crypto";
import {
  CRICKET_PLAYER_ROLES,
  CRICKET_SPORT_ID,
  SPORT_IDS,
} from "./sports.js";

const REQUIRED_HEADERS = ["name", "sport", "baseprice"];

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

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

  if (inQuotes) {
    return { malformed: true, values: [] };
  }

  values.push(current.trim());
  return { malformed: false, values };
};

export const parsePlayerCsv = (csvText) => {
  const errors = [];
  const lines = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const headerLineIndex = lines.findIndex((line) => line.trim());

  if (headerLineIndex === -1) {
    return {
      headers: [],
      rows: [],
      errors: [{ row: 1, message: "CSV file is empty" }],
    };
  }

  const headerResult = parseCsvLine(lines[headerLineIndex]);
  const headers = headerResult.values.map(normalizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (headerResult.malformed || missingHeaders.length) {
    return {
      headers,
      rows: [],
      errors: [
        {
          row: headerLineIndex + 1,
          message: `CSV header must include ${REQUIRED_HEADERS.join(", ")}`,
        },
      ],
    };
  }

  const rows = [];

  lines.slice(headerLineIndex + 1).forEach((line, offset) => {
    const rowNumber = headerLineIndex + offset + 2;
    if (!line.trim()) return;

    const result = parseCsvLine(line);
    if (result.malformed || result.values.length !== headers.length) {
      errors.push({ row: rowNumber, message: "Malformed CSV row" });
      return;
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = result.values[index];
    });
    rows.push({ rowNumber, row });
  });

  return { headers, rows, errors };
};

const makeError = (row, message) => ({ row, message });

export const buildPlayerImport = ({
  csvText,
  tournament,
  existingPlayerIds = [],
  sportIds = SPORT_IDS,
}) => {
  const parsed = parsePlayerCsv(csvText);
  const errors = [...parsed.errors];
  const validPlayers = [];
  const failedRows = new Set(parsed.errors.map((error) => error.row));
  const seenIds = new Set();
  const existingIds = new Set(existingPlayerIds);
  const activeSportIds = new Set(sportIds);

  parsed.rows.forEach(({ rowNumber, row }) => {
    const rowErrors = [];
    const id = row.id?.trim() || "";
    const name = row.name?.trim() || "";
    const sportId = row.sport?.trim() || "";
    const role = row.role?.trim() || "";
    const rawBasePrice = row.baseprice?.trim() || "";
    const basePrice = Number(rawBasePrice);

    if (id) {
      if (seenIds.has(id) || existingIds.has(id)) {
        rowErrors.push("Duplicate player ID rejected");
      }
      seenIds.add(id);
    }
    if (!name) rowErrors.push("Player name is required");
    if (!activeSportIds.has(sportId)) rowErrors.push("Sport must exist");
    if (tournament && sportId && sportId !== tournament.sportId) {
      rowErrors.push("Player sport must match tournament sport");
    }
    if (sportId === CRICKET_SPORT_ID && !role) {
      rowErrors.push("Role required for cricket player");
    }
    if (sportId === CRICKET_SPORT_ID && role && !CRICKET_PLAYER_ROLES.includes(role)) {
      rowErrors.push("Cricket player role is invalid");
    }
    if (rawBasePrice === "" || !Number.isFinite(basePrice) || basePrice <= 0) {
      rowErrors.push("Base price must be a positive number");
    }

    if (rowErrors.length) {
      failedRows.add(rowNumber);
      rowErrors.forEach((message) => errors.push(makeError(rowNumber, message)));
      return;
    }

    validPlayers.push({
      id: id || randomUUID(),
      name,
      sportId,
      role: sportId === CRICKET_SPORT_ID ? role : role || null,
      basePrice,
      tournamentId: tournament.id,
      soldPrice: null,
      isSold: false,
      isInAuction: false,
      teamId: null,
      auctionId: "",
    });
  });

  return {
    players: validPlayers,
    errors,
    imported: validPlayers.length,
    failed: failedRows.size,
  };
};

export const playerImportTemplates = {
  cricket: [
    "name,sport,role,basePrice",
    "Virat,cricket,Batsman,500000",
    "Bumrah,cricket,Bowler,400000",
  ].join("\n"),
  mixed: [
    "name,sport,role,basePrice",
    "Virat,cricket,Batsman,500000",
    "Magnus,chess,,500000",
    "Rahul,tt,,100000",
  ].join("\n"),
};
