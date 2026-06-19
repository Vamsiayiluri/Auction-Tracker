# Phase 3H Application UX, Stability And Workflow Hardening

Completed: 2026-06-12

## Findings And Root Causes

- Concurrent bid requests were serialized but not stale-checked, allowing a
  second request to recompute the next bid after the first committed.
- Bid deadline reset happened after the bid transaction.
- Unsold finalization did not reject rounds containing bids.
- Extend visibility depended on the pending-state refresh.
- Owner navigation hid the second Team and did not default to an active auction.
- Participant start used a non-searchable select and unclear action label.
- Team Owner credential emails omitted the assigned Team.
- Import actions lacked synchronous duplicate-request guards and retained
  successful dialogs.
- Most Festival admin mutations relied only on React state for disabled states,
  leaving a same-render double-click window.
- Owner, spectator, Team, bid-history, and result views fetched once on mount
  and could remain stale while auction events changed dependent data.
- Owner and retention participant controls were not searchable.
- Major setup and history tables did not consistently distinguish loading,
  filtered-empty, and truly empty states.
- Legacy Tournament round start checked for an active round outside a
  transaction, and legacy Unsold did not reject a round containing bids.

## Implemented Fixes

- Made Festival timer expiry tolerant of MySQL deadline precision loss.
- Rescheduled timeout callbacks that fire before the persisted deadline.
- Reconciled overdue live rounds through the current-auction read endpoint.
- Added explicit server-derived Extend/Sell/Unsold action availability.
- Added short client polling after local zero so missed socket events recover.
- Added expiry lifecycle logs on the server and socket receipt logs in clients.
- Bid requests carry `auctionId` and `expectedCurrentBid`; stale requests return
  `409`.
- Bid insertion and persisted deadline reset are atomic.
- Timeout expiry validates the exact persisted deadline it was scheduled for.
- Unsold requires pending expiry and zero accepted bids.
- Owner credential and resend emails include Team Name.
- Participant selection uses Material UI autocomplete.
- Extend remains visible while a participant is active.
- Owners auto-open active auctions, see both Team summaries, and see read-only
  Available and Unsold queues.
- Owner Team name is highlighted across overview, Teams, auction, and history.
- Import actions use in-flight guards, processing loaders, clean-success dialog
  closure, and immediate refresh.
- Festival setup, Team Builder, control-center, details, configuration-lock,
  employee, and Festival-create mutations use synchronous in-flight guards.
- Owner and retention assignment controls support employee number, name, and
  email search.
- Team Builder supports employee search and explicit empty rows.
- Owner/spectator overview, Team, bid-history, and result views refresh from
  authenticated Festival auction socket events.
- Festival create and details forms reject invalid date ranges before submit.
- Legacy Tournament round start locks the Tournament row transactionally.
- Legacy Tournament Unsold is rejected transactionally after any valid bid and
  the admin control mirrors the server rule.

## Verification

- Backend regression tests cover bid payload validation, stale-state checks,
  atomic deadline reset, both Festival and Tournament Unsold rules,
  transactional Tournament start, Team email context, duplicate guards,
  searchable controls, and real-time refresh contracts.
- Frontend lint/build and backend test results are recorded in the completion
  response for this work.

## Manual Verification

1. Run a Festival participant round with no bids; at zero, confirm Extend and
   Unsold enable while Sell remains disabled.
2. Run a round with at least one bid; at zero, confirm Extend and Sell enable
   while Unsold remains disabled.
3. Disconnect the admin socket shortly before zero and confirm the current-state
   polling still reaches Pending Finalization within a few seconds.
4. Place a bid that resets a deadline with non-zero milliseconds and verify the
   updated timer expires normally.
5. Double-click every Festival setup mutation and confirm one request is sent.
6. Search owner and retention candidates by name, employee number, and email.
7. Keep Owner Overview, Teams, Bid History, and Spectator Results open while
   bidding and finalizing; confirm dependent values refresh automatically.
8. Start the same legacy Tournament round from two admin sessions; confirm one
   succeeds and the other receives a conflict.
9. Let a legacy round expire after a bid; confirm Unsold is disabled and a
   direct Unsold request is rejected.
10. Verify successful create/edit/import dialogs close and refreshed data is
   visible without a manual reload.

## Remaining Risks

- Imports remain synchronous and should move to background jobs at larger scale.
- Auction timers and Socket.IO coordination remain single-process.
- Full database-backed concurrent integration tests still require a disposable
  MySQL test environment.
- The frontend still has no browser test harness, so interaction and mobile
  regression coverage remains manual.
- Existing per-Team owner loading in auction setup is parallel but still
  request-heavy; a future summary endpoint should replace that fan-out.
