# Final Project Handoff

## Employee Gender Foundation

Completed on: 2026-06-14

`Employees.gender` is now the required canonical source for Male/Female
classification. Festival Participants and auction records do not duplicate the
field; responses derive it from Employee. Employee create/edit, search filters,
CSV import/template, CSV export, Festival participant views, migration, tests,
and documentation were updated.

Migration `202606140001-employee-gender.js` stages nullable column creation,
backfills legacy rows, enforces `NOT NULL`, and adds an index. Because no prior
gender source existed, backfilled rows use `male` as a placeholder and are
marked `needs_review`; admins must verify them.

No Phase 4, Sport Team, Sport Auction, or Competition Engine work was added.

## Festival Workspace Enhancement

Completed on: 2026-06-11

- Admins have Operations View and Edit Festival Configuration.
- Operations becomes the default after auction launch.
- Locked configuration remains accessible without bypassing backend guards.
- Admins have dedicated Teams, Bid History, Results, and Audit views.
- Owners have Overview, My Team, Auction, and Bid History tabs.
- Spectators have Overview, Live Auction, Teams, Results, and History tabs.
- Viewer sections are lazy mounted and fetch their own existing API data.

Festival Auction read-only UX now follows the established Tournament Auction
patterns. Teams use expandable summary rows. Bid History uses an auctioned
participant list with a View Bids dialog containing base price, sold price,
sold Team, complete ordered bids, and timestamps. Owner Bid History separates
Own, Won, and Lost bids. No auction business rules or mutation endpoints were
changed.

No Phase 4, Sport Team, Sport Auction, Captain, Match, or Scheduling work was
added. Auction business rules and persistence were not changed.

## Phase 3G Update

Phase 3G changes only existing Festival operations. Unsold participants can
return to the Available pool while every earlier attempt, bid, result, and
audit remains preserved. Sold is terminal.

Setup is locked server-side for live, paused, and completed auctions. Team
refresh was fixed by propagating a parent operation revision: Team creation
now refetches Team lists, Owner/Retention dropdowns, readiness, and auction
configuration without a page reload.

No Sport Team, Sport Auction, scheduling, standings, result, or competition
engine work was added.

## Phase 3F Update

Phase 3F Festival Auction UX Alignment is implemented as of 2026-06-10.
Owners now click one server-calculated bid button; admins enter the participant
base price. Festival rounds persist a 20-second deadline, reset after bids,
expire into pending finalization, support pause/resume/extend, and recover
after restart. Live Team summaries, numbered bids, and result history are
included.

Apply `202606100004-festival-auction-ux-alignment.js` before starting the
updated backend. Phase 4 and all Sport Team/Sport Auction work remain
unstarted.

Snapshot date: 2026-06-10

This document is the technical continuation guide for the Auction Tracker and
Corporate Sports Festival repository. It describes the behavior currently
implemented in this worktree, the boundaries that must be preserved, and the
work that remains.

The Sports Festival implementation is currently uncommitted in the working
tree. A migration file being present does not prove that it has run against a
particular database. Check `SequelizeMeta` and migration status before making
schema assumptions.

## Continuation Rules

Before changing the project:

1. Read the documents listed in section 15.
2. Inspect `git status` and preserve unrelated user changes.
3. Run migration status before running new migrations.
4. Treat `Employee` as the canonical corporate identity.
5. Keep Festival ownership assignment-based.
6. Keep Festival v2 behavior isolated from legacy Tournament auctions.
7. Do not start Sport Auctions before the Sport Team foundation exists.
8. Enforce security on the backend; frontend route guards are UX only.

# 1. Current Architecture

## Application Shape

The repository is a modular monolith with two applications:

```text
Auction-Tracker/
  ipl-auction-tracker/          React/Vite frontend
  ipl-auction-tracker-backend/  Express/Socket.IO/Sequelize backend
```

Primary technologies:

- Frontend: React 19, Vite, React Router 7, Material UI 6, Axios, Socket.IO
  Client.
- Backend: Node.js ES modules, Express, Socket.IO, Sequelize, Zod.
- Database: MySQL with explicit versioned migrations.
- Authentication: JWT bearer authentication and authenticated Socket.IO
  handshakes.

## Domain Separation

Two systems coexist.

### Legacy Auction Domain

The original system uses:

- `Tournaments`
- `TournamentTeams`
- `Teams`
- `Players`
- `Auctions`
- `Bids`

Legacy purse and auction state are tournament-scoped. Do not change this
behavior while extending the Festival platform.

### Sports Festival Domain

The Festival implementation is additive and exposed primarily through:

```text
/api/v2/employees
/api/v2/festivals
```

Its current aggregate flow is:

```text
Employee
  -> FestivalParticipant
  -> FestivalParticipantSport
  -> FestivalTeamMembership

FestivalTeamMembership source:
  owner_retention | retention | auction | admin_override
```

`FestivalTeamMemberships` is the authoritative primary Festival roster.

## Identity Model

```text
User (optional login identity)
  0..1
    |
Employee (canonical corporate identity)
  1
    |
  many FestivalParticipants
```

- An Employee does not require a User account.
- A User is manually linked through `Employees.userId`.
- The same Employee is reused across festivals, sports, ownership, retention,
  auction, and future sport teams.
- `FestivalParticipants.userId` remains as a nullable compatibility column,
  but current Festival identity uses `employeeId`.

## Authorization Model

- Global User roles remain `admin`, `team_owner`, and `spectator`.
- Public registration permits only `team_owner` and `spectator`.
- Festival ownership is not granted by the global `team_owner` role.
- Festival bidding rights are derived from:

```text
Authenticated User
  -> linked Employee
  -> FestivalParticipant
  -> FestivalTeamOwner assignment
  -> assigned FestivalTeam
```

- Festival setup mutations are admin-only.
- Any authenticated User can currently view Festival auction state and join an
  existing Festival auction Socket.IO room.

## Real-Time Architecture

Festival live auction writes use HTTP. Accepted changes are broadcast to:

```text
festival-auction:<festivalId>
```

Implemented events include:

- `auction-started`
- `participant-started`
- `bid-placed`
- `participant-sold`
- `participant-unsold`
- `auction-paused`
- `auction-resumed`
- `auction-completed`

Socket handshakes require JWT authentication. Festival room joining currently
checks that the Festival exists, not organization-specific visibility.

# 2. Completed Phases

## Platform Hardening Before Festival Work

The implementation log records these completed items:

- Phase 1 Security: registration restrictions, protected APIs, safe User DTOs.
- Phase 2 Authentication: JWT expiration and password reset.
- Phase 3 Socket Security: authenticated handshakes and server-derived legacy
  team ownership.
- Phase 4 Validation: Zod validation architecture.
- Phase 5 Database: explicit migrations and integrity indexes.
- F-001: persisted legacy auction timer recovery.
- F-002: Tournament status transition validation.
- F-004: legacy Player CSV import.
- F-005: Tournament edit and archive.
- F-006: multi-sport foundation and sports catalog.
- F-007: Team API authorization hardening.

## Sports Festival Phases

### Phase 1: Festival Foundation

Completed:

- Festival creation and reads.
- Festival sport enablement.
- Festival participants.
- Festival-scoped teams.
- Isolated `/api/v2/festivals` surface.

### Phase 2: Registration and Sport Selection

Completed:

- Multiple sports per participant.
- No skill ratings.
- Single and bulk sport registration.
- Festival participant/sport CSV import.
- Festival Dashboard and Workspace UI.

### Phase 2 Redesign: Employee Identity

Completed:

- Canonical `Employees`.
- Optional User linking.
- `FestivalParticipant -> Employee`.
- Employee Number driven imports.
- Employee-based participant self-read authorization.

### Phase 2.1: HR Onboarding UX

Completed:

- Employee CSV template and import.
- Create/update by Employee Number.
- Debounced Employee search.
- Multi-select participant addition.
- Add all Employees.
- Bulk participant removal.
- Partial-success import summaries.

### Phase 3: Festival Team Builder

Completed:

- Festival Team CRUD.
- Manual participant assignment.
- Deterministic snake auto-balance.
- Assignment locking.
- Team composition and strength summaries.

This functionality is now available only in Manual roster mode.

### Phase 3A: Main Festival Auction Foundation

Completed:

- Auction budget and owner-cost configuration.
- Assignment-based Team owners.
- Mandatory owner roster membership and cost.
- Pre-auction retentions.
- Derived purse summaries.
- Automatic auction-pool generation.

### Phase 3B: Main Festival Live Auction

Completed:

- `setup`, `live`, `paused`, and `completed` lifecycle.
- Admin participant selection.
- Assignment-derived owner bidding.
- Transactional sale finalization.
- Unsold finalization.
- Auction history.
- Festival-specific Socket.IO broadcasts.
- Admin, owner, and spectator live UI.

### Phase 3C: Roster Workflow Consolidation

Completed:

- `auction` and `manual` roster formation modes.
- Auction mode as the default.
- Server-side restriction of conflicting roster workflows.
- Mode-specific Festival Workspace sections.
- Deterministic auction-pool exclusion rules.

# 3. Database Schema Additions

## Festival Foundation

### `Festivals`

Stores Festival identity, dates, registration window, timezone, currency,
status, assignment status, and roster formation mode.

