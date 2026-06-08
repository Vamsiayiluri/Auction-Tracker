import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Player from "./player.model.js";
import Tournament from "./tournment.model.js";

const Auction = sequelize.define("Auction", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  status: {
    type: DataTypes.ENUM("upcoming", "live", "pending", "completed"),
    allowNull: false,
    defaultValue: "upcoming",
  },
  currentPlayerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tournamentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    {
      name: "auctions_tournament_status_idx",
      fields: ["tournamentId", "status"],
    },
    {
      name: "auctions_player_tournament_status_idx",
      fields: ["currentPlayerId", "tournamentId", "status"],
    },
  ],
});

Auction.belongsTo(Player, {
  foreignKey: "currentPlayerId",
  as: "currentPlayer",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Auction.belongsTo(Tournament, {
  foreignKey: "tournamentId",
  as: "tournament",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Tournament.hasMany(Auction, {
  foreignKey: "tournamentId",
  as: "auctions",
});

export default Auction;
