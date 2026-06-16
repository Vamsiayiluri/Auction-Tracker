import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import SportTeam from "./sportTeam.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportTeamBudget = sequelize.define(
  "SportTeamBudget",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sportTournamentId: { type: DataTypes.STRING, allowNull: false },
    sportTeamId: { type: DataTypes.STRING, allowNull: false },
    allocatedCredits: { type: DataTypes.BIGINT, allowNull: false },
    adjustmentCredits: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    configuredByUserId: { type: DataTypes.STRING, allowNull: false },
    configuredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "sport_team_budgets_tournament_team_uq",
        unique: true,
        fields: ["sportTournamentId", "sportTeamId"],
      },
      {
        name: "sport_team_budgets_tournament_status_idx",
        fields: ["sportTournamentId", "status"],
      },
    ],
  }
);

SportTeamBudget.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasMany(SportTeamBudget, {
  foreignKey: "sportTournamentId",
  as: "teamBudgets",
});
SportTeamBudget.belongsTo(SportTeam, {
  foreignKey: "sportTeamId",
  as: "team",
});
SportTeam.hasOne(SportTeamBudget, {
  foreignKey: "sportTeamId",
  as: "budget",
});
SportTeamBudget.belongsTo(User, {
  foreignKey: "configuredByUserId",
  as: "configurer",
});

export default SportTeamBudget;
