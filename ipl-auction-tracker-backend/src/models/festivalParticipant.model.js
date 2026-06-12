import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Employee from "./employee.model.js";
import Festival from "./festival.model.js";

const FestivalParticipant = sequelize.define(
  "FestivalParticipant",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    festivalId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("registered", "withdrawn"),
      allowNull: false,
      defaultValue: "registered",
    },
    registeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "festival_participants_festival_employee_uq",
        unique: true,
        fields: ["festivalId", "employeeId"],
      },
      {
        name: "festival_participants_employee_status_idx",
        fields: ["employeeId", "status"],
      },
    ],
  }
);

FestivalParticipant.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Festival.hasMany(FestivalParticipant, {
  foreignKey: "festivalId",
  as: "participants",
});
FestivalParticipant.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
Employee.hasMany(FestivalParticipant, {
  foreignKey: "employeeId",
  as: "festivalParticipations",
});

export default FestivalParticipant;
