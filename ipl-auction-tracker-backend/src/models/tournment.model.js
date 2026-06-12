import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Sport from "./sport.model.js";
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
    type: DataTypes.ENUM("upcoming", "live", "completed", "archived"),
    allowNull: false,
    defaultValue: "upcoming",
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sportId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "cricket",
  },
}, {
  indexes: [
    { name: "tournaments_created_by_idx", fields: ["createdBy"] },
    { name: "tournaments_sport_id_idx", fields: ["sportId"] },
  ],
});

Tournament.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Tournament.belongsTo(Sport, {
  foreignKey: "sportId",
  as: "sport",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Sport.hasMany(Tournament, { foreignKey: "sportId", as: "tournaments" });

export default Tournament;
