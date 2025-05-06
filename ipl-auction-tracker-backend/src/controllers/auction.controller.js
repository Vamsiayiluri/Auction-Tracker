import { Player, Bid, Team, Auction } from "../models/index.js";
import { io } from "../index.js";
export const startAuction = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { auctionId } = req.body;

    const activeAuction = await Player.findOne({
      where: { isInAuction: true },
    });
    if (activeAuction) {
      return res.status(400).json({
        message: `Auction is already running for ${activeAuction.name}`,
      });
    }
    const player = await Player.findByPk(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    player.isInAuction = true;
    player.auctionId = auctionId;
    console.log(player);
    await player.save();
    await Auction.create({
      id: auctionId,
      currentPlayerId: player.id,
      status: "live",
    });
    io.emit("auction-started", {
      id: player.id,
      name: player.name,
      role: player.role,
      basePrice: player.basePrice,
    });

    res.status(200).json({ message: `Auction started for ${player.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const stopAuction = async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await Player.findByPk(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    if (!player.isInAuction) {
      return res
        .status(400)
        .json({ message: "No active auction for this player" });
    }

    const highestBid = await Bid.findOne({
      where: { playerId },
      order: [["bidAmount", "DESC"]],
    });

    if (!highestBid) {
      player.isInAuction = false;
      await player.save();
      return res
        .status(200)
        .json({ message: "No bids placed, auction closed." });
    }

    player.isSold = true;
    player.soldPrice = highestBid.bidAmount;
    player.teamId = highestBid.teamId;
    player.isInAuction = false;
    await player.save();

    const winningTeam = await Team.findByPk(highestBid.teamId);
    winningTeam.amountSpent += highestBid.bidAmount;
    await winningTeam.save();
    await Auction.update(
      { status: "completed" },
      {
        where: {
          currentPlayerId: player.id,
        },
      }
    );
    io.emit("auction-finalized", {
      playerId: playerId,
      playerName: player.name,
      soldToTeamId: highestBid.teamId,
      soldToTeamName: highestBid.teamName,
      finalPrice: highestBid.bidAmount,
    });
    res.status(200).json({
      message: `${player.name} sold to ${winningTeam.name} for ₹${highestBid.bidAmount}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentPlayerInAuction = async (req, res) => {
  try {
    const liveAuction = await Auction.findOne({
      where: { status: "live" },
      include: [{ model: Player, as: "currentPlayer" }],
    });

    if (!liveAuction) {
      return res.status(404).json({ message: "No live auction found" });
    }

    const player = liveAuction.currentPlayer;

    if (!player) {
      return res
        .status(404)
        .json({ message: "No player associated with live auction" });
    }
    const bids = await Bid.findAll({
      where: { playerId: player.id },
      order: [["createdAt", "DESC"]], // Optional: latest bids first
    });

    return res.json({
      message: "Current player in live auction",
      player,
      bids,
      auctionId: liveAuction.id,
    });
  } catch (error) {
    console.error("Error fetching current player in auction:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
