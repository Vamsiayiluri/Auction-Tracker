# AuctionArena Codebase Audit

Audit date: 2026-06-05

This document is based on the tracked source code in `ipl-auction-tracker` and
`ipl-auction-tracker-backend`, plus `Auction Management.docx`. Features are
described as implemented only when executable code supports them.

## Executive Summary

AuctionArena is a browser-based IPL-style player auction platform. Admins create
tournaments from registered teams and player pools, run timed player rounds,
and finalize players as sold or unsold. Team owners join tournaments assigned
to their team, bid in real time, and inspect their squad and purse. Spectators
watch live or completed tournaments without bidding.

Core workflows are registration and optional email verification, login,
tournament and player setup, tournament discovery, real-time player bidding,
admin finalization, squad review, and bid-history review.

Technology stack:

- Frontend: React 19, Vite 6, React Router 7, Material UI 6, Axios, Socket.IO
  Client. Evidence: `ipl-auction-tracker/package.json`,
  `ipl-auction-tracker/src/App.jsx`.
- Backend: Node.js ES modules, Express 4, Socket.IO, Sequelize 6, MySQL,
  bcryptjs, JWT, SendGrid. Evidence:
  `ipl-auction-tracker-backend/package.json`,
  `ipl-auction-tracker-backend/src/index.js`.
- Persistence: Sequelize-managed MySQL tables with startup synchronization and
  in-code backfills. Evidence:
  `ipl-auction-tracker-backend/src/models/index.js`.

Maturity: **functional prototype / pre-production MVP**. The principal auction
flow exists, but broad authorization gaps, unauthenticated sockets, in-memory
timers, no automated tests, no CI/CD, and limited operational controls prevent
production readiness.

Documentation discrepancy: `ipl-auction-tracker/README.md` is still the generic
Vite template. `Auction Management.docx` calls automatic winner assignment at
timer expiry and free-form bid input/pass-fold controls planned behavior. The
code instead locks bidding at expiry for explicit admin sell/unsold/extend
action, and exposes a single next-minimum-bid button. Evidence:
`ipl-auction-tracker-backend/src/controllers/auction.controller.js`,
`ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`.

## Feature Inventory

