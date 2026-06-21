# Performance Phase B Audit

## Scope

Phase A is complete. This document audits only the remaining backend bottlenecks and prepares the next optimization phase. No protocol, API, business-rule, permission, lifecycle, or React Query changes were implemented.

## Executive Summary

Bid placement still feels slower than it needs to because the write path is followed by a full authoritative snapshot rebuild and a full `auction-state` socket broadcast. The small action events already emitted (`bid-placed`, `sport-bid-placed`, `participant-sold`, etc.) are close to the desired delta model, but current clients still use the full snapshot to refresh `state` and `history`.

Highest-impact next step: keep the existing action events, add a server-side mutation result snapshot/delta builder, and stop rebuilding full history/team/pool data after every bid. That is the only path likely to reach <= 12 queries per bid.

## Current Publish Flow

### Shared Synchronization Service

File: `ipl-auction-tracker-backend/src/utils/auctionSynchronization.js`

`publish(scopeId, reason)` does:

1. Create revision.
2. Call `loadSnapshot(scopeId)`.
3. Build full `auction-state` payload.
4. Emit full payload to the auction room.

This means every bid, sell, unsold, start, pause, resume, extend, reauction, and complete operation pays the same snapshot rebuild cost.

## Festival publishAuctionState Trace

Entry: `publishFestivalAuctionState(festivalId, reason)`

Snapshot: `getFestivalAuctionSynchronizationSnapshot(festivalId)`

Transaction: read-only `REPEATABLE READ`

### Queries Executed

`loadFestivalAuctionSharedState`

1. `FestivalAuctionConfig.findOne({ festivalId })`
2. Current `FestivalAuction.findOne({ festivalId, festivalParticipantId })` with participant, bids, result includes
3. `calculateTeamBudgets()` -> `FestivalTeam.findAll({ festivalId, status: "active" })`
4. `calculateTeamBudgets()` -> `FestivalTeamOwner.findAll({ festivalId })`
5. `calculateTeamBudgets()` -> `FestivalRetention.findAll({ festivalId })`
6. `calculateTeamBudgets()` -> `FestivalAuctionResult.findAll({ festivalId, outcome: "sold" })`
7. `FestivalTeamOwner.findAll({ festivalId })` with participant include
8. `FestivalTeamMembership.findAll({ festivalId })`
9. `FestivalRetention.findAll({ festivalId })`
10. `FestivalAuctionPool.findAll({ festivalId, state: "available" })` with participant include
11. `FestivalAuctionPool.findAll({ festivalId, state: "unsold" })` with participant include
12. `FestivalTeam.findAll({ festivalId })`
13. `FestivalTeamMembership.findAll({ festivalId })` with participant/team includes

`loadFestivalAuctionHistory`

14. `FestivalAuction.findAll({ festivalId, limit: 100 })` with participant, bids, result includes
15. `FestivalOperationAudit.findAll({ festivalId, limit: 50 })`
16. Config read through request cache; may be de-duplicated with query 1 in the same request context.

### Data Loaded

- Full config.
- Current round with full bid list.
- Full active team budget state.
- Full team owner list.
- Full roster membership list.
- Full retention list.
- Available pool participants.
- Unsold pool participants.
- All teams with roster members.
- Latest 100 auction rounds, including nested bids and results.
- Latest 50 operation audits.

### Data Actually Required After a Bid

For the immediate bid UI update:

- New bid id, team id/name, amount, bid number, bid count.
- Auction id, participant id, endsAt, next bid, increment values.
- Current leading team/current bid.
- Updated remaining budget for the bidding team only.
- Revision/serverTime/deadlineAt.

Not required after a bid:

- Full history.
- Audits.
- Full pool.
- Unsold pool.
- Full team roster memberships.
- Full retention list.
- All team owners.
- Budgets for unchanged teams, except if UI insists on refreshing all team panels.

### Unnecessary Work

The largest unnecessary work is history and pool loading. A bid does not change pool membership, unsold entries, historical finalized rounds, audits, roster memberships, or retentions. The bid changes only the current round, timer, bid stream, leading team, and the bidding team's available budget view.

## Sport publishAuctionState Trace

Entry: `publishSportAuctionState(sportTournamentId, reason)`

Snapshot: `getSportAuctionSynchronizationSnapshot(sportTournamentId)`

Transaction: read-only `REPEATABLE READ`

