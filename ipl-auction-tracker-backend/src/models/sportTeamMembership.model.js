import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportTeam from "./sportTeam.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportTeamMembership = sequelize.define(
  "SportTeamMembership",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sportTournamentId: { type: DataTypes.STRING, allowNull: false },
    sportTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    source: {
      type: DataTypes.ENUM("captain_assignment", "auction", "admin_override"),
      allowNull: false,
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
        name: "sport_team_memberships_tournament_participant_uq",
        unique: true,
        fields: ["sportTournamentId", "festivalParticipantId"],
      },
    ],
  }
);

SportTeamMembership.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasMany(SportTeamMembership, {
  foreignKey: "sportTournamentId",
  as: "memberships",
});
SportTeamMembership.belongsTo(SportTeam, {
  foreignKey: "sportTeamId",
  as: "team",
});
SportTeam.hasMany(SportTeamMembership, {
  foreignKey: "sportTeamId",
  as: "memberships",
});
SportTeamMembership.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasMany(SportTeamMembership, {
  foreignKey: "festivalParticipantId",
  as: "sportTeamMemberships",
});
SportTeamMembership.belongsTo(User, {
  foreignKey: "assignedByUserId",
  as: "assigner",
});

export default SportTeamMembership;
