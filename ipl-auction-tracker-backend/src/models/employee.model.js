import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import User from "./user.model.js";

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    employeeNumber: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: false,
    },
    employmentStatus: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    source: {
      type: DataTypes.ENUM("hr_import", "manual", "legacy_user", "hris"),
      allowNull: false,
      defaultValue: "manual",
    },
    identityStatus: {
      type: DataTypes.ENUM("verified", "provisional", "needs_review"),
      allowNull: false,
      defaultValue: "verified",
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        name: "employees_employee_number_uq",
        unique: true,
        fields: ["employeeNumber"],
      },
      {
        name: "employees_user_id_uq",
        unique: true,
        fields: ["userId"],
      },
      { name: "employees_email_idx", fields: ["email"] },
      { name: "employees_gender_idx", fields: ["gender"] },
      {
        name: "employees_status_name_idx",
        fields: ["employmentStatus", "name"],
      },
    ],
  }
);

Employee.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
User.hasOne(Employee, {
  foreignKey: "userId",
  as: "employee",
});

export default Employee;
