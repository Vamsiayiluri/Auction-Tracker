import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import User from "./user.model.js";

const FestivalAuction = sequelize.define(
  "FestivalAuction",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("live", "paused", "pending", "sold", "unsold"),
      allowNull: false,
      defaultValue: "live",
    },
    basePrice: { type: DataTypes.BIGINT, allowNull: false },
    startedBy: { type: DataTypes.STRING, allowNull: false },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endsAt: { type: DataTypes.DATE, allowNull: true },
    pausedRemainingMs: { type: DataTypes.INTEGER, allowNull: true },
    attemptNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    finalizedBy: { type: DataTypes.STRING, allowNull: true },
    finalizedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    indexes: [
      {
        name: "festival_auctions_participant_attempt_uq",
        unique: true,
        fields: ["festivalId", "festivalParticipantId", "attemptNumber"],
      },
      {
        name: "festival_auctions_festival_status_idx",
        fields: ["festivalId", "status"],
      },
    ],
  }
);

FestivalAuction.belongsTo(Festival, { foreignKey: "festivalId", as: "festival" });
Festival.hasMany(FestivalAuction, {
  foreignKey: "festivalId",
  as: "mainAuctions",
});
FestivalAuction.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasMany(FestivalAuction, {
  foreignKey: "festivalParticipantId",
  as: "auctionRounds",
});
FestivalAuction.belongsTo(User, { foreignKey: "startedBy", as: "starter" });
FestivalAuction.belongsTo(User, { foreignKey: "finalizedBy", as: "finalizer" });

export default FestivalAuction;
