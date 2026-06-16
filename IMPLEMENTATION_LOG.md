# IMPLEMENTATION_LOG.md

## Festival And Sport Auction Synchronization

Status: COMPLETE

Completed on: 2026-06-14

- Added one shared server synchronization service for Festival and Sport
  Auctions.
- Every live mutation now broadcasts a revisioned full `auction-state`
  snapshot with server time and authoritative deadline.
- Snapshots include current round, bids, leading Team, next bid, purse or
  credits, pool, rosters, counts, history, and audits.
- Room joins and reconnects immediately push the latest snapshot.
- Festival Admin, Owner, Spectator, and Sport Owner, Captain, Spectator views
  consume the same payload and reject older revisions.
- Client timers calculate display seconds from the server deadline and
  server-clock offset; clients do not extend or reset deadlines locally.

## Festival And Sport Auction Opening Bid Correction

Status: COMPLETE

Completed on: 2026-06-14

- Fresh rounds now expose current bid zero, opening bid equal to base price,
  no leading Team, and zero accepted bids.
- The first accepted Festival purse bid and Sport credit bid now persist the
  participant base value; later bids use the fixed base-price percentage.
- Socket payloads include authoritative bid numbering/count and post-bid
  progression.
- Sold results and purse/credit deduction continue to derive from the persisted
  winning bid.

## Phase 4B Sport Auction Preparation Foundation

Status: COMPLETE

Completed on: 2026-06-14

- Added independent integer credit budgets for Sport Teams.
- Added equal credit distribution, manual overrides, totals, and audit fields.
- Added transactional Sport Auction Pool generation and regeneration.
- Extended eligibility with Captain and existing Sport Team member exclusions.
- Extended readiness with budget, Pool existence, availability, and freshness
  checks.
- Added the Sport Tournament Control Center and Budgets/Pool workspace tabs.
- Kept future Auction actions disabled and marked Coming Soon.
- Added authenticated read-only setup views and assignment-protected mutations.
- Did not add live Sport Auction, bidding, timers, Socket.IO, sold/unsold
  behavior, fixtures, matches, standings, finals, or Competition Engine work.
- Per user instruction, no tests, lint, build, migrations, or verification
  commands were run.

## Phase 4A Sport Tournament Foundation

Status: COMPLETE

Completed on: 2026-06-14

- Added Sport Tournaments beneath Festival Teams.
- Added automatic internal Sport Team generation and rename support.
- Added assignment-based Captains using normal Festival Participant Employees.
- Preserved Festival Team Owner participation and Captain eligibility.
- Added reusable eligibility and readiness services with exact blockers.
- Added assignment-derived Team Owner authorization and a dedicated workspace.
- Added migration, validation, focused regression tests, lint, and build
  verification.
- Did not add Sport Auction, bidding, budgets, fixtures, matches, standings,
  finals, or Competition Engine behavior.

## Festival Auction Deterministic Expiry Recovery

Status: COMPLETE

Completed on: 2026-06-14

- Fixed exact persisted/in-memory deadline comparisons after bid timer resets.
- Added bounded MySQL timestamp precision tolerance.
- Rescheduled early timer callbacks instead of dropping expiry processing.
- Reconciled overdue live rounds during current-auction reads.
- Added server-authoritative `adminActions` for Extend, Sell, and Unsold.
- Added client retry polling after local zero and expiry lifecycle logging.
- Added focused expiry, socket, action-state, and race regression tests.

## Employee Gender Foundation

Status: COMPLETE

Completed on: 2026-06-14

- Added required `Employees.gender` with `male` and `female` values.
- Added a recovery-safe, idempotent MySQL migration and gender index.
- Backfilled existing Employees to a review-required placeholder because no
  prior canonical gender source exists.
- Added Employee DTO, validation, filtering, import, export, manual create/edit,
  and directory table support.
- Kept FestivalParticipant free of duplicate gender storage and exposed gender
  through nested Employee responses and Festival views.
- Required combined Festival participant imports to match an existing Employee
  whose gender was established through the Employee Directory.
- Added focused regression coverage and documentation.
- Did not implement Phase 4, Sport Teams, Sport Auctions, or Competition Engine.

## Festival Auction Stabilization & UX Hardening

Status: COMPLETE

Completed on: 2026-06-12

- Added stale bid detection using the observed auction ID and current bid.
- Persisted accepted bids and deadline resets in the same transaction.
- Prevented stale process-local timeouts from expiring a newer deadline.
- Rejected Unsold when accepted bids exist.
- Added Team Name to Team Owner credential emails and resends.
- Replaced participant selection with searchable autocomplete.
- Kept Extend visible for every active admin round.
- Added duplicate submission guards, loaders, and clean-success import closure.
- Auto-opened active Owner auctions and exposed both Team summaries.
- Added prominent Owner Team labels and read-only Available/Unsold queues.
- Replaced Own/Won/Lost filters with participant outcome categories.
- Added focused stabilization regression coverage.

No Phase 4, Sport Team, Sport Auction, scheduling, or Competition Engine work
was added.

## Phase 3G.1 Festival Setup Wizard Stabilization

Status: COMPLETE

Completed on: 2026-06-11

- Replaced frontend-inferred completion with backend `setupSteps`.
- Merged Sports and Employees into Setup Foundation.
- Reordered the wizard into the approved nine-step journey.
- Added centralized invalidation for all setup mutations.
- Fixed Team, Budget, Owner, Retention, pool, and readiness refresh paths.
- Persisted resume state by stable step name.
- Added focused stabilization tests and
  `FESTIVAL_SETUP_STABILIZATION_REPORT.md`.

## Phase 3G.1 Festival Workspace UX Refactor

Status: COMPLETE

Completed on: 2026-06-11

- Converted the Festival setup shell into a true one-step-at-a-time wizard.
- Added persisted wizard and operations-tab state.
- Split pre-launch Setup mode from live/paused/completed Operations mode.
- Added a persistent Control Center with readiness metrics and lifecycle-aware
  quick actions.
- Added Overview, Auction, History, and focused administration tabs.
- Reused existing Festival APIs and server readiness/locking rules.
- Added lazy component loading and active-section data loading.
- Added responsive tab, metric, action, and table wiring.
- Added focused Phase 3G.1 regression tests and `FESTIVAL_WORKSPACE_UX.md`.

Node.js/npm are unavailable on PATH, but a bundled Node runtime was used
directly. Phase 3G.1 focused tests passed, frontend lint completed with no
errors, and the production build was verified with a temporary output
directory because the existing `dist` directory was locked.

