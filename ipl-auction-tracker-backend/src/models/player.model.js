import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Team from "./team.model.js";
import Tournament from "./tournment.model.js";

const Player = sequelize.define("Player", {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  basePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  soldPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM(
      "Batsman",
      "Bowler",
      "All-rounder",
      "Wicketkeeper"
    ),
    allowNull: false,
    defaultValue: "Batsman",
  },
  isSold: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isInAuction: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: "Teams",
      key: "id",
    },
  },
  tournamentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  auctionId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "",
  },
}, {
  indexes: [
    {
      name: "players_tournament_auction_state_idx",
      fields: ["tournamentId", "isInAuction", "isSold", "auctionId"],
    },
    {
      name: "players_team_tournament_idx",
      fields: ["teamId", "tournamentId"],
    },
  ],
});

Player.belongsTo(Team, {
  foreignKey: "teamId",
  as: "team",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Player.belongsTo(Tournament, {
  foreignKey: "tournamentId",
  as: "tournament",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Tournament.hasMany(Player, { foreignKey: "tournamentId", as: "players" });

export default Player;
