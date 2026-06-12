import { randomUUID } from "node:crypto";

const EMPLOYEES_TABLE = "Employees";
const PARTICIPANTS_TABLE = "FestivalParticipants";

const timestampColumns = (Sequelize) => ({
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn("NOW"),
  },
  updatedAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn("NOW"),
  },
});

const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

const tableExists = async (queryInterface, tableName) =>
  (await tableNames(queryInterface)).some(
    (existingName) =>
      String(existingName).toLowerCase() === tableName.toLowerCase()
  );

const ensureColumn = async (
  queryInterface,
  tableName,
  columnName,
  definition
) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const normalizeIndexFields = (index) =>
  index.fields.map((field) => field.attribute || field.name);

const ensureIndex = async (
  queryInterface,
  tableName,
  fields,
  options = {}
) => {
  const columns = await queryInterface.describeTable(tableName);
  if (fields.some((field) => !columns[field])) {
    throw new Error(
      `Cannot create index ${options.name || fields.join("_")} because ${tableName} is missing a required column`
    );
  }

  const indexes = await queryInterface.showIndex(tableName);
  const namedIndex = indexes.find((index) => index.name === options.name);
  if (
    namedIndex &&
    (normalizeIndexFields(namedIndex).join(",") !== fields.join(",") ||
      Boolean(namedIndex.unique) !== Boolean(options.unique))
  ) {
    throw new Error(
      `Index ${options.name} exists with an incompatible definition`
    );
  }
  const exists =
    Boolean(namedIndex) ||
    indexes.some(
      (index) =>
        normalizeIndexFields(index).join(",") === fields.join(",") &&
        Boolean(index.unique) === Boolean(options.unique)
    );

  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

const ensureForeignKey = async (
  queryInterface,
  tableName,
  field,
  referencedTable,
  options
) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[field]) {
    throw new Error(
      `Cannot create foreign key ${options.name} because ${tableName}.${field} does not exist`
    );
  }
  if (!(await tableExists(queryInterface, referencedTable))) {
    throw new Error(
      `Cannot create foreign key ${options.name} because ${referencedTable} does not exist`
    );
  }

  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  const namedReference = references.find(
    (reference) => reference.constraintName === options.name
  );
  if (
    namedReference &&
    (namedReference.columnName !== field ||
      String(namedReference.referencedTableName).toLowerCase() !==
        referencedTable.toLowerCase())
  ) {
    throw new Error(
      `Foreign key ${options.name} exists with an incompatible definition`
    );
  }
  const exists =
    Boolean(namedReference) ||
    references.some(
      (reference) =>
        reference.columnName === field &&
        String(reference.referencedTableName).toLowerCase() ===
          referencedTable.toLowerCase()
    );

  if (!exists) {
    await queryInterface.addConstraint(tableName, {
      fields: [field],
      type: "foreign key",
      references: { table: referencedTable, field: "id" },
      ...options,
    });
  }
};

