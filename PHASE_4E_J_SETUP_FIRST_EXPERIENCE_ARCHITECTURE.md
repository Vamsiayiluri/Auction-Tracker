# Phase 4E-J Setup-First Experience Architecture

## Status

This document is a product UX and information architecture review only.

It does not implement code, UI, backend APIs, database schema, Socket.IO
contracts, permissions, bidding rules, auction logic, timers, or existing
business workflow changes.

Phase 5 must not start from this document. The goal is to make the existing
Phase 4E product journey setup-first instead of auction-first.

## Current UX Problems

The product exposes auction destinations before setup is complete. A newly
created Festival in Draft / Setup Incomplete / Not Ready can immediately show:

- Auction Details
- Live Auction
- Results
- Auction Actions
- Live Activity
- Auction Status
- Bid History
- Recent Results

This creates a misleading product promise. Users see auction and reporting
surfaces before there is enough configured state to run or inspect an auction.
The UI technically has disabled controls and empty states in places, but the
information architecture still tells users that auction is the primary product
mode from the beginning.

The main root causes are:

- Shared contextual navigation always lists Overview, Setup, Auction Details,
  Live Auction, and Results when route targets are supplied.
- Festival Overview and Sport Tournament Overview mix setup issues with live
  auction shortcuts, status cards, and reporting summaries.
- Management/setup pages include auction history, results, and live auction
  routes as tabs or primary actions.
- Auction Directory lists every Festival and Sport Tournament as an auction,
  including draft/setup entities.
- Results pages can be reached before any completed auction outcome exists.
- Live Auction pages can be reached before launch and become status/control
  surfaces instead of being reserved for the live experience.

## User Journey Analysis

The desired mental model is:

```text
Festival Setup
-> Festival Ready
-> Auction Live
-> Results & Reporting
```

The current mental model is closer to:

```text
Festival created
-> Auction visible everywhere
-> Setup appears as blockers inside auction-oriented pages
```

This reverses the user's task sequence. For a new Festival, the user does not
need auction details. They need to know what is missing, why it matters, and
where to go next. Auction should become prominent only after setup blockers are
resolved and the organizer intentionally launches.

## Stage-Based Product Flow

### Stage 1: Festival Setup

Applies when:

- Festival status is Draft or equivalent pre-launch state.
- Main Festival auction status is setup.
- Setup status is not ready.
- Any required Festival or Sport Tournament setup issue exists.

Primary UI:

- Setup Progress
- Setup Checklist
- Setup Issues
- Next Required Actions
- Setup workspaces

Hidden or de-emphasized UI:

- Auction Details
- Live Auction
- Results
- Bid History
- Auction History
- Live Activity
- Recent Results
- Auction controls

### Stage 2: Ready

Applies when:

- Server setup checks pass.
- No blocking setup issue remains.
- Auction has not been launched.

Primary UI:

- Festival Ready confirmation
- Launch Festival Auction
- Review Setup

Secondary UI:

- Setup summary
- Team and participant counts
- Budget and pool summary

Hidden or de-emphasized UI:

- Live Activity, because no auction is live yet.
- Results and bid history, unless there are already completed prior rounds.

### Stage 3: Live Auction

Applies after launch:

- Festival auction status is live or paused.
- Sport Tournament status is auction_live or auction_paused.
- Current auction state exists or the auction is waiting for the next round.

Primary UI:

- Overview
- Auction Details
- Live Auction
- Results as a secondary live-progress surface
- Bid activity
- Current participant/player
- Team spending and roster context

Setup UI becomes secondary and mostly read-only where current workflows already
lock setup.

### Stage 4: Completed

Applies when:

- Festival auction status is completed, or
- Sport Tournament status is auction_completed.

Primary UI:

- Results
- Team Rosters
- Assignments
- Spending Summary
- History
- Reports

Hidden or de-emphasized UI:

- Launch controls
- Pause/resume controls
- Start round controls
- Live activity as a primary section
- Setup actions except read-only review.

## Screen-by-Screen Review

### 1. Dashboard

Current issue:

- Admin dashboard hero action routes to Auctions, which makes auction browsing
  the product-level default.
- Live Now and Festival Progress are useful later-stage sections, but they
  still frame Festivals as setup, auction, and results from the beginning.
- Ready Sport Tournament cards use Open Live Auction as the action, which skips
  the review/launch moment.
- Recent outcomes route back to live auction routes in dashboard data, which
  blurs results and live surfaces.

Recommendation:

- For setup-stage Festivals, dashboard priority should be Action Required and
  Setup Progress.
- Use Fix Setup Issues or Continue Setup as the primary action.
- Show View Active Auctions only when live/paused auctions exist.
- Show Results only when finalized outcomes exist.
- For ready state, show Festival Ready and Launch Festival Auction as the next
  action for admins; for non-admin users, show Waiting for Launch.

