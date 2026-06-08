# Security Review

Severity reflects impact in a deployed environment. Evidence is limited to the
tracked code.

## Phase 1 Resolved Findings

### Public admin self-registration

Resolved: the frontend offers only team owner and spectator roles, and the
backend rejects every other public registration role before database writes.

Evidence: `ipl-auction-tracker/src/pages/Register.jsx`,
`ipl-auction-tracker-backend/src/controllers/auth.controller.js`,
`src/utils/publicRegistrationRoles.js`.

### Tournament and player mutation authorization

Resolved for Phase 1: tournament creation, tournament status updates, and
player creation require a valid JWT and an existing admin user. Tournament
creator identity is derived from the authenticated admin.

Evidence: `src/routes/tournmentRoutes.js`, `src/routes/playerRoutes.js`,
`src/controllers/tournment.controller.js`, `src/middleware/auth.middleware.js`.

### Authentication response secret exposure

Resolved for authentication responses: registration and login return a safe
user DTO and no longer serialize password hashes or verification metadata.

Evidence: `src/controllers/auth.controller.js`, `src/utils/userResponse.js`.

## Phase 3 Resolved Findings

### Socket.IO bidding authentication and bidder impersonation

Resolved for Phase 3: Socket.IO connections now require a login JWT in the
handshake auth payload. The server verifies the token, rejects missing,
invalid, and expired tokens, loads the user, and attaches safe identity fields
to `socket.user`.

Bid placement is restricted to authenticated `team_owner` users. The bid
handler no longer trusts client-supplied `ownerId`, `teamId`, or `teamName`;
it derives `ownerId` from `socket.user.id`, loads owned teams from the
database, resolves the tournament participant team server-side, and writes the
accepted bid with server-derived ownership.

Evidence: `ipl-auction-tracker-backend/src/index.js`,
`ipl-auction-tracker/src/webSocket/socket.js`,
`ipl-auction-tracker/src/context/AuthContext.jsx`,
`ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`.

## Critical

### Socket.IO authorization hardening remains incomplete

Phase 3 resolves unauthenticated socket connections and bidder identity
spoofing. Residual socket risks remain: tournament room joins are available to
any authenticated role, read-side tournament authorization is not enforced, bid
IDs remain client-generated, Socket.IO CORS is still permissive, and bid events
are not rate-limited.

Evidence: `ipl-auction-tracker-backend/src/index.js`,
`ipl-auction-tracker/src/webSocket/socket.js`.

Recommendation: add tournament room membership authorization, server-generated
bid IDs, explicit Socket.IO CORS allowlists, socket payload validation, and
rate-limiting in later phases.

## High

### Sensitive read APIs are public and expose arbitrary users' data

Team endpoints accept arbitrary owner IDs and `/api/teams` includes associated
owner user objects. Authentication responses were fixed in Phase 1, but team
read response exposure remains.

Evidence: `src/routes/teamRoutes.js`, `src/controllers/team.controller.js`,
`src/utils/userResponse.js`.

Recommendation: use explicit response DTOs, never serialize password/token
fields, authenticate reads, and enforce self/admin/tournament access.

### JWT is stored in localStorage

Phase 2 added one-hour JWT expiration. Residual risk remains because
localStorage makes bearer tokens available to any successful XSS and there is
no refresh-token rotation or server-side token revocation.

Evidence: `src/controllers/auth.controller.js`,
`ipl-auction-tracker/src/context/AuthContext.jsx`.

Recommendation: refresh rotation in secure HttpOnly/SameSite cookies,
logout/revocation strategy, and CSP.

### Permissive CORS

HTTP and Socket.IO use `origin: true` with credentials, allowing arbitrary
origins to be reflected.

Evidence: `ipl-auction-tracker-backend/src/index.js`.

Recommendation: configure an explicit origin allowlist per environment.

## Medium

### No rate limiting or brute-force protection

Login, registration, verification resend, and socket bids have no general
rate limiter. Resend has only a per-account timestamp cooldown.

Evidence: `src/routes/authRoutes.js`, `src/index.js`,
`src/controllers/auth.controller.js`.

### Insufficient server-side validation

No validation library is used. Registration now enforces a public-role
allowlist, but does not enforce password length, email presence, or
client-generated ID format on the server. Tournament status accepts any string.

Evidence: `src/controllers/auth.controller.js`,
`src/controllers/tournment.controller.js`.

### Verification is optional and account creation survives email failure

Login enforcement depends on `EMAIL_VERIFICATION_REQUIRED`. Registration
returns success even when sending fails.

Evidence: `src/controllers/auth.controller.js`.

### Error details can leak internals

Several 500 responses include `error.message`, which can expose database or
implementation details.

Evidence: auth, player, team, and auction controllers.

### No explicit security headers or CSRF strategy

No Helmet/CSP is configured. Current bearer-header requests are less exposed to
classic CSRF, but future cookie authentication would require CSRF controls.

Evidence: `src/index.js`, backend `package.json`.

### Race and integrity limitations remain

Bid insertion locks auction and tournament-team rows, but does not enforce a
database unique/sequence constraint for bid ordering, and client-generated bid
IDs can collide. Auction creation/player state updates are not wrapped in one
transaction.

Evidence: `src/index.js`, `src/controllers/auction.controller.js`.

## Low

### Email HTML interpolates user-controlled name

The user's name is inserted into HTML email without escaping.
Evidence: `src/utils/emailService.js`.

### Database TLS disables certificate verification

`rejectUnauthorized: false` permits unverified server certificates.
Evidence: `src/config/dbconfig.js`.

### Secrets management is environment-only

Backend `.env` is ignored and not tracked, which is correct, but no secret
manager integration or rotation process exists. Frontend `.env` is tracked;
only public `VITE_*` values should ever be placed there.

Evidence: backend `.gitignore`, tracked `ipl-auction-tracker/.env`.

## Specific Risk Categories

- SQL injection: no direct user-built SQL was found. Sequelize is used for
  user inputs; raw startup SQL is static. Residual risk: low.
- XSS: React escapes rendered values, but no CSP/security headers exist.
  Residual risk: medium because JWT is in localStorage.
- CSRF: bearer header design reduces current risk; no explicit protection.
- Password handling: bcrypt cost 10 is implemented; server-side password policy,
  reset/change, MFA, and hash redaction are missing.
- File upload: no upload feature exists.
- Authorization: critical gaps described above.
- Secrets: environment-based, but operational controls are absent.

## Priority Remediation

1. Protect remaining sensitive read APIs and sanitize nested user responses.
2. Authorize remaining sensitive read APIs and tournament room membership.
3. Validate allowed tournament status transitions.
4. Add secure refresh/session handling, origin allowlist,
   Helmet/CSP, validation, and rate limiting.
5. Add security tests and audit logging.
