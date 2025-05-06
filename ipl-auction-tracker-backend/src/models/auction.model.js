import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Player from "./player.model.js";

const Auction = sequelize.define("Auction", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  status: {
    type: DataTypes.STRING,
    defaultValue: "upcoming",
  },
  currentPlayerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

Auction.belongsTo(Player, {
  foreignKey: "currentPlayerId",
  as: "currentPlayer",
});

export default Auction;
