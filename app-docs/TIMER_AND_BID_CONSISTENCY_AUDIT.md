# Timer And Bid Consistency Audit

Date: 2026-06-20

Scope: Festival and Sport live auctions after the 30-second Festival timer change, immediate bid socket updates, snapshot reconciliation, and bid latency work. This is an audit only; no behavioral fixes were implemented.

## Executive Summary

Bid placement now has the intended immediate update path for both Festival and Sport auctions:

- Festival arena listens for `bid-placed`, applies the bid locally, updates `currentBid`, `leadingTeam`, `bidCount`, `endsAt`, and preserves `timerDurationSeconds`.
- Sport arena listens for `sport-bid-placed`, applies the bid locally, updates bid fields and `endsAt`.
- Both arenas keep `auction-state` as the reconciliation source of truth and ignore stale snapshots by revision.

The remaining consistency risk is not bid placement. It is lifecycle events around starting rounds, extending expired rounds, and finalizing sold/unsold participants. The backend emits direct lifecycle events, but the new Festival and Sport arenas do not consume them; they wait for full `auction-state` snapshots or manual HTTP reloads. That means timer fairness is still incomplete for first round start and extension paths, especially in production where snapshot generation has already been measured at multiple seconds.

## Severity Key

- Critical: Can break the demo or auction correctness immediately.
- High: Can visibly degrade the demo or cause confusing live-state behavior.
- Medium: Can produce latency, stale display, or maintenance risk.
- Low: Cosmetic, legacy, or low-probability issue.

## Section 1 - Timer Consistency

### Finding T-01 - Festival round start still waits for snapshot in clients

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

Root cause:

- `startFestivalAuctionParticipant` sets `endsAt` after the DB transaction, schedules the timer, emits `participant-started`, then publishes `auction-state`.
- `MainFestivalAuction.jsx` listens to `bid-placed` and `auction-state`, but does not listen to `participant-started`.
- Owners and spectators therefore see the new participant only after the full `auction-state` snapshot arrives.

Impact:

- Festival countdown can begin before clients display the participant and bid controls.
- In production, snapshot generation can cost several seconds, so a 30-second Festival round may appear as 26-27 seconds on first render.
- This is the biggest remaining Festival timer fairness gap.

Required fix:

- Add a scoped `participant-started` listener in `MainFestivalAuction.jsx` or move the deadline start until the client-visible event path is available.
- The direct event payload already includes `timerDurationSeconds`, `endsAt`, and the current round data, so a small listener can update `state.current` immediately while preserving snapshot reconciliation.

### Finding T-02 - Festival extend timer direct event is ignored by the new arena

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

Root cause:

- `extendFestivalAuction` emits both `auction-extended` and `auction-timer-updated`.
- `MainFestivalAuction.jsx` does not listen to either event.
- Admins get a forced reload through `runAction`, but owners and spectators rely on `auction-state`.

Impact:

- A visible timer extension can appear late for non-admin viewers.
- During production snapshot delay, the UI may remain locked or show zero while the server has already reopened bidding.

Required fix:

- Add scoped handlers for `auction-timer-updated` or `auction-extended` that update `current.endsAt` and `current.status` when `auctionId` matches the active round.
- Keep `auction-state` as final reconciliation.

### Finding T-03 - Festival timer number and ring are synchronized in the new arena

Severity: None

Files:

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/components/FestivalAuctionArena/ParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`
- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/utils/festivalAuctionTimer.js`

Verification:

- Festival duration source is `FESTIVAL_AUCTION_DURATION_MS = 30_000`.
- Festival `toAuction`, compact auction payloads, and immediate `bid-placed` payloads include `timerDurationSeconds`.
- `MainFestivalAuction.jsx` passes `current?.timerDurationSeconds` to `ParticipantStage`.
- `ParticipantStage` passes that duration to `VisualTimer`.
- `VisualTimer` derives progress from `timeLeft / duration`.

Remaining risk:

- If a future Festival payload omits `timerDurationSeconds`, `VisualTimer` falls back to 20 seconds. Current main Festival payloads include it.

### Finding T-04 - Sport timer remains intentionally 20 seconds

Severity: None

Files:

- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/models/sportAuctionConfig.model.js`
- `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx`
- `ipl-auction-tracker/src/components/SportAuctionArena/SportParticipantStage.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

