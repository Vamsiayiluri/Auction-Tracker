export const FESTIVAL_AUCTION_DURATION_MS = 30_000;

export const createFestivalAuctionDeadline = (
  now = Date.now(),
  durationMs = FESTIVAL_AUCTION_DURATION_MS
) => new Date(Number(now) + Number(durationMs));

export const getFestivalAuctionRemainingMs = (endsAt, now = Date.now()) =>
  endsAt
    ? Math.max(0, new Date(endsAt).getTime() - Number(now))
    : 0;
