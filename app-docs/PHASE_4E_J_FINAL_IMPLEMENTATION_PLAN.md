# Phase 4E-J Final Implementation Plan

## Status

This is the final product implementation plan for Phase 4E-J.

It converts the approved setup-first architecture and review findings into a
concrete implementation sequence. It does not implement code, change routes,
change backend APIs, change database schema, change Socket.IO contracts, change
permissions, change auction rules, change timers, or start Phase 5.

The product goal is:

```text
Festival Setup
-> Festival Ready
-> Live Auction
-> Results
```

The product must stop feeling like:

```text
Festival
-> Auction everywhere
-> Setup hidden inside auction screens
```

## Section 1: Current User Flows

### 1. Admin

Current flow:

```text
Dashboard
-> Festivals
-> Festival Overview / Command Center
-> Festival Management
-> Auction Details
-> Live Auction
-> Results
```

Problems:

- New Festivals immediately expose Auction Details, Live Auction, Results, Live
  Activity, and Auction Status.
- Dashboard still treats Auctions as a primary destination even when the next
  real task is setup.
- Festival Overview mixes setup issues, live activity, auction status, sport
  tournament status, competition setup, and results.
- Festival Management includes setup, operations, auction preparation, bid
  history, results, and audit in one workspace.
- Auction Directory lists setup-stage Festivals as auctions.

Confusing screens:

- Festival Overview: overview, setup status, live activity, auction status, and
  results all compete.
- Festival Management: setup and post-launch operational tabs coexist.
- Auction Details: looks useful before the auction exists.
- Live Auction: can be opened before launch and becomes a not-ready status
  surface.

Duplicate screens:

- Festival Overview and Festival Management Overview duplicate setup status.
- Festival Management Results and Festival Results duplicate outcomes.
- Auction Details Results and dedicated Results duplicate reporting.
- Dashboard recent outcomes and Auction Directory completed cards duplicate
  Results discovery.

Premature screens:

- Auction Details.
- Live Auction.
- Results.
- Bid History.
- Live Activity.
- Recent Results.
- Auction Directory setup cards.

### 2. Team Owner

Current flow:

```text
Dashboard
-> Auctions
-> Auction Details or Live Auction
-> Sport Tournaments
-> Sport Tournament Management or Auction
```

Problems:

- Owners can be pushed toward auctions before they know whether they have a
  team assignment or whether setup is complete.
- Assigned team context can be buried behind auction-centric screens.
- Sport Tournament ownership, Festival Team ownership, and captain-like
  participation can overlap without clear hierarchy.
- Results and live auction links may appear before the owner can act.

Confusing screens:

- Auction Directory: setup-stage items can look actionable.
- Sport Tournaments: mixes setup/management, live auction participation, and
  completed outcomes.
- Auction Details: may show monitoring sections before owner participation is
  relevant.

Duplicate screens:

- Owner Dashboard and Auction Directory can both surface the same live auction.
- Sport Tournament cards and Auction Directory cards can point to related but
  different surfaces.

Premature screens:

- Live Auction before launch.
- Auction Details before owner team context is ready.
- Results before finalized outcomes.

### 3. Captain

Current flow:

```text
Dashboard
-> Sport Tournaments
-> Sport Tournament Overview / Management
-> Sport Auction Details
-> Sport Live Auction
```

Problems:

- Captain is assignment-derived, not a global role, so the user may not see a
  clear captain identity in navigation.
- Captains may not know when they are assigned, when setup is waiting, and when
  they can bid.
- Sport Auction Details and Sport Live Auction can appear too early.
- Ready state can imply the captain should open the live auction before the
  organizer has launched it.

Confusing screens:

- Dashboard: captain assignments can be mixed with spectator or owner content.
- Sport Tournament Overview: can point non-managers to Auction Details even
  when setup is incomplete.
- Sport Auction Details: mixes teams, bid history, results, assignments, and
  statistics.

Duplicate screens:

- Sport Tournament Overview and Sport Tournament Management repeat setup
  status.
- Sport Auction Details Results and Sport Results duplicate outcomes.

