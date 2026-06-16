# Phase 4E Product Experience Master Plan

## Status

This document is architecture, product planning, UX planning, navigation
planning, and future scalability planning only.

It does not implement code, routes, UI, APIs, migrations, schemas, or backend
behavior.

This document is the master product-experience source of truth for:

- Dashboard redesign
- Navigation redesign
- Festival Workspace redesign
- Festival Auction Arena redesign
- Sport Tournament Workspace redesign
- Sport Auction Arena redesign
- Future Competition Engine integration

## 1. Product Vision

### What AuctionArena Is Today

AuctionArena is a modular corporate Sports Festival platform with three
coexisting product layers:

1. A legacy standalone Tournament Auction system.
2. A Festival roster-allocation system.
3. A Sport Tournament and Sport Team allocation system.

The implemented Festival journey is:

```text
Employees
-> Festival
-> Participants and Sport Registration
-> Festival Teams
-> Festival Team Owners and Retentions
-> Main Festival Auction
-> Final Festival Team Rosters
```

The implemented Sport journey is:

```text
Festival Team Roster
-> Sport Tournament
-> Sport Teams
-> Captain Assignment
-> Credit Budgets and Eligible Pool
-> Sport Auction
-> Final Sport Team Rosters
```

The planned competition journey is:

```text
Final Sport Rosters
-> Competition Definition
-> Entries
-> Fixtures and Scheduling
-> Matches
-> Results
-> Standings and Progression
-> Playoffs and Finals
```

The product therefore no longer behaves primarily as a Tournament Management
Tool. Its actual value is coordinating employee identity, Festival setup,
roster allocation, live Auctions, Sport Team formation, and future
competitions.

### Tournament Management Tool Versus Sports Festival Auction Platform

| Tournament Management Tool | Sports Festival Auction Platform |
|---|---|
| Starts with a Tournament | Starts with Employees and a Festival |
| Treats players as event-specific records | Reuses one canonical Employee |
| Assumes one Team and Auction layer | Supports Festival and Sport allocation layers |
| Organizes navigation by CRUD pages | Organizes navigation by operational journeys |
| Treats Auction as one management function | Treats Auction as a first-class live experience |
| Uses role labels as primary navigation inputs | Uses roles plus scoped assignments and capabilities |
| Ends after a player sale | Continues through Sport Teams and competitions |
| Centers the administrator | Supports Admins, Owners, Captains, participants, and spectators |

### Target Vision

AuctionArena should become:

> A corporate Sports Festival operations platform that guides every user from
> employee registration through roster allocation, live Auctions, Sport Team
> formation, competitions, matches, and results.

The target product should have four clearly separated experience types:

1. **Command Centers** for role-specific next actions.
2. **Management Workspaces** for setup, correction, readiness, and reporting.
3. **Live Arenas** for time-sensitive Auctions and future live Match operation.
4. **Competition Centers** for fixtures, matches, standings, and progression.

The product should feel like one connected workflow rather than a collection
of incrementally added pages.

## 2. Current Product Audit

### Dashboard

#### Current State

- The Admin dashboard renders the legacy `AuctionManagement` experience.
- The Team Owner dashboard emphasizes legacy invited Auctions.
- The Spectator dashboard lists legacy Auctions.
- Festival and Sport Auction responsibilities are not summarized centrally.
- Captain assignments are not represented as a dashboard capability.
- The dashboard does not show end-to-end Festival progress.

#### Problems

- The first page after login reflects the original product rather than the
  current Festival platform.
- Users must know which navigation item contains their actual work.
- Active, paused, blocked, and pending-finalization Auctions are not presented
  as urgent work.
- Setup blockers and upcoming competition work have no command-center model.
- Legacy data receives disproportionate prominence.

#### Scalability Concern

Adding fixtures, matches, schedules, and standings to the current dashboard
would create an unfocused statistics wall. The dashboard needs a task and
capability model before Phase 5.

### Navigation

#### Current State

Admin navigation includes:

```text
Dashboard
Run Auction
Sports Festivals
Festival Auctions
Employees
Sport Tournaments
```

Team Owner navigation includes:

```text
Dashboard
Live Auction
Festival Auctions
Sport Tournaments
```

Spectator navigation includes:

```text
Dashboard
Watch Auction
Festival Auctions
Sport Auctions
```

#### Problems

- Labels expose historical implementation layers instead of business
  workflows.
- Legacy, Festival, and Sport Auctions have separate entry concepts.
- `Run Auction`, `Live Auction`, `Watch Auction`, and `Festival Auctions`
  compete for meaning.
- `Sport Auctions` currently opens the Sport Tournament directory.
- `Sport Tournaments` mixes management, bidding, and viewing.
- Navigation is based on global roles, while real Festival and Sport
  permissions are assignment-derived.
- Sport Captains have no distinct navigation experience.

### Festival Workspaces

#### Current State

The Admin Festival page combines:

- Persistent Control Center
- Configuration lock controls
- Operations and Configuration modes
- Nine-step setup wizard
- Participants
- Teams
- Owners
- Retentions
- Embedded live Auction
- Bid History
- Results
- Audit

#### Problems

- The page owns too many lifecycle stages.
- Live Auction rendering competes with setup and reporting.
- Operations tabs reproduce management functions already represented by the
  setup workflow.
- Admin corrections, live execution, and historical analysis are mixed.
- The page is difficult to extend safely with Sport or Competition content.
- Large sections increase loading, layout, and mobile complexity.

### Festival Auction

#### Current State

