const timestamps = (Sequelize) => ({
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
  (await queryInterface.showAllTables()).some((table) =>
    String(typeof table === "string" ? table : table.tableName).toLowerCase() ===
    tableName.toLowerCase()
  );

const columnExists = async (queryInterface, tableName, columnName) => {
  if (!(await tableExists(queryInterface, tableName))) return false;
  return Boolean((await queryInterface.describeTable(tableName))[columnName]);
};

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await columnExists(queryInterface, "SportAuctionPools", "reauctionCount"))) {
    await queryInterface.addColumn("SportAuctionPools", "reauctionCount", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!(await columnExists(queryInterface, "SportAuctionPools", "lastReauctionedAt"))) {
    await queryInterface.addColumn("SportAuctionPools", "lastReauctionedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }

  if (!(await tableExists(queryInterface, "SportAuctionConfigs"))) {
    await queryInterface.createTable("SportAuctionConfigs", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      timerDurationSeconds: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 20,
      },
      incrementPercentage: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 20,
      },
      reauctionEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      currentParticipantId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: "FestivalParticipants", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      configuredByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("SportAuctionConfigs", ["sportTournamentId"], {
      name: "sport_auction_configs_tournament_uq",
      unique: true,
    });
  }

  if (!(await tableExists(queryInterface, "SportAuctions"))) {
    await queryInterface.createTable("SportAuctions", {
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
      status: {
        type: Sequelize.ENUM("live", "paused", "pending", "sold", "unsold"),
        allowNull: false,
        defaultValue: "live",
      },
      baseCredits: { type: Sequelize.BIGINT, allowNull: false },
      startedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      endsAt: { type: Sequelize.DATE, allowNull: true },
      pausedRemainingMs: { type: Sequelize.INTEGER, allowNull: true },
      attemptNumber: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      finalizedByUserId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      finalizedAt: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex(
      "SportAuctions",
      ["sportTournamentId", "festivalParticipantId", "attemptNumber"],
      { name: "sport_auctions_participant_attempt_uq", unique: true }
    );
    await queryInterface.addIndex("SportAuctions", ["sportTournamentId", "status"], {
      name: "sport_auctions_tournament_status_idx",
    });
  }

  if (!(await tableExists(queryInterface, "SportAuctionBids"))) {
    await queryInterface.createTable("SportAuctionBids", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      sportAuctionId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportAuctions", key: "id" },
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
      sportTeamId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTeams", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      sportTeamCaptainId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTeamCaptains", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      placedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      amount: { type: Sequelize.BIGINT, allowNull: false },
      placedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("SportAuctionBids", ["sportAuctionId", "amount"], {
      name: "sport_auction_bids_auction_amount_uq",
      unique: true,
    });
  }

  if (!(await tableExists(queryInterface, "SportAuctionResults"))) {
    await queryInterface.createTable("SportAuctionResults", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      sportAuctionId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportAuctions", key: "id" },
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
      outcome: {
        type: Sequelize.ENUM("sold", "unsold"),
        allowNull: false,
      },
      sportTeamId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: "SportTeams", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      winningBidId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: "SportAuctionBids", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      finalCredits: { type: Sequelize.BIGINT, allowNull: true },
      finalizedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      finalizedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("SportAuctionResults", ["sportAuctionId"], {
      name: "sport_auction_results_auction_uq",
      unique: true,
    });
  }

  if (!(await tableExists(queryInterface, "SportOperationAudits"))) {
    await queryInterface.createTable("SportOperationAudits", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      actorUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      action: { type: Sequelize.STRING(80), allowNull: false },
      entityType: { type: Sequelize.STRING(80), allowNull: false },
      entityId: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex(
      "SportOperationAudits",
      ["sportTournamentId", "createdAt"],
      { name: "sport_operation_audits_tournament_created_idx" }
    );
  }
};

export const down = async ({ queryInterface }) => {
  for (const table of [
    "SportOperationAudits",
    "SportAuctionResults",
    "SportAuctionBids",
    "SportAuctions",
    "SportAuctionConfigs",
  ]) {
    if (await tableExists(queryInterface, table)) {
      await queryInterface.dropTable(table);
    }
  }
  if (await columnExists(queryInterface, "SportAuctionPools", "lastReauctionedAt")) {
    await queryInterface.removeColumn("SportAuctionPools", "lastReauctionedAt");
  }
  if (await columnExists(queryInterface, "SportAuctionPools", "reauctionCount")) {
    await queryInterface.removeColumn("SportAuctionPools", "reauctionCount");
  }
};