| Feature | Description | Status | Frontend files | Backend files | Tables / dependencies |
|---|---|---|---|---|---|
| Role-based registration | Public registration creates team owner or spectator accounts; creates a team for a team owner | Implemented | `src/pages/Register.jsx` | `src/controllers/auth.controller.js`, `src/routes/authRoutes.js` | `Users`, `Teams`; `bcryptjs`, `uid` |
| Email verification | Sends, verifies, and resends hashed 24-hour verification tokens | Partial Implementation: login enforcement is environment-controlled and registration succeeds if email send fails | `src/pages/VerifyEmail.jsx`, `src/pages/Login.jsx` | `src/controllers/auth.controller.js`, `src/utils/emailService.js` | `Users`; SendGrid, `crypto` |
| Login/logout | Password login returns JWT; frontend stores user/token and logout clears them | Implemented | `src/pages/Login.jsx`, `src/context/AuthContext.jsx`, `src/components/AppShell.jsx` | `src/controllers/auth.controller.js`, `src/middleware/auth.middleware.js` | `Users`; JWT, bcryptjs |
| Client route guards | Restricts frontend pages by stored user role | Implemented client-side only | `src/components/RouteGuards.jsx`, `src/App.jsx` | None | React Router |
| Team creation | Team is created while a team owner registers | Partial Implementation: no later create/edit/delete UI or API | `src/pages/Register.jsx` | `src/controllers/auth.controller.js` | `Teams`, `Users` |
| Tournament creation | Admin selects existing teams, budget, and initial players through an authenticated admin endpoint | Implemented | `src/components/AuctionManagement.jsx` | `src/controllers/tournment.controller.js`, `src/routes/tournmentRoutes.js` | `Tournaments`, `TournamentTeams`, `Players` |
| Add player | Authenticated admins add players during tournament creation or afterward | Implemented | `src/components/AuctionManagement.jsx` | `src/controllers/player.controller.js` | `Players`, `Tournaments` |
| Tournament discovery | Lists tournaments and filters by role/status/team participation | Implemented; filtering is frontend-only | `src/components/AvailableAuctions.jsx` | tournament/team/player controllers | `Tournaments`, `TournamentTeams`, `Teams`, `Players` |
| Admin auction control | Starts a player round; extends, sells, or marks unsold after lock | Implemented | `src/components/AdminDashboardLayout/AuctionLive.jsx` | `src/controllers/auction.controller.js`, `src/routes/auctionRoutes.js` | `Auctions`, `Players`, `Bids`, `TournamentTeams`, `Tournaments` |
| 20-second auction timer | Starts/reset timer and locks bidding at expiry | Partial Implementation: deadline is memory-only and restart grants a fresh 20 seconds | `src/components/VisualTimer.jsx` | `src/controllers/auction.controller.js` | `Auctions`; Node timers |
| Real-time bidding | Tournament Socket.IO rooms, validated transactional bids, broadcasts | Implemented, with unauthenticated socket identity | `src/components/TeamOwnerDashboard/LiveAuction.jsx`, `src/webSocket/socket.js` | `src/index.js`, `src/utils/bidRules.js` | `Bids`, `Players`, `Teams`, `TournamentTeams`, `Auctions`; Socket.IO |
| Dynamic minimum bid | Server chooses increments based on current bid and budget stage | Implemented server-side | `src/utils/bidUtils.js` is fallback only | `src/utils/bidRules.js` | None |
| Squad and purse view | Team owner sees purchased players, spent amount, and remaining purse | Implemented | `src/components/TeamOwnerDashboard/MyTeam.jsx` | `src/controllers/team.controller.js` | `Teams`, `TournamentTeams`, `Players` |
| Teams overview | Shows team squads and purse usage | Implemented | `src/components/AdminDashboardLayout/TeamsOverview.jsx` | team/player controllers | `Teams`, `TournamentTeams`, `Players` |
| Bid history | Shows auctioned players, outcomes, and per-player bids | Implemented, with N+1 query pattern | `src/components/TeamOwnerDashboard/BidHistory.jsx` | `src/controllers/player.controller.js` | `Players`, `Bids` |
| Spectator mode | Watches live auction, teams, and bid history | Implemented UI; data APIs and sockets are public regardless of role | `src/components/SpectatorDashboard/SpectatorAuction.jsx` | public read routes and socket events | All auction read tables |
| Health endpoint | Returns backend health response | Implemented, shallow only | None | `src/index.js` | Express |
| Bid REST routes | Empty router/controller skeleton | Deprecated / unused | None | `src/routes/bidRoutes.js`, `src/controllers/bid.controller.js` | None |

All frontend paths above are relative to `ipl-auction-tracker/src`; all backend
paths are relative to `ipl-auction-tracker-backend/src`.

## User Workflows

Detailed workflows are in [UserGuide.md](UserGuide.md) and
[AdminGuide.md](AdminGuide.md).

| Workflow | Entry point | API/socket calls | Database updates | Success / failure |
|---|---|---|---|---|
| Register | `/register` | `POST /api/auth/register` | Inserts `Users`; optionally `Teams` | 201 and verification email attempt; duplicate/validation/database failures |
| Verify email | emailed `/verify-email/:token` | `GET /api/auth/verify-email/:token` | Updates verification fields in `Users` | Valid unexpired token; invalid/expired token fails |
| Login | `/login` | `POST /api/auth/login` | None | JWT/user returned; bad credentials or required verification fails |
| Discover tournament | `/dashboard` | tournament, player, and team GETs | None | Role-filtered cards displayed; network/API failures |
| Join/watch auction | card or role navigation | GET current player; socket `join-tournament` | None | Room events display; missing tournament/current round |
| Place bid | team-owner live room | socket `place-bid` | Inserts `Bids`; resets in-memory timer | Valid membership, purse, increment, live timer; otherwise `bid-rejected` |
| Finalize player | admin live room | `POST sell` or `POST unsold` | Updates `Players`, `Auctions`, and winning `TournamentTeams` | Pending round and valid outcome; otherwise 400/500 |