Festival Auction is rendered:

- Inside the Admin Festival Workspace.
- Inside a separate role-specific tabbed viewer page.

The live component combines:

- HTTP synchronization
- Socket synchronization
- Timer behavior
- Admin lifecycle controls
- Participant selection
- Owner bidding
- Team purse summaries
- Queues
- Re-auction
- Bid stream
- Optional history

#### Problems

- The primary live product is duplicated across different page shells.
- The dedicated Festival Auction route is still a tabbed workspace.
- Admins entering the viewer route receive non-owner tab behavior.
- Owners and spectators must navigate past secondary tabs.
- Live state, queues, histories, and management content create long pages.

### Sport Tournament

#### Current State

The Sport Tournament Workspace includes:

```text
Overview
Teams
Captains
Budgets
Eligibility
Pool
Readiness
Auction
Settings
```

The `Auction` section configures timer, increment, and re-auction behavior.
Live Auction execution already has a separate route.

#### Problems

- The `Auction` label is ambiguous because it means configuration, not live
  execution.
- Spectators and Captains reach live Auctions through a management directory.
- Creation, setup, live discovery, and completed viewing share one directory.
- Read-only users can enter a workspace dominated by disabled management
  controls.
- Future Competition Engine features would overload this workspace if added as
  more peer tabs.

### Sport Auction

#### Current State

Sport Auction has the strongest current live architecture:

- Dedicated route
- Current participant hierarchy
- Manager controls
- Captain one-click bid
- Team credit summaries
- Available and unsold queues
- Team allocations
- Separated histories
- Reconnect and server-clock indicators

#### Problems

- It still uses the full application management shell.
- Full histories and Team allocation reports make the page long.
- It is discovered through the Sport Tournament directory rather than a
  unified live-Auction destination.
- Captain identity is not visible in global navigation.
- The route naming keeps the Arena under the management resource hierarchy.

### Cross-Product Workflow Inefficiencies

- Users repeatedly switch between directories and workspaces to find live
  actions.
- The same status may be represented in a Control Center, directory card,
  workspace tab, and Arena.
- Frontend role assumptions can diverge from server capabilities.
- Current directories require multiple domain-specific entry paths.
- Historical reporting is mixed with time-sensitive execution.
- Product terminology alternates between Tournament, Festival, Auction,
  Workspace, Operations, and Live Auction without a consistent hierarchy.

### Scalability Concerns

- New Phase 5 tabs would deepen workspace overload.
- Current dashboards cannot absorb fixtures, matches, and standings coherently.
- Frontend fan-out will grow as more Festival and Sport summaries are added.
- Process-local timers and Socket.IO coordination remain operational scaling
  constraints, although they are outside the UX redesign itself.
- Broad authenticated read access needs an explicit future private-event
  visibility policy.

## 3. User Journey Mapping

### Admin

#### Current End-to-End Journey

```text
Employee Directory
-> Import or Create Employees
-> Create Festival
-> Enable Sports
-> Add Participants
-> Record Sport Registration
-> Create Festival Teams
-> Configure Budget and Owner Cost
-> Assign Owners
-> Add Retentions
-> Generate Festival Auction Pool
-> Resolve Readiness
-> Run Festival Auction
-> Review Final Festival Rosters
-> Create Sport Tournaments
-> Generate Sport Teams
-> Assign Captains
-> Configure Credits
-> Generate Sport Auction Pool
-> Resolve Sport Readiness
-> Run Sport Auction
-> Review Sport Team Rosters
-> Future: Build Competitions
-> Future: Schedule Matches
-> Future: Record Results and Standings
```

#### Ideal Journey

The Admin should begin from a command center that shows:

- Current Festival phase.
- Blocking setup tasks.
- Auctions requiring action.
- Sport Tournaments ready for setup or launch.
- Future competition setup and match-operation tasks.

The Admin should not need to remember which page owns each lifecycle action.

### Festival Team Owner

#### Business Journey

```text
Receive Festival Team assignment
-> Activate linked User identity
-> Review assigned Festival Team
-> Join Main Festival Auction
-> Bid for Festival roster
-> Review purse, purchases, and final roster
-> Create or manage Sport Tournaments under owned Festival Team
-> Configure Sport Teams and Captains
-> Configure credit budgets and pool
-> Launch and manage Sport Auction
-> Review Sport Team rosters
-> Future: Review fixtures, schedules, and results
```

#### Ideal Experience

The Owner should see one assignment-aware landing page with:

- Owned Festival Team.
- Active Main Auction.
- Remaining purse and roster.
- Managed Sport Tournaments.
- Sport Auctions awaiting launch or finalization.
- Future fixtures and Team results.

The Owner should not be treated as a generic global role with unrelated legacy
Auction navigation.

### Sport Captain

#### Business Journey

```text
Employee registered for Festival and Sport
-> Employee belongs to parent Festival Team
-> Assigned as Captain of one Sport Team
-> Linked User logs in
-> Reviews Team credits and roster
-> Joins active Sport Auction
-> Places server-calculated bids
-> Reviews final Team roster
-> Future: Reviews fixtures
-> Future: Leads Team into matches and results
```

#### Ideal Experience

Captain is a scoped assignment, not a global role. The product should detect
active Captain assignments and expose:

- My Sport Teams.
- Active Sport Auctions.
- Remaining Team credits.
- Team roster.
- Future fixtures and results.

The Captain should never have to infer that a generic `team_owner` or
`spectator` navigation item contains Captain actions.

### Spectator

#### Business Journey

