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
  await queryInterface.createTable("FestivalParticipantSports", {
    id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    festivalParticipantId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: { model: "FestivalParticipants", key: "id" },
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
    ...timestampColumns(Sequelize),
  });

  await queryInterface.addIndex(
    "FestivalParticipantSports",
    ["festivalParticipantId", "sportId"],
    {
      name: "festival_participant_sports_participant_sport_uq",
      unique: true,
    }
  );
  await queryInterface.addIndex("FestivalParticipantSports", ["sportId"], {
    name: "festival_participant_sports_sport_id_idx",
  });
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable("FestivalParticipantSports");
};
