# API Documentation

## Phase 4B Sport Auction Preparation Foundation

Authenticated reads:

```text
GET /api/v2/sport-tournaments/:sportTournamentId/budgets
GET /api/v2/sport-tournaments/:sportTournamentId/pool
```

Admin or active parent Festival Team Owner mutations:

```text
POST /api/v2/sport-tournaments/:sportTournamentId/budgets/equal-distribution
PUT  /api/v2/sport-tournaments/:sportTournamentId/budgets
POST /api/v2/sport-tournaments/:sportTournamentId/pool/generate
```

Equal distribution accepts:

```json
{"totalCredits":1500}
```

Manual budget configuration accepts:

```json
{
  "budgets": [
    {
      "sportTeamId": "team-a",
      "allocatedCredits": 500,
      "adjustmentCredits": 0,
      "status": "active"
    }
  ]
}
```

Pool generation transactionally replaces the existing pre-auction snapshot
from current eligibility. It is accepted only in `draft`, `setup`, or `ready`.

Readiness now requires active positive Team budgets, a generated Pool, available
Pool participants, and a Pool snapshot matching current eligibility.

No Sport Auction lifecycle, bidding, timer, Socket.IO, sold/unsold, match,
fixture, standing, or competition endpoint is implemented.

## Phase 4A Sport Tournament Foundation

All routes require bearer authentication. Admins may manage every Sport
Tournament. Team Owners may manage only Tournaments beneath the Festival Team
resolved from their active `FestivalTeamOwner` assignment.

```text
GET   /api/v2/sport-tournaments
GET   /api/v2/sport-tournaments/owner-contexts
POST  /api/v2/festivals/:festivalId/teams/:festivalTeamId/sport-tournaments
GET   /api/v2/sport-tournaments/:sportTournamentId
PATCH /api/v2/sport-tournaments/:sportTournamentId
GET   /api/v2/sport-tournaments/:sportTournamentId/teams
PATCH /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId
POST  /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
DELETE /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
GET   /api/v2/sport-tournaments/:sportTournamentId/eligibility
GET   /api/v2/sport-tournaments/:sportTournamentId/readiness
```

Tournament creation requires a finalized parent Festival roster and
automatically creates `teamCount` internal Sport Teams. Captain requests accept
only `festivalParticipantId`; Employee and Team authority are validated
server-side.

Eligibility returns included and excluded Employees with exact reason codes.
Readiness returns a percentage score, `READY` or `NOT_READY`, exact blockers,
counts, and per-Team Captain state.

No Sport Auction, bid, fixture, match, standings, or competition endpoint is
implemented in Phase 4A.

## Phase 3G.1 Festival Workspace UX

Phase 3G.1 adds no HTTP or Socket.IO endpoints. The Festival Workspace composes
the existing Festival detail, sports, participants, Teams, Owners, Retentions,
auction pool, readiness, current auction, history, and lifecycle endpoints.

Data loading is tab/step based. The persistent Control Center uses readiness
and current-auction reads, and all lifecycle quick actions continue to use the
existing admin-protected auction routes. Backend authorization, readiness,
locking, bidding, purse validation, and finalization remain authoritative.

## Phase 3G Festival Operations

- `POST /api/v2/festivals/:festivalId/auction/reauction` requeues selected
  unsold participants, or all unsold participants when the body is empty.
- `PUT /api/v2/festivals/:festivalId/participant-sports/bulk` replaces sport
  selections for up to 1,000 selected participants.
- `POST /api/v2/festivals/:festivalId/sports/bulk` enables multiple selected
  catalog sports in one validated operation.
- `POST /api/v2/festivals/:festivalId/retentions/bulk` validates and creates a
  retention batch transactionally.

Configuration mutations return `423` and `FESTIVAL_LOCKED` when the Main
Auction is `live`, `paused`, or `completed`. Current/history reads now expose
pool state, attempt/re-auction counts, and operation audits.

## Phase 3F Festival Auction Alignment

All routes require bearer authentication. Lifecycle/finalization requires
`admin`; bidding requires an active assigned Owner with role `team_owner`.

- `POST /api/v2/festivals/:festivalId/auction/participants/:participantId/start`
  accepts `{"basePrice":100000}` and creates a persisted 20-second round.
- `POST /api/v2/festivals/:festivalId/auction/bid` accepts the viewer's
  observed round state:

```json
{
  "auctionId": "festival-auction-id",
  "expectedCurrentBid": 100000
}
```

The server derives Team identity and the exact next amount. It rejects stale
auction IDs or current bids with `409`, so simultaneous requests cannot
silently create a second bid. Supplied next-bid amounts still fail validation.
The accepted bid and new 20-second deadline are persisted in one transaction.
- `POST /api/v2/festivals/:festivalId/auction/extend` extends a pending round
  by 20 seconds.