### 2. Festival Directory

Current issue:

- Festival cards are mostly clean and route to Open Festival.
- The description is setup-oriented, which is appropriate.
- Cards do not yet show enough next-action context for setup vs ready vs live.

Recommendation:

- Keep directory as Festival-first.
- Add stage labels conceptually: Setup Incomplete, Ready, Live Auction,
  Completed.
- Primary action should be stage-aware:
  Continue Setup, Review & Launch, Open Live Auction, or View Results.

### 3. Festival Overview

Current issue:

- Shared context nav exposes Auction Details, Live Auction, and Results during
  setup.
- Quick Actions expose View Auction Details, Open Live Festival Auction, Open
  Live Sport Auction, and View Results even when setup is incomplete.
- Live Activity appears before launch, often as an empty auction-oriented
  section.
- Festival Auction Status appears during setup and includes View Auction
  Details.
- Recent Results appears before any completed results may exist.
- Competition Setup is premature and belongs outside Phase 4E-J.

Recommendation:

- Stage 1 Overview should become setup-first:
  setup progress, setup checklist, setup issues, next required actions.
- During setup, contextual nav should show only Overview and Setup.
- During ready, show Overview and Setup, with Launch Festival Auction as the
  primary action.
- Add Auction Details and Live Auction only after launch.
- Add Results only after at least one finalized result or completed status.
- Remove Live Activity from setup-stage overview.

### 4. Festival Management

Current issue:

- Header has View Auction Details and context nav links to Auction Details,
  Live Auction, and Results during setup.
- Operations tabs include Auction Preparation, Bid History, Results, and Audit.
- Auction Preparation includes Open Live Auction even when setup may still be
  incomplete.
- Overview metrics include Auction Status and Unsold Players during setup.

Recommendation:

- During Stage 1, this screen should be the primary setup workspace.
- Header action should be Continue Setup, Refresh Setup Check, or Review Setup,
  not View Auction Details.
- Stage 1 tabs should exclude Bid History and Results.
- Auction Preparation should be renamed or reframed as Review & Launch and
  should surface Open/Launch Live Auction only in Stage 2.
- Audit may remain available for admins, but it should not compete with setup
  progression.

### 5. Festival Setup

Current issue:

- Existing setup wizard steps are close to the desired journey:
  Festival Details, Setup Foundation, Participants, Teams, Budget, Owners,
  Retentions, Auction Pool, Review & Launch.
- Setup progress exists but is not the top-level product frame on all setup
  pages.

Recommendation:

- Make setup checklist the dominant Stage 1 navigation.
- Each step should clearly show completed, current, blocked, and optional
  states.
- Review & Launch should be the only transition point into auction mode.
- The launch action must remain backed by existing server-side readiness and
  auction-start validation.

### 6. Festival Command Center

Current issue:

- The page still behaves as an auction operations center.
- Quick Actions and status sections expose future-stage actions.
- Sport Tournament cards can offer live auction paths before Festival setup is
  complete.

Recommendation:

- Rename/position as Festival Overview in user-facing IA.
- In setup, first viewport should answer:
  What is missing? What step should I take next?
- Sport Tournament status should be setup-oriented until the parent Festival is
  ready or live.
- Competition Setup should be hidden until the product actually supports that
  phase.

### 7. Festival Auction Details

Current issue:

- Reachable during setup.
- Header exposes Open Live Auction.
- Tabs expose Teams, Bid History, Results, and Statistics even with no auction
  activity.
- Overview shows sold/unsold/remaining metrics and recent activity before the
  auction exists.

Recommendation:

- Hide from setup-stage navigation.
- If directly visited during setup, show a setup-first redirect-style state:
  "Auction details will be available after launch" with Continue Setup.
- During ready, keep hidden or show a lightweight pre-launch review only if the
  product needs it; it should not look like post-launch monitoring.
- During live/completed, show full hub content.

### 8. Festival Live Auction

Current issue:

- Direct route exists and can load before launch.
- Live page contains start/pause/resume/complete controls and recent results.
- Header can show View Results even when there are no results.

Recommendation:

- Hide from Stage 1 navigation.
- In Stage 2, expose as Launch Festival Auction only for users allowed to start
  the auction.
- In Stage 3, expose as Open Live Auction.
- In Stage 4, hide live controls and route users toward Results.

### 9. Sport Tournament Overview

Current issue:

- Primary action can become View Auction Details when readiness is ready.
- Non-managers with incomplete setup are pointed to Auction Details.
- Context nav always exposes Auction Details, Live Auction, and Results.
- Quick Actions always include Auction Details, Open Live Auction, and View
  Results.

Recommendation:

- During draft/setup, show Setup Issues and Continue Tournament Setup.
- For non-managers during setup, show Waiting for Setup Completion instead of
  Auction Details.
