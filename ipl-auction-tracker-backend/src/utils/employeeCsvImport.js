const REQUIRED_HEADERS = Object.freeze([
  "employeenumber",
  "name",
  "email",
  "department",
  "gender",
]);

const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[\s_-]+/g, "")
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

  if (inQuotes) return { malformed: true, values: [] };
  values.push(current.trim());
  return { malformed: false, values };
};

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const normalizeEmployeeGender = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "male" || normalized === "female"
    ? normalized
    : null;
};

export const parseEmployeeCsv = (csvText) => {
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
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header)
  );

  if (headerResult.malformed || missingHeaders.length) {
    return {
      processed: 0,
      rows: [],
      errors: [
        {
          row: headerIndex + 1,
          message:
            "CSV header must include EmployeeNumber, Name, Email, Department, Gender",
        },
      ],
    };
  }

  const rows = [];
  const errors = [];
  const seenEmployeeNumbers = new Set();
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

    const employee = {
      employeeNumber: String(raw.employeenumber || "").trim().toUpperCase(),
      name: String(raw.name || "").trim(),
      email: String(raw.email || "").trim().toLowerCase(),
      department: String(raw.department || "").trim(),
      gender: normalizeEmployeeGender(raw.gender),
    };
    const rowErrors = [];

    if (!employee.employeeNumber) rowErrors.push("EmployeeNumber is required");
    if (!employee.name) rowErrors.push("Name is required");
    if (!employee.email) rowErrors.push("Email is required");
    if (!employee.department) rowErrors.push("Department is required");
    if (!String(raw.gender || "").trim()) {
      rowErrors.push("Gender is required");
    } else if (!employee.gender) {
      rowErrors.push("Gender must be Male or Female");
    }
    if (employee.email && !isValidEmail(employee.email)) {
      rowErrors.push("Email is invalid");
    }
    if (
      employee.employeeNumber &&
      seenEmployeeNumbers.has(employee.employeeNumber)
    ) {
      rowErrors.push("EmployeeNumber is duplicated in this file");
    }

    if (employee.employeeNumber) {
      seenEmployeeNumbers.add(employee.employeeNumber);
    }
    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push({ row: rowNumber, message }));
      return;
    }

    rows.push({ rowNumber, employee });
  });

  return { processed, rows, errors };
};

export const employeeImportTemplate = [
  "EmployeeNumber,Name,Email,Department,Gender",
  "EMP001,John Smith,john@company.com,Finance,Male",
  "EMP002,Priya Shah,priya@company.com,IT,Female",
].join("\n");

const escapeCsvValue = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const buildEmployeeExportCsv = (employees) =>
  [
    [
      "EmployeeNumber",
      "Name",
      "Email",
      "Department",
      "Gender",
      "EmploymentStatus",
      "IdentityStatus",
      "HasLogin",
    ],
    ...employees.map((employee) => [
      employee.employeeNumber,
      employee.name,
      employee.email,
      employee.department,
      employee.gender === "female" ? "Female" : "Male",
      employee.employmentStatus,
      employee.identityStatus,
      employee.userId ? "Yes" : "No",
    ]),
  ]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
