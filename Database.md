# Database Analysis

Phase 5 Database status: COMPLETE (2026-06-08)
F-001 Auction Timer Persistence status: COMPLETE (2026-06-08)

The backend uses Sequelize with MySQL and versioned ESM migrations.
`sequelize.sync()` and startup schema/backfill mutation were removed. Migrations
are tracked in `SequelizeMeta` and executed with `npm run db:migrate`.

Evidence: `ipl-auction-tracker-backend/scripts/migrate.js`,
`src/database/migrator.js`, `migrations/`, and `src/index.js`.

Sequelize adds `createdAt` and `updatedAt` to every model because timestamps are
not disabled.

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

## Tournaments

Purpose: tournament identity, budget, status, and creator identifier.

Columns: `id` string PK; `name` required; `budget` integer required; `status`
string default `upcoming`; `createdBy` required string; timestamps.

Relationships: has many players, auctions, bids, tournament teams, and teams.
`createdBy` belongs to `Users`.
Indexes: PK; `Tournaments(createdBy)`.
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
`soldPrice` float nullable; `role` default `batsman`; `isSold` boolean;
`isInAuction` boolean; `teamId` nullable; `tournamentId` nullable;
`auctionId` nullable/default empty string; timestamps.

Relationships: belongs to team and tournament; referenced by auctions and bids.
Indexes: PK; `(tournamentId, isInAuction, isSold, auctionId)` and
`(teamId, tournamentId)`.
Evidence: `src/models/player.model.js`.

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
  ENUMs. Transition rules are still application concerns.
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
- Supporting foreign-key indexes for tournament creator, bid team/owner, and
  tournament-team team lookup.

## Foreign-Key Policy

- `Teams.ownerId -> Users.id`: `RESTRICT`
- `Tournaments.createdBy -> Users.id`: `RESTRICT`
- `TournamentTeams.tournamentId -> Tournaments.id`: `CASCADE`
- `TournamentTeams.teamId -> Teams.id`: `CASCADE`
- `Players.teamId -> Teams.id`: `SET NULL`
- `Players.tournamentId -> Tournaments.id`: `RESTRICT`
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

The baseline is intentionally non-destructive and cannot be rolled back.

Correctness/scale concerns:

- `getPlayersWithBidsByTournamentId` runs one query per player.
- `getAllTeamsWithPlayers` runs one query per team.
- List endpoints are unpaginated.
- Production-like `EXPLAIN` verification has not been run for the new indexes.
- No database backup, retention, or restore implementation is present.
