import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import Sport from "./sport.model.js";

const FestivalSport = sequelize.define(
  "FestivalSport",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    festivalId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sportId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "registration_open",
        "allocation",
        "competition",
        "completed"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    configJson: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        name: "festival_sports_festival_sport_uq",
        unique: true,
        fields: ["festivalId", "sportId"],
      },
      { name: "festival_sports_sport_id_idx", fields: ["sportId"] },
    ],
  }
);

FestivalSport.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Festival.hasMany(FestivalSport, {
  foreignKey: "festivalId",
  as: "festivalSports",
});
FestivalSport.belongsTo(Sport, {
  foreignKey: "sportId",
  as: "sport",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Sport.hasMany(FestivalSport, {
  foreignKey: "sportId",
  as: "festivalSports",
});

export default FestivalSport;
