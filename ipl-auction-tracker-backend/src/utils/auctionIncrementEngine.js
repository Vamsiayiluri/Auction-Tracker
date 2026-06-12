const roundUp = (amount, nearest) =>
  Math.ceil(Number(amount || 0) / nearest) * nearest;

export const INCREMENT_PROFILES = {
  conservative: { multiplier: 0.75, pursePressure: 0.75 },
  standard: { multiplier: 1, pursePressure: 1 },
  aggressive: { multiplier: 1.5, pursePressure: 1.25 },
};

const baseIncrement = (currentBid) => {
  if (currentBid < 1_000_000) return 25_000;
  if (currentBid < 2_500_000) return 50_000;
  if (currentBid < 5_000_000) return 100_000;
  if (currentBid < 10_000_000) return 200_000;
  return 500_000;
};

export const getAuctionBidIncrement = ({
  currentBid,
  totalBudget = 0,
  remainingPurse = totalBudget,
  basePrice = currentBid,
  auctionStage = 0,
  profile = "standard",
  customRules,
}) => {
  const amount = Number(currentBid || basePrice || 0);
  const budget = Number(totalBudget || 0);
  const remaining = Number(remainingPurse || 0);
  const rules =
    profile === "custom"
      ? {
          multiplier: Number(customRules?.multiplier || 1),
          pursePressure: Number(customRules?.pursePressure || 1),
          minimum: Number(customRules?.minimum || 25_000),
          rounding: Number(customRules?.rounding || 25_000),
        }
      : {
          ...INCREMENT_PROFILES[profile],
          minimum: 25_000,
          rounding: 25_000,
        };

  let multiplier = rules.multiplier;
  const budgetStage = budget > 0 ? amount / budget : 0;
  if (budgetStage >= 0.6) multiplier *= 2;
  else if (budgetStage >= 0.35) multiplier *= 1.5;
  else if (budgetStage >= 0.2) multiplier *= 1.25;

  const purseRatio = budget > 0 ? remaining / budget : 1;
  if (purseRatio < 0.2) multiplier *= 0.75 / rules.pursePressure;
  else if (purseRatio > 0.6) multiplier *= rules.pursePressure;

  if (auctionStage >= 0.75) multiplier *= 1.25;
  else if (auctionStage >= 0.5) multiplier *= 1.1;

  return Math.max(
    rules.minimum,
    roundUp(baseIncrement(amount) * multiplier, rules.rounding)
  );
};

export const getAuctionNextBid = (options) =>
  Number(options.currentBid || options.basePrice || 0) +
  getAuctionBidIncrement(options);