Premature screens:

- Sport Auction Details before launch.
- Sport Live Auction before launch.
- Results before finalized rounds.

### 4. Spectator

Current flow:

```text
Dashboard
-> Auctions
-> Festival or Sport Auction Details
-> Live Auction
-> Results
```

Problems:

- Spectators may see setup-stage entities as auctions.
- "Open Live Auction" language can imply participation instead of watching.
- If setup-stage auctions are hidden without replacement, the product can look
  empty.
- Results discovery is not consistently separated from live auction entry.

Confusing screens:

- Auction Directory: mixes upcoming, live, completed, and setup-stage objects.
- Auction Details: monitoring and results can appear before anything happened.
- Live Auction: may show not-live state instead of a watchable event.

Duplicate screens:

- Dashboard live/upcoming/completed sections can duplicate Auction Directory.
- Auction Details Results and dedicated Results can duplicate outcomes.

Premature screens:

- Auction Details before launch.
- Live Auction before launch.
- Results before finalized outcomes.

## Section 2: Target User Flows

### Admin

#### Festival Created

What user sees:

- Success message: Festival created.
- Festival Overview focused on setup progress.
- Setup checklist with first incomplete step.
- No auction sections.

What user does:

- Continues setup from the first required step.

Actions available:

- Continue Setup.
- Review Festival Details.
- Add or Import Participants.

Actions hidden:

- Auction Details.
- Live Auction.
- Results.
- Bid History.
- Live Activity.
- Launch Auction.

#### Setup

What user sees:

- Setup Progress.
- Setup Checklist.
- Setup Issues.
- Next Required Action.
- Relevant setup workspace.

What user does:

- Completes required setup steps: employees/participants, sports, teams,
  owners, budgets, auction rules, retentions, pool, setup check.

Actions available:

- Continue Setup.
- Resume Setup.
- Fix Setup Issues.
- Refresh Setup Check.
- Regenerate Pool when dependencies changed.

Actions hidden:

- Open Live Auction.
- View Auction Details.
- View Results.
- Bid History.
- Live Activity.
- Recent Results.

#### Ready

What user sees:

- Festival Ready.
- Launch readiness summary.
- Setup summary.

What user does:

- Reviews setup and launches the Festival auction when appropriate.

Actions available:

- Launch Festival Auction.
- Review Setup.
- Refresh Setup Check.

Actions hidden:

- Results, unless finalized outcomes already exist.
- Bid History.
- Live Activity.
- Completed reporting.

#### Live

What user sees:

- Live Auction as the primary experience.
- Auction Details for monitoring.
- Results/progress as secondary once rounds finalize.
- Setup read-only or secondary.

What user does:

- Runs auction, starts rounds, confirms outcomes, monitors activity.

Actions available:

- Open Live Auction.
- View Auction Details.
- View Results after finalized rounds.
- Review Setup.

Actions hidden:

- Setup mutations that are locked by current workflow.
- Launch Auction.

#### Completed

What user sees:

- Results first.
- Team rosters.
- Assignments.
- Spending summary.
- Bid history and audit history.

What user does:

- Reviews outcomes and reports.

Actions available:

- View Results.
- View Team Rosters.
- View Auction Details as secondary inspection.
- Review Setup as read-only.

Actions hidden:

- Launch Auction.
- Pause/resume.
- Start round.
- Live bidding controls.

### Team Owner

#### Festival Created

What user sees:

- Nothing unless assigned to the Festival or Festival Team.

What user does:

- Uses Dashboard for current assignments.

Actions available:

- None for unassigned Festival.

Actions hidden:

- Auction Details.
- Live Auction.
- Results.

#### Setup

What user sees:

- If assigned: assigned team context and Waiting for Setup.
- If unassigned: no Festival card or a neutral no-assignment state.

What user does:

- Reviews assignment context if available.
- Waits for admin setup or completes owner-owned setup if existing workflows
  allow it.

Actions available:

- View My Team where data exists.
- Manage Sport Tournament only when server permissions allow.

Actions hidden:

- Join Auction.
- Open Live Auction.
- Results.
- Bid History.

#### Ready

What user sees:

- Ready for Auction.
- Team purse/budget and roster context where available.
- Waiting for Launch if admin has not started.

What user does:

- Prepares for bidding.

Actions available:

- Review My Team.
- View Auction Status.

Actions hidden:

- Join Auction until live.
- Results unless prior outcomes exist.

#### Live

What user sees:

- Live Auction.
- My Team panel.
- Bid state and disabled reasons.
- Auction Details as inspection.

What user does:

- Joins Festival auction as active bidder when server viewer state allows.

Actions available:

- Join Auction.
- View Auction Details.
- View Results after finalized rounds.

Actions hidden:

- Admin controls.
- Setup mutations.

#### Completed

What user sees:

- Completed roster.
- Spending summary.
- Results.

What user does:

- Reviews final team outcome.

Actions available:

- View Results.
- View My Team.
- View Auction Details.

Actions hidden:

- Join Auction.
- Live bidding.
- Setup controls.

### Captain

#### Festival Created

What user sees:

- Nothing captain-specific until assigned to a Sport Team.

What user does:

- Uses Dashboard for assignments.

Actions available:

- None for unassigned captain context.

Actions hidden:

- Sport Auction Details.
- Sport Live Auction.
- Results.

#### Setup

What user sees:

- If assigned: You are Captain of this Sport Team.
- Waiting for Setup.
- Sport Team context if available.

What user does:

- Reviews assignment and waits for setup completion.

Actions available:

- View Team Context.

Actions hidden:

- Join Auction.
- Open Live Auction.
- Bid History.
- Results.

#### Ready

What user sees:

- Ready / Waiting for Launch.
- Team credits and roster context where available.

What user does:

- Prepares for bidding.

Actions available:

- Review Team.
- View Auction Status.

Actions hidden:

- Join Auction until live.
- Results unless finalized outcomes exist.

#### Live

What user sees:

- Sport Live Auction.
- Captain bidding controls when server viewer canBid is true.
- Team credit panel.
- Current player and bid state.

What user does:

- Joins and bids when eligible.

Actions available:

- Join Auction.
- View Auction Details.
- View Results after finalized rounds.

Actions hidden:

- Owner/admin lifecycle controls unless server viewer permissions allow them.
- Setup mutations.

#### Completed

What user sees:

- Final Sport Team roster.
- Player assignments.
- Credit spending.
- Results.

What user does:

- Reviews completed roster and outcomes.

Actions available:

- View Results.
- View Team Assignments.
- View Auction Details.

Actions hidden:

- Join Auction.
- Live bidding.

### Spectator

#### Festival Created

What user sees:

- No auction entry unless the product intentionally shows upcoming events.

What user does:

- Waits for visible live or completed auctions.

Actions available:

- None, or View Upcoming only if a non-actionable upcoming state exists.

Actions hidden:

- Auction Details.
- Live Auction.
- Results.

#### Setup

What user sees:

- No setup-stage auction cards by default.
- Empty state: No auctions are live yet.

What user does:

- Returns when auction is ready/live/completed.

Actions available:

- Refresh / Check Active Auctions.

Actions hidden:

- Setup.
- Auction Details.
- Live Auction.
- Results.

#### Ready

What user sees:

- Upcoming auction if the product chooses to show ready state.
- Not live yet.

What user does:

- Waits for launch.

Actions available:

- View Upcoming status.

Actions hidden:

- Watch Live until live.
- Results until finalized outcomes exist.

#### Live

What user sees:

- Watch Live.
- Read-only auction details.
- Current participant/player, timer, bids, teams.

What user does:

- Watches auction.

Actions available:

- Watch Live.
- View Auction Details.
- View Results after finalized rounds.

Actions hidden:

- Admin controls.
- Bid controls.
- Setup controls.

#### Completed

What user sees:

- Results.
- Team rosters/assignments.
- Spending summary where appropriate.

What user does:

- Reviews completed outcome.

Actions available:

- View Results.
- View Auction Details as read-only.

