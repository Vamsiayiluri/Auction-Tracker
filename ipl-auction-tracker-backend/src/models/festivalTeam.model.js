import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";

const FestivalTeam = sequelize.define(
  "FestivalTeam",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    festivalId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    indexes: [
      {
        name: "festival_teams_festival_name_uq",
        unique: true,
        fields: ["festivalId", "name"],
      },
      {
        name: "festival_teams_festival_code_uq",
        unique: true,
        fields: ["festivalId", "code"],
      },
    ],
  }
);

FestivalTeam.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Festival.hasMany(FestivalTeam, {
  foreignKey: "festivalId",
  as: "festivalTeams",
});

export default FestivalTeam;
