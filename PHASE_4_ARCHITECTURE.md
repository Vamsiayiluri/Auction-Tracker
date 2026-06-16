# Phase 4 Architecture

## Scope

Phase 4 introduces the Sport Tournament Architecture and Sport Auction
Foundation beneath completed Festival Team rosters.

This phase does not implement:

- Competition formats or a competition engine
- Fixtures, matches, venues, schedules, or score entry
- Points tables, standings, rankings, or progression
- Semi-finals, finals, or tournament brackets
- Cross-Festival or legacy Tournament integration

In this document, "results" means Sport Auction sold/unsold allocation results,
not match or competition results.

## 1. Business Flow

The required hierarchy is:

```text
Festival
  -> Festival Team
      -> Sport Tournament
          -> Sport Teams
              -> Captain
              -> Sport Team Members
          -> Sport Auction
```

Example:

```text
Corporate Festival 2027
  -> Trojans
      -> Cricket Men
          -> Cricket Team A
          -> Cricket Team B
          -> Cricket Team C
      -> Volleyball Men
          -> Volleyball Team A
          -> Volleyball Team B
          -> Volleyball Team C
  -> Demons
      -> Cricket Men
      -> Volleyball Men
```

The recommended business sequence is:

1. Festival Auction completes and `FestivalTeamMemberships` contains the
   authoritative primary Festival rosters.
2. A Festival Team Owner opens the Sport Tournaments workspace for the Festival
   Team they own.
3. The Owner creates a Sport Tournament from a Sport enabled for the Festival,
   such as Cricket Men.
4. The Owner configures the participant eligibility rule, Team count, Team
   budget, auction increment, and auction settings.
5. The Owner creates the internal Sport Teams.
6. The Owner assigns one Captain to each Sport Team.
7. Captain assignment automatically places that Employee on the assigned Sport
   Team roster and excludes the Captain from the auction pool.
8. The server derives the eligible participant pool from the parent Festival
   Team roster and the participant's registered Sport.
9. The Owner reviews server-derived readiness and starts the Sport Auction.
10. Captains bid for their own Sport Teams.
11. The Owner or an explicitly assigned Sport Tournament Manager controls the
    auction lifecycle and finalizes sold or unsold participants.
12. Sold participants become Sport Team Members. Auction history and allocation
    results remain tournament-scoped and immutable.

Each Festival Team runs its Sport Tournaments independently. Trojans Cricket
and Demons Cricket never share Teams, budgets, pools, bids, or auction state.

## 2. User Roles

Keep the existing global `User.role` values:

- `admin`
- `team_owner`
- `spectator`

Do not add `captain`, `sport_manager`, or another global User role.

Global roles remain coarse login categories. Business authority is derived
from assignments connected to the authenticated User's Employee:

```text
User
  -> Employee
      -> Festival Participant
          -> Festival Team Owner
          -> Sport Tournament Manager
          -> Sport Team Captain
```

An Employee may simultaneously be:

- A Festival Participant
- A Festival Team Member
- A Festival Team Owner
- A participant in multiple Sports
- A Sport Tournament Manager
- A Captain in one Sport Tournament
- A regular member or Captain in another Sport Tournament

These are assignments, not mutually exclusive person types.

The global `team_owner` role alone does not grant access to a Festival Team or
Sport Tournament. The relevant active assignment must exist.

## 3. Assignment Model

### Festival Team Owner

Continue using `FestivalTeamOwners`.

An active Festival Team Owner is the default mini-admin for every Sport
Tournament under that Owner's Festival Team. No duplicate manager assignment is
required for the Owner to exercise this authority.

Authorization chain:

```text
Authenticated User
  -> linked Employee
  -> Festival Participant
  -> active FestivalTeamOwner
  -> parent Festival Team
  -> child Sport Tournament
```

### Sport Tournament Manager

Add `SportTournamentManagers` for explicit delegation.

A Manager:

- Is a normal Employee and Festival Participant
- Must belong to the parent Festival Team roster
- May configure and operate only the assigned Sport Tournament
- Does not gain authority over other Sport Tournaments or Festival Teams
- Does not automatically become a Sport participant or Sport Team member

Recommended manager types:

- `primary`
- `delegate`

The Festival Team Owner remains authoritative even when Managers are assigned.

### Sport Team Captain

Add `SportTeamCaptains`.

A Captain:

- Is a normal Employee and Festival Participant
- Must satisfy the Sport Tournament eligibility rules
- Must belong to the parent Festival Team roster
- Must be registered for the Tournament's Sport
- May Captain only one Sport Team in the same Sport Tournament
- May Captain Teams in different Sport Tournaments
- Is automatically a member of the Captain's Sport Team
- Bids only for the Captain's assigned Sport Team

