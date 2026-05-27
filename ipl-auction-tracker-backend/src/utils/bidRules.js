const roundToNearest = (amount, nearest) =>
  Math.ceil(Number(amount || 0) / nearest) * nearest;

export const getBidIncrement = (currentBid, tournamentBudget = 0) => {
  const amount = Number(currentBid || 0);
  const budget = Number(tournamentBudget || 0);

  let increment;
  if (amount < 1_000_000) increment = 25_000;
  else if (amount < 2_500_000) increment = 50_000;
  else if (amount < 5_000_000) increment = 100_000;
  else if (amount < 10_000_000) increment = 200_000;
  else increment = 500_000;

  if (budget > 0) {
    const stage = amount / budget;
    if (stage >= 0.6) increment *= 2;
    else if (stage >= 0.35) increment *= 1.5;
    else if (stage >= 0.2) increment *= 1.25;
  }

  return roundToNearest(increment, 25_000);
};

export const getNextMinimumBid = (currentBid, tournamentBudget = 0) =>
  Number(currentBid || 0) + getBidIncrement(currentBid, tournamentBudget);

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
