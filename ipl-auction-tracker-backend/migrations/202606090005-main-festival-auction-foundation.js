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

export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.addColumn(
    "FestivalTeamMemberships",
    "rosterSource",
    {
      type: Sequelize.ENUM(
        "admin_override",
        "auto_balance",
        "owner_retention",
        "retention",
        "auction"
      ),
      allowNull: true,
    }
  );

  await queryInterface.sequelize.query(`
    UPDATE FestivalTeamMemberships
    SET rosterSource = CASE
      WHEN assignmentMethod = 'auto_balanced' THEN 'auto_balance'
      ELSE 'admin_override'
    END
    WHERE rosterSource IS NULL
  `);

  await queryInterface.createTable("FestivalAuctionConfigs", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    festivalId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Festivals", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    totalBudget: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    ownerCost: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("setup", "ready", "started", "completed"),
      allowNull: false,
      defaultValue: "setup",
    },
    configuredBy: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Users", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    ...timestampColumns(Sequelize),
  });
  await queryInterface.addIndex("FestivalAuctionConfigs", ["festivalId"], {
    name: "festival_auction_configs_festival_uq",
    unique: true,
  });

  await queryInterface.createTable("FestivalTeamOwners", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
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
    festivalParticipantId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "FestivalParticipants", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    ownerCost: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    assignedBy: {
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
  await queryInterface.addIndex("FestivalTeamOwners", ["festivalTeamId"], {
    name: "festival_team_owners_team_uq",
    unique: true,
  });
  await queryInterface.addIndex(
    "FestivalTeamOwners",
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_team_owners_festival_participant_uq",
      unique: true,
    }
  );

  await queryInterface.createTable("FestivalRetentions", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
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
    festivalParticipantId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "FestivalParticipants", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    amount: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    retainedBy: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Users", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    retainedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    ...timestampColumns(Sequelize),
  });
  await queryInterface.addIndex(
    "FestivalRetentions",
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_retentions_festival_participant_uq",
      unique: true,
    }
  );
  await queryInterface.addIndex(
    "FestivalRetentions",
    ["festivalTeamId", "festivalId"],
    {
      name: "festival_retentions_team_festival_idx",
    }
  );

  await queryInterface.createTable("FestivalAuctionPools", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    festivalId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Festivals", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    festivalParticipantId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "FestivalParticipants", key: "id" },
      onDelete: "CASCADE",
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
    "FestivalAuctionPools",
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_auction_pools_festival_participant_uq",
      unique: true,
    }
  );
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable("FestivalAuctionPools");
  await queryInterface.dropTable("FestivalRetentions");
  await queryInterface.dropTable("FestivalTeamOwners");
  await queryInterface.dropTable("FestivalAuctionConfigs");
  await queryInterface.removeColumn(
    "FestivalTeamMemberships",
    "rosterSource"
  );
};
