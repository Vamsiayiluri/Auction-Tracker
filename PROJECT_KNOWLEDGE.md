# PROJECT_KNOWLEDGE.md

## System Summary

AuctionArena is a two-project full-stack application:

- `ipl-auction-tracker`: React/Vite frontend.
- `ipl-auction-tracker-backend`: Express/Socket.IO/Sequelize backend.

The application models cricket-style player auctions where admins run tournament-scoped player rounds and team owners bid from their assigned teams. The server enforces bid rules and purse limits, while the frontend renders role-specific dashboards and live room updates.

## Data Model

### Users

Purpose: identity, authentication, and role.

Key fields:

- `id`
- `name`
- `email`
- `password`
- `role`
- `isVerified`
- `verificationToken`
- `verificationExpires`

Users own teams and may own bids. Password hashes are stored with bcryptjs. Verification tokens are SHA-256 hashes of raw email tokens.

### Teams

Purpose: reusable team identity and owner mapping.

Key fields:

- `id`
- `name`
- `ownerId`
- `totalAmount`
- `amountSpent`
- `tournamentId`

`totalAmount`, `amountSpent`, and `tournamentId` are legacy/global fields. Current tournament-scoped purse state belongs in `TournamentTeams`.

### Tournaments

Purpose: named auction event with budget and lifecycle state.

Key fields:

- `id`
- `name`
- `budget`
- `status`
- `createdBy`

Statuses are string values such as `upcoming`, `live`, and `completed`, but the model does not restrict allowed values.

### TournamentTeams

Purpose: many-to-many tournament participation and tournament-specific purse.

Key fields:

- `id`
- `tournamentId`
- `teamId`
- `totalAmount`
- `amountSpent`
- virtual `amountLeft`

There is a unique composite index on `(tournamentId, teamId)`.

### Players

Purpose: tournament player pool and final sale state.

Key fields:

- `id`
- `name`
- `basePrice`
- `soldPrice`
- `role`
- `isSold`
- `isInAuction`
- `teamId`
- `tournamentId`
- `auctionId`

A player is available when `isSold=false`, `isInAuction=false`, and `auctionId=""`.

### Auctions

Purpose: one player-round state.

Key fields:

- `id`
- `status`
- `currentPlayerId`
- `tournamentId`

Important limitation: there is no persisted `endsAt`. Timer deadlines are held in memory.

### Bids

Purpose: accepted bid records.

Key fields:

- `id`
- `playerId`
- `tournamentId`
- `teamName`
- `teamId`
- `bidAmount`
- `ownerId`

`teamName` is a duplicated snapshot. `ownerId` is caller-supplied in the socket payload today and should be server-derived in future work.

## Backend Request Flow

Routes are mounted in `src/index.js`:

- `/api/auth`
- `/api/teams`
- `/api/players`
- `/api/auction`
- `/api/tournament`

Protected admin mutations use `authMiddleware` and `adminMiddleware`. Many read endpoints are currently public.

Authentication:

1. Client posts credentials to `/api/auth/login`.
2. Backend validates bcrypt password.
3. Backend optionally enforces verification if `EMAIL_VERIFICATION_REQUIRED=true`.
4. Backend signs JWT payload `{ id, role }`.
5. Frontend stores token and user in `localStorage`.
6. Axios interceptor attaches `Authorization: Bearer <token>`.

## Socket.IO Flow

Socket setup lives in `ipl-auction-tracker-backend/src/index.js`.

Client events:

- `join-tournament`
- `leave-tournament`
- `place-bid`

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

Rooms use `tournament:<tournamentId>`.

The socket handler validates:

- Socket joined the tournament room.
- Bidding is open according to process-local timer and live auction status.
- Player exists and belongs to the requested tournament.
- Team exists.
- Supplied owner owns supplied team.
- Team participates in the tournament.
- Bid amount is numeric.
- Bid amount meets dynamic minimum.
- Bid does not exceed remaining purse.

Critical gap: the socket itself is not authenticated, and `ownerId`/`teamId` are client supplied.

## Auction Lifecycle

### Start Round

Endpoint: `POST /api/auction/start/:playerId`

Backend behavior:

