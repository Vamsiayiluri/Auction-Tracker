# Admin Guide

This guide describes implemented admin UI workflows. Live auction control,
tournament management mutations, and player creation require a valid admin
JWT. Read APIs remain outside the scope of Phase 1 authorization hardening.

## Dashboard

After login, an admin sees tournament, live-auction, participating-team, and
registered-player counts plus tournament cards.

Evidence: `ipl-auction-tracker/src/pages/Dashboard.jsx`,
`src/components/AdminDashboard.jsx`,
`src/components/AuctionManagement.jsx`.

## Create a Tournament

Purpose: configure tournament name, sport, per-team budget, participating
registered teams, and initial player pool.

1. Select **Create Tournament**.
2. Select a sport. Cricket is the default and remains fully supported.
3. Enter a name and positive budget.
4. Select at least one existing team.
5. Add at least one player with name and positive base price.
6. For cricket, select a player role. For table tennis, volleyball,
   badminton, chess, carrom, and other sports, the role field is hidden.
7. Submit.

API: `POST /api/tournament/create`.
Tables: inserts `Tournaments`, `TournamentTeams`, and `Players`.
Success: tournament reloads on dashboard.
Failures: missing fields, unknown selected team, invalid sport, cricket player
without role, player sport mismatch, or server failure.

Evidence: `src/components/AuctionManagement.jsx`, backend
`src/controllers/tournment.controller.js`.

## Add a Player After Creation

Select **Add Player** on an upcoming tournament, enter player details, and
submit. API: `POST /api/players`. Table: inserts `Players`.

This endpoint validates that the tournament exists and requires an
authenticated admin. Live, completed, and archived tournaments are read-only for
player-pool changes. The player sport must match the tournament sport. Cricket
players require a role; non-cricket players do not.

Evidence: `src/components/AuctionManagement.jsx`, backend
`src/controllers/player.controller.js`, `src/routes/playerRoutes.js`.

## Import Players From CSV

Upcoming tournaments show **Import Players**. Admins can download cricket or
mixed-format templates, choose a CSV file, upload it, and review the import
summary plus row-level errors.

API: `POST /api/players/import`.
Template API: `GET /api/players/import/templates/:type`.
Table: inserts valid rows into `Players`.

CSV formats:

```csv
name,sport,role,basePrice
Virat,cricket,Batsman,500000
```

```csv
name,sport,basePrice
Magnus,chess,500000
```

The mixed template uses `name,sport,role,basePrice`; non-cricket rows leave
`role` blank. Because tournaments are one-sport events, each imported row must
match the selected tournament sport. Rows for other sports are reported as
failures without blocking valid rows.

Validation covers active sport IDs, tournament existence, tournament read-only
status, player/tournament sport match, required cricket roles, positive numeric
base prices, optional `id` duplicate checks, and malformed rows.

## Start or Resume Tournament Control

Selecting **Start Auction** changes tournament status to `live` through
`PATCH /api/tournament/:id/status` and opens
`/start-live-auction?id=<tournamentId>`. **Resume Auction** opens the same
control room for live tournaments. Completed tournaments open the details
view.

Evidence: `src/components/AuctionManagement.jsx`,
`src/components/AdminDashboardLayout/AdminAuctionDashboard.jsx`.

The status endpoint requires an authenticated admin. It still accepts arbitrary
status strings only from the supported enum and enforces
`upcoming` -> `live` -> `completed` -> `archived`.

## Edit a Tournament

Upcoming tournaments show **Edit Tournament**. Admins can update the tournament
name, sport, budget, participating teams, and player pool before the tournament
goes live.

API: `PATCH /api/tournament/:id`.
Tables: updates `Tournaments`, and replaces submitted `TournamentTeams` and
`Players` setup data.

Live, completed, and archived tournaments reject edits with the standard
validation error envelope. If the tournament sport changes, the player pool is
submitted with the same sport so tournaments remain one-sport events.

## Archive a Tournament

Completed tournaments show **Archive Tournament**. Archiving changes status to
`archived`; archived tournaments are labeled in the dashboard and remain
read-only.

API: `PATCH /api/tournament/:id/archive`.
Allowed transition: `completed` -> `archived` only. Upcoming, live, and already
archived tournaments cannot be archived.

## Filter Tournaments

The tournament dashboard can filter cards by **All**, **Upcoming**, **Live**,
**Completed**, and **Archived**. Dashboard summary counts still use all loaded
tournaments.

## Run a Player Round

1. Select a tournament in Auction Control.
2. For cricket tournaments, select player role and an available player. For
   non-cricket tournaments, select an available player directly.
3. Select **Start Round**.
4. The frontend calls `POST /api/auction/start/:playerId` with a generated
   auction ID.
5. The backend creates a live auction and starts a 20-second timer.
6. Accepted team-owner bids appear in the bid stream and reset the timer.

Access control: JWT plus admin role on the backend.
Tables: updates `Players` and `Tournaments`; inserts `Auctions`; bids insert
`Bids`.

Evidence: `src/components/AdminDashboardLayout/AuctionLive.jsx`, backend
`src/routes/auctionRoutes.js`, `src/controllers/auction.controller.js`.

## Finalize a Player

When the timer ends, the round becomes pending and bidding locks.

- **Extend 20 Seconds**: `POST /api/auction/extend/:playerId`; resumes bidding.
- **Sell to Highest Bidder**: `POST /api/auction/sell/:playerId`; requires a
  highest bid and assigns the player while updating tournament purse.
- **Mark Unsold**: `POST /api/auction/unsold/:playerId`; completes without team.

All three require authenticated admin role. Sell/unsold finalization uses a
database transaction. When no available/live players remain, tournament status
becomes `completed`.

Evidence: `src/components/AdminDashboardLayout/AuctionLive.jsx`, backend
`src/controllers/auction.controller.js`.

## Team and Bid Reports

The admin tournament room includes:

- **Teams**: tournament squads, total purse, spent, remaining.
- **Bid History**: auctioned players, sold/unsold outcome, winning team, and
  detailed bid list.

APIs: team/player read endpoints documented in `API.md`.
Tables: `Teams`, `TournamentTeams`, `Players`, `Bids`.

Evidence: `src/components/AdminDashboardLayout/TeamsOverview.jsx`,
`src/components/TeamOwnerDashboard/BidHistory.jsx`.

## Not Implemented

- User management, role changes, account disabling, or password reset.
- Team edit/delete or standalone team administration.
- Tournament delete or invitation workflow.
- Player edit/delete.
- Configurable timer/increment rules.
- Audit logs, exports, analytics, and system settings UI.

No supporting routes/controllers/components exist for these capabilities.

## Automatic Team Owner Provisioning

Team Owners are no longer registered or linked manually. In Festival auction
setup, select an Employee for a Festival Team and click **Assign Owner**.

The server transaction reuses a linked or email-matched User when one exists.
Otherwise it creates a verified `team_owner` User with a secure temporary
password, links it to the Employee, and activates ownership. The system then
emails the login URL and password instructions. New accounts receive the
temporary password and must change it before any protected application access.

Owner readiness requires an Employee, linked User, `team_owner` role, and an
active ownership record. Registration state is not a readiness blocker.
