# Validation Hot Path Audit

## Scope

Production traces show Festival bid validation around `1600ms`.

This audit documents the current Festival and Sport bid validation paths only. No validation optimization was implemented in this task.

## Festival Bid Validation Flow

Endpoint:

`POST /api/v2/festivals/:festivalId/auction/bid`

File:

`ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Flow:

```text
Request
  -> role check
  -> loadConfig(lock)
  -> loadCurrentAuction(lock)
  -> findOwnerForUser(lock)
  -> validate auction id
  -> load highest bid(lock)
  -> validate current bid
  -> calculateTeamBudgets()
  -> select bidder budget
  -> compute next bid
  -> validate purse
  -> DB write phase
```

## Festival Query Inventory

| Step | Query / Function | Tables touched | Data loaded | Data used | Estimated cost |
| --- | --- | --- | --- | --- | --- |
| 1 | `loadConfig(festivalId, transaction, true)` | `FestivalAuctionConfig` | auction config row | `auctionStatus`, `currentParticipantId`, `incrementPercentage`, budget config | Low |
| 2 | `loadCurrentAuction(config, transaction, true)` | `FestivalAuction`, includes participant/bids/result depending helper path | current round and related data | round id, status, deadline, base price, participant id | Medium |
| 3 | `findOwnerForUser(festivalId, userId, transaction, true)` | `FestivalTeamOwner`, participant/employee/user/team associations | owner assignment and team | owner id, team id, team name | Medium |
| 4 | `FestivalAuctionBid.findOne` highest bid | `FestivalAuctionBid` | highest bid row | leading team id, current amount | Low/Medium depending index |
| 5 | `calculateTeamBudgets(festivalId, config, transaction)` | `FestivalTeam`, `FestivalTeamOwner`, `FestivalRetention`, `FestivalAuctionResult` | all active teams, all owners, all retentions, all sold results | only current bidder remaining budget | High |
| 6 | budget `.find()` | in-memory array | all team budgets | one team budget | CPU low, but depends on Step 5 |

## Festival Hot Spots

### `calculateTeamBudgets()` dominates validation risk

Current implementation loads full Festival budget state:

- all active Festival Teams
- all Festival Team Owners
- all Festival Retentions
- all sold Festival Auction Results

The bid path uses only:

- current owner team id
- current team remaining budget

This is the largest avoidable synchronous validation cost.

### Current auction load may be heavier than needed

The bid path needs only:

- round id
- status
- `endsAt`
- `basePrice`
- `festivalParticipantId`

Any includes or hydration beyond that are not needed for validation.

### Owner lookup may hydrate more than needed

The bid path needs:

- owner id
- festival team id
- team name for response payload

Any participant/employee/user fields beyond authorization linkage are not needed after the auth check.

## Festival Target Plan For <500ms

Priority 1:

Replace full `calculateTeamBudgets()` in the bid path with a single-team budget calculation:

```text
current team owner cost
+ current team retentions sum
+ current team sold results sum
= spent
remaining = configured budget - spent
```

Use aggregate queries:

- `SUM(FestivalRetention.amount)` by `festivalTeamId`
- `SUM(FestivalAuctionResult.finalAmount)` by `festivalTeamId`
- owner cost for the current team only

Estimated savings: `600-1000ms` in production.

Priority 2:

Use minimal attributes for current auction validation:

- `id`
- `festivalId`
- `festivalParticipantId`
- `status`
- `basePrice`
- `endsAt`

Estimated savings: `100-250ms`.

Priority 3:

Use minimal owner lookup:

- owner id
- festival team id
- team name

Estimated savings: `50-150ms`.

Priority 4:

Ensure highest bid query has an index that supports:

```text
festivalAuctionId, amount DESC, createdAt ASC
```

Estimated savings: workload dependent.

## Sport Bid Validation Flow

Endpoint:

`POST /api/v2/sport-tournaments/:sportTournamentId/auction/bid`

File:

`ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`

Flow:

```text
Request
  -> SportTournament.findByPk(lock)
  -> findActiveSportCaptainForUser(lock)
  -> getSportTournamentEligibility()
  -> find eligible captain in included list
  -> loadConfig(lock)
  -> loadCurrentRound(lock)
  -> validate auction id
  -> highestBid(lock)
  -> validate current bid
  -> getSportTournamentBudgetSummary()
  -> select captain team budget
  -> compute next bid
  -> validate credits
  -> DB write phase
