const TABLE = "FestivalAuctionConfigs";

export const up = async ({ queryInterface, Sequelize }) => {
  const columns = await queryInterface.describeTable(TABLE);
  if (!columns.incrementPercentage) {
    await queryInterface.addColumn(TABLE, "incrementPercentage", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 20,
    });
  }
  if (columns.customIncrementRules) {
    await queryInterface.removeColumn(TABLE, "customIncrementRules");
  }
  if (columns.incrementProfile) {
    await queryInterface.removeColumn(TABLE, "incrementProfile");
  }
};

export const down = async ({ queryInterface, Sequelize }) => {
  const columns = await queryInterface.describeTable(TABLE);
  if (!columns.incrementProfile) {
    await queryInterface.addColumn(TABLE, "incrementProfile", {
      type: Sequelize.ENUM(
        "conservative",
        "standard",
        "aggressive",
        "custom"
      ),
      allowNull: false,
      defaultValue: "standard",
    });
  }
  if (!columns.customIncrementRules) {
    await queryInterface.addColumn(TABLE, "customIncrementRules", {
      type: Sequelize.JSON,
      allowNull: true,
    });
  }
  if (columns.incrementPercentage) {
    await queryInterface.removeColumn(TABLE, "incrementPercentage");
  }
};