```text
Log in
-> Discover live Festival or Sport Auction
-> Watch current participant, timer, bids, Team balances, and outcome
-> Review completed Auction results
-> Future: Discover live or upcoming matches
-> Follow fixtures, standings, playoffs, and finals
```

#### Ideal Experience

Spectators should receive a viewing product, not a read-only management
product:

- Live now.
- Upcoming.
- Recently completed.
- Results and standings.
- Clear Festival, Sport, and Competition context.

## 4. Navigation Philosophy

### Current Philosophy

The current navigation optimizes for pages:

- Each implementation phase adds a new top-level destination.
- Similar actions are separated by domain and historical architecture.
- Navigation assumes global role labels are sufficient.

### Future Philosophy

Navigation should optimize for workflows and capabilities:

1. What must this user do now?
2. What do they manage?
3. What live event can they join?
4. What results or schedule can they review?

### Recommended Principles

- Use stable product concepts, not implementation-era page names.
- Keep one primary entry for all Auctions.
- Separate management from live execution.
- Derive navigation from global role plus active assignments.
- Do not create a new top-level item for every future feature.
- Keep Competition and Match experiences distinct from Auction experiences.
- Make live and urgent actions visible from every relevant landing page.
- Use contextual navigation inside a Festival or Sport Tournament rather than
  expanding the global navigation indefinitely.

### Recommended Global Navigation

```text
Dashboard
Festivals
Auctions
Sport Tournaments
Competitions
Employees
```

Visibility is capability-based:

- `Employees`: Admin only.
- `Festivals`: Admin management or authorized personal Festival views.
- `Auctions`: all authenticated users, personalized by capability.
- `Sport Tournaments`: managers, Owners, Captains, and authorized viewers.
- `Competitions`: introduced in Phase 5 for managers, participants, and
  spectators.

Legacy Auction navigation should be consolidated under `Auctions` during the
transition rather than remain a permanent peer product.

## 5. Dashboard Philosophy

### Current Model

The dashboard is effectively:

- Legacy Auction management for Admin.
- Legacy invited Auctions for Team Owners.
- Legacy Auction viewing for Spectators.

### Target Model

The Dashboard should become an action-oriented command center.

It should answer:

- What needs my attention?
- What is live now?
- What is blocked?
- What is next?
- What am I assigned to?
- What changed recently?

### Dashboard Information Hierarchy

1. **Urgent Actions**
   - Pending Auction finalization.
   - Paused Auction.
   - Readiness blockers.
   - Upcoming match requiring action.

2. **Live Now**
   - Festival Auctions.
   - Sport Auctions.
   - Future live matches.

3. **My Assignments**
   - Owned Festival Teams.
   - Captained Sport Teams.
   - Admin-managed Festivals.

4. **Upcoming**
   - Ready Auctions.
   - Registration deadlines.
   - Fixtures and schedule.

5. **Recent Outcomes**
   - Purchases.
   - Completed Auctions.
   - Future match results and standings changes.

### Dashboard Standards

- Do not make dashboard statistics the primary content.
- Counts should support decisions, not exist as decoration.
- Every high-priority card must have one clear next action.
- Dashboard data should eventually come from summary/read-model endpoints
  rather than page-level fan-out.
- Global roles should choose broad dashboard framing; server-derived
  assignments should determine actual cards and actions.

## 6. Festival Workspace Architecture

### Purpose

Festival Management owns Festival configuration, roster preparation,
administrative correction, and reporting.

It does not own the live Main Festival Auction experience.

### Recommended Final Structure

