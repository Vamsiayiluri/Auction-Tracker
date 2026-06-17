# Corporate Sports Festival Implementation Roadmap

## 1. Recommended Strategy

Use incremental replacement inside the current modular monolith. Establish
canonical identity, festival scope, and assignment-based authorization before
adding second-level auctions. Avoid extending legacy
`Players`, `Teams.ownerId`, and one-sport `Tournaments` into the new domain;
that would deepen the migration cost.

Use financial bidding only for the Main Festival Auction. Implement Sport
Auctions as allocation-credit auctions because employees are already owned by a
festival team and no second financial transfer occurs.

## 2. Current Reusable Components

- JWT authentication and safe user DTOs.
- Authenticated Socket.IO connections and server-derived user identity.
- Zod request/socket validation.
- Versioned Sequelize migration workflow.
- Persisted auction deadlines and restart recovery.
- Transactional bid validation and purse updates.
- Live auction frontend components and Socket.IO singleton.
- Sports catalog.
- Material UI application shell and role-oriented dashboards, after replacing
  role assumptions with capability/assignment-based navigation.

## 3. Required Refactors

- Introduce `Employee` as the canonical participant.
- Separate platform roles from festival/team assignments.
- Replace global teams with festival-scoped teams.
- Introduce festivals containing multiple sports.
- Replace player sale flags with explicit roster membership/allocation records.
- Generalize auction event, lot, bidder, bid, retention, and budget models.
- Separate main financial purse accounting from sport allocation credits.
- Couple owner assignment activation to mandatory main retention.
- Introduce sport roster and internal sport team layers.
- Add domain services for transactional cross-table operations.
- Add audit logs, pagination, summary endpoints, and production observability.

## 4. Phased Plan

## Phase 0: Discovery and Migration Design

**Complexity:** Medium

Objectives:

- Profile current production-like data.
- Define employee matching and deduplication rules.
- Confirm configurable rules: number of owners, mandatory owner-retention
  amount, sport credit limits, roster limits, captain requirements, transfers,
  and result approval.
- Establish target IDs, mapping tables, API versioning, and deprecation policy.

Dependencies:

- Access to representative database snapshots.
- HR employee identifier policy.

Database impact:

- None beyond optional read-only profiling scripts/specifications.

API impact:

- Finalize `/api/v2` conventions and DTO standards.

UI impact:

- Navigation and workflow prototypes only.

Exit criteria:

- Signed-off domain glossary, data mapping, invariants, and migration runbook.

## Phase 1: Employee and Assignment Foundation

**Complexity:** Large

Objectives:

- Add canonical Employees.
- Link users to employees.
- Add festival-scoped role assignments.
- Add team ownership assignments.
- Stop treating `team_owner` as sufficient authorization.
- Support pending assignments; active ownership will require mandatory
  retention after main purse and festival membership tables exist.

Dependencies:

- Phase 0 employee matching policy.

Database impact:

- New Employees, FestivalRoleAssignments, and TeamOwnershipAssignments.
- Compatibility mapping from existing users/owners.

API impact:

- Employee directory and `/me/employee`.
- Assignment reads and admin assignment mutations.
- Authorization policy layer.

UI impact:

- Employee profile.
- Admin owner assignment screen.
- "My assignments" selector.
- Existing owner UI temporarily uses assignment adapters.

Risks:

- Incorrect identity merges.
- Temporary mismatch between legacy role and assignment permissions.

## Phase 2: Festival Core and Registration

**Complexity:** Large

Objectives:

- Add Festivals, FestivalSports, and FestivalTeams.
- Add registration windows and yes/no sport registration.
- Add Throwball and normalize sport codes.
- Deliver admin festival setup and employee registration.
- Treat FestivalTeams as predefined franchise destinations only; no employee
  roster is manually populated.

Dependencies:

- Canonical Employees.

Database impact:

- New festival, enabled-sport, team, registration, and sport-registration
  tables.

API impact:

- Festival lifecycle, sport configuration, team management, and self-service
  registration endpoints.

UI impact:

- Festival creation wizard.
- Sport configuration.
- Employee registration form.
- Registration reporting.

Risks:

- Lifecycle transitions becoming too rigid.
- Registration changes after allocation starts; define lock/correction policy.

## Phase 3: Main Purse, Mandatory Owner Retention, and Festival Roster

**Complexity:** Large

Objectives:

- Add budget accounts and immutable transactions.
- Activate owner assignments only through mandatory owner retention.
- Add main retentions.
- Add festival team membership as allocation source of truth.
- Migrate current `TournamentTeams` purse and sold-player state.

Dependencies:

- Festival teams and employees.
- Data reconciliation plan.

Database impact:

- BudgetAccounts, BudgetTransactions, Retentions, Allocations, and
  FestivalTeamMemberships.

API impact:

- Main purse reads, atomic owner assignment/retention, general retention
  create/reverse, and festival roster reads.

UI impact:

- Main budget dashboard.
- Owner assignment and mandatory retention workflow.
- Retention workflow.
- Festival roster views.

Risks:

- Financial reconciliation.
- Existing owner reconciliation where no historical retention charge exists.
- Duplicate active roster memberships.
- Retention reversal and auction lock timing.

## Phase 4: Generic Main Auction Cutover

**Complexity:** Very Large

Objectives:

- Introduce generic AuctionEvents, AuctionLots, AuctionBidderAccounts, and
  generic bids.
- Set main auctions to `valueType=money`.
- Move the main festival auction to the new aggregate.
- Preserve timer-expiry/admin-finalization behavior.
- Reuse and adapt live auction UI.

Dependencies:

- Budget ledger, festival roster, assignments, eligibility.

Database impact:

- New auction tables and legacy mappings.
- Backfill or adapter for legacy auctions/bids.

API impact:

- `/api/v2/auction-events` REST and Socket.IO contract.
- Legacy v1 endpoints become read-only/deprecated after cutover.

UI impact:

- New main auction console.
- Assignment-derived bidder selection.
- Main auction history.

Risks:

- Concurrency, deadlines, finalization idempotency, and dual-write drift.
- This phase requires integration and load tests before production use.

## Phase 5: Sport Teams, Credits, Retentions, and Captains

**Complexity:** Large

Objectives:

- Add sport roster membership.
- Create internal sport teams.
- Add non-financial allocation credit accounts.
- Confirm sport retentions before auction setup lock.
- Assign captains and vice captains from retained team members.
- Require at least two internal sport teams for auction-enabled sports.
- Enforce festival-team ownership and sport-registration eligibility.
- Permit the same employee to join teams in different sports while preventing
  duplicate internal-team membership within one sport by default.

Dependencies:

- Festival roster and registration.

Database impact:

- SportRosterMemberships, SportTeams, SportTeamMemberships,
  AllocationCreditAccounts/Transactions, sport Retentions, and
  CaptainAssignments.

API impact:

- Sport roster/team, credit, retention, membership, captain, and readiness
  endpoints.

UI impact:

- Owner sport dashboard.
- Sport team builder.
- Allocation credit setup and retention lock.
- Captain assignment.

Risks:

- Confusing festival roster, sport roster, and sport team concepts.
- Incorrect same-sport uniqueness that accidentally blocks cross-sport
  participation.
- Captains assigned without retained membership.

## Phase 6: Sport Allocation Auctions

**Complexity:** Very Large

Objectives:

- Reuse generic auction mechanics at sport scope.
- Set sport auctions to `valueType=allocation_credit`.
- Use internal sport teams as bidders.
- Produce sport roster/team memberships.
- Create no financial transactions.

Dependencies:

- Generic auction engine.
- Sport teams, credits, locked retentions, captains, and eligibility.

Database impact:

- Primarily new scoped rows in generic auction tables; credit consumption uses
  allocation-credit ledgers, not budget tables.