Recommended Captain status:

- `active`
- `inactive`

Do not accept Captain, Employee, or Team identity from a bid request.

## 4. Database Design

### Design Principles

- `Employee` remains the canonical person.
- Existing Festival tables remain the source of parent roster and Sport
  registration truth.
- Sport Tournament data is additive and isolated from legacy `Tournaments`,
  `Teams`, `Players`, `Auctions`, and `Bids`.
- Every Sport entity is explicitly scoped by `sportTournamentId`.
- Frequently queried child rows should also retain `festivalId` and
  `festivalTeamId` when this materially improves authorization and integrity
  checks.
- Monetary/allocation values use integer `BIGINT`.
- Sport Auction budget represents internal allocation credits, not a second
  financial purchase of the Employee.
- Multi-row setup, bidding, and finalization operations use Sequelize
  transactions and row locks.
- Schema changes use explicit migrations. Do not use `sequelize.sync()` or
  startup backfills.

### Sport Tournament

`SportTournaments` represents one independently managed Sport and division
under one Festival Team.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `festivalId` | Explicit Festival scope |
| `festivalTeamId` | Parent franchise, such as Trojans |
| `festivalSportId` | Enabled Festival Sport |
| `sportId` | Catalog Sport for direct validation/querying |
| `name` | Display name, such as Cricket Men |
| `code` | Parent-Team-scoped stable code |
| `division` | `men`, `women`, `mixed`, or `open` |
| `participantGenderRule` | `male`, `female`, or `any` |
| `status` | `draft`, `setup`, `auction_live`, `auction_paused`, `auction_completed`, `archived` |
| `teamCount` | Required internal Team count |
| `createdByUserId` | Audit identity |
| `createdAt`, `updatedAt` | Timestamps |

`division` is a business label. `participantGenderRule` is the actual
eligibility rule and uses canonical `Employees.gender`. For example, Cricket
Men normally uses `division=men` and `participantGenderRule=male`.

Recommended uniqueness:

- `(festivalTeamId, code)`
- `(festivalTeamId, festivalSportId, division)`

### Sport Team

`SportTeams` represents internal Teams within one Sport Tournament.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Tournament scope |
| `festivalId` | Festival scope |
| `festivalTeamId` | Parent Festival Team scope |
| `name` | Team A, Team B, Team C |
| `code` | Stable Tournament-scoped code |
| `color`, `logoUrl` | Optional presentation metadata |
| `status` | `active` or `inactive` |

Recommended uniqueness:

- `(sportTournamentId, name)`
- `(sportTournamentId, code)`

### Sport Team Membership

`SportTeamMemberships` is the authoritative Sport roster.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Tournament scope |
| `sportTeamId` | Assigned internal Team |
| `festivalParticipantId` | Reuses the Festival participant identity |
| `source` | `captain_assignment`, `auction`, or `admin_override` |
| `assignedByUserId` | Audit identity |
| `assignedAt` | Assignment timestamp |

Required uniqueness:

- `(sportTournamentId, festivalParticipantId)`

This prevents an Employee from joining two Teams in the same Sport Tournament
while allowing the same Employee to join Teams in Cricket and Volleyball.

### Sport Team Captain

`SportTeamCaptains` is an assignment table, not a User type.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Tournament scope |
| `sportTeamId` | Captained Team |
| `festivalParticipantId` | Captain's Festival participant |
| `status` | `active` or `inactive` |
| `assignedByUserId` | Owner/Manager who assigned the Captain |
| `assignedAt` | Assignment timestamp |

Required uniqueness:

- One active Captain per `sportTeamId`
- `(sportTournamentId, festivalParticipantId)` unique

Captain assignment and the corresponding
`SportTeamMembership(source=captain_assignment)` must be created or changed in
one transaction.

### Sport Tournament Manager

`SportTournamentManagers` delegates mini-admin operations.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Managed Tournament |
| `festivalParticipantId` | Assigned Employee in Festival context |
| `managerType` | `primary` or `delegate` |
| `status` | `active` or `inactive` |
| `assignedByUserId` | Festival Team Owner or admin |
| `assignedAt` | Assignment timestamp |

Required uniqueness:

- `(sportTournamentId, festivalParticipantId)`

### Sport Auction Configuration

`SportAuctionConfigs` stores one auction configuration per Sport Tournament.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Unique Tournament scope |
| `defaultTeamBudget` | Default allocation credits per Team |
| `incrementPercentage` | Fixed 20 or 25 percent unless requirements change |
| `auctionStatus` | `setup`, `live`, `paused`, or `completed` |
| `currentParticipantId` | Active Festival Participant |
| `startedAt`, `completedAt` | Lifecycle timestamps |
| `configuredByUserId` | Audit identity |

