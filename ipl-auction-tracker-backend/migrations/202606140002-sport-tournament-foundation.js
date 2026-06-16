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
  if (!(await tableExists(queryInterface, "SportTournaments"))) {
    await queryInterface.createTable("SportTournaments", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      festivalId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Festivals", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      festivalTeamId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalTeams", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      festivalSportId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalSports", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      sportId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Sports", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      name: { type: Sequelize.STRING(160), allowNull: false },
      code: { type: Sequelize.STRING(80), allowNull: false },
      division: {
        type: Sequelize.ENUM("men", "women", "mixed", "open"),
        allowNull: false,
      },
      participantGenderRule: {
        type: Sequelize.ENUM("male", "female", "any"),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "setup",
          "ready",
          "auction_live",
          "auction_paused",
          "auction_completed",
          "competition_pending",
          "competition_live",
          "competition_completed",
          "archived"
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      teamCount: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      createdByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex(
      "SportTournaments",
      ["festivalTeamId", "code"],
      { name: "sport_tournaments_team_code_uq", unique: true }
    );
    await queryInterface.addIndex(
      "SportTournaments",
      ["festivalTeamId", "festivalSportId", "division"],
      { name: "sport_tournaments_team_sport_division_uq", unique: true }
    );
    await queryInterface.addIndex(
      "SportTournaments",
      ["festivalId", "festivalTeamId", "status"],
      { name: "sport_tournaments_scope_status_idx" }
    );
  }

  if (!(await tableExists(queryInterface, "SportTeams"))) {
    await queryInterface.createTable("SportTeams", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      sportTournamentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "SportTournaments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      festivalId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Festivals", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      festivalTeamId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalTeams", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      name: { type: Sequelize.STRING(160), allowNull: false },
      code: { type: Sequelize.STRING(80), allowNull: false },
      color: { type: Sequelize.STRING(7), allowNull: true },
      logoUrl: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex("SportTeams", ["sportTournamentId", "name"], {
      name: "sport_teams_tournament_name_uq",
      unique: true,
    });
    await queryInterface.addIndex("SportTeams", ["sportTournamentId", "code"], {
      name: "sport_teams_tournament_code_uq",
      unique: true,
    });
  }

  if (!(await tableExists(queryInterface, "SportTeamMemberships"))) {
    await queryInterface.createTable("SportTeamMemberships", {
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
      festivalParticipantId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalParticipants", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      source: {
        type: Sequelize.ENUM("captain_assignment", "auction", "admin_override"),
        allowNull: false,
      },
      assignedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex(
      "SportTeamMemberships",
      ["sportTournamentId", "festivalParticipantId"],
      { name: "sport_team_memberships_tournament_participant_uq", unique: true }
    );
    await queryInterface.addIndex(
      "SportTeamMemberships",
      ["sportTeamId", "sportTournamentId"],
      { name: "sport_team_memberships_team_tournament_idx" }
    );
  }

  if (!(await tableExists(queryInterface, "SportTeamCaptains"))) {
    await queryInterface.createTable("SportTeamCaptains", {
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
      festivalParticipantId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "FestivalParticipants", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      assignedByUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      ...timestampColumns(Sequelize),
    });
    await queryInterface.addIndex("SportTeamCaptains", ["sportTeamId"], {
      name: "sport_team_captains_team_uq",
      unique: true,
    });
    await queryInterface.addIndex(
      "SportTeamCaptains",
      ["sportTournamentId", "festivalParticipantId"],
      { name: "sport_team_captains_tournament_participant_uq", unique: true }
    );
  }
};

export const down = async ({ queryInterface }) => {
  for (const tableName of [
    "SportTeamCaptains",
    "SportTeamMemberships",
    "SportTeams",
    "SportTournaments",
  ]) {
    if (await tableExists(queryInterface, tableName)) {
      await queryInterface.dropTable(tableName);
    }
  }
};
