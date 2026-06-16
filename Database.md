# Database Analysis

## Phase 4B Sport Auction Preparation Foundation

Migration `202606140003-sport-auction-preparation-foundation.js` additively
creates `SportTeamBudgets` and `SportAuctionPools`.

`SportTeamBudgets` stores integer allocation credits independently from
Festival and legacy Tournament budgets. Effective credits are derived from:

```text
allocatedCredits + adjustmentCredits
```

One row is allowed per Sport Team in one Sport Tournament. Configuration user
and timestamp fields provide audit attribution.

`SportAuctionPools` stores the pre-auction participant snapshot. State values
are `available`, `sold`, and `unsold`, although Phase 4B creates only
`available` rows. One row is allowed per participant and Sport Tournament.

Pool generation deletes and replaces one Tournament's snapshot in a
transaction. Eligibility remains authoritative; readiness detects stale Pool
snapshots.

No live Sport Auction, bid, timer, result, fixture, match, standing, or
competition table is added.

## Phase 4A Sport Tournament Foundation

Migration `202606140002-sport-tournament-foundation.js` additively creates:

- `SportTournaments`
- `SportTeams`
- `SportTeamCaptains`
- `SportTeamMemberships`

`SportTournaments` belongs to one Festival, parent Festival Team, enabled
Festival Sport, and catalog Sport. It stores division, gender eligibility,
configured Team count, and the approved lifecycle enum. Phase 4A uses only
`draft`, `setup`, and `ready`.

`SportTeams` is Tournament-scoped. Names and codes are unique within one Sport
Tournament.

`SportTeamCaptains` assigns a normal Festival Participant to one Sport Team.
Unique indexes enforce one Captain per Team and one Captained Team per
participant in the same Sport Tournament.

`SportTeamMemberships` records the Captain's roster membership and reserves
future `auction` and `admin_override` provenance values. Unique
`(sportTournamentId, festivalParticipantId)` prevents membership in two Teams
within one Tournament while allowing cross-Sport participation.

No Sport Auction, bid, budget, fixture, match, standing, or competition table
is created.

## Phase 3G Festival Operations

Migration `202606100005-festival-operations-stabilization.js` adds persistent
Available/Sold/Unsold pool state, re-auction counters, numbered auction
attempts, and `FestivalOperationAudits`.
The former one-round/result-per-participant restriction is replaced by one
result per attempt. Prior bids and results remain immutable history.

Migration `202606110002-festival-bid-increment-percentage.js` replaces the
Festival-only increment profile/custom-rule columns with
`FestivalAuctionConfigs.incrementPercentage`. Allowed application values are
20 and 25; the database default is 20. Tournament Auction bid fields and rules
are unchanged.

## Festival Auction UX Alignment (Phase 3F)

Migration `202606100004-festival-auction-ux-alignment.js` additively updates
`FestivalAuctions` with `basePrice BIGINT NOT NULL`, nullable `endsAt`, nullable
`pausedRemainingMs`, and round statuses `live`, `paused`, `pending`, `sold`,
and `unsold`. Persisted deadlines are authoritative; process-local timers only
schedule expiry and are restored on startup.

Phase 5 Database status: COMPLETE (2026-06-08)
F-001 Auction Timer Persistence status: COMPLETE (2026-06-08)
F-005 Tournament Edit / Archive status: COMPLETE (2026-06-08)
F-006 Multi-Sport Foundation status: COMPLETE (2026-06-08)

The backend uses Sequelize with MySQL and versioned ESM migrations.
`sequelize.sync()` and startup schema/backfill mutation were removed. Migrations
are tracked in `SequelizeMeta` and executed with `npm run db:migrate`.

Evidence: `ipl-auction-tracker-backend/scripts/migrate.js`,
`src/database/migrator.js`, `migrations/`, and `src/index.js`.

Sequelize adds `createdAt` and `updatedAt` to every model because timestamps are
not disabled.

## Employee Gender Foundation

Migration `202606140001-employee-gender.js` adds
`Employees.gender ENUM('male','female') NOT NULL` and
`employees_gender_idx`.

The migration is recovery-safe for MySQL non-transactional DDL:

1. Add the column as nullable when missing.
2. Backfill existing null rows to `male` and set `identityStatus` to
   `needs_review`.
3. Change the column to `NOT NULL`.
4. Add the gender index when missing.