### Sport Team Budget

`SportTeamBudgets` stores each Team's independent allocation.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Tournament scope |
| `sportTeamId` | Unique Team scope |
| `allocatedAmount` | Team allocation credits |
| `adjustmentAmount` | Audited pre-auction correction, default zero |
| `configuredByUserId` | Audit identity |

Required uniqueness:

- `(sportTournamentId, sportTeamId)`

Do not store a mutable `amountSpent` as the primary source of truth. Derive:

```text
spent = sum(sold SportAuctionResults.finalAmount for Team)
remaining = allocatedAmount + adjustmentAmount - spent
```

This follows the current Festival derived-budget pattern and avoids drift.
Future production hardening may add an immutable budget ledger without changing
the auction ownership model.

### Sport Auction Pool

`SportAuctionPools` is a persisted operational snapshot, not the eligibility
source of truth.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Primary key |
| `sportTournamentId` | Tournament scope |
| `festivalParticipantId` | Eligible participant |
| `state` | `available`, `sold`, or `unsold` |
| `reauctionCount` | Number of explicit requeues |
| `generatedAt`, `lastReauctionedAt` | Audit timestamps |

Required uniqueness:

- `(sportTournamentId, festivalParticipantId)`

Every pool generation/read must revalidate authoritative eligibility.

### Sport Auction Round

`SportAuctions` stores numbered attempts.

Recommended fields mirror the stabilized Festival Auction:

- `id`
- `sportTournamentId`
- `festivalParticipantId`
- `attemptNumber`
- `status`: `live`, `paused`, `pending`, `sold`, `unsold`
- `basePrice`
- `startedByUserId`
- `startedAt`
- `endsAt`
- `pausedRemainingMs`
- `finalizedByUserId`
- `finalizedAt`

Required uniqueness:

- `(sportTournamentId, festivalParticipantId, attemptNumber)`

### Sport Auction Bid

`SportAuctionBids` stores accepted Captain bids.

Recommended fields:

- `id`
- `sportTournamentId`
- `sportAuctionId`
- `festivalParticipantId`
- `sportTeamId`
- `sportTeamCaptainId`
- `placedByUserId`
- `amount`
- `placedAt`

The Team and Captain assignment are server-derived.

Recommended uniqueness:

- `(sportAuctionId, amount)`

### Sport Auction Result

`SportAuctionResults` stores the immutable result for one attempt.

Recommended fields:

- `id`
- `sportTournamentId`
- `sportAuctionId`
- `festivalParticipantId`
- `outcome`: `sold` or `unsold`
- `sportTeamId`, nullable for unsold
- `winningBidId`, nullable for unsold
- `finalAmount`, nullable for unsold
- `finalizedByUserId`
- `finalizedAt`

Required uniqueness:

- `sportAuctionId`

Sold finalization creates the result and Sport Team membership in one
transaction.

### Sport Operation Audit

`SportOperationAudits` should record high-value setup and lifecycle actions:

- Tournament created or updated
- Manager assigned or removed
- Team created, updated, or deactivated
- Captain assigned, replaced, or deactivated
- Budget configured or adjusted
- Pool generated or participant requeued
- Auction started, paused, resumed, or completed
- Participant sold or unsold

This is especially important because Festival Team Owners and delegated
Managers act with admin-like authority.

## 5. Tables Required

Phase 4 foundation tables:

1. `SportTournaments`
2. `SportTournamentManagers`
3. `SportTeams`
4. `SportTeamCaptains`
5. `SportTeamMemberships`
6. `SportAuctionConfigs`
7. `SportTeamBudgets`
8. `SportAuctionPools`
9. `SportAuctions`
10. `SportAuctionBids`
11. `SportAuctionResults`
12. `SportOperationAudits`

Existing tables reused without duplicating identity:

- `Users`
- `Employees`
- `Sports`
- `Festivals`
- `FestivalSports`
- `FestivalParticipants`
- `FestivalParticipantSports`
- `FestivalTeams`
- `FestivalTeamMemberships`
- `FestivalTeamOwners`

Sport retentions are not required for the initial Phase 4 foundation. If the
business later approves pre-auction Sport allocations, add a separate
`SportRetentions` table and treat it as another Sport Team membership source.
Do not overload Festival retentions.

## 6. Entity Relationships