Important fields:

- `status`: `draft`, `registration_open`, `registration_closed`,
  `allocation`, `competition`, `completed`, or `archived`.
- `teamAssignmentStatus`: `draft`, `building`, or `locked`.
- `rosterFormationMode`: `auction` or `manual`; default `auction`.

### `FestivalSports`

Connects an existing catalog `Sport` to a Festival. The pair
`(festivalId, sportId)` is unique.

### `FestivalParticipants`

Connects an Employee to a Festival. The pair `(festivalId, employeeId)` is
unique. Participant status supports registered and withdrawn behavior.

### `FestivalTeams`

Festival-scoped primary franchises such as Demons and Trojans. Team name and
code are unique within one Festival.

## Employee and Registration

### `Employees`

Canonical corporate identity with:

- Employee Number
- Name
- Email
- Department
- Status
- Source and identity status
- Optional unique `userId`

Employee Number is the HR import matching key.

### `FestivalParticipantSports`

Connects one Festival Participant to one enabled Sport. The pair
`(festivalParticipantId, sportId)` is unique.

## Festival Roster

### `FestivalTeamMemberships`

Authoritative Festival roster membership.

Important properties:

- One participant may belong to only one Festival Team per Festival.
- `assignmentMethod`: manual or auto-balanced provenance.
- `rosterSource`: distinguishes owner retention, retention, auction, and
  administrative override behavior.
- `assignedBy` and `assignedAt` retain assignment attribution.

## Main Auction Foundation

### `FestivalAuctionConfigs`

One configuration per Festival:

- Total Team budget
- Owner cost
- Internal setup state
- Live auction state
- Current participant
- Started and completed timestamps

### `FestivalTeamOwners`

Assignment between one Festival Team and one Festival Participant.

Constraints enforce:

- One owner per Team.
- One owned Team per participant in a Festival.

### `FestivalRetentions`

Pre-auction Team allocation with a positive retained amount.

### `FestivalAuctionPools`

Regenerable persisted snapshot of currently eligible auction participants.
Eligibility is still recomputed from authoritative roster and auction data.

## Live Auction

### `FestivalAuctions`

One participant auction round with current/final status.

### `FestivalAuctionBids`

Accepted bid history associated with Festival, round, participant, Team, and
assignment-derived owner.

### `FestivalAuctionResults`

Immutable sold or unsold result. Sold results record winning Team and final
amount.

## Core Relationships

```text
Users 0..1 -------- 0..1 Employees
Employees 1 -------- * FestivalParticipants
Festivals 1 -------- * FestivalParticipants
Festivals 1 -------- * FestivalSports -------- 1 Sports
FestivalParticipants 1 -- * FestivalParticipantSports -- 1 Sports

Festivals 1 -------- * FestivalTeams
FestivalParticipants 1 -- 0..1 FestivalTeamMemberships
FestivalTeams 1 ---- * FestivalTeamMemberships

FestivalTeams 1 ---- 0..1 FestivalTeamOwners
FestivalParticipants 1 -- 0..1 FestivalTeamOwners per festival

FestivalTeams 1 ---- * FestivalRetentions
FestivalParticipants 1 -- 0..1 FestivalRetentions per festival

Festivals 1 -------- 0..1 FestivalAuctionConfigs
Festivals 1 -------- * FestivalAuctionPools
Festivals 1 -------- * FestivalAuctions
FestivalAuctions 1 - * FestivalAuctionBids
FestivalAuctions 1 - 0..1 FestivalAuctionResults
```

# 4. API Additions

All paths below are currently mounted. Festival and Employee APIs require JWT
authentication.

## Employee APIs

Admin-only:

```text
POST   /api/v2/employees
GET    /api/v2/employees
GET    /api/v2/employees/:employeeId
PATCH  /api/v2/employees/:employeeId
POST   /api/v2/employees/:employeeId/link-user
POST   /api/v2/employees/import
GET    /api/v2/employees/import/template
```

## Festival Core

```text
POST   /api/v2/festivals                         admin
GET    /api/v2/festivals                         authenticated
GET    /api/v2/festivals/:festivalId             authenticated
PATCH  /api/v2/festivals/:festivalId/roster-formation-mode
                                                   admin
```

## Festival Sports

```text
POST   /api/v2/festivals/:festivalId/sports      admin
GET    /api/v2/festivals/:festivalId/sports      authenticated
```

## Festival Participants

```text
POST   /api/v2/festivals/:festivalId/participants
POST   /api/v2/festivals/:festivalId/participants/bulk
POST   /api/v2/festivals/:festivalId/participants/add-all
POST   /api/v2/festivals/:festivalId/participants/bulk-remove
GET    /api/v2/festivals/:festivalId/participants
POST   /api/v2/festivals/:festivalId/participants/import
GET    /api/v2/festivals/:festivalId/participants/import/template
```