Verification:

- Sport config defaults `timerDurationSeconds` to 20.
- Sport backend derives deadlines from `config.timerDurationSeconds || 20`.
- Sport UI still uses `VisualTimer` default duration of 20.
- This preserves the requested Sport behavior.

### Finding T-05 - Sport round start also waits for snapshot in clients

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

Root cause:

- `startSportAuctionParticipant` creates the round with `endsAt`, emits `sport-participant-started`, publishes `auction-state`, and returns.
- `SportAuctionArena.jsx` listens to `sport-bid-placed` and `auction-state`, but not `sport-participant-started`.

Impact:

- Sport clients may not see the participant until snapshot generation completes.
- The timer can appear already reduced on first display.

Required fix:

- Add a scoped `sport-participant-started` listener that applies the current round immediately, then reconciles on `auction-state`.

### Finding T-06 - Sport extend timer direct event is ignored by the arena

Severity: Medium

Files:

- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

Root cause:

- Backend emits `sport-auction-extended`.
- `SportAuctionArena.jsx` does not listen to it.

Impact:

- Reopened bidding after an extension may be delayed until the snapshot arrives.

Required fix:

- Add a scoped `sport-auction-extended` handler to update `current.endsAt` and `current.status`.

### Finding T-07 - Legacy auction dashboards still have 20-second assumptions

Severity: Low for Festival/Sport, High if old IPL live auction routes are used in the demo

Files:

- `ipl-auction-tracker/src/components/AdminDashboardLayout/AuctionLive.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

Root cause:

- Legacy Admin and Team Owner live auction components render `<VisualTimer timeLeft={timeLeft} />`, which uses the shared default duration of 20.
- `AdminDashboardLayout/AuctionLive.jsx` still displays `Extend 20 Seconds`.

Impact:

- If demo navigation reaches the old IPL auction flow, the visual timer and label remain 20-second based.
- This does not affect the new Festival arena path because Festival passes `timerDurationSeconds`.

Required fix:

- Confirm whether old IPL auction pages are still demo-accessible.
- If yes, pass an explicit duration or isolate their timer copy instead of changing the shared default.

## Section 2 - Bid Event Consistency

### Festival bid events

Files:

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Verified:

- Backend emits `bid-placed` immediately before deferred `publishFestivalAuctionState`.
- Payload includes bid id, auction id, team id, team name, amount, bid count, `endsAt`, progression fields, and `timerDurationSeconds`.
- Frontend filters by `festivalAuctionId === currentAuctionId.current`.
- Duplicate bid appends are prevented by checking existing bid id.
- Snapshot reconciliation overwrites immediate state when a newer `auction-state` revision arrives.

Residual risk:

- The immediate `bid-placed` payload does not include `festivalId`; filtering relies on auction id. UUID collision is practically unlikely, but including scope id would make the protocol easier to reason about.

### Sport bid events

Files:

- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`
- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`

Verified:

- Backend emits `sport-bid-placed` immediately.
- Payload is wrapped with `sportTournamentId`, allowing scope filtering.
- Frontend filters by both `sportTournamentId` and active `sportAuctionId`.
- Duplicate bid appends are prevented by bid id.
- Snapshot reconciliation remains source of truth.

Residual risk:

- Sport direct bid payload does not include a timer duration. This is acceptable while Sport remains 20 seconds, because `VisualTimer` defaults to 20.

## Section 3 - Timer Reconciliation

Verified:

- Festival and Sport countdown values derive from persisted server `endsAt`, not local start time.
- Both arenas calculate remaining time with `getAuctionRemainingSeconds(endsAt, clockOffsetMs)`.
- Both socket room join handlers send a fresh `auction-state` snapshot on `room-joined`.
- Server restart restoration scans live rounds and either reschedules timers or expires overdue rounds.
- Stale snapshots are rejected with revision checks.
- HTTP load versus socket snapshot races are guarded in both main arenas by preserving socket-advanced state.

Remaining issues:

- Direct lifecycle events are not consumed, so refresh/reconnect is accurate but initial start/extend display can be late.
- Festival Hub and Sport Hub subscribe to snapshots and update correctly, but they do not participate in immediate lifecycle event updates.

## Section 4 - Auction Flow Regression Audit

### Festival

- Start Auction: Uses snapshot reconciliation. No 20-second assumption found.
- Place Bid: Immediate UI update path exists and reconciles with snapshot.
- Extend Timer: Backend uses 30-second `createFestivalAuctionDeadline`; frontend direct extension event ignored.
- Sell Participant: Backend emits `participant-sold`; frontend waits for snapshot or admin forced reload.
- Mark Unsold: Backend emits `participant-unsold`; frontend waits for snapshot or admin forced reload.
- Next Participant: Backend uses 30-second deadline; frontend waits for snapshot because `participant-started` is ignored.
- Tournament Complete: Snapshot-based update; no 20-second assumption found.

### Sport

- Start Auction: Snapshot-based update.
- Place Bid: Immediate UI update path exists and reconciles with snapshot.
- Extend Timer: Uses Sport config duration, default 20; direct event ignored.
- Sell Participant: Direct event ignored; snapshot-based update.
- Mark Unsold: Direct event ignored; snapshot-based update.
- Next Participant: Direct event ignored; snapshot-based update.
- Tournament Complete: Snapshot-based update.

## Section 5 - UI Consistency

Festival:

- Main arena timer number and ring share `timeLeft` and `timerDurationSeconds`.
- Arena header has no circular timer.
- Bid widgets rely on `current.nextBid`, `current.currentBid`, and immediate bid updates.
- Activity/result cards are snapshot/history driven.
- Auction Hub is snapshot driven and has no separate timer ring.

Sport:

- Main arena timer number and ring share `timeLeft` and default 20-second duration.
- Arena header has no circular timer.
- Bid widgets rely on `current.nextCredits`, `current.currentCredits`, and immediate bid updates.
- Activity/result cards are snapshot/history driven.
- Auction Hub is snapshot driven and has no separate timer ring.

No duplicated ring math was found outside `VisualTimer`.

## Section 6 - Performance Regression Check

Verified:

- Festival `MainFestivalAuction.jsx` registers `bid-placed`, `auction-state`, `connect`, and `disconnect`, with matching cleanup.
- Sport `SportAuctionArena.jsx` registers `sport-bid-placed`, `auction-state`, `connect`, and `disconnect`, with matching cleanup.
- Immediate bid handlers do not trigger API reloads while the socket is connected.
- On failed bid or disconnected socket, both arenas fall back to an explicit reload.

Remaining risks:

- Festival lifecycle `runAction` still calls `loadAuction({ forceState: true })` after admin actions, even though socket snapshots also arrive. This can duplicate one API load for admin lifecycle actions.
- Sport lifecycle `run` avoids reload when socket is connected, so finalization/start/extend UI can wait on snapshot if direct lifecycle events are ignored.
- Festival history/detail components each subscribe independently to `auction-state`; this is acceptable for separate mounted routes but can be noisy if multiple live widgets are mounted simultaneously.

## Section 7 - Demo Safety Checklist

Code-level checks completed:

- Festival bid visible immediately: Pass.
- Festival timer ring matches countdown in new arena: Pass.
- Festival timer shows 30 seconds when `timerDurationSeconds` is present: Pass.
- Festival refresh during auction: Pass by server `endsAt` and room-join snapshot.
- Festival reconnect during auction: Pass by room-join snapshot.
- Festival sell participant: Snapshot-based, delayed risk.
- Festival mark unsold: Snapshot-based, delayed risk.
- Sport bid visible immediately: Pass.
- Sport duplicate bid updates: Guarded by bid id.
- Sport sell participant: Snapshot-based, delayed risk.
- Sport mark unsold: Snapshot-based, delayed risk.
- Sport reconnect during auction: Pass by room-join snapshot.

No browser or automated test run was performed as part of this audit.

## Required Fixes

1. High - Add Festival `participant-started` direct handler to prevent hidden countdown loss at round start.
2. High - Add Festival `auction-timer-updated` or `auction-extended` handler to show extensions immediately.
3. High - Add Sport `sport-participant-started` direct handler to prevent hidden countdown loss at round start.
4. Medium - Add Sport `sport-auction-extended` handler to show extensions immediately.
5. Medium - Consider direct sold/unsold handlers or reduce snapshot delay impact for finalization UX.
6. Low - Decide whether legacy IPL live auction pages need explicit timer duration and label updates.
