# EXECUTIVE_SUMMARY.md

## What This Project Is

AuctionArena is a full-stack, browser-based IPL-style player auction platform. Admins create tournaments, choose participating teams, add players, run timed auction rounds, and finalize each player as sold or unsold. Team owners join tournaments assigned to their team, bid in real time, and review their squad and remaining purse. Spectators can watch live and completed tournaments without bidding.

The project is a functional pre-production MVP. The main auction workflow exists end to end, but the system needs security, durability, test, migration, and operations work before production use.

## Repository At A Glance

```text
Auction-Tracker/
  ipl-auction-tracker/          React/Vite frontend
  ipl-auction-tracker-backend/  Express/Socket.IO/Sequelize backend
  AGENTS.md                     Development rules and project guardrails
  PROJECT_CONTEXT.md            Business and architecture context
  PROJECT_KNOWLEDGE.md          Technical system summary
  IMPROVEMENT_ROADMAP.md        Prioritized improvement plan
```

Supporting docs include `README.md`, `AdminGuide.md`, `UserGuide.md`, `Architecture.md`, `Database.md`, `API.md`, `SecurityReview.md`, and `DeploymentGuide.md`.

## Tech Stack

Frontend:

- React 19, Vite 6, React Router 7
- Material UI 6
- Axios
- Socket.IO Client
- `uid` for some client-generated IDs

Backend:

- Node.js ES modules
- Express 4
- Socket.IO 4
- Sequelize 6
- MySQL via `mysql2`
- bcryptjs, JWT, SendGrid
- Node built-in test runner

## Core User Flow

1. A user registers as a team owner or spectator.
2. Team-owner registration creates a team.
3. An admin creates a tournament with a name, per-team budget, teams, and players.
4. The admin starts a player auction round.
5. Team owners bid through Socket.IO.
6. Each valid bid resets a 20-second timer.
7. Timer expiry locks bidding and marks the auction round `pending`.
8. The admin extends the round, sells to the highest bidder, or marks the player unsold.
9. The backend updates player sale state, tournament-team purse, bids, and tournament status.
10. Dashboards show live state, squads, purse usage, and bid history.

Important: timer expiry does not automatically award the player. Admin finalization is required.

## Roles

- `admin`: creates tournaments, adds players, starts/resumes auction rounds, finalizes players, and views team/bid reports.
- `team_owner`: bids for their team in assigned tournaments and reviews squad/purse.
- `spectator`: watches live and completed auctions.

Public registration allows only `team_owner` and `spectator`. Admin accounts must not be created through public registration.

## Frontend Architecture

The frontend is route-driven and uses mostly local component state.

Main structure:

```text
src/main.jsx
  ThemeProvider
    App.jsx
      AuthProvider
        BrowserRouter
          /login
          /register
          /verify-email/:token
          /dashboard
          /start-live-auction
          /live-auction
          /spectator-live-auction
```

Key frontend files:

- `src/context/AuthContext.jsx`: stores user and token-backed login state.
- `src/utils/api.js`: Axios client; attaches bearer token from `localStorage`.
- `src/webSocket/socket.js`: Socket.IO singleton.
- `src/components/AuctionManagement.jsx`: admin tournament management.
- `src/components/AdminDashboardLayout/AuctionLive.jsx`: admin live auction control.
- `src/components/TeamOwnerDashboard/LiveAuction.jsx`: team-owner/spectator live auction view.
- `src/components/AdminDashboardLayout/TeamsOverview.jsx`: team and squad view.
- `src/components/TeamOwnerDashboard/BidHistory.jsx`: player bid history.

Frontend route guards are UX only. They are not a security boundary.

## Backend Architecture

The backend is an Express app with route/controller/model structure. Socket bidding currently lives in `src/index.js`.

Main backend flow:

```text
HTTP request -> Express route -> optional auth/role middleware
             -> controller -> Sequelize model/transaction -> MySQL

Socket event -> Socket.IO handler -> bid validation -> Sequelize transaction
             -> timer reset -> tournament room broadcast
```

Key backend files:

- `src/index.js`: Express setup, routes, Socket.IO setup, socket bid handler, startup.
- `src/controllers/auth.controller.js`: register, login, email verification.
- `src/controllers/tournment.controller.js`: tournament creation/status/read.
- `src/controllers/player.controller.js`: player creation/read and bid history.
- `src/controllers/team.controller.js`: team, squad, purse reads.
- `src/controllers/auction.controller.js`: start, timer, extend, sell, unsold, current player.
- `src/middleware/auth.middleware.js`: JWT auth and role checks.
- `src/utils/bidRules.js`: dynamic bid increment rules.
- `src/models/`: Sequelize models and associations.

