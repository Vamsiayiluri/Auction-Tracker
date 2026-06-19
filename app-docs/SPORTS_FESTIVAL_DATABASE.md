# Corporate Sports Festival Database Design

## 1. Database Strategy

The target schema should be introduced additively through explicit Sequelize
migrations. Existing auction tables remain operational during transition.
Adapters or compatibility views should provide legacy response shapes until
the frontend and APIs move to the new model.

All monetary amounts should use integer minor units or a documented integer
festival currency unit. Floating-point money should not be introduced into new
tables.

Recommended common columns:

- string or UUID primary key
- `createdAt`, `updatedAt`
- `createdBy`/`updatedBy` where audit significance exists
- optional optimistic `version` for frequently edited aggregates
- status constrained by database enum/check or reference table

## 2. Proposed Tables

### 2.1 Identity and Employee

#### `Users` (modified)

Retain authentication fields. Change business role semantics over time.

Key columns:

- `id`
- `email`
- `password`
- `role`: target `platform_admin | employee`
- verification/reset fields

Constraints:

- unique normalized email
- never expose credential/token fields in DTOs

#### `Employees` (new)

Canonical person record.

| Column | Notes |
|---|---|
| `id` | PK |
| `employeeNumber` | required, unique |
| `userId` | nullable FK to Users, unique |
| `name` | required |
| `email` | required or nullable per HR policy; normalized |
| `department` | nullable |
| `employmentStatus` | `active | inactive` |
| `source` | `manual | import | hris` |

Constraints:

- unique `employeeNumber`
- unique nullable `userId`
- optional unique active corporate email, subject to HR data policy

### 2.2 Festival and Sport Catalog

#### `Festivals` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `name` | required |
| `code` | required, unique |
| `startDate`, `endDate` | required |
| `registrationOpensAt`, `registrationClosesAt` | nullable |
| `status` | `draft | registration_open | registration_closed | allocation | completed | archived` |
| `createdByUserId` | FK Users |
| `timezone` | required |
| `currencyCode` | optional/display metadata |

Constraints:

- `startDate <= endDate`
- registration window is ordered
- controlled lifecycle transitions

#### `Sports` (modified)

Retain existing catalog and add metadata rather than auction state.

Suggested additions:

- `participantMode`: `individual | pair | team | mixed`
- `isTeamFormationRequired`
- `defaultScoringPolicyCode`
- `metadataJson`

Add `throwball`; retain a stable code for table tennis and avoid UI-only
abbreviations becoming business identifiers.

#### `FestivalSports` (new)

Joins enabled sports to a festival.

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `sportId` | FK Sports |
| `status` | `draft | registration_open | allocation | completed` |
| `configJson` | roster sizes, format defaults, labels |

Constraints:

- unique `(festivalId, sportId)`

### 2.3 Registration

#### `FestivalRegistrations` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `employeeId` | FK Employees |
| `status` | `draft | submitted | withdrawn | approved | rejected` |
| `submittedAt` | nullable |

Constraints:

- unique `(festivalId, employeeId)`

#### `EmployeeSportRegistrations` (new)

Stores only selected "Yes" sports.

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalRegistrationId` | FK FestivalRegistrations |
| `festivalSportId` | FK FestivalSports |
| `selectedAt` | required |

Constraints:

- unique `(festivalRegistrationId, festivalSportId)`
- application/database trigger or service validation that both rows belong to
  the same festival

There are no skill, rating, role, or proficiency columns.

### 2.4 Festival Teams and Ownership

#### `FestivalTeams` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `name` | required |
| `code` | required |
| `color`, `logoUrl` | optional |
| `status` | `active | inactive` |

Constraints:

- unique `(festivalId, name)`
- unique `(festivalId, code)`

#### `TeamOwnershipAssignments` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalTeamId` | FK FestivalTeams |
| `employeeId` | FK Employees |
| `assignmentRole` | `owner | co_owner` |
| `startsAt` | required |
| `endsAt` | nullable |
| `assignedByUserId` | FK Users |
| `mandatoryRetentionId` | nullable FK Retentions while pending; required to activate |
| `status` | `pending_retention | active | revoked | expired` |

Constraints:

- prevent duplicate overlapping active assignments for the same team/employee
- if one primary owner is required, unique active owner per festival team
- employee may own a team and be a roster member
- activation requires a confirmed `OWNER_MAIN` retention for the same employee
  and festival team

#### `FestivalRoleAssignments` (new)

