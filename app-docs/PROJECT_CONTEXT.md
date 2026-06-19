# PROJECT_CONTEXT.md

## Business Purpose

AuctionArena is a browser-based IPL-style player auction platform. It lets admins create tournaments, assign registered teams, define a per-team budget, load a player pool, run timed player rounds, and finalize players as sold or unsold. Team owners join tournaments their team participates in, bid in real time, and review their squad and remaining purse. Spectators can watch live or completed tournaments without bidding.

The core business workflow is:

1. Users register as team owners or spectators.
2. Team owners get an associated team during registration.
3. Admins create tournaments from existing teams and players.
4. Admins start a live player round.
5. Team owners bid through Socket.IO.
6. Timer expiry locks bidding.
7. Admins extend, sell to highest bidder, or mark unsold.
8. Teams, squads, purses, and bid history are updated and displayed.

## Current Project Status

The project is a functional pre-production MVP. The main auction flow exists end to end, but production readiness is limited by critical security and operations gaps:

- Socket.IO bidding is unauthenticated.
- Several sensitive read APIs are public.
- JWTs have no expiration and are stored in browser `localStorage`.
- CORS reflects arbitrary origins.
- Auction timers are process-local and not persisted.
- Schema management uses `sequelize.sync()` plus startup backfills instead of migrations.
- Automated tests are minimal.
- CI/CD, monitoring, backups, structured logging, and deployment automation are absent.

Overall, the codebase is useful as a working prototype and strong demo, but should not be treated as production-safe without hardening.

## Tech Stack

Frontend:

- React 19
- Vite 6
- React Router 7
- Material UI 6
- Axios
- Socket.IO Client
- `uid` for client-generated IDs

Backend:

- Node.js ES modules
- Express 4
- Socket.IO 4
- Sequelize 6
- MySQL via `mysql2`
- bcryptjs
- JSON Web Tokens
- SendGrid
- Node built-in test runner

Persistence:

- MySQL tables managed by Sequelize models.
- Runtime sync is currently enabled with `sequelize.sync({ force: false })`.
- Startup backfills maintain compatibility with legacy tournament data.

## Architecture Overview

Frontend architecture is route-driven and component-local:

```text
main.jsx
  ThemeProvider
    App.jsx
      AuthProvider
        BrowserRouter
          Login / Register / VerifyEmail
          Protected dashboard routes
          Admin auction control
          Team owner auction room
          Spectator auction room
```

Frontend state is mostly local React state plus `AuthContext`. There is no Redux, query cache, or custom data-fetching layer. Axios uses `VITE_API_URL` and attaches JWTs from `localStorage`. Socket.IO uses a module singleton without authentication.

Backend architecture is route/controller/model based:

```text
HTTP client -> Express route -> optional auth/role middleware
            -> controller -> Sequelize model/transaction -> MySQL

Socket client -> Socket.IO handler -> validation + transaction
              -> process-local timer -> tournament room broadcast
```

The backend does not have a general service layer, schema validation library, global error middleware, structured logger, or queue.

## Main Modules

### Authentication

Files:

- `ipl-auction-tracker/src/pages/Login.jsx`
- `ipl-auction-tracker/src/pages/Register.jsx`
- `ipl-auction-tracker/src/pages/VerifyEmail.jsx`
- `ipl-auction-tracker/src/context/AuthContext.jsx`
- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/routes/authRoutes.js`

Supports public team owner/spectator registration, optional email verification, login, JWT issuance, and safe user response DTOs. Public admin registration has been closed.

### Tournament Management

Files:

- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js`

Admins create tournaments from existing team names and initial players. Tournament status updates are admin-protected but currently accept arbitrary status strings.

### Player Management

Files:

- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker-backend/src/routes/playerRoutes.js`

Admins can add players to tournaments. Read endpoints list players and bid history publicly.

### Live Auction Control

Files:

- `ipl-auction-tracker/src/components/AdminDashboardLayout/AuctionLive.jsx`
- `ipl-auction-tracker-backend/src/controllers/auction.controller.js`
- `ipl-auction-tracker-backend/src/routes/auctionRoutes.js`

Admins start player rounds, extend expired rounds, sell to highest bidder, or mark unsold. Auction finalization updates `Players`, `Auctions`, and `TournamentTeams`.

### Real-Time Bidding

Files:

- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker/src/webSocket/socket.js`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/src/utils/bidRules.js`

Team owners bid through tournament Socket.IO rooms. Server validation checks room membership, active timer, player/team/owner relationship, tournament membership, minimum bid, and remaining purse. The missing piece is authenticated socket identity.

### Team and Bid Reports

Files:

- `ipl-auction-tracker/src/components/TeamOwnerDashboard/MyTeam.jsx`
- `ipl-auction-tracker/src/components/AdminDashboardLayout/TeamsOverview.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/BidHistory.jsx`
- `ipl-auction-tracker-backend/src/controllers/team.controller.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`

Users can view squads, purse usage, and per-player bid history. Some backend reads expose arbitrary owner/team data and need authorization and DTO cleanup.

## Roles

- `admin`: creates tournaments, adds players, starts/resumes auctions, finalizes rounds, views team and bid reports.
- `team_owner`: owns one team, sees invited tournaments in the frontend, places bids, reviews squad and purse.
- `spectator`: watches live/completed tournaments and reports without bidding.

## Documentation Notes

The root documentation is stronger than the app-local README. `ipl-auction-tracker/README.md` is still a generic Vite template and should be replaced or removed. `Auction Management.docx` describes some intended behavior that does not match the implementation, especially automatic winner assignment on timer expiry and free-form bid/pass controls.
