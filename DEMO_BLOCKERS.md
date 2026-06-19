# Demo Blockers

Date: 2026-06-20

This file lists only issues that can visibly affect tomorrow's demo.

## 1. Festival first round can appear with time already lost

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

Problem:

- Backend emits `participant-started`, but the Festival arena does not listen to it.
- The server deadline starts before clients receive the full `auction-state` snapshot.

Visible demo impact:

- A newly started 30-second Festival round may appear at 26-27 seconds in production.
- Owners may not see bid controls immediately after the admin starts a participant.

Recommended fix order:

1. Add scoped `participant-started` listener in `MainFestivalAuction.jsx`.
2. Apply payload to `state.current` immediately.
3. Keep `auction-state` reconciliation unchanged.

## 2. Festival extension can appear delayed for non-admin viewers

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`

Problem:

- Backend emits `auction-extended` and `auction-timer-updated`.
- Festival arena ignores both and waits for snapshot reconciliation.

Visible demo impact:

- After the admin clicks Extend, team owners may continue seeing zero or locked bidding until the expensive snapshot arrives.

Recommended fix order:

1. Add an `auction-timer-updated` handler.
2. Filter by active `auctionId`.
3. Update `current.endsAt` and `current.status = "live"` immediately.

## 3. Sport first round can appear with time already lost

Severity: High

Files:

- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

Problem:

- Backend emits `sport-participant-started`, but `SportAuctionArena.jsx` does not listen to it.
- Clients wait for `auction-state`.

Visible demo impact:

- A Sport round can appear late, with less than the configured 20 seconds remaining.

Recommended fix order:

1. Add scoped `sport-participant-started` listener.
2. Apply `payload.current` immediately.
3. Keep snapshot reconciliation unchanged.

## 4. Sport extension can appear delayed

Severity: Medium

Files:

- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`

Problem:

- Backend emits `sport-auction-extended`, but the Sport arena ignores it.

Visible demo impact:

- Captains may briefly see bidding locked after the manager extends an expired round.

Recommended fix order:

1. Add `sport-auction-extended` listener.
2. Filter by active round id.
3. Update `current.endsAt` and `current.status = "live"`.

## 5. Sold/unsold actions wait for snapshots

Severity: Medium

Files:

- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`
- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`

Problem:

- Backend emits `participant-sold`, `participant-unsold`, `sport-participant-sold`, and `sport-participant-unsold`.
- New arenas do not consume these direct events.

Visible demo impact:

- Finalization may feel delayed in production if snapshot generation is slow.

Recommended fix order:

1. Fix start and extend events first.
2. Add direct finalization handlers only if demo flow visibly waits after sell/unsold.

## 6. Legacy IPL auction pages still show 20-second timer assumptions

Severity: High only if these routes are used in the demo

Files:

- `ipl-auction-tracker/src/components/AdminDashboardLayout/AuctionLive.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker/src/components/VisualTimer.jsx`

Problem:

- Legacy components render `VisualTimer` without duration.
- Admin legacy UI still labels extension as `Extend 20 Seconds`.

Visible demo impact:

- If demo navigation opens old IPL auction pages instead of Festival/Sport arenas, timer copy and ring behavior will look inconsistent with the new Festival 30-second change.

Recommended fix order:

1. Confirm old IPL live auction routes are excluded from the demo.
2. If included, pass an explicit duration and update the visible extension label.