```text
Festival Management
|-- Overview
|-- Setup
|   |-- Festival Details
|   |-- Sports
|   |-- Participants
|   `-- Roster Formation Mode
|-- Teams
|-- Owners
|-- Retentions
|-- Auction Preparation
|   |-- Budget
|   |-- Pool
|   `-- Readiness
|-- Rosters
|-- Results
|-- Bid History
|-- Audit
`-- Settings
```

### What Remains

- Festival details and lifecycle context.
- Employee and participant administration.
- Sport registration administration.
- Festival Team configuration.
- Owner assignment and activation status.
- Retentions.
- Budget and Auction configuration.
- Pool generation and readiness.
- Configuration unlock and relock.
- Final roster review.
- Results, bid history, and audit.

### What Moves Elsewhere

- Live participant rounds.
- Timer.
- Live bid controls.
- Pause, resume, extend, sell, and unsold actions.
- Live queue operation.
- Live Team purse monitoring.
- Live bid stream.

These move to the Festival Auction Arena.

### Workspace Behavior

- Setup mode remains optimized for progressive completion.
- Post-launch management emphasizes permitted corrections and reporting.
- `Open Auction Arena` is a primary Control Center action.
- The workspace must grow naturally with content.
- Only the active management section should mount.
- Full historical reporting belongs here, not in the live Arena.

## 7. Festival Auction Arena Philosophy

### Decision

Festival Auction should not remain inside the Festival Workspace.

It should become a dedicated Arena because:

- It is time-sensitive.
- It has multiple simultaneous viewers.
- It has role-specific live controls.
- It requires persistent visibility of participant, timer, bid, and Team
  budget state.
- Workspace navigation and configuration are distractions during bidding.

### Arena Contents

- Festival and Auction identity.
- Live, paused, pending, or completed state.
- Connection and synchronization state.
- Current participant.
- Employee and selected Sport context.
- Base price.
- Current bid.
- Next bid.
- Leading Festival Team.
- Timer.
- Live bid stream.
- Team purse summaries.
- Assigned Owner Team context.
- Owner one-click bid.
- Admin participant selection.
- Admin lifecycle and finalization actions.
- Available and unsold queue controls.
- Compact recent outcomes.

### Must Not Appear

- Employee import.
- Participant editing.
- Team creation or renaming.
- Owner assignment.
- Retention configuration.
- Budget configuration.
- Configuration unlock.
- Setup wizard.
- Full bid-history reporting.
- Full audit log.
- General Festival settings.
- Sport Tournament management.

### Desktop Wireframe

```text
+--------------------------------------------------------------------+
| Festival Auction | LIVE | Connected | Team Context | Exit         |
+-----------------------------------------+--------------------------+
| CURRENT PARTICIPANT                     | TEAM PURSES              |
| Employee identity and Sports            | Team A remaining         |
|                                         | Team B remaining         |
| Base | Current | Next | Leading Team    | Team C remaining         |
|                                         |                          |
|                  TIMER                  | MY TEAM                  |
|                                         | Purse and roster summary |
| [PLACE BID] / [ADMIN FINALIZATION]      |                          |
+-----------------------------------------+--------------------------+
| LIVE BID STREAM                         | AVAILABLE / UNSOLD       |
+-----------------------------------------+--------------------------+
| Compact Recent Results                                             |
+--------------------------------------------------------------------+
```

### Mobile Wireframe

```text
Auction Status / Connection
Current Participant
Timer
Current Bid / Next Bid / Leader
Primary Bid or Finalization Action
My Team Purse
Live Bid Stream
Expandable Team Summaries
Queue Controls
```

## 8. Sport Tournament Workspace Architecture

### Purpose

Sport Tournament Management owns Sport Team configuration, Captain
assignment, eligibility, credit preparation, readiness, and future
Competition setup.

It does not own live Sport Auction execution.

### Recommended Final Structure

```text
Sport Tournament Management
|-- Overview
|-- Teams
|-- Captains
|-- Eligibility
|-- Budgets
|-- Auction Pool
|-- Auction Settings
|-- Readiness
|-- Rosters
|-- Auction Results
|-- Audit
`-- Settings
```

When Phase 5 begins, competition setup should be a distinct contextual area:

```text
Sport Tournament
|-- Team Allocation
|   `-- existing management sections
`-- Competition
    `-- Competition Center