Actions hidden:

- Watch Live.
- Bid controls.
- Admin controls.

## Section 3: Stage Visibility Matrix

Legend:

- Primary: Main destination or first-priority content for the stage.
- Secondary: Available but not dominant.
- Read Only: Available for inspection only.
- Hidden: Not shown in normal navigation for this stage.
- Visible: Listed or reachable as a neutral directory/context surface.

| Screen | Setup | Ready | Live | Completed |
| --- | --- | --- | --- | --- |
| Dashboard | Primary | Primary | Primary | Primary |
| Festivals | Primary for admins | Primary for admins | Secondary | Secondary |
| Festival Overview | Primary | Primary | Secondary | Secondary |
| Festival Setup | Primary | Secondary / Review | Read Only | Read Only |
| Festival Management | Primary setup workspace | Secondary / Review | Read Only | Read Only |
| Auction Details | Hidden | Hidden or Secondary pre-launch review | Secondary | Secondary |
| Live Auction | Hidden | Primary launch target for admins only | Primary | Hidden |
| Results | Hidden | Hidden unless finalized outcomes exist | Secondary after finalized rounds | Primary |
| Sport Tournament Overview | Secondary if created | Primary for ready sport context | Secondary | Secondary |
| Sport Tournament Management | Primary for sport setup | Secondary / Review | Read Only | Read Only |
| Sport Auction Details | Hidden | Hidden or Secondary pre-launch review | Secondary | Secondary |
| Sport Live Auction | Hidden | Primary launch target for permitted managers; waiting for captains | Primary | Hidden |
| Auction Directory | Hidden for setup entities | Visible for ready/upcoming | Primary for live discovery | Primary for completed discovery |

Role-specific notes:

- Admin sees setup-stage Festival and Sport setup surfaces.
- Team Owner sees assigned context and waiting states, not admin setup
  internals.
- Captain sees assignment and waiting states, not management setup internals
  unless separately authorized.
- Spectator sees live/completed auction discovery, not setup-stage objects.

## Section 4: Simplification Plan

### Screens To Merge Or Demote

- Demote Festival Management Overview if Festival Overview already owns setup
  progress and next action.
- Demote Sport Tournament Management Overview if Sport Tournament Overview owns
  setup status and next action.
- Demote Management Results tabs when dedicated Results pages are available.
- Keep Auction Details and Results separate, but make Results primary after
  completion.

### Screens To Simplify

- Dashboard:
  reduce to Action Required, Ready/Live, Assignments, Recent Results.
- Festival Overview:
  remove setup-stage auction cards and focus on next setup action.
- Festival Management:
  show setup workspace first; hide post-launch tabs during setup.
- Sport Tournament Overview:
  focus on setup issues or ready/live/completed state.
- Sport Tournament Management:
  keep setup sections; reduce duplicate readiness metrics.
- Auction Directory:
  show only ready, live/paused, and completed auction contexts by default.
- Auction Details:
  remove pre-launch monitoring appearance during setup.

### Sections To Remove From Setup Stage

- Live Activity.
- Recent Results.
- Bid History.
- Auction Status cards that link to Auction Details.
- Open Live Auction buttons.
- Results tabs.
- Statistics panels.
- Sold/unsold metrics.
- Current bid/current player summaries.
- Competition Setup.

### Cards To Remove Or Stage-Gate

- View Auction Details action cards during setup.
- Open Live Auction cards during setup.
- View Results cards before finalized outcomes.
- Live Now empty cards when no auction is live.
- Sport auction cards in Festival Overview before Sport Tournament setup is
  relevant.
- Ready Sport Tournament cards that skip review/launch.

### Metrics To Remove From Setup Stage

- Sold.
- Unsold.
- Remaining auction queue as auction progress.
- Accepted bids.
- Current bid.
- Highest sale.
- Average sale.
- Spending utilization.
- Recent bid activity.

Setup-stage metrics should be limited to:

- Participants.
- Sports enabled/assigned.
- Teams.
- Owners/captains.
- Budgets/credits.
- Pool generated.
- Setup issues.
- Setup progress.

