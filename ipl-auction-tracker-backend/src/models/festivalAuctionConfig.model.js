import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import User from "./user.model.js";

const FestivalAuctionConfig = sequelize.define(
  "FestivalAuctionConfig",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    totalBudget: { type: DataTypes.BIGINT, allowNull: false },
    ownerCost: { type: DataTypes.BIGINT, allowNull: false },
    status: {
      type: DataTypes.ENUM("setup", "ready", "started", "completed"),
      allowNull: false,
      defaultValue: "setup",
    },
    auctionStatus: {
      type: DataTypes.ENUM("setup", "live", "paused", "completed"),
      allowNull: false,
      defaultValue: "setup",
    },
    currentParticipantId: { type: DataTypes.STRING, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    incrementPercentage: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 20,
    },
    configuredBy: { type: DataTypes.STRING, allowNull: false },
  },
  {
    indexes: [
      {
        name: "festival_auction_configs_festival_uq",
        unique: true,
        fields: ["festivalId"],
      },
    ],
  }
);

FestivalAuctionConfig.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
Festival.hasOne(FestivalAuctionConfig, {
  foreignKey: "festivalId",
  as: "auctionConfig",
});
FestivalAuctionConfig.belongsTo(User, {
  foreignKey: "configuredBy",
  as: "configurer",
});
FestivalAuctionConfig.belongsTo(FestivalParticipant, {
  foreignKey: "currentParticipantId",
  as: "currentParticipant",
});

export default FestivalAuctionConfig;