```text
User 0..1 ---------------- 0..1 Employee
Employee 1 ---------------- * FestivalParticipant

Festival 1 ---------------- * FestivalTeam
Festival 1 ---------------- * FestivalSport -------- 1 Sport
FestivalParticipant 1 ----- * FestivalParticipantSport
FestivalParticipant 1 ----- 0..1 FestivalTeamMembership per Festival
FestivalTeam 1 ------------ * FestivalTeamMembership
FestivalTeam 1 ------------ 0..1 FestivalTeamOwner

FestivalTeam 1 ------------ * SportTournament
FestivalSport 1 ----------- * SportTournament

SportTournament 1 --------- * SportTournamentManager
FestivalParticipant 1 ----- * SportTournamentManager

SportTournament 1 --------- * SportTeam
SportTournament 1 --------- 0..1 SportAuctionConfig
SportTournament 1 --------- * SportAuctionPool
SportTournament 1 --------- * SportAuction
SportTournament 1 --------- * SportOperationAudit

SportTeam 1 --------------- 0..1 active SportTeamCaptain
FestivalParticipant 1 ----- * SportTeamCaptain
SportTeam 1 --------------- 1 SportTeamBudget
SportTeam 1 --------------- * SportTeamMembership
FestivalParticipant 1 ----- * SportTeamMembership

SportAuction 1 ------------ * SportAuctionBid
SportAuction 1 ------------ 0..1 SportAuctionResult
SportTeamCaptain 1 -------- * SportAuctionBid
SportTeam 1 --------------- * SportAuctionBid
SportTeam 1 --------------- * sold SportAuctionResult
```

## 7. API Design

Use an additive `/api/v2` surface. Nested paths make the ownership boundary
visible, while resource IDs are still validated against every parent ID.

### Sport Tournament Management

```text
POST   /api/v2/festivals/:festivalId/teams/:festivalTeamId/sport-tournaments
GET    /api/v2/festivals/:festivalId/teams/:festivalTeamId/sport-tournaments
GET    /api/v2/sport-tournaments/:sportTournamentId
PATCH  /api/v2/sport-tournaments/:sportTournamentId
POST   /api/v2/sport-tournaments/:sportTournamentId/archive
```

Create and update require admin, active parent Festival Team Owner, or active
assigned Manager as allowed by the permission matrix. Only admin or the parent
Owner should be able to assign Managers.

### Manager Assignments

```text
POST   /api/v2/sport-tournaments/:sportTournamentId/managers
GET    /api/v2/sport-tournaments/:sportTournamentId/managers
PATCH  /api/v2/sport-tournaments/:sportTournamentId/managers/:managerId
DELETE /api/v2/sport-tournaments/:sportTournamentId/managers/:managerId
```

### Sport Teams and Captains

```text
POST   /api/v2/sport-tournaments/:sportTournamentId/teams
GET    /api/v2/sport-tournaments/:sportTournamentId/teams
PATCH  /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId
DELETE /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId

POST   /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
GET    /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
DELETE /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
```

Captain assignment accepts only `festivalParticipantId`. User and Employee
identity are resolved by the server.

### Eligibility, Rosters, Budget, and Readiness

```text
GET    /api/v2/sport-tournaments/:sportTournamentId/eligible-participants
GET    /api/v2/sport-tournaments/:sportTournamentId/rosters
PATCH  /api/v2/sport-tournaments/:sportTournamentId/auction-config
PATCH  /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/budget
GET    /api/v2/sport-tournaments/:sportTournamentId/auction-pool
GET    /api/v2/sport-tournaments/:sportTournamentId/auction/readiness
```

The eligibility response should include reason codes for excluded
participants, at least for authorized setup users:

- `NOT_ON_PARENT_FESTIVAL_TEAM`
- `SPORT_NOT_REGISTERED`
- `GENDER_RULE_MISMATCH`
- `PARTICIPANT_WITHDRAWN`
- `ALREADY_ASSIGNED`
- `CAPTAIN_ASSIGNED`
- `ALREADY_SOLD`

### Sport Auction Lifecycle

```text
POST /api/v2/sport-tournaments/:sportTournamentId/auction/start
POST /api/v2/sport-tournaments/:sportTournamentId/auction/pause
POST /api/v2/sport-tournaments/:sportTournamentId/auction/resume
POST /api/v2/sport-tournaments/:sportTournamentId/auction/extend
POST /api/v2/sport-tournaments/:sportTournamentId/auction/complete
POST /api/v2/sport-tournaments/:sportTournamentId/auction/reauction

POST /api/v2/sport-tournaments/:sportTournamentId/auction/participants/:participantId/start
POST /api/v2/sport-tournaments/:sportTournamentId/auction/participants/:participantId/sell
POST /api/v2/sport-tournaments/:sportTournamentId/auction/participants/:participantId/unsold

POST /api/v2/sport-tournaments/:sportTournamentId/auction/bid
GET  /api/v2/sport-tournaments/:sportTournamentId/auction/current
GET  /api/v2/sport-tournaments/:sportTournamentId/auction/history
GET  /api/v2/sport-tournaments/:sportTournamentId/auction/results
```

