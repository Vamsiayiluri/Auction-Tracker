import {
  Player,
  Bid,
  Auction,
  Tournament,
  TournamentTeam,
} from "../models/index.js";
import { io } from "../index.js";
import { Op } from "sequelize";
import sequelizeDb from "../config/dbconfig.js";
import { getNextMinimumBid } from "../utils/bidRules.js";

const AUCTION_DURATION_MS = 20_000;
const AUCTION_STATUS = {
  LIVE: "live",
  PENDING: "pending",
  COMPLETED: "completed",
};
const auctionTimers = new Map();
const tournamentRoom = (tournamentId) => `tournament:${tournamentId}`;

const clearAuctionTimer = (playerId) => {
  const activeTimer = auctionTimers.get(playerId);
  if (activeTimer) {
    clearTimeout(activeTimer.timer);
    auctionTimers.delete(playerId);
  }
};

const getAuctionDeadline = (auction) =>
  auction?.endsAt ? new Date(auction.endsAt) : null;

const emitToTournament = (tournamentId, event, payload) => {
  io.to(tournamentRoom(tournamentId)).emit(event, payload);
};

const getHighestBid = (playerId, tournamentId) =>
  Bid.findOne({
    where: { playerId, tournamentId },
    order: [["bidAmount", "DESC"]],
  });

const getAuctionBidState = async (player) => {
  const highestBid = await getHighestBid(player.id, player.tournamentId);
  const tournament = player.tournamentId
    ? await Tournament.findByPk(player.tournamentId)
    : null;
  const currentBid = highestBid?.bidAmount || player.basePrice;

  return {
    highestBid,
    currentBid,
    nextMinimumBid: getNextMinimumBid(currentBid, tournament?.budget),
  };
};

const formatResult = (player, highestBid, outcome = "highest") => ({
  tournamentId: player.tournamentId,
  playerId: player.id,
  playerName: player.name,
  status: outcome === "highest" && highestBid ? "sold" : "unsold",
  soldToTeamId: outcome === "highest" ? highestBid?.teamId || null : null,
  soldToTeamName: outcome === "highest" ? highestBid?.teamName || null : null,
  finalPrice: outcome === "highest" ? highestBid?.bidAmount || null : null,
});

const findActiveAuction = async (tournamentId) => {
  const where = {
    status: { [Op.in]: [AUCTION_STATUS.LIVE, AUCTION_STATUS.PENDING] },
  };
  if (tournamentId) where.tournamentId = tournamentId;

  return Auction.findOne({
    where,
    include: [{ model: Player, as: "currentPlayer" }],
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
      { status: AUCTION_STATUS.COMPLETED },
      { where: { id: tournamentId } }
    );
    emitToTournament(tournamentId, "tournament-completed", { tournamentId });
  }
};

const markAuctionPendingFinalization = async (playerId) => {
  const player = await Player.findByPk(playerId);
  if (!player || !player.isInAuction) return null;

  const [updatedCount] = await Auction.update(
    { status: AUCTION_STATUS.PENDING },
    {
      where: {
        currentPlayerId: playerId,
        tournamentId: player.tournamentId,
        status: AUCTION_STATUS.LIVE,
      },
    }
  );

  if (!updatedCount) return null;

  clearAuctionTimer(playerId);
  const { highestBid, currentBid, nextMinimumBid } =
    await getAuctionBidState(player);
  const payload = {
    tournamentId: player.tournamentId,
    playerId: player.id,
    playerName: player.name,
    highestBid: currentBid,
    highestBidder: highestBid?.teamName || "",
    nextMinimumBid,
  };

  emitToTournament(player.tournamentId, "auction-pending-finalization", payload);
  return payload;
};

const finalizePlayerAuctionWithOutcome = async (playerId, outcome) => {
  const result = await sequelizeDb.transaction(async (transaction) => {
    const player = await Player.findByPk(playerId, { transaction });
    if (!player || !player.isInAuction) return null;

    const activeAuction = await Auction.findOne({
      where: {
        currentPlayerId: playerId,
        tournamentId: player.tournamentId,
        status: { [Op.in]: [AUCTION_STATUS.LIVE, AUCTION_STATUS.PENDING] },
      },
      transaction,
      lock: true,
    });

    if (!activeAuction || activeAuction.status !== AUCTION_STATUS.PENDING) {
      return null;
    }

    const highestBid = await Bid.findOne({
      where: { playerId, tournamentId: player.tournamentId },
      order: [["bidAmount", "DESC"]],
      transaction,
    });
    if (outcome === "highest" && !highestBid) return null;
    if (outcome === "unsold" && highestBid) {
      const error = new Error(
        "Player cannot be marked unsold after a valid bid"
      );
      error.statusCode = 409;
      throw error;
    }

    if (outcome === "highest" && highestBid) {
      const winningTournamentTeam = await TournamentTeam.findOne({
        where: { tournamentId: player.tournamentId, teamId: highestBid.teamId },
        transaction,
        lock: true,
      });
      if (!winningTournamentTeam) return null;

      const amountLeft =
        Number(winningTournamentTeam.totalAmount || 0) -
        Number(winningTournamentTeam.amountSpent || 0);

      if (highestBid.bidAmount > amountLeft) return null;

      player.isSold = true;
      player.soldPrice = highestBid.bidAmount;
      player.teamId = highestBid.teamId;
      winningTournamentTeam.amountSpent += highestBid.bidAmount;
      await winningTournamentTeam.save({ transaction });
    } else {
      player.isSold = false;
      player.soldPrice = null;
      player.teamId = null;
    }

    player.isInAuction = false;
    await player.save({ transaction });
    await activeAuction.update(
      { status: AUCTION_STATUS.COMPLETED },
      { transaction }
    );

    return formatResult(player, highestBid, outcome);
  });

  if (!result) return null;

  clearAuctionTimer(playerId);
  await updateTournamentIfFinished(result.tournamentId);

  const eventName = result.status === "sold" ? "player-sold" : "player-unsold";
  emitToTournament(result.tournamentId, eventName, result);
  emitToTournament(result.tournamentId, "auction-finalized", result);
  return result;
};

