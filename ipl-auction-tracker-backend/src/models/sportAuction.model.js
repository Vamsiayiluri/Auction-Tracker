import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportAuction = sequelize.define("SportAuction", {
  id: { type: DataTypes.STRING, primaryKey: true },
  sportTournamentId: { type: DataTypes.STRING, allowNull: false },
  festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM("live", "paused", "pending", "sold", "unsold"),
    allowNull: false,
    defaultValue: "live",
  },
  baseCredits: { type: DataTypes.BIGINT, allowNull: false },
  startedByUserId: { type: DataTypes.STRING, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  endsAt: { type: DataTypes.DATE, allowNull: true },
  pausedRemainingMs: { type: DataTypes.INTEGER, allowNull: true },
  attemptNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  finalizedByUserId: { type: DataTypes.STRING, allowNull: true },
  finalizedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [
    {
      name: "sport_auctions_participant_attempt_uq",
      unique: true,
      fields: ["sportTournamentId", "festivalParticipantId", "attemptNumber"],
    },
    {
      name: "sport_auctions_tournament_status_idx",
      fields: ["sportTournamentId", "status"],
    },
  ],
});

SportAuction.belongsTo(SportTournament, { foreignKey: "sportTournamentId", as: "tournament" });
SportTournament.hasMany(SportAuction, { foreignKey: "sportTournamentId", as: "auctions" });
SportAuction.belongsTo(FestivalParticipant, { foreignKey: "festivalParticipantId", as: "participant" });
SportAuction.belongsTo(User, { foreignKey: "startedByUserId", as: "starter" });
SportAuction.belongsTo(User, { foreignKey: "finalizedByUserId", as: "finalizer" });

export default SportAuction;
