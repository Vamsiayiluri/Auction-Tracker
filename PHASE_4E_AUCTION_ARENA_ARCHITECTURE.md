# Phase 4E Auction Arena UX Architecture & Navigation Redesign

## Status

Architecture and planning only. No implementation, route, API, migration, or
UI changes are included.

## 1. Current User Journey

### Festival Auction

#### Admin

1. Open **Sports Festivals**.
2. Select a Festival.
3. Enter the Festival Workspace.
4. Switch to Operations View.
5. Find the Auction tab among administrative tabs.
6. Use `MainFestivalAuction` inside the workspace.

Alternative:

1. Open **Festival Auctions**.
2. Select a Festival.
3. Enter `/festivals/:festivalId/live-auction`.

The live-auction page treats every non-owner as a spectator, so an Admin
entering this route receives spectator-oriented tabs rather than Admin
controls.

#### Festival Team Owner

1. Open **Festival Auctions**.
2. Select a Festival.
3. Enter `/festivals/:festivalId/live-auction`.
4. The page normally opens the Auction tab automatically when live or paused.

The owner still passes through Overview, Teams, Auction, and Bid History
navigation.

#### Spectator

1. Open **Festival Auctions**.
2. Select a Festival.
3. Enter the Festival viewer page.
4. Select Live Auction from Overview, Teams, Results, and History tabs.

#### Friction

- The same live component is embedded in two different shells.
- Admin controls are easiest to find inside the management workspace.
- The dedicated Festival route is not actually a dedicated Arena.
- Owner and spectator entry points use management-style tabs.
- Completed history and live bidding compete for page space.
- Admin behavior on the viewer route is ambiguous.

### Sport Auction

#### Admin

1. Open **Sport Tournaments**.
2. Select a tournament.
3. Enter the Sport Tournament Workspace.
4. Complete Teams, Captains, Budgets, Pool, Readiness, and Auction
   configuration.
5. Launch from the Control Center.
6. Navigate to `/sport-tournaments/:sportTournamentId/auction`.

#### Festival Team Owner

A Team Owner may manage Sport Tournaments when backend assignment checks
authorize management.

1. Open **Sport Tournaments**.
2. Select a tournament.
3. Enter its management workspace.
4. Launch or open the Auction Arena when authorized.

#### Sport Captain

Captain is an assignment-derived capability, not a global User role.

1. Log in using a linked User account.
2. Open **Sport Tournaments**.
3. Find the relevant tournament.
4. Open the tournament or its active Auction.
5. Backend state exposes `canBid` and assigned Sport Team identity.

The global navigation still describes this person as a Team Owner or
Spectator, depending on their User role.

#### Spectator

1. Open **Sport Auctions** in the navigation.
2. Arrive at the general Sport Tournament directory.
3. Select an active tournament.
4. Enter the Sport Auction Arena.

#### Friction

- The directory mixes tournament creation, setup, and live viewing.
- Captain identity is not represented in navigation.
- Spectators enter through a management-oriented directory.
- The workspace still contains an Auction tab, although it only configures
  auction settings.
- Active and completed tournaments have different automatic destinations.
- Users must understand the distinction between Festival Team Owner, Sport
  manager, and Sport Captain.

## 2. Problems With Current Architecture

### Navigation Complexity

- Legacy, Festival, and Sport Auctions have separate navigation concepts.
- Run Auction, Live Auction, Festival Auctions, and Sport Tournaments overlap
  semantically.
- Management objects and live experiences share directory pages.

### Discoverability

- Festival live bidding is one tab among many administrative sections.
- Sport setup has an Auction tab that is configuration rather than the live
  Arena.
- There is no single place showing all live Auctions relevant to the current
  user.

### Scrolling And Workspace Overload

- Auction interfaces render alongside setup, reporting, and administration.
- Large queues, Team summaries, histories, and controls create long pages.
- Important live information can move below the fold.
- Workspace layout defects directly affect the live experience.

