import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportOperationAudit = sequelize.define("SportOperationAudit", {
  id: { type: DataTypes.STRING, primaryKey: true },
  sportTournamentId: { type: DataTypes.STRING, allowNull: false },
  actorUserId: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING(80), allowNull: false },
  entityType: { type: DataTypes.STRING(80), allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: true },
  details: { type: DataTypes.JSON, allowNull: true },
}, {
  indexes: [{
    name: "sport_operation_audits_tournament_created_idx",
    fields: ["sportTournamentId", "createdAt"],
  }],
});

SportOperationAudit.belongsTo(SportTournament, { foreignKey: "sportTournamentId", as: "tournament" });
SportTournament.hasMany(SportOperationAudit, { foreignKey: "sportTournamentId", as: "operationAudits" });
SportOperationAudit.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });

export default SportOperationAudit;
