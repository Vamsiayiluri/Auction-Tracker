import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Player from "./player.model.js";
import Team from "./team.model.js";
import User from "./user.model.js";
import Tournament from "./tournment.model.js";

const Bid = sequelize.define("Bid", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tournamentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bidAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.STRING,
  },
}, {
  indexes: [
    {
      name: "bids_player_tournament_amount_idx",
      fields: ["playerId", "tournamentId", "bidAmount"],
    },
    {
      name: "bids_player_tournament_created_at_idx",
      fields: ["playerId", "tournamentId", "createdAt"],
    },
    { name: "bids_team_id_idx", fields: ["teamId"] },
    { name: "bids_owner_id_idx", fields: ["ownerId"] },
  ],
});

Bid.belongsTo(Player, {
  foreignKey: "playerId",
  as: "player",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Bid.belongsTo(Tournament, {
  foreignKey: "tournamentId",
  as: "tournament",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Bid.belongsTo(Team, {
  foreignKey: "teamId",
  as: "team",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Bid.belongsTo(User, {
  foreignKey: "ownerId",
  as: "user",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Tournament.hasMany(Bid, { foreignKey: "tournamentId", as: "bids" });

export default Bid;