const scheduleAuctionEnd = (playerId, endsAt) => {
  clearAuctionTimer(playerId);

  const deadline = new Date(endsAt);
  const remainingTime = Math.max(0, deadline.getTime() - Date.now());
  const timer = setTimeout(async () => {
    try {
      const activeTimer = auctionTimers.get(playerId);
      if (
        !activeTimer ||
        new Date(activeTimer.endsAt).getTime() !== deadline.getTime()
      ) {
        return;
      }

      await markAuctionPendingFinalization(playerId);
    } catch (error) {
      console.error("Error locking timed auction:", error.message);
    }
  }, remainingTime);

  auctionTimers.set(playerId, { timer, endsAt: deadline });
};

export const resetAuctionTimer = async (playerId) => {
  const player = await Player.findByPk(playerId);
  if (!player?.isInAuction) return null;

  const endsAt = new Date(Date.now() + AUCTION_DURATION_MS);
  const [updatedCount] = await Auction.update(
    { status: AUCTION_STATUS.LIVE, endsAt },
    {
      where: {
        currentPlayerId: playerId,
        tournamentId: player.tournamentId,
        status: { [Op.in]: [AUCTION_STATUS.LIVE, AUCTION_STATUS.PENDING] },
      },
    }
  );

  if (!updatedCount) return null;

  scheduleAuctionEnd(playerId, endsAt);
  const { currentBid, nextMinimumBid, highestBid } =
    await getAuctionBidState(player);
  const payload = {
    playerId,
    tournamentId: player.tournamentId,
    endsAt,
    auctionStatus: "live",
    highestBid: currentBid,
    highestBidder: highestBid?.teamName || "",
    nextMinimumBid,
  };
  emitToTournament(player.tournamentId, "auction-timer-updated", payload);
  emitToTournament(player.tournamentId, "auction-extended", payload);
  return endsAt;
};

export const isBiddingOpen = async (playerId) => {
  const player = await Player.findByPk(playerId);
  if (!player?.isInAuction) return false;

  const liveAuction = await Auction.findOne({
    where: {
      currentPlayerId: playerId,
      tournamentId: player?.tournamentId,
      status: AUCTION_STATUS.LIVE,
    },
  });
  const deadline = getAuctionDeadline(liveAuction);

  return Boolean(
    liveAuction &&
      deadline &&
      new Date(deadline).getTime() > Date.now()
  );
};

export const restoreAuctionTimers = async () => {
  const liveAuctions = await Auction.findAll({
    where: { status: AUCTION_STATUS.LIVE },
  });

  await Promise.all(
    liveAuctions.map(async (auction) => {
      const player = auction.currentPlayerId
        ? await Player.findByPk(auction.currentPlayerId)
        : null;

      if (!player?.isInAuction) {
        await auction.update({ status: AUCTION_STATUS.COMPLETED });
        return;
      }

      const endsAt = getAuctionDeadline(auction);
      if (!endsAt || endsAt.getTime() <= Date.now()) {
        await markAuctionPendingFinalization(player.id);
        return;
      }

      scheduleAuctionEnd(player.id, endsAt);
    })
  );
};