Recommended bid body:

```json
{
  "auctionId": "sport-auction-id",
  "expectedCurrentBid": 100
}
```

Do not accept `sportTeamId`, `captainId`, `employeeId`, `userId`, or a proposed
bid amount. The server derives the Captain and Team and calculates the exact
next bid.

### Socket.IO

Use authenticated rooms:

```text
sport-auction:<sportTournamentId>
```

Client events:

- `join-sport-auction`
- `leave-sport-auction`

Server events should mirror Festival semantics with Sport-specific room scope:

- `auction-started`
- `participant-started`
- `bid-placed`
- `auction-timer-updated`
- `auction-pending-finalization`
- `auction-paused`
- `auction-resumed`
- `auction-extended`
- `participant-sold`
- `participant-unsold`
- `auction-completed`

Room join authorization should confirm the authenticated viewer can view the
parent Festival and Sport Tournament. All mutation identity remains
server-derived.

## 8. UI Flow

### Navigation

Add a Sport Tournaments area beneath the Festival Team context. Do not place
Sport setup inside the global legacy Tournament screens.

Recommended entry points:

- Admin: Festival Workspace -> Festival Teams -> Sport Tournaments
- Festival Team Owner: My Festival Team -> Sport Tournaments
- Captain: My Sport Teams -> selected Sport Tournament
- Spectator: Festival -> Sport Tournaments -> read-only auction

### Sport Tournament Workspace

Reuse the Festival workspace pattern:

```text
Sport Tournament Control Center
  Operations View
    Overview
    Teams
    Captains
    Auction
    Bid History
    Auction Results
    Audit

  Edit Sport Tournament Configuration
    1. Tournament Details
    2. Eligibility
    3. Teams
    4. Captains
    5. Budgets
    6. Auction Pool
    7. Review & Launch
```

Only one setup step should be mounted at a time. Completion and readiness must
come from the backend rather than frontend inference.

### Read-Only Views

Spectators and non-assigned participants may see only authorized read models:

- Tournament overview
- Sport Teams and rosters
- Live auction
- Bid history
- Auction allocation results

Frontend hidden controls are UX only. Backend authorization remains mandatory.

## 9. Captain Workflow

1. Employee exists and is a registered Festival Participant.
2. Employee belongs to the parent Festival Team.
3. Employee is registered for the Sport and satisfies the Tournament's
   eligibility rule.
4. Owner or Manager assigns the Employee as Captain of one Sport Team.
5. The assignment transaction creates the Captain assignment and Captain
   roster membership.
6. The Employee's linked User logs in.
7. The Captain opens the assigned Sport Tournament.
8. The server resolves the active Captain assignment and assigned Sport Team.
9. During a live round, the Captain clicks one server-calculated bid action.
10. The server validates stale state, Captain assignment, Team budget, and
    Tournament scope before accepting the bid.
11. The Captain can view the assigned Team roster, spent allocation, remaining
    allocation, bid activity, and auction outcomes.

Captain restrictions:

- One Team per Sport Tournament
- No bidding for another Team
- No auction lifecycle or finalization authority unless the same Employee also
  holds an active Manager or parent Owner assignment
- No authority derived merely from global `team_owner`

## 10. Team Owner Workflow

1. Owner opens the Festival Team they actively own.
2. Owner creates a Sport Tournament using a Festival-enabled Sport.
3. Owner selects division and the server-enforced gender rule.
4. Owner defines Team count and creates internal Sport Teams.
5. Owner configures independent Team allocation budgets.
6. Owner assigns eligible Captains.
7. Owner optionally delegates operations to Sport Tournament Managers.
8. Owner reviews eligibility, pool, Teams, Captains, budgets, and blockers.
9. Owner starts, pauses, resumes, extends, and completes the Sport Auction.
10. Owner starts participant rounds and finalizes sold or unsold outcomes.
11. Owner views rosters, bids, allocation results, and operation audits.

The Owner's authority is limited to Sport Tournaments whose
`festivalTeamId` matches the active `FestivalTeamOwner` assignment.

## 11. Budget Flow

Sport allocation is independent from Festival Auction spending.

Example:

```text
Festival Auction
  Trojans primary roster budget: 20,000

Trojans Cricket Men
  Cricket Team A: 500 credits
  Cricket Team B: 500 credits
  Cricket Team C: 500 credits

Trojans Volleyball Men
  Volleyball Team A: 300 credits
  Volleyball Team B: 300 credits
  Volleyball Team C: 300 credits
```

No Sport bid or result updates Festival budget tables.

Recommended calculations:

```text
allocated = SportTeamBudget.allocatedAmount + adjustmentAmount
spent = sum(sold SportAuctionResult.finalAmount for the Sport Team)
remaining = allocated - spent
```