```

Competition tabs should not simply be appended to the current Auction setup
tabs.

### What Remains

- Tournament identity, division, and eligibility rule.
- Sport Team names and status.
- Captain assignment.
- Eligibility diagnostics.
- Credit allocation and adjustments.
- Pool generation.
- Auction timer and increment settings.
- Readiness blockers.
- Final Sport Team rosters.
- Auction allocation results.
- Audit.

### What Moves Elsewhere

- Live current participant.
- Timer.
- Captain bid action.
- Manager pause, resume, extend, sell, and unsold actions.
- Live Team credit monitoring.
- Live bid stream.
- Re-auction execution during an active Auction.

These move to the Sport Auction Arena.

## 9. Sport Auction Arena Philosophy

### Decision

Sport Auction should remain a dedicated route and evolve into a dedicated
Arena shell.

It should not be embedded in Sport Tournament Management.

### Arena Contents

- Tournament, Festival Team, Sport, and division context.
- Auction state and connection status.
- Current participant.
- Base credits.
- Current credits.
- Next credits.
- Leading Sport Team.
- Timer.
- Bid count and attempt.
- Captain Team identity.
- Captain one-click bid.
- Team credit balances.
- Manager participant selection.
- Manager lifecycle and finalization actions.
- Available and unsold queue controls.
- Live bid stream.
- Compact Team allocations.
- Compact recent outcomes.

### Must Not Appear

- Sport Team rename forms.
- Captain assignment controls.
- Credit-distribution configuration.
- Eligibility diagnostics.
- Pool generation configuration.
- Timer and increment configuration.
- General readiness blockers.
- Tournament settings.
- Full audit log.
- Competition setup.
- Fixture and match content.

### Desktop Wireframe

```text
+--------------------------------------------------------------------+
| Sport Auction | LIVE | Connected | Captain Team | Exit            |
+-----------------------------------------+--------------------------+
| CURRENT PARTICIPANT                     | TEAM CREDITS             |
| Employee identity                       | Team A remaining         |
|                                         | Team B remaining         |
| Base | Current | Next | Leading Team    | Team C remaining         |
|                                         |                          |
|                  TIMER                  | MY SPORT TEAM            |
|                                         | Credits and roster       |
| [PLACE BID] / [MANAGER ACTIONS]         |                          |
+-----------------------------------------+--------------------------+
| LIVE BID STREAM                         | AVAILABLE / UNSOLD       |
+-----------------------------------------+--------------------------+
| Compact Recent Allocations                                         |
+--------------------------------------------------------------------+
```

## 10. Future Competition Engine Architecture

### Core Principle

Auction is allocation. Competition is play.

They may share Festival, Employee, Sport Team, and authorization context, but
they must not share page ownership or lifecycle controls.

### Recommended Product Boundary

```text
Sport Tournament Management
-> Sport Auction Arena
-> Competition Center
-> Match Center
```

### Competition Center

Purpose:

- Configure competition formats.
- Generate or approve entries.
- Build stages.
- Generate fixtures.
- Manage schedule and venues.
- Review standings and progression.

Recommended sections:

```text
Competition Overview
Entries
Format and Rules
Stages
Fixtures
Schedule
Standings
Playoffs
Results
Audit
Settings
```

### Fixtures

Fixtures should have a dedicated planning view:

- Competition and stage filter.
- Scheduled and unscheduled matches.
- Venue and time assignments.
- Conflict warnings.
- Publish state.

Fixtures should not appear inside Auction pages.

### Matches

Future Match Center responsibilities:

- Match identity and participants.
- Venue and schedule.
- Live status.
- Score entry.
- Officials.
- Result finalization.
- Correction and approval history.

The Match Center should use a focused live layout when scoring is active,
similar in philosophy to an Auction Arena but with match-specific controls.

### Standings

Standings should be a read-focused Competition view:

- Rank.
- Played.
- Won/lost/drawn.
- Points.
- Tie-break metrics.
- Qualification status.

Standings must be derived from approved results, not edited as primary data.

### Playoffs And Finals

Playoffs should be represented as stages, not special hardcoded pages.

The UI may provide bracket views for:

- Quarterfinals.
- Semifinals.
- Finals.

Progression must remain format-driven so new sports do not require navigation
redesign.

### Separation Rules

- Auction results create rosters, not match standings.
- Competition entries derive from eligible final rosters.
- Match results do not modify Auction history.
- Competition status does not reuse Auction status.
- Auction audit and Competition audit remain separately understandable.
- Phase 5 should add contextual Competition navigation, not more Auction
  workspace tabs.

## 11. Role-Based Experience Strategy

### Admin

#### Landing Page

Action-oriented platform command center.

#### Primary Actions

- Resolve Festival setup blockers.
- Open or resume live Auctions.
- Finalize pending rounds.
- Review Sport Tournament readiness.
- Future: publish fixtures and approve results.

#### Navigation Priorities

```text
Dashboard
Festivals
Auctions
Sport Tournaments
Competitions
Employees
```

#### Auction Discovery

- Live and paused Auctions appear first.
- Pending finalization is treated as urgent.
- Ready but not launched Auctions appear as next actions.

#### Competition Discovery

- Competitions needing setup.
- Unscheduled fixtures.
- Results awaiting approval.
- Current live matches.

### Festival Team Owner

#### Landing Page

Owned Festival Team command center.

#### Primary Actions

- Join Main Festival Auction.
- Review purse and Festival roster.
- Create/manage Sport Tournaments.
- Launch/manage Sport Auctions.
- Future: review fixtures and Team results.

#### Navigation Priorities

```text
Dashboard
My Auctions
My Festival Team
Sport Tournaments
Competitions
```

#### Auction Discovery

Show only relevant assigned or manageable Auctions by default.

#### Competition Discovery

Show competitions containing the Owner's Festival Team or Sport Teams.

### Sport Captain

#### Landing Page

My Sport Team command center.

#### Primary Actions

- Join active Sport Auction.
- Review credits and roster.
- Future: review next fixture and match details.

#### Navigation Priorities

```text
Dashboard
My Auctions
My Sport Teams
Schedule
Competitions
```

Navigation should be assignment-aware even when the global User role is
`team_owner` or `spectator`.

#### Auction Discovery

Active Captain assignments should directly expose the relevant Arena.

#### Competition Discovery

Show competitions, fixtures, and results for the Captain's Sport Teams.

### Spectator

#### Landing Page

Live Festival experience.

#### Primary Actions

- Watch live Auction.
- Review Auction results.
- Future: watch or follow matches.
- Review fixtures and standings.

#### Navigation Priorities

```text
Dashboard
Watch Live
Competitions
Results
```

#### Auction Discovery

Use one live directory with Festival, Sport, and legacy type labels.

#### Competition Discovery

Show current matches, upcoming fixtures, standings, playoffs, and finals.

## 12. Mobile And Tablet Strategy

### Current Mobile Issues

- Horizontal tabs expose internal information architecture rather than user
  priorities.
- Full AppShell navigation competes with live Auction content.
- Long Team summaries and histories push primary actions below the fold.
- Management forms and live controls share responsive rules.
- Role-specific urgent actions are not persistently visible.

### Platform-Wide Mobile Principles

- Use one document scroll per primary page.
- Avoid nested vertical scrolling.
- Use horizontal scrolling only for tabs where unavoidable and true data
  tables.
- Prioritize current state and primary action over summaries.
- Move secondary management actions into dialogs, drawers, or dedicated
  sections.
- Do not solve layout defects with fixed heights or arbitrary offsets.
- Preserve accessible labels and touch targets.

### Mobile Arena

Priority:

1. Status and connection.
2. Current participant.
3. Timer.
4. Current and next value.
5. Primary bid/finalization action.
6. Own Team balance.
7. Live bid stream.
8. Team summaries and queues.

The primary live action may use a bottom action bar, provided the page reserves
space and no content is obscured.

### Tablet Arena

Use two columns where space permits:

- Main live state and controls.
- Team balances and live bid stream.

Queues and recent results appear below.

### Management Workspaces

- Replace wide tab sets with grouped contextual navigation when necessary.
- Stack forms vertically.
- Use cards for summaries and tables only for dense comparison.
- Keep Control Center actions above management navigation.

### Future Competition Mobile

- Personal schedule and next fixture should take priority.
- Standings should use compact responsive tables or ranked cards.
- Match scoring requires its own focused mobile workflow.
- Brackets may use horizontal pan, but the whole page must not become a
  horizontally scrolling canvas.

## 13. Route Strategy

### Current Routes

Legacy:

```text
/dashboard
/start-live-auction
/live-auction
/spectator-live-auction
```

Festival:

```text
/festivals
/festivals/:festivalId
/festival-auctions
/festivals/:festivalId/live-auction
```

Sport:

```text
/sport-tournaments
/sport-tournaments/:sportTournamentId
/sport-tournaments/:sportTournamentId/auction
```

### Future Route Principles

- Routes should represent product boundaries.
- Management and live execution must have separate canonical routes.
- Role-specific behavior should be capability-driven inside one canonical
  resource route where possible.
- Avoid separate Admin, Owner, and Spectator URLs for the same live event.
- Old URLs remain compatibility redirects during migration.

### Proposed Product Routes

```text
/dashboard

