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
  now = Date.now()
) =>
  deadlineAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deadlineAt).getTime() - (now + clockOffsetMs)) / 1000
        )
      )
    : 0;
