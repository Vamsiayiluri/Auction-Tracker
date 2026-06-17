# CLAUDE_PROJECT_UNDERSTANDING.md

## Product Purpose

AuctionArena is a corporate Sports Festival operations platform. It manages the
full lifecycle from employee registration through roster allocation, live
auctions, sport team formation, and future competitions.

The product has three coexisting layers:

1. A legacy standalone Tournament Auction system (IPL-style player auctions).
2. A Festival roster-allocation system (Main Festival Auction for assigning
   employees to Festival Teams).
3. A Sport Tournament and Sport Team allocation system (Sport Auctions using
   credit budgets).

The overall implemented journey is:

```text
Employees
-> Festival
-> Participants and Sport Registration
-> Festival Teams and Owners
-> Main Festival Auction (employees bid into Festival Teams)
-> Festival Team Rosters
-> Sport Tournaments
-> Sport Teams and Captains
-> Sport Auction (credit-based player allocation)
-> Final Sport Team Rosters
-> [Future] Competition Engine
```

---

## User Roles

### Global Roles (stored in `Users.role`)

| Role | Scope |
| --- | --- |
| `admin` | Full platform control: create Festivals, manage everything, run auctions |
| `team_owner` | Owns a Festival Team; can also manage Sport Tournaments and bid in Festival Auctions |
| `spectator` | Read-only viewer of live and completed auctions |

### Assignment-Derived Capabilities (not global roles)

| Capability | How It Is Granted |
| --- | --- |
| Festival Team Owner | Admin assigns a `team_owner` user as the owner of a Festival Team |
| Sport Captain | Assigned to a specific Sport Team within a Sport Tournament |
| Sport Tournament Manager | Festival Team Owner authorized to manage a Sport Tournament |

Captain is not a global role. A single user may simultaneously be a Festival
Team Owner, Sport Captain, Admin, and spectator depending on context. Frontend
navigation and controls must derive from server-returned capabilities, not
purely from `Users.role`.

---

## Festival Lifecycle

```text
1. Draft / Setup Incomplete
   - Festival created but configuration is missing
   - Participants, Teams, Owners, Budgets, Pool not ready

2. Ready
   - All server readiness checks pass
   - Auction pool generated
   - Owners active and linked

3. Festival Auction Live
   - Admin starts participant rounds
   - Festival Team Owners bid using purse budget
   - Timer governs each round (20-second countdown)
   - Admin finalizes: Extend, Sell, or Mark Unsold

4. Festival Auction Completed
   - All participants sold or unsold
   - Final Festival Team rosters are locked
   - Results, Bid History, Audit available
```

**Festival status values**: `draft`, `setup`, `live`, `paused`,
`pending_finalization`, `completed`.

**Configuration lock**: Festival configuration locks after auction launch.
Unlock/relock is an admin-controlled correction path.

---

## Sport Tournament Lifecycle

```text
1. Draft / Setup
   - Sport Tournament created under a Festival Team
   - Sport Teams named, Captains assigned, Credits configured
   - Eligibility and Pool generated

2. Ready
   - All readiness checks pass (Teams, Captains, Budgets, Pool)
   - Server signals READY

3. Sport Auction Live
   - Manager starts participant rounds
   - Captains bid using credit budgets (not money)
   - Server-authoritative canBid controls who bids
   - Timer and finalization same pattern as Festival Auction

4. Sport Auction Completed
   - Final Sport Team rosters locked
   - Allocation results, Bid History, Audit available
```

**Sport Tournament status values**: `draft`, `setup`, `ready`,
`auction_live`, `auction_paused`, `auction_completed`.

**Key distinction**: Festival Auction uses financial purse (INR or currency);
Sport Auction uses credits (allocation units). These must never be
interchanged in terminology or business logic.

---

## Festival Auction Lifecycle

### Start Round

`POST /api/festival-auction/start/:participantId`

1. Validate readiness and no existing live round.
2. Set participant `isInAuction=true`.
3. Create Auction record `status="live"`.
4. Set Festival `status="live"`.
5. Schedule 20-second in-memory timer.
6. Emit `auction-started` via Socket.IO room `festival-auction:<festivalId>`.