const ensureEmployeesTable = async (queryInterface, Sequelize) => {
  if (!(await tableExists(queryInterface, EMPLOYEES_TABLE))) {
    await queryInterface.createTable(EMPLOYEES_TABLE, {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
      employeeNumber: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      department: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      employmentStatus: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      source: {
        type: Sequelize.ENUM("hr_import", "manual", "legacy_user", "hris"),
        allowNull: false,
        defaultValue: "manual",
      },
      identityStatus: {
        type: Sequelize.ENUM("verified", "provisional", "needs_review"),
        allowNull: false,
        defaultValue: "verified",
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...timestampColumns(Sequelize),
    });
  }

  const employeeColumns = {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    employeeNumber: {
      type: Sequelize.STRING(80),
      allowNull: true,
    },
    name: {
      type: Sequelize.STRING(160),
      allowNull: false,
      defaultValue: "Legacy employee",
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    department: {
      type: Sequelize.STRING(160),
      allowNull: true,
    },
    employmentStatus: {
      type: Sequelize.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    source: {
      type: Sequelize.ENUM("hr_import", "manual", "legacy_user", "hris"),
      allowNull: false,
      defaultValue: "manual",
    },
    identityStatus: {
      type: Sequelize.ENUM("verified", "provisional", "needs_review"),
      allowNull: false,
      defaultValue: "verified",
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    ...timestampColumns(Sequelize),
  };

  for (const [columnName, definition] of Object.entries(employeeColumns)) {
    await ensureColumn(
      queryInterface,
      EMPLOYEES_TABLE,
      columnName,
      definition
    );
  }
};

const backfillParticipants = async (queryInterface) => {
  const [legacyParticipants] = await queryInterface.sequelize.query(`
    SELECT DISTINCT
      fp.userId,
      u.name,
      u.email
    FROM FestivalParticipants fp
    INNER JOIN Users u ON u.id = fp.userId
    WHERE fp.employeeId IS NULL
      AND fp.userId IS NOT NULL
  `);

  for (const legacy of legacyParticipants) {
    const [existingEmployees] = await queryInterface.sequelize.query(
      `
        SELECT id
        FROM Employees
        WHERE userId = :userId
        LIMIT 1
      `,
      { replacements: { userId: legacy.userId } }
    );
    const employeeId = existingEmployees[0]?.id || randomUUID();
    const now = new Date();

    if (!existingEmployees.length) {
      await queryInterface.bulkInsert(EMPLOYEES_TABLE, [
        {
          id: employeeId,
          employeeNumber: null,
          name: legacy.name || legacy.email || "Legacy employee",
          email: legacy.email || null,
          department: null,
          employmentStatus: "active",
          source: "legacy_user",
          identityStatus: "needs_review",
          userId: legacy.userId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    await queryInterface.bulkUpdate(
      PARTICIPANTS_TABLE,
      { employeeId, updatedAt: now },
      { userId: legacy.userId, employeeId: null }
    );
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, PARTICIPANTS_TABLE))) {
    throw new Error(
      "FestivalParticipants must exist before employee identity migration"
    );
  }

  await ensureEmployeesTable(queryInterface, Sequelize);

  await ensureForeignKey(
    queryInterface,
    EMPLOYEES_TABLE,
    "userId",
    "Users",
    {
      name: "employees_user_id_fk",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    }
  );

  await ensureIndex(queryInterface, EMPLOYEES_TABLE, ["employeeNumber"], {
    name: "employees_employee_number_uq",
    unique: true,
  });
  await ensureIndex(queryInterface, EMPLOYEES_TABLE, ["userId"], {
    name: "employees_user_id_uq",
    unique: true,
  });
  await ensureIndex(queryInterface, EMPLOYEES_TABLE, ["email"], {
    name: "employees_email_idx",
  });
  await ensureIndex(
    queryInterface,
    EMPLOYEES_TABLE,
    ["employmentStatus", "name"],
    {
      name: "employees_status_name_idx",
    }
  );

  await ensureColumn(
    queryInterface,
    PARTICIPANTS_TABLE,
    "employeeId",
    {
      type: Sequelize.STRING,
      allowNull: true,
    }
  );

  await ensureForeignKey(
    queryInterface,
    PARTICIPANTS_TABLE,
    "employeeId",
    EMPLOYEES_TABLE,
    {
      name: "festival_participants_employee_id_fk",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    }
  );

  await backfillParticipants(queryInterface);

  await ensureIndex(
    queryInterface,
    PARTICIPANTS_TABLE,
    ["festivalId", "employeeId"],
    {
      name: "festival_participants_festival_employee_uq",
      unique: true,
    }
  );
  await ensureIndex(
    queryInterface,
    PARTICIPANTS_TABLE,
    ["employeeId", "status"],
    {
      name: "festival_participants_employee_status_idx",
    }
  );

  const participantColumns =
    await queryInterface.describeTable(PARTICIPANTS_TABLE);
  if (participantColumns.userId && participantColumns.userId.allowNull === false) {
    await queryInterface.changeColumn(PARTICIPANTS_TABLE, "userId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};

export const down = async ({ queryInterface, Sequelize }) => {
  if (
    !(await tableExists(queryInterface, PARTICIPANTS_TABLE)) ||
    !(await tableExists(queryInterface, EMPLOYEES_TABLE))
  ) {
    return;
  }

  const [rollbackBlockers] = await queryInterface.sequelize.query(`
    SELECT
      (SELECT COUNT(*) FROM FestivalParticipants WHERE userId IS NULL)
        AS unlinkedParticipantCount,
      (SELECT COUNT(*) FROM Employees
        WHERE source <> 'legacy_user' OR employeeNumber IS NOT NULL)
        AS nonLegacyEmployeeCount
  `);

  if (
    Number(rollbackBlockers[0]?.unlinkedParticipantCount || 0) > 0 ||
    Number(rollbackBlockers[0]?.nonLegacyEmployeeCount || 0) > 0
  ) {
    throw new Error(
      "Cannot roll back employee identity while employee-only participants or non-legacy employees exist"
    );
  }

  const participantColumns =
    await queryInterface.describeTable(PARTICIPANTS_TABLE);
  if (
    participantColumns.userId &&
    participantColumns.userId.allowNull !== false
  ) {
    await queryInterface.changeColumn(PARTICIPANTS_TABLE, "userId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  }

  const participantIndexes = await queryInterface.showIndex(PARTICIPANTS_TABLE);
  for (const indexName of [
    "festival_participants_employee_status_idx",
    "festival_participants_festival_employee_uq",
  ]) {
    if (participantIndexes.some((index) => index.name === indexName)) {
      await queryInterface.removeIndex(PARTICIPANTS_TABLE, indexName);
    }
  }

  const participantForeignKeys =
    await queryInterface.getForeignKeyReferencesForTable(PARTICIPANTS_TABLE);
  if (
    participantForeignKeys.some(
      (reference) =>
        reference.constraintName === "festival_participants_employee_id_fk"
    )
  ) {
    await queryInterface.removeConstraint(
      PARTICIPANTS_TABLE,
      "festival_participants_employee_id_fk"
    );
  }

  const refreshedColumns =
    await queryInterface.describeTable(PARTICIPANTS_TABLE);
  if (refreshedColumns.employeeId) {
    await queryInterface.removeColumn(PARTICIPANTS_TABLE, "employeeId");
  }

  await queryInterface.dropTable(EMPLOYEES_TABLE);
};
