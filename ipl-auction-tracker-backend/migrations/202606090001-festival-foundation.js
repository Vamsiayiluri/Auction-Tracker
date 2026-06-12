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
  await queryInterface.createTable("Festivals", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    registrationOpensAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    registrationClosesAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(
        "draft",
        "registration_open",
        "registration_closed",
        "allocation",
        "competition",
        "completed",
        "archived"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    timezone: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    currencyCode: {
      type: Sequelize.STRING(3),
      allowNull: true,
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

  await queryInterface.addIndex("Festivals", ["code"], {
    name: "festivals_code_uq",
    unique: true,
  });
  await queryInterface.addIndex("Festivals", ["status", "startDate"], {
    name: "festivals_status_start_date_idx",
  });
  await queryInterface.addIndex("Festivals", ["createdByUserId"], {
    name: "festivals_created_by_user_id_idx",
  });

  await queryInterface.createTable("FestivalSports", {
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
    sportId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Sports", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: {
      type: Sequelize.ENUM(
        "draft",
        "registration_open",
        "allocation",
        "competition",
        "completed"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    configJson: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    ...timestampColumns(Sequelize),
  });

  await queryInterface.addIndex("FestivalSports", ["festivalId", "sportId"], {
    name: "festival_sports_festival_sport_uq",
    unique: true,
  });
  await queryInterface.addIndex("FestivalSports", ["sportId"], {
    name: "festival_sports_sport_id_idx",
  });

  await queryInterface.createTable("FestivalParticipants", {
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
    userId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "Users", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    status: {
      type: Sequelize.ENUM("registered", "withdrawn"),
      allowNull: false,
      defaultValue: "registered",
    },
    registeredAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    ...timestampColumns(Sequelize),
  });

  await queryInterface.addIndex(
    "FestivalParticipants",
    ["festivalId", "userId"],
    {
      name: "festival_participants_festival_user_uq",
      unique: true,
    }
  );
  await queryInterface.addIndex("FestivalParticipants", ["userId", "status"], {
    name: "festival_participants_user_status_idx",
  });

  await queryInterface.createTable("FestivalTeams", {
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
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    color: {
      type: Sequelize.STRING(7),
      allowNull: true,
    },
    logoUrl: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    ...timestampColumns(Sequelize),
  });

  await queryInterface.addIndex("FestivalTeams", ["festivalId", "name"], {
    name: "festival_teams_festival_name_uq",
    unique: true,
  });
  await queryInterface.addIndex("FestivalTeams", ["festivalId", "code"], {
    name: "festival_teams_festival_code_uq",
    unique: true,
  });

  const now = new Date();
  await queryInterface.bulkInsert(
    "Sports",
    [
      {
        id: "throwball",
        code: "throwball",
        name: "Throwball",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    {
      updateOnDuplicate: ["code", "name", "isActive", "updatedAt"],
    }
  );
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable("FestivalTeams");
  await queryInterface.dropTable("FestivalParticipants");
  await queryInterface.dropTable("FestivalSports");
  await queryInterface.dropTable("Festivals");
};