### Statuses To Remove Or Rename

- Do not show "Auction: setup" as a primary setup-stage status.
- Use "Setup Incomplete" instead of internal setup/draft phrasing.
- Use "Ready to Launch" instead of generic Ready for admins.
- Use "Waiting for Launch" for owners, captains, and spectators.
- Use "Watch Live" for spectators.
- Use "Join Auction" for active bidders.
- Use "Launch Auction" only for stage transition by permitted users.

## Section 5: Admin Experience

When Festival is newly created, the admin should see:

- Festival created success message.
- Festival Overview with setup-first header.
- Setup progress at 0% or first computed value.
- Setup checklist.
- First required action.
- Setup issues only if known.

What should be hidden:

- Auction Details.
- Live Auction.
- Results.
- Bid History.
- Live Activity.
- Auction history.
- Sold/unsold metrics.
- Current bid/current participant.
- Sport Tournament auction actions.
- Competition Setup.

First action:

- Continue Setup.

Second action:

- Review Festival Details or Add/Import Participants, depending on what the
  computed first incomplete step is.

What should be impossible through normal UI:

- Opening Live Auction before readiness passes.
- Viewing Auction Details as though monitoring exists.
- Viewing Results before finalized outcomes.
- Launching auction while setup is incomplete.
- Accessing bid history before bidding exists.
- Treating Sport Tournament setup as required for Main Festival Auction unless
  that requirement already exists in server readiness.

Admin setup sequence:

1. Review Festival Details.
2. Confirm employees exist or import employees.
3. Enable Festival sports.
4. Add or import participants.
5. Assign participant sports.
6. Create Festival teams.
7. Assign owners and confirm owner account state.
8. Configure budgets.
9. Configure auction rules.
10. Configure retentions where applicable.
11. Generate auction pool.
12. Run setup check.
13. Review launch summary.
14. Launch Festival Auction.

Sport Tournament setup should be handled as its own setup flow after the
relevant Festival Team roster context exists, unless current server readiness
already requires it earlier.

## Section 6: Owner Experience

### No Team Assigned

Primary CTA:

- None, or View Dashboard.

Secondary CTA:

- Refresh Assignments.

Hidden areas:

- Auction Details.
- Live Auction.
- Results.
- Sport Tournament management.

### Waiting For Setup

Primary CTA:

- View My Team, if assignment data exists.

Secondary CTA:

- View Festival Status.

Hidden areas:

- Join Auction.
- Open Live Auction.
- Bid History.
- Results.
- Admin setup sections.

### Ready For Auction

Primary CTA:

- Review My Team.

Secondary CTA:

- View Auction Status.

Hidden areas:

- Join Auction until live.
- Results until finalized outcomes exist.
- Admin controls.

### Auction Live

Primary CTA:

- Join Auction.

Secondary CTA:

- View Auction Details.
- View Results after finalized rounds.

Hidden areas:

- Launch/pause/resume controls unless server viewer permissions allow.
- Setup mutations.

### Completed

Primary CTA:

- View Results.

Secondary CTA:

- View My Team.
- View Auction Details.

Hidden areas:

- Join Auction.
- Live bidding controls.
- Setup mutations.

## Section 7: Captain Experience

### No Captain Assignment

Primary CTA:

- None, or View Dashboard.

Secondary CTA:

- Refresh Assignments.

Hidden areas:

- Sport Live Auction.
- Sport Auction Details.
- Results.
- Captain bidding controls.

### Waiting For Setup

Primary CTA:

- View Team Assignment.

Secondary CTA:

- View Tournament Status.

Hidden areas:

- Join Auction.
- Bid History.
- Results.
- Management setup sections unless separately authorized.

### Ready

Primary CTA:

- Review Team.

Secondary CTA:

- View Auction Status.

Hidden areas:

- Join Auction until live.
- Results until finalized outcomes exist.
- Manager lifecycle controls.

### Live

Primary CTA:

- Join Auction.

Secondary CTA:

- View Auction Details.
- View Results after finalized rounds.

