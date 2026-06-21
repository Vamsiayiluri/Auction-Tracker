# Live Auction Sync Refactor Implementation

Date: 2026-06-20

## Summary

Implemented a shared live-auction synchronization model for Festival and Sport auctions. Deadline-changing direct socket events now carry a standard timer contract, and both auction arenas apply direct events through shared event application functions before reconciling with `auction-state`.

The refactor preserves:

- Existing auction rules
- Immediate bid UI updates
- `auction-state` snapshot reconciliation
- Server-owned `endsAt` deadlines
- Festival 30-second timer behavior
- Sport configured timer behavior

## Architecture Decisions

### Single Deadline Contract

Every direct event that changes or refreshes a live auction deadline now carries:

```ts
{
  endsAt,
  timerDurationSeconds,
  serverTime
}
```

This is now true for:

- Festival `participant-started`
- Festival `bid-placed`
- Festival `auction-timer-updated`
- Festival `auction-extended`
- Festival `auction-resumed`
- Festival `auction-state`
- Sport `sport-participant-started`
- Sport `sport-bid-placed`
- Sport `sport-auction-extended`
- Sport `sport-auction-resumed`
- Sport `auction-state`

### Server Remains Source Of Truth

No client-generated deadlines were added. Clients still derive countdown from server `endsAt`.

Direct events provide responsive UI updates. `auction-state` remains the authoritative reconciliation snapshot.

### Shared Frontend Sync Layer

Added `src/utils/liveAuctionEventApplication.js` for pure event application:

- `applyFestivalBidEvent`
- `applyFestivalParticipantStartedEvent`
- `applyFestivalTimerEvent`
- `applySportBidEvent`
- `applySportParticipantStartedEvent`
- `applySportTimerEvent`
- `applyAuctionSnapshotEvent`
- `applySynchronizedClock`
- `getRoundTimerDurationSeconds`

Updated `src/utils/auctionSynchronization.js` with timer-safe primitives:

- `getAuctionRemainingSeconds(..., maxSeconds)`
- `getTimerDurationSeconds`
- `getEventClockOffsetMs`
- `normalizeDeadlineEvent`

## Files Modified

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker/src/utils/auctionSynchronization.js`
- `ipl-auction-tracker/src/utils/liveAuctionEventApplication.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`
- `ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx`
- `ipl-auction-tracker/src/components/SportAuctionArena/SportParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

## Before Flow

```text
Server creates endsAt
Direct event emits endsAt without serverTime
Client applies endsAt with old or zero clockOffsetMs
Math.ceil can display 32 or 31
auction-state later arrives with serverTime
Client corrects timer
```

## After Flow

```text
Server creates endsAt
Direct event emits endsAt + timerDurationSeconds + serverTime
Client updates clock offset from the same event
Client applies deadline through shared event function
Timer utility caps display to configured duration
auction-state later reconciles by revision
```

## Reconciliation Rules

Direct events win temporarily when:

- They match the active auction/round id.
- They match the current Festival/Sport scope.
- They carry a newer responsive change before snapshot generation completes.

Snapshots win permanently when:

- `auction-state.revision > lastRevision`.
- Scope type and scope id match.
- Snapshot reconciliation overwrites direct-event state.

Stale snapshots are rejected by existing revision checks.

Stale direct events are rejected by:

- Scope id checks.
- Active auction/round id checks.
- Duplicate bid id checks.

## Timer Guarantees

Festival:

- Countdown derives from server `endsAt`.
- Countdown is capped to `timerDurationSeconds`, currently 30.
- Countdown cannot display below 0.
- Ring and number use the same capped value.

Sport:

- Countdown derives from server `endsAt`.
- Countdown is capped to configured `timerDurationSeconds`.
- Default remains 20 unless config says otherwise.
- Ring and number use the same capped value.

## Performance Impact

Expected impact:

- No additional API calls.
- No forced reloads added.
- No new polling.
- No duplicate timer intervals.
- No extra socket subscriptions after clock offset changes; handlers use a ref for current clock offset.

Small added cost:

- A few pure object merges per direct event.
- A constant-time cap in `getAuctionRemainingSeconds`.

Net UX impact:

- Direct start, bid, extension, and resume events can update timers before expensive snapshots complete.
- Timer no longer waits for `auction-state` to correct overshoot.

## Risks

- Direct finalization events (`participant-sold`, `participant-unsold`, Sport equivalents) still rely primarily on snapshot reconciliation and existing action responses. This was not part of the deadline-change contract.
- Legacy IPL auction components still use `VisualTimer` default behavior. The shared component now caps display to its configured/default duration, but old labels like `Extend 20 Seconds` remain legacy-specific.
- Normal `npm run build` could not clean the existing `dist` folder because of an `EPERM` unlink failure on a locked asset. A build to a fresh output directory succeeded.

## Event Contract Violations Fixed

Previously missing `serverTime` and/or `timerDurationSeconds`:

- Festival `participant-started`
- Festival `bid-placed`
- Festival `auction-timer-updated`
- Festival `auction-extended`
- Festival `auction-resumed`
- Sport `sport-participant-started`
- Sport `sport-bid-placed`
- Sport `sport-auction-extended`
- Sport `sport-auction-resumed`

All are now standardized.
