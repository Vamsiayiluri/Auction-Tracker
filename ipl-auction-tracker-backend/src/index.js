import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/dbconfig.js";
import sequelizeDb from "./config/dbconfig.js";
import { syncDB } from "./models/index.js";
import authRoutes from "./routes/authRoutes.js";
import TeamRoutes from "./routes/teamRoutes.js";
import PlayerRoutes from "./routes/playerRoutes.js";
// import BidRoutes from "./routes/bidRoutes.js";
import AuctionRoutes from "./routes/auctionRoutes.js";
import TournamentRoutes from "./routes/tournmentRoutes.js";
import {
  isBiddingOpen,
  resetAuctionTimer,
  restoreAuctionTimers,
} from "./controllers/auction.controller.js";
import { Server } from "socket.io";
import http from "http";
import { Auction, Bid, Player, Team, TournamentTeam } from "./models/index.js";
import { getNextMinimumBid, validateBidAmount } from "./utils/bidRules.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.text());

app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/teams", TeamRoutes);
app.use("/api/players", PlayerRoutes);
// app.use("/api/bids", BidRoutes);
app.use("/api/auction", AuctionRoutes);
app.use("/api/tournament", TournamentRoutes);

app.get("/", (req, res) => {
  res.send("IPL Auction Backend Running...");
});
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend healthy",
  });
});
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-tournament", ({ tournamentId }) => {
    if (tournamentId) socket.join(`tournament:${tournamentId}`);
  });

  socket.on("leave-tournament", ({ tournamentId }) => {
    if (tournamentId) socket.leave(`tournament:${tournamentId}`);
  });

  socket.on("place-bid", async (data) => {
    const { id, playerId, teamId, ownerId, bidAmount, tournamentId } = data;
    const roomName = tournamentId ? `tournament:${tournamentId}` : "";

    try {
      if (!roomName || !socket.rooms.has(roomName)) {
        socket.emit("bid-rejected", {
          message: "Join the tournament room before placing bids.",
        });
        return;
      }

      const biddingOpen = await isBiddingOpen(playerId);
      if (!biddingOpen) {
        socket.emit("bid-rejected", {
          message: "Bidding has closed for this player.",
        });
        return;
      }

      const [player, biddingTeam] = await Promise.all([
        Player.findByPk(playerId),
        Team.findByPk(teamId),
      ]);

      if (
        !player ||
        !biddingTeam ||
        biddingTeam.ownerId !== ownerId ||
        player.tournamentId !== tournamentId ||
        player.isSold
      ) {
        socket.emit("bid-rejected", {
          message: "This team cannot bid for the selected player.",
        });
        return;
      }

      const liveAuction = await Auction.findOne({
        where: {
          currentPlayerId: player.id,
          tournamentId: player.tournamentId,
          status: "live",
        },
      });
      if (!liveAuction) {
        socket.emit("bid-rejected", {
          message: "This auction round is not accepting bids.",
        });
        return;
      }

      const tournamentTeam = await TournamentTeam.findOne({
        where: { tournamentId: player.tournamentId, teamId: biddingTeam.id },
      });

      if (!tournamentTeam) {
        socket.emit("bid-rejected", {
          message: "Your team is not participating in this tournament.",
        });
        return;
      }

      const numericBidAmount = Number(bidAmount);
      if (!Number.isFinite(numericBidAmount)) {
        socket.emit("bid-rejected", {
          message: "Bid amount is invalid.",
        });
        return;
      }

      const acceptedBid = await sequelizeDb.transaction(async (transaction) => {
        const lockedAuction = await Auction.findOne({
          where: {
            currentPlayerId: player.id,
            tournamentId: player.tournamentId,
            status: "live",
          },
          transaction,
          lock: true,
        });
        if (!lockedAuction) {
          return { error: "This auction round is not accepting bids." };
        }

        const lockedTournamentTeam = await TournamentTeam.findOne({
          where: { tournamentId: player.tournamentId, teamId: biddingTeam.id },
          transaction,
          lock: true,
        });
        if (!lockedTournamentTeam) {
          return { error: "Your team is not participating in this tournament." };
        }

        const latestBid = await Bid.findOne({
          where: { playerId, tournamentId: player.tournamentId },
          order: [["bidAmount", "DESC"]],
          transaction,
          lock: true,
        });

        const currentBid = latestBid?.bidAmount || player.basePrice;
        const validation = validateBidAmount({
          bidAmount: numericBidAmount,
          currentBid,
          tournamentBudget: lockedTournamentTeam.totalAmount,
        });

        if (!validation.valid) {
          return {
            error: validation.message,
            nextMinimumBid: validation.nextMinimumBid,
          };
        }

        const amountLeft =
          Number(lockedTournamentTeam.totalAmount || 0) -
          Number(lockedTournamentTeam.amountSpent || 0);

        if (numericBidAmount > amountLeft) {
          return { error: "This bid exceeds your remaining purse." };
        }

        const bid = await Bid.create(
          {
            id,
            playerId,
            tournamentId: player.tournamentId,
            teamId,
            teamName: biddingTeam.name,
            bidAmount: numericBidAmount,
            ownerId,
          },
          { transaction }
        );

        return {
          bid,
          nextMinimumBid: getNextMinimumBid(
            numericBidAmount,
            lockedTournamentTeam.totalAmount
          ),
        };
      });

      if (acceptedBid.error) {
        socket.emit("bid-rejected", {
          message: acceptedBid.error,
          nextMinimumBid: acceptedBid.nextMinimumBid,
        });
        return;
      }

      const endsAt = await resetAuctionTimer(player.id);

      io.to(`tournament:${player.tournamentId}`).emit("new-bid", {
        id,
        playerId,
        tournamentId: player.tournamentId,
        bidAmount: numericBidAmount,
        teamId,
        teamName: biddingTeam.name,
        ownerId,
        endsAt,
        nextMinimumBid: acceptedBid.nextMinimumBid,
      });
    } catch (err) {
      console.error("Error placing bid:", err);

      socket.emit("bid-error", {
        message: "Failed to place bid",
      });
    }
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

export { io };

const startServer = async () => {
  try {
    await connectDB();
    await syncDB();
    await restoreAuctionTimers();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend failed to start:", error.message);
    process.exitCode = 1;
  }
};

startServer();
