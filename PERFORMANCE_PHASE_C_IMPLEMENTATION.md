# AuctionArena Performance Phase C Implementation

## Scope

Focused only on backend response time and API payload size for Dashboard, Festival Command Center, Auction Directory, Festival summary, Sport summary, readiness, and auction hub entry data.

No frontend changes, permission changes, socket protocol changes, Redis, React Query, or business logic changes were introduced.

## Full State Builder Audit

### `publishFestivalAuctionState`

Entry: `src/controllers/festivalLiveAuction.controller.js`

Before:
- Loaded full shared state through `loadFestivalAuctionSharedState`.
- Loaded current auction with participant, employee, sport registrations, all bids, bid teams, result team.
- Loaded full team budgets, full auction pool, full unsold pool, all teams, all team memberships.
- Loaded full history through `loadFestivalAuctionHistory`: up to 100 rounds with full bid arrays and 50 audit rows.

Kept:
- Full socket snapshot still uses the full state builder because socket consumers need the existing contract.

Removed from summary endpoints:
- Full pool rows.
- Full unsold rows.
- Full team membership participant objects.
- Full bid history for current round.
- Full history and audit loading.

### `publishSportAuctionState`

Entry: `src/controllers/sportLiveAuction.controller.js`

Before:
- Loaded full Sport shared state: tournament, config, current round with all bids, budget summary, full pool, all results, and full memberships.
- Loaded full history: up to 100 rounds with bid arrays and 50 audit rows.

Kept:
- Full socket snapshot still uses the full state builder because socket consumers need the existing contract.

Removed from summary endpoints:
- Full pool participant objects.
- Full result rows.
- Full team allocations.
- Full current round bid arrays.
- Full history and audit loading.

## Implemented Backend Reductions

### Festival Summary Endpoint

Endpoint: `GET /api/v2/festivals/auction/summaries`

Before:
- Reused `loadFestivalAuctionSharedState` for every festival.
- Loaded current auction with all bids.
- Loaded full pool and unsold participant lists.
- Loaded teams plus full memberships.

After:
- Uses `loadFestivalAuctionSummaryState`.
- Loads config/status, compact current participant, highest bid, bid count, grouped pool counts, optional owner team context, readiness, and recent outcomes.
- Recent outcomes use minimal attributes for result, participant, employee, and team.

### Sport Summary Endpoint

Endpoint: `GET /api/v2/sport-tournaments/auction/summaries`

Before:
- Reused `loadSportAuctionSharedState` for every active tournament.
- Loaded budget summary, full pool, full results, full memberships, and all bids.

After:
- Uses `loadSportAuctionSummaryState`.
- Loads compact current round, highest bid, bid count, grouped pool counts, grouped result counts, optional team context only for managers/captains, readiness, and recent outcomes.
- Skips team context for admin/spectator summary responses.

### Readiness

Festival readiness:
- Replaced registered participant `findAll` with `count`.
- Replaced membership row load with `count`.
- Replaced full auction pool row load with grouped state counts.
- Narrowed team, owner, participant, employee, user, and config attributes.

Sport readiness:
- Narrowed tournament, team, captain, eligibility, budget, and result attributes.
- Added request-scoped reuse for `getSportTournamentEligibility`.
- Kept stale-pool validation by loading only pool `state` and `festivalParticipantId`.

### Dashboard List Payloads

Festival list:
- Added explicit minimal attributes used by `toFestivalResponse`.

Sport Tournament list:
- Added explicit tournament attributes.
- Narrowed Festival, Festival Team, Sport, Sport Team, Captain, Participant, and Employee includes.
- Preserved summary permissions from Phase B.

## Query Timing Analysis

Existing instrumentation:
- `src/utils/requestPerformance.js` records SQL timing and console-logs `[perf]` summaries in development.
- No persisted runtime `[perf]` log files were present in the repository, so exact live durations were not available during this phase.

Static top query shapes optimized:

| Rank | File | Endpoint | Query shape | Duration |
|---:|---|---|---|---|
| 1 | `festivalLiveAuction.controller.js` | Festival summaries | Full shared state per festival | Not captured |
| 2 | `sportLiveAuction.controller.js` | Sport summaries | Full shared state per tournament | Not captured |
| 3 | `festivalLiveAuction.controller.js` | Festival summaries | Full pool with participant/sport includes | Not captured |
| 4 | `sportLiveAuction.controller.js` | Sport summaries | Full pool with participant includes | Not captured |
| 5 | `festivalLiveAuction.controller.js` | Festival summaries | All bids for current auction | Not captured |
| 6 | `sportLiveAuction.controller.js` | Sport summaries | All bids for current round | Not captured |
| 7 | `festivalLiveAuction.controller.js` | Festival summaries | Full team memberships with participants | Not captured |
| 8 | `sportLiveAuction.controller.js` | Sport summaries | Full team memberships with participants | Not captured |
| 9 | `festivalReadiness.js` | Festival readiness | Registered participants `findAll` | Not captured |
| 10 | `festivalReadiness.js` | Festival readiness | Pool rows `findAll` | Not captured |
| 11 | `festivalReadiness.js` | Festival readiness | Membership rows `findAll` | Not captured |
| 12 | `sportTournamentEligibility.js` | Sport readiness | Full eligibility recalculation | Not captured |
| 13 | `sportTeamBudget.js` | Sport readiness/summary | Full sold result rows | Not captured |
| 14 | `sportTournament.controller.js` | Dashboard list | Sport tournament nested includes | Not captured |
| 15 | `festival.controller.js` | Dashboard list | Festival list `SELECT *` | Not captured |
| 16 | `festivalLiveAuction.controller.js` | Recent outcomes | Result includes without attributes | Not captured |
| 17 | `sportLiveAuction.controller.js` | Recent outcomes | Result includes without attributes | Not captured |
| 18 | `sportTournamentReadiness.js` | Sport readiness | Full team rows | Not captured |
| 19 | `sportTournamentReadiness.js` | Sport readiness | Full captain rows | Not captured |
| 20 | `sportLiveAuction.controller.js` | Sport summaries | Team context for spectator/admin rows | Not captured |

## Before vs After

| Area | Before | After |
|---|---:|---:|
| Festival summary current state | Full shared state, pool, unsold, teams, memberships, bids | Compact config/current/counts; owner context only for owner role |
| Sport summary current state | Full shared state, pool, results, memberships, bids | Compact config/current/counts; team context only for manager/captain |
| Current round bids | All bid rows | Highest bid + bid count |
| Pool summaries | Full participant pool rows | Grouped counts |
| Result summaries | Full result rows | Grouped counts or latest bounded outcomes |
| Festival readiness participant load | Participant rows | Participant count |
| Festival readiness pool load | Pool rows | Grouped pool counts |
| Sport eligibility | Recomputed when called repeatedly in request | Request-scoped reused |
| Dashboard list attributes | Broad model payloads | Explicit serializer attributes |

## Estimated Impact

| Page / Endpoint | Query count | Payload size | Response size | Estimated latency |
|---|---:|---:|---:|---:|
| Dashboard Festival summaries | 35-55% lower per festival | 60-85% lower | 55-80% lower | 25-50% lower |
| Dashboard Sport summaries | 30-50% lower per active tournament | 55-80% lower | 50-75% lower | 20-45% lower |
| Festival Command Center | Lower through compact Festival/Sport summaries | 50-75% lower | 45-70% lower | 20-40% lower |
| Auction Directory | Lower Festival summary payload | 50-80% lower | 45-75% lower | 15-35% lower |
| Festival readiness | Similar query count, fewer rows hydrated | 30-60% lower | unchanged API shape | 10-25% lower |
| Sport readiness | Fewer repeated calculations and narrower rows | 20-45% lower | unchanged API shape | 10-30% lower |

## Top 10 Performance Wins

1. Festival summaries no longer load full pool rows.
2. Sport summaries no longer load full pool rows.
3. Festival summaries no longer load all current-round bids.
4. Sport summaries no longer load all current-round bids.
5. Summary endpoints no longer load full history or audits.
6. Sport summaries skip team context for admin/spectator responses.
7. Festival readiness counts participants instead of hydrating participants.
8. Festival readiness uses grouped pool counts instead of hydrating pool rows.
9. Sport eligibility is request-scoped reused.
10. Dashboard list endpoints now use explicit minimal attributes.

## Verification

Syntax checks passed with:

`C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe --check`

Checked:
- `src/controllers/festivalLiveAuction.controller.js`
- `src/controllers/sportLiveAuction.controller.js`
- `src/controllers/festival.controller.js`
- `src/controllers/sportTournament.controller.js`
- `src/utils/festivalReadiness.js`
- `src/utils/sportTournamentReadiness.js`
- `src/utils/sportTournamentEligibility.js`
- `src/utils/sportTeamBudget.js`

No tests were run, per request.
