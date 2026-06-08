# IMPROVEMENT_ROADMAP.md

Generated: 2026-06-05

This roadmap is based on the repository documentation and a second source pass through the frontend and backend code. It is ordered by practical delivery sequence: first remove production blockers, then improve reliability and scale, then round out product capabilities and maintainability.

Effort estimates assume one experienced full-stack engineer unless noted.

## Executive Summary

AuctionArena is a functional pre-production MVP. The core auction flow works, but the system is not production-ready because identity, authorization, timer durability, migrations, testing, and operations are incomplete. The highest-value path is to harden security and auction correctness first, then make the backend horizontally scalable, then reduce query and UI fan-out, then add missing admin/product features.

## Phase 1 Security Status

Status: COMPLETE

Completed items:

- SEC-001 Remove Admin Self Registration
- SEC-002 Protect Tournament APIs
- SEC-003 Protect Player APIs
- SEC-004 Remove Sensitive User Data Exposure

Implementation notes are tracked in `IMPLEMENTATION_LOG.md`.

## Phase 2 Authentication Status

Status: COMPLETE

Completed items:

- SEC-005 JWT Expiration
- AUTH-001 Password Reset Workflow

Implementation notes are tracked in `IMPLEMENTATION_LOG.md`.

## Phase 3 Socket Security Status

Status: COMPLETE

Completed items:

- SEC-006 Authenticate Socket.IO Connections
- SEC-007 Derive Team Ownership Server Side

Implementation notes are tracked in `IMPLEMENTATION_LOG.md`.

## Phase 4 Validation Status

Status: COMPLETE

Completed items:

- Centralized Zod validation middleware
- Auth, tournament, player, auction, and socket bid schemas
- Standard validation error response envelope

Implementation notes are tracked in `IMPLEMENTATION_LOG.md`.

## Critical Path

1. Lock down sensitive read APIs and sanitize response DTOs.
2. Persist auction deadlines and remove process-local timer assumptions.
3. Introduce migrations, rate limits, safe sessions, and CORS allowlists.
4. Add integration tests around auth, auctions, bidding, purse enforcement, and finalization.
5. Add observability, backups, and deployment automation.

## Roadmap

