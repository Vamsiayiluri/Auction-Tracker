# Corporate Sports Festival Platform Architecture

## 1. Purpose

This document defines the target architecture for evolving AuctionArena from an
auction-only application into a Corporate Sports Festival Management Platform.
The existing auction behavior remains valuable, but becomes one allocation
module within a larger festival, sports, competition, scheduling, and results
system.

The recommended approach is an incremental modular monolith. It preserves the
current React, Express, Socket.IO, Sequelize, and MySQL stack while introducing
clear domain boundaries and normalized identities. A microservice split is not
recommended until load, team ownership, and operational maturity justify it.

## Phase 3/3A Roster Formation Decision

The Main Festival Auction is the primary method for forming Festival Team
rosters. Before bidding, mandatory owner retention and optional admin
retentions may create protected roster memberships.

The Phase 3 manual assignment and auto-balance tools remain available only as
admin overrides. They cannot move, replace, or delete owner, retention, or
future auction memberships.

All roster sources use the same `FestivalTeamMembership` uniqueness invariant,
so one participant can belong to only one primary Festival Team.

## Phase 3C Implemented Roster Mode Boundary

Each Festival persists `rosterFormationMode = auction | manual`, defaulting to
`auction`.

```text
auction:
  owners -> retentions -> Main Festival Auction -> final roster

manual:
  manual assignment / auto-balance -> lock -> final roster
```

Backend policy rejects manual roster mutations in auction mode and auction
setup/roster mutations in manual mode. `teamAssignmentStatus` belongs only to
manual formation; `auctionStatus` belongs only to Main Auction activity.

The auction pool is deterministic: registered participants are eligible only
when they have no Festival Team membership, auction result, or auction round.

## 2. Architectural Principles

1. One employee identity is used throughout the platform.
2. Authentication roles and business assignments are separate concepts.
3. Festival ownership is assignment-based and scoped to a festival team.
4. Employee sport registration is eligibility, not a skill rating.
5. Festival team identities are configured before the main auction, but their
   employee rosters are formed only by mandatory retentions and the main
   festival auction.
6. Festival roster allocation and sport roster allocation are distinct levels.
7. The main auction uses financial purse accounts; sport auctions use
   non-financial allocation credits and roster constraints.
8. Team, auction, schedule, and result records are festival-scoped.
9. Sport behavior is configuration-driven where practical.
10. Competition formats are modeled independently from sports.
11. Historical records are immutable or snapshot-based where auditability
    matters.
12. Authorization is enforced server-side for HTTP and Socket.IO.
13. Schema evolution uses explicit migrations and compatibility views or
    adapters, never runtime synchronization.

## 3. Current System Assessment

### 3.1 What Can Remain

- React/Vite frontend and Material UI component system.
- Express route/controller structure, with domain services added for complex
  transactional workflows.
- Sequelize/MySQL persistence and the versioned migration runner.
- JWT authentication, safe user response DTOs, Zod validation, and authenticated
  Socket.IO handshake.
- Persisted auction deadlines and admin finalization after timer expiry.
- Server-side bid validation, transactional bid acceptance, bid history, and
  tournament-scoped purse concepts.
- `Sports` as the starting point for a configurable sport catalog.
- Existing live auction UI concepts such as timer, current participant, bidding,
  bid history, and finalization.

### 3.2 What Must Evolve

- `Users` must no longer imply participant type or team ownership.
- `team_owner` must be removed as a business role and replaced by scoped owner
  assignments.
- `Teams.ownerId` must be replaced by effective-dated ownership assignments.
- `Players` must stop representing duplicated tournament-specific people.
- `Tournaments` must split conceptually into festivals, allocation auctions, and
  sport competitions.
- `TournamentTeams` must evolve into festival-team participation and main purse
  accounts.
- `Players.teamId` must evolve into explicit festival roster membership.
- Auctions and bids must reference a generic auction event, lot, bidder account,
  and allocation result rather than infer scope from player and tournament.
- The one-sport-per-tournament assumption must be replaced by many sports per
  festival.

### 3.3 What Should Be Deprecated

- Public registration as `team_owner`.
- Global `Users.role = team_owner` authorization.
- Team creation during owner registration.
- `Teams.ownerId`.
- Legacy purse fields `Teams.totalAmount`, `Teams.amountSpent`, and
  `Teams.tournamentId`.