Existing records must be reviewed and corrected by HR/admin because the prior
schema contained no reliable gender source. New manual and imported Employees
require an explicit gender. FestivalParticipant does not store gender; every
participant response derives it through the canonical Employee relationship.

## Users

Purpose: authentication, identity, and role.

Columns: `id` string PK; `name` string; `email` string required unique;
`password` string required; `role` string required default `spectator`;
`isVerified` boolean; `verificationToken` string nullable;
`verificationExpires` date nullable; timestamps.

Relationships: referenced by `Teams.ownerId` and `Bids.ownerId`.
Indexes: PK; unique email index.
Evidence: `src/models/user.model.js`, `src/models/team.model.js`,
`src/models/bid.model.js`.

## Teams

Purpose: reusable team identity and owner; also contains legacy/global purse
and tournament fields.

Columns: `id` string PK; `name` required unique; `ownerId` required;
`totalAmount` integer default 2,000,000; `amountSpent` integer default 0;
virtual `amountLeft`; `tournamentId` nullable; timestamps.

Relationships: belongs to `User`; referenced by `Players`, `Bids`, and
`TournamentTeams`; `Tournament.hasMany(Team)` is defined.
Indexes: PK; unique name; `Teams(ownerId)`.
Evidence: `src/models/team.model.js`.

## Sports

Purpose: active sport catalog for one-sport-per-tournament auctions.

Columns: `id` string PK; `code` required unique string; `name` required string;
`isActive` boolean default true; timestamps.

Seeded active rows: `cricket`, `tt`, `volleyball`, `badminton`, `chess`,
`carrom`, and `other`.

Relationships: referenced by `Tournaments.sportId` and `Players.sportId`.
Indexes: PK and unique `Sports(code)`.
Evidence: `src/models/sport.model.js`, `src/utils/sports.js`, and
`migrations/202606080005-multi-sport-foundation.js`.

## Tournaments

Purpose: tournament identity, budget, status, and creator identifier.

Columns: `id` string PK; `name` required; `budget` integer required; `status`
string default `upcoming`; `createdBy` required string; `sportId` required
string default `cricket`; timestamps.
Supported status values are `upcoming`, `live`, `completed`, and `archived`.
Application transition rules allow only `upcoming` -> `live` -> `completed` ->
`archived`, with `archived` as a terminal state.

Relationships: belongs to sport; has many players, auctions, bids, tournament
teams, and teams. `createdBy` belongs to `Users`.
Indexes: PK; `Tournaments(createdBy)`; `Tournaments(sportId)`.
Evidence: `src/models/tournment.model.js` and related models.

## TournamentTeams

Purpose: many-to-many participation plus per-tournament purse.

Columns: `id` string PK; `tournamentId` required; `teamId` required;
`totalAmount` required; `amountSpent` required; virtual `amountLeft`;
timestamps.

Relationships: belongs to tournament and team; both have many tournament
teams. Deleting either parent cascades join-row deletion. Indexes: PK, unique
composite `(tournamentId, teamId)`, and `TournamentTeams(teamId)`.
Evidence: `src/models/tournamentTeam.model.js`.

## Players

Purpose: tournament player pool and final sale state.

Columns: `id` string UUID/default PK; `name` required; `basePrice` float;
`soldPrice` float nullable; `role` nullable string; `isSold` boolean;
`isInAuction` boolean; `teamId` nullable; `tournamentId` nullable;
`sportId` required string default `cricket`; `auctionId` nullable/default empty
string; timestamps.

Relationships: belongs to team, tournament, and sport; referenced by auctions
and bids.
Indexes: PK; `(tournamentId, isInAuction, isSold, auctionId)` and
`(teamId, tournamentId)`; `Players(sportId)`.
Evidence: `src/models/player.model.js`.

Role behavior: cricket players require one of `Batsman`, `Bowler`,
`All-rounder`, or `Wicketkeeper` at the application validation layer. Table
tennis, volleyball, badminton, chess, carrom, and other sports allow null role.

## Auctions

Purpose: player-round state.

Columns: `id` string PK; `status` string default `upcoming`;
`currentPlayerId` nullable; `tournamentId` nullable; `startedAt` nullable
date; `endsAt` nullable date; timestamps.

Relationships: belongs to current player and tournament.
Indexes: PK; `(tournamentId, status)` and
`(currentPlayerId, tournamentId, status)`.
Live auction deadlines are persisted in `endsAt`; the process-local timer is
only a scheduler for the stored deadline.
Evidence: `src/models/auction.model.js`,
`src/controllers/auction.controller.js`.

