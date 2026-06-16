# Festival Operations Guide

## Workspace Navigation

Before launch, Festival Setup shows one resumable step at a time. Use Back and
Next; Next remains disabled until the active step's completion condition
passes. After the Main Auction starts, use the Operations tabs: Overview,
Participants, Teams, Owners, Retentions, Auction, History, and Settings.

The Control Center remains visible at the top. It shows Festival and auction
status, readiness, participant/Team/Owner/pool/unsold counts, and the valid
quick actions for the current lifecycle state.

Use Overview to resolve blockers, Auction to run the live workflow without
leaving the Festival, and History to search results, bids, re-auction events,
and available Owner/Retention audit activity.

## Festival Setup

Use the ten-step wizard from Festival Details through Review & Launch.
Completion comes from server readiness metrics, and the current step resumes
from browser storage.

## Bulk Operations

- Employee and participant imports are available before auction launch.
- Participant add and sport assignment support batches up to 1,000.
- Bulk sport save replaces selections for the chosen participants.
- Bulk retentions validate all conflicts and Team purses in one transaction.

## Re-Auction

Pool states are Available, Sold, and Unsold. Re-Auction Selected or Re-Auction
All changes only Unsold rows to Available, increments the retry count, and
writes an audit. Earlier rounds, bids, and results remain unchanged. Sold is
terminal.

## Locking

For live, paused, and completed auctions, the backend locks Sports,
Participants, Festival Employee imports, Team mutations, Owner changes,
Retentions, roster mode, and Budget configuration. Auction operations, viewing,
history, and readiness remain available.

## Dynamic Increments

Festival Auction setup provides one Bid Increment Percentage setting: 20% or
25%, with 20% as the default. Each participant round calculates one fixed
increment from the base price:

```text
incrementAmount = basePrice * incrementPercentage / 100
nextBid = currentBid + incrementAmount
```

The increment does not compound as bids increase.

## Readiness Dashboard

Metrics include Sports Enabled, Employees Imported, Participants Registered,
Teams Created, Owners Assigned/Activated, Retentions, Auction Pool Size,
Unsold Players, and Auction Status. Team cards show owner registration,
activation, and blockers.

## Search And Filters

Employees support text/status/pagination. Participants support text, sport, and
registration status. Retentions support text and Team. Auction Pool supports
text, sport, and Available/Sold/Unsold state.

Employee Gender is maintained in the Employee Directory and displayed through
Festival Participant Employee data. Do not add Gender to Festival participant
imports; import or correct the Employee first.

## Team Refresh

Team mutations increment a shared parent revision. Team lists, Owner and
Retention dropdowns, readiness, and auction setup all refetch immediately.