- Tournament-specific duplicate `Players` as the primary participant source.
- `Players.auctionId`, `Players.isSold`, and `Players.isInAuction` as permanent
  person state.
- `Auctions.currentPlayerId` as the sole auction/lot relationship.
- Client-facing APIs that expose global team or player records without festival
  scope.

### 3.4 What Should Be Generalized

- Tournament becomes `Festival` plus `Competition`.
- Player becomes `Employee` plus scoped registration/membership records.
- Tournament team becomes `FestivalTeam`.
- Purse becomes a financial `BudgetAccount`; sport auction capacity becomes a
  separate `AllocationCreditAccount`.
- Auction round becomes `AuctionLot`.
- Sold player becomes an `Allocation` or roster membership.
- Bidder identity becomes an authorized assignment to a bidder account.
- Sport rules become `Sport` metadata and `CompetitionFormat` configuration.

## 4. Bounded Contexts

### 4.1 Identity and Access

Responsibilities:

- Authentication credentials and sessions.
- Stable user identity.
- Platform roles such as `platform_admin`, `festival_admin`, and `employee`.
- Server-side policy evaluation.

This context must not encode festival team ownership as a global role.

### 4.2 Employee Directory

Responsibilities:

- One canonical employee record.
- Employee number, name, email, department, employment status, and linked user.
- Import and synchronization with an HR source.

An employee may exist without login access, and a user may be linked to at most
one employee for the initial implementation.

### 4.3 Festival Management

Responsibilities:

- Festival lifecycle.
- Enabled sports.
- Registration windows.
- Festival teams/franchises.
- Owner assignments.
- Festival-level configuration and visibility.

### 4.4 Registration and Eligibility

Responsibilities:

- Employee registration for a festival.
- Yes/no sport selections.
- Eligibility validation for sport auctions, sport teams, and competitions.

No skill, ranking, rating, or role field belongs in registration.

### 4.5 Roster Allocation

Responsibilities:

- Mandatory owner retentions and optional festival team retentions.
- Main festival auction.
- Festival roster membership.
- Festival team budgets and allocation history.

### 4.6 Sport Roster Management

Responsibilities:

- Non-financial sport allocation credits inside a festival team.
- Sport retentions and sport auctions.
- Sport roster membership.
- Captain assignments.
- Internal sport teams such as Demons Cricket Team A.

### 4.7 Competition Management

Responsibilities:

- Competition definition and format.
- Entries for employees, pairs, or teams.
- Stages, pools, rounds, brackets, and standings.
- Advancement rules such as top eight singles players forming doubles teams.

### 4.8 Scheduling and Results

Responsibilities:

- Venues and playable time slots.
- Fixtures/matches.
- Participants, officials, scores, results, and standings.
- Conflict detection for employees participating in multiple sports.

### 4.9 Auction Operations

Responsibilities:

- Auction event lifecycle.
- Lots, bidding, deadlines, bid increments, finalization, and history.
- Reusable support for main festival auctions and sport auctions.

Auction Operations owns bidding mechanics. Roster contexts own eligibility and
the allocation produced by finalization.

## 5. Core Domain Model

```text
User 0..1 -------- 1 Employee
  |
  +---- * FestivalRoleAssignment

Festival 1 ------- * FestivalSport * ------- 1 Sport
Festival 1 ------- * FestivalTeam
Festival 1 ------- * FestivalRegistration * - 1 Employee
FestivalRegistration 1 -- * EmployeeSportRegistration -- 1 FestivalSport

FestivalTeam 1 --- * TeamOwnershipAssignment * --- 1 Employee
FestivalTeam 1 --- * FestivalTeamMembership * ---- 1 Employee
TeamOwnershipAssignment 1 --- 1 mandatory OwnerRetention

Festival 1 ------- * AuctionEvent
AuctionEvent 1 --- * AuctionLot 1 --- * Bid
AuctionEvent 1 --- * AuctionBidderAccount
AuctionEvent 1 --- * Retention

FestivalTeamMembership 1 -- * SportRosterMembership -- 1 FestivalSport
FestivalTeam 1 --- * SportTeam * -------------------- 1 FestivalSport
SportTeam 1 ------- * SportTeamMembership * --------- 1 Employee
SportTeam 1 ------- * CaptainAssignment * ----------- 1 Employee
SportTeam 1 ------- 1 AllocationCreditAccount

FestivalSport 1 -- * Competition * ------------------ 1 CompetitionFormat
Competition 1 ---- * CompetitionEntry
Competition 1 ---- * CompetitionStage 1 ---- * Match
Match 1 ---------- * MatchParticipant
Match 1 ---------- * ScoreRecord
```