## Bids

Purpose: immutable accepted bid records.

Columns: `id` string PK; `playerId` required; `tournamentId` nullable;
`teamName` required duplicated snapshot; `teamId` required; `bidAmount`
integer required; `ownerId` nullable; timestamps.

Relationships: belongs to player, tournament, team, and user.
Indexes: PK; `(playerId, tournamentId, bidAmount)`,
`(playerId, tournamentId, createdAt)`, `teamId`, and `ownerId`.
Evidence: `src/models/bid.model.js`.

## ERD Description

```text
User 1 --- * Team
User 1 --- * Bid
Sport 1 --- * Tournament
Sport 1 --- * Player
Tournament 1 --- * TournamentTeam * --- 1 Team
Tournament 1 --- * Player * --- 0..1 Team
Tournament 1 --- * Auction * --- 1 Player(currentPlayer)
Tournament 1 --- * Bid * --- 1 Player
Team 1 --- * Bid
```

`Tournament.createdBy` is associated with `Users` and constrained.
`Player.auctionId` is logically an auction ID but is not associated; the
declared auction-to-player relation uses `Auction.currentPlayerId`.

## Findings

Unused/legacy structures:

- `Teams.tournamentId`, `Teams.totalAmount`, and `Teams.amountSpent` are retained
  for backward compatibility while tournament-specific values live in
  `TournamentTeams`. Evidence: `src/controllers/team.controller.js`,
  `src/models/index.js`.
- `Player.auctionId` duplicates the association represented by
  `Auction.currentPlayerId`.
- Empty bid REST route/controller are unused, but `Bids` itself is active.

Remaining normalization issues:

- `Bids.teamName` duplicates `Teams.name`; useful as a historical snapshot but
  no explicit snapshot policy exists.
- `Bids.ownerId` duplicates ownership derivable from team and may become stale.
- `Bids.ownerId` is retained as bid-time audit context and uses `SET NULL` if
  its user is removed.
- User role, tournament status, player role, and auction status are database
- User role, tournament status, and auction status are database ENUMs.
  `Players.role` is nullable string after F-006 because role is sport-specific.
  Cricket role requirements remain application validation concerns.
- Monetary player fields use floating point while bid/team/tournament amounts
  use integer.

Implemented high-value indexes:

- `Players(tournamentId, isInAuction, isSold, auctionId)`
- `Players(teamId, tournamentId)`
- `Bids(playerId, tournamentId, bidAmount)`
- `Bids(playerId, tournamentId, createdAt)`
- `Auctions(tournamentId, status)`
- `Auctions(currentPlayerId, tournamentId, status)`
- `Teams(ownerId)`
- `Sports(code)`
- `Tournaments(sportId)`
- Supporting foreign-key indexes for tournament creator, bid team/owner, and
  tournament-team team lookup.

## Foreign-Key Policy

- `Teams.ownerId -> Users.id`: `RESTRICT`
- `Tournaments.createdBy -> Users.id`: `RESTRICT`
- `Tournaments.sportId -> Sports.id`: `RESTRICT`
- `TournamentTeams.tournamentId -> Tournaments.id`: `CASCADE`
- `TournamentTeams.teamId -> Teams.id`: `CASCADE`
- `Players.teamId -> Teams.id`: `SET NULL`
- `Players.tournamentId -> Tournaments.id`: `RESTRICT`
- `Players.sportId -> Sports.id`: `RESTRICT`
- `Auctions.currentPlayerId -> Players.id`: `SET NULL`
- `Auctions.tournamentId -> Tournaments.id`: `RESTRICT`
- `Bids.playerId -> Players.id`: `RESTRICT`
- `Bids.tournamentId -> Tournaments.id`: `RESTRICT`
- `Bids.teamId -> Teams.id`: `RESTRICT`
- `Bids.ownerId -> Users.id`: `SET NULL`

The integrity migration checks for orphaned legacy references before adding
constraints. It fails with a targeted message rather than deleting data.