| Area | Improvement | Priority | Business impact | Technical complexity | Dependencies | Estimated effort |
|---|---|---:|---|---|---|---|
| Security | SEC-006/SEC-007 complete: Socket.IO handshakes now require JWTs, sockets are bound to server-loaded users, bid placement is restricted to team owners, and bid `ownerId`/`teamId` are server-derived. Remaining work is tournament room membership authorization and socket rate limiting. | Critical | Prevents fraudulent bidding and protects auction integrity; required before real-money or high-trust use. | Medium | Read authorization policy, tournament membership model, rate-limit store. | 2-4 days |
| Security | Protect sensitive read APIs for teams, players, current auction, bid history, and tournaments with auth plus role/ownership/tournament membership checks. | Critical | Prevents data leakage across teams and tournaments; makes frontend filtering non-security-critical. | High | Access-control policy, response DTOs, integration tests. | 5-8 days |
| Security | Replace permissive HTTP and Socket.IO CORS `origin: true` with environment-specific allowlists. | Critical | Reduces cross-origin abuse and credential exposure risk. | Low | Deployment origin inventory, env configuration. | 0.5-1 day |
| Security | SEC-005 complete: access JWTs now expire after one hour. Remaining work is safer session handling, preferably refresh rotation in HttpOnly/SameSite cookies with server-side revocation. | Critical | Further reduces token theft impact and supports revocation/logout policy beyond access-token expiry. | High | Auth flow redesign, frontend API changes, CSRF strategy if cookies are used. | 4-8 days |
| Architecture | Persist auction `endsAt` in the database and restore timers from stored deadlines instead of issuing fresh 20-second windows after restart. | Critical | Prevents incorrect auction outcomes after backend restart and supports operational reliability. | Medium | Migration framework, auction model change, timer restore tests. | 3-5 days |
| Architecture | Replace `sequelize.sync()` and startup backfills with versioned migrations. | Critical | Makes schema changes auditable and deployment-safe; reduces startup risk. | Medium | Migration tool selection, baseline migration, deployment process. | 4-7 days |
| Security | Phase 4 complete: Zod validation now covers auth, tournament, player, auction mutation, and socket bid payloads with a standard validation error envelope. Remaining work is extending validation to currently public read query/params and future endpoints. | Critical | Reduces malformed input, bad states, and security bypasses. | Low-Medium | Read authorization/API contract work. | 1-2 days |
| Security | Add rate limiting for login, registration, resend verification, health abuse, and socket bid events. | Critical | Reduces brute-force login, spam, and bid flood risk. | Medium | Redis or shared rate-limit store for multi-instance support. | 2-4 days |
| Correctness | Wrap auction start in a transaction covering player state, auction row creation, tournament status update, and initial timer state. | High | Prevents partial live auctions and inconsistent player state. | Medium | Persisted timer design, transaction test coverage. | 2-3 days |
| Correctness | Generate security-sensitive IDs server-side for bids, auctions, players, tournaments, and users where feasible. | High | Prevents collisions and reduces client control over persisted identity. | Medium | API contract changes, frontend payload updates, migration/backward compatibility. | 3-5 days |
| Security | Remove raw/nested Sequelize user serialization from team APIs and return explicit DTOs. | High | Prevents accidental exposure of password hashes and verification metadata. | Medium | DTO helpers, auth-protected read APIs. | 2-4 days |
| Security | Add Helmet, CSP, secure headers, and sanitization for user-controlled email HTML. | High | Reduces XSS blast radius and improves baseline web hardening. | Medium | CSP asset/source inventory, email escaping helper. | 2-4 days |
| Security | AUTH-001 complete: forgot/reset password now exists. Remaining work is stronger password policy, authenticated password change, account lockout, and suspicious-login controls. | High | Improves account security beyond reset support and reduces brute-force/support risk. | Medium | Rate limiting, account policy, auth event logging. | 3-6 days |
| Architecture | Move socket bid handling out of `src/index.js` into a dedicated socket/controller/service module. | High | Improves testability and reduces startup file complexity. | Medium | Socket auth design, integration tests. | 2-4 days |
| Architecture | Introduce an auction service layer for start, bid, timer, finalization, and tournament-completion logic. | High | Makes high-risk business rules testable and easier to reason about. | Medium | Existing controller refactor plan, tests to prevent regressions. | 4-7 days |
| Scalability | Add Redis-backed Socket.IO adapter and shared timer/rate-limit coordination before running multiple backend instances. | High | Enables horizontal scaling and safer failover. | High | Persisted timers, Redis infrastructure, deployment changes. | 5-10 days |
| Scalability | Add database indexes for common player, bid, auction, tournament-team, and owner queries. | High | Improves query latency as tournaments, players, and bids grow. | Low-Medium | Migration framework, query plan validation. | 1-2 days |
| Performance | Replace N+1 bid-history query in `getPlayersWithBidsByTournamentId` with a joined or batched query. | High | Improves completed-auction and reporting performance for large player pools. | Medium | Sequelize include/batching design, response shape compatibility. | 2-3 days |
| Performance | Replace N+1 all-teams-with-players query with eager loading or batch retrieval. | High | Improves team overview performance as team count grows. | Medium | Team/player association review, response DTOs. | 2-3 days |
| Performance | Add backend tournament summary endpoints so dashboards do not fetch players and teams for each tournament client-side. | High | Reduces frontend load time and API request volume. | Medium | API design, frontend dashboard refactor. | 3-5 days |
| Scalability | Add pagination, filtering, and search to tournaments, players, teams, and bid history endpoints. | High | Keeps dashboards usable with many tournaments and players. | Medium | API contract changes, frontend table/card updates. | 4-7 days |
| Operations | Add structured logging, request IDs, socket event logging, and safe error correlation IDs. | High | Enables incident debugging and production support. | Medium | Logger choice, middleware, deployment log sink. | 2-4 days |
| Operations | Add dependency-aware health/readiness endpoints for MySQL, Socket.IO readiness, and email configuration. | High | Prevents false-positive health checks and improves deployment safety. | Low-Medium | Health check policy, database ping helper. | 1-2 days |
| Operations | Add CI/CD with backend tests, frontend lint/build, dependency scanning, and migration execution gates. | High | Reduces regression risk and standardizes deployments. | Medium | Chosen CI provider, migration framework, env/secrets setup. | 3-6 days |
| Operations | Add database backup, restore, retention, and rollback runbooks. | High | Protects tournament data and supports disaster recovery. | Medium | Hosting/database provider, restore test environment. | 2-5 days |
| Testing | Add backend integration tests for auth, protected admin routes, tournament creation, auction lifecycle, bid validation, purse enforcement, and authorization failures. | High | Converts current security/correctness assumptions into enforceable guarantees. | High | Test database strategy, service extraction helpful but not mandatory. | 7-12 days |
| Testing | Add frontend tests for route guards, dashboard filtering, live auction states, bid button enablement, and API/socket event handling. | Medium | Reduces UI regressions during hardening and refactors. | Medium | Test framework setup, mocked API/socket layer. | 5-8 days |
| Correctness | Add allowed enum values and transition validation for tournament status, auction status, player role, and player state. | High | Prevents invalid states that can break auction flow and reporting. | Medium | Validation layer, migration/model constraints. | 2-4 days |
| Correctness | Normalize monetary fields to integer minor units and remove float use for player prices. | High | Prevents rounding inconsistencies in bids, purses, and sale prices. | Medium | Migration, API compatibility, display formatting audit. | 3-6 days |
| Correctness | Clarify and enforce source of truth between `Player.auctionId` and `Auction.currentPlayerId`. | Medium | Reduces state drift and simplifies available-player queries. | Medium | Data cleanup migration, auction lifecycle tests. | 2-4 days |
| Correctness | Add foreign-key associations for `Tournament.createdBy` and other logical relationships not currently modeled. | Medium | Improves referential integrity and admin auditability. | Medium | Migration framework, existing data cleanup. | 2-4 days |
| Missing functionality | Add admin user management: invite/provision admins, disable accounts, reset credentials, and role changes. | High | Required for operating beyond a single manually provisioned admin. | Medium-High | Auth/session hardening, audit logs. | 5-9 days |
| Missing functionality | Add team management after registration: edit team, reassign owner, disable/delete team, and resolve duplicate/renamed team flows. | Medium | Supports real tournament administration and corrections. | Medium | Authorization model, audit logs, historical bid snapshot policy. | 4-7 days |
| Missing functionality | Add tournament edit/archive/delete controls with safe restrictions after players or bids exist. | Medium | Supports operational cleanup and mistake correction. | Medium | State transition rules, audit logs, archival policy. | 4-7 days |
| Missing functionality | Add player edit/delete/import/export workflows before auction participation. | Medium | Reduces admin data-entry burden and supports real player pools. | Medium | Validation, CSV/import format, state restrictions. | 4-8 days |
| Missing functionality | Add configurable auction duration and bid increment rules per tournament. | Medium | Makes the product flexible for different auction formats. | Medium | Persisted timer design, bid-rule configuration model. | 3-6 days |
| Missing functionality | Add explicit pass/fold controls only if product requirements still call for them. | Low-Medium | Improves bidder workflow clarity but is not required for current next-bid flow. | Medium | Socket auth, bid event model, UI updates. | 3-5 days |
| Missing functionality | Add free-form bid input after server validation and anti-abuse controls are complete. | Low-Medium | Enables more flexible bidding but increases invalid-bid and UX complexity. | Medium | Socket auth, validation, rate limits, UX safeguards. | 3-5 days |
| Missing functionality | Add audit logs for admin actions, bids, auth events, finalization, and security-sensitive changes. | High | Essential for dispute resolution and operational trust. | Medium-High | Auth identity hardening, audit table/schema, logging policy. | 5-8 days |
| Missing functionality | Add exports for squads, bid history, and tournament results. | Medium | Supports post-auction reporting and offline sharing. | Low-Medium | Report endpoints, authorization, DTOs. | 2-4 days |
| Technical debt | Rename `tournment` files/routes internals, `ViewerDashBoard`, and `getTeamByid` while preserving external compatibility or providing migration aliases. | Low-Medium | Improves maintainability and developer onboarding. | Medium | Compatibility plan, route aliases, docs update. | 2-4 days |
| Technical debt | Replace generic `ipl-auction-tracker/README.md` with an app-specific frontend README. | Low | Reduces onboarding confusion. | Low | Current project docs. | 0.5-1 day |
| Technical debt | Remove or implement unused bid REST route/controller skeleton. | Low | Reduces dead code and ambiguity. | Low | Decision on REST bid API need. | 0.5 day |
| Technical debt | Centralize repeated frontend currency formatting, tournament enrichment, and live auction event handling. | Medium | Reduces duplicated logic and future bug surface. | Medium | API summary endpoints, frontend tests helpful. | 3-6 days |
| Technical debt | Add `.env.example` files and startup validation for all required backend/frontend env vars, including `JWT_SECRET`. | High | Prevents misconfigured deployments and auth failures. | Low | Env inventory. | 1 day |
| Technical debt | Add global Express error middleware and consistent API error envelope. | Medium | Improves API reliability and frontend handling. | Medium | Controller cleanup, tests. | 2-4 days |
| Technical debt | Decide whether email verification is mandatory and align registration/login behavior with that policy. | Medium | Avoids confusing account states and support issues. | Low-Medium | Product policy, auth tests. | 1-2 days |
| Operations | Verify MySQL TLS certificates in production instead of disabling certificate validation. | High | Prevents man-in-the-middle risk for database traffic. | Low-Medium | Database CA bundle, hosting provider docs. | 1-2 days |
| Operations | Add graceful shutdown for HTTP server, Socket.IO, timers, and Sequelize connections. | Medium | Reduces data corruption and dropped live-auction events during deploys. | Medium | Persisted timers, process manager/deployment setup. | 2-4 days |