## 6. Tournament and Competition Hierarchy

The term `Tournament` is currently overloaded. The target hierarchy is:

```text
Festival
  FestivalSport
    Competition
      CompetitionStage
        Match
```

Definitions:

- `Festival`: the corporate event, for example "Corporate Sports Festival
  2027".
- `FestivalSport`: one enabled sport and its festival-specific configuration.
- `Competition`: a contest within a festival sport, such as Chess Individual,
  Badminton Singles Ranking, Badminton Doubles, or Cricket League.
- `CompetitionStage`: ranking, pool, round-robin, knockout, semifinal, final,
  or another configured stage.
- `Match`: one scheduled contest between entries.

Auctions are parallel allocation workflows:

```text
Festival
  Main Festival Auction
    financially allocates Employee -> FestivalTeam

Festival + FestivalTeam + FestivalSport
  Sport Auction
    uses allocation credits to place eligible Employee -> SportTeam
```

An auction is not a competition and should not reuse competition status fields.

## 7. Employee Sports Registration

Recommended workflow:

1. Admin opens festival registration.
2. Employee submits one festival registration.
3. Employee selects zero or more enabled sports using yes/no controls.
4. The server stores one row per selected sport.
5. Eligibility checks use the stored registration rows.

Absence of an `EmployeeSportRegistration` row means "No". No skill, rating,
rank, playing role, or experience attribute is required.

Eligibility for a sport auction requires:

```text
employee active
AND festival registration active
AND employee selected the sport
AND employee belongs to the auction's festival team
AND employee is not already allocated incompatibly in that sport auction
```

## 8. Festival Team and Ownership Model

`FestivalTeam` represents a predefined festival franchise such as Demons or
Trojans. Admin configures these destination franchises before the main auction;
admin does not manually populate their employee rosters. Except for mandatory
owner retention and other explicitly allowed pre-auction retentions, employees
enter a festival team only through main auction finalization.

Ownership is modeled by `TeamOwnershipAssignment`:

```text
Employee X
  assigned as OWNER
  to Demons
  for Festival 2027
  effective from date A until date B/null
```

Properties:

- Multiple owners can be supported without schema redesign.
- An owner is the same canonical employee and user identity used everywhere
  else.
- Activating an owner assignment requires a confirmed mandatory owner retention
  into that same festival team.
- The mandatory retention charges the festival team's main purse and creates
  the owner's `FestivalTeamMembership`.
- An owner can register for sports, join sport teams, captain a team, and play
  matches.
- Ownership does not create a separate user or employee.
- Revoking ownership ends the assignment; it does not alter roster membership.
- Owner permissions are derived from active assignments on every request and
  socket action.

Platform/festival administration remains role-based. Team operations remain
assignment-based.

## 9. Retention Model

Use one `Retention` model with explicit type:

- `OWNER_MAIN`: mandatory retention coupled to owner assignment.
- `MAIN`: optional employee retention into a festival team before the main
  auction.
- `SPORT`: Employee retained into a festival team's sport roster before a sport
  allocation auction.

Every retention contains:

- festival
- optional festival sport
- employee
- festival team
- optional sport team
- auction event
- budget account
- amount
- status
- retained by
- timestamps and reversal reason

Main retention validation:

- Employee is registered for the festival.
- Employee is not already on another festival team.
- Team budget has sufficient available balance.

Owner retention validation:

- The owner assignment is pending for the same employee and festival team.
- The configured owner retention amount is charged to the main purse.
- Retention confirmation, festival membership creation, and owner assignment
  activation occur atomically.
- Main auction readiness requires every active owner assignment to have its
  confirmed owner retention.

Sport retention validation:

- Employee already belongs to the same festival team.
- Employee selected the relevant sport.
- Employee is not already allocated incompatibly within that sport scope.
- The destination sport team has sufficient allocation credits and roster
  capacity.