- Additional constraints/indexes based on measured queries.

API impact:

- Sport auction creation, eligible pool, bidder configuration, and history.

UI impact:

- Sport auction setup and live console.
- Eligible/excluded employee explanations.
- Allocation credit tracking.

Risks:

- Incorrectly presenting credits as money or mixing financial and credit
  ledgers.
- Cross-scope credit or allocation leakage.
- Owner authorization must be derived for every socket bid.

## Phase 7: Legacy Retirement and Production Scale

**Complexity:** Large

Objectives:

- Remove v1 frontend use.
- Retire legacy player/team/tournament ownership state.
- Add durable jobs, distributed Socket.IO, observability, backups, and
  production migration gates.

Dependencies:

- All required workflows operating on v2.
- Reconciliation and deprecation period completed.

Database impact:

- Later destructive migration removes deprecated columns/tables only after
  backup and verification.

API impact:

- Remove v1 endpoints.
- Stabilize versioning and event contracts.

UI impact:

- Remove compatibility screens and legacy terminology.

Risks:

- Hidden integrations using v1.
- Historical report differences after source-of-truth cutover.

## 5. Safest Implementation Order

```text
Employee identity
  -> assignment authorization
  -> festival/sport/team configuration
  -> employee registration
  -> budgets/retentions/festival roster
  -> generic main auction
  -> sport teams/credits/retentions/captains
  -> sport allocation auctions
  -> legacy retirement and distributed operations
```

Sport auctions must not precede canonical employee identity, festival roster,
sport credits, locked retentions, captains, and eligibility.

## 6. Backward Compatibility Plan

- Introduce `/api/v2`; keep v1 routes unchanged initially.
- Use target-to-legacy DTO adapters for current frontend screens.
- Add telemetry and deprecation headers to v1.
- Keep legacy tables readable during reconciliation.
- Use a short controlled dual-write only where unavoidable.
- Prefer write cutover by aggregate: once v2 owns an aggregate, v1 becomes
  read-only for it.
- Maintain mapping tables and reconciliation reports.
- Do not remove `team_owner`, `Teams.ownerId`, `Players`, or legacy auction
  columns until all authorization and reports use target tables.

## 7. Testing and Quality Gates

Each phase should include:

- Unit tests for policy and eligibility rules.
- Migration preflight and reconciliation tests.
- Integration tests for authorization boundaries and transactions.
- Socket tests for assignment-derived bidding identity.
- Concurrency tests for bids, retentions, budget charges, and finalization.
- UI workflow tests before major dashboard replacement.
- API contract tests for v1 adapters and v2 DTOs.

Required end-to-end scenarios:

1. Owner remains a normal employee and can register/play.
2. Owner assignment cannot activate without mandatory main retention and one
   purse charge.
3. Main auction assigns one employee to one festival team.
4. Sport pool contains only host-team employees registered for that sport.
5. Sport retention consumes credits, not money.
6. Sport auction cannot start until retained captains and retentions are locked.
7. Sport retention/auction cannot allocate an outside employee.
8. One employee can join Demons Cricket Team A and Demons Volleyball Team B.
9. Captain must belong to the relevant sport team through retention.

## 8. Highest-Risk Areas

1. Employee deduplication from legacy player/user records.
2. Replacing global owner-role authorization without privilege gaps.
3. Financial consistency across owner/main retention, bidding, finalization,
   and reversal.
4. Generic auction cutover and real-time concurrency.
5. Keeping sport credits distinct from financial purse accounting.
6. Cross-sport scheduling conflicts for the same employee.
7. Legacy compatibility becoming permanent dual architecture.

## 9. Long-Term Scalability Assessment

The proposed schema and modular monolith are sufficient for a corporate
festival platform and substantially larger event volumes than the current MVP,
provided list APIs are paginated and transactional queries are indexed.