Budget validation occurs:

- When configuring Team budgets
- When accepting every bid
- Again during sold finalization

Both bid acceptance and finalization must lock the relevant Sport Auction,
Sport Team budget row, and current result state inside a transaction.

Captain assignment has zero allocation cost in the initial architecture and
places the Captain directly on the roster. A future configurable Captain cost
must be an explicit schema and business-rule change, not an implicit deduction.

## 12. Auction Flow

### Eligibility

A Festival Participant is eligible only when all are true:

1. `FestivalParticipant.status = registered`.
2. A `FestivalTeamMembership` places the participant on the Sport
   Tournament's parent Festival Team.
3. `FestivalParticipantSports` contains the Sport Tournament's `sportId`.
4. `Employee.employmentStatus = active`.
5. `Employee.gender` satisfies `participantGenderRule`.
6. The participant has no Sport Team membership in this Sport Tournament.
7. The participant is not an assigned Captain in this Sport Tournament.
8. The participant has no terminal sold result in this Sport Tournament.

The critical query is:

```text
Parent Festival Team Members
INTERSECT
Registered Participants for Sport
INTERSECT
Tournament eligibility rule
MINUS
Captains and existing Sport Team Members
```

### Readiness

Auction start requires:

- Active Sport Tournament
- Valid parent Festival Team
- Festival Auction/roster in a state approved for Sport allocation
- Configured Team count
- Exact required number of active Sport Teams
- One active eligible Captain per active Sport Team
- Budget row for every active Sport Team
- Positive integer allocations
- Non-empty eligible pool
- No existing live or pending round

The exact parent Festival readiness gate should be implemented as a policy
helper. Recommended initial rule: the Main Festival Auction must be
`completed`, because Sport eligibility depends on the final parent roster.

### Round and Bid Lifecycle

Reuse the stabilized Festival behavior:

```text
overall:
setup -> live -> paused -> live -> completed

round:
live -> paused -> live
live -> pending -> live (extend)
pending -> sold | unsold
```

- Owner/Manager selects a participant and enters a positive integer base price.
- The server creates a numbered attempt and persisted 20-second deadline.
- Captain bid requests include observed auction ID and current bid only.
- Server calculates the next bid from the configured increment percentage.
- Accepted bid and deadline reset commit in one transaction.
- Expiry locks bidding and requires Owner/Manager finalization.
- Unsold is allowed only when the round has no accepted bid.
- Sold is allowed only when a valid highest bid exists.
- Sold finalization creates the immutable result and Sport Team membership.
- Unsold can be explicitly requeued while preserving every prior attempt.
- Completion requires no active participant. Pool exhaustion policy should be
  explicit rather than inferred.

## 13. Permission Matrix

| Action | Admin | Parent Festival Team Owner | Sport Tournament Manager | Assigned Captain | Spectator |
|---|---:|---:|---:|---:|---:|
| View authorized Sport Tournament | Yes | Yes | Yes | Yes | Yes |
| Create Sport Tournament | Yes | Yes | No | No | No |
| Edit setup | Yes | Yes | Yes | No | No |
| Archive Tournament | Yes | Yes | No | No | No |
| Assign/remove Manager | Yes | Yes | No | No | No |
| Create/update Sport Teams | Yes | Yes | Yes | No | No |
| Assign/replace Captain | Yes | Yes | Yes | No | No |
| Configure budgets | Yes | Yes | Yes | No | No |
| View eligibility/readiness | Yes | Yes | Yes | Own Tournament | Read-only summary |
| Start/pause/resume Auction | Yes | Yes | Yes | No | No |
| Start participant round | Yes | Yes | Yes | No | No |
| Place bid | No | Only if also assigned Captain | Only if also assigned Captain | Yes | No |
| Sell/mark unsold | Yes | Yes | Yes | No | No |
| Complete Auction | Yes | Yes | Yes | No | No |
| View bids/results | Yes | Yes | Yes | Yes | Yes |
| View operation audit | Yes | Yes | Yes | No | No |

Every "Yes" is subject to matching Festival, parent Festival Team, and Sport
Tournament scope. The backend must evaluate assignments for every mutation.

## 14. Migration Strategy

Use additive, ordered, recovery-safe migrations.

Recommended migration sequence:

1. `sport-tournament-foundation`
   - Create `SportTournaments`
   - Create `SportTournamentManagers`
   - Create `SportTeams`
2. `sport-team-assignments`
   - Create `SportTeamCaptains`
   - Create `SportTeamMemberships`
3. `sport-auction-foundation`
   - Create `SportAuctionConfigs`
   - Create `SportTeamBudgets`
   - Create `SportAuctionPools`