- Sell and unsold now require timer expiry and pending finalization.
- Unsold is rejected when the round contains an accepted bid.
- `GET /api/v2/festivals/:festivalId/auction/current` includes `basePrice`,
  `incrementPercentage`, `incrementAmount`, `currentBid`, `nextBid`, deadline,
  ordered numbered bids, Team summaries, viewer flags, `lifecycleState`, and
  server-authoritative `adminActions`.

When the persisted deadline has elapsed, the current-state read reconciles a
stale `live` round to `pending` before responding. Pending responses use
`expiryState: "EXPIRED"`, `lifecycleState: "ADMIN_DECISION"`, and expose:

```json
{
  "adminActions": {
    "extend": true,
    "sell": true,
    "unsold": false
  }
}
```

`sell` is enabled only when an accepted bid exists. `unsold` is enabled only
when no accepted bid exists.

Festival Auction configuration accepts `incrementPercentage` as `20` or `25`;
the default is `20`. The server calculates:

```text
incrementAmount = basePrice * incrementPercentage / 100
nextBid = currentBid + incrementAmount
```

The increment is fixed from the base price and is not compounded. A base price
that would create a fractional integer-currency increment is rejected when the
participant round starts.
- `GET /api/v2/festivals/:festivalId/auction/history` returns ordered bids and
  sold/unsold result metadata.

Festival socket events include `participant-started`, `bid-placed`,
`auction-timer-updated`, `auction-pending-finalization`, `auction-paused`,
`auction-resumed`, `auction-extended`, `participant-sold`,
`participant-unsold`, and `auction-completed`.

Base URL: `${VITE_API_URL}/api` from the frontend. JSON bodies are expected.
Bearer authentication is attached by `ipl-auction-tracker/src/utils/api.js`.

Auction, tournament-management, player-creation mutation endpoints, and team
report endpoints enforce authentication. Broad administrative reports require
the admin role.

## Common Errors

- `400`: invalid request, validation failure, or invalid state.
- `401`: missing/invalid bearer token on protected endpoints.
- `403`: authenticated user does not have the required role or ownership scope.
- `404`: requested entity/current auction not found.
- `409`: stale auction state or conflicting concurrent mutation.
- `500`: unhandled persistence or server error.

