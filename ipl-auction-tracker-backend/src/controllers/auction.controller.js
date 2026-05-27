import { Player, Bid, Team, Auction, Tournament } from "../models/index.js";
import { io } from "../index.js";

const AUCTION_DURATION_MS = 20_000;
const auctionTimers = new Map();

const clearAuctionTimer = (playerId) => {
  const activeTimer = auctionTimers.get(playerId);
  if (activeTimer) {
    clearTimeout(activeTimer.timer);
    auctionTimers.delete(playerId);
  }
};

const formatResult = (player, highestBid) => ({
  tournamentId: player.tournamentId,
  playerId: player.id,
  playerName: player.name,
  status: highestBid ? "sold" : "unsold",
  soldToTeamId: highestBid?.teamId || null,
  soldToTeamName: highestBid?.teamName || null,
  finalPrice: highestBid?.bidAmount || null,
});

const findLiveAuction = async (tournamentId) => {
  const include = [{ model: Player, as: "currentPlayer" }];

  if (tournamentId) {
    include[0].where = { tournamentId };
  }

  return Auction.findOne({
    where: { status: "live" },
    include,
  });
};

const updateTournamentIfFinished = async (tournamentId) => {
  if (!tournamentId) return;

  const [availablePlayers, livePlayers] = await Promise.all([
    Player.count({
      where: {
        tournamentId,
        isSold: false,
        isInAuction: false,
        auctionId: "",
      },
    }),
    Player.count({ where: { tournamentId, isInAuction: true } }),
  ]);

  if (!availablePlayers && !livePlayers) {
    await Tournament.update(
      { status: "completed" },
      { where: { id: tournamentId } }
    );
  }
};

const finalizePlayerAuction = async (playerId) => {
  const player = await Player.findByPk(playerId);
  if (!player || !player.isInAuction) return null;

  const [closedCount] = await Player.update(
    { isInAuction: false },
    { where: { id: playerId, isInAuction: true } }
  );

  if (!closedCount) return null;

  clearAuctionTimer(playerId);

  const highestBid = await Bid.findOne({
    where: { playerId },
    order: [["bidAmount", "DESC"]],
  });

  if (highestBid) {
    player.isSold = true;
    player.soldPrice = highestBid.bidAmount;
    player.teamId = highestBid.teamId;
    player.isInAuction = false;
    await player.save();

    const winningTeam = await Team.findByPk(highestBid.teamId);
    if (winningTeam) {
      winningTeam.amountSpent += highestBid.bidAmount;
      await winningTeam.save();
    }
  } else {
    player.isInAuction = false;
    player.isSold = false;
    player.soldPrice = null;
    player.teamId = null;
    await player.save();
  }

  await Auction.update(
    { status: "completed" },
    { where: { currentPlayerId: player.id, status: "live" } }
  );
  await updateTournamentIfFinished(player.tournamentId);

  const result = formatResult(player, highestBid);
  io.emit("auction-finalized", result);
  return result;
};

const scheduleAuctionEnd = (playerId, endsAt) => {
  clearAuctionTimer(playerId);

  const remainingTime = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const timer = setTimeout(async () => {
    try {
      await finalizePlayerAuction(playerId);
    } catch (error) {
      console.error("Error finalizing timed auction:", error.message);
    }
  }, remainingTime);

  auctionTimers.set(playerId, { timer, endsAt });
};

export const resetAuctionTimer = async (playerId) => {
  const player = await Player.findByPk(playerId);
  if (!player?.isInAuction) return null;

  const endsAt = new Date(Date.now() + AUCTION_DURATION_MS);
  scheduleAuctionEnd(playerId, endsAt);
  io.emit("auction-timer-updated", {
    playerId,
    tournamentId: player.tournamentId,
    endsAt,
  });
  return endsAt;
};

export const isBiddingOpen = async (playerId) => {
  const player = await Player.findByPk(playerId);
  const deadline = auctionTimers.get(playerId)?.endsAt;

  return Boolean(
    player?.isInAuction &&
      deadline &&
      new Date(deadline).getTime() > Date.now()
  );
};

export const restoreAuctionTimers = async () => {
  const liveAuctions = await Auction.findAll({ where: { status: "live" } });

  await Promise.all(
    liveAuctions.map(async (auction) => {
      const player = auction.currentPlayerId
        ? await Player.findByPk(auction.currentPlayerId)
        : null;

      if (!player?.isInAuction) {
        await auction.update({ status: "completed" });
        return;
      }

      scheduleAuctionEnd(
        player.id,
        new Date(Date.now() + AUCTION_DURATION_MS)
      );
    })
  );
};

export const startAuction = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { auctionId, tournamentId } = req.body;

    if (!auctionId) {
      return res.status(400).json({ message: "Auction id is required" });
    }

    const player = await Player.findByPk(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    if (tournamentId && player.tournamentId !== tournamentId) {
      return res
        .status(400)
        .json({ message: "Player does not belong to this tournament" });
    }

    if (player.isSold || player.auctionId) {
      return res.status(400).json({
        message: "This player has already completed an auction round",
      });
    }

    const activeAuction = await Player.findOne({
      where: { isInAuction: true, tournamentId: player.tournamentId },
    });
    if (activeAuction) {
      return res.status(400).json({
        message: `Auction is already running for ${activeAuction.name}`,
      });
    }

    const endsAt = new Date(Date.now() + AUCTION_DURATION_MS);
    player.isInAuction = true;
    player.auctionId = auctionId;
    await player.save();
    await Auction.create({
      id: auctionId,
      currentPlayerId: player.id,
      status: "live",
    });
    await Tournament.update(
      { status: "live" },
      { where: { id: player.tournamentId } }
    );

    scheduleAuctionEnd(player.id, endsAt);
    io.emit("auction-started", {
      id: player.id,
      tournamentId: player.tournamentId,
      name: player.name,
      role: player.role,
      basePrice: player.basePrice,
      endsAt,
    });

    res.status(200).json({ message: `Auction started for ${player.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const stopAuction = async (req, res) => {
  try {
    const result = await finalizePlayerAuction(req.params.playerId);

    if (!result) {
      return res.status(400).json({ message: "No active auction for this player" });
    }

    const message =
      result.status === "sold"
        ? `${result.playerName} sold to ${result.soldToTeamName} for ${result.finalPrice}`
        : `${result.playerName} is unsold. No bids were placed.`;

    return res.status(200).json({ message, result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCurrentPlayerInAuction = async (req, res) => {
  try {
    const liveAuction = await findLiveAuction(req.query.tournamentId);

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
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      message: "Current player in live auction",
      player,
      bids,
      auctionId: liveAuction.id,
      endsAt: auctionTimers.get(player.id)?.endsAt || null,
    });
  } catch (error) {
    console.error("Error fetching current player in auction:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
