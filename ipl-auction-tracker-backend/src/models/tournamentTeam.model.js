import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Team from "./team.model.js";
import Tournament from "./tournment.model.js";

const TournamentTeam = sequelize.define(
  "TournamentTeam",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    tournamentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teamId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    amountSpent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    amountLeft: {
      type: DataTypes.VIRTUAL,
      get() {
        return Number(this.totalAmount || 0) - Number(this.amountSpent || 0);
      },
    },
  },
  {
    indexes: [
      {
        name: "tournament_teams_tournament_team_uq",
        unique: true,
        fields: ["tournamentId", "teamId"],
      },
      { name: "tournament_teams_team_id_idx", fields: ["teamId"] },
    ],
  }
);

TournamentTeam.belongsTo(Tournament, {
  foreignKey: "tournamentId",
  as: "tournament",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
TournamentTeam.belongsTo(Team, {
  foreignKey: "teamId",
  as: "team",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Tournament.hasMany(TournamentTeam, {
  foreignKey: "tournamentId",
  as: "tournamentTeams",
});
Team.hasMany(TournamentTeam, {
  foreignKey: "teamId",
  as: "tournamentTeams",
});

export default TournamentTeam;
