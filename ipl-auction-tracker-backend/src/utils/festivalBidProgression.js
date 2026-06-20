export const FESTIVAL_INCREMENT_PERCENTAGES = [10, 15, 20, 25, 30];

export const getFestivalBidProgression = ({
  basePrice,
  currentBid = 0,
  incrementPercentage = 20,
}) => {
  const numericBasePrice = Number(basePrice);
  const numericCurrentBid = Number(currentBid);
  const numericPercentage = Number(incrementPercentage);
  const incrementAmount =
    (numericBasePrice * numericPercentage) / 100;

  return {
    basePrice: numericBasePrice,
    incrementPercentage: numericPercentage,
    incrementAmount,
    currentBid: numericCurrentBid,
    nextBid:
      numericCurrentBid === 0
        ? numericBasePrice
        : numericCurrentBid + incrementAmount,
  };
};
