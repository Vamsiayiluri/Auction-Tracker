const CONFIGS_TABLE = "FestivalAuctionConfigs";
const AUCTIONS_TABLE = "FestivalAuctions";
const BIDS_TABLE = "FestivalAuctionBids";
const RESULTS_TABLE = "FestivalAuctionResults";

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

const ensureTable = async (
  queryInterface,
  tableName,
  columns
) => {
  if (!(await tableExists(queryInterface, tableName))) {
    await queryInterface.createTable(tableName, columns);
  }

  for (const [columnName, definition] of Object.entries(columns)) {
    await ensureColumn(queryInterface, tableName, columnName, definition);
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

const removeIndexIfPresent = async (
  queryInterface,
  tableName,
  indexName
) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

const removeConstraintIfPresent = async (
  queryInterface,
  tableName,
  constraintName
) => {
  if (!(await tableExists(queryInterface, tableName))) return;
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

const removeColumnIfPresent = async (
  queryInterface,
  tableName,
  columnName
) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
};

const createAuctionTables = async (queryInterface, Sequelize) => {
  await ensureTable(queryInterface, AUCTIONS_TABLE, {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    festivalId: { type: Sequelize.STRING, allowNull: false },
    festivalParticipantId: { type: Sequelize.STRING, allowNull: false },
    status: {
      type: Sequelize.ENUM("live", "sold", "unsold"),
      allowNull: false,
      defaultValue: "live",
    },
    startedBy: { type: Sequelize.STRING, allowNull: false },
    startedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    finalizedBy: { type: Sequelize.STRING, allowNull: true },
    finalizedAt: { type: Sequelize.DATE, allowNull: true },
    ...timestampColumns(Sequelize),
  });

  await ensureTable(queryInterface, BIDS_TABLE, {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    festivalId: { type: Sequelize.STRING, allowNull: false },
    festivalAuctionId: { type: Sequelize.STRING, allowNull: false },
    festivalParticipantId: { type: Sequelize.STRING, allowNull: false },
    festivalTeamId: { type: Sequelize.STRING, allowNull: false },
    festivalTeamOwnerId: { type: Sequelize.STRING, allowNull: false },
    placedByUserId: { type: Sequelize.STRING, allowNull: false },
    amount: { type: Sequelize.BIGINT, allowNull: false },
    placedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    ...timestampColumns(Sequelize),
  });

  await ensureTable(queryInterface, RESULTS_TABLE, {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    festivalId: { type: Sequelize.STRING, allowNull: false },
    festivalAuctionId: { type: Sequelize.STRING, allowNull: false },
    festivalParticipantId: { type: Sequelize.STRING, allowNull: false },
    outcome: {
      type: Sequelize.ENUM("sold", "unsold"),
      allowNull: false,
    },
    festivalTeamId: { type: Sequelize.STRING, allowNull: true },
    winningBidId: { type: Sequelize.STRING, allowNull: true },
    finalAmount: { type: Sequelize.BIGINT, allowNull: true },
    finalizedBy: { type: Sequelize.STRING, allowNull: false },
    finalizedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    ...timestampColumns(Sequelize),
  });
};

const ensureAuctionIndexes = async (queryInterface) => {
  await ensureIndex(
    queryInterface,
    CONFIGS_TABLE,
    ["currentParticipantId"],
    { name: "festival_auction_configs_current_participant_idx" }
  );
  await ensureIndex(
    queryInterface,
    AUCTIONS_TABLE,
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_auctions_festival_participant_uq",
      unique: true,
    }
  );
  await ensureIndex(
    queryInterface,
    AUCTIONS_TABLE,
    ["festivalId", "status"],
    { name: "festival_auctions_festival_status_idx" }
  );
  await ensureIndex(
    queryInterface,
    BIDS_TABLE,
    ["festivalAuctionId", "amount"],
    {
      name: "festival_auction_bids_auction_amount_uq",
      unique: true,
    }
  );
  await ensureIndex(
    queryInterface,
    BIDS_TABLE,
    ["festivalAuctionId", "createdAt"],
    { name: "festival_auction_bids_auction_created_idx" }
  );
  await ensureIndex(
    queryInterface,
    BIDS_TABLE,
    ["festivalTeamId", "festivalId"],
    { name: "festival_auction_bids_team_festival_idx" }
  );
  await ensureIndex(
    queryInterface,
    RESULTS_TABLE,
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_auction_results_festival_participant_uq",
      unique: true,
    }
  );
  await ensureIndex(
    queryInterface,
    RESULTS_TABLE,
    ["festivalAuctionId"],
    { name: "festival_auction_results_auction_uq", unique: true }
  );
  await ensureIndex(
    queryInterface,
    RESULTS_TABLE,
    ["festivalTeamId", "festivalId"],
    { name: "festival_auction_results_team_festival_idx" }
  );
};