1. Validate `auctionId`.
2. Load player and tournament.
3. Reject completed tournament.
4. Ensure player belongs to requested tournament.
5. Reject already sold/completed player.
6. Ensure tournament has participating teams.
7. Ensure no live/pending auction exists in the tournament.
8. Set player `isInAuction=true` and assign `auctionId`.
9. Create `Auction` with `status="live"`.
10. Set tournament `status="live"`.
11. Schedule 20-second in-memory timer.
12. Emit `auction-started`.

The player update and auction creation are not currently wrapped in a transaction.

### Place Bid

Event: `place-bid`

Backend behavior:

1. Validate room membership and open bidding.
2. Load player and team.
3. Validate team ownership and tournament membership.
4. Start Sequelize transaction.
5. Lock live auction.
6. Lock tournament-team purse row.
7. Read latest bid.
8. Validate dynamic minimum.
9. Validate purse.
10. Insert `Bid`.
11. Commit transaction.
12. Reset timer.
13. Emit `new-bid`.

### Timer Expiry

When the timer ends, the server changes the live auction to `pending`, clears the timer, calculates bid state, and emits `auction-pending-finalization`.

The player is not automatically sold. The admin must decide.

### Extend Round

Endpoint: `POST /api/auction/extend/:playerId`

Only works after the round is pending. It resets the auction to `live`, schedules another 20 seconds, and emits timer update/extension events.

### Sell Player

Endpoint: `POST /api/auction/sell/:playerId`

Requires a pending auction and highest bid. In a transaction:

- Assigns player to winning team.
- Sets `isSold=true`.
- Stores `soldPrice`.
- Increments winning `TournamentTeam.amountSpent`.
- Sets player `isInAuction=false`.
- Marks auction `completed`.

Then emits `player-sold` and `auction-finalized`.

### Mark Unsold

Endpoint: `POST /api/auction/unsold/:playerId`

Requires a pending auction. Clears sale fields, sets `isInAuction=false`, completes the auction, and emits `player-unsold` plus `auction-finalized`.

### Tournament Completion

After finalization, the backend counts available and live players. If none remain, it sets tournament status to `completed` and emits `tournament-completed`.

## Bid Increment Rules

Rules are implemented in `ipl-auction-tracker-backend/src/utils/bidRules.js`.

Base increment:

- Below 1,000,000: 25,000
- Below 2,500,000: 50,000
- Below 5,000,000: 100,000
- Below 10,000,000: 200,000
- 10,000,000 and above: 500,000

Budget-stage multiplier:

- At or above 20% of budget: 1.25x
- At or above 35% of budget: 1.5x
- At or above 60% of budget: 2x

Increment is rounded up to the nearest 25,000. Next minimum bid is current bid plus increment.

## Frontend Routes

- `/login`: guest login.
- `/register`: guest registration.
- `/verify-email/:token`: email verification.
- `/dashboard`: authenticated dashboard.
- `/start-live-auction`: admin auction control.
- `/live-auction`: team owner room.
- `/spectator-live-auction`: spectator room.

Route guards live in `src/components/RouteGuards.jsx`. They are UX controls only.

## Frontend State and Data Loading

The frontend uses local component state. Common patterns:

- `AuthContext` stores `user`.
- Token and user are persisted to `localStorage`.
- `api.js` attaches bearer tokens.
- Live components join/leave Socket.IO rooms in `useEffect`.
- Components use `active` flags in effects to avoid setting state after unmount.

Known data-loading issue: dashboards enrich tournaments with per-tournament player and team requests. This creates frontend fan-out and should be replaced by backend summary endpoints for scale.

## Environment Variables

Backend required/used:

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

Frontend:

- `VITE_API_URL`

`JWT_SECRET` is mandatory for auth correctness even though startup validation is incomplete.

## Testing Status

Backend has one focused test file:

- `ipl-auction-tracker-backend/test/security-phase1.test.js`

It verifies public registration role allowlisting and safe user responses. There is no broad backend integration coverage and no frontend test harness.

## Known Discrepancies

- `ipl-auction-tracker/README.md` is still the generic Vite README.
- Original requirements mention automatic winner assignment at timer expiry; implemented behavior requires admin finalization.
- Original requirements mention free-form bid input and pass/fold; implemented UI has a single next-minimum-bid button.

## Production Constraints

- Process-local timers prevent safe multi-instance backend scaling.
- Socket.IO has no shared adapter.
- Runtime schema sync/backfills are not production migration controls.
- Health endpoint does not verify MySQL, Socket.IO, or SendGrid.
- No structured logs, metrics, traces, CI/CD, backup automation, or rollback path are present.