Optional scoped administration.

- `festivalId`
- `userId`
- `role`: initially `festival_admin`
- effective dates/status

### 2.5 Main Financial Purse

#### `BudgetAccounts` (new)

Reusable budget ledger owner.

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `festivalTeamId` | FK FestivalTeams |
| `accountType` | `main_purse` |
| `initialAmount` | integer |
| `reservedAmount` | integer |
| `spentAmount` | integer |
| `status` | `open | locked | closed` |
| `version` | optimistic concurrency |

Constraints:

- amounts are non-negative
- `reservedAmount + spentAmount <= initialAmount`
- unique active main purse per festival team

#### `BudgetTransactions` (new)

Immutable ledger:

- `budgetAccountId`
- `transactionType`: `retention_charge | auction_charge | reversal | adjustment`
- `amount`
- `referenceType`
- `referenceId`
- `createdByUserId`
- `occurredAt`

`BudgetAccounts` stores the fast balance projection; `BudgetTransactions` is the
audit source.

This ledger is financial. It must not store sport allocation credits.

#### `AllocationCreditAccounts` (new)

Non-financial credit balance for one internal sport team and one sport auction.

| Column | Notes |
|---|---|
| `id` | PK |
| `auctionEventId` | FK AuctionEvents |
| `sportTeamId` | FK SportTeams |
| `initialCredits` | integer |
| `reservedCredits` | integer |
| `spentCredits` | integer |
| `status` | `open | locked | closed` |
| `version` | optimistic concurrency |

Constraints:

- credits are non-negative whole numbers
- `reservedCredits + spentCredits <= initialCredits`
- unique `(auctionEventId, sportTeamId)`
- credits have no currency code and cannot transfer across auction scopes

#### `AllocationCreditTransactions` (new)

Immutable non-financial ledger:

- `allocationCreditAccountId`
- `transactionType`: `sport_retention | sport_auction | reversal | adjustment`
- `credits`
- reference type/ID
- actor and timestamp

### 2.6 Festival Roster

#### `FestivalTeamMemberships` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `festivalTeamId` | FK FestivalTeams |
| `employeeId` | FK Employees |
| `acquisitionType` | `owner_retention | main_retention | main_auction | migration` |
| `acquisitionAmount` | integer |
| `sourceRetentionId` | nullable FK Retentions |
| `sourceAuctionLotId` | nullable FK AuctionLots |
| `status` | `active | released | transferred` |

Constraints:

- one active festival team membership per `(festivalId, employeeId)`
- team must belong to festival

This table is the source of truth for festival ownership of employees.

### 2.7 Generic Auctions

#### `AuctionEvents` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalId` | FK Festivals |
| `scopeType` | `main | sport` |
| `valueType` | `money | allocation_credit` |
| `festivalSportId` | nullable FK FestivalSports |
| `hostFestivalTeamId` | nullable FK FestivalTeams |
| `name` | required |
| `status` | `draft | ready | live | paused | completed | cancelled` |
| `rulesJson` | increment/deadline configuration |
| `createdByUserId` | FK Users |

Scope constraints:

- main: no sport/host team and `valueType=money`
- sport: sport and host team required and `valueType=allocation_credit`

#### `AuctionBidderAccounts` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `auctionEventId` | FK AuctionEvents |
| `festivalTeamId` | FK FestivalTeams |
| `sportTeamId` | nullable FK SportTeams |
| `budgetAccountId` | nullable FK BudgetAccounts; main only |
| `allocationCreditAccountId` | nullable FK AllocationCreditAccounts; sport only |
| `status` | `active | suspended` |

Constraints:

- unique bidder destination per auction
- bidder scope must match auction scope
- exactly one compatible account reference is present

#### `AuctionLots` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `auctionEventId` | FK AuctionEvents |
| `employeeId` | FK Employees |
| `sequenceNumber` | required |
| `openingValue` | integer money or credits according to event value type |
| `status` | `queued | live | pending_finalization | sold | unsold | withdrawn` |
| `startedAt`, `endsAt`, `finalizedAt` | nullable |
| `winningBidId` | nullable FK Bids after migration to generic bids |

Constraints:

- unique `(auctionEventId, employeeId)`
- unique `(auctionEventId, sequenceNumber)`
- at most one live/pending lot per event, enforced through transaction/locking

#### `Bids` (modified or successor table)

Target columns:

- `auctionLotId`
- `auctionBidderAccountId`
- `bidValue` integer
- `valueType`: copied from auction event
- `placedByUserId`
- `placedAt`
- optional snapshots: bidder/team name

Constraints:

- bid value positive
- bid value type matches the auction event
- immutable accepted rows
- indexes `(auctionLotId, amount)` and `(auctionLotId, placedAt)`

Legacy `playerId`, `tournamentId`, `teamId`, `ownerId`, and `teamName` remain
during compatibility but should no longer drive authorization.

#### `Retentions` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `auctionEventId` | FK AuctionEvents |
| `retentionType` | `owner_main | main | sport` |
| `employeeId` | FK Employees |
| `festivalTeamId` | FK FestivalTeams |
| `festivalSportId` | nullable FK FestivalSports |
| `sportTeamId` | nullable FK SportTeams |
| `budgetAccountId` | nullable FK BudgetAccounts; main types only |
| `allocationCreditAccountId` | nullable FK AllocationCreditAccounts; sport only |
| `retentionValue` | integer |
| `valueType` | `money | allocation_credit` |
| `status` | `draft | confirmed | reversed` |
| `confirmedAt`, `reversedAt` | nullable |

Constraints:

- unique active retention per employee/auction
- sport retention requires sport and host-team eligibility
- owner-main retention must match a pending owner assignment
- owner-main confirmation, purse charge, festival membership, and assignment
  activation are atomic
- sport retention consumes credits and creates sport membership atomically

#### `Allocations` (new)

Immutable record connecting retention/auction outcome to a roster:

- `auctionEventId`
- `auctionLotId` nullable
- `retentionId` nullable
- `employeeId`
- destination IDs
- `allocationType`
- `acquisitionValue`
- `valueType`
- `allocatedAt`

Exactly one of `auctionLotId` or `retentionId` is required.

### 2.8 Sport Rosters, Teams, and Captains

#### `SportRosterMemberships` (new)

- `festivalSportId`
- `festivalTeamId`
- `employeeId`
- `sourceAllocationId`
- `status`

Constraints:

- employee must have active membership in the same festival team
- employee must have selected the sport
- unique active `(festivalSportId, festivalTeamId, employeeId)`

#### `SportTeams` (new)

| Column | Notes |
|---|---|
| `id` | PK |
| `festivalSportId` | FK FestivalSports |
| `festivalTeamId` | FK FestivalTeams |
| `name` | e.g. Team A |
| `code` | required within parent |
| `status` | `draft | active | withdrawn` |

Constraints:

- unique `(festivalSportId, festivalTeamId, name)`
- an auction-enabled sport requires at least two active sport teams per host
  festival team before auction activation

#### `SportTeamMemberships` (new)

- `sportTeamId`
- `employeeId`
- `sportRosterMembershipId`
- `membershipType`: `retention | auction | correction | migration`
- `status`

Constraints:

- membership must be under the same festival team and sport as the roster row
- default unique active membership by `(festivalSportId, festivalTeamId,
  employeeId)` prevents duplicate internal teams within one sport
- no cross-sport uniqueness exists: the same employee may belong to Cricket
  Team A and Volleyball Team B simultaneously
- `correction` and `migration` cannot be used as normal formation paths for an
  auction-enabled sport

#### `CaptainAssignments` (new)

- `festivalSportId`
- `festivalTeamId`
- `sportTeamId` nullable
- `employeeId`
- `captainType`: `captain | vice_captain`
- effective dates/status

Constraints:

- captain must have active matching roster/team membership
- one active primary captain per exact scope
- for auction-built sport teams, captain membership must originate from a
  confirmed sport retention before auction activation

### Future Enhancements (Out of Scope)

Competition management, fixtures, standings, playoffs, and match operations
were evaluated but are intentionally excluded from the current product scope.

## 3. Relationship Diagram

```text
Users 0..1 ----- 1 Employees
Users 1 -------- * FestivalRoleAssignments * ----- 1 Festivals

Festivals 1 ---- * FestivalSports * -------------- 1 Sports
Festivals 1 ---- * FestivalRegistrations * ------- 1 Employees
FestivalRegistrations 1 -- * EmployeeSportRegistrations
FestivalSports 1 ---------- * EmployeeSportRegistrations

Festivals 1 ---- * FestivalTeams
FestivalTeams 1 - * TeamOwnershipAssignments * --- 1 Employees
FestivalTeams 1 - * FestivalTeamMemberships * ---- 1 Employees

Festivals 1 ---- * AuctionEvents
Main AuctionBidderAccounts ---------------------- 1 BudgetAccounts
Sport AuctionBidderAccounts --------------------- 1 AllocationCreditAccounts
AuctionEvents 1 - * AuctionLots * ---------------- 1 Employees
AuctionLots 1 --- * Bids
AuctionEvents 1 - * Retentions
AuctionLots/Retentions ---- Allocations

FestivalTeamMemberships -> SportRosterMemberships
FestivalTeams + FestivalSports -> SportTeams
SportTeams 1 ---- * SportTeamMemberships * ------- 1 Employees
SportTeams/rosters 1 -- * CaptainAssignments * --- 1 Employees

```