## Phase 3G Festival Operations & UX Stabilization

Status: COMPLETE

Completed on: 2026-06-10

- Added unsold re-auction, attempt history, counters, and audits.
- Added server-authoritative setup locking.
- Added bulk sports and retention operations.
- Added a shared increment profile engine.
- Added the resumable setup wizard and expanded readiness dashboard.
- Fixed stale Team-dependent dropdowns with shared revision refetch.
- Added search/filter support, migration, tests, and operations documentation.

## Festival Bid Increment Percentage

- Replaced Festival increment profiles and custom rules with a single 20% or
  25% setting, defaulting to 20%.
- Festival increments are now fixed percentages of participant base price and
  do not compound.
- Added consistent progression fields to Festival live auction responses and
  retained one-click Owner bidding.
- Tournament Auction progression remains unchanged.

Node.js/npm are unavailable on PATH, so automated verification was not run.

## Phase 3F Festival Auction UX Alignment

Status: COMPLETE

Completed on: 2026-06-10

- Reused `src/utils/bidRules.js` for Festival increments.
- Removed owner-entered amounts and added admin-entered base price.
- Added persisted deadlines, pause remaining time, restart recovery, expiry,
  bid reset, resume, and extend.
- Required expiry before sell or unsold.
- Added live Team summaries, numbered bid history, and timestamped results.
- Added Phase 3F migration, socket events, UI alignment, and focused tests.

Node.js and npm are unavailable on PATH in this environment, so automated
tests, lint, and build could not be executed.

## Phase 1 Security

Status: COMPLETE

Completed on: 2026-06-05

Scope:

- SEC-001 Remove Admin Self Registration
- SEC-002 Protect Tournament APIs
- SEC-003 Protect Player APIs
- SEC-004 Remove Sensitive User Data Exposure

## Completed Items

### SEC-001 Remove Admin Self Registration

Status: COMPLETE

Finding:

- Public admin self-registration was already blocked in the current implementation.
- Frontend registration exposes only `team_owner` and `spectator`.
- Backend public registration allows only `team_owner` and `spectator`.

Changes:

- Added regression tests to ensure admin is not exposed as a frontend public registration role.
- Added stricter role allowlist assertions for admin variants.

Files:

- `ipl-auction-tracker-backend/test/security-phase1.test.js`

### SEC-002 Protect Tournament APIs

Status: COMPLETE

Finding:

- `POST /api/tournament/create` is protected by `authMiddleware` and `adminMiddleware`.
- `PATCH /api/tournament/:id/status` is protected by `authMiddleware` and `adminMiddleware`.

Changes:

- Production code did not require changes.
- Added regression tests that verify tournament mutation routes require both authentication and admin role middleware.

Files:

- `ipl-auction-tracker-backend/test/security-phase1.test.js`

### SEC-003 Protect Player APIs

Status: COMPLETE

Finding:

- `POST /api/players` is protected by `authMiddleware` and `adminMiddleware`.

Changes:

- Production code did not require changes.
- Added regression tests that verify player creation requires both authentication and admin role middleware.

Files:

- `ipl-auction-tracker-backend/test/security-phase1.test.js`

### SEC-004 Remove Sensitive User Data Exposure

Status: COMPLETE

Finding:

- Login and registration responses already return users through `toSafeUserResponse`.
- `toSafeUserResponse` excludes `password`, `verificationToken`, and `verificationExpires`.

Changes:

- Production code did not require changes.
- Added regression tests that verify login and registration responses continue to use the safe user DTO.
- Existing tests already verify safe DTO output excludes authentication and verification secrets.

Files:

- `ipl-auction-tracker-backend/test/security-phase1.test.js`

## Validation Notes

- Automated tests were added for Phase 1 controls.
- Test execution could not be completed in this environment because `npm` and `node` are not available on PATH.
- Run validation locally with:

```powershell
cd ipl-auction-tracker-backend
npm test
```

## Remaining Security Work

The following are outside Phase 1 and were intentionally not implemented:

- Socket authentication.
- Public read API authorization beyond Phase 1 mutation checks.
- CORS allowlist hardening.
- Rate limiting.

## Phase 2 Authentication

Status: COMPLETE

Completed on: 2026-06-05

Scope:

- SEC-005 JWT Expiration
- AUTH-001 Password Reset Workflow

### SEC-005 JWT Expiration

Status: COMPLETE

Finding:

- Login previously issued JWTs without `expiresIn`.
- `authMiddleware` uses `jwt.verify`, so it enforces expiration once tokens
  contain an `exp` claim.
- No refresh tokens existed and none were added in this phase.

Changes:

- Added one-hour access token expiration to login JWTs.
- Preserved the existing login response shape.
- Added regression tests that verify the one-hour expiration configuration.

Files:

- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/test/auth-phase2.test.js`

### AUTH-001 Password Reset Workflow

Status: COMPLETE

Finding:

- No forgot-password endpoint, reset-password endpoint, reset tokens, reset
  email template, or frontend reset pages existed.

Changes:

- Added `POST /api/auth/forgot-password`.
- Added `POST /api/auth/reset-password`.
- Added cryptographically secure reset tokens.
- Stored only SHA-256 reset token hashes.
- Added one-hour reset token expiry.
- Cleared reset token fields after successful reset, making tokens single-use.
- Added SendGrid password reset email integration.
- Added `/forgot-password` and `/reset-password/:token` frontend pages.
- Added regression tests covering reset token generation/storage, invalid or
  expired token handling, token clearing after use, routes, and frontend pages.

Files:

- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/routes/authRoutes.js`
- `ipl-auction-tracker-backend/src/models/user.model.js`
- `ipl-auction-tracker-backend/src/models/index.js`
- `ipl-auction-tracker-backend/src/utils/emailService.js`
- `ipl-auction-tracker-backend/src/utils/passwordReset.js`
- `ipl-auction-tracker-backend/test/auth-phase2.test.js`
- `ipl-auction-tracker/src/App.jsx`
- `ipl-auction-tracker/src/pages/Login.jsx`
- `ipl-auction-tracker/src/pages/ForgotPassword.jsx`
- `ipl-auction-tracker/src/pages/ResetPassword.jsx`

### Phase 2 Documentation

Updated:

- `API.md`
- `UserGuide.md`
- `IMPROVEMENT_ROADMAP.md`

### Phase 2 Validation Notes

- Automated regression tests were added for Phase 2 controls.
- Test execution could not be completed in this environment because `npm` and
  `node` are not available on PATH.
- Run validation locally with:

```powershell
cd ipl-auction-tracker-backend
npm test
```

