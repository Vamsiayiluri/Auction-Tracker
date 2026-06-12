const FESTIVALS_TABLE = "Festivals";

export const up = async ({ queryInterface, Sequelize }) => {
  const columns = await queryInterface.describeTable(FESTIVALS_TABLE);
  if (!columns.configurationLockState) {
    await queryInterface.addColumn(
      FESTIVALS_TABLE,
      "configurationLockState",
      {
        type: Sequelize.ENUM("locked", "unlocked"),
        allowNull: false,
        defaultValue: "locked",
      }
    );
  }
};

export const down = async ({ queryInterface }) => {
  const columns = await queryInterface.describeTable(FESTIVALS_TABLE);
  if (columns.configurationLockState) {
    await queryInterface.removeColumn(
      FESTIVALS_TABLE,
      "configurationLockState"
    );
  }
};