Hidden areas:

- Owner/admin lifecycle controls unless server viewer permissions allow.
- Setup mutations.

### Completed

Primary CTA:

- View Results.

Secondary CTA:

- View Team Assignments.
- View Auction Details.

Hidden areas:

- Join Auction.
- Bid controls.
- Setup mutations.

## Section 8: Spectator Experience

### No Upcoming Auctions

Primary CTA:

- Refresh Auctions.

Secondary CTA:

- None.

Hidden areas:

- Setup.
- Auction Details.
- Live Auction.
- Results.

### Upcoming

Primary CTA:

- View Upcoming Status.

Secondary CTA:

- None, unless a schedule/status view already exists.

Hidden areas:

- Watch Live until live.
- Results until finalized outcomes exist.
- Setup internals.

### Live

Primary CTA:

- Watch Live.

Secondary CTA:

- View Auction Details.
- View Results after finalized rounds.

Hidden areas:

- Bid controls.
- Admin controls.
- Setup controls.

### Completed

Primary CTA:

- View Results.

Secondary CTA:

- View Auction Details.

Hidden areas:

- Watch Live.
- Bid controls.
- Admin controls.
- Setup controls.

## Section 9: Implementation Order

### Step 1: Stage Helpers

Create frontend-only stage helpers using existing data.

Festival stages:

- Setup.
- Ready.
- Live.
- Completed.

Sport stages:

- Setup.
- Ready.
- Live.
- Completed.

Do not change backend status values. Do not add new APIs.

### Step 2: Role And Capability Visibility Rules

Define UI visibility from:

- Stage.
- Global role.
- Server-returned viewer permissions.
- Assignment context.

This must distinguish admin, team owner, captain capability, and spectator
viewing.

### Step 3: Context Navigation Visibility

Make contextual navigation stage-aware.

Setup:

- Overview.
- Setup.

Ready:

- Overview.
- Setup / Review Setup.
- Launch action where allowed.

Live:

- Overview.
- Auction Details.
- Live Auction.
- Results after finalized rounds.

Completed:

- Overview.
- Results.
- Auction Details.

### Step 4: Direct-URL Fallback States

For hidden future-stage pages opened directly, show a stage-appropriate
fallback:

- Setup: Auction details will be available after launch. Continue Setup.
- Ready: Auction is ready but not live. Review Setup or Launch.
- Completed: Live auction is complete. View Results.
- Unauthorized capability: Waiting for Launch or View Dashboard.

### Step 5: Festival Overview

Make setup-first.

Setup:

- Setup progress.
- Setup checklist.
- Setup issues.
- Next required action.

Ready:

- Festival Ready.
- Launch Festival Auction.
- Review Setup.

Live:

- Live summary and links to Live Auction / Auction Details.

Completed:

- Results summary and links to Results.

### Step 6: Festival Management

Make it a setup workspace.

During setup:

- Hide Bid History, Results, Live Auction, Auction Details, Live Activity.
- Keep setup sections only.
- Make Continue Setup / Refresh Setup Check primary.

During ready:

- Show Review & Launch.

During live/completed:

- Convert setup to review/read-only where existing workflow locks apply.

### Step 7: Festival Auction Details

Stage-gate content.

Setup:

- Direct-visit fallback only.

Ready:

- Hidden by default or lightweight pre-launch review only.

Live:

- Monitoring, teams, bid history, statistics, results/progress.

Completed:

- Secondary inspection behind Results.

### Step 8: Festival Live Auction

Stage-gate entry language.

Ready admin:

- Launch Festival Auction.

Live owner:

- Join Auction.

Live spectator:

- Watch Live.

Completed:

- Redirect/guide to Results.

Do not change bidding, timer, finalization, or auction lifecycle behavior.

### Step 9: Results Surfaces

Make Results stage-aware.

- Hidden before finalized outcomes.
- Secondary while live after finalized outcomes exist.
- Primary when completed.
- Demote duplicate Management Results tabs.
- Route dashboard recent outcomes and completed cards to Results.