## 4. Critical Constraints and Invariants

1. One employee record per corporate employee.
2. One active festival-team membership per employee per festival.
3. Sport roster membership requires both festival-team ownership and selected
   sport registration.
4. Sport team membership cannot cross festival team or sport boundaries.
5. Owner assignment activation requires mandatory owner retention; the
   assignment itself remains a permission record, while retention creates the
   roster membership.
6. Main retention/finalization, financial charge, allocation, and membership
   creation occur in one database transaction.
7. Sport retention/finalization, credit consumption, and sport membership
   occur in one database transaction.
8. Bids are immutable and scoped to one auction lot and value type.
9. Only server-derived active assignments may select bidder accounts.
10. Sport auction activation requires locked retentions and required captains.

## 5. Backward Compatibility Mapping

| Current | Target | Transition |
|---|---|---|
| `Users` | `Users` + `Employees` | Link existing users to generated employee rows |
| `Users.role=team_owner` | ownership assignment | Keep enum temporarily; stop using for authorization |
| `Teams` | `FestivalTeams` | Create festival-scoped rows from tournament participation |
| `Teams.ownerId` | `TeamOwnershipAssignments` | Backfill active assignment |
| `Tournaments` | `Festivals` or legacy auction containers | Map each legacy tournament to a festival during compatibility |
| `TournamentTeams` | `BudgetAccounts` + festival teams | Backfill main financial purses only |
| `Players` | `Employees` + registration + auction lots/memberships | Resolve/deduplicate carefully; retain legacy IDs in mapping |
| `Auctions` | `AuctionEvents` + `AuctionLots` | One legacy tournament auction event, one lot per round |
| `Bids` | generic money bids | Backfill lot/bidder references with `valueType=money` |
| `Players.teamId` | `FestivalTeamMemberships` | Backfill sold players as migration acquisitions |
| `Sports` | `Sports` | Retain and extend |

## 6. Migration Strategy

### Stage 0: Data Profiling

- Identify duplicate users/employees by employee number and normalized email.
- Identify players with no corresponding user/employee.
- Verify tournament/team/sport scoping and orphan records.
- Quantify global owner assumptions and name collisions.
- Freeze a mapping policy before writing migration code.

### Stage 1: Add Canonical Foundations

- Add Employees, Festivals, FestivalSports, FestivalTeams, registrations,
  ownership assignments, and compatibility mapping tables.
- Add missing Throwball sport.
- No current table is removed.

### Stage 2: Backfill Identity and Festival Scope

- Create employee records from users and legacy players using reviewed matching.
- Preserve ambiguous player records for manual resolution.
- Map legacy tournaments to festival records.
- Map participating teams to festival teams.
- Backfill owner assignments from `Teams.ownerId`.

### Stage 3: Add Budget and Roster Sources of Truth

- Create main financial budget accounts from `TournamentTeams`.
- Create ledger opening entries.
- Backfill sold players into festival team memberships.
- Backfill `Teams.ownerId` as pending assignments, then reconcile/create
  mandatory owner retentions and memberships before activation.
- Dual-read and reconcile balances before enabling writes.

### Stage 4: Introduce Generic Auctions

- Create auction events, lots, bidder accounts, retentions, and allocations.
- Write new auctions only to target tables.
- Maintain legacy API responses through adapters.
- Optionally dual-write for a short, measured compatibility window; avoid
  indefinite dual-write.

### Stage 5: Sport Rosters and Auctions

- Add sport teams, allocation credit accounts, sport retentions, captains,
  and sport allocation auctions.
- No legacy equivalent needs backfill except current sport metadata.

### Stage 6: Cutover and Deprecation

- Switch reads and authorization to target sources.
- Stop creating `Players` and global owner teams.
- Remove legacy routes after client cutover and retention period.
- Remove deprecated columns only in a later release after production
  verification and backup.

