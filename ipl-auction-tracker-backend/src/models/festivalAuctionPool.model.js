import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";

const FestivalAuctionPool = sequelize.define(
  "FestivalAuctionPool",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    state: {
      type: DataTypes.ENUM("available", "sold", "unsold"),
      allowNull: false,
      defaultValue: "available",
    },
    reauctionCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    lastReauctionedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    indexes: [
      {
        name: "festival_auction_pools_festival_participant_uq",
        unique: true,
        fields: ["festivalId", "festivalParticipantId"],
      },
    ],
  }
);

FestivalAuctionPool.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
Festival.hasMany(FestivalAuctionPool, {
  foreignKey: "festivalId",
  as: "auctionPoolEntries",
});
FestivalAuctionPool.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});

export default FestivalAuctionPool;