### Role Confusion

- Global `team_owner` does not prove Festival ownership or Sport Captain
  authority.
- Sport Captain is not a global role.
- Admins entering the Festival viewer route receive spectator-style
  navigation.
- Frontend labels do not consistently reflect server-derived capabilities.

### Auction Visibility

- Active Auctions are not globally promoted.
- Dashboard cards focus mainly on legacy Tournaments.
- Festival and Sport Auctions require separate discovery paths.
- Paused Auctions may not appear as urgent live activity.

### Mobile Issues

- Horizontal tab bars consume limited width.
- Auction controls compete with management navigation.
- Long Team and history sections push the active participant and bid action
  away.
- A critical bid action should not depend on scrolling through secondary
  content.

### Spectator Issues

- Spectators navigate through management terminology.
- No unified Watch Live destination exists.
- Viewer pages include tabs that dilute the live event.
- Connection state and live status are not consistently represented across
  domains.

## 3. Industry Review

### Fantasy Draft Systems

Fantasy draft products treat the draft as a distinct event rather than a
settings tab.

Common patterns:

- Dedicated draft room.
- Highly visible timer and current turn.
- Commissioner controls separated from participant controls.
- Draft queue or candidate list placed beside the live action.
- Big-screen or presentation mode.
- History remains visible but secondary.

Sleeper separates its draftboard from league management, supports
commissioner-controlled start and pause behavior, and provides a large-screen
draftboard mode. Its web layout places the draft queue beside the active draft
experience.

References:

- [Sleeper draft timer](https://support.sleeper.com/en/articles/4029085-how-does-the-draft-timer-work)
- [Sleeper draft queue](https://support.sleeper.com/en/articles/3989685-watch-list-vs-draft-queue)
- [Sleeper big-screen draftboard](https://support.sleeper.com/en/articles/2083195-how-to-cast-your-draft-to-the-big-screen)

### Auction Platforms

Live auction products emphasize:

- Current item.
- Current price.
- Bid action.
- Auction deadline.
- Highest-bid state.
- Personal bidding activity.
- Clear separation between active bids and historical purchases.

eBay exposes active bids and offers as a dedicated user activity area rather
than placing them inside seller or account configuration.

Reference:

- [eBay auction bidding](https://www.ebay.com/help/buying/bidding/bidding?id=4003)

### Trading Terminals

Trading terminals organize the screen around one active market:

- Primary market or asset context.
- Order book.
- Order-entry panel.
- Live trade history.
- Open positions or orders.
- Persisted view preferences.

Coinbase Advanced separates the order panel, order book, live trade history,
and historical views while keeping the active trading decision central.

Reference:

- [Coinbase Advanced dashboard overview](https://help.coinbase.com/en/coinbase/trading-and-funding/advanced-trade/dashboard-overview)

### Applicable Principles

1. Live activity deserves a dedicated route and shell.
2. The primary decision and action must remain visible.
3. Management configuration should not compete with live execution.
4. Role-specific controls should derive from server capabilities.
5. History should support the live event without dominating it.
6. A presentation or spectator mode is valuable for projected displays.
7. Repeated live actions should require minimal navigation.

## 4. Proposed Architecture

Separate the application into two product surfaces.

### Auction Arena

Purpose:

- Run, participate in, or watch an Auction.
- Optimize for real-time state and rapid decisions.
- Use a focused shell with minimal global navigation.

Domains:

- Festival Auction Arena.
- Sport Auction Arena.
- Legacy Auction Arena should eventually adopt the same navigation model.

### Management Workspace

Purpose:

- Configure entities.
- Resolve readiness blockers.
- Manage participants, Teams, budgets, owners, Captains, pools, and settings.
- Review complete history and audits.
- Launch or open an Arena through prominent actions.

### Target Hierarchy

```text
Application
|-- Auctions
|   |-- Live Auctions
|   |-- My Active Auctions
|   |-- Festival Auction Arena
|   `-- Sport Auction Arena
|
|-- Festival Management
|   |-- Setup
|   |-- Teams and Owners
|   |-- Auction Preparation
|   `-- Reports and Audit
|
`-- Sport Tournament Management
    |-- Teams and Captains
    |-- Budgets and Pool
    |-- Readiness
    `-- Reports and Settings
```

## 5. Festival Auction Arena

### Purpose

Provide one focused experience for running, bidding in, or watching the Main
Festival Auction.

### Users

- Admin: lifecycle, participant selection, finalization, re-auction.
- Festival Team Owner: one-click bidding and Team purse context.
- Spectator: read-only live viewing.
- Any capability must remain server-derived.

### Proposed Route

```text
/auctions/festivals/:festivalId
```

Optional presentation route:

```text
/auctions/festivals/:festivalId/display
```

### Entry Points

- Global Auctions navigation.
- Live Auctions directory.
- Festival management Control Center.
- Admin dashboard active-auction card.
- Owner My Active Auctions.
- Spectator Watch Live.
- Deep links from notifications.

### Arena Navigation

Minimal Arena header:

- Auction name and type.
- Live, paused, pending, or completed status.
- Connection state.
- Role context and assigned Team.
- Exit to Festival Management when authorized.
- Results/history link.
- Optional display mode.

No workspace tab bar.

### Arena Contents

- Current participant identity and relevant profile.
- Base price.
- Current bid.
- Next bid.
- Leading Team.
- Server-authoritative timer.
- Auction lifecycle status.
- Live bid stream.
- Team purse summaries.
- Owner's Team and remaining purse.
- Owner bid action.
- Admin pause, resume, extend, sell, unsold, and complete actions.
- Admin participant selection.
- Admin available and unsold queues.
- Re-auction controls.
- Connection and synchronization state.
- Small recent-results strip.

### Must Not Appear

- Employee import.
- Participant CRUD.
- Sport registration administration.
- Team creation or renaming.
- Owner assignment.
- Retention configuration.
- Budget configuration.
- Configuration unlock controls.
- Setup wizard.
- Full audit log.
- Full historical reports.
- Festival settings.
- Unrelated Sport Tournament management.

## 6. Sport Auction Arena

### Purpose

Provide a focused live allocation-credit Auction for Sport Team construction.

### Users

- Tournament manager: assignment-authorized Festival Team Owner or Admin.
- Sport Captain: assignment-derived bidder.
- Spectator: read-only viewer.

### Proposed Route

```text
/auctions/sports/:sportTournamentId
```

Optional presentation route:

```text
/auctions/sports/:sportTournamentId/display
```

### Entry Points

- Global Auctions navigation.
- Sport Tournament Control Center.
- Sport Tournament directory.
- Captain My Active Auctions.
- Spectator Watch Live.
- Active-auction notifications.

### Arena Navigation

- Tournament, Festival Team, and Sport identity.
- Auction status.
- Live connection status.
- Assigned Sport Team for Captains.
- Management Workspace link when authorized.
- Results/history link.
- Optional display mode.

### Arena Contents

- Current participant.
- Base credits.
- Current credits.
- Next credits.
- Leading Sport Team.
- Timer.
- Bid count and attempt number.
- Team credit balances.
- Captain bid control.
- Manager lifecycle and finalization controls.
- Participant selection.
- Available and unsold queues.
- Re-auction controls.
- Live bid stream.
- Team allocation summaries.
- Small recent-results strip.

### Must Not Appear

- Sport Team rename forms.
- Captain assignment.
- Credit distribution configuration.
- Eligibility diagnostics.
- Pool generation configuration.
- Auction timer or increment configuration.
- Readiness blockers unrelated to active execution.
- Tournament settings.
- Full audit history.
- Festival participant management.

## 7. Festival Management Workspace

### Final Structure

```text
Festival Management
|-- Overview
|-- Participants
|-- Teams
|-- Owners
|-- Retentions
|-- Auction Preparation
|   |-- Budget
|   |-- Pool
|   `-- Readiness
|-- Results
|-- Bid History
|-- Audit
`-- Settings
```

### Behavior

- Before launch, the workspace emphasizes setup and readiness.
- After launch, it remains available for permitted administrative corrections.
- A prominent `Open Auction Arena` action replaces the embedded live Auction
  tab.
- Results, bid history, and audit remain management/reporting functions.
- The setup wizard may remain for initial configuration.
- Auction configuration belongs under Auction Preparation, not a live Auction
  tab.

## 8. Sport Tournament Management Workspace

### Final Structure

```text
Sport Tournament Management
|-- Overview
|-- Teams
|-- Captains
|-- Budgets
|-- Eligibility
|-- Pool
|-- Readiness
|-- Auction Settings
|-- Results and History
|-- Audit
`-- Settings
```

### Behavior

- Remove the ambiguous `Auction` tab.
- Rename its current configuration content to `Auction Settings`.
- Add a prominent `Open Auction Arena` action when active or completed.
- Add `Launch Auction` only when server readiness is READY.
- Spectators should not use this workspace as their primary entry path.
- Captain users should enter the Arena directly when an Auction is active.

## 9. Navigation Redesign

### Top Navigation

Recommended primary destinations:

```text
Dashboard
Auctions
Festivals
Sport Tournaments
Employees
```

Role and assignment determine which items appear.

### Admin

```text
Dashboard
Auctions
Festival Management
Sport Tournaments
Employees
```

Quick actions:

- Run active Auction.
- Resume paused Auction.
- Resolve readiness blockers.
- Review completed results.

### Festival Team Owner

```text
Dashboard
My Auctions
Festival Teams
Sport Tournaments
```

Quick actions:

- Join Main Festival Auction.
- Manage authorized Sport Tournaments.
- Review Team roster and purse.

### Sport Captain

Captain is a capability, not a new global role.

Navigation should use server-derived assignments to expose:

```text
Dashboard
My Auctions
My Sport Team
```

Primary quick action:

- `Join Sport Auction`.

### Spectator

```text
Dashboard
Watch Auctions
Results
```

Management navigation should be hidden unless separately authorized.

### Arena Shell

The Arena should use a reduced shell:

- Brand.
- Auction identity.
- Status and connection.
- Assigned Team.
- Exit/back action.
- User menu.

The full management navigation should not consume horizontal space during live
bidding.

## 10. Dedicated Live Auction Entry Points

### Live Auctions Page

Create one unified product-level directory:

```text
/auctions
```

It should aggregate:

- Legacy Auctions.
- Festival Main Auctions.
- Sport Auctions.

Filters:

- Live.
- Paused.
- Upcoming/Ready.
- Completed.
- Festival.
- Sport.
- Legacy.

### My Active Auctions

Use this as the default personalized view within `/auctions`, not a separate
duplicated page.

It should show:

- Auctions the user can manage.
- Festival Auctions where the user is the active Owner.
- Sport Auctions where the user is an active Captain.
- Auctions currently requiring Admin action.

### Watch Auction Page

Use the same `/auctions` directory with spectator-oriented labels and filters.

A separate `/watch-auctions` route would duplicate data and navigation. It may
exist only as a redirect to:

```text
/auctions?view=live
```

## 11. Role-Specific Experiences

### Admin

Landing page:

- Operational dashboard with active and blocked Auctions first.

Primary actions:

- Open Arena.
- Resume paused Auction.
- Resolve readiness.
- Review pending finalization.

Entry flow:

```text
Dashboard or Auctions
-> Select live Auction
-> Dedicated Arena
```

### Festival Team Owner

Landing page:

- My Active Auctions.
- Assigned Festival Team.
- Remaining purse.
- Recent purchases.

Primary action:

- Join Festival Auction.

Entry flow:

```text
Dashboard
-> My Active Auctions
-> Festival Auction Arena
```

### Sport Captain

Landing page:

- Active Captain assignments.
- Sport Team credits and roster.
- Current Sport Auction status.

Primary action:

- Join Sport Auction.

Entry flow:

```text
Dashboard
-> Captain assignment card
-> Sport Auction Arena
```

### Spectator

Landing page:

- Live Auctions.
- Recently completed Auctions.
- Clear Festival/Sport labels.

Primary action:

- Watch Live.

Entry flow:

```text
Dashboard or Watch Auctions
-> Select event
-> Read-only Arena
```

## 12. Arena Screen Layout

### Desktop

```text
+--------------------------------------------------------------------+
| Auction Name | LIVE | Connected | Team Context | Exit             |
+---------------------------------------+----------------------------+
| CURRENT PARTICIPANT                   | TEAM BUDGETS / CREDITS     |
| Name, employee, sports                | Team A   remaining         |
|                                       | Team B   remaining         |
| Base       Current       Next         | Team C   remaining         |
| Leading Team      Bid Count           |                            |
|                                       | MY TEAM                    |
|               TIMER                   | Remaining purse/credits    |
|                                       | Current roster             |
| [PLACE BID] or ADMIN FINALIZATION     |                            |
+---------------------------------------+----------------------------+
| LIVE BID STREAM                       | AVAILABLE / UNSOLD QUEUE   |
| #12 Team A  120                       | Admin controls only        |
| #11 Team B  100                       | Viewer: compact counts     |
+---------------------------------------+----------------------------+
| Recent Results | Arena controls | Connection/recovery messages    |
+--------------------------------------------------------------------+
```

### Manager State Without Active Participant

```text
+--------------------------------------------------------------------+
| Auction status and Team summaries                                 |
+--------------------------------------------------------------------+
| SELECT NEXT PARTICIPANT | BASE VALUE | START ROUND                |
+---------------------------------------+----------------------------+
| Available Queue                       | Unsold / Re-auction Queue  |
+---------------------------------------+----------------------------+
```

### Pending Finalization

The participant, final bid, leading Team, and timer state remain fixed. Admin
actions become the dominant controls:

```text
[EXTEND] [SELL TO TEAM] [MARK UNSOLD]
```

### Presentation Mode

Read-only, large-screen layout:

- Participant.
- Current and next bid.
- Leading Team.
- Timer.
- Team balances.
- Latest bids.
- No navigation drawer or management links.

## 13. Mobile Strategy

### Mobile Priorities

Order:

1. Auction status and connection.
2. Current participant.
3. Timer.
4. Current and next bid.
5. Primary bid or finalization action.
6. Assigned Team balance.
7. Live bid stream.
8. Team summaries.
9. Queues and recent results.

### Behavior

- Use one document scroll, not nested page scrolling.
- Keep the primary bid action in a bottom action bar while a round is live.
- Do not make the entire Arena fixed-height.
- Permit horizontal scrolling only for true tables.
- Collapse Team summaries into expandable cards.
- Show queue counts before full queue lists.
- Move Admin selection and re-auction controls into focused drawers or
  dialogs.
- Preserve the current participant when dialogs open.

### Tablet

Use a two-column layout:

- Main participant and bid controls.
- Team balances and live bid stream.

Secondary queues and history render below.

## 14. Route Migration Plan

### Existing Routes

```text
/festivals/:festivalId
/festivals/:festivalId/live-auction
/festival-auctions

/sport-tournaments
/sport-tournaments/:sportTournamentId
/sport-tournaments/:sportTournamentId/auction
```

### Proposed Routes

```text
/auctions
/auctions/festivals/:festivalId
/auctions/sports/:sportTournamentId

/festivals/:festivalId/manage
/sport-tournaments/:sportTournamentId/manage
```

Optional:

```text
/auctions/festivals/:festivalId/display
/auctions/sports/:sportTournamentId/display
```

### Redirect Strategy

```text
/festival-auctions
-> /auctions?type=festival

/festivals/:festivalId/live-auction
-> /auctions/festivals/:festivalId

/sport-tournaments/:sportTournamentId/auction
-> /auctions/sports/:sportTournamentId
```

Management compatibility:

```text
/festivals/:festivalId
-> /festivals/:festivalId/manage

/sport-tournaments/:sportTournamentId
-> /sport-tournaments/:sportTournamentId/manage
```

Use replace redirects so old links remain valid without adding browser history
noise.

### Backward Compatibility

- Preserve existing API paths.
- Preserve Socket.IO event and room names.
- Preserve query links during one release cycle.
- Update internal links before removing old route components.
- Keep old routes as redirects for at least one stable release.

## 15. Component Reuse Analysis

### Directly Reusable

- `VisualTimer`
- Shared API client
- Shared Socket.IO singleton
- Auction synchronization helpers
- Festival Team summaries
- Festival bid history
- Festival results/history views
- Existing Material UI cards, chips, dialogs, and tables

### Festival Components

`MainFestivalAuction` contains correct live behavior but combines:

- Data synchronization.
- Timer handling.
- Role logic.
- Admin controls.
- Owner controls.
- Queue management.
- Current bid stream.
- Full-page presentation.

It should be decomposed into:

```text
FestivalAuctionArena
FestivalAuctionHeader
FestivalCurrentParticipant
FestivalBidPanel
FestivalAdminControls
FestivalAuctionQueues
FestivalTeamPursePanel
LiveBidStream
RecentAuctionResults
```

The synchronization and command logic should move into a hook such as:

```text
useFestivalAuctionArena(festivalId)
```

### Sport Components

`SportAuctionArena` already represents a dedicated route and is the stronger
architectural baseline.

It should be decomposed into:

```text
SportAuctionHeader
SportCurrentParticipant
SportBidPanel
SportManagerControls
SportAuctionQueues
SportTeamCreditPanel
LiveBidStream
RecentSportResults
```

Its state logic should move into:

```text
useSportAuctionArena(sportTournamentId)
```

### Workspace Components

Reusable:

- `FestivalControlCenter`
- `SportTournamentControlCenter`
- Readiness summaries
- Configuration forms

Required changes during implementation:

- Control Centers navigate to canonical Arena routes.
- Festival Control Center must stop switching to an embedded Auction tab.
- Sport `Auction` workspace section becomes `Auction Settings`.
- Workspace components must not own live Arena rendering.

### Shared Arena Components

Potential cross-domain abstractions:

```text
AuctionArenaShell
AuctionConnectionStatus
AuctionTimerPanel
AuctionMetric
AuctionTeamBalanceList
AuctionBidStream
AuctionPendingActions
AuctionEmptyRound
AuctionConfirmationDialog
```

Do not force Festival purse and Sport credit rules into one business
component. Share presentation primitives and synchronization conventions, not
domain calculations.

## 16. Backend Impact Analysis

### API Impact

Existing current-state, history, lifecycle, bidding, and finalization APIs are
sufficient for dedicated routes.

No API change is required to separate the UI.

Recommended additive endpoint:

```text
GET /api/v2/auctions
```

Purpose:

- Return Auctions visible or relevant to the authenticated user.
- Aggregate Festival and Sport Auction summaries.
- Expose capabilities such as `canManage`, `canBid`, and `canView`.
- Avoid frontend fan-out.

### Socket Impact

No protocol change is required.

Existing rooms:

```text
festival-auction:<festivalId>
sport-auction:<sportTournamentId>
```

Existing event:

```text
auction-state
```

Existing revision and server-clock behavior should remain unchanged.

Recommended hardening:

- Validate room visibility using the same policy as HTTP reads.
- Continue deriving identity from the authenticated socket.
- Never trust route or payload role claims.

### Authorization Impact

Frontend routes remain UX controls only.

Arena controls must use backend-provided capabilities:

Festival:

```text
viewer.isAdmin
viewer.isOwner
viewer.festivalTeamId
```

Sport:

```text
viewer.canManage
viewer.canBid
viewer.sportTeamId
```

A future unified directory should return capabilities, not infer them from
global roles.

### Data Model Impact

No schema change is required.

The redesign changes navigation and component ownership, not auction
persistence.

## 17. Phased Implementation Plan

### Phase 4E-A: Routing And Navigation

- Add canonical Auction directory and Arena routes.
- Add compatibility redirects.
- Introduce an Arena shell.
- Update Control Center and directory links.
- Add route-level regression tests.

### Phase 4E-B: Festival Arena

- Extract Festival synchronization into a hook.
- Build the dedicated Festival Arena.
- Preserve Admin, Owner, and Spectator behavior.
- Remove live rendering from Festival Workspace.
- Verify expiry recovery, reconnect, and stale snapshot handling.

### Phase 4E-C: Sport Arena

- Refactor the existing Sport Arena into shared presentation sections.
- Move to the canonical Arena route.
- Preserve manager, Captain, and spectator capabilities.
- Add presentation mode only after the standard Arena stabilizes.

### Phase 4E-D: Workspace Cleanup

- Remove Festival Auction operations tab.
- Rename Sport Auction tab to Auction Settings.
- Move complete history and audit displays to management.
- Reduce workspace loading of live Auction state.
- Ensure Control Centers link to the Arena.

### Phase 4E-E: Role UX Optimization

- Add unified My Active Auctions.
- Add Captain-aware dashboard content.
- Add spectator Watch Live presentation.
- Add role/capability-specific labels.
- Optimize mobile bid controls and queue access.

## 18. Risks

### Migration Risks

- Old bookmarks may break without redirects.
- Two live routes could mount duplicate room listeners during transition.
- Shared components may accidentally diverge between old and new routes.

Mitigation:

- Redirect old routes immediately.
- Ensure only one Arena component mounts per route.
- Remove embedded live components after compatibility verification.

### Navigation Risks

- Users may confuse Management and Arena.
- Too many auction directory labels can recreate the current problem.

Mitigation:

- Use one `Auctions` destination.
- Use explicit actions: `Manage`, `Run Auction`, `Join Auction`, `Watch Live`.

### Socket Risks

- Duplicate subscriptions.
- Stale revision state during route transitions.
- Lost connection indicators.

Mitigation:

- Encapsulate room lifecycle in domain hooks.
- Leave rooms on unmount.
- Reset revision state when scope IDs change.
- Preserve current reconnect snapshots.

### Role Risks

- Global role labels may conflict with assignment-derived permissions.
- Captains may not see their Auction if discovery relies on `team_owner`.
- Admins may receive spectator layouts.

Mitigation:

- Render from server capabilities.
- Add assignment-aware Auction directory summaries.
- Keep backend authorization authoritative.

### Mobile Risks

- Sticky action bars may hide content.
- Large queues can still dominate the page.
- Confirmation dialogs may interrupt time-sensitive actions.

Mitigation:

- Reserve viewport space for fixed actions.
- Show compact queue summaries.
- Require confirmations only for irreversible Admin finalization.

## 19. Final Recommendation

Complete Phase 4E to establish stable product-level structure:

```text
Management Workspace
-> Auction Arena
```

This creates clear ownership boundaries:

- Workspaces configure.
- Arenas execute Auctions.

The redesign can be completed without changing auction business rules,
database models, timer semantics, bidding authorization, or Socket.IO
contracts. It should therefore precede Phase 5 while the live Auction
architecture is still contained.