4. `sport-live-auction`
   - Create `SportAuctions`
   - Create `SportAuctionBids`
   - Create `SportAuctionResults`
5. `sport-operation-audits`
   - Create `SportOperationAudits`

Migration requirements:

- Check table, column, index, and foreign-key existence where MySQL partial DDL
  application can occur.
- Add foreign keys only after checking for orphaned data.
- Use explicit unique indexes for Captain and membership restrictions.
- Do not backfill Sport Tournaments from legacy `Tournaments`.
- Do not copy Employees into Captain or Manager tables.
- Do not create Sport Auction rows for existing Festivals automatically.
- Verify migration status before and after application.
- Provide rollback guards when dropping a table would discard active Sport
  Tournament or auction history.

No existing Festival or legacy auction table needs to be repurposed.

## 15. Reuse Opportunities from Festival Auction

### Reuse Directly

The following pure helpers are suitable for direct reuse or small
domain-neutral extraction:

| Current file | Reuse |
|---|---|
| `src/utils/festivalAuctionTimer.js` | Persisted 20-second deadline creation and remaining-time calculation |
| `src/utils/festivalBidProgression.js` | Fixed base-price percentage increment calculation |
| `src/utils/festivalAuctionBudget.js` | Derived total/spent/remaining budget calculation pattern |
| `src/utils/festivalAudit.js` | Audit payload conventions after generalizing entity scope |
| `src/middleware/auth.middleware.js` | JWT authentication and global-role baseline |
| `src/middleware/validate.middleware.js` | Zod request validation |
| `src/webSocket/socket.js` | Authenticated singleton connection and room event wiring pattern |

Before Sport implementation, rename or wrap Festival-named pure helpers behind
domain-neutral modules where doing so does not alter Festival behavior. For
example:

```text
auctionTimer.js
allocationBudget.js
percentageBidProgression.js
assignmentAuthorization.js
```

Keep compatibility exports for existing Festival imports during extraction.

### Reuse as a Pattern, Not by Calling Festival Controllers

| Current file | Pattern to reuse |
|---|---|
| `festivalMainAuction.controller.js` | Assignment setup, transactional owner/cost operations, derived pool and budget responses |
| `festivalLiveAuction.controller.js` | Stale bid checks, atomic bid/deadline reset, persisted timer recovery, pause/resume/extend, finalization transaction, re-auction attempts |
| `festivalTeam.controller.js` | Scoped Team CRUD, uniqueness handling, membership transactions |
| `festivalReadiness.js` | Server-authored blockers, counts, Team readiness, setup-step completion |
| `festivalLocking.js` | Central lifecycle mutation guards |
| `festivalResponse.js` | Sanitized DTO approach |
| `festival.validation.js` | Zod schema composition and parent/path validation |
| `festivalRoutes.js` | Thin routes with auth, assignment middleware/controller checks, validation, and controller separation |

Do not import and execute Festival controller functions from Sport routes. The
models, field names, authorization chain, pool eligibility, Captain bidding,
and budget scope differ.

The current Festival controllers are large. Phase 4 should first extract shared
auction orchestration into focused services, for example:

- `auctionDeadlineService`
- `auctionBidService`
- `auctionFinalizationService`
- `assignmentAuthorizationService`
- `readinessBuilder`

Each service should receive model adapters or domain-specific callbacks rather
than branching on a `type = festival | sport` flag throughout one controller.

### Frontend Reuse

| Current component/page | Reuse |
|---|---|
| `FestivalControlCenter.jsx` | Control Center layout and state-driven quick actions |
| `FestivalSetupWizard.jsx` | One-step setup workflow and persisted step selection |
| `FestivalAuctionSetup.jsx` | Team, Captain/Owner, budget, and pool configuration interaction patterns |
| `MainFestivalAuction.jsx` | Live round, timer, one-click bid, Team summaries, and lifecycle controls |
| `FestivalTeamsDirectory.jsx` | Expandable Team summaries and roster display |
| `FestivalBidHistory.jsx` | Participant-first bid history and View Bids dialog |
| `FestivalHistory.jsx` | Sold/unsold result and audit separation |
| `FestivalDetail.jsx` | Configuration versus Operations workspace shell |
| `FestivalLiveAuctionPage.jsx` | Assignment-sensitive Owner/Captain and spectator tabs |

Extract reusable presentation components only where props can express the
domain cleanly. Do not make Sport components depend on Festival API paths or
Festival Team Owner terminology.

### Models That Must Stay Separate

Do not reuse these Festival persistence models for Sport allocation:

- `FestivalTeam`
- `FestivalTeamMembership`
- `FestivalTeamOwner`
- `FestivalAuctionConfig`
- `FestivalAuctionPool`
- `FestivalAuction`
- `FestivalAuctionBid`
- `FestivalAuctionResult`

