import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/dbconfig.js";
import { syncDB } from "./models/index.js";
import authRoutes from "./routes/authRoutes.js";
import TeamRoutes from "./routes/teamRoutes.js";
import PlayerRoutes from "./routes/playerRoutes.js";
// import BidRoutes from "./routes/bidRoutes.js";
import AuctionRoutes from "./routes/auctionRoutes.js";
import TournamentRoutes from "./routes/tournmentRoutes.js";
import { Server } from "socket.io";
import http from "http";
import Auction from "./models/auction.model.js";
import Bid from "./models/bid.model.js";

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
  // socket.on("", (chatId) => {});

  // socket.on("");
  socket.on("place-bid", async (data) => {
    console.log(data, "data");
    const { id, playerId, teamId, teamName, ownerId, bidAmount } = data;

    try {
      const latestBid = await Bid.findOne({
        where: { playerId },
        order: [["createdAt", "DESC"]],
      });

      if (latestBid && bidAmount <= latestBid.bidAmount) {
        socket.emit("bid-rejected", {
          message: "Bid must be higher than current bid.",
        });
        return;
      }

      await Bid.create({
        id,
        playerId,
        teamId,
        teamName,
        bidAmount,
        ownerId,
      });

      io.emit("new-bid", {
        id,
        bidAmount,
        teamId,
        teamName,
        ownerId,
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
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend failed to start:", error.message);
    process.exitCode = 1;
  }
};

startServer();
