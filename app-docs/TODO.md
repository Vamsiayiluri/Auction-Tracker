# TODO.md

## P0 - Production Blockers

- Authenticate Socket.IO connections with JWT during handshake, load the user server-side, derive `ownerId` and eligible `teamId` from the authenticated user, and reject unauthorized room joins and bids.
- Protect sensitive read APIs. Add authentication, self/admin/tournament authorization, and sanitized DTOs for team, player, bid-history, current-auction, and tournament data where appropriate.
- Add explicit CORS allowlists for HTTP and Socket.IO instead of `origin: true`.
- Add JWT expiration and a safer session strategy, such as short-lived access tokens with refresh rotation in secure HttpOnly/SameSite cookies.
- Persist auction deadlines with an `endsAt` field and restore from the stored deadline instead of granting fresh 20-second timers after restart.
- Replace `sequelize.sync()` and startup schema backfills with versioned migrations.
- Add server-side request validation for auth, tournament creation, status updates, player creation, auction control, and socket payloads.
- Add rate limiting and brute-force protection for login, registration, resend verification, and socket bids.
- Add production operations basics: structured logs, request IDs, dependency-aware health/readiness checks, metrics, alerting, backups, and graceful shutdown.

## P1 - High Impact Improvements

- Add integration tests for authentication, admin-only tournament/player mutations, auction start/extend/sell/unsold, socket bid acceptance/rejection, purse enforcement, and authorization boundaries.
- Add allowed status values and transition validation for tournaments and auctions.
- Wrap player state update and auction row creation in a single transaction when starting an auction round.
- Stop accepting client-generated IDs for security-sensitive entities, especially bids and auctions; generate IDs server-side.
- Add database indexes for common filters:
  - `Players(tournamentId, isInAuction, isSold, auctionId)`
  - `Players(teamId, tournamentId)`
  - `Bids(playerId, tournamentId, bidAmount)`
  - `Bids(playerId, tournamentId, createdAt)`
  - `Auctions(tournamentId, status)`
  - `Auctions(currentPlayerId, tournamentId, status)`
  - `Teams(ownerId)`
- Replace N+1 queries in player bid history and all-teams-with-players endpoints with joined or batched queries.
- Add pagination and search/filtering to list endpoints.
- Add backend summary endpoints so dashboards do not fetch players and teams per tournament from the client.
- Remove internal `error.message` from client-facing 500 responses and add a global error handler.
- Add Helmet/CSP and review XSS impact because JWTs are currently stored in `localStorage`.
- Enforce password policy, add password reset/change, and consider account lockout.
- Escape user-controlled values in SendGrid email HTML.
- Verify MySQL TLS certificates in production instead of using `rejectUnauthorized: false`.

## P2 - Product and Admin Features

- Add admin user management: invite/provision admin, disable users, reset accounts, and change roles.
- Add team management after registration: edit team, reassign owner, disable/delete team, and handle duplicate names cleanly.
- Add tournament edit/archive/delete controls with safe restrictions once auction activity exists.
- Add player edit/delete/import/export workflows before a player enters auction.
- Add configurable auction duration and bid increment rules per tournament.
- Add explicit pass/fold controls if still desired by product requirements.
- Add free-form bid input only after strong server-side validation and UX safeguards.
- Add audit logs for admin actions, bids, finalization, auth events, and security-sensitive changes.
- Add exports for team squads, bid history, and tournament results.
- Add richer spectator views and completed tournament archive pages.

## P3 - Code Quality and Maintainability

- Fix naming debt such as `tournment`, `ViewerDashBoard`, and `getTeamByid` through careful compatibility-preserving refactors.
- Replace the generic `ipl-auction-tracker/README.md` with an application-specific frontend README.
- Remove or implement the unused bid REST route/controller skeleton.
- Introduce a backend service layer only where it reduces controller complexity, especially auction and bidding logic.
- Centralize frontend data-fetching patterns with custom hooks or a query library once API shape is stable.
- Reduce duplication between admin/team-owner/spectator live auction state handlers.
- Centralize currency formatting and tournament enrichment logic.
- Add `.env.example` files for frontend and backend.
- Add CI/CD with lint, tests, build, dependency scanning, migration execution, and rollback steps.
- Add frontend tests for route guards, dashboard filtering, live auction UI states, and bid button enablement.

## Bugs and Correctness Risks

- Live auction restart gives every live auction a fresh 20 seconds because deadlines are not persisted.
- Socket bidder identity can be spoofed by sending another owner/team pair.
- Public team endpoints can reveal arbitrary owners and nested user data.
- Tournament status endpoint accepts arbitrary strings.
- Bid IDs are client-generated and can collide.
- Auction start is not atomic across player and auction writes.
- Monetary types are inconsistent: player prices use floats while bids and purses are integers.
- `Bids.teamName` and `Bids.ownerId` may become stale if teams or owners change.
- `Tournament.createdBy` is logically a user ID but has no declared association.
- `Player.auctionId` duplicates auction relationship state and can drift from `Auction.currentPlayerId`.
- Registration lacks robust server-side validation for email format, password strength, name, and client-generated ID format.
- Registration succeeds even when verification email sending fails; this may be acceptable for MVP but should be explicit product policy.
- Email verification is optional unless `EMAIL_VERIFICATION_REQUIRED=true`.
- Health check can pass while MySQL, SendGrid, or Socket.IO functionality is broken.

## Documentation Follow-Up

- Keep `README.md`, `Architecture.md`, `API.md`, `Database.md`, `SecurityReview.md`, and `DeploymentGuide.md` updated when security hardening or API behavior changes.
- Document the actual auction outcome behavior clearly: timer expiry locks bidding and admin finalization decides the result.
- Document all environment variables, including `JWT_SECRET`, in tracked examples.
- Document operational runbooks for migration, backup, restore, incident response, and deployment rollback.