- A retained captain is retained first, then receives captain assignment.

Confirming a financial retention and charging its purse, or confirming a sport
retention and consuming allocation credits, must occur in one transaction.
Confirmed retentions should be reversed through an explicit reversal operation,
not deleted.

## 10. Auction Hierarchy

### 10.1 Recommended Auction Economics

Use two auction modes under one lifecycle framework:

| Auction | Purpose | Value unit | Accounting effect |
|---|---|---|---|
| Main Festival Auction | Transfer an employee into a festival franchise | Money | Charges main purse |
| Sport Allocation Auction | Distribute an already-owned employee among internal sport teams | Allocation credits | No financial charge |

Sport auctions should not be financial auctions. The festival team already
acquired the employee financially in the main auction. Pricing the same employee
again would create double valuation, unclear accounting, and artificial
cross-sport cost comparisons. Allocation credits preserve competitive bidding,
scarcity, strategy, retentions, and audit history without pretending that
ownership transfers again.

Allocation credits are non-monetary, sport-auction-specific, non-transferable
between scopes, consumed by retentions and winning allocations, and constrained
by roster minimums/maximums.

### 10.2 Generic Auction Aggregate

```text
AuctionEvent
  scopeType: MAIN | SPORT
  valueType: MONEY | ALLOCATION_CREDIT
  festivalId
  festivalSportId: null for MAIN
  hostFestivalTeamId: null for MAIN
  status
  rules/configuration

AuctionBidderAccount
  auctionEventId
  festivalTeamId
  sportTeamId: required for SPORT
  budgetAccountId: MAIN only
  allocationCreditAccountId: SPORT only

AuctionLot
  auctionEventId
  employeeId
  sequence
  reserve/base amount
  status
  startedAt
  endsAt

Bid
  auctionLotId
  bidderAccountId
  bidValue
  valueType
  placedByUserId
  acceptedAt

Allocation
  auctionLotId
  employeeId
  destination festival team/sport roster/sport team
  acquisitionValue
  valueType
  allocationType: RETENTION | AUCTION
```

### 10.3 Main Festival Auction

- Pool: registered festival employees not already retained or allocated to a
  festival team.
- Bidders: festival teams.
- Budget: one main budget account per festival team.
- Result: `FestivalTeamMembership`.
- Festival teams are not manually rostered; membership comes from confirmed
  owner/main retentions or finalized main auction lots.

### 10.4 Sport Allocation Auction

- Pool: employees owned by the hosting festival team who selected the sport.
- Host scope: one festival team and one festival sport.
- Bidders: internal sport teams under the host festival team.
- Value: non-financial allocation credits held per sport team.
- Prerequisites: sport teams exist; credit limits and roster constraints are
  configured; sport retentions are locked; required captains are retained and
  assigned.
- Result: `SportRosterMembership` plus `SportTeamMembership`.

This resolves an important ambiguity: an internal auction needs actual bidder
destinations. For Cricket Team A, Team B, and Team C, those sport teams are the
bidders. An auction-enabled festival sport therefore requires at least two
internal sport teams under the host festival team. Before the auction, only
confirmed retained players and retained captains may be members.

### 10.5 Timer and Finalization

Preserve current behavior:

- A persisted `endsAt` is authoritative.
- Expiry locks bidding.
- Admin or authorized owner finalizes sold/unsold.
- Bid acceptance and deadline reset are transactional.
- Horizontal scaling later requires shared scheduling and Socket.IO pub/sub.

## 11. Sport Teams, Rosters, and Captains

Three related concepts must remain distinct:

- `FestivalTeamMembership`: Demons owns Employee A.
- `SportRosterMembership`: Employee A is selected for Demons Cricket.
- `SportTeamMembership`: Employee A plays for Demons Cricket Team B.

`SportTeam` is only required when a sport has internal teams or distinct
competition entries. It references the same employee; it never creates a new
participant.

Membership uniqueness is scoped by sport, not by festival. Employee A may be in
Demons Cricket Team A and Demons Volleyball Team B simultaneously. By default,
an employee may belong to only one active internal team within the same
festival sport unless that festival sport explicitly enables multi-team
membership.

Captaincy is an effective-dated assignment:

- For auction-built team sports, scope is a concrete sport team.
- Captain must have active membership in the same scope.
- Captain membership is established through a confirmed sport retention before
  the sport auction opens.
- A team may have one active primary captain and optional vice captains.
- Historical captain assignments are retained.

## 12. Budget Model

### 12.1 Main Financial Purse

Each festival team has one main purse for employee acquisition. It is charged
by mandatory owner retention, optional main retentions, successful main auction
finalizations, and audited adjustments/reversals. This is the only acquisition
value treated as money.

### 12.2 Sport Allocation Credits

Each internal sport team receives a credit account for one sport allocation
auction. Credits are a game/allocation mechanism, not money. They are consumed
by sport retentions and successful sport auction finalizations.

Financial purse and allocation credits require separate tables, DTO fields, and
reporting labels. They must never appear interchangeable.

## 13. Competition Format Model

Avoid hardcoding formats directly into sport records. Use reusable
`CompetitionFormat` definitions with structured configuration.

Recommended format capabilities:

- entrant type: `INDIVIDUAL`, `PAIR`, `TEAM`
- stage type: `RANKING`, `ROUND_ROBIN`, `KNOCKOUT`, `GROUPS`, `CUSTOM`
- scoring policy
- standings/tie-break policy
- advancement policy
- bracket seeding policy
- match participant count
- leg count or best-of configuration

Initial mappings:

| Sport | Competition | Format |
|---|---|---|
| Chess | Individual | Knockout |
| Badminton | Singles Ranking | Ranking |
| Badminton | Doubles | Round robin; top-eight singles qualification |
| Carrom | Singles Ranking | Ranking |
| Carrom | Doubles | Round robin; top-eight singles qualification |
| Table Tennis | Singles Ranking | Ranking |
| Table Tennis | Doubles | Round robin; top-eight singles qualification |
| Cricket | Team League | Round robin |
| Volleyball | Team League | Round robin |
| Throwball | Team League | Round robin |

Advancement from singles to doubles should be represented as a
`QualificationRule` and generated `CompetitionEntry` records. It should not be
embedded in badminton, carrom, or table-tennis controller branches.

## 14. Scheduling Model

Scheduling should be constraint-aware but initially admin-assisted.

Core objects:

- `Venue`
- `VenueSportCapability`
- `ScheduleWindow`
- `CompetitionStage`
- `Match`
- `MatchParticipant`
- optional `MatchOfficialAssignment`

Important constraints:

- Venue supports the sport.
- Start time is before end time.
- Venue has no overlapping active match.
- A competition entry has no overlapping active match.
- An employee represented by any entry has no overlapping active match.
- Match occurs within festival dates and permitted schedule windows.

The system should expose conflicts before save. Automatic optimization can be a
future service and does not require changing the persistence model.

## 15. Match and Scoring Model

`Match` stores generic lifecycle and schedule data:

- competition and stage
- round/pool label
- venue
- scheduled start/end
- actual start/end
- status
- winner entry
- result type
- notes

`MatchParticipant` links one competition entry to a match and stores seed,
side, or lane information.

Scoring uses two levels:

1. `ScoreRecord`: generic period/set/inning/game score values.
2. `MatchResultDetail`: format-specific structured JSON validated by a scoring
   policy version.

Examples:

- Chess: winner, draw, walkover, optional board result.
- Badminton/TT/Volleyball: set number and points per side.
- Cricket: innings, runs, wickets, overs, winner, margin.

Do not force every sport into a single wide score table. Keep searchable common
result fields relational and detailed scorecards policy-specific.

## 16. Authorization Model

### 16.1 Platform Roles

Recommended stable roles:

- `platform_admin`
- `employee`

Optional scoped festival administration:

- `FestivalRoleAssignment(role = FESTIVAL_ADMIN)`

`team_owner` should not be accepted at registration and should eventually be
removed from the user role enum.

### 16.2 Policy Inputs

Every protected decision should evaluate:

- authenticated user
- linked employee
- platform role
- festival role assignment
- team ownership assignment
- festival/team/sport resource scope
- resource lifecycle status

Examples:

- Assign owner: platform admin or festival admin.
- Activate owner: platform/festival admin through the mandatory
  owner-retention transaction.
