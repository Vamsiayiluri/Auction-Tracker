const SPORTS = [
  { id: "cricket", code: "cricket", name: "Cricket", isActive: true },
  { id: "tt", code: "tt", name: "Table Tennis", isActive: true },
  { id: "volleyball", code: "volleyball", name: "Volleyball", isActive: true },
  { id: "badminton", code: "badminton", name: "Badminton", isActive: true },
  { id: "chess", code: "chess", name: "Chess", isActive: true },
  { id: "carrom", code: "carrom", name: "Carrom", isActive: true },
  { id: "other", code: "other", name: "Other", isActive: true },
];

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

const addColumnIfMissing = async (
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

const ensureIndex = async (queryInterface, tableName, fields, options = {}) => {
  const indexes = await queryInterface.showIndex(tableName);
  const exists = indexes.some(
    (index) =>
      index.name === options.name ||
      (index.fields.map((field) => field.attribute || field.name).join(",") ===
        fields.join(",") &&
        Boolean(index.unique) === Boolean(options.unique))
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
  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  const exists = references.some(
    (reference) =>
      reference.columnName === field &&
      reference.referencedTableName === referencedTable
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

const removeConstraintIfPresent = async (
  queryInterface,
  tableName,
  constraintName
) => {
  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  if (
    references.some(
      (reference) => reference.constraintName === constraintName
    )
  ) {
    await queryInterface.removeConstraint(tableName, constraintName);
  }
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  const existingTables = await tableNames(queryInterface);

  if (!existingTables.includes("Sports")) {
    await queryInterface.createTable("Sports", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      code: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ...timestampColumns(Sequelize),
    });
  }

  await ensureIndex(queryInterface, "Sports", ["code"], {
    name: "sports_code_uq",
    unique: true,
  });

  const now = new Date();
  await queryInterface.bulkInsert(
    "Sports",
    SPORTS.map((sport) => ({ ...sport, createdAt: now, updatedAt: now })),
    {
      updateOnDuplicate: ["code", "name", "isActive", "updatedAt"],
    }
  );

  await addColumnIfMissing(queryInterface, "Tournaments", "sportId", {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "Players", "sportId", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await queryInterface.sequelize.query(`
    UPDATE Tournaments SET sportId = 'cricket' WHERE sportId IS NULL
  `);
  await queryInterface.sequelize.query(`
    UPDATE Players SET sportId = 'cricket' WHERE sportId IS NULL
  `);

  await queryInterface.changeColumn("Tournaments", "sportId", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "cricket",
  });
  await queryInterface.changeColumn("Players", "sportId", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "cricket",
  });
  await queryInterface.changeColumn("Players", "role", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await ensureIndex(queryInterface, "Tournaments", ["sportId"], {
    name: "tournaments_sport_id_idx",
  });
  await ensureIndex(queryInterface, "Players", ["sportId"], {
    name: "players_sport_id_idx",
  });

  await ensureForeignKey(
    queryInterface,
    "Tournaments",
    "sportId",
    "Sports",
    {
      name: "tournaments_sport_id_fk",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    }
  );
  await ensureForeignKey(queryInterface, "Players", "sportId", "Sports", {
    name: "players_sport_id_fk",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await removeConstraintIfPresent(
    queryInterface,
    "Players",
    "players_sport_id_fk"
  );
  await removeConstraintIfPresent(
    queryInterface,
    "Tournaments",
    "tournaments_sport_id_fk"
  );
  await removeIndexIfPresent(queryInterface, "Players", "players_sport_id_idx");
  await removeIndexIfPresent(
    queryInterface,
    "Tournaments",
    "tournaments_sport_id_idx"
  );

  await queryInterface.changeColumn("Players", "role", {
    type: Sequelize.ENUM(
      "Batsman",
      "Bowler",
      "All-rounder",
      "Wicketkeeper"
    ),
    allowNull: false,
    defaultValue: "Batsman",
  });
  await queryInterface.removeColumn("Players", "sportId");
  await queryInterface.removeColumn("Tournaments", "sportId");
  await queryInterface.dropTable("Sports");
};
