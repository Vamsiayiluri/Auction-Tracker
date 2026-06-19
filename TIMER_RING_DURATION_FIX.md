# Timer Ring Duration Fix

## Root Cause

The Festival auction countdown number used the live `timeLeft` value, but the circular progress ring used the shared `VisualTimer` default duration of 20 seconds.

Previous Festival render path:

```jsx
<VisualTimer timeLeft={timeLeft} />
```

Previous ring calculation:

```js
const progress = Math.min(100, (safeTime / duration) * 100);
```

Because `duration` was omitted, Festival rounds were rendered as `timeLeft / 20` even after the backend Festival timer was changed to 30 seconds.

## Files Modified

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

## Hardcoded Values Removed

Festival timer UI no longer relies on the shared `VisualTimer` 20-second default.

The shared default remains `20` to preserve existing Sport Tournament timer behavior and any legacy timer callers that have not supplied a duration.

## Backend Contract Change

Festival auction payloads now include the actual round duration:

```js
timerDurationSeconds: FESTIVAL_AUCTION_DURATION_MS / 1000
```

This was added to:

- Full Festival auction payloads
- Compact Festival auction state payloads
- Immediate `bid-placed` socket/API payloads

## New Calculation

Festival `MainFestivalAuction` passes the current auction duration into `ParticipantStage`:

```jsx
timerDuration={current?.timerDurationSeconds}
```

`ParticipantStage` passes it into the ring:

```jsx
<VisualTimer timeLeft={timeLeft} duration={timerDuration} />
```

`VisualTimer` now guards the denominator:

```js
const safeDuration = Math.max(1, Number(duration) || 20);
const progress = Math.min(100, (safeTime / safeDuration) * 100);
```

For Festival, the ring now uses `timeLeft / 30` because the backend sends `timerDurationSeconds` from `FESTIVAL_AUCTION_DURATION_MS`.

## Synchronization Confirmation

The Festival countdown number and progress ring now share the same live `timeLeft` value. The ring denominator comes from the same current auction state payload that drives the Festival round, so 30-second Festival rounds render as 30-second rings.

Sport Tournament behavior is unchanged because Sport still omits `duration` and continues using the shared 20-second timer default.
