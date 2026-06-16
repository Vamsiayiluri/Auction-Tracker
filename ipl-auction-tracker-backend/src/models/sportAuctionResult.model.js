import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportAuction from "./sportAuction.model.js";
import SportAuctionBid from "./sportAuctionBid.model.js";
import SportTeam from "./sportTeam.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportAuctionResult = sequelize.define("SportAuctionResult", {
  id: { type: DataTypes.STRING, primaryKey: true },
  sportTournamentId: { type: DataTypes.STRING, allowNull: false },
  sportAuctionId: { type: DataTypes.STRING, allowNull: false },
  festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
  outcome: { type: DataTypes.ENUM("sold", "unsold"), allowNull: false },
  sportTeamId: { type: DataTypes.STRING, allowNull: true },
  winningBidId: { type: DataTypes.STRING, allowNull: true },
  finalCredits: { type: DataTypes.BIGINT, allowNull: true },
  finalizedByUserId: { type: DataTypes.STRING, allowNull: false },
  finalizedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  indexes: [{
    name: "sport_auction_results_auction_uq",
    unique: true,
    fields: ["sportAuctionId"],
  }],
});

SportAuctionResult.belongsTo(SportTournament, { foreignKey: "sportTournamentId", as: "tournament" });
SportAuctionResult.belongsTo(SportAuction, { foreignKey: "sportAuctionId", as: "auction" });
SportAuction.hasOne(SportAuctionResult, { foreignKey: "sportAuctionId", as: "result" });
SportAuctionResult.belongsTo(FestivalParticipant, { foreignKey: "festivalParticipantId", as: "participant" });
SportAuctionResult.belongsTo(SportTeam, { foreignKey: "sportTeamId", as: "team" });
SportAuctionResult.belongsTo(SportAuctionBid, { foreignKey: "winningBidId", as: "winningBid" });
SportAuctionResult.belongsTo(User, { foreignKey: "finalizedByUserId", as: "finalizer" });

export default SportAuctionResult;