## Suggested Delivery Phases

### Phase 1 - Security and Correctness Foundation

Target outcome: no obvious identity spoofing, data leakage, or invalid auction state.

Recommended scope:

- Socket authentication and server-derived bidder identity.
- Protected read APIs and DTOs.
- CORS allowlists.
- Request/socket validation.
- Transactional auction start.
- Status transition validation.
- Backend integration tests for auth and auction lifecycle.

Estimated duration: 3-5 weeks.

### Phase 2 - Durable Auction Runtime

Target outcome: auctions survive restarts and can be operated safely.

Recommended scope:

- Migration framework and baseline migrations.
- Persisted `endsAt`.
- Server-side ID generation.
- Structured logging and health/readiness checks.
- Graceful shutdown.
- Backup/restore runbooks.

Estimated duration: 2-4 weeks.

### Phase 3 - Scale and Performance

Target outcome: dashboards and reports remain responsive as data grows.

Recommended scope:

- Indexes.
- N+1 query removal.
- Tournament summary endpoints.
- Pagination/search.
- Redis-backed Socket.IO adapter and shared rate limits if multi-instance deployment is required.

Estimated duration: 2-4 weeks.

### Phase 4 - Product Completeness

Target outcome: admins can operate real tournaments without direct database/manual intervention.

Recommended scope:

- Admin user management.
- Team management.
- Tournament archive/edit controls.
- Player import/export.
- Audit logs.
- Report exports.
- Configurable auction duration/increments.

Estimated duration: 4-8 weeks.

### Phase 5 - Maintainability

Target outcome: lower ongoing development cost and clearer onboarding.

Recommended scope:

- Naming cleanup.
- Dead-code removal.
- Frontend shared hooks/utilities.
- Global error envelope.
- App-specific README and env examples.
- Frontend tests.

Estimated duration: 2-4 weeks.

## Notes

- The roadmap intentionally prioritizes security and auction integrity over feature expansion. Features like free-form bids, pass/fold, and richer reporting should wait until socket auth, validation, rate limits, and audit trails are in place.
- Multi-instance deployment should wait until persisted auction deadlines and shared Socket.IO/rate-limit infrastructure exist.
- Any production deployment should include migration execution, backup verification, and a rollback path before hosting real tournaments.
