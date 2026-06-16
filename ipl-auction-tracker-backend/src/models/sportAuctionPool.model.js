import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import SportTournament from "./sportTournament.model.js";
import User from "./user.model.js";

const SportAuctionPool = sequelize.define(
  "SportAuctionPool",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    sportTournamentId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    state: {
      type: DataTypes.ENUM("available", "sold", "unsold"),
      allowNull: false,
      defaultValue: "available",
    },
    generatedByUserId: { type: DataTypes.STRING, allowNull: false },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
        name: "sport_auction_pools_tournament_participant_uq",
        unique: true,
        fields: ["sportTournamentId", "festivalParticipantId"],
      },
      {
        name: "sport_auction_pools_tournament_state_idx",
        fields: ["sportTournamentId", "state"],
      },
    ],
  }
);

SportAuctionPool.belongsTo(SportTournament, {
  foreignKey: "sportTournamentId",
  as: "tournament",
});
SportTournament.hasMany(SportAuctionPool, {
  foreignKey: "sportTournamentId",
  as: "auctionPoolEntries",
});
SportAuctionPool.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasMany(SportAuctionPool, {
  foreignKey: "festivalParticipantId",
  as: "sportAuctionPoolEntries",
});
SportAuctionPool.belongsTo(User, {
  foreignKey: "generatedByUserId",
  as: "generator",
});

export default SportAuctionPool;