- During ready, show Tournament Ready with Launch/Open Live Sport Auction only
  where launch is appropriate.
- Results should appear only after finalized rounds or completed status.

### 10. Sport Tournament Management

Current issue:

- Header exposes View Auction Details.
- Context nav exposes Auction Details, Live Auction, and Results during setup.
- Settings includes Sport Auction Settings, which is valid setup content, but
  its placement can make the page feel auction-first.
- Overview copy references Auction Details during setup.

Recommendation:

- Stage 1 header should focus on setup sections: Teams, Captains, Eligibility,
  Budgets, Pool, Settings, Setup Check.
- Keep auction settings as a setup requirement, but label them as Auction Rules
  or Auction Setup.
- Hide Auction Details, Live Auction, and Results nav until stage rules allow
  them.
- When setup locks after launch, convert this screen to Review Setup.

### 11. Sport Auction Details

Current issue:

- Reachable during setup.
- Header exposes Open Live Auction.
- Tabs expose Bid History, Results, Team Assignments, and Statistics.
- Recent Activity and Live Activity appear before launch.

Recommendation:

- Hide during draft/setup.
- Direct visits before launch should show setup-first guidance.
- During live, show monitoring, bid history, team credit usage, and live
  activity.
- During completed, make Results and Team Assignments dominant.

### 12. Sport Live Auction

Current issue:

- Direct route can be reached before live.
- Live bidding page becomes a not-live status page if opened early.
- Recent results and auction controls are visible as part of the page frame.

Recommendation:

- Hide during draft/setup.
- During ready, expose only as the intentional launch/open auction action for
  authorized users.
- During completed, route users to Sport Results or Sport Auction Details
  results section.

### 13. Auction Directory

Current issue:

- Lists all Festivals and Sport Tournaments as auctions, regardless of stage.
- Each card exposes View Auction Details and Open Live Auction.
- Setup-stage entities appear alongside live and completed auctions.

Recommendation:

- Auction Directory should list only ready, live/paused, and completed auction
  contexts by default.
- Setup-stage Festivals and Sport Tournaments should either be excluded or
  shown in a separate Setup Needed group for admins only.
- Card actions should be stage-aware:
  Review & Launch, Open Live Auction, View Auction Details, View Results.
- Spectators and owners should not see setup-incomplete entities as auctions
  unless they have a meaningful waiting state.

## Visibility Rules

Use stage-derived visibility, not route availability, as the UX rule.

```text
Stage 1 Setup:
  Show: Overview, Setup
  Hide: Auction Details, Live Auction, Results, Live Activity, Bid History

Stage 2 Ready:
  Show: Overview, Setup review, Launch Festival Auction
  Hide: Results unless prior finalized results exist
  De-emphasize: Auction Details unless used for pre-launch review

Stage 3 Live:
  Show: Overview, Auction Details, Live Auction, Results/progress
  Keep: Setup as review/read-only where workflows are locked

Stage 4 Completed:
  Show: Results, Auction Details, Rosters, Assignments, History, Reports
  Hide: Launch and live auction controls
```

Suggested stage derivation:

- Festival setup: auctionStatus is setup and readiness overallStatus is not
  READY.
- Festival ready: auctionStatus is setup and readiness overallStatus is READY.
- Festival live: auctionStatus is live or paused.
- Festival completed: auctionStatus is completed.
- Sport setup: tournament status is draft or setup, or readiness is not ready.
- Sport ready: tournament status is ready.
- Sport live: tournament status is auction_live, auction_paused, or current
  round is pending finalization.
- Sport completed: tournament status is auction_completed.

## Setup Checklist Design

The Festival setup checklist should be the user's primary Stage 1 map:

1. Configure Festival
2. Add Participants
3. Create Teams
4. Assign Owners
5. Configure Budgets
6. Configure Auction Rules
7. Configure Retentions
8. Create Sport Tournaments
9. Assign Captains
10. Generate Auction Pools
11. Review & Launch

Each checklist row should include:

- Status: Done, Current, Blocked, Not Started.
- Owner: Admin, Festival Team Owner, Captain, or system-generated.
- Primary action: Configure, Add, Assign, Generate, Review.
- Dependency note when blocked.

Sport Tournament setup checklist should include:

- Configure Tournament
- Confirm Teams
- Assign Captains
- Review Eligibility
- Configure Credits
- Configure Auction Rules
- Generate Player Pool
- Run Setup Check
- Ready for Sport Auction

## Setup Progress Design

Setup progress should be shown as progress through required setup domains, not
as auction status.

Recommended presentation:

- Header summary: "Setup Incomplete" or "Ready to Launch".
- Progress bar based on setup steps completed.
- Counts for critical prerequisites only:
  participants, teams, owners/captains, budgets/credits, pool size.
- "Next required action" above metrics.

