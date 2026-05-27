export const getNextBidAmount = (currentBid) => {
  const amount = Number(currentBid) || 0;
  if (amount < 1000000) return amount + 25000;
  if (amount < 2500000) return amount + 50000;
  if (amount < 5000000) return amount + 100000;
  if (amount < 10000000) return amount + 200000;
  return amount + 500000;
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

export const getRemainingSeconds = (endsAt) => {
  if (!endsAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)
  );
};
