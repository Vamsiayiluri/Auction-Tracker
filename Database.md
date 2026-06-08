# Database Analysis

The backend uses Sequelize with MySQL and `sequelize.sync({force:false})`.
There are no migration files. Startup code also conditionally adds columns and
runs backfill SQL. Evidence: `ipl-auction-tracker-backend/src/models/index.js`.

Sequelize adds `createdAt` and `updatedAt` to every model because timestamps are
not disabled.

## Users

Purpose: authentication, identity, and role.

Columns: `id` string PK; `name` string; `email` string required unique;
`password` string required; `role` string required default `spectator`;
`isVerified` boolean; `verificationToken` string nullable;
`verificationExpires` date nullable; timestamps.

Relationships: referenced by `Teams.ownerId` and `Bids.ownerId`.
Indexes: PK; Sequelize unique index on email.
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
Indexes: PK; unique name.
Evidence: `src/models/team.model.js`.

## Tournaments

Purpose: tournament identity, budget, status, and creator identifier.

Columns: `id` string PK; `name` required; `budget` integer required; `status`
string default `upcoming`; `createdBy` required string; timestamps.

Relationships: has many players, auctions, bids, tournament teams, and teams.
`createdBy` has no declared association/foreign key to `Users`.
Indexes: PK only in model definition.
Evidence: `src/models/tournment.model.js` and related models.

## TournamentTeams

Purpose: many-to-many participation plus per-tournament purse.

Columns: `id` string PK; `tournamentId` required; `teamId` required;
`totalAmount` required; `amountSpent` required; virtual `amountLeft`;
timestamps.

Relationships: belongs to tournament and team; both have many tournament
teams. Indexes: PK and unique composite `(tournamentId, teamId)`.
Evidence: `src/models/tournamentTeam.model.js`.

## Players

Purpose: tournament player pool and final sale state.

Columns: `id` string UUID/default PK; `name` required; `basePrice` float;
`soldPrice` float nullable; `role` default `batsman`; `isSold` boolean;
`isInAuction` boolean; `teamId` nullable; `tournamentId` nullable;
`auctionId` nullable/default empty string; timestamps.

Relationships: belongs to team and tournament; referenced by auctions and bids.
Indexes: PK; a reference declaration exists for `teamId`, but no explicit
indexes are declared for common filters.
Evidence: `src/models/player.model.js`.

## Auctions

Purpose: player-round state.

Columns: `id` string PK; `status` string default `upcoming`;
`currentPlayerId` nullable; `tournamentId` nullable; timestamps.

Relationships: belongs to current player and tournament.
Indexes: PK only in model definition.
Missing persisted field: `endsAt`; timer deadline is held in server memory.
Evidence: `src/models/auction.model.js`,
`src/controllers/auction.controller.js`.

## Bids

Purpose: immutable accepted bid records.

Columns: `id` string PK; `playerId` required; `tournamentId` nullable;
`teamName` required duplicated snapshot; `teamId` required; `bidAmount`
integer required; `ownerId` nullable; timestamps.

Relationships: belongs to player, tournament, team, and user.
Indexes: PK only in model definition.
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

`Tournament.createdBy` is logically a user ID but is not associated.
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

Potential normalization issues:

- `Bids.teamName` duplicates `Teams.name`; useful as a historical snapshot but
  no explicit snapshot policy exists.
- `Bids.ownerId` duplicates ownership derivable from team and may become stale.
- `Tournament.createdBy` lacks a foreign key.
- Status and role fields are unrestricted strings.
- Monetary player fields use floating point while bid/team/tournament amounts
  use integer.

Missing/recommended indexes:

- `Players(tournamentId, isInAuction, isSold, auctionId)`
- `Players(teamId, tournamentId)`
- `Bids(playerId, tournamentId, bidAmount)`
- `Bids(playerId, tournamentId, createdAt)`
- `Auctions(tournamentId, status)`
- `Auctions(currentPlayerId, tournamentId, status)`
- `Teams(ownerId)`
- Foreign-key indexes for all association columns

Correctness/scale concerns:

- `getPlayersWithBidsByTournamentId` runs one query per player.
- `getAllTeamsWithPlayers` runs one query per team.
- List endpoints are unpaginated.
- Runtime `sync` and startup backfills are not a controlled migration strategy.
- No database backup, retention, or restore implementation is present.
