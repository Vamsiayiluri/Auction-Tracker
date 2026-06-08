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

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  await addColumnIfMissing(queryInterface, "Auctions", "startedAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "Auctions", "endsAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });
};

export const down = async ({ queryInterface }) => {
  await removeColumnIfPresent(queryInterface, "Auctions", "endsAt");
  await removeColumnIfPresent(queryInterface, "Auctions", "startedAt");
};
