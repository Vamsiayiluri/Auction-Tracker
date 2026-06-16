import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportTeam from "./sportTeam.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportTeamCaptain = sequelize.define(
  "SportTeamCaptain",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sportTournamentId: { type: DataTypes.STRING, allowNull: false },
    sportTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    assignedByUserId: { type: DataTypes.STRING, allowNull: false },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "sport_team_captains_team_uq",
        unique: true,
        fields: ["sportTeamId"],
      },
      {
        name: "sport_team_captains_tournament_participant_uq",
        unique: true,
        fields: ["sportTournamentId", "festivalParticipantId"],
      },
    ],
  }
);

SportTeamCaptain.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasMany(SportTeamCaptain, {
  foreignKey: "sportTournamentId",
  as: "captains",
});
SportTeamCaptain.belongsTo(SportTeam, {
  foreignKey: "sportTeamId",
  as: "team",
});
SportTeam.hasOne(SportTeamCaptain, {
  foreignKey: "sportTeamId",
  as: "captainAssignment",
});
SportTeamCaptain.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasMany(SportTeamCaptain, {
  foreignKey: "festivalParticipantId",
  as: "captainAssignments",
});
SportTeamCaptain.belongsTo(User, {
  foreignKey: "assignedByUserId",
  as: "assigner",
});

export default SportTeamCaptain;
