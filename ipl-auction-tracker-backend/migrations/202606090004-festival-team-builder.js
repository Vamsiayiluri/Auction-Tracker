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
  await queryInterface.addColumn("Festivals", "teamAssignmentStatus", {
    type: Sequelize.ENUM("draft", "building", "locked"),
    allowNull: false,
    defaultValue: "draft",
  });

  await queryInterface.createTable("FestivalTeamMemberships", {
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
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    festivalTeamId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "FestivalTeams", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    assignmentMethod: {
      type: Sequelize.ENUM("manual", "auto_balanced"),
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

  await queryInterface.addIndex(
    "FestivalTeamMemberships",
    ["festivalId", "festivalParticipantId"],
    {
      name: "festival_team_memberships_festival_participant_uq",
      unique: true,
    }
  );
  await queryInterface.addIndex(
    "FestivalTeamMemberships",
    ["festivalTeamId", "festivalId"],
    {
      name: "festival_team_memberships_team_festival_idx",
    }
  );
  await queryInterface.addIndex(
    "FestivalTeamMemberships",
    ["festivalParticipantId"],
    {
      name: "festival_team_memberships_participant_idx",
    }
  );
  await queryInterface.addIndex(
    "FestivalTeamMemberships",
    ["assignedBy"],
    {
      name: "festival_team_memberships_assigned_by_idx",
    }
  );
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable("FestivalTeamMemberships");
  await queryInterface.removeColumn("Festivals", "teamAssignmentStatus");
};