Validation failures use a consistent envelope:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {"path": "body.email", "message": "Email must be valid"}
  ]
}
```

## System

### `GET /`

Purpose: returns `IPL Auction Backend Running...`.
Auth: no. File: `ipl-auction-tracker-backend/src/index.js`.

### `GET /health`

Purpose: shallow process health check.
Auth: no.
Response: `{"success":true,"message":"Backend healthy"}`.
File: `ipl-auction-tracker-backend/src/index.js`.

## Sports

Files: `src/routes/sportRoutes.js`, `src/controllers/sport.controller.js`.

### `GET /api/sports`

Auth: no.

Purpose: returns the active sport catalog used by tournament and player setup.
Seeded sport IDs are `cricket`, `tt`, `volleyball`, `badminton`, `chess`,
`carrom`, and `other`.

Response:

```json
[
  {"id":"cricket","code":"cricket","name":"Cricket","isActive":true},
  {"id":"tt","code":"tt","name":"Table Tennis","isActive":true}
]
```

## Authentication

Files: `src/routes/authRoutes.js`, `src/controllers/auth.controller.js`.

### `POST /api/auth/register`

Auth: no.

Body:

```json
{
  "id": "client-generated-id",
  "name": "Owner Name",
  "email": "owner@example.com",
  "password": "password",
  "role": "team_owner",
  "teamName": "Bengaluru Blasters",
  "teamId": "client-generated-team-id"
}
```

Purpose: hashes password, creates user, optionally creates a team, generates a
hashed email-verification token, and attempts to send email.

Allowed public roles: `team_owner` and `spectator`. Any other or missing role,
including `admin`, returns `400` before a user is created.

Response: `201` with message and a safe user DTO containing only `id`, `name`,
`email`, `role`, and `isVerified`.

Validation: role must be `team_owner` or `spectator`; team owners must include
`teamName` and `teamId`; email must be valid; password must be at least 8
characters.
Errors: `400` validation failure, invalid role, or existing user; `500`
registration failure.
Tables: `Users`, optionally `Teams`.

### `POST /api/auth/login`

Auth: no.
Body: `{"email":"owner@example.com","password":"password"}`.
Response: one-hour access token and safe user DTO containing only `id`, `name`,
`email`, `role`, and `isVerified`.
Validation: valid email and password are required.
Errors: `400` validation failure, invalid credentials, or unverified user when
`EMAIL_VERIFICATION_REQUIRED=true`; `500` login failure.
Tables: reads `Users`.

### `GET /api/auth/verify-email/:token`

Auth: no. Purpose: hashes token and marks matching unexpired user verified.
Response: success message. Errors: `400` missing/invalid/expired token; `500`.
Tables: updates `Users`.

### `POST /api/auth/resend-verification`

Auth: no. Body: `{"email":"owner@example.com"}`.
Purpose: rotates verification token and sends email with a 60-second cooldown.
Errors: `400`, `404`, `429`, `500`.
Tables: updates `Users`.

### `POST /api/auth/forgot-password`

Auth: no. Body: `{"email":"owner@example.com"}`.
Purpose: if the email belongs to an account, creates a cryptographically secure
password-reset token, stores only its SHA-256 hash with a one-hour expiry, and
sends a SendGrid reset email. The response is generic to avoid account
enumeration.
Response: `200` with success message.
Validation: valid email is required.
Errors: `400` validation failure; `500` email/reset failure.
Tables: updates `Users.resetPasswordToken` and `Users.resetPasswordExpires`.

### `POST /api/auth/reset-password`

Auth: no. Body:

```json
{
  "token": "raw-reset-token-from-email",
  "password": "new-password"
}
```

Purpose: hashes the submitted token, finds an unexpired matching user, stores a
new bcrypt password hash, and clears reset token fields so the token is
single-use.
Response: `200` with success message.
Validation: reset token is required; password must be at least 8 characters.
Errors: `400` validation failure or invalid/expired token; `500`.
Tables: updates `Users.password`, clears `Users.resetPasswordToken` and
`Users.resetPasswordExpires`.

## Tournaments

Files: `src/routes/tournmentRoutes.js`,
`src/controllers/tournment.controller.js`.

### `POST /api/tournament/create`

Auth: bearer JWT and admin role.

```json
{
  "id": "tournament-id",
  "name": "Premier Auction",
  "sportId": "cricket",
  "budget": 20000000,
  "teams": ["Team A", "Team B"],
  "players": [
    {
      "id":"player-id",
      "name":"Player",
      "sportId":"cricket",
      "role":"Batsman",
      "basePrice":500000
    }
  ]
}
```

Creates `Tournaments`, one `TournamentTeams` row per matched team, and
`Players`. `teams` are matched by name. `createdBy` is derived from the
authenticated admin and is not accepted from the request body.
Validation: `sportId` is required and must be one of the seeded sport IDs;
budget and player base prices must be positive numbers; teams and players must
be non-empty arrays; each player `sportId` must match the tournament `sportId`.
Cricket players require `Batsman`, `Bowler`, `All-rounder`, or `Wicketkeeper`.
Non-cricket players may omit role or send `null`.
Errors: `400` validation failure or team mismatch; `401`; `403`; `500`.

### `PATCH /api/tournament/:id/status`

Auth: bearer JWT and admin role.
Body: `{"status":"live"}`.
Purpose: advances tournament status through the controlled state machine.
Allowed status values are `upcoming`, `live`, `completed`, and `archived`.
Allowed transitions are `upcoming` to `live`, `live` to `completed`, and
`completed` to `archived`. `archived` is terminal. Invalid enum values and
invalid transitions return the standard `400` validation envelope.
Response: updated tournament. Errors: `400` validation failure or invalid
transition; `401`; `403`; `404`; `500`.

### `PATCH /api/tournament/:id`

Auth: bearer JWT and admin role.

Purpose: edits tournament setup before the tournament goes live. Only
`upcoming` tournaments can be edited. `live`, `completed`, and `archived`
tournaments return the standard `400` validation envelope.

Body fields are optional, but at least one must be supplied:

```json
{
  "name": "Premier Auction Updated",
  "sportId": "cricket",
  "budget": 22000000,
  "teams": ["Team A", "Team B"],
  "players": [
    {
      "id":"player-id",
      "name":"Player",
      "sportId":"cricket",
      "role":"Batsman",
      "basePrice":500000
    }
  ]
}
```

When `teams` is supplied, tournament participation is replaced by the submitted
registered team names. When `players` is supplied, the upcoming tournament's
player pool is replaced by the submitted players. Budget changes update
tournament-team purse totals. If `sportId` changes, `players` must also be
submitted so the player pool remains sport-consistent.

Errors: `400` validation failure, invalid state, or unknown selected team;
`401`; `403`; `404`; `500`.

### `PATCH /api/tournament/:id/archive`

Auth: bearer JWT and admin role.
Purpose: archives a completed tournament. The tournament must be `completed`;
`upcoming`, `live`, and already `archived` tournaments are rejected with the
standard transition validation envelope. Archived tournaments are read-only and
terminal.
Response: updated tournament. Errors: `400`; `401`; `403`; `404`; `500`.

### `GET /api/tournament`

Auth: no. Response: all tournaments. Query/pagination: none.

### `GET /api/tournament/:id`

Auth: no. Response: tournament. Errors: `404`, `500`.

## Players

Files: `src/routes/playerRoutes.js`, `src/controllers/player.controller.js`.

### `POST /api/players`

Auth: bearer JWT and admin role.

```json
{
  "id": "player-id",
  "name": "Player",
  "sportId": "cricket",
  "role": "Bowler",
  "basePrice": 500000,
  "tournamentId": "tournament-id"
}
```

Purpose: creates a player after confirming tournament exists.
Validation: player name, sport ID, positive base price, and tournament ID are
required. Player sport must match the tournament sport. Cricket requires a role
of `Batsman`, `Bowler`, `All-rounder`, or `Wicketkeeper`; non-cricket sports
allow `role: null` or omitted role.
Errors: `400` validation failure; `401`; `403`; `404` tournament; `500`.

### `POST /api/players/import`

Auth: bearer JWT and admin role.
Content type: `multipart/form-data`.

Fields:

- `tournamentId`: target tournament ID.
- `csv`: CSV file, 1 MB maximum.

Purpose: bulk imports players into an upcoming tournament. Valid rows are
created even when other rows fail validation. Live, completed, and archived
tournaments reject imports as read-only.

Supported CSV headers:

```csv
name,sport,role,basePrice
Virat,cricket,Batsman,500000
Magnus,chess,,500000
```

`role` may be omitted for non-cricket-only files:

```csv
name,sport,basePrice
Rahul,tt,100000
```

An optional `id` header is supported. Duplicate IDs within the file or already
stored in `Players` are rejected row-by-row.

Validation: tournament must exist; sport must be active; each player sport must
match the tournament sport; cricket rows require a valid cricket role; non-
cricket roles are optional; base price must be a positive number; malformed
rows are reported with row numbers.

Response:

```json
{
  "success": true,
  "imported": 95,
  "failed": 5,
  "errors": [
    {
      "row": 12,
      "message": "Role required for cricket player"
    }
  ]
}
```

Errors: `400` missing multipart fields or read-only tournament; `401`; `403`;
`404` tournament; `413` file too large; `500`.

### `GET /api/players/import/templates/:type`

Auth: bearer JWT and admin role.
Purpose: downloads a CSV template. Supported `type` values are `cricket` and
`mixed`; unknown values return the cricket template.
Response content type: `text/csv`.

### `GET /api/players?tournamentId=:id`

Auth: no. With query, returns tournament players. Without query, returns all
players including associated team. No pagination.

### `GET /api/players/playerBids/:tournamentId`

Auth: no. Returns every player in a tournament, each with descending bids.
Errors: `404` no players; `500`. Uses one bid query per player.

## Teams

Files: `src/routes/teamRoutes.js`, `src/controllers/team.controller.js`.

### `GET /api/teams?tournamentId=:id`

Auth: bearer JWT. With `tournamentId`, returns tournament-scoped team data
according to caller role:

- Admins receive all tournament teams, including `ownerId`.
- Team owners receive only their own participating team. The owner is derived
  from the authenticated JWT, not from request parameters.
- Spectators receive public team data only: team identity and purse summary,
  without owner IDs or user objects.

Without `tournamentId`, this is a broad team report and only admins can access
it. Owner user data is sanitized to safe user fields.

### `GET /api/teams/getTeamByid/:ownerId?tournamentId=:id`

Auth: bearer JWT and `team_owner` role. The legacy `:ownerId` path parameter is
validated for compatibility but ignored for authorization and lookup. The
endpoint derives the owner from `req.user.id` and returns only the authenticated
owner's team, optionally scoped to a tournament. Errors: `400`, `401`, `403`,
`404`.

### `GET /api/teams/getTeamAndPlayers/:ownerId?tournamentId=:id`

Auth: bearer JWT and `team_owner` role. The legacy `:ownerId` path parameter is
validated for compatibility but ignored for authorization and lookup. Returns
only the authenticated owner's team and purchased players, optionally
tournament-scoped. Errors: `400`, `401`, `403`, `404`, `500`.

### `GET /api/teams/getAllteamsAndPlayers`

Auth: bearer JWT and admin role. Returns all teams and their players using
sanitized team, owner, and player report DTOs. Errors: `401`, `403`, `404`,
`500`. Uses one player query per team.

## Auction Control

Files: `src/routes/auctionRoutes.js`,
`src/controllers/auction.controller.js`.

### `POST /api/auction/start/:playerId`

Auth: bearer JWT and admin role.
Body: `{"auctionId":"round-id","tournamentId":"tournament-id"}`.
Purpose: validates player/tournament/participation/active-round state, creates a
live auction, stores `startedAt` and `endsAt`, starts a 20-second timer from the
persisted deadline, and broadcasts `auction-started`.
Validation: `playerId` path param and `auctionId` are required; `tournamentId`
is optional but must be non-empty when supplied.
Errors: `400` validation failure or invalid auction state; `404`, `500`.

### `GET /api/auction/currentPlayer?tournamentId=:id`

Auth: no. Returns active live or pending player, bids, state, next minimum bid,
and persisted `endsAt`. Errors: `404`, `500`.

Example response:

```json
{
  "message": "Current player in live auction",
  "player": {
    "id":"p1",
    "name":"Player",
    "sportId":"cricket",
    "role":"Batsman",
    "basePrice":500000
  },
  "bids": [],
  "auctionId": "a1",
  "auctionStatus": "live",
  "highestBid": 500000,
  "highestBidder": "",
  "nextMinimumBid": 525000,
  "endsAt": "2026-06-05T12:00:20.000Z"
}
```

### `POST /api/auction/stop/:playerId`

Auth: bearer JWT and admin. Locks a live round as pending finalization.
There is no frontend call to this endpoint; timer expiry calls the same internal
logic. Validation: `playerId` path param is required. Errors: `400`, `500`.

### `POST /api/auction/extend/:playerId`

Auth: bearer JWT and admin. Restarts a pending round for 20 seconds and
persists the new `endsAt`.
Validation: `playerId` path param is required. Errors: `400`, `500`.

### `POST /api/auction/sell/:playerId`

Auth: bearer JWT and admin. In a transaction, assigns the highest bidder,
updates sold price, increments tournament-team spending, completes auction,
and emits finalization events. Validation: `playerId` path param is required.
Errors: `400`, `500`.

### `POST /api/auction/unsold/:playerId`

Auth: bearer JWT and admin. Clears sale/team fields and completes auction.
Validation: `playerId` path param is required. Errors: `400`, `500`.

## Socket.IO Contract

Files: `ipl-auction-tracker-backend/src/index.js`,
`src/controllers/auction.controller.js`,
`ipl-auction-tracker/src/webSocket/socket.js`.

Socket authentication: required. The frontend sends the login JWT in the
Socket.IO auth payload before connecting:

```js
socket.auth = { token: jwtToken };
```

The server verifies the JWT during the handshake, rejects missing, invalid, or
expired tokens, loads the user, and attaches it to `socket.user`.

Client events:

- `join-tournament` `{tournamentId}`: joins `tournament:<id>`.
- `leave-tournament` `{tournamentId}`: leaves room.
- `place-bid`:

```json
{
  "id": "bid-id",
  "playerId": "player-id",
  "tournamentId": "tournament-id",
  "bidAmount": 525000
}
```

Only authenticated `team_owner` users can place bids. The server ignores
client-supplied ownership identity, derives the owner from `socket.user.id`,
loads the owner team from the database, confirms the team participates in the
player's tournament, and writes `Bids.ownerId` and `Bids.teamId` from those
server-side records.

Server validates room membership, persisted live timer deadline,
player/tournament relationship,
tournament membership, minimum amount, and purse.

Validation: `id`, `playerId`, and `tournamentId` are required non-empty
strings; `bidAmount` must be a positive number. Socket validation failures are
emitted as `bid-rejected` using the same validation envelope shape.

Server events:

- `new-bid`
- `bid-rejected`
- `bid-error`
- `auction-started`
- `auction-timer-updated`
- `auction-extended`
- `auction-pending-finalization`
- `player-sold`
- `player-unsold`
- `auction-finalized`
- `tournament-completed`

## Festival Foundation API (Phase 1)

Base path: `/api/v2/festivals`.

All festival foundation endpoints require bearer authentication. Mutations and
participant lists require the existing `admin` role. These endpoints are
additive and do not change `/api/tournament`, `/api/auction`, `/api/players`, or
`/api/teams`.

### `POST /api/v2/festivals`

Auth: admin.

Creates a draft festival. The server generates the ID and derives
`createdByUserId` from the authenticated user.

```json
{
  "name": "Corporate Sports Festival 2027",
  "code": "CSF-2027",
  "startDate": "2027-02-01",
  "endDate": "2027-02-15",
  "registrationOpensAt": "2026-12-01T03:30:00.000Z",
  "registrationClosesAt": "2026-12-20T18:29:59.000Z",
  "timezone": "Asia/Kolkata",
  "currencyCode": "INR"
}
```

### Festival reads

- `GET /api/v2/festivals`
- `GET /api/v2/festivals/:festivalId`

Auth: authenticated.

### Festival sports

- `POST /api/v2/festivals/:festivalId/sports` - admin
- `GET /api/v2/festivals/:festivalId/sports` - authenticated

Create body:

```json
{
  "sportId": "cricket",
  "config": {
    "requiresInternalTeams": true
  }
}
```

Only active catalog sports may be enabled. The same sport cannot be enabled
twice for one festival.

### Festival participants

- `POST /api/v2/festivals/:festivalId/participants` - admin
- `GET /api/v2/festivals/:festivalId/participants` - admin

Create body:

```json
{"employeeId":"employee-id"}
```

Participants reference a canonical Employee. Employee login linkage is
optional, and participant responses do not expose authentication records.

### Festival teams

- `POST /api/v2/festivals/:festivalId/teams` - admin
- `GET /api/v2/festivals/:festivalId/teams` - authenticated

Create body:

```json
{
  "name": "Demons",
  "code": "DMN",
  "color": "#C62828",
  "logoUrl": "https://example.com/demons.png"
}
```

Festival teams are franchise definitions only. This API does not create roster
members, ownership assignments, budgets, retentions, or auction state.

Child configuration mutations are accepted only while the festival is in
`draft`. No lifecycle transition endpoint is included in Phase 1.

## Festival Participant Sports API (Phase 2)

Base path: `/api/v2/festivals`.

Sport-registration writes are admin-only and accepted only when the festival
status is `draft` or `registration_open`.

### Endpoints

- `POST /:festivalId/participants/:participantId/sports` - register one sport
- `GET /:festivalId/participants/:participantId/sports` - admin or own record
- `GET /:festivalId/sports/:sportId/participants` - admin
- `POST /:festivalId/participant-sports/bulk` - admin
- `POST /:festivalId/participant-sports/import` - admin multipart CSV
- `GET /:festivalId/participant-sports/import/template` - admin CSV download

Single registration body:

```json
{"sportId":"cricket"}
```

Bulk registration body:

```json
{
  "participantId": "participant-id",
  "sports": ["cricket", "chess", "volleyball"]
}
```

The participant must belong to the festival and be registered. Every sport
must be enabled for the festival. Duplicate IDs in a bulk request and existing
participant/sport registrations are rejected.

Import uses multipart field `csv` and the following Excel-compatible CSV
columns:

```csv
Name,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball
John,Yes,No,No,No,Yes,Yes,No
```

`Yes` and `No` are case-insensitive. Rows are matched to active festival
participants by normalized linked-user name. Unknown names, ambiguous names,
malformed rows, invalid values, disabled sports, and existing registrations are
reported by row. Valid rows are imported even when other rows fail.

```json
{
  "imported": 95,
  "failed": 5,
  "errors": [
    {"row":12,"message":"Festival participant not found"}
  ]
}
```

Native `.xlsx` files are not parsed; export the worksheet as CSV before upload.

## Employee Identity API

Base path: `/api/v2/employees`. All endpoints require admin authorization.

- `POST /` creates an Employee. `gender` is required and accepts `male` or
  `female`.
- `GET /` lists/searches Employees with pagination. Optional `gender=male` or
  `gender=female` filtering is supported.
- `GET /:employeeId` returns one Employee.
- `PATCH /:employeeId` updates Employee directory fields, including gender.
- `POST /:employeeId/link-user` optionally links an existing login User.
- `GET /export` downloads the filtered Employee directory as CSV and includes
  Gender.

Festival participant creation now accepts `employeeId`, not `userId`.
Employee responses include `gender`. Festival Participant responses expose the
same value under `participant.employee.gender`; no participant gender field is
stored.

Primary HR import:

- `POST /api/v2/festivals/:festivalId/participants/import`
- `GET /api/v2/festivals/:festivalId/participants/import/template`

Required CSV identity columns are `EmployeeNumber` and `Name`. The import
matches an existing Employee, updates non-gender directory details, and creates
or updates FestivalParticipant and sport selections per row. `No` removes an
existing selection. Missing Employees are rejected with instructions to use
the Employee Directory import first. The older participant-sports import paths
remain compatibility aliases.

## Phase 2.1 HR Onboarding UX

Status: Complete.

Employee import:

- `GET /api/v2/employees/import/template`
- `POST /api/v2/employees/import`

The admin uploads multipart field `csv`:

```csv
EmployeeNumber,Name,Email,Department,Gender
EMP001,John Smith,john@company.com,Finance,Male
EMP002,Priya Shah,priya@company.com,IT,Female
```

Employees are created or updated by normalized Employee Number. Invalid rows
are skipped while valid rows continue. Gender is required, accepts Male or
Female case-insensitively, and is normalized to `male` or `female`. Login
accounts are not required.

The Festival participant/sport CSV intentionally has no Gender column.
Employees must already exist in the Employee Directory before that import can
add or reactivate Festival participation.

Participant bulk operations:

- `POST /api/v2/festivals/:festivalId/participants/bulk`
- `POST /api/v2/festivals/:festivalId/participants/add-all`
- `POST /api/v2/festivals/:festivalId/participants/bulk-remove`

Bulk add accepts `employeeIds`; removal accepts `participantIds`. Existing
active participants and repeated IDs are counted as ignored. Withdrawn
participants are reactivated by add operations. Removal marks participants
`withdrawn` to preserve history.

## Festival Team Builder API (Phase 3)

Festival Team management:

- `POST /api/v2/festivals/:festivalId/teams`
- `GET /api/v2/festivals/:festivalId/teams`
- `PATCH /api/v2/festivals/:festivalId/teams/:teamId`
- `DELETE /api/v2/festivals/:festivalId/teams/:teamId`

Assignment management:

- `POST /api/v2/festivals/:festivalId/team-assignments`
- `POST /api/v2/festivals/:festivalId/team-assignments/auto-balance`
- `GET /api/v2/festivals/:festivalId/team-assignments`
- `PATCH /api/v2/festivals/:festivalId/team-assignments/lock`

All mutations require bearer authentication and the admin role. Manual
assignment accepts `participantId` and `teamId`. Reassigning moves the same
membership rather than creating a duplicate.

Auto-balance uses selected-sport count as a calculated strength score and
applies deterministic snake distribution. Locking requires every registered
participant to be assigned. Locked assignments cannot be changed.

## Main Festival Auction Foundation API (Phase 3A)

- `PATCH /api/v2/festivals/:festivalId/auction-config`
- `POST /api/v2/festivals/:festivalId/teams/:teamId/owner`
- `GET /api/v2/festivals/:festivalId/teams/:teamId/owner`
- `POST /api/v2/festivals/:festivalId/retentions`
- `DELETE /api/v2/festivals/:festivalId/retentions/:id`
- `GET /api/v2/festivals/:festivalId/retentions`
- `GET /api/v2/festivals/:festivalId/auction-pool`

The pool is regenerated from registered participants and excludes every
participant already represented by a Festival Team membership. Admins and
assignment-derived Festival Team owners may read candidate data.

This API prepares owners, purses, retentions, and candidate data only. It does
not expose bidding, timers, current lots, or finalization.

## Main Festival Live Auction API (Phase 3B)

Base path: `/api/v2/festivals/:festivalId/auction`.

Lifecycle commands require bearer authentication and the `admin` role:

- `POST /start`
- `POST /pause`
- `POST /resume`
- `POST /complete`
- `POST /participants/:participantId/start`
- `POST /participants/:participantId/sell`
- `POST /participants/:participantId/unsold`

Authenticated reads:

- `GET /current`
- `GET /history`

Assignment-derived owner bid:

- `POST /bid`

```json
{
  "auctionId": "festival-auction-id",
  "expectedCurrentBid": 700000
}
```

The bidder team and owner assignment are derived from the authenticated User's
linked Employee, FestivalParticipant, and FestivalTeamOwner records. Client
team, owner, or bid amounts are not accepted. The auction must be `live`, the
observed auction state must still be current, and the calculated next bid must
not exceed the Team's remaining purse.

Selling atomically creates a `FestivalTeamMembership` with
`rosterSource=auction`, records the result, removes the participant from the
pool, and includes the winning amount in team spending. Unsold finalization
records history without creating membership.

Authenticated Socket.IO clients join with:

```json
{"festivalId":"festival-id"}
```

Client events:

- `join-festival-auction`
- `leave-festival-auction`

Server events:

- `auction-started`
- `participant-started`
- `bid-placed`
- `participant-sold`
- `participant-unsold`
- `auction-paused`
- `auction-resumed`
- `auction-completed`

Rooms use `festival-auction:<festivalId>`. The legacy tournament auction socket
contract and tables are unchanged.

Festival and Sport Auction rooms also emit the shared authoritative
`auction-state` event after every mutation and immediately after a room join.
The payload contains `scopeType`, `scopeId`, monotonic `revision`,
`serverTime`, `deadlineAt`, complete shared `state`, `history`, and `audits`.
Clients calculate the displayed countdown from `deadlineAt` and ignore older
revisions. Legacy lifecycle event names remain available for compatibility.

## Festival Roster Workflow Consolidation API (Phase 3C)

### `PATCH /api/v2/festivals/:festivalId/roster-formation-mode`

Auth: bearer JWT and admin role.

```json
{"rosterFormationMode":"auction"}
```

Allowed values are `auction` and `manual`. New and migrated Festivals default
to `auction`.

Auction mode permits auction configuration, owner assignment, retentions, and
Main Auction sales. Manual assignment, auto-balance, and assignment locking
return `400`.

Manual mode permits manual assignment, auto-balance, and assignment locking.
Auction configuration, owner assignment, retentions, and auction start return
`400`.

Changing to manual returns `409` when auction setup, owners, retentions,
auction rounds, or results exist. Changing to auction returns `409` after
manual assignments are locked.

Auction-pool reads exclude participants with any Festival Team membership,
auction result, or auction round.

## Festival Auction Stabilization API (Phase 3D)

### Registration identity linking

`POST /api/auth/register` now normalizes email and attempts a case-insensitive
Employee match inside the registration transaction. Exactly one unlinked
Employee is linked. Existing links are never overwritten.

The response adds:

```json
{"employeeLinkStatus":"linked"}
```

Possible values are `linked`, `no_match`, `duplicate_email`,
`employee_already_linked`, and `user_already_linked`.

### `GET /api/v2/festivals/:festivalId/auction/readiness`

Auth: bearer JWT and admin role.

Returns aggregate setup counts, per-Team owner readiness, overall
`READY`/`NOT_READY`, and exact blockers. The Main Auction start endpoint uses
the same server-side validation.

### Bid authorization

`POST /api/v2/festivals/:festivalId/auction/bid` requires both:

- global User role `team_owner`
- an active assignment-derived Festival Team owner record

Spectators and admins receive `403` even if accidentally linked to an Owner
Employee. Auction lifecycle and finalization routes remain admin-only.

## Festival Configuration Recovery API

### `POST /api/v2/festivals/:festivalId/configuration/unlock`

Auth: bearer JWT and admin role.

```json
{"confirmation":"UNLOCK"}
```

Persists `configurationLockState: "unlocked"` and writes a Festival operation
audit. The override permits validated configuration corrections after auction
start but does not permit bid, result, sold assignment, or winning amount
mutation.

### `POST /api/v2/festivals/:festivalId/configuration/relock`

Auth: bearer JWT and admin role.

```json
{"confirmation":"RELOCK"}
```

Restores `configurationLockState: "locked"` and writes an audit entry.

### `PATCH /api/v2/festivals/:festivalId`

Auth: bearer JWT and admin role.

Updates validated Festival detail fields. Post-start updates require the
configuration override to be unlocked.

Budget updates through
`PATCH /api/v2/festivals/:festivalId/auction-config` return `409` after any
sold Festival auction result exists.

## Team Owner Provisioning and Forced Password Change

`POST /api/v2/festivals/:festivalId/teams/:teamId/owner` accepts only:

```json
{"participantId":"festival-participant-id"}
```

The admin-only operation creates or reuses the participant Employee's User,
sets the `team_owner` role, links the records, activates ownership, and sends
credentials. The response includes `userStatus` (`Auto Created` or
`Existing User`), ownership `status`, and `credentialsSentAt`. A `502`
response means ownership committed but credential email delivery failed.
Admins can retry delivery with
`POST /api/v2/festivals/:festivalId/teams/:teamId/owner/credentials`.
For an account still awaiting its first password change, this rotates the
temporary password before sending it.

`POST /api/auth/change-password` requires the bearer token issued at login:

```json
{"password":"new-password"}
```

Users with `mustChangePassword: true` receive
`PASSWORD_CHANGE_REQUIRED` from every other authenticated HTTP route.

## Sport Auction Engine API (Phase 4C)

Base path: `/api/v2/sport-tournaments/:sportTournamentId/auction`.

Owner/admin configuration and lifecycle:

- `PATCH /config`
- `POST /start`
- `POST /pause`
- `POST /resume`
- `POST /extend`
- `POST /complete`
- `POST /participants/:participantId/start`
- `POST /participants/:participantId/sell`
- `POST /participants/:participantId/unsold`
- `POST /reauction`

Captain bid:

- `POST /bid`

```json
{
  "auctionId": "sport-auction-id",
  "expectedCurrentBid": 120
}
```

The server derives the Sport Team from the authenticated Employee's active
`SportTeamCaptain` assignment. Client-supplied Team identity and manual bid
amounts are rejected.

Authenticated reads:

- `GET /current`
- `GET /history`

Socket rooms use `sport-auction:<sportTournamentId>` through
`join-sport-auction` and `leave-sport-auction`.
