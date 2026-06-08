# API Documentation

Base URL: `${VITE_API_URL}/api` from the frontend. JSON bodies are expected.
Bearer authentication is attached by `ipl-auction-tracker/src/utils/api.js`.

Auction, tournament-management, and player-creation mutation endpoints enforce
authentication and admin role. Read endpoints remain public in the backend
code.

## Common Errors

- `400`: invalid request, validation failure, or invalid state.
- `401`: missing/invalid bearer token on protected auction mutations.
- `403`: authenticated user is not an admin on protected auction mutations.
- `404`: requested entity/current auction not found.
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
  "budget": 20000000,
  "teams": ["Team A", "Team B"],
  "players": [
    {"id":"player-id","name":"Player","role":"Batsman","basePrice":500000}
  ]
}
```

Creates `Tournaments`, one `TournamentTeams` row per matched team, and
`Players`. `teams` are matched by name. `createdBy` is derived from the
authenticated admin and is not accepted from the request body.
Validation: budget and player base prices must be positive numbers; teams and
players must be non-empty arrays; player roles must be `Batsman`, `Bowler`,
`All-rounder`, or `Wicketkeeper`.
Errors: `400` validation failure or team mismatch; `401`; `403`; `500`.

### `PATCH /api/tournament/:id/status`

Auth: bearer JWT and admin role.
Body: `{"status":"live"}`.
Purpose: writes a validated status string. Allowed status values are
`upcoming`, `live`, and `completed`. Response: updated tournament.
Errors: `400` validation failure; `401`; `403`; `404`; `500`.

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
  "role": "Bowler",
  "basePrice": 500000,
  "tournamentId": "tournament-id"
}
```

Purpose: creates a player after confirming tournament exists.
Validation: player name, role, positive base price, and tournament ID are
required. Allowed roles are `Batsman`, `Bowler`, `All-rounder`, and
`Wicketkeeper`.
Errors: `400` validation failure; `401`; `403`; `404` tournament; `500`.

### `GET /api/players?tournamentId=:id`

Auth: no. With query, returns tournament players. Without query, returns all
players including associated team. No pagination.

### `GET /api/players/playerBids/:tournamentId`

Auth: no. Returns every player in a tournament, each with descending bids.
Errors: `404` no players; `500`. Uses one bid query per player.

## Teams

Files: `src/routes/teamRoutes.js`, `src/controllers/team.controller.js`.

### `GET /api/teams?tournamentId=:id`

Auth: no. With query, returns tournament-scoped team budgets and identities.
Falls back to legacy `Teams.tournamentId` records. Without query, returns all
teams including owner user objects.

### `GET /api/teams/getTeamByid/:ownerId?tournamentId=:id`

Auth: no. Returns the team owned by arbitrary `ownerId`, optionally scoped to a
tournament. Errors: `404`.

### `GET /api/teams/getTeamAndPlayers/:ownerId?tournamentId=:id`

Auth: no. Returns arbitrary owner's team and purchased players, optionally
tournament-scoped. Errors: `404`, `500`.

### `GET /api/teams/getAllteamsAndPlayers`

Auth: no. Returns all teams and their players. Errors: `404`, `500`. Uses one
player query per team.

## Auction Control

Files: `src/routes/auctionRoutes.js`,
`src/controllers/auction.controller.js`.

### `POST /api/auction/start/:playerId`

Auth: bearer JWT and admin role.
Body: `{"auctionId":"round-id","tournamentId":"tournament-id"}`.
Purpose: validates player/tournament/participation/active-round state, creates a
live auction, starts a 20-second timer, and broadcasts `auction-started`.
Validation: `playerId` path param and `auctionId` are required; `tournamentId`
is optional but must be non-empty when supplied.
Errors: `400` validation failure or invalid auction state; `404`, `500`.

### `GET /api/auction/currentPlayer?tournamentId=:id`

Auth: no. Returns active live or pending player, bids, state, next minimum bid,
and process-local `endsAt`. Errors: `404`, `500`.

Example response:

```json
{
  "message": "Current player in live auction",
  "player": {"id":"p1","name":"Player","basePrice":500000},
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

Auth: bearer JWT and admin. Restarts a pending round for 20 seconds.
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

Server validates room membership, live timer, player/tournament relationship,
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
