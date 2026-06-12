# Festival Auction Flow

## Workspace Navigation Enhancement

Admins default to Operations View after the Main Auction starts. Edit Festival
Configuration remains available for reference and permitted setup actions;
existing backend locking and validation continue to reject unsafe changes.

Owners use Overview, My Team, Auction, and Bid History. Spectators use Overview,
Live Auction, Teams, Results, and History. These are navigation changes only:
Owner identity, bid calculation, timer behavior, finalization, purse checks,
and authorization are unchanged.

Admin completed activity is separated into Bid History, Results, and Audit.
Bid History follows the Tournament player-first pattern: select an auctioned
participant, then open the complete bid sequence.

## Phase 3G Re-Auction And Increments

```text
available -> auction attempt -> sold
available -> auction attempt -> unsold
unsold -> admin re-auction -> available -> next numbered attempt
```

The Festival increment formula is:

```text
incrementAmount = basePrice * incrementPercentage / 100
nextBid = currentBid + incrementAmount
```

The configured percentage is either 20% or 25%, with 20% as the default.
`incrementAmount` is fixed for the entire participant round and never
compounds from the current bid. Sold participants never return to the pool.

Phase 3F status: COMPLETE

Scope: Main Festival Auction UX and workflow only. Sport Teams, Sport
Captains, Sport Retentions, Sport Auctions, scheduling, and match features are
not part of this phase.

## Tournament Comparison Findings

The legacy Tournament Auction already provided a persisted 20-second deadline,
server-side increments from `src/utils/bidRules.js`, bid timer resets, expiry
locking, admin finalization, live bidder/history views, and authenticated
Socket.IO rooms.

Before Phase 3F, Festival owners typed arbitrary amounts, participant rounds
had no base price or deadline, expiry was not automatic, and Team/history
panels were less complete.

## Admin Journey

1. Complete readiness and start the Main Festival Auction.
2. Select an eligible participant and enter a positive integer base price.
3. Start the participant round.
4. Pause or resume when required.
5. After expiry, extend, sell to the highest bidder, or mark unsold.
6. Complete the auction only when no participant is active.

## Owner Journey

The active assigned Owner reviews the participant, timer, current bid, next
bid, leading Team, Team summaries, and history, then clicks `PLACE BID`.
The owner never enters an amount or Team identity; the server derives both.

## Spectator Journey

Authenticated spectators view the same live state and histories. They cannot
bid or run lifecycle/finalization commands.

## Auction Lifecycle

```text
setup -> live -> paused -> live -> completed

round:
live -> paused -> live
live -> pending -> live (extend)
pending -> sold | unsold
```

## Bid Lifecycle

1. Current bid starts at the base price.
2. The server calls shared `getNextMinimumBid`.
3. Owner and Team identity are server-derived.
4. Remaining purse and leading Team are validated.
5. The exact next amount is persisted.
6. The deadline resets to 20 seconds.
7. Socket events update every connected viewer.

## Timer Behavior

- Duration: 20 seconds.
- Valid bid: resets persisted `endsAt`.
- Expiry: moves the round to `pending` and locks bidding.
- Pause: stores remaining milliseconds.
- Resume: restores saved remaining time.
- Extend: starts a fresh 20-second window from `pending`.
- Restart: live deadlines are restored; overdue rounds become pending.

Festival has an explicit overall pause/resume command. Legacy Tournament
Auction uses expiry plus extend instead.

## History Behavior

Bid History lists auctioned participants. **View Bids** displays base price,
sold price, sold Team, every numbered bid, and each timestamp. Owner history
can be filtered to Own Bids, Won Bids, or Lost Bids. Results continues to show
sold/unsold outcome, winning Team, final amount, and finalized timestamp.

## Teams Behavior

The Festival Operations Teams view follows the Tournament expandable Team
overview. Each Team opens to show Owner, remaining purse, retentions,
purchased players, and the complete current roster. Team configuration remains
in Edit Festival Configuration.

## Live Team Summary

Each active Team displays Owner, remaining purse, auction purchases,
retentions, and current roster count. Values are derived from Festival Owner,
Retention, Membership, Result, and Auction Config records.

## Configuration Recovery

Festival configuration has a persisted `locked` or `unlocked` state. It
defaults to `locked`. Unlock and relock are admin-only, require explicit text
confirmation, and create Festival operation audit entries.

Unlock is a configuration recovery tool, not an auction rollback. It may
permit validated corrections to Festival details, participants, Teams,
Owners, retentions, and available pool membership. Budget changes are allowed
only while no sold auction result exists.

The following remain immutable through this workflow:

- Historical bids
- Historical auction results
- Sold participant Team assignments
- Winning bid amounts

Live auction lifecycle, timer, bidding, finalization, and re-auction rules are
unchanged.