## 7. Data Migration Controls

- Every migration must be restartable or explicitly fail before mutation.
- Use mapping tables such as `LegacyEntityMappings(entityType, legacyId,
  targetId)`.
- Produce preflight counts and post-migration reconciliation reports.
- Reconcile total budget, spent amount, sold count, bid count, and owner count.
- Reconcile every active owner assignment to one confirmed mandatory retention
  and one festival team membership.
- Back up and restore-test before production migration.
- Quarantine ambiguous employee matches; never merge solely by display name.
- Preserve legacy IDs in audit metadata where direct PK reuse is unsafe.

## 8. Indexing Direction

High-value indexes include:

- Employees by employee number, user, and normalized email.
- Registrations by festival/employee and festival/status.
- Sport registrations by festival sport and registration.
- Ownership assignments by team/status/effective dates and employee/status.
- Festival memberships by festival/employee/status and team/status.
- Auction events by festival/scope/status.
- Lots by event/status/sequence and event/employee.
- Bids by lot/amount and lot/placed time.
- Budget transactions by account/time and reference.
- Allocation credit accounts by auction/sport team and credit transactions by
  account/time.
- Sport memberships by sport/team/employee/status.

MySQL overlap constraints generally require transactional checks and locking;
indexes must support those checks.

## 9. Deletion and History Policy

- Prefer archive/status changes for festivals, teams, employees, and auctions.
- Restrict deletion when financial, bid, allocation, or result history exists.
- Allow cascade only for unstarted draft configuration children.
- Use `SET NULL` only for optional actor references where historical facts must
  remain.
- Keep bid, budget transaction, allocation, ownership history, and approved
  result records auditable.

## 10. Migration Impact Analysis

### Existing Financial Data

- `Tournaments.budget` and `TournamentTeams` balances remain financial and map
  only to main purse accounts.
- Existing sold prices and bid amounts remain monetary.
- Existing data must never seed sport allocation credits.

### Existing Owners

- `Teams.ownerId` proves historical/global ownership but not that a mandatory
  retention was charged.
- Migration should create `pending_retention` assignments.
- A reconciliation decision is required per owner: create an opening owner
  retention charge and membership, recognize an already represented sold-player
  charge, or flag for manual resolution.
- Assignments become active only after the invariant is satisfied.

### Existing Players and Rosters

- Sold legacy players map to festival team memberships.
- Unsold players remain unallocated festival registrants where identity and
  registration can be established.
- No sport roster/team membership is inferred from legacy player role or sport.
- Cross-sport memberships are entirely new and need no duplication of employee
  rows.

### Existing Auctions and Bids

- Legacy auctions become main auction events with `valueType=money`.
- Legacy `Bids.bidAmount` becomes `Bids.bidValue`.
- Sport allocation auctions, credit accounts, credit transactions, sport
  retentions, and captain prerequisites have no legacy backfill.

### Compatibility Impact

- Legacy purse endpoints may adapt main `BudgetAccounts`.
- New sport APIs must use `credits`, never `amount`, `price`, `currency`, or
  `purse`.
- Reports must separate financial acquisition history from non-financial sport
  allocation history.

## 11. Phase 1 Implemented Schema

Implemented additively in
`202606090001-festival-foundation.js`:

- `Festivals`
- `FestivalSports`
- `FestivalParticipants`
- `FestivalTeams`

The initial implementation used `FestivalParticipants.userId -> Users.id` as a
temporary bridge. Migration `202606090003-employee-identity.js` introduces
Employees, backfills legacy participants, and makes Employee the source of
participant identity.

No legacy auction table or column is modified. Throwball is added to the
existing Sports catalog.

## 12. Phase 2 Implemented Schema

Migration: `202606090002-festival-participant-sports.js`.

### `FestivalParticipantSports`

| Column | Definition |
|---|---|
| `id` | string primary key |
| `festivalParticipantId` | required FK to `FestivalParticipants.id` |
| `sportId` | required FK to `Sports.id` |
| `createdAt` | required timestamp |
| `updatedAt` | required timestamp |

Constraints and indexes:

- unique `(festivalParticipantId, sportId)`
- indexed `sportId`
- participant deletion cascades registration rows
- sport deletion is restricted while registrations reference it

Festival membership of the sport is enforced by the registration service:
`FestivalParticipant.festivalId` must have a matching
`FestivalSport(festivalId, sportId)`. The database uniqueness constraint remains
the final defense against duplicate requests and concurrent inserts.

