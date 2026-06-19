# AGENTS.md

## Project Rules

- Do not treat frontend route guards as security. Any sensitive backend route must enforce authentication and role/ownership checks server-side.
- Do not trust client-supplied identity in Socket.IO payloads. Future socket work should authenticate the handshake JWT and derive user/team identity from the server-side user record.
- Preserve tournament-scoped purse logic in `TournamentTeams`; legacy purse fields on `Teams` exist only for backward compatibility.
- Keep auction state tournament-scoped. Player, bid, auction, and team queries should include `tournamentId` where applicable.
- Do not introduce public admin registration. Public registration is limited to `team_owner` and `spectator`.
- Keep authentication responses sanitized through `toSafeUserResponse`; never serialize password hashes or verification tokens to clients.
- Avoid changing auction timer behavior casually. Current behavior locks bidding on expiry and requires admin finalization.
- Use server-side bid validation as the source of truth. Frontend bid utilities are display/fallback helpers only.
- Do not rely on `sequelize.sync()` and startup backfills for new schema changes in production work. Prefer explicit migrations.
- Treat the repository as a pre-production MVP. Security, testing, migrations, and operational hardening are not optional for production readiness.

## Repository Layout

```text
Auction-Tracker/
  ipl-auction-tracker/          React/Vite frontend
  ipl-auction-tracker-backend/  Express/Socket.IO/Sequelize backend
  README.md                     Codebase audit summary
  AdminGuide.md                 Admin workflow documentation
  UserGuide.md                  Team owner/spectator workflow documentation
  Architecture.md               Architecture and state model
  Database.md                   Database model analysis
  API.md                        HTTP and Socket.IO contract
  SecurityReview.md             Security findings and remediations
  DeploymentGuide.md            Deployment notes and operational gaps
```

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

The documented audit environment noted that `npm` was unavailable on PATH during prior verification. If command execution fails, verify the local Node/npm installation before diagnosing application code.

## Frontend Guidelines

- Use React 19, Vite, React Router 7, Material UI 6, Axios, and Socket.IO Client patterns already present in `ipl-auction-tracker/src`.
- Keep authenticated HTTP calls routed through `src/utils/api.js` so bearer token attachment remains centralized.
- Keep the Socket.IO singleton in `src/webSocket/socket.js`; update it when socket authentication is added.
- Prefer shared components already in use: `AppShell`, `AuthLayout`, `AvailableAuctions`, `LiveAuction`, `TeamsOverview`, `BidHistory`, `VisualTimer`, and `BrandLogo`.
- Frontend role checks are for UX only. Do not describe them as authorization.
- Use Material UI components consistently. Avoid adding a second component library.
- Be careful with dashboard fan-out. Current components often fetch tournaments, then players and teams per tournament; new work should prefer summary endpoints when available.

## Backend Guidelines

- Use ES modules throughout the backend.
- Keep route files thin and put current business logic in controllers unless a service layer is intentionally introduced.
- Protect admin mutations with `authMiddleware` and `adminMiddleware`.
- Add ownership/team membership checks for team-owner functionality.
- Use Sequelize transactions for multi-row auction, bid, purse, and finalization changes.
- Validate request bodies and path/query parameters server-side. Current validation is manual and incomplete.
- Do not return raw Sequelize user objects in API responses.
- Prefer integer monetary values. Existing player prices use floats in places, but bid and purse logic should stay integer-based.
- Avoid exposing internal exception messages in client-facing 500 responses.
- Keep raw SQL limited to controlled migration/backfill contexts.

## Testing Guidelines

- Backend tests use Node's built-in test runner via `npm test`.
- Existing coverage is limited to Phase 1 security helpers in `ipl-auction-tracker-backend/test/security-phase1.test.js`.
- Add focused unit tests for pure helpers such as bid rules and response DTOs.
- Add integration tests for auth, protected admin routes, tournament creation, current auction state, bid acceptance/rejection, sell/unsold finalization, and authorization boundaries.
- Add frontend tests before significant UI refactors; no frontend test harness currently exists.

## Security Guidelines

- Highest-priority risks are unauthenticated sockets, public sensitive read APIs, non-expiring JWTs in `localStorage`, permissive CORS, missing rate limiting, and incomplete validation.
- Configure explicit CORS origins per environment before production.
- Add Helmet/CSP and rate limiting before production deployment.
- Treat `JWT_SECRET`, MySQL credentials, SendGrid credentials, and email sender configuration as secrets.
- Frontend `.env` may contain only public `VITE_*` values.
- Database TLS currently disables certificate verification; do not copy that setting into production without a reviewed reason.

## Operational Guidelines

- The backend is stateful because auction timers are process-local. Do not horizontally scale it until timers/deadlines and Socket.IO coordination are moved to shared infrastructure.
- `GET /health` is shallow and checks only Express responsiveness.
- No Dockerfile, CI/CD workflow, migration pipeline, process manager config, monitoring, or backup automation is present.
- Production deployment needs dependency-aware health checks, structured logging, request IDs, metrics, backups, migration controls, and graceful shutdown.