- Submit employee registration: linked employee for self, or admin.
- Manage Demons retention: festival admin; owner may be granted proposal rights.
- Bid in main auction: active owner assignment for the bidder festival team.
- Run Demons Cricket auction: active owner assignment for Demons plus auction
  state permission.
- Assign captain: festival admin or active owner for the parent festival team.
- Submit result: festival admin or explicitly assigned official.

Socket rooms should be namespaced by resource, for example:

```text
festival:{festivalId}
auction:{auctionEventId}
competition:{competitionId}
match:{matchId}
```

Socket authorization must derive identity and assignments server-side.

## 17. UI Flows

### 17.1 Admin

```text
Festival Dashboard
  -> Create Festival
  -> Configure dates and registration window
  -> Enable Sports
  -> Configure Festival Franchises (no employee roster)
  -> Assign Owner and Confirm Mandatory Owner Retention
  -> Open Registration
  -> Review Registrations
  -> Configure Main Budgets
  -> Add Main Retentions
  -> Run Main Auction
  -> Review Festival Rosters
  -> Configure Sport Teams/Credit Accounts/Roster Limits
  -> Confirm Sport Retentions and Assign Captains
  -> Run Sport Allocation Auctions
  -> Build Competitions
  -> Generate or create fixtures
  -> Resolve schedule conflicts
  -> Publish schedule
  -> Record/approve results
  -> Complete and archive Festival
```

### 17.2 Owner

```text
My Assignments
  -> Select Festival Team
  -> View Main Budget and Roster
  -> Join Main Auction as authorized bidder
  -> View eligible employees by sport
  -> Configure permitted Sport Teams and allocation credits
  -> Propose/manage Sport Retentions
  -> Assign retained Captain/Vice Captain
  -> Run permitted Sport Allocation Auction
  -> View sport rosters, fixtures, and results
```

Owners continue to see normal employee navigation for registration, personal
teams, and matches.

### 17.3 Employee

```text
My Festivals
  -> Register
  -> Select Sports Yes/No
  -> Review registration
  -> View Festival Team allocation
  -> View Sport roster/team allocation
  -> View personal schedule
  -> View festival fixtures, standings, and results
```

## 18. Workflow Diagrams

### 18.1 Main Allocation

```text
Employee Directory
  -> Festival Registration
  -> Owner assigned? ----- yes ---> mandatory retention + purse charge
                                  -> FestivalTeamMembership
  -> Other Main Retention? yes ---> FestivalTeamMembership
  -> Main Auction Pool -- sold --> FestivalTeamMembership
                       \- unsold -> remains unallocated
```

### 18.2 Sport Allocation

```text
FestivalTeamMembership
  + EmployeeSportRegistration
  -> eligible employee
  -> Create internal Sport Teams + allocation credit accounts
  -> Sport Retention? ---- yes ---> consume credits + SportTeamMembership
  -> Assign retained captains
  -> Lock setup
  -> Sport Allocation Auction -- allocated --> consume credits + membership
                              \- unallocated -> remains only on festival roster
```

### 18.3 Competition

```text
Eligible roster memberships
  -> Competition Entries
  -> Stage generation
  -> Match scheduling
  -> Score submission
  -> Result approval
  -> Standings/advancement
  -> Next stage or completion
```

## 19. Scalability and Operational Direction

### Near Term

- Keep one deployable backend with domain modules and service boundaries.
- Add pagination, filtering, summary endpoints, and query-oriented indexes.
- Use database transactions and row locks for budget/allocation operations.
- Add idempotency keys to retention, finalization, and result mutations.
- Add audit events for ownership, budgets, allocations, and result changes.

### Medium Term

- Move auction deadline scheduling to a durable worker/queue.
- Add Redis for Socket.IO adapter, distributed locks, and short-lived caches.
- Use an outbox table for reliable domain event publication.
- Add object storage/background jobs for large HR imports and exports.
- Introduce read models for dashboards, standings, and personal schedules.

### Long Term

Potential independent services are Auction Operations, Scheduling, Notifications,
and Reporting. Extraction should follow measured load and ownership boundaries;
the normalized IDs and domain events proposed here allow that split later.

## 20. Migration Impact Analysis

- Existing tournaments map to legacy main auction events, not sport allocation
  auctions.
- Existing `TournamentTeams` balances migrate only to main financial purse
  accounts.
