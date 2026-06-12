const USERS_TABLE = "Users";
const OWNERS_TABLE = "FestivalTeamOwners";

export const up = async ({ queryInterface, Sequelize }) => {
  const userColumns = await queryInterface.describeTable(USERS_TABLE);
  if (!userColumns.mustChangePassword) {
    await queryInterface.addColumn(USERS_TABLE, "mustChangePassword", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  const ownerColumns = await queryInterface.describeTable(OWNERS_TABLE);
  if (!ownerColumns.userProvisioningStatus) {
    await queryInterface.addColumn(OWNERS_TABLE, "userProvisioningStatus", {
      type: Sequelize.ENUM("auto_created", "existing_user"),
      allowNull: true,
    });
  }
  if (!ownerColumns.credentialsSentAt) {
    await queryInterface.addColumn(OWNERS_TABLE, "credentialsSentAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
};

export const down = async ({ queryInterface }) => {
  const ownerColumns = await queryInterface.describeTable(OWNERS_TABLE);
  if (ownerColumns.credentialsSentAt) {
    await queryInterface.removeColumn(OWNERS_TABLE, "credentialsSentAt");
  }
  if (ownerColumns.userProvisioningStatus) {
    await queryInterface.removeColumn(OWNERS_TABLE, "userProvisioningStatus");
  }

  const userColumns = await queryInterface.describeTable(USERS_TABLE);
  if (userColumns.mustChangePassword) {
    await queryInterface.removeColumn(USERS_TABLE, "mustChangePassword");
  }
};