```

## Sport Query Inventory

| Step | Query / Function | Tables touched | Data loaded | Data used | Estimated cost |
| --- | --- | --- | --- | --- | --- |
| 1 | `SportTournament.findByPk(lock)` | `SportTournament` | tournament row | status, id | Low |
| 2 | `findActiveSportCaptainForUser()` | captain/team/user-related tables | active captain assignment | captain id, participant id, team id, team name | Medium |
| 3 | `getSportTournamentEligibility()` | `SportTournament`, `FestivalParticipant`, `Employee`, `FestivalParticipantSport`, `FestivalTeamMembership`, `SportTeamCaptain`, `SportTeamMembership` | all Festival participants and eligibility context | whether current captain participant remains eligible | High |
| 4 | `loadConfig(lock)` | `SportAuctionConfig` | config row | current participant id, increment percentage, timer config | Low |
| 5 | `loadCurrentRound(lock)` | `SportAuction` | current round | id, status, deadline, base credits, participant id | Low/Medium |
| 6 | `highestBid()` | `SportAuctionBid` | highest bid row | leading team id, amount | Low/Medium depending index |
| 7 | `getSportTournamentBudgetSummary()` | `SportTournament`, `SportTeam`, `SportTeamBudget`, `SportAuctionResult` | all active teams, budgets, sold results | only captain team remaining credits | High |

## Sport Hot Spots

### `getSportTournamentEligibility()` is too broad for bid validation

The bid path checks only whether the current captain participant remains eligible. Current helper evaluates every participant in the parent Festival and returns included/excluded lists.

This is correct for setup screens, but too expensive for every bid.

### `getSportTournamentBudgetSummary()` is too broad for bid validation

The bid path needs only the captain team's remaining credits. Current helper loads all teams, all budgets, and all sold results.

### Duplicate tournament/config work

The flow loads `SportTournament` first, then `getSportTournamentEligibility()` loads `SportTournament` again internally, and then config/current round are loaded separately.

## Sport Target Plan For <500ms

Priority 1:

Replace full eligibility evaluation with a captain-specific eligibility check:

```text
captain participant is registered
employee active
participant belongs to parent Festival Team
participant registered for tournament sport
gender rule matches
participant is not already assigned as sport team member where disallowed
```

Estimated savings: `400-900ms` depending participant count.

Priority 2:

Replace full `getSportTournamentBudgetSummary()` with current-team aggregate budget:

- captain team budget row
- `SUM(SportAuctionResult.finalCredits)` for captain team

Estimated savings: `300-700ms`.

Priority 3:

Pass already-loaded tournament fields into eligibility validation to avoid refetching `SportTournament`.

Estimated savings: `50-100ms`.

Priority 4:

Use minimal attributes for current round and highest bid.

Estimated savings: `50-150ms`.

## Duplicated Work

Festival:

- Full team budget calculation is reused across screens but over-scoped for one bid.
- Current auction and highest bid are related but loaded separately.
- Owner lookup may load response-oriented fields for validation.

Sport:

- Tournament is loaded directly, then loaded again inside eligibility.
- Full tournament eligibility is recalculated for every bid.
- Full tournament budget summary is recalculated for every bid.
- Current captain/team budget selection happens after loading all teams.

## Optimization Roadmap

1. Add single-team Festival bid budget helper.
2. Add single-team Sport bid budget helper.
3. Add captain-specific Sport eligibility helper.
4. Trim bid validation query attributes.
5. Add targeted indexes for highest-bid lookup if missing.
6. Add per-step validation trace fields:
   - `configMs`
   - `currentRoundMs`
   - `ownerOrCaptainMs`
   - `eligibilityMs`
   - `highestBidMs`
   - `budgetMs`
7. Re-run production traces and compare:
   - Festival `validationMs`: target `<500ms`
   - Sport `validationMs`: target `<500ms`

## Expected Savings Summary

| Area | Estimated savings |
| --- | --- |
| Festival single-team budget validation | `600-1000ms` |
| Festival minimal current/owner loads | `150-400ms` |
| Sport captain-specific eligibility | `400-900ms` |
| Sport single-team budget validation | `300-700ms` |
| Sport duplicate tournament/config cleanup | `50-150ms` |

## Recommended Next Sprint

Start with Festival single-team budget validation because production traces identify Festival validation as the current largest synchronous bottleneck.

Then address Sport eligibility and budget summary, since those helpers are designed for setup/workspace screens rather than per-bid hot paths.
