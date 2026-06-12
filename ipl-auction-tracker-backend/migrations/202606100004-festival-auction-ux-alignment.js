const TABLE = "FestivalAuctions";

const tableExists = async (queryInterface, tableName) =>
  (await queryInterface.showAllTables()).some((table) => {
    const name = typeof table === "string" ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });

const changeStatusEnum = (queryInterface, Sequelize, values) =>
  queryInterface.changeColumn(TABLE, "status", {
    type: Sequelize.ENUM(...values),
    allowNull: false,
    defaultValue: "live",
  });

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, TABLE))) {
    throw new Error("FestivalAuctions must exist before Phase 3F");
  }

  const columns = await queryInterface.describeTable(TABLE);
  if (!columns.basePrice) {
    await queryInterface.addColumn(TABLE, "basePrice", {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
  }
  if (!columns.endsAt) {
    await queryInterface.addColumn(TABLE, "endsAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
  if (!columns.pausedRemainingMs) {
    await queryInterface.addColumn(TABLE, "pausedRemainingMs", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }

  await queryInterface.sequelize.query(`
    UPDATE FestivalAuctions
    SET basePrice = 1
    WHERE basePrice IS NULL
  `);
  await queryInterface.changeColumn(TABLE, "basePrice", {
    type: Sequelize.BIGINT,
    allowNull: false,
  });
  await changeStatusEnum(queryInterface, Sequelize, [
    "live",
    "paused",
    "pending",
    "sold",
    "unsold",
  ]);
};

export const down = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, TABLE))) return;

  const [activeRows] = await queryInterface.sequelize.query(`
    SELECT COUNT(*) AS count
    FROM FestivalAuctions
    WHERE status IN ('paused', 'pending')
  `);
  if (Number(activeRows?.[0]?.count || 0) > 0) {
    throw new Error(
      "Cannot roll back Phase 3F while paused or pending Festival auctions exist"
    );
  }

  await changeStatusEnum(queryInterface, Sequelize, [
    "live",
    "sold",
    "unsold",
  ]);
  const columns = await queryInterface.describeTable(TABLE);
  if (columns.pausedRemainingMs) {
    await queryInterface.removeColumn(TABLE, "pausedRemainingMs");
  }
  if (columns.endsAt) await queryInterface.removeColumn(TABLE, "endsAt");
  if (columns.basePrice) await queryInterface.removeColumn(TABLE, "basePrice");
};