/festivals
/festivals/:festivalId/manage

/auctions
/auctions/festivals/:festivalId
/auctions/sports/:sportTournamentId

/sport-tournaments
/sport-tournaments/:sportTournamentId/manage

/competitions
/competitions/:competitionId
/matches/:matchId
/schedule

/employees
```

Optional presentation routes:

```text
/auctions/festivals/:festivalId/display
/auctions/sports/:sportTournamentId/display
```

### Role-Specific Routes

Avoid permanent role-specific route duplication such as:

```text
/admin/auction
/owner/auction
/spectator/auction
```

Use one Arena route and render capabilities returned by the backend.

Personalized directory query modes may be used:

```text
/auctions?view=mine
/auctions?view=live
/competitions?view=mine
/schedule?view=mine
```

### Redirect Strategy

```text
/festival-auctions
-> /auctions?type=festival

/festivals/:festivalId/live-auction
-> /auctions/festivals/:festivalId

/sport-tournaments/:sportTournamentId/auction
-> /auctions/sports/:sportTournamentId

/festivals/:festivalId
-> /festivals/:festivalId/manage

/sport-tournaments/:sportTournamentId
-> /sport-tournaments/:sportTournamentId/manage
```

Legacy routes require a separate deprecation decision because the legacy
Auction domain remains operational.

### Backward Compatibility

- Keep old routes as replace redirects for at least one stable release.
- Preserve deep links and current query parameters.
- Update internal links before removing old page components.
- Do not change API or Socket contracts merely to rename frontend routes.
- Avoid mounting old and new live components simultaneously.

## 14. Dashboard Redesign Planning

This section defines goals only. A dedicated Dashboard architecture document
should precede implementation.

### Admin Dashboard Goals

- Show operational priorities across all domains.
- Distinguish setup blockers from live emergencies.
- Surface active and paused Auctions.
- Show pending finalization.
- Summarize Festival and Sport readiness.
- Prepare for future fixture and result-approval tasks.

### Owner Dashboard Goals

- Center the assigned Festival Team.
- Show Main Auction state and purse.
- Show managed Sport Tournaments.
- Show Sport Auction launch/finalization tasks.
- Prepare for future Team fixtures and outcomes.

### Captain Dashboard Goals

- Detect active Captain assignments.
- Show assigned Sport Team, credits, and roster.
- Provide direct Sport Auction entry.
- Prepare for personal fixtures and match information.

### Spectator Dashboard Goals

- Prioritize Live Now.
- Show upcoming Auctions and future matches.
- Show recently completed results.
- Avoid management terminology and disabled controls.

### Dedicated Dashboard Document Required

The later Dashboard architecture document should define:

- Summary/read-model contract.
- Priority ranking rules.
- Card taxonomy.
- Empty states.
- Cross-domain filtering.
- Notification and alert behavior.
- Personal assignment resolution.
- Mobile dashboard composition.
- Legacy-domain transition.

## 15. Auction Arena Redesign Planning

This master plan confirms the dedicated Arena direction but does not replace a
detailed Arena implementation specification.

### High-Level Requirements

- One canonical Arena per Auction scope.
- Capability-derived controls.
- Reduced Arena shell.
- Server-authoritative timer and revision handling.
- Current participant and primary action above secondary content.
- Explicit connection/recovery state.
- Compact live bid stream.
- Management and full reporting excluded.
- Mobile primary action remains accessible.
- Optional presentation mode.

### Dedicated Arena Document Required

`PHASE_4E_AUCTION_ARENA_ARCHITECTURE.md` should remain the detailed source for:

- Arena route migration.
- Festival and Sport screen composition.
- Shared Arena primitives.
- Socket lifecycle.
- Responsive wireframes.
- Presentation mode.
- History and queue boundaries.
- Phased Arena rollout.

Before implementation, it should be reconciled with this master plan if later
Dashboard or Competition decisions alter entry points.

## 16. Component Reuse Analysis

### Reusable Platform Components

- `AppShell`, after navigation becomes capability-aware.
- `BrandLogo`
- `AuthLayout`
- `RouteGuards`, for UX only.
- Shared Material UI cards, dialogs, tables, tabs, and alerts.
- Authenticated Axios client.
- Authenticated Socket.IO singleton.

### Reusable Auction Components

- `VisualTimer`
- Auction synchronization helpers
- Server-clock offset calculation
- Revision rejection logic
- Festival Team purse summaries
- Sport Team credit summaries
- Bid history presentation
- Results and audit presentation
- Confirmation dialog patterns

### Festival Components

Reusable with refactoring:

- `FestivalControlCenter`
- `FestivalSetupWizard`
- `FestivalAuctionSetup`
- `FestivalTeamsDirectory`
- `FestivalBidHistory`
- `FestivalHistory`
- `FestivalReadiness`
- `FestivalOverview`

`MainFestivalAuction` should be decomposed into data/synchronization logic and
Arena presentation sections.

### Sport Components

Reusable with refactoring:

- `SportTournamentControlCenter`
- Sport readiness and eligibility presentation.
- Budget and Pool cards.
- `SportAuctionArena` live sections.

`SportAuctionArena` should be decomposed before substantial Competition Engine
work so Auction-specific state does not leak into future competition pages.

### Dashboard Widgets

Potential shared widget categories:

```text
UrgentActionCard
LiveEventCard
ReadinessCard
AssignmentCard
UpcomingEventCard
RecentOutcomeCard
EmptyState
```

These should accept domain-neutral display data while navigation and action
authorization remain domain-specific.

### Navigation Components

Potential shared components:

```text
PrimaryNavigation
ContextNavigation
CapabilityMenu
ArenaHeader
Breadcrumbs
MobileNavigationDrawer
```

### Workspace Components

Potential shared patterns:

- Control Center
- Section navigation
- Readiness blockers
- Setup wizard
- Configuration status
- Audit timeline
- Responsive data table

Do not create one generic mega-workspace component. Reuse structural patterns
while preserving Festival, Sport, and Competition domain language.

### Refactoring Opportunities

- Extract Auction room lifecycle into domain hooks.
- Extract shared Arena presentation primitives.
- Separate data hooks from large page components.
- Replace role-only navigation with capability summaries.
- Introduce summary DTOs before adding more dashboard fan-out.
- Preserve Festival and Sport business-rule separation.

## 17. UX Standards

### Product Structure

1. Auction must never be mixed with configuration screens.
2. Auction must never be hidden inside deeply nested tabs.
3. Competition management must remain separate from Auction management.
4. Live Match operation must remain separate from Competition configuration.
5. Historical reporting must not dominate live execution.

### Discoverability

6. Live experiences must be immediately discoverable.
7. Paused or pending-finalization events must be treated as urgent.
8. Every role landing page must expose the user's next primary action.
9. Users must not need domain knowledge to find an active Auction.

### Roles And Capabilities

10. Frontend global role checks are UX only.
11. Navigation must reflect server-derived assignments and capabilities.
12. Owner and Captain identity must always show the affected Team.
13. Disabled controls must not be presented as authorization.
14. Spectators should receive viewer experiences, not disabled management
    screens.

### Live Experiences

15. Current participant, current value, next value, timer, and primary action
    must remain visually dominant.
16. Server state is authoritative.
17. Connection and recovery state must be visible.
18. Client timers must derive from server deadlines.
19. Irreversible finalization requires explicit confirmation.

### Workspaces

20. Workspaces must grow naturally with content.
21. Avoid fixed-height and nested vertical scrolling containers.
22. Use internal scrolling only for true tables or bounded overlays.
23. Control Center, navigation, and content must remain separate flow regions.
24. Only active heavy sections should mount.

### Mobile

25. Mobile prioritizes primary action over secondary summaries.
26. Touch targets must remain usable during live activity.
27. Fixed actions must reserve layout space and never cover content.
28. Tables may scroll horizontally; entire pages should not.

### Terminology

29. `Festival Team` and `Sport Team` must never be used interchangeably.
30. `Purse` means Festival financial budget.
31. `Credits` means Sport allocation units.
32. `Auction Results` and future `Match Results` must remain distinct.
33. `Auction Settings` must not be labeled simply `Auction` inside management.

### Scalability

34. Dashboard and directory summaries should use purpose-built read models.
35. New features should not add unbounded frontend request fan-out.
36. Lists should support filtering and eventual pagination.
37. Product navigation should scale by context, not by adding top-level links.

## 18. Risks

### Navigation Risks

- Renaming and consolidating destinations may temporarily confuse existing
  users.
- A universal Auctions destination could become crowded without strong
  filtering.
- Contextual navigation may hide features if capability summaries are stale.

Mitigation:

- Use explicit labels and compatibility redirects.
- Default to personalized views.
- Preserve direct deep links.
- Obtain capability data from authoritative backend summaries.

### Migration Risks

- Old bookmarks and documentation may reference removed routes.
- Old and new Arena routes could create duplicate Socket subscriptions.
- Incremental migration could leave duplicated navigation.

Mitigation:

- Use replace redirects.
- Update internal links first.
- Ensure only one live component mounts.
- Remove obsolete navigation in the same release as canonical replacements.

### Role Risks

- Global `team_owner` may be mistaken for Festival ownership.
- Captains may be hidden because Captain is not a global role.
- One Employee may have Owner, Captain, Admin, and viewer capabilities.

Mitigation:

- Build capability-aware summaries.
- Allow one user to hold multiple contextual actions.
- Do not force users into one exclusive frontend persona.

### Mobile Risks

- Bottom action bars may obscure content.
- Dense Team summaries may still create long pages.
- Live dialogs may interrupt time-sensitive actions.

Mitigation:

- Reserve action-bar space.
- Collapse secondary content.
- Keep bid action direct.
- Use confirmations only for irreversible manager operations.

### Scalability Risks

- Dashboard aggregation can create severe API fan-out.
- Large Festivals will stress unpaginated lists.
- Socket and timer infrastructure is still single-process.
- Competition scheduling and standings will add expensive derived queries.

Mitigation:

- Plan summary endpoints/read models.
- Add pagination and indexed filters.
- Keep live coordination hardening on the production roadmap.
- Use asynchronous projections for future standings and reporting.

### Competition Engine Integration Risks

- Adding Competition tabs to existing workspaces would recreate current
  overload.
- Tournament terminology may collide with Sport Tournament and Competition.
- Auction outcomes could be incorrectly treated as competition results.
- Sport-specific scoring could leak into generic navigation.

Mitigation:

- Establish Competition Center and Match Center boundaries first.
- Use explicit terminology.
- Keep allocation and play lifecycles separate.
- Make formats configuration-driven.

## 19. Recommended Product Structure

### Complete Product Hierarchy

```text
AuctionArena
|
|-- Dashboard
|   |-- Urgent Actions
|   |-- Live Now
|   |-- My Assignments
|   |-- Upcoming
|   `-- Recent Outcomes
|
|-- Employees
|   |-- Directory
|   |-- Import
|   `-- User Linking
|
|-- Festivals
|   |-- Festival Directory
|   `-- Festival Management
|       |-- Setup
|       |-- Participants
|       |-- Festival Teams
|       |-- Owners and Retentions
|       |-- Auction Preparation
|       |-- Rosters
|       |-- Results and History
|       `-- Audit and Settings
|
|-- Auctions
|   |-- My Active Auctions
|   |-- Live Auctions
|   |-- Festival Auction Arena
|   |-- Sport Auction Arena
|   `-- Completed Auction Results
|
|-- Sport Tournaments
|   |-- Tournament Directory
|   `-- Sport Tournament Management
|       |-- Teams and Captains
|       |-- Eligibility
|       |-- Credits and Pool
|       |-- Auction Settings and Readiness
|       |-- Rosters and Results
|       `-- Audit and Settings
|
|-- Competitions
|   |-- Competition Directory
|   |-- Competition Center
|   |   |-- Entries
|   |   |-- Formats and Stages
|   |   |-- Fixtures and Schedule
|   |   |-- Standings and Progression
|   |   `-- Results and Audit
|   |
|   `-- Match Center
|       |-- Live Match
|       |-- Score Entry
|       |-- Result Approval
|       `-- Match History
|
`-- Personal Views
    |-- My Festival Team
    |-- My Sport Teams
    |-- My Auctions
    |-- My Schedule
    `-- My Results