These routes are admin-only.

## Participant Sports

```text
POST   /api/v2/festivals/:festivalId/participants/:participantId/sports
GET    /api/v2/festivals/:festivalId/participants/:participantId/sports
GET    /api/v2/festivals/:festivalId/sports/:sportId/participants
POST   /api/v2/festivals/:festivalId/participant-sports/bulk
POST   /api/v2/festivals/:festivalId/participant-sports/import
GET    /api/v2/festivals/:festivalId/participant-sports/import/template
```

Writes and sport participant lists are admin-only. The participant sports read
supports the linked participant's own access.

## Festival Teams and Manual Assignment

```text
POST   /api/v2/festivals/:festivalId/teams
GET    /api/v2/festivals/:festivalId/teams
PATCH  /api/v2/festivals/:festivalId/teams/:teamId
DELETE /api/v2/festivals/:festivalId/teams/:teamId

POST   /api/v2/festivals/:festivalId/team-assignments
POST   /api/v2/festivals/:festivalId/team-assignments/auto-balance
GET    /api/v2/festivals/:festivalId/team-assignments
PATCH  /api/v2/festivals/:festivalId/team-assignments/lock
```

Team mutations and all assignment routes are admin-only. Manual assignment
mutations require Manual roster mode.

## Owner, Retention, Budget, and Pool

```text
POST   /api/v2/festivals/:festivalId/teams/:teamId/owner
GET    /api/v2/festivals/:festivalId/teams/:teamId/owner
POST   /api/v2/festivals/:festivalId/retentions
GET    /api/v2/festivals/:festivalId/retentions
DELETE /api/v2/festivals/:festivalId/retentions/:id
PATCH  /api/v2/festivals/:festivalId/auction-config
GET    /api/v2/festivals/:festivalId/auction-pool
```

Setup mutations are admin-only and require Auction roster mode. Auction-pool
read is authenticated and applies controller-level access rules.

## Main Festival Live Auction

Admin lifecycle and finalization:

```text
POST /api/v2/festivals/:festivalId/auction/start
POST /api/v2/festivals/:festivalId/auction/pause
POST /api/v2/festivals/:festivalId/auction/resume
POST /api/v2/festivals/:festivalId/auction/complete
POST /api/v2/festivals/:festivalId/auction/participants/:participantId/start
POST /api/v2/festivals/:festivalId/auction/participants/:participantId/sell
POST /api/v2/festivals/:festivalId/auction/participants/:participantId/unsold
```

Authenticated live access:

```text
POST /api/v2/festivals/:festivalId/auction/bid
GET  /api/v2/festivals/:festivalId/auction/current
GET  /api/v2/festivals/:festivalId/auction/history
```

The bid controller derives the bidder's Festival Team from the authenticated
User/Employee/Owner assignment chain.

# 5. Festival Workflow

The implemented Auction Mode workflow is:

```text
Admin creates Festival
  -> enables Sports
  -> imports or creates Employees
  -> adds Festival Participants
  -> records sport selections
  -> creates Festival Teams
  -> confirms Auction roster mode
  -> configures Team budget and Owner cost
  -> assigns one Owner per Team
  -> optionally creates Retentions
  -> starts Main Festival Auction
  -> sells remaining participants
  -> FestivalTeamMemberships represent final rosters
```

Important lifecycle facts:

- New Festivals begin in `draft`.
- No general Festival status transition API or UI is implemented.
- Registration writes accept `draft` or `registration_open`.
- Registration timestamps are stored but not automatically enforced.
- Team assignment lifecycle and auction lifecycle are separate from Festival
  status.
- There is no separate final-roster approval operation.

Frontend routes:

```text
/festivals
/festivals/:festivalId
/festival-auctions
/festivals/:festivalId/live-auction
```

# 6. Employee Workflow

## Creation

Admins create Employees manually or by CSV.

Employee import format:

```csv
EmployeeNumber,Name,Email,Department,Gender
EMP001,Vamsi Rao,vamsi@company.com,IT,Male
EMP002,Priya Shah,priya@company.com,Finance,Female
```

Import behavior:

- Match by normalized Employee Number.
- Create missing Employees.
- Update existing Employees.
- Validate required fields, gender, and email format.
- Reject duplicate Employee Numbers within the file.
- Continue processing valid rows after row failures.
- Do not create User accounts.

## Festival Import

The Festival Workspace import can create/update an Employee, create/reactivate
the Festival Participant, and synchronize Yes/No sports in one row-level
transaction.

