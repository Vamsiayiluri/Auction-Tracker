import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
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
import {
  Auction,
  Bid,
  Player,
  Team,
  TournamentTeam,
  User,
} from "./models/index.js";
import { getNextMinimumBid, validateBidAmount } from "./utils/bidRules.js";
import { validateSocketPayload } from "./middleware/validate.middleware.js";
import { placeBidSocketSchema } from "./validation/socket.validation.js";

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

io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers?.authorization
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = authToken || headerToken;

    if (!token) {
      return next(new Error("Socket authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return next(new Error("Socket user not found"));
    }

    socket.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    return next();
  } catch {
    return next(new Error("Socket authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, socket.user?.id);

  socket.on("join-tournament", ({ tournamentId }) => {
    if (tournamentId) socket.join(`tournament:${tournamentId}`);
  });

  socket.on("leave-tournament", ({ tournamentId }) => {
    if (tournamentId) socket.leave(`tournament:${tournamentId}`);
  });

  socket.on("place-bid", async (data) => {
    try {
      const validation = validateSocketPayload(placeBidSocketSchema, data);
      if (!validation.success) {
        socket.emit("bid-rejected", validation);
        return;
      }

      const { id, playerId, bidAmount, tournamentId } = validation.data;
      const roomName = tournamentId ? `tournament:${tournamentId}` : "";

      if (socket.user?.role !== "team_owner") {
        socket.emit("bid-rejected", {
          message: "Only team owners can place bids.",
        });
        return;
      }

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

      const player = await Player.findByPk(playerId);

      if (
        !player ||
        player.tournamentId !== tournamentId ||
        player.isSold
      ) {
        socket.emit("bid-rejected", {
          message: "This team cannot bid for the selected player.",
        });
        return;
      }

      const ownedTeams = await Team.findAll({
        where: { ownerId: socket.user.id },
      });
      const ownedTeamIds = ownedTeams.map((team) => team.id);

      if (!ownedTeamIds.length) {
        socket.emit("bid-rejected", {
          message: "This team cannot bid for the selected player.",
        });
        return;
      }

      const tournamentTeam = await TournamentTeam.findOne({
        where: {
          tournamentId: player.tournamentId,
          teamId: ownedTeamIds,
        },
      });

      if (!tournamentTeam) {
        socket.emit("bid-rejected", {
          message: "Your team is not participating in this tournament.",
        });
        return;
      }

      const biddingTeam = ownedTeams.find(
        (team) => team.id === tournamentTeam.teamId
      );

      if (!biddingTeam) {
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

      const numericBidAmount = bidAmount;

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
            teamId: biddingTeam.id,
            teamName: biddingTeam.name,
            bidAmount: numericBidAmount,
            ownerId: socket.user.id,
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
        teamId: biddingTeam.id,
        teamName: biddingTeam.name,
        ownerId: socket.user.id,
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