## Administrative Capabilities

| Capability | Purpose | Access control | Evidence | APIs / tables |
|---|---|---|---|---|
| Tournament management | Create, inspect, start/resume tournaments | Create/status mutations require authenticated admin; reads remain public | `src/components/AuctionManagement.jsx`, backend `src/routes/tournmentRoutes.js` | Tournament routes; `Tournaments`, `TournamentTeams`, `Players` |
| Player management | Add player during/after creation | Creation requires authenticated admin | `src/components/AuctionManagement.jsx`, backend `src/routes/playerRoutes.js` | `POST /api/players`; `Players` |
| Live auction management | Start round, extend, sell, unsold | JWT plus backend admin middleware | `src/components/AdminDashboardLayout/AuctionLive.jsx`, backend `src/routes/auctionRoutes.js` | Auction POST routes; `Auctions`, `Players`, `TournamentTeams` |
| Team overview | Inspect squads and purses | Frontend admin route only; APIs public | `src/components/AdminDashboardLayout/TeamsOverview.jsx` | Team/player GET routes |
| Bid-history reporting | Inspect outcomes and bid sequence | Frontend admin route only; API public | `src/components/TeamOwnerDashboard/BidHistory.jsx` | `GET /api/players/playerBids/:tournamentId` |
| User management | None beyond open self-registration | Not implemented | No user-management routes or components | `Users` exists but no management API |
| System configuration | Environment variables only | Server/operator controlled | `src/config/dbconfig.js`, `src/utils/emailService.js` | `.env` |

## Architecture Summary

Frontend:

```text
main.jsx
  ThemeProvider
    App.jsx
      AuthProvider
        BrowserRouter
          Guest routes: Login, Register
          VerifyEmail
          Protected AppShell
            Dashboard -> role dashboard
            Admin -> AdminAuctionDashboard -> AuctionLive / Teams / BidHistory
            Team owner -> BiddingAuction -> Live / MyTeam / Teams / History
            Spectator -> SpectatorAuction -> Live / Teams / History
```

State is local React state plus one authentication context. Axios attaches a
JWT from `localStorage`; Socket.IO is a module singleton without authentication.
There is no Redux/query cache/custom-hook layer. Evidence:
`ipl-auction-tracker/src/context/AuthContext.jsx`,
`ipl-auction-tracker/src/utils/api.js`,
`ipl-auction-tracker/src/webSocket/socket.js`.

Backend:

```text
HTTP client -> Express route -> optional auth/role middleware
            -> controller -> Sequelize model -> MySQL

Socket client -> Socket.IO event handler -> validation + Sequelize transaction
              -> in-memory timer -> tournament-room broadcast
```

There is no separate service layer, request-schema validation library, global
error middleware, or structured logger. See [Architecture.md](Architecture.md).

## Scalability Review

- Database: Sequelize relations and one unique composite index exist, but most
  foreign keys and common filters have no explicit indexes. Player bid history
  and all-teams-with-players use N+1 queries. Evidence:
  `src/models/tournamentTeam.model.js`, `src/controllers/player.controller.js`,
  `src/controllers/team.controller.js`.
- API: list endpoints have no pagination; tournament dashboards fan out into
  multiple requests per tournament. Evidence:
  `src/components/AuctionManagement.jsx`,
  `src/components/AvailableAuctions.jsx`.
- Real time: Socket.IO rooms are suitable for live updates, but sockets are
  unauthenticated and timers are process-local. Horizontal scaling would need
  a Socket.IO adapter and shared/persisted deadlines. Evidence:
  `src/index.js`, `src/controllers/auction.controller.js`.
- Caching/background work: no cache or queue exists. Email is awaited during
  registration/resend. Evidence: `src/controllers/auth.controller.js`.

Recommendations: persist `endsAt`; add Redis/Socket.IO adapter and distributed
lock; paginate history/lists; use joined/aggregated queries; add indexes listed
in `Database.md`; move email to a queue; replace per-tournament frontend
fan-out with summary endpoints.

