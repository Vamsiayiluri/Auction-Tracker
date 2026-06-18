# MASTER APPLICATION DOCUMENTATION

## AuctionArena — Corporate Sports Festival Management Platform

**Version:** Post-Phase 4E | **Date:** June 2026 | **Status:** Pre-Production MVP

> This is the single source of truth for the AuctionArena application. A new developer, architect, tester, product owner, AI assistant, or stakeholder should be able to understand the complete application by reading only this document.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Roles](#3-user-roles)
4. [Complete User Flows](#4-complete-user-flows)
5. [System Architecture](#5-system-architecture)
6. [Database Architecture](#6-database-architecture)
7. [API Architecture](#7-api-architecture)
8. [Socket Architecture](#8-socket-architecture)
9. [Navigation Architecture](#9-navigation-architecture)
10. [Dashboard Architecture](#10-dashboard-architecture)
11. [Current Feature Inventory](#11-current-feature-inventory)
12. [Product Decisions](#12-product-decisions)
13. [Performance Architecture](#13-performance-architecture)
14. [Security Architecture](#14-security-architecture)
15. [Known Technical Debt](#15-known-technical-debt)
16. [Production Readiness](#16-production-readiness)
17. [Future Enhancements](#17-future-enhancements)
18. [Appendix](#18-appendix)

---

## 1. Executive Summary

### 1.1 Application Name and Purpose

**AuctionArena** is a browser-based, real-time Corporate Sports Festival Management Platform. It enables organizations to run IPL-style player auctions for corporate sports festivals — where employees register for sports, get allocated to festival teams via live auction, and then individual sport tournament rosters are built through a second round of credit-based sport auctions.

### 1.2 Business Problem Solved

Large organizations host corporate sports festivals where hundreds of employees participate across multiple sports. Without AuctionArena:

- Festival organizers manually allocate employees to teams (error-prone, time-consuming)
- Team owners have no transparent, fair bidding mechanism
- Sport tournament captains have no structured way to build their sport-specific rosters
- There is no real-time visibility into auction state for all stakeholders

AuctionArena automates and gamifies this process through a live auction platform that supports two auction layers: (1) Main Festival Auction (employees to festival teams) and (2) Sport Tournament Auctions (festival team members to sport teams within a tournament).

### 1.3 Target Users

| User Type | Role |
|-----------|------|
| Festival Organizers / HR | Admin |
| Festival Team Captains (large teams) | Team Owner |
| Sport Tournament Captains | Captain (assignment-derived) |
| All other employees and observers | Spectator |

### 1.4 Key Capabilities

1. **Festival lifecycle management** — create, configure, and run a corporate sports festival from draft through completion
2. **Main Festival Auction** — live, real-time IPL-style auction where team owners bid for employees using a financial purse
3. **Sport Tournament Management** — create and configure sport-specific tournaments nested under the festival
4. **Sport Tournament Auction** — credit-based live auction where captains bid for employees to fill sport rosters
5. **Role-based dashboards** — tailored experience for each user type
6. **Real-time synchronization** — Socket.IO keeps all connected users in sync during live auctions
7. **Reporting and results** — bid history, team rosters, allocation results, purse summaries

### 1.5 Current Product Scope

The following areas are in scope and implemented or planned:

1. Festival Management
2. Festival Auction (Main Festival Auction)
3. Sport Tournament Management
4. Sport Tournament Auction
5. Dashboards (Admin, Team Owner, Captain, Spectator)
6. Reporting, Results, History, and Allocations
7. Performance Optimization
8. Product UX Improvements
9. Stability, Reliability, and Production Readiness

### 1.6 What Is Explicitly OUT OF SCOPE

Competition management, fixtures, standings, playoffs, and match operations were evaluated but are intentionally excluded from the current product scope.

The legacy standalone Tournament Auction (IPL-style, without festival context) remains in the codebase for backward compatibility but is not the primary product surface.

---

## 2. Product Overview

AuctionArena contains three coexisting system layers:

### 2.1 Legacy Standalone Tournament Auction

The original IPL-style auction system. An admin creates a tournament, adds players, assigns teams, and runs live auction rounds. Team owners bid via Socket.IO. This layer predates the festival system and remains functional but is not the primary product surface for new use cases.

**Key entities:** Tournaments, Players, Teams, TournamentTeams, Auctions, Bids

### 2.2 Festival System

The main product surface for corporate sports festivals.

**Festivals** are the top-level container. A festival has:
- A lifecycle: `draft → setup → live → paused → pending_finalization → completed`
- A set of sports (drawn from a sport catalog)
- A set of festival teams
- A participant pool (employees who registered for the festival)
- A Main Festival Auction

**Festival Teams** are the bidding units in the Main Festival Auction. Each team has:
- A team owner (an employee with an active `TeamOwnershipAssignment`)
- A financial purse (INR/currency)
- A roster of employees won at auction
- One or more nested Sport Tournaments

**Festival Auction (Main Festival Auction)** is the live auction where team owners bid for festival participants using their financial purse. Admin controls the auction lifecycle. Timer runs for 20 seconds per bid. Admin finalizes each round (sell/unsold/extend).

### 2.3 Sport Tournament System

Each Festival Team can have Sport Tournaments nested beneath it.

**Sport Tournaments** are sport-specific competitions. Each has:
- A sport type (cricket, football, badminton, etc.)
- A status: `draft → setup → ready → auction_live → auction_paused → auction_completed`
- Sport Teams (created automatically, one per festival team in the tournament)
- A Captain per sport team (assignment-derived, not a global role)
- A credit budget per sport team

**Sport Teams** are the roster-building units in the Sport Auction.

**Sport Tournament Auction** is the live auction where captains bid for employees (from the festival roster) using credit budgets (non-financial units). The same timer and finalization pattern applies as the Festival Auction.

### 2.4 Auction Value Types — Critical Distinction

| Auction Type | Currency | Who Bids | Admin/Manager |
|---|---|---|---|
| Main Festival Auction | Financial purse (INR) | Team Owners | Admin |
| Sport Tournament Auction | Allocation credits (non-financial) | Captains | Sport Tournament Manager |

These two value types must never be interchanged. A financial purse value should never be compared to or combined with allocation credits.

### 2.5 Reporting, Results, History, and Allocations

- **Bid History** — full record of all bids for a participant/player, including who bid and at what amount
- **Auction Results** — sold participants with winning team and final price; unsold participants
- **Team Rosters** — current roster for each festival team or sport team
- **Purse Summaries** — remaining and spent purse per team
- **Allocation Records** — which employees were allocated to which teams at the festival and sport level

---

## 3. User Roles

### 3.1 Role Overview

There are two types of roles in AuctionArena:

- **Global roles** — assigned at registration, stored on the User record: `admin`, `team_owner`, `spectator`
- **Assignment-derived capabilities** — derived from assignment records, not stored on User: `captain`

### 3.2 Admin

**Who they are:** Festival organizers, HR administrators, platform administrators.

**Responsibilities:**
- Create and configure festivals, sports, and festival teams
- Manage employee records and registrations
- Configure festival team owners
- Run the Main Festival Auction (start, pause, resume, finalize each round)
- Create and configure sport tournaments
- Oversee sport auction setup and readiness
- View all dashboards, reports, bid history, and audit data

**Permissions:**
- Full access to all administrative surfaces
- All lifecycle transitions (festival and sport tournament)
- All auction control operations
- Access to all team rosters, purse data, bid history

**Navigation:** Admin Dashboard → Festival Management → Festival Auction Control → Sport Tournament Management → Reports

### 3.3 Team Owner

**Who they are:** Festival team captains / large-team representatives. Identified by an active `TeamOwnershipAssignment` record.

**Responsibilities:**
- Review their festival team's setup and roster
- Bid for participants during the Main Festival Auction
- Monitor their purse usage
- Manage sport tournaments nested under their festival team
- View bid history and results for their team

**Permissions:**
- Bid in the Main Festival Auction (only for their assigned festival team)
- Manage sport tournaments under their festival team
- Read access to their team's full data
- No access to other teams' private data

**Navigation:** Team Owner Dashboard → Festival Auction (bidding) → Sport Tournaments → Bid History → Results

### 3.4 Captain

**Who they are:** Employees who are assigned as captain of a specific sport team. Captain is NOT a global role — it is derived from a `CaptainAssignment` record for a specific sport tournament team.

**Responsibilities:**
- Build their sport team's roster during the Sport Tournament Auction
- Bid for employees using the sport team's credit budget
- Review team membership and remaining credits

**Permissions:**
- Bid in the Sport Tournament Auction (only for their assigned sport team, only when `canBid` server capability is granted)
- Read access to sport tournament data
- No access to the Main Festival Auction bidding

**Navigation:** Captain's sport team workspace → Sport Auction Arena → Roster → Credit summary

### 3.5 Spectator

**Who they are:** Employees, stakeholders, or anyone authenticated but not actively bidding.

**Responsibilities:**
- Watch live auctions without participation
- Review completed results

**Permissions:**
- Read-only access to live auction state
- View completed auction results, rosters, and history
- No bidding or lifecycle management actions

**Navigation:** Spectator Dashboard → Live Auction (view only) → Results → History

---

## 4. Complete User Flows

### 4.1 Festival Lifecycle

```
[Admin Creates Festival]
        |
        v
    [draft]
     - Festival created with name, dates, timezone
     - Sports catalog attached
     - Not visible to participants yet
        |
        v
    [setup]
     - Festival teams created and configured
     - Team owners assigned
     - Purses configured
     - Employee registrations open
     - Participants registered for sports
     - Auction pool generated
     - Readiness checks run
        |
        v
     [live]  <----> [paused]
     - Main Festival Auction runs
     - Team owners bid in real time
     - Admin finalizes each participant round
        |
        v
  [pending_finalization]
     - All participants auctioned (sold or unsold)
     - Admin reviews final state
        |
        v
   [completed]
     - Rosters locked
     - Sport tournament setup may begin
```

### 4.2 Sport Tournament Lifecycle

```
[Team Owner or Admin Creates Sport Tournament]
        |
        v
    [draft]
     - Tournament named, sport type set
     - Sport teams automatically created
        |
        v
    [setup]
     - Captains assigned to sport teams
     - Sport eligibility checked (employees registered for this sport)
     - Credit budgets configured (equal-distribution or manual)
     - Auction pool generated from eligibility
        |
        v
    [ready]
     - All readiness blockers resolved
     - Pool generated and valid
     - All teams have budgets and captains
        |
        v
  [auction_live] <----> [auction_paused]
     - Sport Auction runs
     - Captains bid using credit budgets
     - Manager finalizes each participant round
        |
        v
  [auction_completed]
     - Sport rosters locked
     - All allocations recorded
```

### 4.3 Festival Auction Lifecycle (Main Festival Auction)

```
Admin starts auction → auction status: live

For each participant:
  Admin selects participant and sets base price
  Admin starts round → round status: live, timer starts (20s)
    ↓
  Team Owners bid → each valid bid resets timer to 20s
    ↓
  Timer expires → round status: pending, bidding locked
    ↓
  Admin decision:
    [extend]  → round status: live, timer resets
    [sell]    → participant sold, team roster updated, purse deducted
    [unsold]  → participant marked unsold, available for re-auction

Admin re-auction: unsold participants can be re-queued

Admin completes auction → all participants resolved → auction status: completed
```

**Bid increment rule (Festival Auction):**
```
incrementAmount = basePrice × incrementPercentage / 100
nextBid = currentBid + incrementAmount
```
- Default increment: 20% of base price (configurable to 25%)
- The increment is fixed for the entire round (does not compound)
- Opening bid equals the base price

### 4.4 Sport Auction Lifecycle

```
Manager starts sport auction → status: auction_live

For each pooled employee:
  Manager selects employee, sets base credit price
  Manager starts round → timer starts (20s)
    ↓
  Captains bid → each valid bid resets timer
    ↓
  Timer expires → round pending
    ↓
  Manager decision:
    [extend]  → timer resets
    [sell]    → employee allocated to winning sport team, credits deducted
    [unsold]  → employee returned to pool

Manager completes auction → status: auction_completed
```

**Bid increment rule (Sport Auction):**
- Same tiered increment structure as Festival Auction
- Uses `bidRules.js` with budget-stage factor multiplier
- Credits are non-financial units — never mix with financial purse values

### 4.5 Roster Formation Modes

Festival Teams support two roster formation modes:

| Mode | Description |
|------|-------------|
| `auction` (default) | Roster is built through the Main Festival Auction |
| `manual` | Admin directly assigns employees; auto-balance support |

---

## 5. System Architecture

### 5.1 Overview

```
Browser (React SPA)
    │
    ├── HTTP (REST) via Axios ──────────────────> Express API (Node.js)
    │                                                   │
    └── WebSocket (Socket.IO) ─────────────────> Socket.IO Server
                                                        │
                                               Sequelize 6 (ORM)
                                                        │
                                                   MySQL Database
```

### 5.2 Frontend Architecture

**Stack:** React 19, Vite 6, React Router 7, Material UI 6, Axios, Socket.IO Client

**Repository path:** `ipl-auction-tracker/`

**Key structure:**
```
src/
  main.jsx                    App entry point
  App.jsx                     Root router and providers
  context/
    AuthContext.jsx           Auth state (user, token, login/logout)
  utils/
    api.js                    Axios instance (attaches bearer token)
    auctionStages.js          Stage-aware helper functions
    bidRules.js               Bid increment calculation
  webSocket/
    socket.js                 Socket.IO singleton
  components/
    AuctionManagement.jsx             Admin tournament management
    AdminDashboardLayout/
      AuctionLive.jsx                 Admin live auction control
      TeamsOverview.jsx               Team and squad view
    TeamOwnerDashboard/
      LiveAuction.jsx                 Team owner / spectator live auction
      BidHistory.jsx                  Player bid history
    AuctionContextNavigation.jsx      Stage-aware contextual navigation
    ProductStateCard.jsx              Empty state component
    LoadingStateCard.jsx              Loading state component
```

**State management:** Mostly local component state. AuthContext provides global auth state. No Redux or Zustand — state is component-local or passed via props.

**Routing:** React Router 7 with client-side guards (UX only, not a security boundary). Route guards check auth state and redirect unauthenticated users. Role-based UI rendering hides irrelevant surfaces per role.

**Stage-aware navigation:** `auctionStages.js` provides helper functions:
- `isSetupStage(status)` — returns true during setup
- `isReadyStage(status)` — returns true when ready for auction
- `shouldShowInAuctionDirectory(status)` — whether to show in listing
- `getSportAuctionStageFromState(state)` — derives stage from combined state fields

The setup-first UX principle means auction details and results surfaces are hidden during setup stage and revealed only when the auction has started or completed.

### 5.3 Backend Architecture

**Stack:** Node.js ES modules, Express 4, Socket.IO 4, Sequelize 6, MySQL via mysql2, bcryptjs, JWT, SendGrid, Zod

**Repository path:** `ipl-auction-tracker-backend/`

**Layered structure:**
```
src/
  index.js                    Express app setup, Socket.IO, startup
  routes/                     Route definitions (HTTP)
  controllers/
    auth.controller.js        Register, login, email verification
    tournment.controller.js   Tournament CRUD and status
    player.controller.js      Player creation, read, bid history
    team.controller.js        Team, squad, purse reads
    auction.controller.js     Auction start/extend/sell/unsold/current
  middleware/
    auth.middleware.js        JWT authentication and role enforcement
  models/                     Sequelize models and associations
  utils/
    bidRules.js               Dynamic bid increment rules (tiered)
  migrations/                 Versioned ESM migration files
```

**HTTP request flow:**
```
HTTP request
  → Express route
  → auth middleware (JWT decode + role check)
  → Zod validation middleware (payload validation)
  → Controller
  → Sequelize transaction
  → MySQL
  → Response DTO
```

**Socket bid flow:**
```
Socket event (placeBid)
  → JWT handshake authentication
  → Server loads User + Team from DB
  → Bid validation (increment rules, purse check, auction state)
  → Sequelize transaction (write bid, update purse, reset timer)
  → Broadcast to auction room (all connected clients)
```

### 5.4 Authentication and Authorization

- **Authentication:** JWT bearer tokens, 1-hour expiry, stored in `localStorage`
- **Authorization:** Role-based middleware on HTTP routes; server-side capability checks (`canBid`) on socket events
- **Socket authentication:** JWT passed in Socket.IO handshake, server derives bidder identity (User + Team) — not accepted from client payload
- **Email verification:** Optional; controlled by `EMAIL_VERIFICATION_REQUIRED` env var

### 5.5 Timer Architecture

- Duration: 20 seconds per bid round
- Valid bid resets the timer: `endsAt` is recalculated and persisted to DB
- Timer expiry: server process detects expiry, moves round to `pending`, locks bidding
- Pause: remaining milliseconds stored; timer resumes from stored remainder
- On server restart: persisted `endsAt` is restored, timers resume correctly

### 5.6 Real-Time Synchronization

Socket.IO rooms isolate auction events:
- Festival Auction room: `festival-auction:<festivalId>`
- Sport Auction room: `sport-auction:<sportTournamentId>`

All connected clients in a room receive broadcast events when auction state changes (bids, timer updates, round start/end, finalization).

### 5.7 Deployment Architecture

- **Frontend:** Vite SPA build, served as static files
- **Backend:** Node.js Express process
- **Database:** MySQL
- **Email:** SendGrid (for email verification)
- **Environment configuration:** `.env` files (see Section 16)

---

## 6. Database Architecture

### 6.1 Legacy Tournament System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Users` | Identity, login, role | `id`, `email`, `password`, `role` (admin/team_owner/spectator), `emailVerified` |
| `Teams` | Reusable team identity | `id`, `name`, `ownerId` (→ Users) |
| `Tournaments` | Tournament container | `id`, `name`, `budgetPerTeam`, `status`, `createdBy` |
| `TournamentTeams` | Team participation in a tournament | `tournamentId`, `teamId`, `allocatedBudget`, `amountSpent` |
| `Players` | Players in a tournament pool | `id`, `tournamentId`, `name`, `basePrice`, `sold`, `soldTeamId`, `auctionId` |
| `Auctions` | One player-round state | `id`, `playerId`, `tournamentId`, `status`, `endsAt`, `currentBid` |
| `Bids` | Accepted bids | `id`, `auctionId`, `teamId`, `amount`, `createdAt` |

**Key constraints:**
- One active or pending auction per tournament at a time
- `TournamentTeams.amountSpent` is the purse source of truth (not `Teams.purse`)
- A player can only be auctioned when not sold and not in an active auction

### 6.2 Festival System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Employees` | Canonical employee identity | `id`, `employeeNumber`, `name`, `email`, `gender`, `userId` (optional → Users) |
| `Festivals` | Top-level festival container | `id`, `name`, `code`, `status`, `startDate`, `endDate`, `timezone` |
| `Sports` | Sport catalog | `id`, `name`, `code` |
| `FestivalSports` | Sports enabled for a festival | `id`, `festivalId`, `sportId`, `status`, `config` |
| `FestivalRegistrations` | Employee registration for a festival | `id`, `festivalId`, `employeeId`, `status` |
| `EmployeeSportRegistrations` | Sport selections within a festival registration | `id`, `festivalRegistrationId`, `festivalSportId` |
| `FestivalTeams` | Teams competing in the festival | `id`, `festivalId`, `name`, `allocatedPurse` |
| `TeamOwnershipAssignments` | Maps an employee to a festival team as owner | `id`, `festivalTeamId`, `employeeId`, `status` |
| `FestivalTeamMemberships` | Employees allocated to festival teams | `id`, `festivalTeamId`, `employeeId`, `allocationSource` |
| `BudgetAccounts` | Festival team financial purse accounts | `id`, `festivalTeamId`, `balance`, `currency` |
| `BudgetTransactions` | Purse debit/credit records | `id`, `accountId`, `amount`, `type`, `reference` |
| `Retentions` | Pre-auction retention assignments | `id`, `festivalTeamId`, `employeeId` |
| `Allocations` | Final allocation records | `id`, `festivalId`, `employeeId`, `festivalTeamId`, `type` |

### 6.3 Sport Tournament System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `SportTournaments` | Sport-specific tournament nested under festival team | `id`, `festivalTeamId`, `sportId`, `name`, `status` |
| `SportTeams` | Teams within a sport tournament | `id`, `sportTournamentId`, `name`, `festivalTeamId` |
| `SportTeamMemberships` | Employees allocated to sport teams | `id`, `sportTeamId`, `employeeId` |
| `SportTeamBudgets` | Credit budget per sport team | `id`, `sportTeamId`, `allocatedCredits`, `spentCredits`, `status` |
| `SportAuctionPools` | Pre-auction snapshot of eligible employees | `id`, `sportTournamentId`, `employeeId`, `status` |
| `CaptainAssignments` | Captain assignment for a sport team | `id`, `sportTeamId`, `festivalParticipantId`, `status` |
| `AllocationCreditAccounts` | Credit account for sport team bidding | `id`, `sportTeamId`, `balance` |
| `SportRosterMemberships` | Final sport-level roster record | `id`, `sportTeamId`, `employeeId`, `allocationSource` |

### 6.4 Key Relationships

```
Employee ──→ User (optional link; employee can exist without a user account)
Employee ──→ FestivalRegistration ──→ EmployeeSportRegistration
Festival ──→ FestivalTeam ──→ TeamOwnershipAssignment ──→ Employee
FestivalTeam ──→ FestivalTeamMembership ──→ Employee
FestivalTeam ──→ SportTournament ──→ SportTeam ──→ CaptainAssignment
SportTournament ──→ SportAuctionPool ──→ Employee
SportTeam ──→ SportTeamBudget (credits, non-financial)
FestivalTeam ──→ BudgetAccount (INR, financial)
```

### 6.5 Migration Strategy

- Versioned ESM migration files in `migrations/` directory
- Phase 3F: Festival auction UX alignment, persisted `endsAt`
- Phase 3G: Festival operations stabilization, re-auction counters
- Phase 4A: SportTournaments, SportTeams, SportTeamCaptains, SportTeamMemberships
- Phase 4B: SportTeamBudgets, SportAuctionPools
- Employee gender foundation

**Note:** The legacy system used `sequelize.sync()` + startup backfills. The festival system uses proper versioned migrations. Migrating the legacy layer to full migrations is a known debt item.

---

## 7. API Architecture

### 7.1 API Conventions

- **Base path:** `/api/v2`
- All routes require bearer authentication unless noted
- Resource IDs are opaque strings
- Authentication identity is never accepted in mutation payloads — always server-derived
- Owner/team scope derived from active assignments (not client-supplied)
- Mutations validated via Zod middleware
- List endpoints support `page`, `pageSize`, filters, stable sorting
- Responses use safe DTOs (raw Sequelize records not exposed)
- Financial/allocation finalization supports `Idempotency-Key`

**Standard success response:**
```json
{ "data": {}, "meta": {} }
```

**Standard error response:**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Human-readable description",
  "errors": []
}
```

### 7.2 Authorization Vocabulary

| Policy | Meaning |
|--------|---------|
| `platform_admin` | Full platform administration |
| `festival_admin` | Scoped through FestivalRoleAssignment |
| `employee` | Authenticated user linked to an employee |
| `canManageFestival(festivalId)` | Admin-level festival management |
| `canManageFestivalTeam(festivalTeamId)` | Team-owner or admin team management |
| `canBid(auctionEventId, bidderAccountId)` | Server-derived bidding capability |

### 7.3 Festival APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v2/festivals` | Admin | Create festival |
| `GET` | `/api/v2/festivals` | Authenticated | List visible festivals |
| `GET` | `/api/v2/festivals/:id` | Authenticated | Get festival detail |
| `PATCH` | `/api/v2/festivals/:id` | Admin | Update festival config |
| `POST` | `/api/v2/festivals/:id/transitions` | Admin | Lifecycle transition (`{"toStatus":"setup"}`) |

### 7.4 Sport Management APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/sports` | Public/authenticated | Sport catalog |
| `POST` | `/api/v2/festivals/:id/sports` | Admin | Enable sport for festival |
| `GET` | `/api/v2/festivals/:id/sports` | Authenticated | List festival sports |
| `PATCH` | `/api/v2/festivals/:id/sports/:sportId` | Admin | Update festival sport config |
| `PUT` | `/api/v2/festivals/:id/participant-sports/bulk` | Admin | Bulk replace sport selections |
| `POST` | `/api/v2/festivals/:id/sports/bulk` | Admin | Enable multiple sports at once |

### 7.5 Employee and Registration APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v2/employees/import` | Admin | Async HR import |
| `GET` | `/api/v2/employees` | Admin | List employees (paginated) |
| `GET` | `/api/v2/me/employee` | Authenticated | Get own employee record |
| `PUT` | `/api/v2/festivals/:id/registrations/me` | Employee | Register/update sport selections |
| `GET` | `/api/v2/festivals/:id/registrations` | Admin | List festival registrations |

### 7.6 Festival Team APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v2/festivals/:id/teams` | Admin | Create festival team |
| `GET` | `/api/v2/festivals/:id/teams` | Authenticated | List festival teams |
| `PATCH` | `/api/v2/festivals/:id/teams/:teamId` | Admin | Update team config |
| `POST` | `/api/v2/festivals/:id/teams/:teamId/owner` | Admin | Assign team owner |

### 7.7 Festival Auction APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v2/festivals/:id/auction/start` | Admin | Start Main Festival Auction |
| `POST` | `/api/v2/festivals/:id/auction/round/start` | Admin | Start participant round |
| `POST` | `/api/v2/festivals/:id/auction/round/extend` | Admin | Extend current round |
| `POST` | `/api/v2/festivals/:id/auction/round/sell` | Admin | Sell to highest bidder |
| `POST` | `/api/v2/festivals/:id/auction/round/unsold` | Admin | Mark participant unsold |
| `POST` | `/api/v2/festivals/:id/auction/reauction` | Admin | Re-queue unsold participants |
| `GET` | `/api/v2/festivals/:id/auction/current` | Authenticated | Current auction state |
| `GET` | `/api/v2/festivals/:id/auction/history` | Authenticated | Bid history |
| `GET` | `/api/v2/festivals/:id/auction/pool` | Authenticated | Auction participant pool |
| `GET` | `/api/v2/festivals/:id/auction/readiness` | Admin | Readiness check result |

### 7.8 Sport Tournament APIs (Phase 4A)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/sport-tournaments` | Authenticated | List sport tournaments |
| `GET` | `/api/v2/sport-tournaments/owner-contexts` | Team Owner | Owner's sport tournament contexts |
| `POST` | `/api/v2/festivals/:fId/teams/:tId/sport-tournaments` | Admin/Owner | Create sport tournament |
| `GET` | `/api/v2/sport-tournaments/:id` | Authenticated | Get tournament detail |
| `PATCH` | `/api/v2/sport-tournaments/:id` | Admin/Owner | Update tournament |
| `GET` | `/api/v2/sport-tournaments/:id/teams` | Authenticated | List sport teams |
| `PATCH` | `/api/v2/sport-tournaments/:id/teams/:stId` | Admin/Owner | Update sport team |
| `POST` | `/api/v2/sport-tournaments/:id/teams/:stId/captain` | Admin/Owner | Assign captain |
| `DELETE` | `/api/v2/sport-tournaments/:id/teams/:stId/captain` | Admin/Owner | Remove captain |
| `GET` | `/api/v2/sport-tournaments/:id/eligibility` | Admin/Owner | Eligibility with reason codes |
| `GET` | `/api/v2/sport-tournaments/:id/readiness` | Admin/Owner | Readiness check (%, blockers) |

### 7.9 Sport Auction Preparation APIs (Phase 4B)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/sport-tournaments/:id/budgets` | Authenticated | Get team budgets |
| `PUT` | `/api/v2/sport-tournaments/:id/budgets` | Admin/Owner | Manual budget configuration |
| `POST` | `/api/v2/sport-tournaments/:id/budgets/equal-distribution` | Admin/Owner | Equal credit distribution |
| `GET` | `/api/v2/sport-tournaments/:id/pool` | Authenticated | Get auction pool |
| `POST` | `/api/v2/sport-tournaments/:id/pool/generate` | Admin/Owner | Generate pool snapshot |

**Pool generation:** transactionally replaces the existing pre-auction snapshot from current eligibility. Accepted only in `draft`, `setup`, or `ready` status. Readiness requires: active positive team budgets, generated pool, available pool participants, pool snapshot matching current eligibility.

### 7.10 Legacy Tournament APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/tournaments` | Admin | Create tournament |
| `GET` | `/api/tournaments` | Authenticated | List tournaments |
| `GET` | `/api/tournaments/:id` | Authenticated | Get tournament |
| `POST` | `/api/players` | Admin | Add player |
| `GET` | `/api/players` | Authenticated | List players |
| `POST` | `/api/auction/start` | Admin | Start auction round |
| `POST` | `/api/auction/extend` | Admin | Extend round |
| `POST` | `/api/auction/sell` | Admin | Sell player |
| `POST` | `/api/auction/unsold` | Admin | Mark unsold |
| `GET` | `/api/auction/current` | Authenticated | Current state |
| `POST` | `/api/auth/register` | Public | Register user |
| `POST` | `/api/auth/login` | Public | Login |
| `GET` | `/api/auth/verify-email/:token` | Public | Verify email |

---

## 8. Socket Architecture

### 8.1 Overview

Socket.IO 4 handles all real-time auction state synchronization. HTTP APIs handle all management, setup, and read operations. Sockets are used only for live auction events.

### 8.2 Authentication

Socket connections authenticate via JWT passed in the Socket.IO handshake. The server validates the JWT and loads the User + Team identity from the database. The client never supplies identity in bid payloads — identity is always server-derived.

### 8.3 Rooms

| Room Name | Purpose |
|-----------|---------|
| `festival-auction:<festivalId>` | All viewers of a Festival Auction |
| `sport-auction:<sportTournamentId>` | All viewers of a Sport Tournament Auction |
| `tournament-<tournamentId>` (legacy) | All viewers of a legacy Tournament Auction |

Clients join rooms on connection/page load. Admins and owners join the same room — role differentiation is handled by the frontend rendering layer.

### 8.4 Key Socket Events

**Client → Server (emitted by client):**

| Event | Payload | Purpose |
|-------|---------|---------|
| `placeBid` | `{ auctionId }` | Place a bid (legacy tournament) |
| `placeFestivalBid` | `{ festivalId }` | Place a bid in Festival Auction |
| `placeSportBid` | `{ sportTournamentId }` | Place a bid in Sport Auction |

Note: Amount and team identity are never in client payloads — computed server-side.

**Server → Client (broadcast events):**

| Event | Payload | Purpose |
|-------|---------|---------|
| `auctionUpdate` | Full auction state | Any state change (bid, timer, status) |
| `roundStarted` | Round state | A new participant round started |
| `bidPlaced` | Bid details + new state | A bid was accepted |
| `timerExpired` | Round state | Timer ran out, round pending |
| `roundFinalized` | Result (sold/unsold) | Admin finalized the round |
| `auctionPaused` | Auction state | Auction was paused |
| `auctionResumed` | Auction state | Auction was resumed |

### 8.5 Bid Flow

```
Captain/Owner emits placeBid
  ↓
Server receives event
  ↓
JWT handshake verification (server derives User)
  ↓
Load Team from active assignment (server-derived)
  ↓
Validate:
  - Auction is live (not pending/paused/completed)
  - Round is active
  - Bid amount meets minimum (bidRules.js)
  - Team has sufficient remaining purse/credits
  ↓
Sequelize transaction:
  - Insert Bid record
  - Update Auction.currentBid and Auction.leadingTeamId
  - Update Auction.endsAt (reset to now + 20s)
  - Update Team purse (subtract previous maximum)
  ↓
Broadcast auctionUpdate to room
```

### 8.6 Timer Synchronization

- `endsAt` is stored in the database as an absolute UTC timestamp
- All connected clients receive `endsAt` in every `auctionUpdate`
- Clients display a countdown using `endsAt - now`
- On reconnection, client receives current state with current `endsAt` — no data loss
- On server restart, timer is restored from persisted `endsAt`

### 8.7 Reconnection Behavior

- Socket.IO handles reconnection automatically
- On reconnect, client rejoins the auction room
- Client requests current state via `auctionUpdate` or polls current-state API
- `endsAt` persistence ensures timer is accurate post-reconnect

---

## 9. Navigation Architecture

### 9.1 Routing Overview

Routes are defined in React Router 7. All routes except `/login`, `/register`, and `/verify-email/:token` require authentication. Role-based rendering hides irrelevant navigation items per user role.

**Route guards are UX only — not a security boundary.** Backend authorization enforces access control.

### 9.2 Legacy Routes (standalone tournament system)

| Path | Access | Purpose |
|------|--------|---------|
| `/login` | Public | Login form |
| `/register` | Public | Registration form |
| `/verify-email/:token` | Public | Email verification |
| `/dashboard` | Auth required | Role-conditional dashboard |
| `/start-live-auction` | Admin | Tournament/auction setup |
| `/live-auction` | Admin + Team Owner | Live auction arena |
| `/spectator-live-auction` | Spectator | Spectator auction view |

### 9.3 Festival System Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/festivals` | Auth | Festival directory |
| `/festivals/:festivalId` | Auth | Festival detail / workspace |
| `/festivals/:festivalId/auction` | Admin + Owner | Festival Auction Hub (Auction Details) |
| `/festivals/:festivalId/auction/live` | Admin + Owner | Live Festival Auction Arena |
| `/festivals/:festivalId/spectator` | Spectator | Spectator Festival Auction view |
| `/festivals/:festivalId/results` | Auth | Festival results |

### 9.4 Sport Tournament Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/festivals/:festivalId/sport-tournaments` | Auth | Sport Tournament directory |
| `/festivals/:festivalId/sport-tournaments/:stId` | Auth | Sport Tournament workspace |
| `/festivals/:festivalId/sport-tournaments/:stId/auction` | Owner + Captain | Sport Auction Hub |
| `/festivals/:festivalId/sport-tournaments/:stId/auction/live` | Owner + Captain | Live Sport Auction Arena |

### 9.5 Stage-Aware Navigation

Navigation visibility is stage-aware via `auctionStages.js`:

| Stage | Visible Surfaces |
|-------|-----------------|
| `setup` | Setup configuration, readiness checklist. Auction Hub hidden. |
| `ready` | Setup surfaces + Auction Hub preview (read-only). |
| `auction_live` / `auction_paused` | Full Auction Hub + Live Arena link. Setup read-only. |
| `auction_completed` | Results, history, rosters. Auction Hub shows final state. |

The **Auction Hub** (labeled "Auction Details" in UI) is a read-oriented monitoring layer that sits between the management workspace and the Live Auction Arena. It shows:
- Current auction status
- Participant pool summary
- Team purse/credit summaries
- Quick-access to Live Arena

---

## 10. Dashboard Architecture

### 10.1 Admin Dashboard

**Purpose:** Complete festival and auction management hub

**Panels / sections:**

| Section | Content |
|---------|---------|
| Festival Overview | Status, key dates, participant counts, readiness |
| Festival Management | Team configuration, owner assignments, sport setup |
| Auction Control | Start/pause/resume/complete auction; current participant round |
| Participant Pool | Pool status, sold/unsold counts, re-auction controls |
| Team Summaries | All teams with roster count, purse spent/remaining |
| Bid History | Per-participant bid sequence viewer |
| Sport Tournaments | List of all sport tournaments, status, readiness |
| Reports | Full allocation report, results export |

**Admin Journey:**
1. Create festival → configure sports → create teams → assign owners
2. Monitor employee registrations → set purses
3. Generate auction pool → run readiness check
4. Start Main Festival Auction → select participants → run rounds → finalize
5. Complete auction → verify rosters
6. Create/configure sport tournaments → set budgets → assign captains
7. Run sport auctions per tournament

### 10.2 Team Owner Dashboard

**Purpose:** Bidding interface and team management hub

**Panels / sections:**

| Section | Content |
|---------|---------|
| My Festival Team | Team overview, current roster, purse status |
| Festival Auction | Auction Details page (Hub) + link to Live Arena when active |
| Live Auction | Real-time bidding view (when auction is live) |
| Bid History | Bid history for their team |
| Sport Tournaments | Sport tournaments nested under their team |
| Results | Final roster and allocation results |

**Owner Journey:**
1. View festival team assignment
2. Monitor setup progress (readiness)
3. Enter Live Auction Arena when auction starts → bid for participants
4. Review roster and purse after each round
5. Access sport tournament management for their team's sport tournaments

### 10.3 Captain Dashboard

**Purpose:** Sport team roster-building interface

**Panels / sections:**

| Section | Content |
|---------|---------|
| My Sport Team | Sport team overview, current roster, remaining credits |
| Sport Auction | Auction Details page (Hub) + link to Live Arena when active |
| Live Auction | Real-time bidding view (when sport auction is live) |
| Roster | Current sport team members |
| What Is Next | Upcoming sport activities (non-competition) |

**Captain Journey:**
1. View sport team assignment and credit budget
2. Review eligible player pool
3. Enter Live Sport Auction Arena when auction starts → bid using credits
4. Monitor remaining credits between rounds
5. Review final sport roster

### 10.4 Spectator Dashboard

**Purpose:** Read-only view of all festival and auction activity

**Panels / sections:**

| Section | Content |
|---------|---------|
| Festival Overview | Active festivals, status summary |
| Live Auction | Read-only view of current auction state |
| Teams | All teams with rosters |
| Results | Final results for completed auctions |
| History | Completed auction history |

**Spectator Journey:**
1. View festival overview
2. Watch live Festival Auction (no bid button shown)
3. Review team rosters as they form
4. View final results

---

## 11. Current Feature Inventory

### 11.1 Authentication and User Management

- ✅ Public registration (team_owner and spectator roles only)
- ✅ JWT-based login with 1-hour token expiry
- ✅ Optional email verification (controlled by env var)
- ✅ Role-based route protection (UX level)
- ✅ Admin accounts (created outside public registration)
- ❌ Password reset / change
- ❌ Admin user management UI
- ❌ Session expiry / refresh tokens

### 11.2 Legacy Tournament Auction

- ✅ Tournament creation by admin
- ✅ Player creation and pool management
- ✅ Team assignment to tournaments
- ✅ Live auction round (start/extend/sell/unsold)
- ✅ 20-second timer with `endsAt` persistence
- ✅ Real-time Socket.IO bidding
- ✅ Bid increment rules (`bidRules.js`)
- ✅ Team owner bidding (server-derived identity and amount)
- ✅ Spectator view
- ✅ Team squad and purse view
- ✅ Bid history viewer
- ❌ Tournament edit/delete/archive
- ❌ Player import/export
- ❌ Admin user management for tournaments

### 11.3 Festival Management

- ✅ Festival creation with lifecycle stages
- ✅ Festival team creation and configuration
- ✅ Team owner assignment
- ✅ Purse configuration
- ✅ Sport catalog management
- ✅ Festival sport enabling (FestivalSports)
- ✅ Employee registration management
- ✅ Bulk sport selection update
- ✅ Festival workspace UX (tab/step based navigation)
- ✅ Readiness checks with blockers and percentage score
- ✅ Festival lifecycle transitions (admin-controlled)

### 11.4 Main Festival Auction

- ✅ Auction pool generation from participant registrations
- ✅ Auction start/pause/resume/complete lifecycle
- ✅ Per-participant round (base price, 20s timer, bids, finalization)
- ✅ Re-auction of unsold participants
- ✅ Bid increment formula (base price × configurable percentage)
- ✅ Real-time Socket.IO synchronization
- ✅ Financial purse deduction on sale
- ✅ Auction Hub / Auction Details monitoring layer
- ✅ Stage-aware navigation (setup hides auction surfaces)
- ✅ Admin Operations View (post-auction-start default)
- ✅ Separated completed activity (Bid History, Results, Audit)

### 11.5 Sport Tournament Management (Phase 4A)

- ✅ Sport tournament creation nested under festival teams
- ✅ Automatic sport team creation (one per festival team)
- ✅ Captain assignment and removal
- ✅ Eligibility check with reason codes (included/excluded employees)
- ✅ Readiness check (percentage score, blockers, per-team captain state)
- ✅ Festival roster prerequisite validation

### 11.6 Sport Auction Preparation (Phase 4B)

- ✅ Equal-distribution credit budget setup
- ✅ Manual credit budget configuration per team
- ✅ Auction pool generation (transactional snapshot from eligibility)
- ✅ Pool validation (matches current eligibility)
- ✅ Extended readiness requirements (budgets + pool + captains)
- ❌ Sport Auction live bidding (Phase 4C+ — in progress)

### 11.7 Dashboards and Navigation

- ✅ Admin dashboard with festival, auction, and tournament panels
- ✅ Team owner dashboard with bidding and team management
- ✅ Spectator dashboard with live view and results
- ✅ Stage-aware navigation (surfaces appear/hide based on lifecycle stage)
- ✅ `AuctionContextNavigation` component for contextual navigation
- ✅ `ProductStateCard` / `LoadingStateCard` for empty/loading states
- ✅ Captain dashboard with sport team and auction panels

### 11.8 Reporting, Results, and History

- ✅ Bid history (player/participant → full bid sequence)
- ✅ Team roster viewer
- ✅ Purse usage summary per team
- ✅ Sold/unsold participant results
- ✅ Allocation records

---

## 12. Product Decisions

### 12.1 Setup-First Principle

Navigation and UI surfaces are stage-aware. During the `setup` stage:
- Auction Hub ("Auction Details") is hidden
- Results pages are hidden
- Live Arena link is hidden

This prevents confusion when the auction has not started yet and ensures admins complete setup before users see auction surfaces. Surfaces are progressively revealed as the lifecycle advances.

**Implementation:** `auctionStages.js` helper functions check the current status/stage and return boolean flags that control component rendering and route availability.

### 12.2 Auction Hub / Auction Details Concept

The Auction Hub (branded as "Auction Details" in the UI) is a read-oriented monitoring layer that sits between the management workspace and the Live Auction Arena. It exists to:
- Give owners and admins a summary view without entering the full arena
- Show pool status, purse summaries, and readiness at a glance
- Provide the entry point to the Live Arena when the auction is active

The Auction Hub is always read-only. All mutations happen in the management workspace (setup) or the Live Arena (bidding/finalization).

### 12.3 Separation of Live Auction Arena

The Live Auction Arena is a dedicated, focused page for real-time bidding. It is separate from the management workspace. The reasons:
- Reduces cognitive load during live bidding
- Avoids accidental navigation away from a live round
- Allows spectators to access the same live view without management surfaces

### 12.4 Stage-Aware Navigation

The navigation architecture uses the stage of the auction/festival to determine which navigation items are shown. This is implemented via `AuctionContextNavigation` component and `auctionStages.js` helpers.

This means the navigation "knows" what the user should be doing at each phase and hides irrelevant options rather than showing everything and disabling items.

### 12.5 Role-Based Experience

Each role has a completely different primary experience:
- **Admin:** control, oversight, and management actions
- **Team Owner:** bidding and team monitoring (cannot run admin actions)
- **Captain:** credit-based bidding for sport roster (cannot access festival-level auction)
- **Spectator:** pure read-only observation

The backend enforces these distinctions. Frontend rendering adapts to role.

### 12.6 Results Architecture

Results are not a live surface — they are derived from finalized auction records. Results are accessible after rounds are finalized and after auction completion. They do not update in real time (only live auction state updates in real time).

### 12.7 Two-Layer Auction Architecture

The Main Festival Auction (employees → festival teams) and Sport Auction (festival team members → sport teams) are separate, independent auction events. They do not run simultaneously. The Main Festival Auction must complete before Sport Auctions can begin (festival roster prerequisite).

### 12.8 Server-Derived Bidder Identity

The client never supplies bidder identity or bid amount in socket payloads. The server:
- Decodes the JWT to get User identity
- Loads the active team assignment to get the Team
- Calculates the bid amount from `bidRules.js`

This prevents spoofing of identity or bid amount from the client.

### 12.9 Allocation Credits vs Financial Purse

These are fundamentally different value types:
- **Financial purse (INR):** Used in Main Festival Auction. Represents real monetary value or organizational budget. Stored in `BudgetAccounts`.
- **Allocation credits:** Used in Sport Auctions. Non-financial units used purely for roster building. Stored in `AllocationCreditAccounts` and `SportTeamBudgets`.

Code, UI, and database tables must never mix these two value types.

---

## 13. Performance Architecture

### 13.1 Current Optimizations

- **Tab/step-based data loading:** Festival workspace loads data per tab, not all at once on page load
- **Persisted `endsAt`:** Timer deadline stored in DB, prevents timer drift and enables correct behavior after page reload or server restart
- **Socket.IO rooms:** Auction events scoped to room — no global broadcast overhead
- **Sequelize transactions:** Multi-table updates (bid + purse + timer) done in atomic transactions to prevent partial-update inconsistencies
- **Pool snapshots:** Sport Auction pool is a pre-generated snapshot, not a live query during the auction — prevents eligibility changes from disrupting a live auction

### 13.2 Known Bottlenecks

- **Timer implementation is process-local:** Timers run in Node.js `setTimeout`. If the process crashes, timers are lost (mitigated by persisted `endsAt` for restoration, but in-flight timeout references are lost)
- **No auction state caching:** Every current-state API call hits the database
- **`sequelize.sync()` in legacy system:** Auto-syncs schema on startup rather than using migrations — risky in production, can cause data loss on model changes

### 13.3 Known Limitations

- Single Node.js process: no horizontal scaling support for Socket.IO rooms (would require Redis adapter for multi-instance)
- No rate limiting on socket events: a malicious client could flood bids (mitigated by server-side validation, but no connection-level throttle)
- No pagination on some list endpoints in the legacy system

### 13.4 Future Performance Opportunities

- Redis adapter for Socket.IO horizontal scaling
- API response caching for read-heavy festival data (participant lists, team rosters)
- Worker-based timer management (separate from main process)
- Database connection pooling configuration tuning
- CDN for frontend static assets

---

## 14. Security Architecture

### 14.1 JWT Authentication

- JWT bearer tokens, 1-hour expiry
- Stored in `localStorage` on the client
- All authenticated routes require `Authorization: Bearer <token>` header
- JWT secret stored in `JWT_SECRET` environment variable
- Socket.IO connections authenticated via JWT in handshake

### 14.2 Role Enforcement

- HTTP routes use `auth.middleware.js` for JWT verification and role checks
- Role-based route protection: `requireAuth`, `requireAdmin`, `requireTeamOwner`
- Sport-level authorization: `canManageFestival()`, `canManageFestivalTeam()`, `canBid()`
- Owner scope derived from `TeamOwnershipAssignment` records (not client-supplied)
- Captain scope derived from `CaptainAssignment` records

### 14.3 Input Validation

- Zod validation middleware on all mutation endpoints
- Socket event payloads validated on receipt
- Server never trusts client-supplied identity, team, or bid amount

### 14.4 Current Security Limitations

| Limitation | Risk | Mitigation Status |
|-----------|------|-------------------|
| JWT stored in `localStorage` | XSS token theft | Not mitigated — known debt |
| 1-hour JWT, no refresh tokens | Long-lived exposure | Not mitigated — known debt |
| No explicit CORS allowlist | Open CORS | Partial — needs config |
| Read API authorization incomplete | Info disclosure | Partial — some endpoints unprotected |
| No rate limiting | DDoS / bid flooding | Not implemented |
| No audit logs | No tamper detection | Not implemented |
| Email verification optional | Account spoofing risk | Configurable via env var |
| Frontend route guards are UX only | Not a security boundary (by design) | Backend is authoritative |

### 14.5 Known Security Risks

1. **`localStorage` JWT storage:** Vulnerable to XSS. Mitigation: move to `httpOnly` cookies with CSRF protection
2. **No session invalidation:** Logout only clears local storage; server cannot invalidate an issued JWT
3. **Incomplete read authorization:** Some list/detail endpoints do not enforce data-scoping rules
4. **Socket.IO without rate limiting:** Auction bid handler could be abused without throttle

---

## 15. Known Technical Debt

### 15.1 Authentication and Security

- [ ] JWT stored in `localStorage` — should move to `httpOnly` cookies
- [ ] No refresh token mechanism — 1-hour hard expiry requires re-login
- [ ] Missing explicit CORS allowlist configuration
- [ ] Read API authorization incomplete — some endpoints expose all data to all authenticated users
- [ ] No rate limiting on HTTP endpoints or Socket.IO events
- [ ] No audit log trail for auction finalization actions

### 15.2 Database and Migrations

- [ ] Legacy system uses `sequelize.sync()` instead of migrations — risky in production
- [ ] Legacy `Teams.purse` field exists but `TournamentTeams.amountSpent` is the source of truth — dead field confuses new developers
- [ ] No database backup/restore automation documented

### 15.3 Timer and Auction Integrity

- [ ] Timer runs in the main Node.js process — if process crashes, in-flight setTimeout references are lost (persisted `endsAt` allows restoration but there is a window)
- [ ] No idempotency enforcement on finalization operations in legacy system
- [ ] Re-auction counter field exists but full re-auction tracking is partial

### 15.4 Testing

- [ ] Minimal test coverage — backend tests cover only Phase 1 security helpers
- [ ] No integration tests for auction lifecycle (bid, timer, sell, purse update)
- [ ] No frontend tests
- [ ] No end-to-end tests
- [ ] No socket event tests

### 15.5 Operations

- [ ] No structured logging — `console.log` used throughout
- [ ] No health check endpoint (`/health` or `/ready`)
- [ ] No production CI/CD pipeline
- [ ] No monitoring or alerting
- [ ] No database backup automation
- [ ] No deployment runbook

### 15.6 Minor Code Quality

- [ ] Typo in filename: `tournment.controller.js` (missing 'a') — present in production code, renaming would be a breaking change without route update
- [ ] Socket bid handler lives in `src/index.js` — should be extracted to a controller or service module
- [ ] `uid` used for some client-generated IDs — should be fully server-generated

---

## 16. Production Readiness

### 16.1 Master Data Required Before Launch

1. **Admin user account** — must be created directly (not through public registration)
2. **Sport catalog** — sports must be seeded (Cricket, Football, Badminton, etc.)
3. **Employee records** — import employee directory before opening festival registration
4. **Festival configuration** — create festival, configure teams, assign owners, set purses

### 16.2 Environment Variables

**Backend (`ipl-auction-tracker-backend/.env`):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No (default 3001) | HTTP server port |
| `MYSQL_DB_NAME` | Yes | Database name |
| `MYSQL_DB_USER` | Yes | Database user |
| `MYSQL_DB_PASSWORD` | Yes | Database password |
| `MYSQL_DB_HOST` | Yes | Database host |
| `MYSQL_DB_PORT` | No (default 3306) | Database port |
| `JWT_SECRET` | Yes | JWT signing secret (mandatory) |
| `SENDGRID_API_KEY` | If email verification | SendGrid API key |
| `EMAIL_FROM` | If email verification | Sender email address |
| `CLIENT_URL` | If email verification | Frontend URL for verification links |
| `EMAIL_VERIFICATION_REQUIRED` | No (default false) | Enforce email verification |

**Frontend (`ipl-auction-tracker/.env`):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | Yes | Backend API base URL |

### 16.3 Development Commands

**Frontend:**
```powershell
cd ipl-auction-tracker
npm install
npm run dev        # Start dev server (Vite)
npm run lint       # ESLint
npm run build      # Production build
```

**Backend:**
```powershell
cd ipl-auction-tracker-backend
npm install
npm start          # Start Express server
npm test           # Run tests (Node built-in runner)
```

### 16.4 Database Setup

1. Create MySQL database matching `MYSQL_DB_NAME`
2. Run versioned ESM migrations:
   ```bash
   # Run migrations in order from migrations/ directory
   node run-migrations.js
   ```
3. Legacy tables are created via `sequelize.sync()` on startup (Phase 1 tables only — tech debt)
4. Sport catalog seed data required manually

### 16.5 Production Blockers

These must be resolved before production use:

1. **Socket authentication** — Authenticate Socket.IO connections and derive bidder identity server-side ✅ (Implemented in Phase 3F+)
2. **Read API authorization** — Protect sensitive read APIs and scope responses per role
3. **CORS allowlist** — Add explicit CORS configuration
4. **Token security** — Move from `localStorage` JWT to `httpOnly` cookies
5. **Session invalidation** — Add refresh tokens and server-side session control
6. **Timer durability** — Ensure timer restoration is tested under process-restart scenarios
7. **Migration pipeline** — Replace `sequelize.sync()` with full migration pipeline for legacy tables
8. **Input validation** — Ensure Zod validation covers all endpoints (complete coverage audit)
9. **Rate limiting** — Add request rate limiting and socket event throttling
10. **Integration tests** — Cover auction lifecycle, auth, authorization, and purse correctness
11. **Structured logging** — Replace `console.log` with structured logger (Winston/Pino)
12. **Health checks** — Add `/health` and `/ready` endpoints
13. **Backup and recovery** — Document and automate database backup procedure
14. **Monitoring** — Add application performance monitoring and alerting

---

## 17. Future Enhancements

The following enhancements are candidates for future development after the current product scope (Festival Management, Festival Auction, Sport Tournament Management, Sport Auction, Dashboards, Reporting) is stable and production-ready:

1. **Admin user management** — create, edit, deactivate users from within the application
2. **Employee self-service** — employees register and select sports through a self-service portal
3. **Password reset flow** — forgot password / reset password via email
4. **Retention management** — pre-auction retention of specific employees to specific teams
5. **Bulk operations** — player/employee import via CSV
6. **Export and reporting** — downloadable allocation reports (CSV/PDF)
7. **Audit trail** — full audit log of all admin actions and finalization decisions
8. **Multi-festival support** — manage multiple concurrent festivals
9. **Rich spectator experience** — enhanced live auction view with analytics
10. **Mobile-optimized views** — responsive design improvements for mobile bidding

**Explicitly excluded from future scope:**

Competition management, fixtures, standings, playoffs, and match operations were evaluated but are intentionally excluded from the current product scope.

---

## 18. Appendix

### 18.1 Glossary

| Term | Definition |
|------|-----------|
| **AuctionArena** | The application name |
| **Festival** | Top-level corporate sports festival event |
| **Festival Team** | A competing team in the festival, owns a financial purse |
| **Festival Participant** | An employee in the context of a specific festival |
| **Employee** | Canonical identity record (has `employeeNumber`). May or may not have a user account |
| **Team Owner** | An employee with an active `TeamOwnershipAssignment` for a festival team |
| **Main Festival Auction** | The live auction where team owners bid for festival participants using financial purse |
| **Sport Tournament** | A sport-specific tournament nested under a festival team |
| **Sport Team** | A team within a sport tournament, builds a sport-specific roster |
| **Captain** | An employee with an active `CaptainAssignment` for a sport team (assignment-derived, not global role) |
| **Sport Auction** | The live auction where captains bid for employees using credit budgets |
| **Auction Hub** | The "Auction Details" monitoring layer between management and live auction |
| **Auction Pool** | The set of participants available to be auctioned in a given auction |
| **Financial Purse** | The monetary budget (INR) used in the Main Festival Auction |
| **Allocation Credits** | Non-financial units used in Sport Auctions for roster building |
| **Base Price** | The starting price for an auction round; first bid equals base price |
| **Increment** | The minimum amount a bid must exceed the previous bid |
| **Round** | A single participant's auction sequence within an auction event |
| **`endsAt`** | The persisted UTC timestamp when the current bid timer expires |
| **Sold** | A participant whose round was finalized with a winning bid |
| **Unsold** | A participant whose round ended with no bids, or admin marked unsold |
| **Re-auction** | Returning an unsold participant to the pool for another round |
| **Readiness** | A checklist system that validates all prerequisites before an auction can start |
| **Setup-first** | UX principle: auction surfaces hidden until setup is complete |
| **Stage-aware** | Navigation/UI that adapts based on the current lifecycle stage |
| **DTO** | Data Transfer Object — a safe, shaped response object (not raw Sequelize model) |

### 18.2 Status Definitions

**Festival status values:**

| Status | Meaning |
|--------|---------|
| `draft` | Festival created but not configured |
| `setup` | Configuration in progress; registrations may be open |
| `live` | Main Festival Auction is running |
| `paused` | Main Festival Auction temporarily paused |
| `pending_finalization` | All participants auctioned; admin reviewing |
| `completed` | Festival rosters locked; sport tournaments may begin |

**Sport Tournament status values:**

| Status | Meaning |
|--------|---------|
| `draft` | Tournament created but not configured |
| `setup` | Configuration in progress (captains, budgets, pool) |
| `ready` | All readiness requirements met; auction can start |
| `auction_live` | Sport Auction is running |
| `auction_paused` | Sport Auction temporarily paused |
| `auction_completed` | Sport rosters locked |

**Auction round status values:**

| Status | Meaning |
|--------|---------|
| `live` | Round active; bidding open; timer running |
| `pending` | Timer expired; bidding locked; awaiting admin finalization |
| `sold` | Round finalized; participant sold to winning team |
| `unsold` | Round finalized; no winning bid |

### 18.3 Stage Definitions (auctionStages.js)

| Function | Returns true when |
|----------|-------------------|
| `isSetupStage(status)` | Status is `draft` or `setup` |
| `isReadyStage(status)` | Status is `ready` |
| `shouldShowInAuctionDirectory(status)` | Status is `ready`, `auction_live`, `auction_paused`, or `auction_completed` |
| `getSportAuctionStageFromState(state)` | Derives stage from combined status + round state |

### 18.4 Navigation Definitions

| Surface | Who Sees It | When Visible |
|---------|-------------|--------------|
| Festival Directory | All authenticated | Always |
| Festival Workspace | Admin, Team Owner | Always after festival exists |
| Auction Hub ("Auction Details") | Admin, Team Owner | After setup stage (ready/live/completed) |
| Live Festival Auction Arena | Admin, Team Owner | When auction is live or paused |
| Spectator Live View | Spectator | When auction is live |
| Sport Tournament Directory | All authenticated | After festival is live/completed |
| Sport Tournament Workspace | Admin, Team Owner | Always after tournament exists |
| Sport Auction Hub | Admin, Team Owner, Captain | After tournament is ready/live/completed |
| Live Sport Auction Arena | Admin, Team Owner, Captain | When sport auction is live/paused |
| Results | All authenticated | After auction completed |
| Bid History | Admin, Team Owner | After rounds have been run |

### 18.5 Bid Increment Rules (`bidRules.js`)

The bid increment system uses tiered rules based on the current bid amount, multiplied by a budget-stage factor.

**Main Festival Auction (fixed-percentage formula):**
```
incrementAmount = basePrice × incrementPercentage / 100
nextBid = currentBid + incrementAmount
```
- `incrementPercentage` is 20 (default) or 25 (configurable)
- The increment is calculated once from `basePrice` and is fixed for the entire round
- Does NOT compound (does not recalculate from current bid after each bid)

**Legacy Tournament Auction:**
- Tiered bid increments from `bidRules.js`
- Increment tier based on current bid amount (e.g., low bids have smaller increments, high bids have larger increments)
- Multiplied by a budget-stage factor

### 18.6 Key File Locations

| File | Location | Purpose |
|------|----------|---------|
| Backend entry | `ipl-auction-tracker-backend/src/index.js` | Express + Socket.IO setup |
| Auth controller | `src/controllers/auth.controller.js` | Register, login, verify |
| Auction controller | `src/controllers/auction.controller.js` | Auction lifecycle |
| Bid rules | `src/utils/bidRules.js` | Increment calculation |
| Auth middleware | `src/middleware/auth.middleware.js` | JWT + role enforcement |
| Frontend entry | `ipl-auction-tracker/src/main.jsx` | React app entry |
| Auth context | `src/context/AuthContext.jsx` | Auth state |
| API client | `src/utils/api.js` | Axios + token attachment |
| Stage helpers | `src/utils/auctionStages.js` | Stage-aware logic |
| Socket singleton | `src/webSocket/socket.js` | Socket.IO client |
| Live auction (admin) | `src/components/AdminDashboardLayout/AuctionLive.jsx` | Admin auction control |
| Live auction (owner) | `src/components/TeamOwnerDashboard/LiveAuction.jsx` | Owner/spectator view |

---

*This document was generated as the single source of truth for AuctionArena. It reflects the application as implemented through Phase 4E. For questions about future enhancements or product direction, refer to Section 17.*
