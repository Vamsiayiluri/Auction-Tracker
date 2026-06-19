# Bid UI Responsiveness And Timer Fairness Implementation

## Files Modified

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`
- `ipl-auction-tracker-backend/src/utils/festivalAuctionTimer.js`
- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

## Immediate Bid UI Updates

### Festival

`MainFestivalAuction.jsx` now subscribes to:

```js
socket.on("bid-placed", applyBidPlaced);
```

When `bid-placed` is received for the active round, the UI immediately updates:

- `current.currentBid`
- `current.nextBid`
- `current.leadingTeam`
- `current.bidCount`
- `current.endsAt`
- `current.bids`

Duplicate bid entries are prevented by checking the bid id before appending to `current.bids`.

The Festival bid success path no longer waits for `loadAuction({ forceState: true })` while the socket is connected. It only falls back to reload when the socket is disconnected or when the bid request fails.

### Sport

`SportAuctionArena.jsx` now subscribes to:

```js
socket.on("sport-bid-placed", applyBidPlaced);
```

When `sport-bid-placed` is received for the active round, the UI immediately updates:

- `current.currentCredits`
- `current.nextCredits`
- `current.leadingTeam`
- `current.bidCount`
- `current.endsAt`
- `current.bids`

Duplicate bid entries are prevented by checking the bid id before appending to `current.bids`.

Sport already avoided forced reloads when sockets were connected; it now applies the immediate bid event before waiting for the later `auction-state` snapshot.

## Snapshot Reconciliation

Both auction screens still listen to:

```js
socket.on("auction-state", applySnapshot);
```

`auction-state` remains the source of truth. Immediate bid updates are local responsiveness updates only. When the snapshot arrives, `mergeAuctionSnapshotState()` reconciles and overwrites stale local values.

## BID_UI_TRACE

Added frontend-only trace logs:

```text
[BID_UI_TRACE]
```

Festival phases:

- `bidRequestStarted`
- `apiResponseReceived`
- `bidPlacedReceived`
- `uiUpdated`
- `auctionStateReceived`
- `snapshotReconciliationComplete`
- `fallbackStateReloadFinished`

Sport phases:

- `bidRequestStarted`
- `apiResponseReceived`
- `sportBidPlacedReceived`
- `uiUpdated`
- `waitingForAuctionState`
- `auctionStateReceived`
- `snapshotReconciliationComplete`
- `fallbackStateReloadFinished`

These traces measure perceived UI latency separately from backend `[BID_TRACE]`.

## Festival Timer Changes

Changed:

```js
FESTIVAL_AUCTION_DURATION_MS = 20_000;
```

to:

```js
FESTIVAL_AUCTION_DURATION_MS = 30_000;
```

This applies consistently to Festival:

- round start
- bid timer reset
- extend action
- pause/resume fallback duration
- persisted `endsAt`
- server recovery scheduling
- countdown display

The Festival extend button text now says `Extend 30 Seconds`.

Sport timers were not changed.

## Timer Lifecycle

### Previous Festival Start Round Lifecycle

1. Admin starts participant round.
2. Backend opens transaction.
3. Backend validates config, participant, pool, membership, and attempts.
4. Backend creates `FestivalAuction` with `status: "live"` and `endsAt = now + 20s`.
5. Backend updates current participant pointer.
6. Transaction commits.
7. Backend loads auction response.
8. Backend schedules expiry timer.
9. Backend emits `participant-started`.
10. Backend publishes `auction-state`.

Countdown time could be lost between `endsAt` creation and client notification because the deadline was stamped before transaction completion, response loading, socket emission, and snapshot publication.

### New Festival Start Round Lifecycle

1. Admin starts participant round.
2. Backend opens transaction.
3. Backend validates config, participant, pool, membership, and attempts.
4. Backend creates `FestivalAuction` with `status: "live"` and `endsAt = null`.
5. Backend updates current participant pointer.
6. Transaction commits.
7. Backend stamps `endsAt = now + 30s`.
8. Backend loads auction response.
9. Backend schedules expiry timer.
10. Backend emits `participant-started`.
11. Backend publishes `auction-state`.

Countdown now starts after the round row and current participant pointer are initialized, immediately before clients are notified.

## Before vs After Behavior

Before:

- Backend emitted immediate bid socket events quickly.
- Festival and Sport auction screens did not consume those events.
- Festival waited on post-bid forced reload.
- Sport waited on `auction-state`.
- Users perceived production bids as taking 5-6 seconds.
- Festival round timer was 20 seconds.
- Start-round countdown began before the round was fully initialized and emitted.

After:

- Festival applies `bid-placed` immediately.
- Sport applies `sport-bid-placed` immediately.
- Festival no longer blocks successful connected bids on forced reload.
- `auction-state` still reconciles final state.
- Festival round timer is 30 seconds.
- Festival start-round countdown is stamped after initialization.

## Measured UI Latency Improvements

Production traces before this change showed:

- API response: about 2.5-3.0s
- `publishAuctionState`: about 3.3s
- snapshot payload: about 73-74 KB
- immediate socket broadcast: negligible

Expected visible bid latency after this change is tied to immediate bid socket delivery plus React state application, not snapshot generation or forced reload completion.

Use `[BID_UI_TRACE]`:

- `bidPlacedReceived` / `sportBidPlacedReceived`
- `uiUpdated`

to measure actual production perceived latency.

## Remaining Risks

- If the socket is disconnected, Festival and Sport still fall back to HTTP reloads.
- If an immediate bid event is dropped, the later `auction-state` snapshot still reconciles state.
- The Festival bid timer reset still stamps `endsAt` inside the bid transaction; this preserves atomicity but may lose a small amount of time equal to the final DB update/commit path.
- Validation remains a synchronous bottleneck and is documented separately in `VALIDATION_HOT_PATH_AUDIT.md`.