## Code Quality Review

| Category | Score | Evidence and rationale |
|---|---:|---|
| Folder structure | 7/10 | Clear frontend/backend split and route/controller/model folders; no backend service/validation/test folders |
| Naming conventions | 5/10 | Mostly readable, but persistent `tournment` misspelling, `ViewerDashBoard`, and legacy route names such as `getTeamByid` |
| Reusability | 6/10 | Shared live component, team overview, API client, timer, and bid helpers; formatting and tournament loading repeat |
| Separation of concerns | 5/10 | Controllers contain business logic and socket bidding lives in `index.js`; large UI components combine fetching and presentation |
| Duplicate code | 5/10 | Admin/team-owner/spectator room headers and tournament loading are repeated; frontend/server bid fallback rules can diverge |
| Testability | 3/10 | Focused Phase 1 security unit tests exist; no broader controller/integration/frontend tests |
| Technical debt | 5/10 | Legacy backfills at startup, empty bid route, generic frontend README, and no migrations remain |

## Missing Features

Must-have before production:

- Backend authorization on remaining sensitive team/tournament/player reads.
- Authenticated Socket.IO connections with server-derived user/team identity.
- Broader server-side request validation beyond the implemented public-role
  allowlist.
- Persistent auction deadlines, migration tooling, tests, logging, monitoring,
  rate limiting, and CI/CD.
- Password reset/change and secure account administration.

Nice-to-have:

- Pagination/search, invitation management, explicit pass/fold, configurable
  duration/increments, team export, audit log, richer health checks, and
  tournament archive/delete controls.

Enterprise:

- SSO/MFA, tenant isolation, granular RBAC, immutable audit trails, approval
  workflows, disaster recovery, analytics, and high-availability real-time
  infrastructure.

These are missing because no supporting routes, controllers, components, or
models exist. Some are mentioned as future enhancements in
`Auction Management.docx`, but not implemented.

## Production Readiness

Readiness score: **34/100**

| Area | Assessment |
|---|---|
| Logging | Console logging only; no levels, request IDs, or central sink |
| Monitoring | `/health` exists but does not check DB/socket/email dependencies |
| Error handling | Per-controller try/catch; no global handler; internal errors sometimes returned |
| Security | Password hashing and JWT verification exist, but major authorization/socket/CORS/token risks remain |
| CI/CD | No workflow files or deployment pipeline |
| Backups | No backup/restore configuration or guide in codebase |
| Environment | Backend env usage exists; frontend Vite env exists; no tracked examples or validation for all secrets |
| Testing | Focused Phase 1 backend unit tests exist; broader automated coverage is absent and npm is unavailable in this audit environment |

## Resume-Ready Project Description

### Short Version

Built AuctionArena, a full-stack real-time player auction platform for admins,
team owners, and spectators. Developed a React and Material UI frontend with
role-aware dashboards, tournament setup, live auction controls, squad views,
and bid-history reporting. Implemented an Express, Socket.IO, Sequelize, and
MySQL backend supporting tournament-scoped teams, transactional bid validation,
dynamic bid increments, purse enforcement, timed player rounds, and explicit
sold/unsold finalization. Added JWT login, bcrypt password hashing, optional
SendGrid email verification, and responsive live updates through
tournament-specific socket rooms.

### Medium Version

Developed AuctionArena, a full-stack IPL-style auction management application
for administrators, team owners, and spectators. The React 19 frontend uses
Vite, Material UI, React Router, Axios, and Socket.IO Client to provide
role-aware dashboards, tournament discovery, player-pool management, live
bidding, squad and purse views, team comparisons, and per-player bid history.

Built the Node.js and Express backend with Sequelize and MySQL. The backend
models users, teams, tournaments, tournament participation, players, auctions,
and bids. Real-time bidding uses tournament-specific Socket.IO rooms and
transactional database operations to validate active rounds, team ownership,
tournament participation, dynamic minimum increments, and remaining purse
before accepting a bid. Each accepted bid resets a 20-second timer. At expiry,
the auction is locked for an admin to extend the round, sell to the highest
bidder, or mark the player unsold; finalization updates squad assignments and
tournament purse usage atomically.

