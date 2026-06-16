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

const tableExists = async (queryInterface, tableName) =>
  (await queryInterface.showAllTables()).some((table) => {
    const name = typeof table === "string" ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, "SportTeamBudgets"))) {
    await queryInterface.createTable("SportTeamBudgets", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      sportTeamId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTeams", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      allocatedCredits: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      adjustmentCredits: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      configuredByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      configuredAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex(
      "SportTeamBudgets",
      ["sportTournamentId", "sportTeamId"],
      {
        name: "sport_team_budgets_tournament_team_uq",
        unique: true,
      }
    );
    await queryInterface.addIndex(
      "SportTeamBudgets",
      ["sportTournamentId", "status"],
      {
        name: "sport_team_budgets_tournament_status_idx",
      }
    );
  }

  if (!(await tableExists(queryInterface, "SportAuctionPools"))) {
    await queryInterface.createTable("SportAuctionPools", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      festivalParticipantId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalParticipants", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      state: {
        type: Sequelize.ENUM("available", "sold", "unsold"),
        allowNull: false,
        defaultValue: "available",
      },
      generatedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex(
      "SportAuctionPools",
      ["sportTournamentId", "festivalParticipantId"],
      {
        name: "sport_auction_pools_tournament_participant_uq",
        unique: true,
      }
    );
    await queryInterface.addIndex(
      "SportAuctionPools",
      ["sportTournamentId", "state"],
      {
        name: "sport_auction_pools_tournament_state_idx",
      }
    );
  }
};

export const down = async ({ queryInterface }) => {
  if (await tableExists(queryInterface, "SportAuctionPools")) {
    await queryInterface.dropTable("SportAuctionPools");
  }
  if (await tableExists(queryInterface, "SportTeamBudgets")) {
    await queryInterface.dropTable("SportTeamBudgets");
  }
};
