# Phase 4C Sport Auction Engine

## Findings

- Festival Auction already provides the required persisted-deadline, pending-finalization, stale-bid, transaction-locking, derived-budget, history, and socket refresh patterns.
- Sport Auction must remain scoped by `sportTournamentId`; Festival Team ownership grants management, while `SportTeamCaptain` grants bidding.
- Team credits are safer as derived values: allocation plus adjustment minus sold Sport Auction results.

## Reuse Analysis

- Reused `getFestivalBidProgression` for fixed-base percentage increments.
- Reused `createFestivalAuctionDeadline` and `getFestivalAuctionRemainingMs` for deadline and pause behavior.
- Reused Festival lifecycle semantics: live round, persisted deadline, pending owner decision, extend/sell/unsold, and startup restoration.
- Reused assignment-based owner authorization and the Festival history/readiness response patterns.
- Reused `VisualTimer`, authenticated Axios, and the authenticated Socket.IO singleton.

## Files Modified

- Added the Phase 4C migration, five Sport Auction models, live controller, arena page, and focused tests.
- Extended Sport Tournament routes, validation, readiness, authorization, budget summaries, pool metadata, sockets, directory, workspace, and control center.

## Database Changes

- Added `SportAuctionConfigs`, `SportAuctions`, `SportAuctionBids`, `SportAuctionResults`, and `SportOperationAudits`.
- Added `reauctionCount` and `lastReauctionedAt` to `SportAuctionPools`.
- Unique round attempts, bid amounts, and results prevent duplicate concurrent finalization.

## API Changes

- Configuration: `PATCH /api/v2/sport-tournaments/:id/auction/config`
- Lifecycle: `start`, `pause`, `resume`, `extend`, and `complete`
- Round actions: participant `start`, `sell`, and `unsold`
- Captain action: `POST .../auction/bid`
- Re-auction: `POST .../auction/reauction`
- Reads: `GET .../auction/current` and `GET .../auction/history`

## Auction Lifecycle

- `ready -> auction_live -> auction_paused -> auction_live -> auction_completed`
- Active participant rounds use `live`, `paused`, `pending`, `sold`, and `unsold`.
- Timer expiry locks bidding and requires an owner/admin decision.

## Captain Authorization

- The authenticated user is resolved to an active Employee, registered Festival Participant, and active `SportTeamCaptain` assignment in the Tournament.
- Owners cannot bid unless that same Employee also has an active Captain assignment.

## Bid Logic

- Clients submit only the round ID and expected current credits.
- The server calculates the next percentage increment, locks the round, rejects stale or duplicate bids, and resets the persisted deadline.

## Timer Logic

- Deadlines are stored in the database and restored at process startup.
- Pause stores remaining milliseconds; resume rebuilds the deadline.
- Overdue reads reconcile live rounds to pending finalization.

## Budget Logic

- Remaining credits are derived from active Team budget allocation and sold Sport Auction results.
- Credits are checked at bid acceptance and again at sale finalization.
- Credits are consumed only by a successful sale.

## History Design

- Bids are append-only per round.
- Results store sold or unsold outcomes.
- Each re-auction creates a new attempt while preserving prior rounds and operation audit records.

## UI Changes

- Added a dedicated Sport Auction Arena with current participant, timer, progression, captain bid action, owner controls, pool selection, budgets, re-auction, and history.
- Active Tournaments open directly into the arena from the directory.
- The setup workspace now configures timer, increment percentage, and re-auction behavior.

## Manual Verification Steps

1. Run migration `202606140004-sport-auction-engine.js`.
2. Configure auction settings and confirm readiness reaches READY.
3. Launch as the parent Festival Team Owner.
4. Start an available participant with base credits.
5. Bid as each assigned Captain and verify stale requests are rejected.
6. Confirm each accepted bid resets the timer.
7. Let the timer expire, then extend or sell/unsold as appropriate.
8. Confirm sold membership, derived remaining credits, pool state, and history.
9. Re-auction an unsold participant and confirm the next attempt number.
10. Pause/resume with and without an active round, then complete with no active participant.

## Remaining Risks

- Timers remain process-local, matching Festival Auction; horizontal scaling still requires shared coordination.
- Database behavior should be exercised against the production MySQL version, especially row locks and enum migrations.
- Read APIs remain authenticated but broadly visible to authenticated roles; stricter spectator scoping can be added if product policy changes.
- Operational rate limiting and structured auction telemetry remain production-hardening work.
