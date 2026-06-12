import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import Sport from "./sport.model.js";

const FestivalParticipantSport = sequelize.define(
  "FestivalParticipantSport",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    festivalParticipantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sportId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        name: "festival_participant_sports_participant_sport_uq",
        unique: true,
        fields: ["festivalParticipantId", "sportId"],
      },
      {
        name: "festival_participant_sports_sport_id_idx",
        fields: ["sportId"],
      },
    ],
  }
);

FestivalParticipantSport.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
FestivalParticipant.hasMany(FestivalParticipantSport, {
  foreignKey: "festivalParticipantId",
  as: "sportRegistrations",
});
FestivalParticipantSport.belongsTo(Sport, {
  foreignKey: "sportId",
  as: "sport",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Sport.hasMany(FestivalParticipantSport, {
  foreignKey: "sportId",
  as: "participantRegistrations",
});

export default FestivalParticipantSport;