### Queries Executed

`loadSportAuctionSharedState`

1. `SportTournament.findByPk(sportTournamentId)`
2. `SportAuctionConfig.findOne({ sportTournamentId })`
3. Current `SportAuction.findOne({ sportTournamentId, festivalParticipantId })` with participant, bids, result includes
4. `getSportTournamentBudgetSummary()` -> `SportTournament.findByPk(sportTournamentId)`
5. `getSportTournamentBudgetSummary()` -> `SportTeam.findAll({ sportTournamentId, status: "active" })`
6. `getSportTournamentBudgetSummary()` -> `SportTeamBudget.findAll({ sportTournamentId })`
7. `getSportTournamentBudgetSummary()` -> `SportAuctionResult.findAll({ sportTournamentId, outcome: "sold" })`
8. `SportAuctionPool.findAll({ sportTournamentId })` with participant include
9. `SportAuctionResult.findAll({ sportTournamentId })`
10. `SportTeamMembership.findAll({ sportTournamentId })` with participant/team includes

`loadSportAuctionHistory`

11. `SportAuction.findAll({ sportTournamentId, limit: 100 })` with participant, bids, result includes
12. `SportOperationAudit.findAll({ sportTournamentId, limit: 50 })`
13. Config read through request cache; may be de-duplicated with query 2 in the same request context.

### Data Loaded

- Tournament summary.
- Config.
- Current round with full bid list.
- Budget summary for all teams.
- Entire sport auction pool.
- All sport auction results.
- Full sport team memberships.
- Latest 100 rounds with nested bids/results.
- Latest 50 audits.

### Data Actually Required After a Bid

- New bid id, sport team id/name, amount, bid number, bid count.
- Round id, participant id, endsAt, next credits, increment values.
- Current leading team/current credits.
- Updated remaining credits for bidding sport team only.
- Revision/serverTime/deadlineAt.

Not required after a bid:

- Tournament row, unless status changed.
- Full pool.
- Full membership roster.
- Historical rounds.
- Audits.
- Full result list.
- Eligibility, unless captain/team assignment changed.

## Bid Placement Query Count

### Festival Current After Phase A

Estimated query count: 22-23.

Write path:

1. Auth `User.findByPk`
2. Config lookup with lock
3. Current auction lookup with lock
4. Employee lookup
5. Festival participant lookup
6. Team owner lookup
7. Highest bid lookup
8. Budget teams
9. Budget owners
10. Budget retentions
11. Budget sold results
12. Bid create
13. Bid count
14. Auction update
15. Bid reload for response

Publish path:

16-23. Snapshot rebuild, depending on request cache hits and separate include queries.

### Festival Target <= 12

Recommended safe design:

1. Auth `User.findByPk` or JWT-only verified user claims with must-change-password check moved to request cache.
2. Config + current auction loaded as one current-state query or config read plus current auction read.
3. Replace `findOwnerForUser()` three-query chain with one joined lookup.
4. Highest bid lookup.
5. Replace full budget calculation with single bidding-team budget query/aggregate or cached budget snapshot.
6. Bid create.
7. Use atomic counter update instead of bid count, or increment from locked current round if trustworthy.
8. Auction timer update.
9. Return bid payload from created row plus already-known owner/team data; avoid bid reload.
10. Emit delta event.
11. Optional lightweight updated team budget read.
12. Optional revision write/read.

This reaches 9-12 queries only if full snapshot publish is removed from the bid path.

### Sport Current After Phase A

Estimated query count: 22-24.

Write path:

1. Auth `User.findByPk`
2. Tournament lookup with lock
3. Captain employee lookup
4. Captain tournament lookup duplicate
5. Captain participant lookup
6. Captain assignment lookup with team include
7. Eligibility tournament lookup duplicate
8. Eligibility participants with includes
9. Eligibility captains
10. Eligibility memberships
11. Config lookup
12. Current round lookup
13. Highest bid lookup
14. Budget tournament lookup duplicate
15. Budget teams
16. Budget configured budgets
17. Budget sold results
18. Bid create
19. Bid count
20. Round update
21. Bid reload
22-24. Snapshot rebuild.

### Sport Target <= 12

Recommended safe design:

1. Auth `User.findByPk` or request-cached auth user.
2. Tournament lookup with lock.
3. Replace `findActiveSportCaptainForUser()` chain with one joined captain lookup using tournament's `festivalId`.
4. Replace full eligibility calculation with captain-specific eligibility check.
5. Config lookup.
6. Current round lookup.
7. Highest bid lookup.
8. Bidding sport team budget only, not full summary.
9. Bid create.
10. Atomic counter/timer update.
11. Return bid payload from created row plus known team data.
12. Emit delta event.

This requires eliminating full snapshot publish from bid placement and replacing full eligibility with a targeted check.

## Budget and Eligibility Audit

### Festival calculateTeamBudgets

Current behavior:

- Loads all active teams.
- Loads all owners.
- Loads all retentions.
- Loads all sold results.
- Computes every team's budget.

Required for bid placement:

- Only the bidding team's remaining budget is needed.

Recommended Phase B change:

- Add `calculateFestivalTeamBudgetForBid({ festivalId, festivalTeamId, config, transaction })`.
- Query only:
  - Owner for `festivalTeamId`
  - Retentions for `festivalTeamId`
  - Sold results for `festivalTeamId`
- Keep existing full `calculateTeamBudgets()` for setup pages and full snapshots.

Expected query reduction in festival bid path: 4 broad queries -> 2-3 narrow queries, or 1 aggregate query if implemented with SQL aggregation.

### Sport Budget Summary

Current behavior:

- Loads tournament.
- Loads all active sport teams.
- Loads all team budgets.
- Loads all sold results.
- Computes all team budgets.

Required for bid placement:

- Only bidding sport team's remaining credits are needed.

Recommended Phase B change:

- Add `getSportTeamRemainingCreditsForBid({ sportTournamentId, sportTeamId, transaction })`.
- Query only the specific team budget and sold result sum for the team.
- Reuse tournament already loaded by `placeSportAuctionBid`.

Expected query reduction in sport bid path: 4 broad queries -> 1-2 narrow queries.

### Sport Eligibility

Current behavior:

- Loads tournament.
- Loads every festival participant for the parent festival with employee, sport registrations, and parent membership includes.
- Loads all captains.
- Loads all sport memberships.
- Evaluates every participant.

Required for bid placement:

- Only the current captain's active eligibility and captain assignment are needed.

Recommended Phase B change:

- Add `validateSportCaptainCanBid({ tournament, captain, transaction })`.
- Verify:
  - Captain status active.
  - Captain participant is registered and employee active.
  - Participant is on parent festival team.
  - Participant registered for tournament sport.
  - Gender rule matches.
  - Captain is assigned to an active sport team.
- Do not compute eligibility for all participants during a bid.

Expected query reduction in sport bid path: 4 broad queries -> 0-1 extra targeted query if captain lookup includes required participant/employee/sport data.

## Socket Broadcast Audit

### Current Payload Shape

Every `auction-state` payload includes:

- protocol metadata: version, scopeType, scopeId, reason, revision, serverTime, deadlineAt
- `state.config`
- `state.current`
- `state.budgets` / `state.teamSummaries`
- `state.teams`
- `state.pool`
- `state.unsold`
- `history`
- `audits`

Sport uses equivalent `state.tournament`, `state.config`, `state.current`, `state.budgets`, `state.pool`, `state.counts`, `state.teams`, `history`, `audits`.

### Payload Size Estimates

No runtime `[perf]` payload logs are present in the workspace. Static estimates:

| Scenario | Full snapshot estimate | Delta estimate | Reduction |
|---|---:|---:|---:|
| Small auction, 20 pool entries, 20 history rounds | 35-90 KB | 0.8-2 KB | 95-98% |
| Medium auction, 100 pool entries, 100 history rounds | 180-600 KB | 0.8-2 KB | 98-99.5% |
| Large festival, 300 pool entries, 100 capped history rounds with bids | 500 KB-1.5 MB | 0.8-2 KB | 99%+ |

Serialization cost is proportional to payload size and connected clients. At 50 connected sockets, a 500 KB snapshot implies about 25 MB of JSON serialization/network work for one bid broadcast, before browser parse and React recomputation.

### Current Redundant Broadcast Pattern

Festival bid placement emits:

1. `bid-placed` small event.
2. `auction-timer-updated` small event.
3. `auction-state` full snapshot.

Sport bid placement emits:

1. `sport-bid-placed` small event.
2. `auction-state` full snapshot.

The small events are not currently sufficient as authoritative updates because clients still replace `state/history` from the full snapshot.

