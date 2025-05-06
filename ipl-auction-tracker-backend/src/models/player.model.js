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
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "batsman",
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
});

Tournament.hasMany(Team, { foreignKey: "tournamentId" });
Player.belongsTo(Team, { foreignKey: "teamId", as: "team" });

export default Player;
