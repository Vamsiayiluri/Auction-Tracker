import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import User from "./user.model.js";
import Tournament from "./tournment.model.js";

const Team = sequelize.define("Team", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2000000,
  },
  amountSpent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  amountLeft: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.totalAmount - this.amountSpent;
    },
  },
  tournamentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  indexes: [{ name: "teams_owner_id_idx", fields: ["ownerId"] }],
});

Tournament.hasMany(Team, { foreignKey: "tournamentId" });
Team.belongsTo(User, {
  foreignKey: "ownerId",
  as: "owner",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

export default Team;
