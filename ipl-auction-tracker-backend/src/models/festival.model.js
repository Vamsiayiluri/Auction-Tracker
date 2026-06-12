import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import User from "./user.model.js";

const Festival = sequelize.define(
  "Festival",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    registrationOpensAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    registrationClosesAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "registration_open",
        "registration_closed",
        "allocation",
        "competition",
        "completed",
        "archived"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    teamAssignmentStatus: {
      type: DataTypes.ENUM("draft", "building", "locked"),
      allowNull: false,
      defaultValue: "draft",
    },
    rosterFormationMode: {
      type: DataTypes.ENUM("auction", "manual"),
      allowNull: false,
      defaultValue: "auction",
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },
    configurationLockState: {
      type: DataTypes.ENUM("locked", "unlocked"),
      allowNull: false,
      defaultValue: "locked",
    },
    createdByUserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      { name: "festivals_code_uq", unique: true, fields: ["code"] },
      {
        name: "festivals_status_start_date_idx",
        fields: ["status", "startDate"],
      },
      {
        name: "festivals_created_by_user_id_idx",
        fields: ["createdByUserId"],
      },
      {
        name: "festivals_roster_formation_mode_idx",
        fields: ["rosterFormationMode"],
      },
    ],
  }
);

Festival.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "creator",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
User.hasMany(Festival, {
  foreignKey: "createdByUserId",
  as: "createdFestivals",
});

export default Festival;