This is an additive migration. It does not alter `Tournaments`,
`TournamentTeams`, `Teams`, `Players`, `Auctions`, or `Bids`. Rollback removes
only `FestivalParticipantSports`.

### Phase 2 Relationship

```text
Festivals 1 ---- * FestivalParticipants * ---- 1 Employees
Festivals 1 ---- * FestivalSports * --------- 1 Sports
FestivalParticipants 1 -- * FestivalParticipantSports * -- 1 Sports
```

Migration `202606090003-employee-identity.js` adds the Employee link without
changing existing participant or sport-registration IDs.

## 13. Employee Identity Redesign

`Employees` stores Employee Number, name, optional email/department,
employment status, source, identity status, and an optional unique User login
link. Employee Number is required by current create/import workflows; migrated
legacy records remain nullable and `needs_review` until HR reconciliation.

`FestivalParticipants` gains `employeeId -> Employees.id`, unique
`(festivalId, employeeId)`, and an employee/status index. The old `userId`
remains nullable only for migration compatibility. Existing participant and
sport-registration IDs are preserved.

## 14. Phase 3 Festival Team Builder Schema

Migration: `202606090004-festival-team-builder.js`.

`Festivals` gains `teamAssignmentStatus` with values `draft`, `building`, and
`locked`.

`FestivalTeamMemberships` contains:

- `id`
- `festivalId`
- `festivalParticipantId`
- `festivalTeamId`
- `assignmentMethod`: `manual | auto_balanced`
- `assignedBy`
- `assignedAt`
- timestamps

Unique `(festivalId, festivalParticipantId)` guarantees at most one primary
Festival Team per participant. Locking requires membership count to equal
active participant count, establishing exactly one team for every registered
participant. Team deletion is rejected while memberships exist, and membership
changes are rejected after lock.

Participant strength is derived from sport-registration count and is not
persisted. The migration does not modify legacy `Teams`, `Tournaments`,
`TournamentTeams`, `Players`, `Auctions`, or `Bids`.

## 15. Phase 3A Main Festival Auction Foundation

Migration: `202606090005-main-festival-auction-foundation.js`.

New tables:

- `FestivalAuctionConfigs`
- `FestivalTeamOwners`
- `FestivalRetentions`
- `FestivalAuctionPools`

`FestivalTeamMemberships.rosterSource` distinguishes admin overrides,
auto-balance, mandatory owner retention, optional retention, and future auction
allocation. Owner and retention operations atomically create protected
memberships.

The auction pool contains registered participants with no Festival Team
membership. Team remaining purse is derived from configured budget minus owner
cost and retention amounts. No legacy auction table is modified.

## 16. Phase 3B Main Festival Live Auction

`FestivalAuctionConfigs` gains:

| Column | Constraint |
|---|---|
| `auctionStatus` | `setup | live | paused | completed`, required |
| `currentParticipantId` | nullable FK FestivalParticipants |
| `startedAt` | nullable timestamp |
| `completedAt` | nullable timestamp |

New `FestivalAuctions` records one admin-started round per participant. Unique
`(festivalId, festivalParticipantId)` prevents re-auction.

New `FestivalAuctionBids` stores immutable integer amounts and server-derived
Festival Team, owner assignment, and authenticated User references. Unique
`(festivalAuctionId, amount)` rejects duplicate values.

New `FestivalAuctionResults` stores `sold | unsold`, optional winning team,
winning bid, final amount, and finalizer. Unique festival participant and
auction indexes prevent duplicate finalization.

Sold spending is derived from result amounts in addition to owner and retention
costs. Finalization atomically writes the result and auction-sourced membership.
The migration is additive and has no foreign keys to legacy auction tables.

## 17. Phase 3C Festival Roster Workflow Consolidation

Additive migration:

```text
Festivals
  rosterFormationMode ENUM(auction, manual)
  NOT NULL
  DEFAULT auction
```

Index: `festivals_roster_formation_mode_idx`.

All existing rows are backfilled to `auction`; no Team membership, owner,
retention, bid, result, or legacy Tournament data is changed. The migration
checks for the column and index before creating them.

Lifecycle ownership:

```text
Festival.status                     registration/configuration
Festival.teamAssignmentStatus       manual roster formation only
FestivalAuctionConfig.auctionStatus Main Auction activity only
```

The single-roster invariant remains the unique
`(festivalId, festivalParticipantId)` membership constraint.
