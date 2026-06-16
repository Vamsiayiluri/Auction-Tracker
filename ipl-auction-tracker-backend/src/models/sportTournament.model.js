import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalSport from "./festivalSport.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import Sport from "./sport.model.js";
import User from "./user.model.js";

export const SPORT_TOURNAMENT_STATUSES = [
  "draft",
  "setup",
  "ready",
  "auction_live",
  "auction_paused",
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
  "archived",
];

const SportTournament = sequelize.define(
  "SportTournament",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalSportId: { type: DataTypes.STRING, allowNull: false },
    sportId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    code: { type: DataTypes.STRING(80), allowNull: false },
    division: {
      type: DataTypes.ENUM("men", "women", "mixed", "open"),
      allowNull: false,
    },
    participantGenderRule: {
      type: DataTypes.ENUM("male", "female", "any"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...SPORT_TOURNAMENT_STATUSES),
      allowNull: false,
      defaultValue: "draft",
    },
    teamCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    createdByUserId: { type: DataTypes.STRING, allowNull: false },
  },
  {
    indexes: [
      {
        name: "sport_tournaments_team_code_uq",
        unique: true,
        fields: ["festivalTeamId", "code"],
      },
      {
        name: "sport_tournaments_team_sport_division_uq",
        unique: true,
        fields: ["festivalTeamId", "festivalSportId", "division"],
      },
      {
        name: "sport_tournaments_scope_status_idx",
        fields: ["festivalId", "festivalTeamId", "status"],
      },
    ],
  }
);

SportTournament.belongsTo(Festival, { foreignKey: "festivalId", as: "festival" });
Festival.hasMany(SportTournament, {
  foreignKey: "festivalId",
  as: "sportTournaments",
});
SportTournament.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "festivalTeam",
});
FestivalTeam.hasMany(SportTournament, {
  foreignKey: "festivalTeamId",
  as: "sportTournaments",
});
SportTournament.belongsTo(FestivalSport, {
  foreignKey: "festivalSportId",
  as: "festivalSport",
});
FestivalSport.hasMany(SportTournament, {
  foreignKey: "festivalSportId",
  as: "sportTournaments",
});
SportTournament.belongsTo(Sport, { foreignKey: "sportId", as: "sport" });
Sport.hasMany(SportTournament, {
  foreignKey: "sportId",
  as: "sportTournaments",
});
SportTournament.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "creator",
});

export default SportTournament;
