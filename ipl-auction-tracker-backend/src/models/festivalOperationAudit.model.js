import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import User from "./user.model.js";

const FestivalOperationAudit = sequelize.define(
  "FestivalOperationAudit",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    actorUserId: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING(80), allowNull: false },
    entityType: { type: DataTypes.STRING(80), allowNull: false },
    entityId: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
  },
  {
    indexes: [
      {
        name: "festival_operation_audits_festival_created_idx",
        fields: ["festivalId", "createdAt"],
      },
    ],
  }
);

FestivalOperationAudit.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
Festival.hasMany(FestivalOperationAudit, {
  foreignKey: "festivalId",
  as: "operationAudits",
});
FestivalOperationAudit.belongsTo(User, {
  foreignKey: "actorUserId",
  as: "actor",
});

export default FestivalOperationAudit;
