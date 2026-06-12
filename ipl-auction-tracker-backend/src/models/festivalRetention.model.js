import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import User from "./user.model.js";

const FestivalRetention = sequelize.define(
  "FestivalRetention",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.BIGINT, allowNull: false },
    retainedBy: { type: DataTypes.STRING, allowNull: false },
    retainedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "festival_retentions_festival_participant_uq",
        unique: true,
        fields: ["festivalId", "festivalParticipantId"],
      },
      {
        name: "festival_retentions_team_festival_idx",
        fields: ["festivalTeamId", "festivalId"],
      },
    ],
  }
);

FestivalRetention.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
FestivalRetention.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "team",
});
FestivalTeam.hasMany(FestivalRetention, {
  foreignKey: "festivalTeamId",
  as: "retentions",
});
FestivalRetention.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalRetention.belongsTo(User, {
  foreignKey: "retainedBy",
  as: "retainer",
});

export default FestivalRetention;
