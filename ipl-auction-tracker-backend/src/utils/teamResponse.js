import { toSafeUserResponse } from "./userResponse.js";

export const toPlayerReportResponse = (player) => {
  const plain = player.toJSON ? player.toJSON() : player;

  return {
    id: plain.id,
    name: plain.name,
    basePrice: plain.basePrice,
    soldPrice: plain.soldPrice,
    role: plain.role,
    isSold: plain.isSold,
    teamId: plain.teamId,
    tournamentId: plain.tournamentId,
    sportId: plain.sportId,
  };
};

export const toTeamResponse = (team, { includeOwner = false } = {}) => {
  const plain = team.toJSON ? team.toJSON() : team;
  const response = {
    id: plain.id,
    name: plain.name,
    ownerId: plain.ownerId,
    tournamentId: plain.tournamentId,
    totalAmount: plain.totalAmount,
    amountSpent: plain.amountSpent,
    amountLeft:
      plain.amountLeft ??
      Number(plain.totalAmount || 0) - Number(plain.amountSpent || 0),
  };

  if (includeOwner && plain.owner) {
    response.owner = toSafeUserResponse(plain.owner);
  }

  return response;
};

export const toPublicTeamResponse = (team) => {
  const plain = team.toJSON ? team.toJSON() : team;

  return {
    id: plain.id,
    name: plain.name,
    tournamentId: plain.tournamentId,
    totalAmount: plain.totalAmount,
    amountSpent: plain.amountSpent,
    amountLeft:
      plain.amountLeft ??
      Number(plain.totalAmount || 0) - Number(plain.amountSpent || 0),
  };
};