## Data Model In Plain English

- `Users`: identity, login, role, email verification.
- `Teams`: reusable team identity and owner mapping.
- `Tournaments`: tournament name, budget, status, creator.
- `TournamentTeams`: tournament participation and tournament-specific purse.
- `Players`: tournament player pool and sold/unsold state.
- `Auctions`: one player-round state.
- `Bids`: accepted bid records.

Current purse source of truth is `TournamentTeams`. Legacy purse fields on `Teams` still exist but should not drive new tournament-scoped logic.

## Auction Rules To Know

- A tournament can have one active or pending auction round at a time.
- A player can be auctioned when not sold, not in auction, and without a completed `auctionId`.
- Bids must meet the dynamic minimum from `src/utils/bidRules.js`.
- Bids must not exceed the team's remaining tournament purse.
- Accepted bids are written in a transaction and reset the 20-second timer.
- Finalization updates the player, auction, and winning `TournamentTeam.amountSpent`.

## Current Status

Implemented:

- Public team owner/spectator registration.
- Optional email verification.
- JWT login/logout.
- Admin tournament creation.
- Admin player creation.
- Live auction round start/extend/sell/unsold.
- Real-time bidding through Socket.IO.
- Team owner squad and purse view.
- Team overview and bid history.
- Spectator live/completed auction view.

Partial or risky:

- Email verification is enforced only if `EMAIL_VERIFICATION_REQUIRED=true`.
- Read API authorization is incomplete.
- Socket identity is unauthenticated.
- Timers are process-local and not persisted.
- Schema management uses `sequelize.sync()` plus startup backfills.
- Tests are minimal.

Not implemented:

- Admin user management.
- Team edit/delete/reassignment.
- Tournament edit/delete/archive.
- Player import/export/edit/delete.
- Password reset/change.
- Audit logs.
- Production CI/CD, monitoring, backup, and migration pipeline.

## Production Blockers

Do not treat this app as production-ready until these are addressed:

- Authenticate Socket.IO and derive bidder identity server-side.
- Protect sensitive read APIs and sanitize all user/team responses.
- Add explicit CORS allowlists.
- Add expiring sessions and safer token storage.
- Persist auction deadlines.
- Replace `sequelize.sync()` with migrations.
- Add request/socket validation and rate limiting.
- Add integration tests for auction, auth, authorization, and purse rules.
- Add structured logging, health/readiness checks, backups, and deployment automation.

## Development Commands

Frontend:

```powershell
cd ipl-auction-tracker
npm install
npm run dev
npm run lint
npm run build
```

Backend:

```powershell
cd ipl-auction-tracker-backend
npm install
npm start
npm test
```

Backend tests currently cover only Phase 1 security helpers. Broader integration and frontend tests still need to be added.

## Environment Variables

Backend uses:

- `PORT`
- `MYSQL_DB_NAME`
- `MYSQL_DB_USER`
- `MYSQL_DB_HOST`
- `MYSQL_DB_PASSWORD`
- `MYSQL_DB_PORT`
- `JWT_SECRET`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `CLIENT_URL`
- `EMAIL_VERIFICATION_REQUIRED`

Frontend uses:

- `VITE_API_URL`

`JWT_SECRET` is mandatory for auth even if startup validation does not fully enforce it yet.

## First Things A New Developer Should Read

1. `AGENTS.md` for project rules and guardrails.
2. `PROJECT_CONTEXT.md` for business purpose and module overview.
3. `PROJECT_KNOWLEDGE.md` for technical flow and data model details.
4. `API.md` for HTTP and Socket.IO contracts.
5. `SecurityReview.md` and `IMPROVEMENT_ROADMAP.md` before changing auth, sockets, auction state, or deployment behavior.

## First Engineering Priorities

If you are joining to improve the system, start here:

1. Socket authentication and server-derived bidder identity.
2. Backend authorization on sensitive reads.
3. Persisted auction deadlines and migrations.
4. Request/socket validation and rate limiting.
5. Integration tests around live auction correctness.

Features like free-form bids, pass/fold, exports, and richer admin tooling should wait until the security and auction-integrity foundation is stronger.
