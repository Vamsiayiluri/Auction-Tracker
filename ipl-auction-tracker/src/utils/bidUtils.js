// utils/bidUtils.js
export const getNextBidAmount = (currentBid) => {
  if (currentBid < 10000000) return currentBid + 500000;
  if (currentBid < 40000000) return currentBid + 1000000;
  return currentBid + 2500000;
};
