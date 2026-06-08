import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import User from "./user.model.js";
const Tournament = sequelize.define("Tournament", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  budget: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("upcoming", "live", "completed"),
    allowNull: false,
    defaultValue: "upcoming",
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  indexes: [{ name: "tournaments_created_by_idx", fields: ["createdBy"] }],
});

Tournament.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

export default Tournament;