## Remaining Security Work

The following are outside Phase 2 and were intentionally not implemented:

- Socket authentication.
- Refresh token rotation and server-side token revocation.
- Password change while logged in.
- Public read API authorization beyond Phase 1 mutation checks.
- CORS allowlist hardening.
- Rate limiting.

## Phase 3 Socket Security

Status: COMPLETE

Completed on: 2026-06-05

Scope:

- SEC-006 Authenticate Socket.IO Connections
- SEC-007 Derive Team Ownership Server Side

### SEC-006 Authenticate Socket.IO Connections

Status: COMPLETE

Finding:

- Socket.IO previously accepted connections without a token.
- `join-tournament` and `place-bid` were available to any connected socket.
- No JWT verification existed during the socket handshake.

Changes:

- Added Socket.IO middleware that requires a JWT from `socket.handshake.auth.token`.
- Added bearer-header fallback for socket clients that send `Authorization`.
- Verifies tokens with `jwt.verify`, so invalid and expired JWTs are rejected.
- Loads the authenticated user from the database and attaches safe identity
  fields to `socket.user`.
- Keeps spectator/admin/team-owner room watching available to authenticated
  users while restricting bid placement to `team_owner`.
- Updated frontend socket connection to send the stored login token during
  connection and disconnect on logout.

Files:

- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker/src/webSocket/socket.js`
- `ipl-auction-tracker/src/context/AuthContext.jsx`
- `ipl-auction-tracker/src/App.jsx`
- `ipl-auction-tracker-backend/test/socket-phase3.test.js`

### SEC-007 Derive Team Ownership Server Side

Status: COMPLETE

Finding:

- The socket bid payload previously included client-supplied `ownerId`,
  `teamId`, and `teamName`.
- The server verified that the supplied owner owned the supplied team, but did
  not prove the connected socket was that owner.

Changes:

- Removed `ownerId`, `teamId`, and `teamName` from the frontend `place-bid`
  payload.
- The bid handler derives owner identity from `socket.user.id`.
- The bid handler loads teams owned by the authenticated user and resolves the
  participating tournament team from the database.
- Accepted bids and `new-bid` broadcasts use server-derived `ownerId`,
  `teamId`, and `teamName`.
- Spectators and admins receive a bid rejection if they attempt to place a bid.

Files:

- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker-backend/test/socket-phase3.test.js`

### Phase 3 Documentation

Updated:

- `API.md`
- `SecurityReview.md`
- `IMPROVEMENT_ROADMAP.md`

### Phase 3 Validation Notes

- Automated regression tests were added for socket handshake auth, token
  rejection paths, role authorization, frontend JWT handoff, and server-derived
  bidder identity.
- Test execution could not be completed in this environment because `npm` and
  `node` are not available on PATH.
- Run validation locally with:

```powershell
cd ipl-auction-tracker-backend
npm test
```

## Remaining Security Work

The following are outside Phase 3 and were intentionally not implemented:

- Public read API authorization beyond Phase 1 mutation checks.
- Tournament room membership authorization for non-public tournament visibility.
- Refresh token rotation and server-side token revocation.
- Password change while logged in.
- CORS allowlist hardening.
- Rate limiting for HTTP and socket events.

## Phase 4 Validation

Status: COMPLETE

Completed on: 2026-06-05

Scope:

- Centralized Zod validation layer.
- Auth validation for register, login, forgot password, and reset password.
- Tournament validation for create and status update.
- Player validation for create.
- Auction validation for start, stop, extend, sell, and unsold actions.
- Socket validation for `place-bid`.

### Findings

- Auth controllers had duplicated legacy body parsing and inline checks for
  roles, missing email, reset token, and password length.
- Tournament creation manually checked required fields and array presence, but
  status updates accepted arbitrary strings.
- Player creation only checked `tournamentId`, while player name, role, and base
  price were left to model/database behavior.
- Auction start manually checked only `auctionId`; action routes did not
  validate `playerId` before controller execution.
- Socket `place-bid` validated bid amount manually after room, timer, player,
  team, and tournament-team database lookups.

### Validation Architecture

- `src/middleware/validate.middleware.js` provides reusable HTTP validation and
  socket payload validation.
- `src/validation/common.validation.js` centralizes reusable string, ID, numeric,
  role, tournament-status, payload-normalization, and error-format helpers.
- Feature-specific schemas live in:
  - `src/validation/auth.validation.js`
  - `src/validation/tournament.validation.js`
  - `src/validation/player.validation.js`
  - `src/validation/auction.validation.js`
  - `src/validation/socket.validation.js`
- HTTP validation failures return:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

### Changes

- Added `zod` backend dependency declaration.
- Added centralized validation middleware and schema modules.
- Wired validation into auth, tournament, player, and auction mutation routes.
- Removed duplicated inline validation from the covered controller actions while
  preserving business-state and database-existence checks.
- Added socket `place-bid` validation before bid authorization/database work.
- Added enum enforcement for public registration roles, player roles, and
  tournament status values.
- Preserved legacy form-encoded JSON body normalization in the validation
  middleware.

Files:

- `ipl-auction-tracker-backend/package.json`
- `ipl-auction-tracker-backend/package-lock.json`
- `ipl-auction-tracker-backend/src/middleware/validate.middleware.js`
- `ipl-auction-tracker-backend/src/validation/common.validation.js`
- `ipl-auction-tracker-backend/src/validation/auth.validation.js`
- `ipl-auction-tracker-backend/src/validation/tournament.validation.js`
- `ipl-auction-tracker-backend/src/validation/player.validation.js`
- `ipl-auction-tracker-backend/src/validation/auction.validation.js`
- `ipl-auction-tracker-backend/src/validation/socket.validation.js`
- `ipl-auction-tracker-backend/src/routes/authRoutes.js`
- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js`
- `ipl-auction-tracker-backend/src/routes/playerRoutes.js`
- `ipl-auction-tracker-backend/src/routes/auctionRoutes.js`
- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker-backend/src/controllers/auction.controller.js`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/test/validation-phase4.test.js`
- `ipl-auction-tracker-backend/test/security-phase1.test.js`
- `ipl-auction-tracker-backend/test/auth-phase2.test.js`
- `API.md`
- `IMPROVEMENT_ROADMAP.md`

### Phase 4 Validation Notes

- Automated schema and middleware regression tests were added for valid
  payloads, invalid payloads, required fields, enum values, malformed socket
  data, and standard error formatting.
- Test execution could not be completed in this environment because `npm` and
  `node` are not available on PATH.
- Run dependency installation and validation locally with:

```powershell
cd ipl-auction-tracker-backend
npm install
npm test
```

## Remaining Security Work

The following are outside Phase 4 and were intentionally not implemented:

- Phase 5 database/migration work.
- Public read API authorization beyond Phase 1 mutation checks.
- Tournament room membership authorization for non-public tournament visibility.
- Refresh token rotation and server-side token revocation.
- Password change while logged in.
- CORS allowlist hardening.
- Rate limiting for HTTP and socket events.
- Validation for read endpoint query/path params not listed in Phase 4 scope.

## Phase 5 Database

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Versioned Sequelize migration workflow.
- Initial schema and legacy backfill migration.
- Query-driven database indexes.
- Foreign-key and enum-like integrity constraints.
- Removal of runtime schema synchronization and startup backfills.
- Database migration and integrity regression tests.

### Findings

- Backend startup used `sequelize.sync({ force: false })`, conditionally added
  columns, and ran four data backfills.
- Existing model associations did not provide a controlled production
  migration strategy.
- Current player availability, bid history/highest-bid, active auction, team
  ownership, and tournament-team queries justified the indexes documented in
  `Database.md`.
- `Tournament.createdBy` had no declared association or database foreign key.
- User role, tournament status, player role, and auction status were
  unrestricted strings.

### Migration Strategy

- Added an ESM migration runner backed by the standard `SequelizeMeta` table.
- Added `npm run db:migrate` with `up`, `status`, and single-step `down`
  commands.
- The baseline migration creates missing tables for fresh databases and
  additively upgrades existing databases.
- Legacy startup backfills now run once in the baseline migration.
- The integrity migration validates enum values and orphan references before
  applying constraints. Invalid legacy data stops the migration without
  deleting records.
- The baseline migration is intentionally non-destructive and cannot be
  reverted.

### Indexes

- `Teams(ownerId)`
- `Players(tournamentId, isInAuction, isSold, auctionId)`
- `Players(teamId, tournamentId)`
- `Auctions(tournamentId, status)`
- `Auctions(currentPlayerId, tournamentId, status)`
- `Bids(playerId, tournamentId, bidAmount)`
- `Bids(playerId, tournamentId, createdAt)`
- Supporting FK indexes for bid team/owner, tournament creator, and
  tournament-team team lookup.

### Integrity Changes

- Added foreign keys for team owner, tournament creator, tournament-team
  membership, player team/tournament, auction player/tournament, and bid
  player/tournament/team/owner relationships.
- Join rows cascade when a tournament or team is removed.
- Optional historical ownership/player references use `SET NULL` where
  compatible.
- Core historical and ownership relationships use `RESTRICT`.
- Added database ENUMs and matching model ENUMs for user role, tournament
  status, player role, and auction status.
- Normalized known legacy lowercase player roles before enum enforcement.

### Technical Debt Decisions

- `Teams.tournamentId`, `Teams.totalAmount`, and `Teams.amountSpent` remain for
  backward compatibility but are deprecated. `TournamentTeams` remains the
  source of truth for tournament purse state.
- `Bids.teamName` remains as an intentional historical snapshot.
- `Bids.ownerId` remains for bid-time audit context and can become null if the
  user is removed.
- `Player.auctionId` remains for compatibility. Its duplication with
  `Auction.currentPlayerId` still requires a future state-model decision.
- Player prices remain floating point; monetary normalization is deferred.

Files:

- `ipl-auction-tracker-backend/package.json`
- `ipl-auction-tracker-backend/scripts/migrate.js`
- `ipl-auction-tracker-backend/migrations/202606080001-initial-schema.js`
- `ipl-auction-tracker-backend/migrations/202606080002-phase5-integrity-indexes.js`
- `ipl-auction-tracker-backend/src/database/migrator.js`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/src/models/index.js`
- `ipl-auction-tracker-backend/src/models/user.model.js`
- `ipl-auction-tracker-backend/src/models/team.model.js`
- `ipl-auction-tracker-backend/src/models/tournment.model.js`
- `ipl-auction-tracker-backend/src/models/tournamentTeam.model.js`
- `ipl-auction-tracker-backend/src/models/player.model.js`
- `ipl-auction-tracker-backend/src/models/auction.model.js`
- `ipl-auction-tracker-backend/src/models/bid.model.js`
- `ipl-auction-tracker-backend/test/database-phase5.test.js`
- `Database.md`
- `DeploymentGuide.md`
- `IMPROVEMENT_ROADMAP.md`
- `IMPLEMENTATION_LOG.md`

### Phase 5 Validation Notes

- Added focused tests for migration ordering/idempotence, runtime sync removal,
  index creation declarations, enum constraints, orphan checks, and foreign-key
  policies.
- Node.js and npm are not available on PATH in this environment, so automated
  tests and live MySQL migration execution could not be run.
- Run migration status, migrations, and tests with:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate -- status
npm run db:migrate
npm test
```

## F-001 Auction Timer Persistence

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Persist auction start and deadline timestamps.
- Restore live auction timers after backend restart without granting a fresh
  timer.
- Preserve pending-finalization behavior on timer expiry.

### Findings

- `restoreAuctionTimers` existed, but it recreated every live timer with a new
  20-second deadline on startup.
- `POST /api/auction/start/:playerId` calculated `endsAt` for broadcasts but
  did not store it.
- Bid resets and `POST /api/auction/extend/:playerId` reset the process-local
  timer without persisting the new deadline.
- `GET /api/auction/currentPlayer` returned the in-memory timer deadline, so a
  recovered process could not report the database deadline unless the timer had
  been rescheduled.

### Changes

- Added `Auctions.startedAt` and `Auctions.endsAt` through a versioned
  migration.
- Updated the `Auction` Sequelize model with nullable date fields.
- Auction start now stores `startedAt` and `endsAt` in the created auction row.
- Timer reset now updates `Auctions.endsAt`; this covers accepted bid timer
  resets and admin extension of pending auctions.
- Startup recovery now reads live auctions with persisted `endsAt`, schedules
  only the remaining time, and moves missing or overdue deadlines to pending
  finalization instead of granting a new 20 seconds.
- Current-auction reads now return persisted `endsAt`.

Files:

- `ipl-auction-tracker-backend/migrations/202606080003-auction-timer-persistence.js`
- `ipl-auction-tracker-backend/src/models/auction.model.js`
- `ipl-auction-tracker-backend/src/controllers/auction.controller.js`
- `ipl-auction-tracker-backend/test/auction-timer-f001.test.js`
- `Database.md`
- `API.md`
- `IMPLEMENTATION_LOG.md`

### F-001 Validation Notes

- Added focused regression tests for auction start persistence, timer reset and
  extension persistence, persisted deadline reads, startup recovery, and expired
  auction recovery.
- Run migrations and tests with:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate
npm test
```