```

### Reasoning

- Dashboard becomes the cross-domain command center.
- Festivals own primary event and roster management.
- Auctions become a first-class live product.
- Sport Tournaments own Team allocation preparation.
- Competitions own play, scheduling, progression, and results.
- Personal views derive from assignments without creating new global roles.
- The hierarchy can absorb new sports and formats without adding top-level
  navigation for each one.

## 20. Implementation Roadmap

This roadmap is planning only.

### Phase 4E-A: Product Structure

- Approve terminology and product hierarchy.
- Confirm Management, Arena, Competition, and Match boundaries.
- Define capability-aware navigation requirements.
- Define legacy-domain transition policy.

### Phase 4E-B: Navigation

- Design global and contextual navigation.
- Define assignment-aware visibility rules.
- Define route migration and redirect behavior.
- Specify mobile navigation.

### Phase 4E-C: Dashboard

- Create dedicated Dashboard architecture.
- Define role/capability-specific command centers.
- Define summary/read-model requirements.
- Define urgent-action ranking and empty states.

### Phase 4E-D: Festival Auction Arena

- Finalize Festival Arena composition.
- Separate live state from Festival Management.
- Define Arena shell and responsive behavior.
- Preserve current Auction rules and synchronization.

### Phase 4E-E: Festival Workspace Cleanup

- Remove embedded live Auction ownership.
- Consolidate setup and management sections.
- Preserve results, bid history, audit, and configuration recovery.
- Align Control Center actions with the Arena.

### Phase 4E-F: Sport Tournament Workspace

- Clarify Team allocation management.
- Rename Auction configuration to Auction Settings.
- Separate live execution.
- Prepare contextual entry to Competition Center.

### Phase 4E-G: Sport Auction Arena

- Refactor the existing dedicated Arena.
- Introduce focused Arena shell.
- Preserve manager, Captain, and spectator capability behavior.
- Optimize mobile bid and finalization actions.

### Phase 4E-H: Role Experience Optimization

- Add Owner and Captain assignment-aware landing content.
- Create unified Auction discovery.
- Create spectator Live Now experience.
- Prepare personal schedule and competition discovery.

### Phase 5-A: Competition Foundation

- Define Competition Center architecture.
- Add format, entry, stage, and progression concepts.
- Keep Auction boundaries unchanged.

### Phase 5-B: Fixtures And Scheduling

- Add fixture planning and conflict-aware scheduling experience.
- Add personal schedule views.

### Phase 5-C: Match Center

- Add focused match operation and scoring experiences.
- Separate live scoring from competition configuration.

### Phase 5-D: Results And Standings

- Add result approval, standings, brackets, playoffs, and finals.
- Add spectator and participant result experiences.

## Final Recommendation

Complete the Phase 4E product-structure, navigation, Dashboard, Workspace, and
Arena redesign before implementing the Phase 5 Competition Engine.

Phase 5 will introduce more lifecycle stages, operational roles, live
experiences, and reporting surfaces. Building it on the current incremental
navigation and workspace architecture would multiply existing discoverability,
layout, and role-confusion problems.

The required product sequence is:

```text
Clarify Product Structure
-> Redesign Navigation
-> Redesign Dashboard
-> Separate Management and Live Arenas
-> Stabilize Role Experiences
-> Add Competition Center
-> Add Match Center
```

This order preserves the implemented Festival and Sport Auction business rules
while creating a scalable user experience for the full corporate Sports
Festival platform.