They remain the parent Festival roster and Main Festival Auction history.
Sport allocation requires separate tables to preserve independent Teams,
Captains, budgets, pools, and results.

## 16. Risks

### Authorization Ambiguity

One Employee may hold Owner, Manager, Captain, and participant assignments.
Every endpoint must evaluate the permission required for that action rather
than selecting one "current role."

### User Link Availability

An Employee assignment can exist without a linked User. Such an assignment is
valid business data but cannot perform interactive login actions. Readiness
must distinguish assignment existence from login readiness.

### Parent Roster Mutation

Sport eligibility depends on `FestivalTeamMemberships`. Post-Festival roster
corrections could invalidate Captains, memberships, or pool entries. Once a
Sport Auction starts, parent roster changes affecting that Sport Tournament
must be blocked or require an explicit audited recovery workflow.

### Gender Data Quality

Existing Employee rows backfilled to `male` may be marked `needs_review`.
Gender-filtered Sport Tournaments should not treat unreviewed placeholder data
as trustworthy. Readiness should block affected participants or require admin
review before pool generation.

### Captain Replacement

Replacing a Captain after bidding starts can break bid attribution and roster
integrity. Captain replacement should be allowed during setup only. Later
replacement requires an audited operation that preserves historical Captain
references.

### Budget Drift

Mutable spent fields can diverge from results. Spending should remain derived
and finalization must revalidate the highest bid against the latest remaining
allocation.

### Timer and Scale Limitations

Festival timers are process-local schedulers over persisted deadlines. Sport
Auction can reuse this for the current single-process deployment, but
horizontal scaling still requires shared timers/leases and a Socket.IO adapter.

### Controller Duplication

Copying the Festival controllers would duplicate complex expiry, stale-state,
locking, and finalization behavior. Shared services should be extracted before
the live Sport Auction implementation.

### Query Fan-Out

The current Festival UI sometimes loads Owner and Team details through multiple
requests. Sport Tournament pages should prefer summary endpoints for Teams,
Captains, budgets, roster counts, and readiness.

### Terminology Collision

Legacy `Tournament` means the original auction product. `SportTournament`
belongs to the Festival domain. API, model, and UI names must stay explicit to
avoid accidental cross-domain queries.

### Competition Scope Leakage

Do not add format, fixture, match, score, standings, stage, round, semi-final,
or final columns to `SportTournaments` during this phase. Those belong to the
future Competition Engine.

## 17. Recommended Implementation Order

1. **Shared extraction with no behavior change**
   - Extract domain-neutral timer, bid progression, assignment authorization,
     readiness, and transaction helpers.
   - Keep Festival compatibility exports and run all Festival regression tests.

2. **Sport Tournament foundation**
   - Add `SportTournaments` and `SportTournamentManagers`.
   - Add parent Owner/Manager authorization helpers.
   - Add create, read, update, list, and archive APIs.

3. **Sport Team foundation**
   - Add `SportTeams`.
   - Add Team CRUD and exact Team-count readiness.

4. **Eligibility service**
   - Implement the authoritative parent Festival roster plus Sport registration
     plus gender-rule query.
   - Return explicit inclusion/exclusion reason codes.

5. **Captain and membership foundation**
   - Add `SportTeamCaptains` and `SportTeamMemberships`.
   - Implement transactional Captain assignment and one-Captain-per-Tournament
     enforcement.

6. **Budget and auction configuration**
   - Add `SportAuctionConfigs` and `SportTeamBudgets`.
   - Implement derived Team allocation summaries and readiness blockers.

7. **Auction pool foundation**
   - Add `SportAuctionPools`.
   - Implement generation, synchronization, and immutable eligibility checks.

8. **Sport Tournament workspace UI**
   - Add Owner/Manager setup workspace, Control Center, setup wizard, Team and
     Captain management, budgets, pool, and readiness.
   - Do not add live bidding before readiness and authorization are tested.

9. **Live Sport Auction persistence and services**
   - Add rounds, bids, results, timer recovery, stale-state checks, and
     transactional finalization.

10. **Captain bidding and Socket.IO**
    - Add server-derived Captain/Team identity, authenticated room access,
      one-click bids, and Sport Tournament scoped events.

11. **Read-only history and auction results**
    - Add Team rosters, bid history, sold/unsold allocation results, and audit
      views.

12. **Hardening**
    - Add integration tests for cross-Team and cross-Tournament authorization,
      duplicate Captain prevention, eligibility, budget races, stale bids,
      timer recovery, and finalization atomicity.
    - Run migrations, backend tests, frontend lint, and production build.

Competition Engine work starts only after the Sport Tournament, Team, Captain,
budget, eligibility, and Sport Auction foundations are complete and stable.
