import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportAuction from "./sportAuction.model.js";
import SportTeam from "./sportTeam.model.js";
import SportTeamCaptain from "./sportTeamCaptain.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportAuctionBid = sequelize.define("SportAuctionBid", {
  id: { type: DataTypes.STRING, primaryKey: true },
  sportTournamentId: { type: DataTypes.STRING, allowNull: false },
  sportAuctionId: { type: DataTypes.STRING, allowNull: false },
  festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
  sportTeamId: { type: DataTypes.STRING, allowNull: false },
  sportTeamCaptainId: { type: DataTypes.STRING, allowNull: false },
  placedByUserId: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  indexes: [{
    name: "sport_auction_bids_auction_amount_uq",
    unique: true,
    fields: ["sportAuctionId", "amount"],
  }],
});

SportAuctionBid.belongsTo(SportTournament, { foreignKey: "sportTournamentId", as: "tournament" });
SportAuctionBid.belongsTo(SportAuction, { foreignKey: "sportAuctionId", as: "auction" });
SportAuction.hasMany(SportAuctionBid, { foreignKey: "sportAuctionId", as: "bids" });
SportAuctionBid.belongsTo(FestivalParticipant, { foreignKey: "festivalParticipantId", as: "participant" });
SportAuctionBid.belongsTo(SportTeam, { foreignKey: "sportTeamId", as: "team" });
SportAuctionBid.belongsTo(SportTeamCaptain, { foreignKey: "sportTeamCaptainId", as: "captainAssignment" });
SportAuctionBid.belongsTo(User, { foreignKey: "placedByUserId", as: "bidder" });

export default SportAuctionBid;
