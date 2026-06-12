import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";

const Sport = sequelize.define("Sport", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  indexes: [{ name: "sports_code_uq", unique: true, fields: ["code"] }],
});

export default Sport;
