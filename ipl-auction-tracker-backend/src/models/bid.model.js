import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Player from "./player.model.js";
import Team from "./team.model.js";
import User from "./user.model.js";

const Bid = sequelize.define("Bid", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
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
});

Bid.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Bid.belongsTo(Team, { foreignKey: "teamId", as: "team" });
Bid.belongsTo(User, { foreignKey: "ownerId", as: "user" });

export default Bid;
