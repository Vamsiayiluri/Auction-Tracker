const assertNoArchivedRows = async (queryInterface) => {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT COUNT(*) AS archivedCount
    FROM Tournaments
    WHERE status = 'archived'
  `);

  if (Number(rows[0]?.archivedCount || 0) > 0) {
    throw new Error(
      "Tournaments contains archived rows; unarchive or preserve this migration before rolling back"
    );
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.changeColumn("Tournaments", "status", {
    type: Sequelize.ENUM("upcoming", "live", "completed", "archived"),
    allowNull: false,
    defaultValue: "upcoming",
  });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await assertNoArchivedRows(queryInterface);

  await queryInterface.changeColumn("Tournaments", "status", {
    type: Sequelize.ENUM("upcoming", "live", "completed"),
    allowNull: false,
    defaultValue: "upcoming",
  });
};