## Delta-Based Socket Design

Do not implement yet. Proposed additions are versioned delta events alongside the existing full snapshot fallback.

### `new-bid` Payload

Festival:

```json
{
  "version": 2,
  "scopeType": "festival",
  "festivalId": "festival-id",
  "auctionId": "auction-id",
  "participantId": "participant-id",
  "revision": 123,
  "serverTime": "2026-06-19T00:00:00.000Z",
  "deadlineAt": "2026-06-19T00:00:20.000Z",
  "bid": {
    "id": "bid-id",
    "teamId": "team-id",
    "teamName": "Team A",
    "ownerId": "owner-assignment-id",
    "amount": 1200,
    "bidNumber": 4,
    "placedAt": "2026-06-19T00:00:00.000Z"
  },
  "current": {
    "currentBid": 1200,
    "nextBid": 1440,
    "bidCount": 4,
    "leadingTeam": "Team A",
    "endsAt": "2026-06-19T00:00:20.000Z"
  },
  "teamBudgetPatch": {
    "teamId": "team-id",
    "remainingBudget": 8800
  }
}
```

Sport is the same shape with `sportTournamentId`, `sportAuctionId`, `sportTeamId`, `currentCredits`, `nextCredits`, and `remainingCredits`.

Eliminates: full config, pool, unsold, rosters, history, audits, all unrelated team budgets.

### `player-sold` Payload

```json
{
  "version": 2,
  "scopeType": "festival-or-sport",
  "scopeId": "scope-id",
  "auctionId": "auction-id",
  "participantId": "participant-id",
  "revision": 124,
  "serverTime": "2026-06-19T00:00:00.000Z",
  "result": {
    "outcome": "sold",
    "teamId": "team-id",
    "teamName": "Team A",
    "finalAmount": 1200,
    "finalizedAt": "2026-06-19T00:00:00.000Z"
  },
  "poolPatch": {
    "participantId": "participant-id",
    "state": "sold"
  },
  "rosterPatch": {
    "teamId": "team-id",
    "addParticipantId": "participant-id"
  },
  "teamBudgetPatch": {
    "teamId": "team-id",
    "remainingBudget": 8800
  },
  "current": null
}
```

Eliminates: unrelated pool participants, unrelated team rosters, old history, audits.

### `player-unsold` Payload

```json
{
  "version": 2,
  "scopeType": "festival-or-sport",
  "scopeId": "scope-id",
  "auctionId": "auction-id",
  "participantId": "participant-id",
  "revision": 125,
  "serverTime": "2026-06-19T00:00:00.000Z",
  "result": {
    "outcome": "unsold",
    "finalizedAt": "2026-06-19T00:00:00.000Z"
  },
  "poolPatch": {
    "participantId": "participant-id",
    "state": "unsold"
  },
  "current": null
}
```

Eliminates: budget recalculation, roster refresh, full history fetch.

### `auction-finalized` Payload

```json
{
  "version": 2,
  "scopeType": "festival-or-sport",
  "scopeId": "scope-id",
  "revision": 126,
  "serverTime": "2026-06-19T00:00:00.000Z",
  "status": "completed",
  "completedAt": "2026-06-19T00:00:00.000Z",
  "counts": {
    "sold": 40,
    "unsold": 8,
    "available": 0
  }
}
```

Eliminates: full final snapshot during the completion mutation. Clients can request full results/history on navigation or explicit refresh.

## Slowest Query Profile

No actual development instrumentation output was found in the workspace. The top 10 below are static candidates to validate with Phase A logs.

