import {
  getEventClockOffsetMs,
  getTimerDurationSeconds,
  mergeAuctionSnapshotState,
  normalizeDeadlineEvent,
} from "./auctionSynchronization";

const appendUniqueBid = (bids = [], bid) =>
  bids.some(({ id }) => id === bid.id) ? bids : [...bids, bid];

export const applySynchronizedClock = (
  payload,
  setClockOffsetMs,
  fallbackClockOffsetMs = 0
) => {
  const nextOffset = getEventClockOffsetMs(payload, fallbackClockOffsetMs);
  if (payload?.serverTime) setClockOffsetMs(nextOffset);
  return nextOffset;
};

export const applyAuctionSnapshotEvent = (previous, payload) =>
  mergeAuctionSnapshotState(previous, payload);

export const applyFestivalBidEvent = (previous, payload) => {
  if (!previous?.current || previous.current.id !== payload?.festivalAuctionId) {
    return previous;
  }
  const currentBids = previous.current.bids || [];
  const bid = {
    id: payload.id,
    festivalAuctionId: payload.festivalAuctionId,
    festivalParticipantId: payload.festivalParticipantId,
    festivalTeamId: payload.festivalTeamId,
    teamName: payload.teamName,
    amount: payload.amount,
    placedAt: payload.placedAt,
    bidNumber: payload.bidNumber,
  };
  const bids = appendUniqueBid(currentBids, bid);
  const timer = normalizeDeadlineEvent(payload, {
    fallbackDurationSeconds: previous.current.timerDurationSeconds,
  });
  return {
    ...previous,
    current: {
      ...previous.current,
      bids,
      currentBid: payload.currentBid ?? payload.amount,
      nextBid: payload.nextBid ?? previous.current.nextBid,
      incrementAmount:
        payload.incrementAmount ?? previous.current.incrementAmount,
      incrementPercentage:
        payload.incrementPercentage ?? previous.current.incrementPercentage,
      timerDurationSeconds:
        timer.timerDurationSeconds ?? previous.current.timerDurationSeconds,
      leadingTeam: payload.teamName || previous.current.leadingTeam,
      bidCount: payload.bidCount ?? bids.length,
      endsAt: timer.endsAt || previous.current.endsAt,
    },
  };
};

export const applyFestivalParticipantStartedEvent = (previous, payload) => ({
  ...(previous || {}),
  ...(previous?.current && previous.current.id !== payload?.id
    ? { current: previous.current }
    : {
        config: previous?.config
          ? {
              ...previous.config,
              currentParticipantId:
                payload.festivalParticipantId || payload.participant?.id,
            }
          : previous?.config,
        current: payload,
        pool: (previous?.pool || []).filter(
          ({ id }) =>
            id !== (payload.festivalParticipantId || payload.participant?.id)
        ),
      }),
});

export const applyFestivalTimerEvent = (previous, payload) => {
  if (!previous?.current || previous.current.id !== payload?.auctionId) {
    return previous;
  }
  const timer = normalizeDeadlineEvent(payload, {
    fallbackDurationSeconds: previous.current.timerDurationSeconds,
  });
  return {
    ...previous,
    current: {
      ...previous.current,
      status: payload.roundStatus || previous.current.status,
      timerDurationSeconds:
        timer.timerDurationSeconds ?? previous.current.timerDurationSeconds,
      endsAt: timer.endsAt || previous.current.endsAt,
    },
  };
};

export const applySportBidEvent = (previous, payload) => {
  if (!previous?.current || previous.current.id !== payload?.sportAuctionId) {
    return previous;
  }
  const currentBids = previous.current.bids || [];
  const bid = {
    id: payload.id,
    sportAuctionId: payload.sportAuctionId,
    sportTeamId: payload.sportTeamId,
    teamName: payload.teamName,
    amount: payload.amount,
    placedAt: payload.placedAt,
    bidNumber: payload.bidNumber,
  };
  const bids = appendUniqueBid(currentBids, bid);
  const timer = normalizeDeadlineEvent(payload, {
    fallbackDurationSeconds: previous.current.timerDurationSeconds,
  });
  return {
    ...previous,
    current: {
      ...previous.current,
      bids,
      currentCredits: payload.currentCredits ?? payload.amount,
      nextCredits: payload.nextCredits ?? previous.current.nextCredits,
      incrementCredits:
        payload.incrementCredits ?? previous.current.incrementCredits,
      timerDurationSeconds:
        timer.timerDurationSeconds ?? previous.current.timerDurationSeconds,
      leadingTeam: payload.teamName || previous.current.leadingTeam,
      bidCount: payload.bidCount ?? bids.length,
      endsAt: timer.endsAt || previous.current.endsAt,
    },
  };
};

export const applySportParticipantStartedEvent = (previous, payload) => {
  const current = payload?.current;
  if (!current) return previous;
  if (previous?.current && previous.current.id !== current.id) return previous;
  return {
    ...previous,
    config: previous?.config
      ? {
          ...previous.config,
          currentParticipantId: current.festivalParticipantId,
        }
      : previous?.config,
    current,
    pool: (previous?.pool || []).map((entry) =>
      entry.festivalParticipantId === current.festivalParticipantId
        ? { ...entry, isCurrent: true }
        : entry
    ),
  };
};

export const applySportTimerEvent = (previous, payload) => {
  if (!previous?.current || previous.current.id !== payload?.auctionId) {
    return previous;
  }
  const timer = normalizeDeadlineEvent(payload, {
    fallbackDurationSeconds: previous.current.timerDurationSeconds,
  });
  return {
    ...previous,
    current: {
      ...previous.current,
      status: "live",
      timerDurationSeconds:
        timer.timerDurationSeconds ?? previous.current.timerDurationSeconds,
      endsAt: timer.endsAt || previous.current.endsAt,
    },
  };
};

export const getRoundTimerDurationSeconds = (round, fallback = null) =>
  getTimerDurationSeconds(round?.timerDurationSeconds, fallback);