```csv
EmployeeNumber,Name,Email,Department,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball
EMP001,Vamsi Rao,vamsi@company.com,IT,No,No,No,No,Yes,Yes,No
```

Only CSV is accepted; native `.xlsx` is not implemented.

## User Linking

Employee and login account creation are independent.

Current linking process:

```text
Person registers a User
  -> Admin obtains User ID
  -> Admin opens Employee management
  -> Admin submits User ID
  -> Employees.userId is set
```

No automatic linking occurs by email, Employee Number, or registration.

Frontend route:

```text
/employees
```

# 7. Owner Workflow

## Assignment

The admin:

1. Configures Festival Team budget and mandatory Owner cost.
2. Selects a registered Festival Participant.
3. Assigns that participant as Owner of one Festival Team.

Owner assignment transaction:

```text
Create FestivalTeamOwner
  + create/convert FestivalTeamMembership
      rosterSource = owner_retention
  + include Owner cost in derived Team spending
```

The owner:

- Is still the same Employee.
- Is automatically on the Team roster.
- Is excluded from the auction pool.
- May own only one Team in the Festival.
- Does not need a User account for the business assignment.

## Login and Bidding

To bid, the Owner must have an existing User manually linked to the Employee.
The assignment becomes discoverable immediately after linking; no second
Owner activation command is needed.

Current owner onboarding:

```text
Employee exists
  -> Employee becomes Festival Participant
  -> Admin assigns Owner
  -> Person registers User
  -> Admin manually links User to Employee
  -> Owner logs in
  -> bid authorization resolves the existing assignment
```

There is no Owner removal, replacement, transfer, invitation, or self-claim
workflow.

# 8. Spectator Workflow

A Spectator:

1. Registers or receives an existing User with global role `spectator`.
2. Logs in.
3. Opens `/festival-auctions`.
4. Opens `/festivals/:festivalId/live-auction`.
5. Receives current state, history, and Socket.IO broadcasts.

Spectators cannot use admin lifecycle endpoints. They normally cannot bid
because they have no linked Festival Owner assignment.

Current authorization caveat:

- The bid endpoint checks assignment-derived ownership, not global role.
- A `spectator` or `admin` User linked to an assigned Owner Employee can
  technically bid.
- A global `team_owner` without a matching Festival assignment cannot bid.

Viewing is currently broad: any authenticated User can view any existing
Festival auction. Private Festival invitations are not implemented.

# 9. Main Auction Workflow

## Setup

1. Admin creates at least two active Festival Teams.
2. Admin configures per-Team budget and common Owner cost.
3. Admin assigns one Owner to every active Team.
4. Admin optionally retains participants.
5. Eligible participants are computed.

Pool eligibility includes registered Festival Participants and excludes:

- Any participant with a Festival Team membership.
- Owners.
- Retained participants.
- Sold participants.
- Unsold participants until an admin explicitly re-auctions them.
- Sold participants and participants already assigned to a roster.

## Start and Participant Selection

Admin starts the auction. The system regenerates the pool and sets the
configuration to live.

Admin manually selects the next participant. Selection creates a
`FestivalAuctions` round, stores `currentParticipantId`, and removes the
participant from the persisted pool snapshot.

## Bidding

Owners bid through HTTP.

Accepted bids must:

- Be submitted while the auction is `live`.
- Come from the linked assigned Owner.
- Be greater than the current highest bid.
- Be a positive integer.
- Not exceed the Team's derived remaining purse.

There is currently:

- Admin-entered base price.
- Shared Tournament minimum increment engine.
- Persisted 20-second countdown timer.
- No automatic participant selection.

## Sale

Admin sells the current participant to the highest bidder.

One transaction:

1. Revalidates the auction and participant.
2. Revalidates the winning Team's remaining purse.
3. Creates `FestivalTeamMembership` with `rosterSource = auction`.
4. Creates the sold `FestivalAuctionResult`.
5. Marks the round sold.
6. Clears `currentParticipantId`.
7. Removes any remaining pool row.

The sale amount becomes part of derived Team spending.

## Unsold

Admin may mark the participant unsold. The system records an unsold result,
closes the round, and creates no roster membership.

Unsold is non-terminal. Admins may re-auction selected or all unsold
participants; earlier attempts remain in history.

## Pause and Completion

- Paused auctions reject new bids.
- Admin can sell or mark unsold only after the round reaches pending expiry.
- Completion requires no active current participant.
- Completion does not require an empty pool.

# 10. Roster Formation Mode Behavior

`Festivals.rosterFormationMode` has two values.

## Auction Mode

Default and primary business mode.

Allowed:

- Auction budget configuration.
- Owner assignment.
- Retentions.
- Auction start and lifecycle.
- Auction sale roster creation.