## Remaining Database Risks

- Player monetary fields still use floating point.
- `Player.auctionId` and `Auction.currentPlayerId` can drift.
- Legacy team tournament/purse columns remain populated for compatibility.
- Migrations require a backup and production-data preflight before deployment.
- No automated backup/restore workflow or migration gate exists.

## F-002 Tournament Status Transition Validation

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Replace arbitrary tournament status changes with a controlled state machine.
- Preserve the existing admin-only status mutation route.
- Reuse one transition validator across controller and tests.

### Findings

- The tournament model supports only `upcoming`, `live`, and `completed`.
- The Phase 5 integrity migration enforces the same database enum values.
- `archived` is not currently supported by the schema and was not added.
- The status update route already used Zod enum validation and admin
  authorization, but the controller still allowed any enum-valid status jump.

### Transition Rules

- `upcoming` can transition only to `live`.
- `live` can transition only to `completed`.
- `completed` is terminal.
- Unknown status values are rejected by validation and by the reusable
  transition helper.

### Changes

- Added centralized tournament status constants and transition validation.
- Reused the centralized status list in the Zod tournament status schema.
- Updated `PATCH /api/tournament/:id/status` to reject invalid transitions with
  the standard validation error envelope before saving.
- Added F-002 regression tests for valid transitions, invalid transitions,
  invalid enum values, and endpoint wiring.

Files:

- `ipl-auction-tracker-backend/src/utils/tournamentStatus.js`
- `ipl-auction-tracker-backend/src/validation/common.validation.js`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker-backend/test/tournament-status-f002.test.js`
- `API.md`
- `Database.md`
- `IMPLEMENTATION_LOG.md`

### F-002 Validation Notes

Run validation with:

```powershell
cd ipl-auction-tracker-backend
npm test
```

Phase 6 Reliability was not started.

## F-005 Tournament Edit / Archive

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Add `archived` tournament status support.
- Allow admins to edit tournament setup before a tournament goes live.
- Allow admins to archive completed tournaments.
- Update admin tournament management UI with edit/archive actions and status
  filters.

### Findings

- `archived` did not exist in the database enum, Sequelize model, validation
  schema, or API documentation.
- Tournament creation existed, but there was no tournament edit endpoint for
  name, budget, participating teams, or player pool.
- Completed tournaments could not be archived. F-002 treated `completed` as
  terminal.

### Changes

- Added `archived` to the tournament status enum and model.
- Extended transition validation to allow only
  `upcoming` -> `live` -> `completed` -> `archived`; `archived` is terminal.
- Added `PATCH /api/tournament/:id` for admin-only upcoming tournament edits.
- Added `PATCH /api/tournament/:id/archive` for admin-only completed tournament
  archival.
- Kept live, completed, and archived tournaments read-only for tournament setup
  edits and player additions.
- Added admin UI actions for upcoming edit and completed archive.
- Added dashboard status filtering for All, Upcoming, Live, Completed, and
  Archived.

Files:

- `ipl-auction-tracker-backend/migrations/202606080004-tournament-archive-status.js`
- `ipl-auction-tracker-backend/src/models/tournment.model.js`
- `ipl-auction-tracker-backend/src/utils/tournamentStatus.js`
- `ipl-auction-tracker-backend/src/validation/tournament.validation.js`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js`
- `ipl-auction-tracker-backend/test/tournament-edit-archive-f005.test.js`
- `ipl-auction-tracker-backend/test/tournament-status-f002.test.js`
- `ipl-auction-tracker-backend/test/validation-phase4.test.js`
- `ipl-auction-tracker-backend/test/database-phase5.test.js`
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `API.md`
- `Database.md`
- `AdminGuide.md`
- `IMPLEMENTATION_LOG.md`

### F-005 Validation Notes

Run migrations and tests with:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate
npm test
```

Frontend build validation:

```powershell
cd ipl-auction-tracker
npm run build
```

## F-006 Multi-Sport Foundation

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Add a minimal sports catalog.
- Add one sport per tournament.
- Add one sport per player.
- Backfill existing tournaments and players to cricket.
- Make player role nullable while preserving required cricket roles.
- Keep the current player/tournament/auction architecture intact.

### Findings

- `Tournament` had no sport field.
- `Player.role` was a required cricket-only enum with default `Batsman`.
- Tournament create/edit validation required cricket roles for every player.
- Player creation required a cricket role and had no sport validation.
- Admin tournament setup and player-add UI hard-coded cricket roles.
- Admin auction control filtered available players by cricket role before a
  round could start.
- Auction business logic was already tournament/player based and did not need a
  redesign.

### Changes

- Added `Sports` model, route, and `GET /api/sports`.
- Seeded active sports: cricket, tt, volleyball, badminton, chess, carrom, and
  other.
- Added `Tournaments.sportId` and `Players.sportId`.
- Backfilled existing tournament and player rows to `cricket`.
- Changed `Players.role` to nullable string.
- Added sport foreign keys and indexes for tournaments and players.
- Updated Zod validation so `sportId` is required and invalid sports are
  rejected.
- Preserved cricket role validation: cricket players require one of `Batsman`,
  `Bowler`, `All-rounder`, or `Wicketkeeper`.
- Allowed null/omitted role for non-cricket sports.
- Enforced player sport matching the tournament sport in tournament player
  payloads and standalone player creation.
- Updated admin tournament create/edit UI with sport selection.
- Updated player add UI to show role selection only for cricket.
- Updated admin auction control so non-cricket tournaments can start rounds
  without role filtering.
- Hid empty role display in live auction, team, and bid-history views.

Files:

- `ipl-auction-tracker-backend/migrations/202606080005-multi-sport-foundation.js`
- `ipl-auction-tracker-backend/src/models/sport.model.js`
- `ipl-auction-tracker-backend/src/models/tournment.model.js`
- `ipl-auction-tracker-backend/src/models/player.model.js`
- `ipl-auction-tracker-backend/src/models/index.js`
- `ipl-auction-tracker-backend/src/utils/sports.js`
- `ipl-auction-tracker-backend/src/controllers/sport.controller.js`
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker-backend/src/controllers/auction.controller.js`
- `ipl-auction-tracker-backend/src/routes/sportRoutes.js`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/src/validation/common.validation.js`
- `ipl-auction-tracker-backend/src/validation/tournament.validation.js`
- `ipl-auction-tracker-backend/src/validation/player.validation.js`
- `ipl-auction-tracker-backend/test/multi-sport-f006.test.js`
- `ipl-auction-tracker-backend/test/validation-phase4.test.js`
- `ipl-auction-tracker-backend/test/database-phase5.test.js`
- `ipl-auction-tracker-backend/test/tournament-edit-archive-f005.test.js`
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `ipl-auction-tracker/src/components/AdminDashboardLayout/AuctionLive.jsx`
- `ipl-auction-tracker/src/components/AdminDashboardLayout/TeamsOverview.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/LiveAuction.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/MyTeam.jsx`
- `ipl-auction-tracker/src/components/TeamOwnerDashboard/BidHistory.jsx`
- `API.md`
- `Database.md`
- `AdminGuide.md`
- `IMPLEMENTATION_LOG.md`

### F-006 Validation Notes

Automated tests were added for migration backfill declarations, sports catalog
values, cricket role requirements, no-role sports, invalid sport rejection,
tournament/player sport matching, UI wiring, and auction compatibility.

Test execution could not be completed in this environment because `npm` is not
available on PATH.

Run validation with:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate
npm test
cd ../ipl-auction-tracker
npm run build
```

