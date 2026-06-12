import {
  getAuctionBidIncrement,
  getAuctionNextBid,
} from "./auctionIncrementEngine.js";

export const getBidIncrement = (currentBid, tournamentBudget = 0) => {
  return getAuctionBidIncrement({
    currentBid,
    totalBudget: tournamentBudget,
    remainingPurse: tournamentBudget,
    profile: "standard",
  });
};

export const getNextMinimumBid = (currentBid, tournamentBudget = 0) =>
  getAuctionNextBid({
    currentBid,
    totalBudget: tournamentBudget,
    remainingPurse: tournamentBudget,
    profile: "standard",
  });

export const validateBidAmount = ({
  bidAmount,
  currentBid,
  tournamentBudget,
}) => {
  const numericBidAmount = Number(bidAmount);
  const nextMinimumBid = getNextMinimumBid(currentBid, tournamentBudget);

  if (!Number.isFinite(numericBidAmount)) {
    return { valid: false, nextMinimumBid, message: "Bid amount is invalid." };
  }

  if (numericBidAmount < nextMinimumBid) {
    return {
      valid: false,
      nextMinimumBid,
      message: `Bid must be at least ${nextMinimumBid}.`,
    };
  }

  return { valid: true, nextMinimumBid };
};