- No legacy sport-credit balances exist; allocation credit accounts start as
  new configuration.
- Existing `Teams.ownerId` becomes a pending ownership assignment. It must not
  become active until owner retention and festival membership are reconciled.
- Existing sold players become festival team memberships. They do not imply
  sport roster or internal sport team memberships.
- Legacy monetary bids map to `valueType=MONEY`; sport allocation-credit bids
  are new.
- Compatibility APIs must never serialize allocation credits as currency.
- Main auction readiness must reject missing mandatory owner retentions.

## 21. Key Decisions

1. Preserve a modular monolith and evolve incrementally.
2. Introduce a canonical `Employee`; do not duplicate participants per sport.
3. Replace global owner role semantics with scoped ownership assignments.
4. Separate festivals, auctions, and competitions.
5. Use one auction lifecycle framework with financial main-auction and
   non-financial sport-allocation modes.
6. Model festival roster, sport roster, and sport team membership separately.
7. Couple active ownership to mandatory charged owner retention.
8. Permit cross-sport team membership while constraining duplicates within the
   same sport.
9. Require retained captains before sport auction activation.
10. Model formats independently from sports and compose competitions from stages.
11. Use generic match metadata plus versioned sport-specific scoring details.
12. Treat persisted deadlines, server-side validation, and transactions as
   non-negotiable auction invariants.

## 22. Phase 1 Implementation Note

The first delivered Festival Foundation slice adds `Festival`,
`FestivalSport`, `FestivalParticipant`, and `FestivalTeam` without integrating
them with legacy tournaments or auctions.

`FestivalParticipant` was initially delivered with a temporary User link. The
Phase 2 redesign replaces that operational dependency with canonical Employee
identity while preserving participant IDs and festival scope.

Festival teams created in this phase are franchise definitions only. They have
no owner, purse, roster, retention, player, or auction relationship.

## 23. Phase 2 Implementation Note

Phase 2 Employee Registration & Sports Selection is complete.

The implementation adds `FestivalParticipantSport` as the festival-scoped
eligibility record:

```text
User 0..1
  -> Employee
       -> FestivalParticipant
            -> FestivalParticipantSport
                 -> Sport

Festival
  -> FestivalSport
       -> Sport
```

One participant may select many sports. The same Employee and participant
identity is reused; no player or sport-specific participant copy is created.
There is no skill, rating, rank, proficiency, or preferred-role field.

Registration invariants:

- A participant/sport pair is unique.
- The participant must be active in the requested festival.
- The sport must be enabled through `FestivalSport` for that festival.
- Writes are accepted only while the festival is `draft` or
  `registration_open`.
- Admins may write and read all registrations.
- A participant may read only their own registrations.
- Existing Tournament, Player, Team, Auction, and Bid flows remain isolated.

The admin UI provides an Employee Directory, festival workspace,
employee-to-participant selection, sport-selection checkboxes, CSV import, and
row-level import results.

The HR import is an EmployeeNumber-driven Excel-compatible CSV workflow. Each
valid row transactionally creates or updates Employee, FestivalParticipant, and
FestivalParticipantSport records. `Yes`/`No` is case-insensitive and `No`
removes a prior selection, making re-import idempotent. Native binary `.xlsx`
parsing remains deferred.

## Phase 3B Main Festival Live Auction

The Main Festival Auction is the primary Festival Team roster formation path.
The existing manual and auto-balance builder remains an administrator override.

```text
FestivalAuctionConfig
  -> FestivalAuction (one participant round)
       -> FestivalAuctionBid*
       -> FestivalAuctionResult
            -> FestivalTeamMembership(rosterSource=auction)
```

Lifecycle:

```text
setup -> live <-> paused -> completed
```

The administrator explicitly selects each next participant. Owners bid through
authenticated HTTP commands while Socket.IO broadcasts state changes to the
festival room. Bidder identity is derived from User -> Employee ->
FestivalParticipant -> FestivalTeamOwner. Frontend role checks are display
controls only.

Every accepted bid and finalization revalidates the current persisted auction
state. Sale finalization locks the auction aggregate, checks the winning purse,
creates one roster membership, records one result, and removes the pool entry
in one transaction. Unsold participants retain history but receive no roster.

This aggregate is separate from legacy IPL Tournament auctions and from future
sport allocation auctions.