The first scaling limit remains real-time auction execution. Persisted
deadlines solve restart recovery but not multi-instance coordination. Before
horizontal scaling, add a shared Socket.IO adapter, durable deadline jobs,
distributed locks, and an outbox/event mechanism.

Reporting and notifications can later use asynchronous workers and read
projections without changing core employee or allocation identities.
Microservices are therefore optional future deployment boundaries, not a
prerequisite for this redesign.

## 10. Recommended First Implementation Phase

Begin with Phase 0 followed immediately by Phase 1: canonical Employee identity
and assignment-based authorization. Every later requirement depends on knowing
who the employee is and what festival/team scope they may operate. Building
sport auctions on the current global `team_owner` and duplicate-player model
would create avoidable rework and security risk.

Owner assignments may be modeled as pending in Phase 1, but must not become the
v2 authorization source until Phase 3 can atomically enforce mandatory owner
retention, purse charge, and festival membership.

## 11. Migration Impact Analysis

### Data Classification

- Existing tournament budgets, purse balances, sold prices, and bids are
  financial main-auction data.
- No legacy data should be reinterpreted as sport allocation credits.
- Existing sold players become festival roster memberships only.

### Owner Cutover

- Backfill `Teams.ownerId` to pending owner assignments.
- Reconcile each owner against a festival membership and a mandatory retention
  charge.
- Do not authorize through the new assignment until reconciliation succeeds.
- Keep legacy `team_owner` behavior only inside the temporary v1 adapter.

### Auction Cutover

- Legacy auction events and bids use `valueType=money`.
- The shared auction lifecycle must support value-type-specific validation and
  finalization before sport auctions are enabled.
- Sport credit ledgers, retained captains, and readiness rules are additive and
  have no legacy backfill.

### UI and Reporting

- Main auction screens continue to show currency/purse.
- Sport auction screens show credits and allocation status.
- Financial reports exclude sport credits.
- Employee views join memberships across sports without duplicating employee
  identity.

### Rollout Gate

Before enabling a festival in v2, reconciliation must prove:

1. Every active owner has one confirmed mandatory owner retention.
2. Every active owner is a member of the same festival team.
3. Main purse opening, charges, and available balance reconcile.
4. Every sold legacy player maps to at most one festival team.
5. No sport allocation record is represented as a monetary transaction.

## 12. Delivery Status

Festival Foundation slice completed on 2026-06-09:

- Festival
- FestivalSport
- FestivalParticipant
- FestivalTeam
- Additive migration and `/api/v2/festivals` backend APIs

The original foundation delivery was intentionally narrower than the roadmap's
full employee and registration phases and temporarily referenced Users. The
Phase 2 redesign below supersedes that temporary identity bridge. No ownership,
roster, retention, budget, auction, competition, scheduling, or scoring work is
included.

Phase 2 Employee Registration & Sports Selection completed on 2026-06-09:

- Added one-to-many participant sport selection with no skill attributes.
- Enforced festival sport eligibility, lifecycle gating, and duplicate
  rejection.
- Added single, bulk, sport-participant, and participant-self read APIs.
- Added partial-success HR CSV import and downloadable template.
- Added admin Festival Dashboard and Festival Detail workspace.
- Added focused backend contract and frontend wiring tests.

Phase 2 was redesigned to introduce canonical Employees, Employee-based
FestivalParticipants, Employee Number imports, and optional User login links.
Main Auction, owner assignment, retentions, and sport auctions remain pending and unchanged.

Remaining Phase 2 risks are provisional legacy Employee reconciliation,
synchronous CSV processing, and the temporary compatibility `userId` column on
FestivalParticipants.

## 13. Phase 2.1 Delivery

Phase 2.1 HR Onboarding UX completed on 2026-06-09.

Delivered:

- Employee CSV import and downloadable template.
- Employee Number based upsert with row-level partial success.
- Debounced Employee Directory and festival picker search.
- Searchable multi-select with chips and selected count.
- Bulk participant add, add-all, duplicate ignoring, reactivation, and
  status-based removal.

