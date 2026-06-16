import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportAuctionConfig = sequelize.define("SportAuctionConfig", {
  id: { type: DataTypes.STRING, primaryKey: true },
  sportTournamentId: { type: DataTypes.STRING, allowNull: false },
  timerDurationSeconds: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 20,
  },
  incrementPercentage: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 20,
  },
  reauctionEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  currentParticipantId: { type: DataTypes.STRING, allowNull: true },
  configuredByUserId: { type: DataTypes.STRING, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [{
    name: "sport_auction_configs_tournament_uq",
    unique: true,
    fields: ["sportTournamentId"],
  }],
});

SportAuctionConfig.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasOne(SportAuctionConfig, {
  foreignKey: "sportTournamentId",
  as: "auctionConfig",
});
SportAuctionConfig.belongsTo(FestivalParticipant, {
  foreignKey: "currentParticipantId",
  as: "currentParticipant",
});
SportAuctionConfig.belongsTo(User, {
  foreignKey: "configuredByUserId",
  as: "configurer",
});

export default SportAuctionConfig;
