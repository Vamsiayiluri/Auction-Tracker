export const calculateFestivalTeamBudget = ({
  totalBudget,
  ownerCost = 0,
  retentionAmounts = [],
  auctionAmounts = [],
}) => {
  const normalizedTotal = Number(totalBudget || 0);
  const normalizedOwnerCost = Number(ownerCost || 0);
  const retentionSpent = retentionAmounts.reduce(
    (total, amount) => total + Number(amount || 0),
    0
  );
  const spentBudget = normalizedOwnerCost + retentionSpent;
  const auctionSpent = auctionAmounts.reduce(
    (total, amount) => total + Number(amount || 0),
    0
  );
  const totalSpentBudget = spentBudget + auctionSpent;

  return {
    totalBudget: normalizedTotal,
    ownerCost: normalizedOwnerCost,
    retentionSpent,
    auctionSpent,
    spentBudget: totalSpentBudget,
    remainingBudget: normalizedTotal - totalSpentBudget,
  };
};