Rejected:

- Manual participant assignment.
- Auto-balance.
- Manual assignment lock.

Result:

```text
Owners + Retentions + Auction Sales = Festival roster
```

## Manual Mode

Administrative alternative for Festivals that will not run the Main Auction.

Allowed:

- Manual assignment.
- Participant move.
- Auto-balance.
- Assignment lock.

Rejected:

- Auction configuration.
- Owner assignment.
- Retentions.
- Main Auction start.
- Auction sale finalization.

Result:

```text
Manual Assignment / Auto-Balance + Lock = Festival roster
```

## Transition Guards

Mode changes are guarded to avoid mixing existing roster activity. Existing
Festivals were backfilled to `auction`.

The UI displays:

- Auction setup and live auction features in Auction Mode.
- Manual assignment, auto-balance, and lock controls in Manual Mode.

The backend remains the source of truth for all restrictions.

# 11. Completed Migrations

The repository contains these ordered migration files:

```text
202606080001-initial-schema.js
202606080002-phase5-integrity-indexes.js
202606080003-auction-timer-persistence.js
202606080004-tournament-archive-status.js
202606080005-multi-sport-foundation.js
202606090001-festival-foundation.js
202606090002-festival-participant-sports.js
202606090003-employee-identity.js
202606090004-festival-team-builder.js
202606090005-main-festival-auction-foundation.js
202606100001-main-festival-live-auction.js
202606100002-festival-roster-formation-mode.js
```

Festival migration purpose:

| Migration | Purpose |
|---|---|
| `202606090001` | Festivals, FestivalSports, FestivalParticipants, FestivalTeams |
| `202606090002` | FestivalParticipantSports |
| `202606090003` | Employees and FestivalParticipant employee identity migration |
| `202606090004` | teamAssignmentStatus and FestivalTeamMemberships |
| `202606090005` | rosterSource, auction config, owners, retentions, pool |
| `202606100001` | live auction columns, rounds, bids, and results |
| `202606100002` | rosterFormationMode and auction-mode backfill |

Recovery hardening was added to:

- `202606090003-employee-identity.js`
- `202606100001-main-festival-live-auction.js`
- `202606100002-festival-roster-formation-mode.js`

The employee and live-auction migrations are designed to recover from partial
application by checking tables, columns, indexes, and foreign keys before
creating them.

Do not assume these files are recorded in a database. Verify:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate -- status
npm run db:migrate
npm run db:migrate -- status
```

Also inspect:

```sql
SELECT name FROM SequelizeMeta ORDER BY name;
```

# 12. Pending Phases

## Required Before Sport Auctions

### Sport Team Foundation

Not implemented:

- Sport-scoped team identity under a Festival Team.
- Eligibility from final Festival roster plus selected sport.
- Sport Team membership.
- Prevention of duplicate membership within the same sport.
- Support for the same Employee in teams for different sports.
- Captain and vice-captain assignment.

### Sport Allocation Foundation

Not implemented:

- Sport allocation credits or budgets.
- Sport retentions.
- Sport auction readiness rules.
- Sport-specific pool generation.
- Sport auction lifecycle, bids, results, and real-time rooms.

The approved long-term direction is allocation-credit auctions for sport
teams, not a second financial purchase. The Employee was already financially
acquired in the Main Festival Auction.

## Future Enhancements (Out of Scope)

Competition management, fixtures, standings, playoffs, and match operations
were evaluated but are intentionally excluded from the current product scope.

## Operational and Product Work

Still pending:

- Production Owner account invitation/claim workflow.
- Festival lifecycle transition APIs.
- Final roster approval.
- Unsold participant retry or resolution.
- Owner replacement/removal.
- Budget transaction ledger.
- Organization-private Festival visibility.
- Native `.xlsx` import.
- Background processing for large imports.
- Production observability, backup, migration controls, and CI/CD.

# 13. Known Issues

## Identity and Authorization

- User-to-Employee linking is manual and requires a raw User ID.
- Registration does not link by email or Employee Number.
- There is no unlink, account claim, or conflict-resolution flow.
- Global role labels and Festival assignment permissions can conflict.
- A linked non-`team_owner` User can bid when the Owner assignment chain
  exists.
- Festival auction reads are available to every authenticated User.

## Festival Lifecycle

- Festival status transitions are not implemented.
- Registration timestamps are stored but not automatically enforced.
- Festival Sport update/removal lifecycle is incomplete.
- There is no final roster approval state.

## Roster and Team Management

- Manual lock is irreversible.
- Owner removal, replacement, and transfer are not implemented.
- `assignmentMethod` alone is insufficient provenance; always inspect
  `rosterSource`.
- Existing historical/manual memberships are excluded from the auction pool.

## Main Auction

- Base price and shared Tournament bid increments are implemented.
- Festival round timer, pause/resume, expiry, extension, and recovery are implemented.
- No automatic participant order.
- Sale and unsold require pending finalization after expiry.
- Unsold participants can be re-auctioned with preserved attempt history.
- Auction completion can leave eligible participants unauctioned.
- Budget is derived, not backed by an immutable ledger.
- There is no reversal or correction workflow for a completed sale.

## Import and Scale

- Imports are synchronous.
- CSV only; `.xlsx` is unsupported.
- Employee search and selection use bounded result sets.
- Large organization performance has not been load-tested.

## Operations

- The implementation log records environments where Node/npm were unavailable,
  so some added tests, builds, and live migrations were not executed there.
- Confirm the current environment by running the verification commands below.
- Socket.IO has no shared adapter for horizontal scaling.
- Legacy auction timers remain process-sensitive despite persisted deadlines.
- Production monitoring, structured logging, request IDs, backup automation,
  CI/CD, and migration deployment controls remain incomplete.

## Worktree State

At handoff time, the repository contains many modified and untracked files,
including the Festival models, migrations, controllers, tests, UI, and
documentation. Do not reset or discard them. Inspect and preserve the current
worktree before continuing.

Recommended baseline checks:

```powershell
git status --short

