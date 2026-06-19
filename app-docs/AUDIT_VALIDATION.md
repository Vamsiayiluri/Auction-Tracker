# AUDIT_VALIDATION.md

Generated: 2026-06-05

Scope: validation of Critical and High priority findings from `SecurityReview.md` and the explicitly requested findings against the current source code. No code changes were made.

Note: the requested `SECURITY_REVIEW.md` file is not present in the repository. The repository contains `SecurityReview.md`, which was used for this validation.

## Summary

| Finding | Severity | Still valid? | Current status |
|---|---:|---:|---|
| Admin self-registration | High / previously critical | No | Public admin registration is blocked in frontend and backend. |
| Public tournament APIs | High | Partially | Mutations are admin-protected; read endpoints remain public. |
| Public player APIs | High | Partially | Player creation is admin-protected; player and bid-history reads remain public. |
| Password hash exposure | High | Partially | Auth responses are sanitized; `/api/teams` can still expose nested owner user data. |
| JWT expiration missing | High | Yes | Login signs JWT without `expiresIn`; frontend stores token in `localStorage`. |
| Socket authentication missing | Critical | Yes | Socket.IO has no auth handshake and accepts caller-supplied identity. |
| Sensitive team/read APIs public | High | Yes | Team endpoints are public and accept arbitrary owner IDs. |
| Permissive CORS | High | Yes | HTTP and Socket.IO use `origin: true` with credentials. |

## Detailed Validation

### 1. Admin Self-Registration

Severity: High / previously critical

Is it still valid? No

Evidence:

- Frontend registration exposes only `team_owner` and `spectator` in `ipl-auction-tracker/src/pages/Register.jsx`.
- Backend allowlist in `ipl-auction-tracker-backend/src/utils/publicRegistrationRoles.js` contains only `team_owner` and `spectator`.
- `registerUser` rejects any role not passing `isPublicRegistrationRole(role)` before creating a user in `ipl-auction-tracker-backend/src/controllers/auth.controller.js`.
- `ipl-auction-tracker-backend/test/security-phase1.test.js` verifies that `admin` is not a public registration role.

Affected files:

- `ipl-auction-tracker/src/pages/Register.jsx`
- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/utils/publicRegistrationRoles.js`
- `ipl-auction-tracker-backend/test/security-phase1.test.js`

Impact:

- Current public registration path no longer allows a user to self-select the admin role.
- Residual risk remains only if admins are provisioned manually without a controlled process, because no admin user-management workflow exists.

Recommended fix:

- Keep the current public role allowlist.
- Add a controlled admin provisioning flow or documented seed/invite process.
- Add integration tests for `POST /api/auth/register` rejecting `admin` and accepting only valid public roles.

Estimated effort:

- 0.5-1 day for additional integration tests.
- 3-5 days for a proper admin invite/provisioning workflow.

### 2. Public Tournament APIs

Severity: High

Is it still valid? Partially

Evidence:

- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js` protects `POST /api/tournament/create` with `authMiddleware` and `adminMiddleware`.
- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js` protects `PATCH /api/tournament/:id/status` with `authMiddleware` and `adminMiddleware`.
- `GET /api/tournament` and `GET /api/tournament/:id` are public.
- `getAllTournaments` returns all tournaments without auth or role filtering.
- `getTournamentById` returns any tournament by ID without auth or membership checks.

Affected files:

- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `ipl-auction-tracker/src/components/AvailableAuctions.jsx`

Impact:

- Unauthorized users can enumerate tournaments and inspect tournament metadata.
- Frontend role filtering gives a false sense of access control because backend reads do not enforce role, team ownership, or tournament membership.
- Mutation exposure is mostly remediated for create/status changes.

Recommended fix:

- Add authentication to tournament reads.
- Enforce role-specific visibility:
  - Admins can read all tournaments.
  - Team owners can read tournaments containing their team.
  - Spectators can read only live/completed tournaments intended for public viewing.
- Return explicit tournament DTOs instead of raw model objects.
- Add integration tests for anonymous, spectator, team owner, and admin access.

Estimated effort:

- 3-5 days for authorization and DTOs.
- 1-2 additional days for integration tests.

### 3. Public Player APIs

Severity: High

Is it still valid? Partially

Evidence:

- `ipl-auction-tracker-backend/src/routes/playerRoutes.js` protects `POST /api/players` with `authMiddleware` and `adminMiddleware`.
- `GET /api/players` is public.
- `GET /api/players/playerBids/:tournamentId` is public.
- `getPlayers` returns all players when no `tournamentId` query is supplied, or all players for any supplied tournament.
- `getPlayersWithBidsByTournamentId` returns every player in a tournament plus bids without auth or membership checks.

Affected files:

- `ipl-auction-tracker-backend/src/routes/playerRoutes.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `ipl-auction-tracker/src/components/AvailableAuctions.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/BidHistory.jsx`

