import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import SportTournament from "./sportTournament.model.js";

const SportTeam = sequelize.define(
  "SportTeam",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sportTournamentId: { type: DataTypes.STRING, allowNull: false },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    code: { type: DataTypes.STRING(80), allowNull: false },
    color: { type: DataTypes.STRING(7), allowNull: true },
    logoUrl: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    indexes: [
      {
        name: "sport_teams_tournament_name_uq",
        unique: true,
        fields: ["sportTournamentId", "name"],
      },
      {
        name: "sport_teams_tournament_code_uq",
        unique: true,
        fields: ["sportTournamentId", "code"],
      },
    ],
  }
);

SportTeam.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasMany(SportTeam, {
  foreignKey: "sportTournamentId",
  as: "teams",
});
SportTeam.belongsTo(Festival, { foreignKey: "festivalId", as: "festival" });
SportTeam.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "festivalTeam",
});

export default SportTeam;