const ensureAuctionForeignKeys = async (queryInterface) => {
  const definitions = [
    [
      CONFIGS_TABLE,
      "currentParticipantId",
      "FestivalParticipants",
      "festival_auction_configs_current_participant_fk",
      "RESTRICT",
    ],
    [
      AUCTIONS_TABLE,
      "festivalId",
      "Festivals",
      "festival_auctions_festival_id_fk",
      "CASCADE",
    ],
    [
      AUCTIONS_TABLE,
      "festivalParticipantId",
      "FestivalParticipants",
      "festival_auctions_participant_id_fk",
      "RESTRICT",
    ],
    [
      AUCTIONS_TABLE,
      "startedBy",
      "Users",
      "festival_auctions_started_by_fk",
      "RESTRICT",
    ],
    [
      AUCTIONS_TABLE,
      "finalizedBy",
      "Users",
      "festival_auctions_finalized_by_fk",
      "RESTRICT",
    ],
    [
      BIDS_TABLE,
      "festivalId",
      "Festivals",
      "festival_auction_bids_festival_id_fk",
      "CASCADE",
    ],
    [
      BIDS_TABLE,
      "festivalAuctionId",
      AUCTIONS_TABLE,
      "festival_auction_bids_auction_id_fk",
      "CASCADE",
    ],
    [
      BIDS_TABLE,
      "festivalParticipantId",
      "FestivalParticipants",
      "festival_auction_bids_participant_id_fk",
      "RESTRICT",
    ],
    [
      BIDS_TABLE,
      "festivalTeamId",
      "FestivalTeams",
      "festival_auction_bids_team_id_fk",
      "RESTRICT",
    ],
    [
      BIDS_TABLE,
      "festivalTeamOwnerId",
      "FestivalTeamOwners",
      "festival_auction_bids_owner_id_fk",
      "RESTRICT",
    ],
    [
      BIDS_TABLE,
      "placedByUserId",
      "Users",
      "festival_auction_bids_placed_by_fk",
      "RESTRICT",
    ],
    [
      RESULTS_TABLE,
      "festivalId",
      "Festivals",
      "festival_auction_results_festival_id_fk",
      "CASCADE",
    ],
    [
      RESULTS_TABLE,
      "festivalAuctionId",
      AUCTIONS_TABLE,
      "festival_auction_results_auction_id_fk",
      "RESTRICT",
    ],
    [
      RESULTS_TABLE,
      "festivalParticipantId",
      "FestivalParticipants",
      "festival_auction_results_participant_id_fk",
      "RESTRICT",
    ],
    [
      RESULTS_TABLE,
      "festivalTeamId",
      "FestivalTeams",
      "festival_auction_results_team_id_fk",
      "RESTRICT",
    ],
    [
      RESULTS_TABLE,
      "winningBidId",
      BIDS_TABLE,
      "festival_auction_results_winning_bid_id_fk",
      "RESTRICT",
    ],
    [
      RESULTS_TABLE,
      "finalizedBy",
      "Users",
      "festival_auction_results_finalized_by_fk",
      "RESTRICT",
    ],
  ];

  for (const [
    tableName,
    field,
    referencedTable,
    name,
    onDelete,
  ] of definitions) {
    await ensureForeignKey(
      queryInterface,
      tableName,
      field,
      referencedTable,
      {
        name,
        onDelete,
        onUpdate: "CASCADE",
      }
    );
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, CONFIGS_TABLE))) {
    throw new Error(
      "FestivalAuctionConfigs must exist before the live auction migration"
    );
  }

  // Recovery ordering is intentional: the column must exist before its index
  // or foreign key can be inspected or created.
  await ensureColumn(
    queryInterface,
    CONFIGS_TABLE,
    "currentParticipantId",
    {
      type: Sequelize.STRING,
      allowNull: true,
    }
  );
  await ensureColumn(queryInterface, CONFIGS_TABLE, "auctionStatus", {
    type: Sequelize.ENUM("setup", "live", "paused", "completed"),
    allowNull: false,
    defaultValue: "setup",
  });
  await ensureColumn(queryInterface, CONFIGS_TABLE, "startedAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });
  await ensureColumn(queryInterface, CONFIGS_TABLE, "completedAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });

  await createAuctionTables(queryInterface, Sequelize);
  await ensureAuctionIndexes(queryInterface);
  await ensureAuctionForeignKeys(queryInterface);
};

export const down = async ({ queryInterface }) => {
  for (const [tableName, constraintName] of [
    [RESULTS_TABLE, "festival_auction_results_finalized_by_fk"],
    [RESULTS_TABLE, "festival_auction_results_winning_bid_id_fk"],
    [RESULTS_TABLE, "festival_auction_results_team_id_fk"],
    [RESULTS_TABLE, "festival_auction_results_participant_id_fk"],
    [RESULTS_TABLE, "festival_auction_results_auction_id_fk"],
    [RESULTS_TABLE, "festival_auction_results_festival_id_fk"],
    [BIDS_TABLE, "festival_auction_bids_placed_by_fk"],
    [BIDS_TABLE, "festival_auction_bids_owner_id_fk"],
    [BIDS_TABLE, "festival_auction_bids_team_id_fk"],
    [BIDS_TABLE, "festival_auction_bids_participant_id_fk"],
    [BIDS_TABLE, "festival_auction_bids_auction_id_fk"],
    [BIDS_TABLE, "festival_auction_bids_festival_id_fk"],
    [AUCTIONS_TABLE, "festival_auctions_finalized_by_fk"],
    [AUCTIONS_TABLE, "festival_auctions_started_by_fk"],
    [AUCTIONS_TABLE, "festival_auctions_participant_id_fk"],
    [AUCTIONS_TABLE, "festival_auctions_festival_id_fk"],
    [CONFIGS_TABLE, "festival_auction_configs_current_participant_fk"],
  ]) {
    await removeConstraintIfPresent(
      queryInterface,
      tableName,
      constraintName
    );
  }

  for (const tableName of [RESULTS_TABLE, BIDS_TABLE, AUCTIONS_TABLE]) {
    if (await tableExists(queryInterface, tableName)) {
      await queryInterface.dropTable(tableName);
    }
  }

  await removeIndexIfPresent(
    queryInterface,
    CONFIGS_TABLE,
    "festival_auction_configs_current_participant_idx"
  );
  await removeColumnIfPresent(queryInterface, CONFIGS_TABLE, "completedAt");
  await removeColumnIfPresent(queryInterface, CONFIGS_TABLE, "startedAt");
  await removeColumnIfPresent(
    queryInterface,
    CONFIGS_TABLE,
    "currentParticipantId"
  );
  await removeColumnIfPresent(queryInterface, CONFIGS_TABLE, "auctionStatus");
};
