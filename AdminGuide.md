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

Purpose: configure tournament name, per-team budget, participating registered
teams, and initial player pool.

1. Select **Create Tournament**.
2. Enter a name and positive budget.
3. Select at least one existing team.
4. Add at least one player with name, role, and positive base price.
5. Submit.

API: `POST /api/tournament/create`.
Tables: inserts `Tournaments`, `TournamentTeams`, and `Players`.
Success: tournament reloads on dashboard.
Failures: missing fields, unknown selected team, or server failure.

Evidence: `src/components/AuctionManagement.jsx`, backend
`src/controllers/tournment.controller.js`.

## Add a Player After Creation

Select **Add Player** on a non-completed tournament, enter player details, and
submit. API: `POST /api/players`. Table: inserts `Players`.

This endpoint validates that the tournament exists and requires an
authenticated admin.

Evidence: `src/components/AuctionManagement.jsx`, backend
`src/controllers/player.controller.js`, `src/routes/playerRoutes.js`.

## Start or Resume Tournament Control

Selecting **Start Auction** changes tournament status to `live` through
`PATCH /api/tournament/:id/status` and opens
`/start-live-auction?id=<tournamentId>`. **Resume Auction** opens the same
control room for live tournaments. Completed tournaments open the details
view.

Evidence: `src/components/AuctionManagement.jsx`,
`src/components/AdminDashboardLayout/AdminAuctionDashboard.jsx`.

The status endpoint requires an authenticated admin. It still accepts arbitrary
status strings; allowed-transition validation is outside Phase 1.

## Run a Player Round

1. Select a tournament in Auction Control.
2. Select player role and an available player.
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
- Tournament edit/delete/archive or invitation workflow.
- Player edit/delete/import.
- Configurable timer/increment rules.
- Audit logs, exports, analytics, and system settings UI.

No supporting routes/controllers/components exist for these capabilities.