### Place Bid (Festival)

Socket event: `place-bid`

1. Validate room membership and open timer.
2. Validate participant, team, owner relationship.
3. Validate purse and increment rules.
4. Insert Bid record in transaction.
5. Reset timer.
6. Emit `new-bid` to tournament room.

### Timer Expiry → Pending Finalization

When the timer reaches zero:
- Auction status changes to `pending`.
- Server emits `auction-pending-finalization`.
- Bidding locks. Admin must decide.

### Admin Finalization

- **Extend**: Reset auction to `live`, schedule another 20 seconds.
- **Sell**: Assign participant to leading team, update purse, mark sold.
- **Mark Unsold**: Clear sale fields, mark available for re-auction.

### Tournament Completion

After each finalization, backend checks if any participants remain available
or in auction. If none, Festival status → `completed`, emits
`tournament-completed`.

---

## Sport Auction Lifecycle

Same structural pattern as Festival Auction:

- Manager starts rounds for individual participants.
- Captains place credit bids via Socket.IO.
- Timer expires → pending finalization.
- Manager extends, sells (credits deducted from Sport Team), or marks unsold.
- Re-auction controls allow repeating unsold participants.
- Sport Tournament status → `auction_completed` when no participants remain.

**Socket room**: `sport-auction:<sportTournamentId>`

---

## Current Navigation Architecture

### Global Navigation (after Phase 4E restructure)

```text
Admin:
  Dashboard | Festivals | Auctions | Sport Tournaments | Employees

Festival Team Owner:
  Dashboard | Auctions | Sport Tournaments

Spectator:
  Dashboard | Auctions
```

Navigation is role-based at the global level but capability-aware within
Festivals and Sport Tournaments.

### Current Primary Routes

**Legacy (still operational):**
- `/dashboard` — authenticated dashboard
- `/start-live-auction` — admin legacy auction control
- `/live-auction` — team owner legacy room
- `/spectator-live-auction` — spectator legacy room

**Festival:**
- `/festivals` — Festival directory
- `/festivals/:festivalId` — Festival Overview (Command Center)
- `/festivals/:festivalId/manage` — Festival Management workspace
- `/festivals/:festivalId/auction-hub` — Festival Auction Details (monitoring)
- `/auctions/festivals/:festivalId` — Festival Live Auction (Arena)
- `/festival-auctions` → redirects to `/auctions?type=festival`

**Sport Tournament:**
- `/sport-tournaments` — Sport Tournament directory
- `/sport-tournaments/:sportTournamentId` — Sport Tournament Overview
- `/sport-tournaments/:sportTournamentId/manage` — Sport Tournament Management
- `/sport-tournaments/:sportTournamentId/auction-hub` — Sport Auction Details
- `/sport-tournaments/:sportTournamentId/results` — Sport Results
- `/auctions/sports/:sportTournamentId` — Sport Live Auction (Arena)

**Auction Directory:**
- `/auctions` — unified Auction Directory (ready, live, completed only)

**Profile:**
- `/profile` — protected read-only profile page
- `/settings` — protected account settings (placeholders)

### Contextual Navigation (stage-aware, added in Phase 4E)

Within a Festival or Sport Tournament context:

```text
Setup stage:   Overview | Setup
Ready stage:   Overview | Setup | [Launch action]
Live stage:    Overview | Auction Details | Live Auction | Results
Completed:     Overview | Results | Auction Details
```

---

## Current Dashboard Architecture

### Admin Dashboard

Priority hierarchy:
1. Action Required (pending finalization, paused auctions, readiness blockers)
2. Live Now (Festival and Sport Auctions)
3. Festival Journey / Next Actions
4. Recent Outcomes

**Known issue:** Dashboard hero still contains some redundancy with the
Festival Command Center. Full redesign is planned (Phase 4E-H) but not
fully implemented.

### Festival Team Owner Dashboard

Priority hierarchy:
1. Active Festival Auction (primary card when live)
2. My Festival Team (purse, roster)
3. Sport Tournaments I Manage
4. What Is Next

