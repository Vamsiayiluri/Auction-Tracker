# Live Auction Sync Test Report

Date: 2026-06-20

## Automated Checks Run

### Syntax Checks

Passed:

- `festivalLiveAuction.controller.js`
- `sportLiveAuction.controller.js`
- `auctionSynchronization.js`
- `liveAuctionEventApplication.js`

Command used:

```powershell
& 'C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe' --check <file>
```

### Frontend Build

Normal build:

```powershell
npm run build
```

Result: failed before compile output because Vite could not delete an existing locked `dist` asset:

```text
EPERM: operation not permitted, unlink ...\dist\assets\DeleteOutlineRounded-D2GjvRmQ.js
```

Alternate compile build:

```powershell
node .\node_modules\vite\bin\vite.js build --outDir .sync-build-check --emptyOutDir
```

Result: passed. Temporary output was removed after the check.

## Code-Level Scenario Matrix

### Festival

Start round:

- Backend `participant-started` now emits top-level `endsAt`, `timerDurationSeconds`, and `serverTime`.
- Frontend listens to `participant-started`.
- Clock offset is updated before applying the new current participant.
- Timer display is capped to 30.

Bid placement:

- Backend `bid-placed` now emits `endsAt`, `timerDurationSeconds`, and `serverTime`.
- Frontend applies the bid through `applyFestivalBidEvent`.
- Duplicate bid ids are ignored.
- Snapshot reconciliation remains active.

Timer extension:

- Backend `auction-extended` and `auction-timer-updated` now share the standardized payload.
- Frontend applies matching timer events through `applyFestivalTimerEvent`.
- Timer reopens without waiting for snapshot.

Participant sold:

- Existing backend and snapshot behavior preserved.
- No deadline-update contract change required.
- Final state still reconciles through `auction-state`.

Participant unsold:

- Existing backend and snapshot behavior preserved.
- No deadline-update contract change required.
- Final state still reconciles through `auction-state`.

Reconnect:

- Existing room join still sends `auction-state`.
- Snapshot includes `serverTime`.
- Revision strategy preserved.

Refresh page:

- Existing current-state endpoint still includes `serverTime`.
- Timer is capped by configured duration after load.

Server restart recovery:

- Existing server timer restoration behavior preserved.
- Live rounds are still rescheduled from persisted `endsAt`.

### Sport

Start round:

- Backend `sport-participant-started` now emits top-level `endsAt`, `timerDurationSeconds`, and `serverTime`.
- Frontend listens to `sport-participant-started`.
- Timer applies configured duration immediately.

Bid placement:

- Backend `sport-bid-placed` now includes `timerDurationSeconds`; existing wrapper already adds `serverTime`.
- Frontend applies the bid through `applySportBidEvent`.
- Duplicate bid ids are ignored.

Timer extension:

- Backend `sport-auction-extended` includes `endsAt`, `timerDurationSeconds`, and `serverTime`.
- Frontend applies it through `applySportTimerEvent`.

Participant sold:

- Existing backend and snapshot behavior preserved.

Participant unsold:

- Existing backend and snapshot behavior preserved.

Reconnect:

- Existing room join still sends `auction-state`.
- Snapshot includes `serverTime`.
- Revision strategy preserved.

Refresh page:

- Existing current-state endpoint still includes `serverTime`.
- Timer is capped by configured duration after load.

Server restart recovery:

- Existing server timer restoration behavior preserved.
- Live rounds are still rescheduled from persisted `endsAt`.

## Regressions Found

1. Normal frontend build failed because Vite could not remove a locked existing `dist` asset. This appears environmental and unrelated to the refactor; alternate output build passed.

## Regressions Fixed During Implementation

1. Festival `auction-resumed` initially carried `endsAt` but not `auctionId`; this would have prevented the shared stale-event guard from applying the resume event. Added `auctionId`.
2. Socket handlers initially would have depended on `clockOffsetMs`, causing listener re-registration on clock updates. Reworked handlers to use `clockOffsetRef`.

## Remaining Risks

- No live browser/socket manual test was run in this environment.
- No backend integration test suite was run.
- Finalization events remain snapshot-driven; this is acceptable because they do not start or reset a countdown.
- The locked `dist` asset should be cleared outside this sandbox before relying on plain `npm run build`.
