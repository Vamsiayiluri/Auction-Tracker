# Timer Sync Root Cause Analysis

Date: 2026-06-20

Scope: Festival live auction timer only. This is an audit and diagnosis document; no fixes were implemented.

## Exact Root Cause

The timer overshoot is caused by applying a fresh server-generated `endsAt` value against a client clock offset that is not guaranteed to belong to that event, combined with an uncapped `Math.ceil` display calculation.

The critical mismatch:

- `auction-state` payloads include both `endsAt` and `serverTime`.
- `GET /auction/current` responses include both `endsAt` and `serverTime`.
- Immediate `bid-placed` payloads include `endsAt` but do not include `serverTime`.
- `auction-timer-updated` payloads include `endsAt` but do not include `serverTime`.
- `participant-started` payloads include `endsAt` through `toAuction()`, but do not include `serverTime`.
- `getAuctionRemainingSeconds()` uses `deadlineAt - (Date.now() + clockOffsetMs)` and then `Math.ceil(...)`.
- `clockOffsetMs` is initialized to `0` and later updated only from HTTP current-state responses, room join acknowledgements, or `auction-state` snapshots.

That means a client can receive a new server deadline and compute it with a stale or zero offset. If the client clock is behind the server by 1.2 seconds and the offset is stale/zero, a true 30-second deadline displays as:

```text
remainingMs = serverEndsAt - clientNow
remainingMs = 30,000ms + 1,200ms
Math.ceil(31,200 / 1000) = 32
```

If the skew is smaller, the same issue displays:

```text
30.1s -> Math.ceil(...) = 31
```

This matches the observed `32 -> 31 -> 30` and `31 -> 30` sequences. The later `auction-state` snapshot includes `serverTime`, recalculates `clockOffsetMs`, and the timer snaps back into the correct range.

## Affected Files

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`
- `ipl-auction-tracker/src/utils/auctionSynchronization.js`
- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/utils/auctionSynchronization.js`
- `ipl-auction-tracker-backend/src/utils/festivalAuctionTimer.js`

## Detailed Findings

### F-01 - Immediate bid event carries `endsAt` without `serverTime`

Severity: High

File: `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Relevant flow:

- `placeFestivalAuctionBid()` creates a new `endsAt` with `createFestivalAuctionDeadline()`.
- It emits `bid-placed` with `endsAt` and `timerDurationSeconds`.
- It emits `auction-timer-updated` with `endsAt`.
- Neither payload includes `serverTime`.

Frontend path:

- `MainFestivalAuction.jsx` receives `bid-placed`.
- `applyImmediateFestivalBid()` updates `state.current.endsAt`.
- The timer effect recalculates with the existing `clockOffsetMs`.

Impact:

- If `clockOffsetMs` is stale or still `0`, the new 30-second server deadline can render as 31 or 32 seconds.

### F-02 - `auction-timer-updated` currently has the same timestamp gap

Severity: High once direct timer handlers are added

File: `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Current state:

- `MainFestivalAuction.jsx` does not currently listen to `auction-timer-updated`.
- The backend already emits this event after bid placement.
- The event payload has `endsAt` but no `serverTime` or `timerDurationSeconds`.

Impact:

- If a future direct handler consumes this event without adding `serverTime`, it will reproduce the same overshoot bug.

### F-03 - `participant-started` carries an initialized deadline but no paired timestamp

Severity: High once direct participant-started handling is added

File: `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Current state:

- `startFestivalAuctionParticipant()` creates the auction with `endsAt: null`.
- After the transaction, it creates `endsAt = createFestivalAuctionDeadline()`.
- It updates the auction, loads the auction response, and emits `participant-started`.
- The emitted payload includes `endsAt` and `timerDurationSeconds` through `toAuction()`, but no `serverTime`.

Impact:

- The previous audit found that `MainFestivalAuction.jsx` does not yet listen to `participant-started`.
- When that direct listener is added, it must not apply `endsAt` without a paired server timestamp or duration clamp.

### F-04 - Snapshot reconciliation uses the correct data pair

Severity: None

Files:

- `ipl-auction-tracker-backend/src/utils/auctionSynchronization.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

Verified:

- Backend snapshot payload includes top-level `serverTime`.
- Snapshot state also receives `state.serverTime`.
- `MainFestivalAuction.jsx` calls `setClockOffsetMs(getServerClockOffsetMs(payload.serverTime))` before applying snapshot state.
- Snapshot reconciliation is not the source of overshoot; it is the mechanism that corrects overshoot.

### F-05 - `Math.ceil` allows a one-second overshoot from tiny positive drift

Severity: Medium

File: `ipl-auction-tracker/src/utils/auctionSynchronization.js`

Current code:

```js
Math.ceil((new Date(deadlineAt).getTime() - (now + clockOffsetMs)) / 1000)
```

Impact:

- Even a 1ms computed value above 30 seconds displays as 31.
- This can happen from clock-offset estimation error, network asymmetry, or applying a deadline before its exact paired `serverTime`.
- `Math.ceil` is useful near expiry because it avoids showing `0` while milliseconds remain, but it needs a max-duration cap for newly reset timers.

### F-06 - `VisualTimer` caps ring progress but not displayed seconds

Severity: Medium

File: `ipl-auction-tracker/src/components/VisualTimer.jsx`

Current code:

```js
const safeTime = Math.max(0, Number(timeLeft) || 0);
const safeDuration = Math.max(1, Number(duration) || 20);
const progress = Math.min(100, (safeTime / safeDuration) * 100);
```

Impact:

- The ring never exceeds 100% because progress is capped.
- The displayed number can still show `31` or `32` because `safeTime` is not capped to `safeDuration`.