## Migration Workflow

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate -- status
npm run db:migrate
npm run db:migrate -- down
```

The baseline migration:

- Creates the full schema when tables do not exist.
- Adds password-reset and tournament-scope columns when upgrading legacy
  databases.
- Moves existing user verification, tournament-team, bid tournament, and
  auction tournament backfills out of startup.

The Phase 5 integrity migration:

- Normalizes known lowercase legacy player roles.
- Rejects unsupported enum values and orphaned references.
- Adds query-driven indexes, enum columns, and foreign keys.

The F-001 auction timer migration:

- Adds nullable `Auctions.startedAt` and `Auctions.endsAt`.
- Keeps legacy rows valid while new live auctions persist start and deadline
  timestamps.
- Allows backend startup recovery to schedule timers from stored deadlines or
  move overdue live auctions to pending finalization.

The F-005 tournament archive migration:

- Updates the `Tournaments.status` ENUM to include `archived`.
- Keeps `archived` terminal at the application layer.
- Blocks rollback while archived tournament rows exist, preventing accidental
  enum shrinkage that would invalidate stored data.

The F-006 multi-sport migration:

- Creates and seeds `Sports`.
- Adds `Tournaments.sportId` and `Players.sportId`.
- Backfills existing tournaments and players to `cricket`.
- Changes `Players.role` to nullable string.
- Adds sport indexes and foreign keys.

The baseline is intentionally non-destructive and cannot be rolled back.

Correctness/scale concerns:

- `getPlayersWithBidsByTournamentId` runs one query per player.
- `getAllTeamsWithPlayers` runs one query per team.
- List endpoints are unpaginated.
- Production-like `EXPLAIN` verification has not been run for the new indexes.
- No database backup, retention, or restore implementation is present.

## Festival Foundation (Phase 1)

Migration: `202606090001-festival-foundation.js`.

The migration is additive. It creates four independent festival tables and
seeds the missing `throwball` sport. It does not alter `Tournaments`,
`TournamentTeams`, `Teams`, `Players`, `Auctions`, or `Bids`.

### Festivals

Festival identity, dates, registration window, timezone, optional currency
metadata, lifecycle status, and creating user.

Constraints/indexes:

- unique `code`
- indexed `(status, startDate)`
- `createdByUserId -> Users.id` with `RESTRICT`

### FestivalSports

Joins one active catalog sport to a festival with draft status and optional
JSON configuration.

Constraints:

- unique `(festivalId, sportId)`
- festival deletion cascades draft configuration
- sport deletion is restricted

### FestivalParticipants

Festival-scoped participant link to canonical `Employees`.

Columns: `festivalId`, `employeeId`, temporary nullable `userId`, `status`, and
`registeredAt`.

Constraints:

- unique `(festivalId, employeeId)`
- employee deletion is restricted
- no copied name, email, role, password, or participant profile

The temporary `userId` exists only for migration compatibility and is not used
as participant identity.

### FestivalTeams

Festival-scoped franchise definitions with name, code, optional branding, and
status.

Constraints:

- unique `(festivalId, name)`
- unique `(festivalId, code)`
- no owner, purse, roster, player, tournament, or auction columns

Rollback drops the four foundation tables in dependency order. The Throwball
catalog row is intentionally retained because existing legacy tournaments may
reference it after migration.

## Festival Participant Sports (Phase 2)

Migration: `202606090002-festival-participant-sports.js`.

The additive `FestivalParticipantSports` table stores one row for each selected
sport:

- `id`
- `festivalParticipantId -> FestivalParticipants.id` (`CASCADE`)
- `sportId -> Sports.id` (`RESTRICT`)
- `createdAt`
- `updatedAt`

The unique `(festivalParticipantId, sportId)` index prevents duplicate
registrations, including concurrent duplicate requests. An additional
`sportId` index supports sport participant lists.

Application validation confirms that the participant and enabled sport belong
to the same festival and that writes occur only during `draft` or
`registration_open`. No skill data or duplicate participant identity is
stored. Legacy auction tables are unchanged.

### Employee identity migration

Migration `202606090003-employee-identity.js`:

- Creates `Employees`.
- Adds `FestivalParticipants.employeeId`.
- Backfills existing User-based participants to provisional Employees.
- Adds unique `(festivalId, employeeId)`.
- Makes the old participant `userId` nullable.
- Preserves all participant and sport-registration IDs.

Employee Number is unique and required by current create/import workflows.
Legacy backfilled Employees have no invented Employee Number and are marked
`needs_review`.

Current Employee columns also include required `gender` with allowed values
`male` and `female`. The field remains Employee-owned and is not duplicated in
FestivalParticipants, memberships, auction pools, bids, or results.

## Festival Team Builder (Phase 3)

Migration: `202606090004-festival-team-builder.js`.

Additive database changes:

- `Festivals.teamAssignmentStatus`: `draft | building | locked`
- New `FestivalTeamMemberships`

The membership table references one Festival, one Festival Participant, one
Festival Team, and the assigning User. It records `manual` or `auto_balanced`
assignment method and assignment time.

Unique `(festivalId, festivalParticipantId)` prevents a participant from
belonging to multiple primary Festival Teams. Locking is permitted only when
every registered participant has one membership. No strength column is stored;
strength is the current count of selected sports.

No legacy Tournament, Team, Player, Auction, or Bid table is changed.

## Main Festival Auction Foundation (Phase 3A)

Migration `202606090005-main-festival-auction-foundation.js` adds:

- `FestivalAuctionConfigs`
- `FestivalTeamOwners`
- `FestivalRetentions`
- `FestivalAuctionPools`
- `FestivalTeamMemberships.rosterSource`

Owner and retention costs are positive integer snapshots. Team spending is
derived from owner cost plus retention amounts; remaining purse is derived from
the configured per-team budget. Unique indexes prevent duplicate owners,
retentions, and pool entries. Legacy auction tables remain unchanged.

## Main Festival Live Auction (Phase 3B)

Migration `202606100001-main-festival-live-auction.js` adds lifecycle columns
to `FestivalAuctionConfigs`:

- `auctionStatus`: `setup | live | paused | completed`
- `currentParticipantId`
- `startedAt`
- `completedAt`

New additive tables:

- `FestivalAuctions`: one persisted round per festival participant.
- `FestivalAuctionBids`: immutable accepted bids with assignment-derived team
  and owner references.
- `FestivalAuctionResults`: unique sold or unsold outcome per participant.

Unique constraints prevent a participant from receiving two auction rounds or
results and reject duplicate bid amounts in one round. Sold results contribute
to derived team spending. Sale finalization, result creation, roster membership
creation, and pool removal occur in one transaction. No legacy Tournament,
Auction, Player, Team, or Bid table is modified.

## Festival Roster Workflow Consolidation (Phase 3C)

Migration `202606100002-festival-roster-formation-mode.js` additively adds:

- `Festivals.rosterFormationMode ENUM('auction','manual') NOT NULL`
- default and backfill value `auction`
- index `festivals_roster_formation_mode_idx`

The migration is recovery-safe when the column or index already exists and
does not modify roster data. Existing Festivals remain in auction mode.

Status ownership is explicit:

- `Festivals.status` gates Festival registration and configuration.
- `Festivals.teamAssignmentStatus` controls manual-mode assignment building
  and locking only.
- `FestivalAuctionConfigs.auctionStatus` controls Main Auction activity only.

`FestivalTeamMemberships` remains the single roster source of truth.

## Festival Auction Stabilization (Phase 3D)

Migration `202606100003-festival-auction-stabilization.js` adds:

- `FestivalTeamOwners.status`:
  `pending_user_registration | active | inactive`
- index `(festivalId, status)`
- `EmployeeUserLinkAudits`

`EmployeeUserLinkAudits` records registration and admin-manual link attempts,
including normalized email, optional Employee, outcome, and conflict details.
It provides an audit trail without changing Employee as canonical identity.

Owner status backfill is derived from the registered Festival Participant,
Employee employment state, linked User, and `team_owner` role.

## Team Owner Auto-Provisioning

Migration `202606110003-team-owner-auto-provisioning.js` adds:

- `Users.mustChangePassword`
- `FestivalTeamOwners.userProvisioningStatus`
  (`auto_created | existing_user`)
- `FestivalTeamOwners.credentialsSentAt`

New Team Owner users are verified at creation, receive only a hashed temporary
password in `Users.password`, and remain blocked by server middleware until
`mustChangePassword` is cleared. Festival operation audits record
`user_auto_created`, `owner_assigned`, `credentials_sent`, and
`password_reset_completed`.

## Sport Auction Engine (Phase 4C)

Migration `202606140004-sport-auction-engine.js` adds:

- `SportAuctionConfigs`
- `SportAuctions`
- `SportAuctionBids`
- `SportAuctionResults`
- `SportOperationAudits`
- `SportAuctionPools.reauctionCount`
- `SportAuctionPools.lastReauctionedAt`

All auction rows are scoped by `sportTournamentId`. Bids reference the active
`SportTeamCaptain` assignment used to authorize them. Sold results reference
the winning Sport Team and are the source for derived spent and remaining Team
credits. Each participant attempt is retained as a separate `SportAuctions`
row; pool re-auction metadata does not erase prior bids or results.
