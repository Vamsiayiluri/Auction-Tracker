# Phase 4B Sport Auction Preparation Foundation

Completed: 2026-06-14

## 1. Findings

- Phase 4A already provides the required Sport Tournament, Team, Captain,
  eligibility, status, and parent Festival Team authorization boundaries.
- Sport credits must remain isolated from Festival Auction budgets and legacy
  Tournament purses.
- The eligibility service needed to distinguish base eligibility from Auction
  Pool availability because Captains remain eligible Employees but must not
  appear in the Pool.
- A persisted Pool can become stale when Captains, Sport Team memberships, or
  eligibility configuration changes. Readiness therefore validates the stored
  Pool against current eligibility.
- Read-only access and mutation authority must be separate. Authenticated users
  may read setup state, while only admins and the matching parent Festival Team
  Owner may modify budgets or regenerate the Pool.

## 2. Files Modified

Backend:

- `migrations/202606140003-sport-auction-preparation-foundation.js`
- `src/models/sportTeamBudget.model.js`
- `src/models/sportAuctionPool.model.js`
- `src/models/index.js`
- `src/controllers/sportAuctionPreparation.controller.js`
- `src/controllers/sportTournament.controller.js`
- `src/routes/sportTournamentRoutes.js`
- `src/utils/sportTeamBudget.js`
- `src/utils/sportAuctionPool.js`
- `src/utils/sportTournamentEligibility.js`
- `src/utils/sportTournamentReadiness.js`
- `src/validation/sportTournament.validation.js`

Frontend:

- `src/components/SportTournamentControlCenter.jsx`
- `src/pages/SportTournamentWorkspace.jsx`
- `src/App.jsx`

Documentation:

- `API.md`
- `Database.md`
- `IMPLEMENTATION_LOG.md`
- `PHASE_4B_IMPLEMENTATION_REPORT.md`

## 3. Database Changes

Migration:

```text
202606140003-sport-auction-preparation-foundation.js
```

New tables:

### `SportTeamBudgets`

- `sportTournamentId`
- `sportTeamId`
- `allocatedCredits`
- `adjustmentCredits`
- `status`
- `configuredByUserId`
- `configuredAt`
- timestamps

One budget row is allowed per Sport Team and Tournament.

### `SportAuctionPools`

- `sportTournamentId`
- `festivalParticipantId`
- `state`: `available`, `sold`, or `unsold`
- `generatedByUserId`
- `generatedAt`
- timestamps

One Pool entry is allowed per participant and Sport Tournament.

No Sport Auction round, bid, timer, result, match, fixture, standing, or
competition table was added.

## 4. API Changes

Read APIs require authentication:

```text
GET /api/v2/sport-tournaments/:sportTournamentId/budgets
GET /api/v2/sport-tournaments/:sportTournamentId/pool
```

Admin or matching parent Festival Team Owner only:

```text
POST /api/v2/sport-tournaments/:sportTournamentId/budgets/equal-distribution
PUT  /api/v2/sport-tournaments/:sportTournamentId/budgets
POST /api/v2/sport-tournaments/:sportTournamentId/pool/generate
```

The existing Tournament, Team, eligibility, and readiness reads now support
authenticated read-only viewers. Their mutation routes remain assignment
protected.

No Sport Auction lifecycle, bid, Captain bid, timer, or Socket.IO endpoint was
added.

## 5. Budget Design

Credits are integer allocation units with no financial meaning.

Derived values:

```text
effectiveCredits = allocatedCredits + adjustmentCredits
```

Tournament totals are derived from Team rows:

```text
totalAllocatedCredits
totalAdjustmentCredits
totalEffectiveCredits
```

Equal distribution requires the submitted Tournament total to divide evenly
across active Teams. Distribution transactionally creates or replaces every
active Team budget and resets adjustments to zero.

Manual configuration accepts Team-specific allocated credits, adjustments, and
status. Active budgets must have positive effective credits.

No Festival budget or legacy Tournament purse is read or modified.

## 6. Pool Design

Pool candidates are derived from:

```text
Parent Festival Team membership
+ registered Festival Participant
+ active Employee
+ Sport registration
+ gender rule match
- Captains
- existing Sport Team members
```

Base eligibility reasons remain:

- `PARTICIPANT_WITHDRAWN`
- `EMPLOYEE_INACTIVE`
- `NOT_ON_PARENT_FESTIVAL_TEAM`
- `SPORT_NOT_REGISTERED`
- `GENDER_RULE_MISMATCH`

Pool-specific exclusions:

- `CAPTAIN_ASSIGNED`
- `ALREADY_ASSIGNED`

Generate and regenerate use one transaction:

1. Recalculate authoritative eligibility.
2. Delete the existing Tournament Pool.
3. Insert the current available participant snapshot.
4. Recalculate readiness.

Regeneration is allowed only while the Tournament is in `draft`, `setup`, or
`ready`.

## 7. Readiness Changes

Readiness now checks:

- Tournament exists
- Active Team count matches configuration
- Every Team has a Captain
- Every Captain remains eligible
- At least one eligible non-Captain participant exists
- Every Team has an active positive credit budget
- A persisted Pool exists
- The Pool contains available participants
- The Pool exactly matches current available eligibility

New exact blockers include:

- `Every Sport Team must have an active positive credit budget`
- `Sport Auction Pool has not been generated`
- `Sport Auction Pool has no available participants`
- `Sport Auction Pool is stale and must be regenerated`

Readiness includes budget totals, configured budget count, Pool count,
available count, and Pool freshness. Authorized setup mutations persist
`ready` only when every check passes. Read-only readiness requests do not
persist status.

## 8. UI Changes

Workspace order:

1. Overview
2. Teams
3. Captains
4. Budgets
5. Eligibility
6. Pool
7. Readiness
8. Settings

Only the active tab content is mounted.

The Sport Tournament Control Center displays:

- Tournament status
- Team count
- Captain count
- Eligible count
- Available Pool count
- Configured budget count
- Total effective credits
- Readiness score
- Exact blockers

Future actions are visible but disabled:

- `Launch Auction - Coming Soon`
- `Open Auction - Coming Soon`

The Budgets tab supports equal distribution, manual Team overrides, and
derived totals. The Pool tab supports generation/regeneration, Pool counts,
participants, and exclusion reasons.

Read-only viewers see disabled setup controls and informational notices.

## 9. Manual Verification Steps

1. Apply the Phase 4B migration in an approved environment.
2. Open a Phase 4A Sport Tournament as its parent Festival Team Owner.
3. Confirm readiness reports missing Team budgets and missing Pool.
4. Enter a divisible total, such as 1500 for three Teams, and select Auto
   Distribute.
5. Confirm each Team displays 500 allocated credits.
6. Change one Team allocation or adjustment and save manual overrides.
7. Confirm allocated, adjustment, and effective totals update.
8. Open Pool and select Generate Pool.
9. Confirm Captains and existing Sport Team members are excluded.
10. Confirm base-ineligible Employees display exact eligibility reasons.
11. Change a Captain or eligibility setting and confirm readiness marks the
    Pool stale.
12. Regenerate the Pool and confirm the stale blocker clears.
13. Confirm readiness reaches `READY` only after every Team has an eligible
    Captain, active positive budget, and the current Pool has available
    participants.
14. Open the workspace as a read-only authenticated viewer and confirm budget,
    Pool, Team, Captain, and settings controls are disabled.
15. Confirm Launch Auction and Open Auction remain disabled and display Coming
    Soon.

## 10. Remaining Risks

- Migration execution and database behavior were not verified in this task by
  explicit instruction.
- No tests, lint, build, migration, or verification commands were run.
- Concurrent budget and Pool regeneration behavior still needs database-backed
  integration coverage.
- Pool rows support future `sold` and `unsold` states, but no code changes those
  states in Phase 4B.
- A future auction start operation must lock budget, Pool, Captain, and
  readiness configuration.
- Live Auction, Captain bidding, timers, Socket.IO, sold/unsold finalization,
  Competition Engine, fixtures, matches, standings, and finals remain
  unimplemented.