### F-07 - No client-generated Festival deadlines found in the audited main arena

Severity: None

Files:

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

Verified:

- The main Festival arena does not calculate `Date.now() + duration` for display deadlines.
- It derives `timeLeft` from `state.current.endsAt`.
- The issue is not client-generated deadlines; it is applying server deadlines with unpaired or stale clock synchronization.

### F-08 - No double application of `clockOffsetMs` found

Severity: None

File: `ipl-auction-tracker/src/utils/auctionSynchronization.js`

Verified:

- `getServerClockOffsetMs(serverTime)` returns `serverTime - Date.now()`.
- `getAuctionRemainingSeconds()` uses `now + clockOffsetMs`.
- This correctly converts client `now` to estimated server `now`.
- The bug is not double offset application.

## Event Sequence Diagrams

### Current `bid-placed` sequence with overshoot

```text
Server
  create endsAt = serverNow + 30s
  emit bid-placed { endsAt, timerDurationSeconds, no serverTime }

Client
  receive bid-placed
  update current.endsAt
  keep old clockOffsetMs, possibly 0
  timeLeft = ceil((endsAt - (clientNow + oldOffset)) / 1000)
  display 32 or 31 when client clock is behind or offset estimate is stale

Server
  build auction-state snapshot
  emit auction-state { state.current.endsAt, serverTime }

Client
  update clockOffsetMs from serverTime
  reconcile snapshot
  display correct 30-or-less value
```

### Current `participant-started` sequence

```text
Server
  create auction with endsAt = null
  after transaction, set endsAt = serverNow + 30s
  emit participant-started { current round, endsAt, timerDurationSeconds, no serverTime }
  publish auction-state { endsAt, serverTime }

Client today
  does not consume participant-started
  waits for auction-state or HTTP reload
  displays timer from snapshot/current response

Client after adding direct handler without timestamp fix
  would apply endsAt with stale clockOffsetMs
  could display 32 or 31 before snapshot corrects it
```

### Current `auction-state` sequence

```text
Server
  build snapshot
  create serverTime
  emit auction-state { state.current.endsAt, serverTime, revision }

Client
  reject stale revisions
  set clockOffsetMs = serverTime - Date.now()
  apply snapshot state
  compute timeLeft from endsAt and updated clockOffsetMs
  display converged server-truth countdown
```

## Recommended Fix

### 1. Pair every direct deadline event with `serverTime`

Add `serverTime: new Date().toISOString()` to all Festival direct events that carry or modify `endsAt`:

- `participant-started`
- `bid-placed`
- `auction-timer-updated`
- `auction-extended`
- `auction-resumed`

The `serverTime` should be created as close as practical to the emit. The deadline still remains the source of truth; `serverTime` only updates the client clock estimate for that deadline event.

### 2. Update `clockOffsetMs` before applying direct event deadlines

In `MainFestivalAuction.jsx`, direct handlers should follow this order:

```text
receive event with endsAt + serverTime
setClockOffsetMs(getServerClockOffsetMs(payload.serverTime))
apply current.endsAt / status / bid data
timer effect recalculates from the paired server timestamp
```

This applies to future handlers for:

- `participant-started`
- `auction-timer-updated`
- `auction-extended`

It also applies to the existing `bid-placed` handler.

### 3. Cap displayed remaining seconds to the configured duration

The timer display must enforce:

```text
displayedSeconds <= timerDurationSeconds
```

Recommended shape:

```js
const remaining = getAuctionRemainingSeconds(endsAt, clockOffsetMs);
const cappedRemaining = Math.min(
  Number(current?.timerDurationSeconds || 30),
  remaining
);
```

or extend the utility:

```js
getAuctionRemainingSeconds(deadlineAt, clockOffsetMs, now, maxSeconds)
```

with:

```js
Math.min(maxSeconds, computedSeconds)
```

This preserves `Math.ceil` near zero while preventing impossible values above the configured round duration.

### 4. Cap `VisualTimer` displayed number as a final UI guard

`VisualTimer` should display the same capped value used for progress:

```js
const safeDuration = Math.max(1, Number(duration) || 20);
const safeTime = Math.min(
  safeDuration,
  Math.max(0, Number(timeLeft) || 0)
);
```

This should be a guard, not the only fix. The primary fix is consistent `endsAt + serverTime` handling in event payloads.

### 5. Preserve snapshot reconciliation

Keep `auction-state` as source of truth:

- Continue using revision checks.
- Continue overwriting direct-event state with snapshots.
- Continue deriving countdown from server `endsAt`.
- Do not introduce client-generated deadlines.

## Before Behavior

```text
bid-placed received
fresh server endsAt applied
old/zero clockOffsetMs used
Math.ceil exposes positive skew
timer briefly shows 32 or 31
auction-state arrives with serverTime
timer corrects to 30 or below
```

## After Behavior

```text
bid-placed / participant-started / timer-updated received
payload includes endsAt and serverTime
clockOffsetMs updated from the same event
remaining seconds are capped to timerDurationSeconds
timer never displays above 30
auction-state later reconciles without visible jump above duration
```

## Summary

The Festival timer duration is correctly 30 seconds. The overshoot is a synchronization bug, not a duration-constant bug.

The exact causes are:

1. Direct events apply new server deadlines without paired `serverTime`.
2. Clients reuse stale or zero `clockOffsetMs`.
3. `Math.ceil` makes any positive skew visible as an extra second.
4. The UI does not cap displayed seconds to `timerDurationSeconds`.

The minimal safe fix is to pair all direct deadline events with `serverTime`, update `clockOffsetMs` before applying those events, and cap displayed remaining seconds to the configured Festival duration while preserving snapshot reconciliation.
