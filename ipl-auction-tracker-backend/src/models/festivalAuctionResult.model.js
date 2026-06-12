import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalAuction from "./festivalAuction.model.js";
import FestivalAuctionBid from "./festivalAuctionBid.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import User from "./user.model.js";

const FestivalAuctionResult = sequelize.define(
  "FestivalAuctionResult",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalAuctionId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    outcome: {
      type: DataTypes.ENUM("sold", "unsold"),
      allowNull: false,
    },
    festivalTeamId: { type: DataTypes.STRING, allowNull: true },
    winningBidId: { type: DataTypes.STRING, allowNull: true },
    finalAmount: { type: DataTypes.BIGINT, allowNull: true },
    finalizedBy: { type: DataTypes.STRING, allowNull: false },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "festival_auction_results_auction_uq",
        unique: true,
        fields: ["festivalAuctionId"],
      },
    ],
  }
);

FestivalAuctionResult.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
FestivalAuctionResult.belongsTo(FestivalAuction, {
  foreignKey: "festivalAuctionId",
  as: "auction",
});
FestivalAuction.hasOne(FestivalAuctionResult, {
  foreignKey: "festivalAuctionId",
  as: "result",
});
FestivalAuctionResult.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasMany(FestivalAuctionResult, {
  foreignKey: "festivalParticipantId",
  as: "auctionResults",
});
FestivalAuctionResult.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "team",
});
FestivalAuctionResult.belongsTo(FestivalAuctionBid, {
  foreignKey: "winningBidId",
  as: "winningBid",
});
FestivalAuctionResult.belongsTo(User, {
  foreignKey: "finalizedBy",
  as: "finalizer",
});

export default FestivalAuctionResult;
