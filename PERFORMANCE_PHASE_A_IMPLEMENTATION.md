# Performance Phase A Implementation

## Scope

Implemented backend-only performance changes with no API response shape, socket event, permission, lifecycle, or auction rule changes.

## Changes

1. Added idempotent index migration:
   `ipl-auction-tracker-backend/migrations/202606190001-performance-phase-a-indexes.js`

2. Added request-scoped performance context:
   `ipl-auction-tracker-backend/src/utils/requestPerformance.js`

3. Added development-only instrumentation around tracked mutation endpoints:
   Place Bid, Sell Participant, Mark Unsold, Update Budgets, Generate Pool.

4. Added request-scoped caching for:
   `loadConfig()` in Festival and Sport live auction controllers.
   `calculateTeamBudgets()` for Festival budget calculations.
   `getSportTournamentBudgetSummary()` for Sport budget calculations.

5. Removed the redundant post-transaction config read from Festival and Sport bid placement responses by carrying the already-loaded increment percentage forward.

6. Hardened history/activity queries:
   Festival auction history capped at 100 rounds.
   Sport auction history capped at 100 rounds.
   Festival/Sport operation activity feeds capped at 50 entries.

## Before vs After

### Query Count

| Flow | Before | After |
|---|---:|---:|
| Festival place bid | ~25 DB queries | ~22-23 DB queries |
| Sport place bid | ~24-26 DB queries | ~22-24 DB queries |
| Festival `loadConfig()` in bid request lifecycle | Up to 4 calls | 2-3 calls, with duplicate same-scope calls de-duplicated |
| Sport `loadConfig()` in bid request lifecycle | Up to 3 calls | 2 calls, with duplicate same-scope calls de-duplicated |
| Festival budget calculation in same request/transaction | 4 queries per invocation | 4 queries once per request/transaction/config version |
| Sport budget summary in same request/transaction | 4 queries per invocation | 4 queries once per request/transaction |

### API Count

No API endpoint count changes were made. This phase intentionally avoided frontend request orchestration, React Query/SWR, aggregated endpoints, and socket protocol changes.

### Estimated Latency

| Area | Estimated reduction |
|---|---:|
| Festival bid placement | 20-80 ms warm path, higher when TiDB round trips are slow |
| Sport bid placement | 15-60 ms warm path |
| Budget update/readiness flows | 20-100 ms when duplicate budget summaries occurred in one request |
| History/results reads | Bounded worst-case latency and payload size once history exceeds 100 rounds |
| Indexed festival setup/current reads | 5-100 ms improvement depending on table size and TiDB plan |

### Expected User Impact

Dashboard, Festival Command Center, Auction Directory, and auction arena reads should become more consistent as core filtered reads move to composite indexes. Bid placement and budget update actions avoid repeated config and budget DB work within the same request lifecycle. Auction history and activity payloads no longer grow without bound.

## Bid Placement Query Map

### Festival Bid Before

1. Auth middleware user lookup.
2. `FestivalAuctionConfig.findOne()` inside transaction.
3. Current `FestivalAuction.findOne()`.
4. Employee lookup for bidder.
5. Festival participant lookup for bidder.
6. Festival team owner lookup.
7. Highest bid lookup.
8. `calculateTeamBudgets()`: teams.
9. `calculateTeamBudgets()`: owners.
10. `calculateTeamBudgets()`: retentions.
11. `calculateTeamBudgets()`: sold results.
12. Bid create.
13. Bid count.
14. Auction timer update.
15. Bid reload with team/owner.
16. Config reload for response progression.
17. Publish snapshot transaction: config reload.
18. Current auction reload.
19. Snapshot team budget calculation, same 4 budget reads.
20. Snapshot owners.
21. Snapshot memberships.
22. Snapshot retentions.
23. Pool entries.
24. Unsold entries.
25. Teams/memberships/history/audits/config history reads.

### Festival Bid After

1. Same validation and write flow.
2. Post-bid response no longer reloads config.
3. Snapshot config uses request-scoped de-duplication inside the snapshot transaction.
4. Snapshot budget calculation uses request-scoped memoization for duplicate same-scope calls.
5. History and activity reads are limited to 100 and 50.

Estimated query reduction: 2-3 queries per bid request lifecycle plus bounded history reads.

### Sport Bid Before

1. Auth middleware user lookup.
2. Tournament lookup.
3. Captain lookup.
4. Eligibility calculation.
5. Config lookup.
6. Current round lookup.
7. Highest bid lookup.
8. Sport budget summary reads.
9. Bid create.
10. Bid count.
11. Round timer update.
12. Bid reload with team.
13. Config reload for response progression.
14. Publish snapshot: tournament, config, round, budget summary, pool, results, memberships, history, audits, config.

### Sport Bid After

1. Same validation and write flow.
2. Post-bid response no longer reloads config.
3. Snapshot config and budget summary de-duplicate repeated same-scope calls.
4. History and activity reads are limited to 100 and 50.

Estimated query reduction: 1-2 queries per bid request lifecycle plus bounded history reads.

## Duplicate Work Removed

| Work item | Before | After |
|---|---:|---:|
| Identical config load in same request/transaction | Repeated DB hits | One DB hit, shared promise |
| Festival budget calculation with same festival/config/transaction | Repeated 4-query calculation | One calculation per request scope |
| Sport budget summary with same tournament/transaction | Repeated 4-query calculation | One calculation per request scope |
| Post-bid response config reload | 1 extra query | 0 extra queries |

## History Query Hardening

| Area | Before | After |
|---|---|---|
| Festival Auction History | Unbounded rounds | `limit: 100` |
| Sport Auction History | Unbounded rounds | `limit: 100` |
| Festival activity feed | `limit: 500` | `limit: 50` |
| Sport activity feed | `limit: 500` | `limit: 50` |

## Instrumentation

Development-only logs include:

| Field | Description |
|---|---|
| `endpoint` | Logical endpoint name, such as `Place Bid` |
| `totalDurationMs` | Request wall-clock duration |
| `queryCount` | Sequelize query count during the request |
| `slowestQueryMs` | Slowest Sequelize query duration |
| `averageQueryMs` | Mean Sequelize query duration |

Instrumentation is disabled in production by `NODE_ENV === "production"`.

## Remaining Bottlenecks

1. Full snapshot rebuild still happens after bid placement.
2. Full socket state payloads are still emitted.
3. Festival/Sport history still loads included bid/result data for the latest 100 rounds.
4. `findOwnerForUser()` remains a sequential three-query chain.
5. Sport eligibility still recalculates during bid validation.
6. Frontend N+1 API request patterns remain unchanged by design in this backend-only phase.

## Verification

Syntax checks passed with Node 20.13.1 for changed backend files:

`requestPerformance.js`, `dbconfig.js`, `festivalLiveAuction.controller.js`, `sportLiveAuction.controller.js`, `festivalMainAuction.controller.js`, `sportTeamBudget.js`, and the new migration.

Focused test run:

`node --test test/festival-auction-stabilization-ux-hardening.test.js test/sport-auction-engine-phase4c.test.js test/sport-auction-stabilization-phase4d.test.js`

Result: 21 passed, 3 failed. The failures are existing frontend string expectations for `Open Sport Auction Arena` and unrelated to the backend performance changes.