Avoid using sold, unsold, bid count, current bid, live activity, or recent
results in setup-stage progress.

## Setup Issues Design

Setup Issues should replace the current blocker framing in user-facing flows.

Issue cards should include:

- Plain-language issue title.
- Why it blocks launch.
- Exact next action.
- Destination to the relevant setup section.
- Scope: Festival or Sport Tournament.

Examples:

- "Owners missing" -> Assign Owners.
- "Budgets not configured" -> Configure Budgets.
- "Auction pool not generated" -> Generate Auction Pool.
- "Captains missing" -> Assign Captains.

Setup Issues should be the first actionable section in Stage 1 Overview.

## Ready-To-Launch Experience

When all blockers are resolved, the product should stop showing warning-heavy
setup UI and present a positive transition state:

- Title: Festival Ready
- Primary action: Launch Festival Auction
- Secondary action: Review Setup
- Supporting summary:
  participants, teams, budgets, owners/captains, pool size, auction rules.

The launch button should not appear as a generic Open Live Auction action. It
is a stage transition and should feel intentional.

## Live Auction Experience

After launch, auction becomes the primary experience:

- Live Auction is a first-class nav item.
- Auction Details becomes useful for monitoring.
- Results can appear as live progress and finalized round history.
- Live Activity is appropriate.
- Setup becomes a review/support surface.

Do not move bidding validation, timer behavior, or auction state transitions
into the frontend. The UI should only reflect server state and route users to
the correct existing surfaces.

## Completed Festival Experience

Completed state should focus on inspection and reporting:

- Results
- Team Rosters
- Assignments
- Spending Summary
- Bid History
- Audit History
- Reports

Auction controls should be hidden or replaced by read-only status. The Live
Auction page should no longer be a primary destination after completion.

## Navigation Changes

Global navigation can remain:

- Dashboard
- Festivals
- Auctions
- Employees
- Sport Tournaments

Contextual navigation should become stage-aware:

```text
Setup:
  Overview | Setup

Ready:
  Overview | Setup | Launch

Live:
  Overview | Auction Details | Live Auction | Results

Completed:
  Overview | Results | Auction Details
```

For admin setup contexts, Setup should be the default working destination. For
owners and spectators, incomplete setup should show waiting or assignment
context instead of auction links.

## Impacted Screens

Primary impacted screens:

- `Dashboard`
- `FestivalDashboard`
- `FestivalCommandCenter`
- `FestivalDetail`
- `FestivalAuctionHub`
- `FestivalLiveAuctionPage`
- `FestivalAuctionResultsPage`
- `SportTournamentDirectory`
- `SportTournamentCommandCenter`
- `SportTournamentWorkspace`
- `SportAuctionHub`
- `SportAuctionArena`
- `SportAuctionResultsPage`
- `AuctionDirectory`
- `AuctionContextNavigation`
- Festival setup/readiness components
- Product dashboard components

## Risks

- Hiding future-stage links may make direct URL behavior feel inconsistent
  unless direct visits get clear setup-first guidance.
- Existing users may expect Auction Directory to include setup-stage entities.
- Stage derivation must be consistent across Festival and Sport contexts.
- Some backend endpoints may still return setup auction state; the UI must not
  mistake endpoint availability for product readiness.
- Over-gating owner/spectator views could remove useful waiting context.
- Ready state needs careful wording so it does not imply the auction has
  already started.

## Migration Strategy

1. Introduce a frontend-only stage model derived from existing server data.
2. Apply the stage model to contextual navigation visibility.
3. Update dashboards and directories to use stage-aware primary actions.
4. Reframe Festival Overview and Sport Tournament Overview around setup-first
   sections.
5. Add direct-visit empty states for hidden future-stage pages.
6. Move results/reporting prominence to completed and post-result states.
7. Preserve all existing routes for compatibility, but change the user-facing
   flow and fallback content.

No backend API, schema, socket, permission, bidding, timer, or auction workflow
change is required for this migration.

## Recommended Implementation Order

1. Define frontend stage helpers for Festival and Sport Tournament contexts.
2. Make `AuctionContextNavigation` accept stage-aware visibility inputs.
3. Update Festival Overview to prioritize setup progress, checklist, issues,
   and next action during Stage 1.
4. Update Festival Management header and tabs to hide auction/history/results
   affordances during setup.
5. Update Sport Tournament Overview and Management with the same stage rules.
6. Update Auction Directory to exclude or separate setup-stage entities.
7. Update dashboards so setup-stage entities route to setup, ready entities
   route to review/launch, live entities route to live auction, and completed
   entities route to results.
8. Add setup-first direct-visit states for Auction Details, Live Auction, and
   Results pages when they are opened too early.
9. Audit owner and spectator views for waiting states so they do not see
   misleading auction actions before launch.
10. Verify with focused frontend route and component tests if/when a frontend
    test harness is introduced.