export const startAuction = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { auctionId, tournamentId } = req.body;
    const outcome = await sequelizeDb.transaction(async (transaction) => {
      const player = await Player.findByPk(playerId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!player) return { status: 404, message: "Player not found" };
      if (!player.tournamentId) {
        return {
          status: 400,
          message: "Player must belong to a tournament",
        };
      }

      const tournament = await Tournament.findByPk(player.tournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!tournament) return { status: 404, message: "Tournament not found" };
      if (tournament.status === "completed") {
        return { status: 400, message: "Tournament is already completed" };
      }
      if (tournamentId && player.tournamentId !== tournamentId) {
        return {
          status: 400,
          message: "Player does not belong to this tournament",
        };
      }
      if (player.isSold || player.auctionId || player.isInAuction) {
        return {
          status: 409,
          message: "This player has already started or completed an auction round",
        };
      }

      const participatingTeamCount = await TournamentTeam.count({
        where: { tournamentId: player.tournamentId },
        transaction,
      });
      if (!participatingTeamCount) {
        return {
          status: 400,
          message: "Tournament has no participating teams configured",
        };
      }

      const activeAuction = await Auction.findOne({
        where: {
          tournamentId: player.tournamentId,
          status: { [Op.in]: [AUCTION_STATUS.LIVE, AUCTION_STATUS.PENDING] },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (activeAuction) {
        const activePlayer = activeAuction.currentPlayerId
          ? await Player.findByPk(activeAuction.currentPlayerId, { transaction })
          : null;
        return {
          status: 409,
          message: `Auction is already running for ${
            activePlayer?.name || "another player"
          }`,
        };
      }

      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + AUCTION_DURATION_MS);
      player.isInAuction = true;
      player.auctionId = auctionId;
      await player.save({ transaction });
      await Auction.create(
        {
          id: auctionId,
          currentPlayerId: player.id,
          tournamentId: player.tournamentId,
          status: AUCTION_STATUS.LIVE,
          startedAt,
          endsAt,
        },
        { transaction }
      );
      await tournament.update(
        { status: AUCTION_STATUS.LIVE },
        { transaction }
      );

      return {
        player: player.toJSON(),
        tournamentBudget: tournament.budget,
        endsAt,
      };
    });

    if (outcome.status) {
      return res.status(outcome.status).json({ message: outcome.message });
    }

    const { player, tournamentBudget, endsAt } = outcome;
    scheduleAuctionEnd(player.id, endsAt);
    const nextMinimumBid = getNextMinimumBid(
      player.basePrice,
      tournamentBudget
    );
    emitToTournament(player.tournamentId, "auction-started", {
      id: player.id,
      tournamentId: player.tournamentId,
      name: player.name,
      sportId: player.sportId,
      role: player.role,
      basePrice: player.basePrice,
      endsAt,
      auctionStatus: "live",
      highestBid: player.basePrice,
      highestBidder: "",
      nextMinimumBid,
    });

    return res
      .status(200)
      .json({ message: `Auction started for ${player.name}` });
  } catch (error) {
    console.error("Error starting auction:", error);
    return res.status(500).json({ message: "Unable to start auction" });
  }
};

export const stopAuction = async (req, res) => {
  try {
    const result = await markAuctionPendingFinalization(req.params.playerId);

    if (!result) {
      return res.status(400).json({ message: "No active auction for this player" });
    }

    return res.status(200).json({
      message: "Bidding locked. Auction is pending admin finalization.",
      result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const extendAuction = async (req, res) => {
  try {
    const player = await Player.findByPk(req.params.playerId);
    if (!player?.isInAuction) {
      return res.status(400).json({ message: "No active auction to extend" });
    }

    const pendingAuction = await Auction.findOne({
      where: {
        currentPlayerId: player.id,
        tournamentId: player.tournamentId,
        status: AUCTION_STATUS.PENDING,
      },
    });
    if (!pendingAuction) {
      return res
        .status(400)
        .json({ message: "Auction can only be extended after timer expiry" });
    }

    const endsAt = await resetAuctionTimer(req.params.playerId);
    if (!endsAt) {
      return res.status(400).json({ message: "No active auction to extend" });
    }

    return res.status(200).json({ message: "Auction extended", endsAt });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const sellPlayer = async (req, res) => {
  try {
    const result = await finalizePlayerAuctionWithOutcome(
      req.params.playerId,
      "highest"
    );

    if (!result) {
      return res
        .status(400)
        .json({ message: "Player cannot be sold without an active highest bid" });
    }

    return res.status(200).json({ message: "Player sold", result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markUnsold = async (req, res) => {
  try {
    const result = await finalizePlayerAuctionWithOutcome(
      req.params.playerId,
      "unsold"
    );

    if (!result) {
      return res.status(400).json({ message: "No active auction for this player" });
    }

    return res.status(200).json({ message: "Player marked unsold", result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Unable to mark player unsold" });
  }
};

export const getCurrentPlayerInAuction = async (req, res) => {
  try {
    const liveAuction = await findActiveAuction(req.query.tournamentId);

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
      where: { playerId: player.id, tournamentId: player.tournamentId },
      order: [["createdAt", "DESC"]],
    });
    const { highestBid, currentBid, nextMinimumBid } =
      await getAuctionBidState(player);

    return res.json({
      message: "Current player in live auction",
      player,
      bids,
      auctionId: liveAuction.id,
      auctionStatus: liveAuction.status,
      highestBid: currentBid,
      highestBidder: highestBid?.teamName || "",
      nextMinimumBid,
      endsAt: liveAuction.endsAt || null,
    });
  } catch (error) {
    console.error("Error fetching current player in auction:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