Impact:

- Anonymous clients can enumerate player pools and bid histories.
- Team owners may be able to inspect bid history or player data for tournaments they do not participate in.
- Player creation itself is admin-protected, so mutation risk is reduced.

Recommended fix:

- Require auth for player and bid-history reads.
- Scope reads by role and tournament membership.
- Consider separate public spectator DTOs for live/completed tournaments.
- Add pagination to bid-history reads after access control is in place.
- Add integration tests for anonymous denial and role-scoped access.

Estimated effort:

- 3-6 days for access control and DTOs.
- 2-3 days more if pagination/search is included.

### 4. Password Hash Exposure

Severity: High

Is it still valid? Partially

Evidence:

- Auth registration/login responses call `toSafeUserResponse(newUser)` and `toSafeUserResponse(user)` in `ipl-auction-tracker-backend/src/controllers/auth.controller.js`.
- `toSafeUserResponse` returns only `id`, `name`, `email`, `role`, and `isVerified` in `ipl-auction-tracker-backend/src/utils/userResponse.js`.
- `User` model includes `password`, `verificationToken`, and `verificationExpires` in `ipl-auction-tracker-backend/src/models/user.model.js`.
- `getTeams` calls `Team.findAll({ include: [{ model: User, as: "owner" }] })` when no `tournamentId` query is supplied in `ipl-auction-tracker-backend/src/controllers/team.controller.js`.
- `User` has no default scope excluding sensitive fields, so the included owner can expose password hashes and verification metadata through public `GET /api/teams`.

Affected files:

- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/utils/userResponse.js`
- `ipl-auction-tracker-backend/src/controllers/team.controller.js`
- `ipl-auction-tracker-backend/src/routes/teamRoutes.js`
- `ipl-auction-tracker-backend/src/models/user.model.js`
- `ipl-auction-tracker-backend/src/models/team.model.js`

Impact:

- The original auth response exposure is remediated.
- A high-risk exposure remains through team read endpoints, especially public `GET /api/teams`, because nested owner objects can include password hashes and verification fields.
- Exposed password hashes increase credential compromise risk if hashes are cracked or reused elsewhere.

Recommended fix:

- Never include raw `User` model instances in public responses.
- Use owner DTOs or Sequelize `attributes` exclusions on every include.
- Add a default user scope excluding `password`, `verificationToken`, and `verificationExpires`, while using explicit scopes for authentication lookups.
- Protect team reads with auth and role/ownership checks.
- Add tests asserting password and verification fields are absent from all user-containing responses.

Estimated effort:

- 1-2 days for DTO/default-scope cleanup.
- 2-4 days including route authorization and integration tests.

### 5. JWT Expiration Missing

Severity: High

Is it still valid? Yes

Evidence:

- `loginUser` signs tokens with `jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET)` and no `expiresIn` option in `ipl-auction-tracker-backend/src/controllers/auth.controller.js`.
- `authMiddleware` verifies the token but does not enforce any additional server-side expiration or revocation checks in `ipl-auction-tracker-backend/src/middleware/auth.middleware.js`.
- Frontend stores `token` and `user` in `localStorage` in `ipl-auction-tracker/src/context/AuthContext.jsx`.
- Axios attaches the token from `localStorage` in `ipl-auction-tracker/src/utils/api.js`.

Affected files:

- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/middleware/auth.middleware.js`
- `ipl-auction-tracker/src/context/AuthContext.jsx`
- `ipl-auction-tracker/src/utils/api.js`

Impact:

- A stolen token can remain valid indefinitely unless the secret changes or the user is deleted.
- `localStorage` increases blast radius of any XSS because bearer tokens are readable by injected JavaScript.
- No revocation, refresh rotation, or session lifecycle exists.

Recommended fix:

- Add short `expiresIn` values to access tokens.
- Add refresh token rotation with secure HttpOnly/SameSite cookies, or another controlled session mechanism.
- Add logout/revocation support.
- Add CSP/security headers to reduce XSS risk.
- Add tests for expired tokens and invalid refresh flows.

Estimated effort:

- 1 day for basic `expiresIn`.
- 5-10 days for a proper access/refresh/session redesign with frontend changes and tests.

### 6. Socket Authentication Missing

Severity: Critical

Is it still valid? Yes

Evidence:

- `ipl-auction-tracker/src/webSocket/socket.js` creates the Socket.IO client with `io(SOCKET_URL, { autoConnect: false })` and sends no token/auth payload.
- `ipl-auction-tracker-backend/src/index.js` accepts every socket connection and does not authenticate in middleware.
- `join-tournament` accepts caller-supplied `tournamentId` and joins the room without checking auth, role, tournament visibility, or team membership.
- `place-bid` accepts caller-supplied `id`, `playerId`, `teamId`, `ownerId`, `bidAmount`, and `tournamentId`.
- The backend verifies that the supplied owner owns the supplied team, but it does not verify that the connected socket belongs to that owner.

Affected files:

- `ipl-auction-tracker/src/webSocket/socket.js`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/src/controllers/auction.controller.js`
- `ipl-auction-tracker-backend/src/utils/bidRules.js`

Impact:

- Any client can connect to sockets, join tournament rooms, and submit bids using another valid owner/team pair.
- This directly threatens auction integrity and trust.
- Socket room membership can be used to observe live auction events without authorization.

Recommended fix:

- Authenticate Socket.IO handshake using JWT or the future session mechanism.
- Add Socket.IO middleware that loads the user and attaches it to `socket`.
- Authorize `join-tournament` by role and tournament visibility.
- For bids, derive `ownerId` from `socket.user.id` and derive eligible `teamId` from server-side ownership/membership.
- Generate bid IDs server-side.
- Add socket rate limiting and integration tests for spoofed identities.

Estimated effort:

- 4-7 days for socket auth and server-derived bidder identity.
- 1-3 additional days for rate limiting and test coverage.

### 7. Sensitive Team/Read APIs Are Public

Severity: High

Is it still valid? Yes

Evidence:

- `ipl-auction-tracker-backend/src/routes/teamRoutes.js` imports `authMiddleware` and `teamOwnerMiddleware` but does not use either.
- All team routes are public:
  - `GET /api/teams`
  - `GET /api/teams/getTeamByid/:id`
  - `GET /api/teams/getTeamAndPlayers/:id`
  - `GET /api/teams/getAllteamsAndPlayers`
- `getTeamByOwner` accepts arbitrary `ownerId` from route params.
- `getTeamAndPlayersbyOwnerId` accepts arbitrary `ownerId` and can return another owner's team and purchased players.

Affected files:

- `ipl-auction-tracker-backend/src/routes/teamRoutes.js`
- `ipl-auction-tracker-backend/src/controllers/team.controller.js`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/MyTeam.jsx`
- `ipl-auction-tracker/src/components/AdminDashboardLayout/TeamsOverview.jsx`

Impact:

- Anonymous clients can inspect teams, owners, purse data, and player assignments.
- Team owners can request another owner's team information by changing URL/API parameters.
- This combines with password-hash exposure risk through nested owner serialization.

Recommended fix:

- Require auth on all team endpoints.
- Enforce self/admin/tournament membership authorization.
- Return explicit team and owner DTOs.
- Remove unused middleware imports if not used, or apply them correctly.
- Add tests for anonymous denial and cross-owner denial.

Estimated effort:

- 3-6 days including DTOs and tests.

### 8. Permissive CORS

Severity: High

Is it still valid? Yes

Evidence:

- Express CORS config in `ipl-auction-tracker-backend/src/index.js` uses `origin: true` and `credentials: true`.
- Socket.IO CORS config in the same file also uses `origin: true` with credentials enabled.

Affected files:

- `ipl-auction-tracker-backend/src/index.js`

Impact:

- The server reflects arbitrary origins while allowing credentialed requests.
- This increases exposure if cookies or credentialed sessions are introduced and weakens origin-based controls.
- It also permits untrusted origins to interact with public APIs and unauthenticated sockets.

Recommended fix:

- Add an environment-driven allowlist such as `CLIENT_ORIGINS`.
- Reject unknown origins for both Express and Socket.IO.
- Add separate local-development defaults and production validation.
- Add tests or startup validation for missing/unsafe production origin config.

Estimated effort:

- 0.5-1 day.

## Final Assessment

The audit findings are mostly still valid in the current codebase, with three important nuances:

- Public admin self-registration is resolved.
- Password hash exposure is resolved for auth responses but remains valid through public team reads that include raw owner users.
- Tournament and player mutations are protected, but tournament/player read APIs remain public and need authorization.

The highest-risk unresolved issue is unauthenticated Socket.IO bidding because it can compromise auction outcomes directly. The next highest risks are public read APIs, nested user exposure, non-expiring localStorage JWTs, and permissive CORS.