### Captain Dashboard

Priority hierarchy:
1. Captain Assignments with active Sport Auction
2. What Needs Attention
3. My Sport Team (credits, roster)
4. Future Fixtures (placeholder)

### Spectator Dashboard

Priority hierarchy:
1. Live Now (Festival and Sport Auctions)
2. Upcoming
3. Recent Results
4. Festival Explorer

---

## Current Auction Hub Architecture

Phase 4E-HX added Auction Hub (renamed "Auction Details" in Phase 4E-I) as a
read-oriented monitoring layer between Management and the Live Auction Arena.

**Festival Auction Details** (`/festivals/:festivalId/auction-hub`):
- Overview: sold/unsold/remaining, progress, recent activity, team summary
- Teams: rosters, remaining purse, spending, retentions, purchases
- Bid History: participant-level summaries with detailed bid modal
- Results: sold/unsold outcomes and final assignments
- Statistics: highest, lowest, average, total spend, utilization

**Sport Auction Details** (`/sport-tournaments/:id/auction-hub`):
- Overview: credit use, remaining credits, progress, recent activity
- Teams: rosters, credits, captains, purchases, remaining slots
- Bid History: team-filtered bid timeline with participant summaries
- Results: sold/unsold players and final allocations
- Allocations: roster composition and remaining slots
- Statistics: credit utilization and acquisition summaries

**Hub rules:**
- Hub is the monitoring/inspection destination.
- Hub is not the live bidding destination.
- Hub reads existing current-state, history, Festival, and Sport APIs.
- Arena exit actions return to the Hub, not Management.
- Hub subscribes to live socket snapshots for monitoring but does not create a
  second auction state store.

---

## Current Live Auction (Arena) Architecture

### Festival Auction Arena (`/auctions/festivals/:festivalId`)

**Shell:** Reduced header — no management tabs, no management sidebar.

**Header content:**
- Auction name and type
- Live/Paused/Pending/Completed status
- Connection state
- Team context for Owner
- Exit to Festival Management (authorized users)

**Desktop layout:**

```text
Arena Header
+----------------------------------+---------------------------+
| CURRENT PARTICIPANT              | MY TEAM                   |
| Employee, Sports, context        | Purse, Spent, Roster      |
|                                  +---------------------------+
| Base | Current | Next | Leader   | TEAM PURSES               |
|              TIMER               | All-team comparison       |
| [PLACE BID] / [ADMIN ACTIONS]    |                           |
+----------------------------------+---------------------------+
| LIVE BID STREAM                  | AUCTION QUEUES            |
+----------------------------------+---------------------------+
| RECENT RESULTS                                               |
+--------------------------------------------------------------+
```

**Role-specific behavior:**
- Admin: lifecycle controls, participant selection, extend/sell/unsold
- Festival Team Owner: one-click Place Bid with next minimum
- Spectator: read-only, no bidding or admin controls

**Synchronization:**
- HTTP snapshot on load and forced reconciliation after rejected actions and
  timer expiry
- Socket.IO room for live updates (`festival-auction:<festivalId>`)
- Revision-aware — newer socket state is never replaced by stale HTTP response
- Server-clock offset and expiry confirmation

### Sport Auction Arena (`/auctions/sports/:sportTournamentId`)

Same architectural pattern as Festival Auction Arena with:
- Credits language instead of purse/currency
- Captain bid controls (server-returned `canBid` capability)
- Manager controls instead of Admin controls
- Tournament, Festival Team, Sport, and division context in header
- Sport Team credit panel instead of purse panel
- Bounded expiry reconciliation (one-second) for missed socket events

---

## Known UX Issues Mentioned in Phase 4E

### Structural Issues (resolved in Phase 4E-A through 4E-G)

- ~~Festival live component duplicated across two shells~~ — fixed with canonical
  Arena route