## Remaining Multi-Sport Risks

- Tournament budgets remain tournament-wide, not sport-category-specific.
- Non-cricket sports currently support null roles only; configurable sport role
  catalogs were intentionally not added.
- Some non-team read APIs remain public and unpaginated.
- Production rollout still requires backups and migration preflight checks.

## F-004 Player CSV Import

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Admin-only CSV upload endpoint for player imports.
- Cricket, non-cricket, and mixed-format CSV parsing.
- Row-level validation with partial success.
- Downloadable cricket and mixed CSV templates.
- Admin tournament-management upload dialog with progress, summary, and errors.

### Findings

- `Players` require `name`, `basePrice`, `tournamentId`, and `sportId`.
- `Player.role` is nullable after F-006, but cricket rows still require one of
  `Batsman`, `Bowler`, `All-rounder`, or `Wicketkeeper`.
- `Tournaments` are one-sport events through `Tournaments.sportId`, so imported
  player rows must match the target tournament sport.
- Existing standalone player creation already rejects non-upcoming tournament
  edits and player/tournament sport mismatches.

### Changes

- Added `POST /api/players/import`, protected by `authMiddleware` and
  `adminMiddleware`.
- Added multipart CSV upload parsing with a 1 MB limit.
- Added CSV parsing/import helpers that collect row-level errors and build only
  valid player rows.
- Added duplicate player ID rejection for optional `id` CSV columns, including
  duplicates already present in `Players`.
- Added `GET /api/players/import/templates/:type` for cricket and mixed CSV
  templates.
- Added **Import Players** to upcoming tournament cards in admin tournament
  management.
- Added CSV file selection, upload progress, import summary, and row-level
  error display in the upload dialog.

Files:

- `ipl-auction-tracker-backend/src/middleware/multipartCsv.middleware.js`
- `ipl-auction-tracker-backend/src/utils/playerCsvImport.js`
- `ipl-auction-tracker-backend/src/controllers/player.controller.js`
- `ipl-auction-tracker-backend/src/routes/playerRoutes.js`
- `ipl-auction-tracker-backend/test/player-csv-import-f004.test.js`
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
- `API.md`
- `AdminGuide.md`
- `IMPLEMENTATION_LOG.md`

### F-004 Validation Notes

Automated tests were added for valid cricket import, valid chess import, valid
TT import, mixed-format import, invalid sport, missing cricket role, malformed
CSV, duplicate player IDs, import summary generation, and route/UI wiring.

Run validation with:

```powershell
cd ipl-auction-tracker-backend
npm test
cd ../ipl-auction-tracker
npm run build
```

### Remaining F-004 Risks

- The multipart parser is intentionally narrow for the CSV upload endpoint and
  is not a general file-upload framework.
- CSV imports are unpaginated and synchronous; very large admin imports would
  need background processing.
- Non-cricket sports still have no configurable role catalogs.

## F-007 Team API Security Hardening

Status: COMPLETE

Completed on: 2026-06-08

Scope:

- Enforce authentication on all team routes.
- Derive owner-scoped team lookups from the authenticated user.
- Restrict broad team reports to admins.
- Limit team owners to their own team data.
- Return only approved public team data to spectators.
- Validate team route path and query parameters.
- Add regression coverage for the team API authorization contract.

### Findings

- `teamRoutes.js` imported auth middleware but did not apply it to any route.
- Owner-scoped team endpoints accepted `ownerId` from path params and used it
  for lookup.
- Tournament team reads could expose owner IDs to spectators.
- Broad all-team reports were unauthenticated.
- Team controllers returned raw Sequelize team/user/player shapes in several
  paths.

### Security Changes

- Added `authMiddleware` to every route in `src/routes/teamRoutes.js`.
- Added `adminMiddleware` to `GET /api/teams/getAllteamsAndPlayers`.
- Added route validation schemas for `:id` and `tournamentId`.
- Kept legacy `:ownerId` path shape for frontend compatibility, but owner
  endpoints now derive the owner from `req.user.id`.
- `GET /api/teams?tournamentId=:id` now scopes responses by role:
  admins receive all teams, team owners receive only their own participating
  team, and spectators receive public team DTOs without owner IDs.
- `GET /api/teams` without `tournamentId` is treated as a broad report and is
  admin-only.
- Added sanitized team, public team, owner, and player report DTOs.
- Replaced raw exception messages in team controllers with generic failure
  messages.

Files:

- `ipl-auction-tracker-backend/src/routes/teamRoutes.js`
- `ipl-auction-tracker-backend/src/controllers/team.controller.js`
- `ipl-auction-tracker-backend/src/validation/team.validation.js`
- `ipl-auction-tracker-backend/src/utils/teamResponse.js`
- `ipl-auction-tracker-backend/test/team-security-f007.test.js`
- `API.md`
- `IMPLEMENTATION_LOG.md`

### Tests Added

- Team routes require authentication and route validation.
- Broad team reports require admin middleware.
- Owner-scoped controller logic derives owner identity from `req.user.id`, not
  `req.params.id`.
- Team route schemas reject empty owner and tournament IDs.
- Public team DTOs exclude owner identity and user objects.
- Admin team DTOs sanitize owner user fields.
- Team player report DTOs omit internal auction linkage.

### F-007 Validation Notes