cd ipl-auction-tracker-backend
npm run db:migrate -- status
npm test

cd ../ipl-auction-tracker
npm run lint
npm run build
```

# 14. Important Design Decisions

1. **Employee is canonical.** User accounts are optional authentication
   identities, not participant records.
2. **No duplicate people.** Festival participation, ownership, auction
   results, and future Sport Teams reuse the same Employee.
3. **Festival ownership is assignment-based.** Never use the global
   `team_owner` role as proof of Festival ownership.
4. **Main Auction is the default roster workflow.** Manual assignment and
   auto-balance are a separate administrative mode.
5. **One primary Festival Team per participant.** Database uniqueness on
   Festival participant membership enforces this.
6. **Roster provenance is explicit.** Use `rosterSource` to distinguish owner,
   retention, auction, and override membership.
7. **Budget values are integers.** Current Festival spending is derived from
   Owner cost, retention amounts, and sold results.
8. **Main Auction is financial.** Future Sport Auctions should use allocation
   credits because the Employee is already owned by the Festival Team.
9. **Sport eligibility is derived.** Future sport pools must require both
   parent Festival roster membership and registration for that sport.
10. **Cross-sport participation is allowed.** One Employee may join a Cricket
    Team and a Volleyball Team under the same Festival Team.
11. **Legacy and Festival domains remain isolated.** Do not repurpose legacy
    Tournament, Team, Player, Auction, or Bid rows for Festival v2 features.
12. **Migrations are explicit and additive.** Do not rely on
    `sequelize.sync()` or startup backfills for production schema changes.
13. **Backend authorization is authoritative.** Frontend route guards and
    hidden controls do not provide security.
14. **Socket identity is server-derived.** Do not trust client-supplied User or
    Team identity.
15. **Transactions protect multi-row business operations.** Preserve
    transactional owner, retention, bid, sale, and purse validation.

# 15. Documents That Must Be Read Before Continuing

Read in this order.

## Mandatory Project Rules

1. `AGENTS.md`
   - Repository rules, security requirements, commands, and engineering
     constraints.
2. `PROJECT_CONTEXT.md`
   - Product and repository context.
3. `PROJECT_KNOWLEDGE.md`
   - Accumulated implementation knowledge and constraints.
4. `IMPLEMENTATION_LOG.md`
   - Chronological record of completed work and validation notes.

## Current Implemented Behavior

5. `IMPLEMENTED_FLOW_AUDIT.md`
   - Code-based audit of the Employee, Festival, Team, Owner, Retention, and
     Main Auction workflows.
6. `SPORTS_FESTIVAL_USER_GUIDE.md`
   - Business-facing source of truth and current implementation status.
7. `OWNER_AND_USER_LINKING_FLOW.md`
   - Exact current User, Employee, Owner, and Spectator account behavior.
8. `API.md`
   - Implemented HTTP and Socket.IO contracts.
9. `Database.md`
   - Current database model and legacy schema constraints.

## Approved Architecture and Future Direction

10. `SPORTS_FESTIVAL_ARCHITECTURE.md`
    - Festival domain boundaries and target hierarchy.
11. `SPORTS_FESTIVAL_DATABASE.md`
    - Proposed long-term schema and migration direction.
12. `SPORTS_FESTIVAL_API_DESIGN.md`
    - Implemented and planned API conventions.
13. `SPORTS_FESTIVAL_ROADMAP.md`
    - Sequencing, dependencies, complexity, and future phases.
14. `Architecture.md`
    - Legacy application architecture and state model.
15. `SecurityReview.md`
    - Known security risks and production requirements.
16. `DeploymentGuide.md`
    - Operational limitations and deployment requirements.

## Source Files to Inspect Before Festival Changes

Backend:

```text
ipl-auction-tracker-backend/src/routes/employeeRoutes.js
ipl-auction-tracker-backend/src/routes/festivalRoutes.js
ipl-auction-tracker-backend/src/controllers/employee.controller.js
ipl-auction-tracker-backend/src/controllers/festival.controller.js
ipl-auction-tracker-backend/src/controllers/festivalTeam.controller.js
ipl-auction-tracker-backend/src/controllers/festivalMainAuction.controller.js
ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js
ipl-auction-tracker-backend/src/models/index.js
ipl-auction-tracker-backend/src/validation/festival.validation.js
ipl-auction-tracker-backend/src/index.js
ipl-auction-tracker-backend/migrations/
```

Frontend:

```text
ipl-auction-tracker/src/App.jsx
ipl-auction-tracker/src/pages/EmployeeDirectory.jsx
ipl-auction-tracker/src/pages/FestivalDashboard.jsx
ipl-auction-tracker/src/pages/FestivalDetail.jsx
ipl-auction-tracker/src/pages/FestivalAuctionDirectory.jsx
ipl-auction-tracker/src/pages/FestivalLiveAuctionPage.jsx
ipl-auction-tracker/src/components/FestivalTeamBuilder.jsx
ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx
ipl-auction-tracker/src/components/MainFestivalAuction.jsx
```

Tests:

```text
ipl-auction-tracker-backend/test/festival-foundation-phase1.test.js
ipl-auction-tracker-backend/test/festival-registration-phase2.test.js
ipl-auction-tracker-backend/test/hr-onboarding-phase2-1.test.js
ipl-auction-tracker-backend/test/festival-team-builder-phase3.test.js
ipl-auction-tracker-backend/test/main-festival-auction-foundation-phase3a.test.js
ipl-auction-tracker-backend/test/main-festival-live-auction-phase3b.test.js
ipl-auction-tracker-backend/test/festival-roster-workflow-phase3c.test.js
ipl-auction-tracker-backend/test/employee-identity-migration-recovery.test.js
ipl-auction-tracker-backend/test/main-festival-live-auction-migration-recovery.test.js
```

# Recommended Continuation Point

The primary Festival roster workflow is consolidated and ready to support the
next foundation layer. The safest next product phase is:

```text
Sport Team Foundation
  -> sport eligibility from final Festival roster
  -> Sport Teams under Festival Teams
  -> Sport Team memberships
  -> captains
  -> sport retentions
  -> allocation-credit accounts
  -> only then Sport Auctions