- ~~Admin entering Festival viewer route received spectator tabs~~ — fixed
- ~~Sport Auction tab in workspace was ambiguous~~ — renamed Auction Settings
- ~~Management workspace contained embedded live Auction~~ — moved to Arena
- ~~Legacy routes appeared as primary navigation alongside canonical routes~~ —
  consolidated under `/auctions`
- ~~Explicit HTTP refreshes did not distinguish recovery from normal updates~~ —
  fixed with forced reconciliation

### Issues Identified but Not Fully Implemented

1. **Stage visibility not centralized** — frontend stage helpers added in
   Phase 4E-J Sprint 1, but not all surfaces use them yet. Sport Tournament
   setup-first redesign, Sport Auction Details stage fallback, and Sport Live
   Auction stage fallback are not yet implemented.

2. **Direct URL fallback states** — partially added in Phase 4E-L for Festival
   and Sport live routes; not complete for all hidden future-stage pages.

3. **Dashboard still risks duplication** — Admin Festival Journey cards
   duplicate Festival Command Center. Owner may see Festival Team, managed
   Tournament, and Captain sections repeating the same Tournament multiple times.

4. **Auction Directory** — Festival/Sport Management overhead removed; however
   full stage-aware card actions and spectator empty states for no-upcoming
   auctions need verification.

5. **Result surfaces duplicated** — Results appear in Management tabs, Hub, Arena
   recent strip, and dedicated Results pages without a fully consistent
   information hierarchy.

6. **Owner/Captain/Spectator waiting states** — Phase 4E-L added them, but some
   legacy dashboard components still use spinner-only loading states.

7. **Lint errors in `SportAuctionHub.jsx`** — pre-existing: `no-constant-binary-
   expression` and undefined `bids` variable. Not introduced by recent phases.

8. **Frontend bundle size** — primary bundle exceeds Vite's default 500 kB chunk
   warning. No new dependency was introduced but it remains unresolved.

9. **Mobile and tablet verification** — responsive structure exists, but
   real-device testing at 320 px, 768 px, and desktop widths has not been
   confirmed for all pages and interaction scenarios.

10. **Setup checklist experience** — only partial. Festival Overview shows setup
    progress and issues. Full setup checklist design (step states, dependency
    labels, guided transitions) from Phase 4E-J Final Plan is not yet
    implemented.

11. **Header/profile** — Phase 4E-J moved logout to avatar menu, added
    `/profile` and `/settings` (placeholders). Account mutations, notifications,
    and activity logs are not implemented.

12. **Competition Setup sections** — removed from Phase 4E surfaces, but prior
    screens may still reference it. Phase 5 has not started.

### Permanent Known Gaps (pre-production constraints, not Phase 4E focus)

- Socket.IO bidding is unauthenticated; `ownerId`/`teamId` are client-supplied.
- JWTs have no expiration and are stored in `localStorage`.
- CORS reflects arbitrary origins.
- Auction timers are process-local and not persisted; multi-instance scaling
  is not safe.
- Schema management uses `sequelize.sync()` and startup backfills.
- Automated test coverage is minimal; no frontend test harness.
- No CI/CD, monitoring, backups, structured logging, or deployment automation.

---

## Remaining Work Before Phase 5

Phase 5 is the Competition Engine (fixtures, schedules, matches, standings,
results, playoffs). The following must be completed in Phase 4E before Phase 5
starts.

### Outstanding Phase 4E-J Work (Setup-First Experience)

Steps implemented in Sprint 1:
- Stage helpers (`auctionStages.js`)
- Stage-aware context navigation
- Festival Overview setup-first redesign
- Festival Management setup-first cleanup
- Auction Directory stage filtering

Steps NOT yet implemented from the Phase 4E-J Final Plan:

- Step 4: Direct-URL fallback states for all hidden future-stage routes
- Step 9: Results surfaces fully stage-aware (demote Management Results tabs,
  route Dashboard recent outcomes to Results)
- Step 10: Sport Tournament Overview setup-first redesign
- Step 11: Sport Tournament Management hide post-launch tabs during setup
- Step 12: Sport Auction Details stage-gate content
- Step 13: Sport Live Auction stage-gate entry language
- Step 16: Owner waiting states (per-stage: No Team, Waiting for Setup, Ready,
  Live, Completed)