| Rank | Endpoint | Query candidate | Expected duration risk | Index usage |
|---:|---|---|---|---|
| 1 | Place Bid publish | Festival `FestivalAuction.findAll` history with includes, limit 100 | High: nested includes and separate bid queries | Uses `festivalId`; needs `festival_auctions_festival_started_idx` for `(festivalId, startedAt)` |
| 2 | Place Bid publish | Sport `SportAuction.findAll` history with includes, limit 100 | High: nested includes and separate bid queries | Uses `sportTournamentId`; needs `(sportTournamentId, startedAt)` |
| 3 | Place Bid publish | Festival pool available with participant/employee/sports includes | Medium-high on large festivals | Uses Phase A `(festivalId, state)` |
| 4 | Place Bid publish | Sport pool full read with participant include | Medium-high on large tournaments | Existing `(sportTournamentId, state)` only partly helps because no state filter |
| 5 | Sport Place Bid | Full `getSportTournamentEligibility()` participant read with includes | High as festival size grows | Needs indexes on participant/sport/membership joins; better removed from bid path |
| 6 | Festival Place Bid | `findOwnerForUser()` sequential employee -> participant -> owner | Medium due to three round trips | Individual indexes help; better as one joined lookup |
| 7 | Sport Place Bid | `findActiveSportCaptainForUser()` sequential employee -> tournament -> participant -> captain | Medium-high due to four round trips | Better as one joined lookup after tournament loaded |
| 8 | Place Bid publish | Festival team memberships with participant/team includes | Medium | Existing `festivalId` index likely via FK; add `(festivalId, festivalTeamId)` if missing |
| 9 | Place Bid publish | Sport team memberships with participant/team includes | Medium | Existing query needs `(sportTournamentId, sportTeamId)` if missing |
| 10 | Place Bid write | Bid count after insert | Low-medium but avoidable | Existing bid auction indexes help; can remove with atomic counter |

Instrumentation enhancement recommended before implementation:

- Log the slowest query SQL text, not only duration.
- Add payload byte size and `JSON.stringify` duration around `io.emit`.
- Add `snapshotBuildDurationMs` separate from request total.

## Recommended Implementation Order

1. Add payload instrumentation only:
   - `Buffer.byteLength(JSON.stringify(payload), "utf8")`
   - serialization duration
   - connected room size if available
   - no behavior change

2. Add bid-only fast publish path behind existing events:
   - Do not remove full `auction-state` initially.
   - Build and emit a server-generated `new-bid`/`sport-new-bid` delta.
   - Compare payload and latency in logs.

3. Stop full snapshot publish after bid placement:
   - Keep full snapshot for room join, reconnect, start, sell, unsold, reauction, complete.
   - Bid placement should emit only bid delta plus timer delta.

4. Replace full budget summary in bid path:
   - Festival: targeted team remaining budget.
   - Sport: targeted sport team remaining credits.

5. Replace owner/captain waterfall lookups:
   - Festival owner lookup in one joined query.
   - Sport captain lookup in one joined query using already-loaded tournament.

6. Replace sport full eligibility in bid path:
   - Add captain-specific eligibility validation.
   - Keep full eligibility function for setup/readiness/pool generation.

7. Remove bid reload and bid count:
   - Return bid payload from created bid and known team assignment.
   - Maintain `bidCount` via atomic increment or derive from current in-memory round state.

8. Add snapshot cache for room joins:
   - Short TTL or revision-keyed cache.
   - Avoid concurrent join storms rebuilding identical snapshots.

## Query Count Before/After Estimates

| Flow | Current Phase A | Phase B after recommended changes |
|---|---:|---:|
| Festival bid with full snapshot | 22-23 | N/A, full snapshot removed from bid path |
| Festival bid delta-only | N/A | 9-12 |
| Sport bid with full snapshot | 22-24 | N/A, full snapshot removed from bid path |
| Sport bid delta-only | N/A | 10-12 |
| Festival sell/unsold | ~20+ | 14-18 initially; lower only with sell/unsold deltas |
| Sport sell/unsold | ~20+ | 14-18 initially; lower only with sell/unsold deltas |

## Top Bottlenecks

1. Full snapshot rebuild after every bid.
2. Full `auction-state` socket payload after small bid mutations.
3. History with nested includes in snapshot publish.
4. Full pool and roster reads in snapshot publish.
5. Sport full eligibility recalculation during bid.
6. Full budget summary for one-team affordability checks.
7. Festival owner and sport captain sequential identity lookups.
8. Bid reload and bid count after successful insert.
9. Socket join rebuilds the same full snapshot per connecting socket.
10. Missing runtime payload/query logs for empirical ranking.

## Phase B Decision Point

The <= 12 query target is not achievable while bid placement still calls `publishFestivalAuctionState()` / `publishSportAuctionState()` full snapshot rebuilds. The required architectural change is not a new API or business rule change; it is a socket broadcast strategy change:

- Full snapshot remains for initial load/reconnect/manual refresh.
- Bid placement emits an authoritative delta.
- Clients apply deltas to existing local state with revision guards.

That should be implemented after payload instrumentation confirms the current full snapshot byte size and serialization cost.

