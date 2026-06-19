# Production Bid Trace

## Scope

Production still feels like bid placement takes about 45 seconds even though local bid placement is fast and the previous bid-latency optimization is deployed.

This change does not optimize the bid path. It adds trace logs only.

## Files Instrumented

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/utils/auctionSynchronization.js`
- `ipl-auction-tracker-backend/src/utils/requestPerformance.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

## Backend Trace Points

All server bid traces now use:

```text
[BID_TRACE]
```

Production logging was enabled by changing `logBidLatencyTrace()` to always emit `[BID_TRACE]`. It was previously suppressed outside development.

### Festival Bid

Instrumented path:

`POST /api/v2/festivals/:festivalId/auction/bid`

Trace phases:

- `bidRequest`: request received
- `validationMs`: validation and eligibility complete
- `dbMs`: bid insert, bid count, and round deadline update complete
- `socketBid`: immediate `bid-placed` and timer socket emit duration
- `httpResponseSent`: HTTP response finish duration
- `publishAuctionStateStarted`: deferred snapshot publish started
- `publishAuctionState`: snapshot loaded and `auction-state` emitted
- `publishAuctionStateFinished`: deferred snapshot publish finished

### Sport Bid

Instrumented path:

`POST /api/v2/sport-tournaments/:sportTournamentId/auction/bid`

Trace phases:

- `bidRequest`: request received
- `validationMs`: tournament, captain, eligibility, current round, expected bid, and budget validation complete
- `dbMs`: bid insert, bid count, and round deadline update complete
- `socketBid`: immediate `sport-bid-placed` socket emit duration
- `httpResponseSent`: HTTP response finish duration
- `publishAuctionStateStarted`: deferred snapshot publish started
- `publishAuctionState`: snapshot loaded and `auction-state` emitted
- `publishAuctionStateFinished`: deferred snapshot publish finished

## Log Fields To Compare

Use these fields to answer the production latency split:

| Question | Log phase / field |
| --- | --- |
| How long until API response? | `phase=httpResponseSent`, `response` |
| How long until immediate bid socket event? | `phase=bidRequest`, `socketBid`, `immediateBidSocketEmittedAt` |
| How long until auction-state snapshot? | `phase=publishAuctionState`, `publishState`, `snapshotMs`, `broadcast` |
| When did publish start? | `phase=publishAuctionStateStarted` |
| When did publish finish? | `phase=publishAuctionStateFinished`, `publishState` |
| How large was the snapshot payload? | `phase=publishAuctionState`, `payloadBytes` |

Example expected server trace sequence:

```text
[BID_TRACE] phase=bidRequest requestReceivedAt=...
[BID_TRACE] phase=bidRequest validationMs=... dbMs=... socketBid=... response=...
[BID_TRACE] phase=httpResponseSent response=...
[BID_TRACE] phase=publishAuctionStateStarted
[BID_TRACE] phase=publishAuctionState snapshotMs=... broadcast=... publishState=...
[BID_TRACE] phase=publishAuctionStateFinished publishState=...
```

## Frontend Audit

### Festival UI

File:

`ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

The Festival UI does not subscribe to the immediate `bid-placed` event.

It listens to:

```js
socket.on("auction-state", applySnapshot);
```

Bid click behavior:

1. `placeBid()` sends `POST /v2/festivals/:festivalId/auction/bid`.
2. After API response, it sets `Bid accepted.`
3. It always calls `await loadAuction({ forceState: true })`.
4. `loadAuction()` fetches:
   - `GET /v2/festivals/:festivalId/auction/current`
   - `GET /v2/festivals/:festivalId/auction/history`
5. It may also receive and apply `auction-state`.

Frontend trace phases added:

- `uiBidRequestStarted`
- `uiBidApiResponseReceived`
- `uiForcedStateReloadFinished`
- `uiAuctionStateApplied`

Conclusion: Festival visible bid state is updated by forced HTTP state reload and/or `auction-state`, not by the immediate `bid-placed` event.

### Sport UI

File:

`ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

The Sport UI does not subscribe to the immediate `sport-bid-placed` event.

It listens to:

```js
socket.on("auction-state", applySnapshot);
```

Bid click behavior:

1. `placeBid()` sends `POST /v2/sport-tournaments/:sportTournamentId/auction/bid`.
2. After API response, it sets `Bid accepted.`
3. If socket is connected, it does not force reload and waits for `auction-state`.
4. If socket is disconnected, it falls back to `load({ background: true, forceState: true })`.

Frontend trace phases added:

- `uiBidRequestStarted`
- `uiBidApiResponseReceived`
- `uiWaitingForAuctionState`
- `uiFallbackStateReloadFinished`
- `uiAuctionStateApplied`

Conclusion: Sport visible bid state is updated by `auction-state` when connected, not by the immediate `sport-bid-placed` event.

## Answers

### 1. How long until API response?

Use production server logs:

```text
[BID_TRACE] phase=httpResponseSent response=<ms>
```

This measures until Express finishes sending the bid response.

### 2. How long until socket bid event?

Use production server logs:

```text
[BID_TRACE] phase=bidRequest socketBid=<ms> immediateBidSocketEmittedAt=<timestamp>
```

For Festival this includes immediate `bid-placed` plus `auction-timer-updated`.

For Sport this includes immediate `sport-bid-placed`.

### 3. How long until auction-state snapshot?

Use production server logs:

```text
[BID_TRACE] phase=publishAuctionState snapshotMs=<ms> broadcast=<ms> publishState=<ms>
```

`snapshotMs` is the full snapshot builder cost. `broadcast` is the `auction-state` socket emit cost. `publishState` is total deferred publish time.

### 4. What event actually updates the UI?

Festival:

- Immediate `bid-placed` does not update the current auction UI.
- UI updates from forced HTTP reload after API response and from `auction-state` snapshots.

Sport:

- Immediate `sport-bid-placed` does not update the current auction UI.
- UI updates from `auction-state` snapshots when socket is connected.
- HTTP reload is only used as a disconnected/error fallback.

### 5. Why production still feels like 45 seconds while local is fast?

The current code can accept a bid quickly but still leave the user waiting for the UI update path.

Most likely production latency buckets to confirm with the new logs:

1. API response is fast, but Festival waits on the forced `GET current` + `GET history` reload after the bid response.
2. API response is fast, but Sport waits for the deferred `auction-state` snapshot.
3. `publishAuctionState` snapshot generation is slow in production due production data size, DB latency, serialization size, or socket broadcast cost.
4. The immediate bid socket event is emitted but not consumed by the current Festival/Sport auction screens, so it does not improve perceived UI update latency.

The new traces separate these cases without changing behavior.

## How To Interpret A 45 Second Production Bid

If `httpResponseSent.response` is near 45 seconds:

- The delay is inside validation, DB write, or synchronous response path.
- Check `validationMs` and `dbMs`.

If `httpResponseSent.response` is fast but `uiForcedStateReloadFinished` is near 45 seconds:

- Festival perceived latency is from the post-bid HTTP reload.

If `httpResponseSent.response` is fast but `publishAuctionState.publishState` or `uiAuctionStateApplied` is near 45 seconds:

- Perceived latency is from snapshot generation, serialization, broadcast, socket delivery, or frontend snapshot application.

If `socketBid` is fast but UI stays stale:

- The immediate bid event is not used by these auction screens to update visible bid state.

## No Optimizations Applied

This task only adds instrumentation and documents the current update paths. No backend query shape, socket protocol, auction rule, or frontend state behavior was changed.