- Step 17: Captain waiting states
- Step 18: Spectator discovery states
- Step 19: Cleanup duplicate sections (Management Overview duplicates,
  Management Results tabs, setup-stage live activity and auction metrics)
- Step 20: Verification plan across all roles and stages

### Outstanding Hierarchy Simplification (Phase 4E-H)

Phases 4E-H1 through 4E-H5 define:
- H1: Compact headers, simplified dashboards, remove duplicate metrics
- H2: Festival Workspace Modernization (reduce permanent top-page height by 60%)
- H3: Tournament Workspace Modernization (action-first command center)
- H4: Navigation cleanup (standardize Command Center/Management/Arena/Results labels)
- H5: Mobile optimization (priority ordering, compact selectors, touch targets)

These are architecture documents, not yet implemented.

### Technical Debt to Resolve Before Phase 5

1. **Fix lint errors** in `SportAuctionHub.jsx` (pre-existing, low risk but
   clean build requires this).
2. **Frontend bundle size** — investigate code splitting before Phase 5 adds
   more routes and components.
3. **Verify mobile at 320 px, 768 px, desktop** for all arenas, management
   workspaces, and dashboards.
4. **Confirm `festival-auctions` redirect** to `/auctions?type=festival` is
   operational and browser history behaves correctly.
5. **Verify browser back/forward** preserves Auction Directory filters and
   Festival Results section selections.
6. **Confirm no duplicate Socket.IO subscriptions** exist when navigating
   between Hub and Arena for the same Festival or Sport Tournament.
7. **Confirm Arena recovery** after disconnect/reconnect during live rounds for
   both Festival and Sport arenas.

### Phase 4E Architecture Decisions Still Needed

- **Results hierarchy**: Decide whether Auction Details and dedicated Results
  remain separate post-completion, and which is primary.
- **Sport Tournament Overview vs Management Overview**: Decide whether
  Management Overview should be demoted if Tournament Overview owns setup
  progress.
- **Auction Directory in completed state**: Confirm it routes to Results, not
  the Live Auction page.
- **Admin setup sequence confirmation**: Resolve whether Sport Tournament
  setup must precede Main Festival Auction launch or follows after Festival
  rosters exist.

### When Phase 5 May Begin

Phase 5 (Competition Engine) should start only after:

1. Stage-aware navigation is consistent across Festival and Sport Tournament
   surfaces.
2. Management, Arena, Hub, and Results boundaries are stable and consistently
   labeled.
3. Dashboard cards route to stage-correct destinations.
4. Owner, Captain, and Spectator waiting states are implemented.
5. Direct-URL fallback states protect all hidden future-stage routes.
6. No duplicate live components mount simultaneously on any route.
7. Known lint errors and bundle size concerns are addressed.

Phase 5 will add Competition Center, Fixtures, Match Center, Standings,
Playoffs, and Finals. Adding these before Phase 4E architecture is stable
would deepen existing navigation complexity and workspace overload.

---

## Technology Reference

**Frontend:** React 19, Vite 6, React Router 7, Material UI 6, Axios,
Socket.IO Client

**Backend:** Node.js ES modules, Express 4, Socket.IO 4, Sequelize 6,
MySQL via `mysql2`, bcryptjs, JWT, SendGrid

**Key files:**
- Frontend entry: `ipl-auction-tracker/src/main.jsx`
- Routes: `ipl-auction-tracker/src/App.jsx`
- Auth context: `ipl-auction-tracker/src/context/AuthContext.jsx`
- Stage helpers: `ipl-auction-tracker/src/utils/auctionStages.js`
- API client: `ipl-auction-tracker/src/utils/api.js`
- Socket singleton: `ipl-auction-tracker/src/webSocket/socket.js`
- Backend entry: `ipl-auction-tracker-backend/src/index.js`
- Bid rules: `ipl-auction-tracker-backend/src/utils/bidRules.js`
- Auth middleware: `ipl-auction-tracker-backend/src/middleware/auth.middleware.js`
