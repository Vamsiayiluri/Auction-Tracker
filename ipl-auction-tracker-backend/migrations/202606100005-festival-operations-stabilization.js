const CONFIGS_TABLE = "FestivalAuctionConfigs";
const POOLS_TABLE = "FestivalAuctionPools";
const AUCTIONS_TABLE = "FestivalAuctions";
const RESULTS_TABLE = "FestivalAuctionResults";
const AUDITS_TABLE = "FestivalOperationAudits";

const tableExists = async (queryInterface, tableName) =>
  (await queryInterface.showAllTables()).some((table) => {
    const name = typeof table === "string" ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });

const indexFields = (index) =>
  (index.fields || []).map((field) => field.attribute || field.name);

const ensureIndex = async (
  queryInterface,
  tableName,
  fields,
  options
) => {
  const indexes = await queryInterface.showIndex(tableName);
  const named = indexes.find((index) => index.name === options.name);

  if (
    named &&
    (indexFields(named).join(",") !== fields.join(",") ||
      Boolean(named.unique) !== Boolean(options.unique))
  ) {
    throw new Error(
      `Index ${options.name} exists with an incompatible definition`
    );
  }

  if (!named) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

const indexExists = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
};

const removeIndexIfPresent = async (
  queryInterface,
  tableName,
  indexName
) => {
  if (await indexExists(queryInterface, tableName, indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

const foreignKeyExists = async (
  queryInterface,
  tableName,
  constraintName
) => {
  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  return references.some(
    (reference) => reference.constraintName === constraintName
  );
};

const removeForeignKeyIfPresent = async (
  queryInterface,
  tableName,
  constraintName
) => {
  if (await foreignKeyExists(queryInterface, tableName, constraintName)) {
    await queryInterface.removeConstraint(tableName, constraintName);
  }
};

const ensureForeignKey = async (
  queryInterface,
  tableName,
  field,
  referencedTable,
  options
) => {
  if (await foreignKeyExists(queryInterface, tableName, options.name)) return;

  await queryInterface.addConstraint(tableName, {
    fields: [field],
    type: "foreign key",
    references: { table: referencedTable, field: "id" },
    ...options,
  });
};

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

const replaceParticipantUniqueIndexes = async (queryInterface) => {
  const auctionOldIndex =
    "festival_auctions_festival_participant_uq";
  const resultOldIndex =
    "festival_auction_results_festival_participant_uq";

  const auctionOldExists = await indexExists(
    queryInterface,
    AUCTIONS_TABLE,
    auctionOldIndex
  );
  const resultOldExists = await indexExists(
    queryInterface,
    RESULTS_TABLE,
    resultOldIndex
  );

  // Explicit single-column indexes prevent MySQL/TiDB from depending on the
  // old composite unique indexes for these foreign keys.
  await ensureIndex(queryInterface, AUCTIONS_TABLE, ["festivalId"], {
    name: "festival_auctions_festival_id_idx",
  });
  await ensureIndex(
    queryInterface,
    AUCTIONS_TABLE,
    ["festivalParticipantId"],
    { name: "festival_auctions_participant_id_idx" }
  );
  await ensureIndex(queryInterface, RESULTS_TABLE, ["festivalId"], {
    name: "festival_auction_results_festival_id_idx",
  });
  await ensureIndex(
    queryInterface,
    RESULTS_TABLE,
    ["festivalParticipantId"],
    { name: "festival_auction_results_participant_id_idx" }
  );

  // TiDB/MySQL may keep a foreign key bound to the original index even after
  // a compatible replacement index is added. Remove only the affected FKs,
  // drop the obsolete indexes, then recreate the same constraints.
  if (auctionOldExists) {
    await removeForeignKeyIfPresent(
      queryInterface,
      AUCTIONS_TABLE,
      "festival_auctions_festival_id_fk"
    );
    await removeForeignKeyIfPresent(
      queryInterface,
      AUCTIONS_TABLE,
      "festival_auctions_participant_id_fk"
    );
    await removeIndexIfPresent(
      queryInterface,
      AUCTIONS_TABLE,
      auctionOldIndex
    );
  }

  if (resultOldExists) {
    await removeForeignKeyIfPresent(
      queryInterface,
      RESULTS_TABLE,
      "festival_auction_results_festival_id_fk"
    );
    await removeForeignKeyIfPresent(
      queryInterface,
      RESULTS_TABLE,
      "festival_auction_results_participant_id_fk"
    );
    await removeIndexIfPresent(
      queryInterface,
      RESULTS_TABLE,
      resultOldIndex
    );
  }

  await ensureForeignKey(
    queryInterface,
    AUCTIONS_TABLE,
    "festivalId",
    "Festivals",
    {
      name: "festival_auctions_festival_id_fk",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    }
  );
  await ensureForeignKey(
    queryInterface,
    AUCTIONS_TABLE,
    "festivalParticipantId",
    "FestivalParticipants",
    {
      name: "festival_auctions_participant_id_fk",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    }
  );
  await ensureForeignKey(
    queryInterface,
    RESULTS_TABLE,
    "festivalId",
    "Festivals",
    {
      name: "festival_auction_results_festival_id_fk",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    }
  );
  await ensureForeignKey(
    queryInterface,
    RESULTS_TABLE,
    "festivalParticipantId",
    "FestivalParticipants",
    {
      name: "festival_auction_results_participant_id_fk",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    }
  );
};

const backfillPoolStates = async (queryInterface) => {
  const latestResults = `
    SELECT result.*
    FROM FestivalAuctionResults result
    WHERE NOT EXISTS (
      SELECT 1
      FROM FestivalAuctionResults newer
      WHERE newer.festivalId = result.festivalId
        AND newer.festivalParticipantId = result.festivalParticipantId
        AND (
          newer.finalizedAt > result.finalizedAt
          OR (
            newer.finalizedAt = result.finalizedAt
            AND newer.id > result.id
          )
        )
    )
  `;

  await queryInterface.sequelize.query(`
    INSERT INTO FestivalAuctionPools
      (id, festivalId, festivalParticipantId, generatedAt, state,
       reauctionCount, lastReauctionedAt, createdAt, updatedAt)
    SELECT UUID(), result.festivalId, result.festivalParticipantId,
      result.finalizedAt, result.outcome, 0, NULL, NOW(), NOW()
    FROM (${latestResults}) result
    LEFT JOIN FestivalAuctionPools pool
      ON pool.festivalId = result.festivalId
      AND pool.festivalParticipantId = result.festivalParticipantId
    WHERE pool.id IS NULL
  `);

  await queryInterface.sequelize.query(`
    UPDATE FestivalAuctionPools pool
    INNER JOIN (${latestResults}) result
      ON result.festivalId = pool.festivalId
      AND result.festivalParticipantId = pool.festivalParticipantId
    SET pool.state = result.outcome
  `);
};

export const up = async ({ queryInterface, Sequelize }) => {
  for (const tableName of [
    CONFIGS_TABLE,
    POOLS_TABLE,
    AUCTIONS_TABLE,
    RESULTS_TABLE,
  ]) {
    if (!(await tableExists(queryInterface, tableName))) {
      throw new Error(`${tableName} must exist before Phase 3G`);
    }
  }

  await ensureColumn(
    queryInterface,
    CONFIGS_TABLE,
    "incrementProfile",
    {
      type: Sequelize.ENUM(
        "conservative",
        "standard",
        "aggressive",
        "custom"
      ),
      allowNull: false,
      defaultValue: "standard",
    }
  );
  await ensureColumn(
    queryInterface,
    CONFIGS_TABLE,
    "customIncrementRules",
    { type: Sequelize.JSON, allowNull: true }
  );
  await ensureColumn(queryInterface, POOLS_TABLE, "state", {
    type: Sequelize.ENUM("available", "sold", "unsold"),
    allowNull: false,
    defaultValue: "available",
  });
  await ensureColumn(queryInterface, POOLS_TABLE, "reauctionCount", {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  });
  await ensureColumn(
    queryInterface,
    POOLS_TABLE,
    "lastReauctionedAt",
    { type: Sequelize.DATE, allowNull: true }
  );
  await ensureColumn(queryInterface, AUCTIONS_TABLE, "attemptNumber", {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  });

  await ensureIndex(
    queryInterface,
    AUCTIONS_TABLE,
    ["festivalId", "festivalParticipantId", "attemptNumber"],
    {
      name: "festival_auctions_participant_attempt_uq",
      unique: true,
    }
  );

  await replaceParticipantUniqueIndexes(queryInterface);
  await backfillPoolStates(queryInterface);

  if (!(await tableExists(queryInterface, AUDITS_TABLE))) {
    await queryInterface.createTable(AUDITS_TABLE, {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      festivalId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Festivals", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      actorUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      action: { type: Sequelize.STRING(80), allowNull: false },
      entityType: { type: Sequelize.STRING(80), allowNull: false },
      entityId: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  }

  await ensureIndex(
    queryInterface,
    AUDITS_TABLE,
    ["festivalId", "createdAt"],
    { name: "festival_operation_audits_festival_created_idx" }
  );
};

export const down = async () => {
  throw new Error(
    "Phase 3G is not automatically reversible because re-auction history may contain multiple attempts"
  );
};