Node.js and npm are not available on PATH in this environment, so automated
tests could not be run here.

Run validation locally with:

```powershell
cd ipl-auction-tracker-backend
npm test
```

## Sports Festival Phase 1 - Festival Foundation

Status: COMPLETE

Completed on: 2026-06-09

Scope:

- Add Festival.
- Add FestivalSport.
- Add FestivalParticipant.
- Add FestivalTeam.
- Add isolated `/api/v2/festivals` APIs.
- Preserve all legacy tournament and auction behavior.

### Changes

- Added an additive migration creating `Festivals`, `FestivalSports`,
  `FestivalParticipants`, and `FestivalTeams`.
- Seeded Throwball into the existing sports catalog.
- Added Sequelize models and associations for the four foundation entities.
- Added authenticated festival reads and admin-only configuration mutations.
- Added Zod validation for festival dates, registration windows, sports,
  participants, and franchise team branding.
- Added sanitized DTOs; participant responses use `toSafeUserResponse`.
- Added focused regression tests for validation, migration isolation, route
  authorization, DTO sanitization, and backward compatibility.

### Identity Decision

The repository does not yet contain the planned canonical `Employees` table.
For this phase, `FestivalParticipant` references `Users` and stores no copied
identity fields. A future additive employee migration can add and backfill an
employee reference without duplicating participants.

### Explicitly Not Implemented

- Festival lifecycle transitions.
- Employee sport selection.
- Ownership assignments.
- Retentions or budgets.
- Festival roster membership.
- Main or sport auction integration.
- Frontend festival screens.
- Changes to legacy Tournament, Team, Player, Auction, Bid, or Socket.IO flows.

### Validation Notes

Node.js and npm are not available on PATH in this environment, so automated
tests and live migration execution could not be run.

