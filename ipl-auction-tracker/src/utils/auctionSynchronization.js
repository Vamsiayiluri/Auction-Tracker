export const shouldApplyAuctionSnapshot = (lastRevision, payload) =>
  Number(payload?.revision || 0) > Number(lastRevision || 0);

export const mergeAuctionSnapshotState = (previous, payload) => ({
  ...payload.state,
  viewer: previous?.viewer || payload.state?.viewer,
});

export const getServerClockOffsetMs = (serverTime) =>
  serverTime ? new Date(serverTime).getTime() - Date.now() : 0;

export const getAuctionRemainingSeconds = (
  deadlineAt,
  clockOffsetMs = 0,
  now = Date.now(),
  maxSeconds = null
) => {
  if (!deadlineAt) return 0;
  const computed = Math.max(
    0,
    Math.ceil(
      (new Date(deadlineAt).getTime() - (now + clockOffsetMs)) / 1000
    )
  );
  const safeMax = Number(maxSeconds);
  return Number.isFinite(safeMax) && safeMax > 0
    ? Math.min(safeMax, computed)
    : computed;
};

export const getTimerDurationSeconds = (...values) => {
  for (const value of values) {
    const duration = Number(value);
    if (Number.isFinite(duration) && duration > 0) return duration;
  }
  return null;
};

export const getEventClockOffsetMs = (payload, fallbackOffsetMs = 0) =>
  payload?.serverTime ? getServerClockOffsetMs(payload.serverTime) : fallbackOffsetMs;

export const normalizeDeadlineEvent = (
  payload,
  { fallbackDurationSeconds = null, fallbackClockOffsetMs = 0 } = {}
) => ({
  endsAt: payload?.endsAt || payload?.current?.endsAt || null,
  serverTime: payload?.serverTime || null,
  clockOffsetMs: getEventClockOffsetMs(payload, fallbackClockOffsetMs),
  timerDurationSeconds: getTimerDurationSeconds(
    payload?.timerDurationSeconds,
    payload?.current?.timerDurationSeconds,
    fallbackDurationSeconds
  ),
});
