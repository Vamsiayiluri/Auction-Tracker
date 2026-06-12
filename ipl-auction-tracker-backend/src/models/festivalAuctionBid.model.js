import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalAuction from "./festivalAuction.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import FestivalTeamOwner from "./festivalTeamOwner.model.js";
import User from "./user.model.js";

const FestivalAuctionBid = sequelize.define(
  "FestivalAuctionBid",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalAuctionId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamOwnerId: { type: DataTypes.STRING, allowNull: false },
    placedByUserId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.BIGINT, allowNull: false },
    placedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "festival_auction_bids_auction_amount_uq",
        unique: true,
        fields: ["festivalAuctionId", "amount"],
      },
      {
        name: "festival_auction_bids_auction_created_idx",
        fields: ["festivalAuctionId", "createdAt"],
      },
    ],
  }
);

FestivalAuctionBid.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
FestivalAuctionBid.belongsTo(FestivalAuction, {
  foreignKey: "festivalAuctionId",
  as: "auction",
});
FestivalAuction.hasMany(FestivalAuctionBid, {
  foreignKey: "festivalAuctionId",
  as: "bids",
});
FestivalAuctionBid.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalAuctionBid.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "team",
});
FestivalAuctionBid.belongsTo(FestivalTeamOwner, {
  foreignKey: "festivalTeamOwnerId",
  as: "ownerAssignment",
});
FestivalAuctionBid.belongsTo(User, {
  foreignKey: "placedByUserId",
  as: "bidder",
});

export default FestivalAuctionBid;