Manual commands:

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate -- status
npm run db:migrate
npm test
npm start
```

## Sports Festival Phase 2 - Employee Registration & Sports Selection

Status: COMPLETE

Completed on: 2026-06-09

Scope:

- Add festival participant sport registrations.
- Add single and bulk registration APIs.
- Add participant and sport registration reads.
- Add partial-success HR CSV import.
- Add admin festival management screens.
- Preserve legacy Tournament, Auction, Team, Player, and Bid behavior.

### Changes

- Added the additive `FestivalParticipantSports` migration, model, associations,
  uniqueness constraint, and response DTO.
- Added Zod validation for festival, participant, sport, bulk-array, and import
  route inputs.
- Enforced enabled-festival-sport membership, active participant status, and
  `draft`/`registration_open` write states.
- Added admin-only writes and sport-participant reads. Participants may read
  only their own sport registrations.
- Added exact-column CSV parsing with case-insensitive `Yes`/`No`, row-level
  errors, ambiguous-name detection, and partial success.
- Added Festival Dashboard and Festival Detail pages with sport management,
  participant management, sport checkboxes, import progress, and import
  summary.
- Added Phase 2 backend and frontend wiring tests.

### Excel Import Format

```csv
Name,Chess,Badminton,Carrom,TableTennis,Cricket,Volleyball,Throwball
John,Yes,No,No,No,Yes,Yes,No
Smith,Yes,Yes,No,No,No,Yes,No
```

The current endpoint accepts Excel-exported CSV, not native binary `.xlsx`.
Participant names must resolve uniquely among active festival participants.

### Validation Notes

Node.js and npm were unavailable on PATH in the implementation environment.
Automated tests, migration execution, frontend lint, and frontend build could
not be run here. Static contract tests were added for later execution.

```powershell
cd ipl-auction-tracker-backend
npm run db:migrate
npm test
cd ../ipl-auction-tracker
npm run lint
npm run build
```

### Explicitly Not Implemented

- Main Auction
- Owner Assignment
- Retentions or budgets
- Sport Auctions
- Competition Engine

## Sports Festival Phase 2 Redesign - Employee Identity

Status: COMPLETE

Completed on: 2026-06-09

- Added canonical Employees with optional User login linkage.
- Added additive participant identity migration and provisional legacy
  backfill.
- Replaced participant creation by User ID with Employee selection.
- Added admin Employee CRUD/search/link APIs and Employee Directory UI.
- Replaced name-only sports import with EmployeeNumber-driven Employee,
  participant, and sport upsert.
- Added per-row transactions, partial success, and idempotent Yes/No sport
  synchronization.
- Changed participant self-read authorization to
  User -> Employee -> FestivalParticipant.
- Preserved legacy Tournament, Team, Player, Auction, Bid, and festival team
  behavior.

## Sports Festival Phase 2.1 - HR Onboarding UX

Status: COMPLETE

Completed on: 2026-06-09

- Added Employee CSV template and partial-success bulk import.
- Added Employee Number based create/update behavior without login creation.
- Added duplicate Employee Number, required-field, email, and malformed-row
  validation.
- Changed Employee Directory search to automatic debounced server search.
- Added Employee import progress, summary, and row-level error display.
- Replaced single-participant search/dropdown/add with searchable Employee
  multi-select, chips, select-all-results, clear selection, and selected count.
- Added bulk participant add, add-all, duplicate ignoring, reactivation, and
  status-based bulk removal.
- No Festival Team Builder, owner, retention, or auction behavior was added.

## Sports Festival Phase 3 - Festival Team Builder

Status: COMPLETE

Completed on: 2026-06-09

- Added additive `FestivalTeamMemberships` persistence and festival assignment
  lifecycle (`draft`, `building`, `locked`).
- Added Festival Team create, summary read, update, and guarded delete APIs.
- Added single-membership manual assignment and participant move behavior.
- Added deterministic snake auto-balance using selected-sport count only.
- Added completeness validation and irreversible assignment lock.
- Added team composition DTOs with participant count and calculated strength.
- Added Festival Workspace Team Builder UI with team management, unassigned
  participants, manual moves, auto-balance, and lock controls.
- Added focused migration, validation, algorithm, authorization, lifecycle, and
  UI wiring tests.
- Kept legacy Tournament, Auction, Team, Player, and Bid workflows unchanged.
- Did not implement owners, budgets, retentions, auctions, captains, or
  internal sport teams.

## Sports Festival Phase 3A - Main Festival Auction Foundation

Status: COMPLETE

Completed on: 2026-06-09

- Added Festival Auction configuration, owner, retention, and pool tables.
- Added protected roster-source provenance.
- Added per-team budget and mandatory owner-cost configuration.
- Added assignment-based owners using Festival Participants.
- Added atomic owner membership and purse deduction.
- Added pre-auction retention creation/deletion with purse validation.
- Added automatic pool generation excluding rostered participants.
- Added candidate identity, department, selected sports, and sport count.
- Added per-team total, spent, and remaining purse summaries.
- Added Auction Setup UI and focused regression tests.
- Kept manual/auto-balance as an admin override.
- Did not implement bids, live auction, timers, sport auctions, captains, or
  internal sport teams.

## Sports Festival Phase 3B - Main Festival Live Auction

Status: COMPLETE

Completed on: 2026-06-10

- Added persisted `setup`, `live`, `paused`, and `completed` lifecycle state.
- Added festival-specific auction rounds, bids, and immutable results.
- Added admin start, pause, resume, end, participant start, sell, and unsold
  commands.
- Added assignment-derived owner bidding without client-supplied owner or team
  identity.
- Added transactional purse validation during bid acceptance and sale.
- Added atomic sold roster membership with `rosterSource=auction`.
- Added automatic exclusion of owners, retentions, and finalized participants.
- Added authenticated `festival-auction:<festivalId>` Socket.IO rooms.
- Added real-time lifecycle, bid, sold, and unsold events.
- Added admin, owner, and spectator Main Festival Auction UI.
- Added focused migration, lifecycle, authorization, budget, finalization,
  socket, and UI wiring tests.
- Kept legacy tournament auctions unchanged.
- Did not implement sport auctions, captains, or internal sport team builders.

## Sports Festival Phase 3C - Festival Roster Workflow Consolidation

Status: COMPLETE

Completed on: 2026-06-10

- Added additive, default-auction `Festivals.rosterFormationMode`.
- Added admin mode update API with Zod validation and transition guards.
- Restricted manual assignment, auto-balance, and locking to manual mode.
- Restricted auction config, owner assignment, retentions, auction start, and
  sale finalization to auction mode.
- Removed auction setup writes to manual-only `teamAssignmentStatus`.
- Standardized pool eligibility to exclude memberships, results, and rounds.
- Added mode-specific Festival Workspace visibility.
- Added migration recovery, validation, authorization, controller, pool, and
  frontend wiring tests.
- Kept legacy Tournament/Auction behavior unchanged.
- Did not implement Sport Teams, captains, retentions, or Sport Auctions.

## Sports Festival Phase 3D - Festival Auction Stabilization

Status: COMPLETE

Completed on: 2026-06-10

- Added transactional, case-insensitive registration-time Employee linking.
- Prevented overwrite of existing Employee/User identity links.
- Added auditable link outcomes and duplicate-email manual review behavior.
- Added persisted Owner statuses: pending registration, active, and inactive.
- Activated existing owner assignments automatically after valid account link.
- Added shared readiness validation with exact per-Team blockers.
- Blocked auction start until every Team has an active linked Owner and the
  aggregate auction prerequisites are ready.
- Restricted bidding to active assignment-derived `team_owner` accounts.
- Preserved admin-only lifecycle and finalization routes.
- Added admin Festival Readiness metrics and blocker UI.
- Added Phase 3D migration and focused regression tests.
- Did not add Sport Teams, Sport Auctions, scheduling, competition, standings,
  or results.

Validation note: Node.js and npm were not available on `PATH` in this
environment, so migrations, tests, lint, and builds were not executed.

## Phase 3H - Application UX, Stability And Workflow Hardening

Status: COMPLETE

Completed on: 2026-06-12

- Audited Admin, Team Owner, Spectator, Festival, and legacy Tournament auction
  workflows without starting Phase 4.
- Added synchronous duplicate-submit guards and action-specific progress states
  to high-volume Festival admin mutations and dialogs.
- Added searchable owner, retention, Team Builder, and participant controls.
- Added loading and filtered-empty states to major Festival setup/history views.
- Added socket-driven refresh for Owner and Spectator overview, Team, bid
  history, and result views.
- Added client-side required-field and date-range validation to Festival forms.
- Serialized legacy Tournament round start in a database transaction.
- Blocked legacy Unsold finalization after a valid bid and aligned admin button
  state with the server rule.
- Expanded stabilization regression-contract tests and the completion report.
- Did not implement Sport Teams, Sport Auctions, Competition Engine, or any
  Phase 4 functionality.

Validation note: Node.js and npm were not available on `PATH` in this
environment, so tests, lint, and builds could not be executed.

## Phase 4C - Sport Auction Engine

Status: COMPLETE

Completed on: 2026-06-14

- Added tournament-scoped Sport Auction configuration, rounds, bids, results,
  re-auction metadata, and operation audits.
- Reused Festival percentage progression, persisted deadlines, pending
  finalization, startup timer restoration, transactional locking, and history
  patterns.
- Derived captain bidding authority from active Employee and
  `SportTeamCaptain` assignments.
- Kept owner auction management separate from captain bidding authority.
- Added derived Team spent and remaining credits from sold results.
- Added owner lifecycle controls, one-click captain bidding, re-auction, live
  socket refresh, history, and the dedicated Sport Auction Arena.
- Added focused Phase 4C tests and implementation report.
- Did not implement fixtures, matches, standings, points tables, semi-finals,
  finals, or competition engine behavior.

Validation:

- Focused Phase 4A/4C backend tests: 15 passed.
- Frontend lint: passed.
- Frontend production build: passed with the existing large-chunk warning.
- Full backend suite: 209 passed and 15 legacy static-contract tests failed;
  the Phase 4C tests passed.

## Phase 4D - Sport Auction Stabilization And UX Hardening

Status: COMPLETE

Completed on: 2026-06-14

- Standardized Tournament, configuration, and round lock ordering across timer
  expiry, bids, and finalization.
- Serialized setup mutations against Auction launch.
- Added live participant and Captain eligibility revalidation.
- Added strict Pool transition and re-auction conflict checks.
- Added reconnect-aware Socket.IO room membership and server-clock alignment.
- Coalesced realtime refreshes and added immediate accepted-bid feedback.
- Added irreversible-action confirmations, actionable errors, setup lock
  states, mobile Arena hierarchy, Team allocations, and separated histories.
- Added spectator Sport Auction discovery and navigation.
- Added focused Phase 4D regression tests.
- Did not implement Competition Engine, fixtures, matches, points tables,
  standings, semi-finals, or finals.

Validation:

- Focused Phase 4A/4C/4D backend tests: 23 passed.
- Frontend lint: passed.
- Frontend production build: passed with the existing large-chunk warning.
- Full backend suite: 217 passed and 15 legacy static-contract tests failed;
  the focused Phase 4D tests passed.
- `git diff --check`: passed with line-ending conversion warnings only.
