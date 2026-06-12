import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Employee from "./employee.model.js";
import User from "./user.model.js";

const EmployeeUserLinkAudit = sequelize.define("EmployeeUserLinkAudit", {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  employeeId: { type: DataTypes.STRING, allowNull: true },
  normalizedEmail: { type: DataTypes.STRING(255), allowNull: false },
  source: {
    type: DataTypes.ENUM("registration", "admin_manual"),
    allowNull: false,
  },
  outcome: {
    type: DataTypes.ENUM(
      "linked",
      "no_match",
      "duplicate_email",
      "employee_already_linked",
      "user_already_linked"
    ),
    allowNull: false,
  },
  details: { type: DataTypes.JSON, allowNull: true },
});

EmployeeUserLinkAudit.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});
EmployeeUserLinkAudit.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
});

export default EmployeeUserLinkAudit;