Implemented JWT login, bcrypt password hashing, role-aware client routing, and
SendGrid-backed email verification with hashed expiring tokens and resend
cooldown. Also added tournament-scoped team budgets, legacy-data backfills,
health checking, and responsive live event handling. The current codebase is a
working pre-production MVP and includes identified hardening needs around
backend authorization, socket authentication, persistent timers, automated
testing, and deployment operations.

### Detailed Version

AuctionArena is a full-stack, real-time IPL-style player auction platform
designed around three user roles: administrators who configure and run
tournaments, team owners who bid and build squads, and spectators who follow
live and completed auctions. The project uses React 19, Vite, Material UI,
React Router, Axios, and Socket.IO Client on the frontend, with Node.js,
Express, Socket.IO, Sequelize, and MySQL on the backend.

The application supports public account registration, team creation during
team-owner registration, JWT-based login, role-aware client navigation, and
optional email-verification enforcement. Verification links use cryptographically
random tokens, store only SHA-256 token hashes, expire after 24 hours, and can
be resent with a cooldown. Passwords are hashed with bcryptjs.

Administrators can create tournaments by selecting registered teams, defining
a per-team budget, and adding an initial player pool. Players can also be added
after tournament creation. Admins can start or resume a tournament, select an
available player by role, start a timed round, monitor bids, extend an expired
round, sell the player to the highest bidder, or mark the player unsold. Team
owners see only tournaments containing their team in the frontend, can enter
live tournament rooms, place the next valid bid, review their purchased
players, and track total, spent, and remaining purse. Spectators can watch live
and completed tournaments, team squads, and bid histories.

Real-time auction behavior is implemented with tournament-specific Socket.IO
rooms. The backend validates each bid against the active player and auction,
team ownership, tournament participation, sold status, dynamic minimum bid,
and remaining purse. Bid insertion runs inside a Sequelize transaction and
accepted bids reset the 20-second server timer before broadcasting the new
state. When time expires, bidding moves to a pending-finalization state rather
than immediately assigning a winner. Admin finalization atomically updates the
player, auction, and winning tournament-team purse, then broadcasts the result.

The persistence model covers users, reusable teams, tournaments,
tournament-team participation and budgets, players, player-round auctions, and
bids. Startup synchronization adds legacy tournament-scoped fields and
backfills older records. The system also includes responsive Material UI
layouts, health checking, bid increment utilities, tournament completion
detection, and live timer restoration after restart.

The implementation is a functional pre-production MVP. A formal audit
identified the next engineering priorities: enforce authorization on all
backend mutation and sensitive read endpoints, authenticate sockets and derive
identity server-side, persist auction deadlines, replace startup schema changes
with migrations, add validation and rate limiting, introduce automated tests
and CI/CD, and add structured logging, monitoring, backups, and high-availability
real-time infrastructure.

## Final Scorecard

| Dimension | Score | Rationale |
|---|---:|---|
| Feature Completeness | 7/10 | End-to-end principal auction workflow exists; account/admin/operations features are limited |
| Architecture | 6/10 | Clear full-stack separation and transactional auction logic; service boundaries and persistent real-time state are missing |
| Code Quality | 5/10 | Readable and reasonably organized, but duplicated large components, naming debt, and no tests |
| Security | 5/10 | Phase 1 fixed public admin registration, core admin mutations, and auth DTO exposure; unauthenticated sockets and public sensitive reads remain |
| Scalability | 4/10 | Tournament rooms and transactions help; process-local timers, N+1 queries, and no pagination/cache limit scale |
| Documentation | 3/10 before audit | Only a generic Vite README and intent document existed; these deliverables improve it |
| Production Readiness | 4/10 | Focused security tests exist, but CI/CD, monitoring, backups, migrations, and robust operational controls remain absent |

**Overall Score: 47/100**

Supporting detail is in `Architecture.md`, `API.md`, `Database.md`,
`SecurityReview.md`, `DeploymentGuide.md`, `UserGuide.md`, and `AdminGuide.md`.