```

Before beginning that phase, resolve or explicitly accept:

- Owner login/account linking policy.
- Operational monitoring for repeated Main Auction retries.
- Main Auction completion criteria.
- Whether derived budget accounting is sufficient or a ledger is required.
- Festival lifecycle and final-roster readiness rules.
# Phase 3G.1 Festival Workspace UX Handoff

Completed on: 2026-06-11

The Festival admin route is now a focused workspace rather than a single long
page. Setup displays one resumable validated step at a time. Once the Main
Auction starts, the route switches to scrollable Operations tabs for Overview,
Participants, Teams, Owners, Retentions, Auction, History, and Settings.

A persistent Control Center exposes server readiness metrics, auction state,
pool/unsold counts, and lifecycle-aware quick actions. Heavy operation modules
are lazy loaded and registration data is fetched only for active sections.

No Sport Team, Sport Captain, Sport Auction, scheduling, competition, standing,
or result functionality was added. See `FESTIVAL_WORKSPACE_UX.md` for the
navigation and responsive design.

# Festival Configuration Unlock Handoff

Completed on: 2026-06-11

Festival configuration now has a persisted, admin-controlled lock override.
The status card supports confirmed Unlock and Relock actions, and both actions
are written to `FestivalOperationAudits`.

Unlocked configuration can correct Festival details, participants, Teams,
Owners, retentions, and available pool membership through existing workspace
sections. Owner assignment now supports validated reassignment. Configuration
mutations create audit records.

Auction integrity remains independent of the override. Sold results, winning
amounts, bid history, and auction-sourced roster memberships are not updated
or deleted. Budget changes return read-only once any sold result exists.
Sports and roster formation mode cannot be changed after auction start.

Apply migration:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate
```

Migration: `202606110001-festival-configuration-unlock.js`
