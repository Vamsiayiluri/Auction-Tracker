import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
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
    type: DataTypes.STRING,
    defaultValue: "upcoming",
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default Tournament;
