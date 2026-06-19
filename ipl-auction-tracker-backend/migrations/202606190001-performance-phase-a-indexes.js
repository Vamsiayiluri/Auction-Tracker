const normalizeFieldNames = (index) =>
  index.fields.map((field) => field.attribute || field.name);

const tableExists = async (queryInterface, tableName) =>
  (await queryInterface.showAllTables()).some((table) => {
    const name = typeof table === "string" ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });

const ensureIndex = async (queryInterface, tableName, fields, options = {}) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const columns = await queryInterface.describeTable(tableName);
  if (fields.some((field) => !columns[field])) return;

  const indexes = await queryInterface.showIndex(tableName);
  const namedIndex = indexes.find((index) => index.name === options.name);
  if (
    namedIndex &&
    (normalizeFieldNames(namedIndex).join(",") !== fields.join(",") ||
      Boolean(namedIndex.unique) !== Boolean(options.unique))
  ) {
    throw new Error(`Index ${options.name} exists with an incompatible definition`);
  }

  const exists =
    Boolean(namedIndex) ||
    indexes.some(
      (index) =>
        normalizeFieldNames(index).join(",") === fields.join(",") &&
        Boolean(index.unique) === Boolean(options.unique)
    );
  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

export const up = async ({ queryInterface }) => {
  await ensureIndex(queryInterface, "FestivalParticipants", ["festivalId", "status"], {
    name: "festival_participants_festival_status_idx",
  });
  await ensureIndex(queryInterface, "FestivalAuctionResults", ["festivalId", "outcome"], {
    name: "festival_auction_results_festival_outcome_idx",
  });
  await ensureIndex(queryInterface, "FestivalAuctionPools", ["festivalId", "state"], {
    name: "festival_auction_pools_festival_state_idx",
  });
  await ensureIndex(queryInterface, "SportAuctionBids", ["sportAuctionId", "createdAt"], {
    name: "sport_auction_bids_auction_created_idx",
  });
};

export const down = async ({ queryInterface }) => {
  await removeIndexIfPresent(
    queryInterface,
    "SportAuctionBids",
    "sport_auction_bids_auction_created_idx"
  );
  await removeIndexIfPresent(
    queryInterface,
    "FestivalAuctionPools",
    "festival_auction_pools_festival_state_idx"
  );
  await removeIndexIfPresent(
    queryInterface,
    "FestivalAuctionResults",
    "festival_auction_results_festival_outcome_idx"
  );
  await removeIndexIfPresent(
    queryInterface,
    "FestivalParticipants",
    "festival_participants_festival_status_idx"
  );
};