This phase is limited to HR onboarding and participant administration. Festival
Team Builder, Demons/Trojans workflows, owners, retentions, Main Auction, and
Sport Auctions remain out of scope.

## 14. Phase 3 Festival Team Builder Delivery

Phase 3 Festival Team Builder completed on 2026-06-09.

Delivered:

- Additive Festival Team membership schema and assignment lifecycle.
- Festival Team create, read, update, and guarded delete APIs.
- Manual participant assignment and move operations.
- Deterministic selected-sport-count snake balancing.
- Festival-wide assignment lock with completeness validation.
- Team composition, participant count, and calculated strength summaries.
- Festival Workspace Team Builder UI.

Owners, budgets, retentions, auctions, captains, and internal sport teams remain
deferred.

## 15. Phase 3A Main Festival Auction Foundation Delivery

Phase 3A completed on 2026-06-09.

Delivered:

- Festival-wide team budget and mandatory owner-cost configuration.
- Assignment-based Festival Team owners using existing participants.
- Atomic owner roster retention and purse deduction.
- Optional pre-auction retentions with purse validation and deletion.
- Automatically regenerated auction pool excluding rostered participants.
- Candidate identity, department, sports, and sport-count views.
- Per-team total, spent, and remaining purse summaries.
- Protected roster provenance for admin override compatibility.
- Admin Auction Setup UI.

Bidding, live auction state, timers, auction finalization, sport auctions,
captains, and internal sport teams remain deferred.

## 16. Phase 3B Main Festival Live Auction Delivery

Phase 3B completed on 2026-06-10.

Delivered:

- Persisted Main Festival Auction lifecycle.
- Administrator-controlled participant sequence.
- Assignment-derived Festival Team owner bidding.
- Transactional purse validation and immutable bid history.
- Atomic sold and unsold finalization.
- Auction-sourced primary Festival Team roster membership.
- Festival-specific authenticated Socket.IO rooms and broadcasts.
- Admin, owner, and spectator live-auction views.
- Additive migration and focused regression coverage.

Dependencies completed by Phase 3A: canonical Employees, Festival
Participants, Festival Teams, owners, budget configuration, retentions, and
eligible pool generation.

Remaining later phases:

- Sport Team Builder.
- Cricket, Volleyball, and Throwball internal teams.
- Captains and sport retentions.
- Sport allocation auctions.

Operational risk remains Medium to Large because bids depend on database
transactions and Socket.IO delivery. Before horizontal scaling, add a shared
Socket.IO adapter and distributed coordination. No process-local timer was
introduced in Phase 3B because participant advancement is administrator
controlled.

## 17. Phase 3C Festival Roster Workflow Consolidation Delivery

Phase 3C completed on 2026-06-10.

**Complexity:** Medium

Delivered:

- Additive Festival roster formation mode with auction default/backfill.
- Server-enforced auction/manual workflow separation.
- Manual-only assignment status and locking semantics.
- Auction-only owner, retention, setup, start, and sale semantics.
- Deterministic membership/result/round pool exclusions.
- Mode-specific Festival Workspace controls.
- Migration recovery and workflow regression coverage.

Dependencies completed: Festival Teams, participant registrations, owners,
retentions, Main Auction foundation, and Main Auction live flow.

Database impact: one indexed Festival enum column; no roster data rewrite.

API impact: one admin mode update endpoint plus validation guards on existing
Phase 3, 3A, and 3B commands.

UI impact: one mode selector and conditional manual/auction sections.

Remaining risks:

- Existing Festivals are intentionally backfilled to auction even if they
  contain historical manual override memberships.
- There is no unlock operation for a locked manual roster.
- Main Auction completion and unsold retry rules remain unchanged.
- Sport Team, captain, sport retention, and allocation-credit foundations are
  still required before Sport Auctions.

---

## Future Enhancements (Out of Scope)

Competition management, fixtures, standings, playoffs, and match operations
were evaluated but are intentionally excluded from the current product scope.
