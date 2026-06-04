import sequelizeDb from "../config/dbconfig.js";
import { DataTypes, Op } from "sequelize";
import User from "./user.model.js";
import Auction from "./auction.model.js";
import Bid from "./bid.model.js";
import Team from "./team.model.js";
import Player from "./player.model.js";
import Tournament from "./tournment.model.js";
import TournamentTeam from "./tournamentTeam.model.js";

export const syncDB = async () => {
  await sequelizeDb.sync({ force: false });
  await backfillExistingUsers();
  await ensureTournamentScopedColumns();
  await backfillTournamentTeams();
  await backfillTournamentScopedColumns();
  console.log("Database and tables are synced");
};

const backfillExistingUsers = async () => {
  try {
    await sequelizeDb.query(`
      UPDATE Users
      SET isVerified = true
      WHERE isVerified = false AND verificationToken IS NULL
    `);
  } catch (error) {
    console.warn("Backfill existing users skipped or failed:", error.message);
  }
};

const ensureColumn = async (tableName, columnName, definition) => {
  const queryInterface = sequelizeDb.getQueryInterface();
  const table = await queryInterface.describeTable(tableName);

  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const ensureTournamentScopedColumns = async () => {
  await Promise.all([
    ensureColumn("Auctions", "tournamentId", {
      type: DataTypes.STRING,
      allowNull: true,
    }),
    ensureColumn("Bids", "tournamentId", {
      type: DataTypes.STRING,
      allowNull: true,
    }),
  ]);
};

const backfillTournamentTeams = async () => {
  const legacyTeams = await Team.findAll({
    where: {
      tournamentId: { [Op.ne]: null },
    },
  });

  await Promise.all(
    legacyTeams.map((team) =>
      TournamentTeam.findOrCreate({
        where: { tournamentId: team.tournamentId, teamId: team.id },
        defaults: {
          id: `${team.tournamentId}-${team.id}`,
          totalAmount: team.totalAmount,
          amountSpent: team.amountSpent,
        },
      })
    )
  );
};

const backfillTournamentScopedColumns = async () => {
  await Promise.all([
    sequelizeDb.query(`
      UPDATE Bids
      INNER JOIN Players ON Bids.playerId = Players.id
      SET Bids.tournamentId = Players.tournamentId
      WHERE Bids.tournamentId IS NULL
        AND Players.tournamentId IS NOT NULL
    `),
    sequelizeDb.query(`
      UPDATE Auctions
      INNER JOIN Players ON Auctions.currentPlayerId = Players.id
      SET Auctions.tournamentId = Players.tournamentId
      WHERE Auctions.tournamentId IS NULL
        AND Players.tournamentId IS NOT NULL
    `),
  ]);
};

export { User, Team, Player, Auction, Bid, Tournament, TournamentTeam };