### Step 10: Sport Tournament Overview

Apply same setup-first model.

Setup:

- Setup issues.
- Continue Tournament Setup for managers.
- Waiting for Setup for captains/spectators.

Ready:

- Ready to Launch for managers.
- Waiting for Launch for captains/spectators.

Live:

- Join/Watch/Open based on capability.

Completed:

- Results and team assignments.

### Step 11: Sport Tournament Management

Make setup sections primary.

Setup sections:

- Teams.
- Captains.
- Eligibility.
- Budgets.
- Pool.
- Auction Rules.
- Setup Check.

Hide during setup:

- Sport Auction Details.
- Sport Live Auction.
- Results.
- Bid History.

### Step 12: Sport Auction Details

Stage-gate content.

Setup:

- Direct-visit fallback.

Ready:

- Hidden by default or pre-launch review only.

Live:

- Monitoring, teams, bid history, credit usage, live activity.

Completed:

- Secondary inspection behind Results and Team Assignments.

### Step 13: Sport Live Auction

Stage-gate entry language.

Ready manager:

- Launch/Open Sport Auction according to existing lifecycle.

Live captain:

- Join Auction.

Live spectator:

- Watch Live.

Completed:

- Guide to Results.

Do not change auction lifecycle behavior.

### Step 14: Auction Directory

Make it stage-aware.

Default include:

- Ready/upcoming.
- Live/paused.
- Completed.

Default exclude:

- Setup-stage Festivals.
- Setup-stage Sport Tournaments.

Admin-only optional setup group:

- Setup Needed, if useful, but route to setup not auction.

Card actions:

- Review & Launch.
- Join Auction.
- Watch Live.
- View Auction Details.
- View Results.

### Step 15: Dashboards

Make dashboards action-first and stage-aware.

Hierarchy:

1. Action Required.
2. Ready to Launch / Ready to Join / Waiting for Launch.
3. Live Now.
4. My Assignments.
5. Recent Results.

Remove empty live/results sections from priority positions when they contain no
actionable content.

### Step 16: Owner Waiting States

Add owner-specific states:

- No Team Assigned.
- Waiting For Setup.
- Ready For Auction.
- Auction Live.
- Completed.

Do not expose admin setup internals.

### Step 17: Captain Waiting States

Add captain-specific states:

- No Captain Assignment.
- Waiting For Setup.
- Ready.
- Live.
- Completed.

Use server-returned capability data for bid controls.

### Step 18: Spectator States

Add spectator-specific discovery states:

- No Upcoming Auctions.
- Upcoming.
- Live.
- Completed.

Use Watch Live language for spectator live entry.

### Step 19: Cleanup Duplicate Sections

Remove or demote:

- Management Overview duplicates.
- Management Results duplicates.
- Setup-stage recent results.
- Setup-stage live activity.
- Setup-stage auction metrics.
- Competition Setup from Phase 4E-J surfaces.

### Step 20: Verification Plan

Verify without changing backend behavior:

- New Festival shows setup-first UI.
- Setup-stage Auction Details/Live/Results are hidden from navigation.
- Direct URLs show setup-first fallbacks.
- Ready state shows Launch/Review, not generic Open Live Auction.
- Owners see assignment/waiting/live/completed states.
- Captains see assignment/waiting/live/completed states.
- Spectators see no upcoming/upcoming/live/completed states.
- Completed auctions route to Results first.
- No admin controls appear for non-admin users unless existing server viewer
  permissions allow them.

## Section 10: Out Of Scope

Explicitly excluded from Phase 4E-J:

- Phase 5.
- Competition Engine.
- Fixtures.
- Match scheduling.
- Standings.
- New backend APIs.
- Database changes.
- Database migrations.
- Socket.IO contract changes.
- Socket authentication changes.
- Auction rule changes.
- Bidding validation changes.
- Timer behavior changes.
- Finalization behavior changes.
- Permission model changes.
- Public admin registration.
- New roles such as Festival Organizer as a backend role.
- New reporting engine.
- New notification system.
- New frontend test harness, unless separately approved.

