import { randomUUID } from "node:crypto";
import {
  Employee,
  FestivalParticipant,
  SportAuctionPool,
} from "../models/index.js";
import { toEmployeeResponse } from "./employeeResponse.js";
import { getSportTournamentEligibility } from "./sportTournamentEligibility.js";

const participantInclude = {
  model: FestivalParticipant,
  as: "participant",
  required: true,
  include: [{ model: Employee, as: "employee", required: true }],
};

export const toSportAuctionPoolResponse = (entry) => ({
  id: entry.id,
  sportTournamentId: entry.sportTournamentId,
  festivalParticipantId: entry.festivalParticipantId,
  state: entry.state,
  generatedAt: entry.generatedAt,
  reauctionCount: Number(entry.reauctionCount || 0),
  lastReauctionedAt: entry.lastReauctionedAt,
  participant: entry.participant
    ? {
        id: entry.participant.id,
        employee: toEmployeeResponse(entry.participant.employee),
      }
    : undefined,
});

export const getSportAuctionPool = async (
  sportTournamentId,
  transaction
) => {
  const entries = await SportAuctionPool.findAll({
    where: { sportTournamentId },
    include: [participantInclude],
    order: [
      ["state", "ASC"],
      [{ model: FestivalParticipant, as: "participant" }, { model: Employee, as: "employee" }, "name", "ASC"],
    ],
    transaction,
  });

  return {
    sportTournamentId,
    generated: entries.length > 0,
    counts: {
      total: entries.length,
      available: entries.filter(({ state }) => state === "available").length,
      sold: entries.filter(({ state }) => state === "sold").length,
      unsold: entries.filter(({ state }) => state === "unsold").length,
    },
    entries: entries.map(toSportAuctionPoolResponse),
  };
};

export const replaceSportAuctionPool = async ({
  sportTournamentId,
  generatedByUserId,
  transaction,
}) => {
  const eligibility = await getSportTournamentEligibility(
    sportTournamentId,
    transaction
  );
  const generatedAt = new Date();

  await SportAuctionPool.destroy({
    where: { sportTournamentId },
    transaction,
  });
  if (eligibility.availablePoolCount > 0) {
    await SportAuctionPool.bulkCreate(
      eligibility.included
        .filter(({ availableParticipantPool }) => availableParticipantPool)
        .map(({ festivalParticipantId }) => ({
          id: randomUUID(),
          sportTournamentId,
          festivalParticipantId,
          state: "available",
          generatedByUserId,
          generatedAt,
          reauctionCount: 0,
        })),
      { transaction }
    );
  }

  return {
    eligibility,
    pool: await getSportAuctionPool(sportTournamentId, transaction),
  };
};
