# Phase 4E-H Information Hierarchy Architecture

## Status

This document is the architecture and UX planning blueprint for Phase 4E-H.

It does not implement code, UI, routes, APIs, migrations, schemas, auction
rules, authorization changes, or Competition Engine functionality.

## Executive Decision

AuctionArena should adopt a three-layer information hierarchy:

```text
Primary Action
-> Secondary Context
-> Supporting Information
```

Every major page must answer one primary question:

| Experience | Primary Question |
| --- | --- |
| Dashboard | What should I do now? |
| Festival Command Center | What is the Festival's next operational step? |
| Festival Management | What Festival data or setup task am I working on? |
| Sport Tournament Command Center | What blocks or enables this Tournament? |
| Sport Tournament Management | What Team-allocation task am I working on? |
| Auction Arena | What is happening in the live Auction right now? |
| Results | What happened, and where can I inspect it? |

The product must stop using large summary regions as mandatory gateways to the
working area. Context remains available, but it must no longer compete with
the user's task.

## 1. Current-State Audit

### 1.1 Current Navigation

The current primary navigation is:

```text
Admin
|-- Dashboard
|-- Festivals
|-- Auctions
|-- Employees
`-- Sport Tournaments

Festival Team Owner
|-- Dashboard
|-- Auctions
`-- Sport Tournaments

Spectator
|-- Dashboard
`-- Auctions
```

This is materially cleaner after Phase 4E-G, but the hierarchy below the
global navigation remains inconsistent:

- Festival Command Center, Festival Management, and Festival Arena are separate
  experiences but do not share a compact contextual navigation model.
- Sport Tournament Management includes a large Control Center instead of a
  distinct, action-first Tournament Command Center.
- Results are reachable from several surfaces but do not yet form one coherent
  reporting hierarchy.
- Compatibility-era pages and labels still exist conceptually even when they
  are no longer primary navigation items.
- Captain capability is represented on the Dashboard but not as a persistent
  product context.

### 1.2 Current Dashboard Hierarchy

The role dashboards are action-oriented, but they remain long:

```text
Hero
-> Needs Attention / Primary Assignment
-> Live Now
-> Assignment or Festival summaries
-> Next Actions
-> Recent Outcomes
-> Additional role sections
```

Problems:

- The hero often restates the purpose of the Dashboard rather than presenting
  the highest-priority task.
- Admin Festival Journey cards duplicate Festival Command Center information.
- Owners may see Festival Team, managed Tournament, next-action, and Captain
  sections for the same underlying assignment.
- Captains see assignment, active Auction, Team, and future Competition cards
  that may repeat the same Tournament four times.
- Spectators see Live, Upcoming, Results, and Festival Explorer as full card
  grids, creating a long discovery page.
- Empty sections consume vertical space even when they contain no action.

### 1.3 Current Festival Command Center Hierarchy

The current order is:

```text
Large Festival Overview
-> Seven metrics
-> Quick Actions
-> Live Activity
-> Blockers
-> Festival Auction Status
-> Sport Tournament Status
-> Competition Readiness
-> Recent Results
```

Problems:

- Festival name, status, readiness, Auction status, and counts are repeated
  across the overview, status sections, and cards.
- Quick Actions are not first.
- Live activity and blockers appear after a large summary block.
- Festival Auction status repeats the Auction state already shown in the
  header and Live Activity.
- Sport Tournament cards combine readiness, status, blockers, Arena access,
  and Management access in one dense card.
- Competition readiness is premature supporting context before Competition
  Engine exists.
- Recent outcomes belong to Results, not the main operational path.

### 1.4 Current Festival Management Hierarchy

The current top of page contains:

```text
Application page heading
-> Error/success messages
-> Festival Control Center
-> Configuration lock card
-> Operations / Edit Configuration selector
-> Operations tabs or Setup Wizard
-> Active workspace content
```

Problems:

- The user can scroll through multiple page-level structures before reaching
  the selected task.
- The Control Center repeats Festival context already available in the Command
  Center.
- Configuration lock status is permanently prominent even when the user is
  not editing configuration.
- A two-level mode selector plus workspace tabs creates navigation overhead.
- Overview repeats readiness and counts exposed above it.
- Auction Preparation can repeat readiness already shown in the Control Center.
- The top-page region can occupy most of a laptop viewport.

Information that appears too frequently:

- Festival name and dates.
- Festival status.
- Auction status.
- Readiness percentage or state.
- Participant, Team, Owner, and Pool counts.
- Configuration lock explanations.
- Open Arena actions.

### 1.5 Current Sport Tournament Hierarchy

The current Management page contains:

```text
Application page heading
-> Alerts
-> Large Sport Tournament Control Center
-> Eight Control Center metrics
-> Readiness progress
-> Blockers
-> Open Arena action
-> Eight workspace tabs
-> Active tab content
```

The Overview tab then repeats Teams, Captains, Eligible Participants, and Pool
counts.

Problems:

- The working section begins too far below the top of the page.
- Readiness and metrics are duplicated by the Control Center, Overview,
  Readiness, Budgets, and Pool sections.
- Blockers are permanently expanded.
- The Arena action is always visible even when setup work is the real priority.
- Eligibility is given equal top-level prominence despite being mostly
  diagnostic and derived.
- Readiness is treated as a destination and as permanent page chrome.

### 1.6 Current Arena Hierarchy

Both Arenas currently follow:

```text
Arena Header
-> Error/success state
-> Lifecycle controls
-> Participant Stage + Team Context
-> Live Bid Stream + Queue Summary
-> Recent Results
```

Strengths:

- No management tabs.
- Participant stage is visually dominant.
- Timer, bid, next bid, and leading Team are visible.
- Role controls are conditionally displayed.
- Team purse or credit comparison is compact.
- Results are limited to a recent strip.

Remaining hierarchy issues:

- Admin lifecycle controls can appear before the current participant stage.
- Full-width controls can visually compete with the live round.
- Queue controls are secondary during an active round but remain in normal
  reading order.
- Recent Results are useful after finalization but low priority during active
  bidding.
- The owner/captain Team panel and all-Team comparison can compete for the same
  secondary column.
- On mobile, sticky bidding is appropriate, but secondary content can still
  push the live feed and Team context far down the page.

### 1.7 Current Results Hierarchy

Festival Results have a dedicated page, but results also appear in:

- Festival Management.
- Festival Command Center.
- Festival Arena recent strip.
- Dashboard recent outcomes.

Sport results are primarily represented through Arena history and recent
outcomes rather than a dedicated Tournament Results experience.

Problems:

- Results are a content type, a tab, a strip, and a card destination without a
  single hierarchy.
- Historical bids and finalized outcomes are not consistently separated.
- Team-level outcomes require navigating through Auction-oriented views.
- Arena result links can return users to management instead of a reporting
  context.

### 1.8 Classification Of Current Information

| Current Information | Future Treatment |
| --- | --- |
| Festival/Tournament name | Compact persistent context |
| Current lifecycle status | Compact persistent context |
| One highest-priority blocker | Always visible when present |
| Complete blocker list | Expandable or dedicated readiness view |
| Primary action | Always visible |
| All quick actions | Compact action menu or secondary row |
| Participant/Team/Owner counts | Overview or contextual summaries |
| Readiness percentage | Supporting information, not primary |
| Readiness state | Visible only when it changes the next action |
| Configuration lock | Contextual to editable management sections |
| Full metrics grids | Move to Overview or remove |
| Recent results | Compact preview with Results destination |
| Audit information | Dedicated historical destination |
| Eligibility explanations | Contextual help in Eligibility |
| Live Auction state | Arena and live discovery surfaces only |

## 2. Information Hierarchy Principles

### 2.1 Information Classes

#### Primary Information

Information required to decide or perform the user's next action.

Examples:

- Pending finalization.
- Current participant and timer.
- Place Bid.
- Missing Captain blocking readiness.
- Generate Pool.
- Open live Arena.

Display rule: visible immediately without scrolling or expansion.

#### Secondary Information

Context that explains the primary action or helps choose between actions.

Examples:

- Current status.
- Assigned Team.
- Remaining purse or credits.
- First readiness blocker.
- Tournament parent Festival and Sport.

Display rule: visible near the primary action but visually subordinate.

#### Contextual Information

Information needed only in a specific section, state, or role.

Examples:

- Configuration lock details.
- Eligibility derivation.
- Re-auction controls.
- Full readiness checklist.
- Import guidance.

Display rule: shown only when relevant, often inline, expandable, or inside the
owning workspace.

#### Administrative Information

Configuration, correction, ownership, settings, and audit controls.

Examples:

- Owners and Retentions.
- Budget configuration.
- Tournament settings.
- Unlock/relock configuration.

Display rule: Management only. Never in an Arena.

#### Historical Information

Completed outcomes and immutable records.

Examples:

- Auction Results.
- Full bid history.
- Audit events.
- Final rosters.

Display rule: dedicated Results or History destinations, with only compact
previews elsewhere.

### 2.2 Priority Rules

1. A blocking or live action outranks every summary metric.
2. A page may have only one visually dominant primary action.
3. Counts are shown only when they change a decision.
4. The same status must not be presented in more than two places on one page.
5. Detailed readiness never appears above the active workspace.
6. Full history never appears in Command Centers or Arenas.
7. Administrative lock information appears only beside affected controls.
8. Empty sections collapse or disappear unless the empty state itself provides
   a useful next action.
9. The first laptop viewport must contain the page identity, primary action,
   and beginning of the working area.
10. Mobile shows one task, one status, and one primary action before supporting
    context.

### 2.3 Progressive Disclosure

Use three disclosure levels:

```text
Level 1: Immediate
Status, urgent action, active work

Level 2: Expandable
Blocker details, supporting metrics, secondary actions

Level 3: Destination
Configuration, full reports, history, audit
```

Collapsing information must not hide a required action or an error that blocks
progress.

## 3. Dashboard Redesign Strategy

### 3.1 Shared Dashboard Model

All role dashboards should use:

```text
Priority Rail
-> Live Now
-> My Work
-> Recent / Browse
```

The Priority Rail is a compact ranked list, not a large hero plus card grid.
Each item has one action.

### 3.2 Admin Dashboard

Immediately visible:

- Highest-priority pending finalization, paused Auction, or blocker.
- Live Auctions.
- Create Festival when no Festival exists.
- One compact Festival selector or active Festival context.

Grouped:

- Festival Journey and Next Actions become one `Festival Operations` list.
- Ready Auctions and blocked setup tasks are sorted by urgency.
- Recent Outcomes becomes a compact list limited to three entries.

Moved elsewhere:

- Full Festival lifecycle summaries to Festival Command Center.
- Detailed blockers to the relevant Management workspace.
- All historical outcomes to Results.

Removed from the default page:

- Large descriptive hero.
- Full card grid for every Festival.
- Empty sections with no actionable meaning.

Target hierarchy:

```text
[ Needs Attention: 3 ] [ Live: 2 ] [ Ready: 1 ]

Priority Work
1. Finalize current Festival round              [ Open Arena ]
2. Assign Captain for Cricket Tournament        [ Resolve ]
3. Launch ready Volleyball Auction              [ Open Arena ]

Live Now
[ Festival Auction ] [ Sport Auction ]

Festival Operations
[ Active Festival selector ] [ Open Command Center ]

Recent
Three compact outcomes                         [ View Results ]
```

### 3.3 Festival Team Owner Dashboard

Immediately visible:

- Active Festival or Sport Auction.
- Assigned Festival Team and remaining purse.
- Highest-priority managed Tournament blocker or launch action.

Grouped:

- `Sport Tournaments I Manage` and `What Is Next` become one ranked
  `Managed Tournaments` list.
- Captain responsibilities appear as a distinct compact subsection only when
  the user has Captain assignments.

Moved elsewhere:

- Full Team roster to Team or Management view.
- Detailed Tournament readiness to Tournament Command Center.

### 3.4 Captain Dashboard

Immediately visible:

- Active Sport Auction with Place Bid entry.
- Assigned Sport Team and remaining credits.
- Next Team-related action.

Grouped:

- Assignment and Team cards merge into one card per Tournament.
- Active Auction is a state of the assignment, not a duplicate section.

Removed until Phase 5:

- A full Upcoming Competitions section that contains only future-phase
  messaging.

### 3.5 Spectator Dashboard

Immediately visible:

- Live Now.
- Next scheduled or ready Auction.
- Most recent outcome.

Grouped:

- Festival Explorer becomes a compact browse action or carousel, not a full
  card grid below all other content.
- Upcoming and Results are limited previews.

The spectator page should feel like a live-event discovery product rather than
a read-only administration dashboard.

## 4. Festival Command Center Redesign

### 4.1 Purpose

The Festival Command Center is the Festival's operational landing page. It is
not a second Management workspace and not a reporting dashboard.

It answers:

- What phase is this Festival in?
- What needs attention?
- What is live?
- What is the next handoff?

### 4.2 Target Hierarchy

```text
Compact Festival Header
-> Attention Required
-> Primary Quick Actions
-> Progress Tracking
-> Expandable Supporting Context
```

### 4.3 Always Visible

Compact header:

- Festival name.
- Date range or active date.
- Festival status.
- Current phase.
- One primary action.
- Compact switcher to Management, Auctions, and Results.

Attention Required:

- At most three ranked blockers or live decisions.
- Show the owning scope: Festival or Tournament.
- Every item links directly to resolution.

Quick Actions:

- One primary action based on current state.
- Up to three secondary actions.
- Remaining actions in `More`.

Examples:

| State | Primary Action |
| --- | --- |
| Setup blocked | Resolve highest blocker |
| Festival Auction ready | Open Festival Arena |
| Festival Auction live/paused | Return to Festival Arena |
| Sport Tournament blocked | Resolve Tournament blocker |
| Sport Auction ready/live | Open Sport Arena |
| Allocation complete | View Results |

### 4.4 Expandable

- Full Festival readiness checklist.
- Complete blocker list.
- All Sport Tournament status cards.
- Supporting counts.
- Competition-readiness preview after Phase 5 planning is active.

### 4.5 Contextual

- Live Activity appears only when something is live or paused.
- Recent Results appear as a three-item preview only after results exist.
- Create Sport Tournament appears after the Festival roster supports that
  workflow.
- Competition readiness does not occupy a permanent section before Competition
  Engine exists.

### 4.6 Remove From Default Command Center

- Seven-metric overview grid.
- Separate Festival Auction Status section when the same status is in the
  header or Live Activity.
- Full card for every Tournament.
- Full Competition Readiness grid.
- Six-card Recent Results grid.

## 5. Festival Management Redesign

### 5.1 Target

Reduce the permanent content above the active workspace by at least 60%.

The target top region should fit within approximately 160-220 desktop pixels,
excluding temporary alerts.

### 5.2 Compact Festival Header

```text
Festival Name | Status | Auction Status
Command Center / Management / Results
Primary contextual action
```

It should not repeat dates, readiness counts, Team counts, Owner counts, Pool
counts, and explanatory text simultaneously.

### 5.3 Workspace Navigation

Replace the conceptual hierarchy:

```text
Operations View / Edit Configuration
-> second tab row
```

with one management navigation model:

```text
Overview
Participants
Teams
Owners
Retentions
Auction Preparation
Results
Bid History
Audit
Settings
```

Setup progression remains available when setup is incomplete, but it becomes
a guided task list inside Overview or Auction Preparation rather than a
permanent parallel mode above every section.

### 5.4 Permanently Visible

- Compact Festival context.
- Current management section.
- One contextual primary action.
- Critical alert affecting the current section.
- Section navigation.

### 5.5 Move Into Overview

- Festival dates, timezone, currency, and lifecycle details.
- Participant, Team, Owner, Retention, and Pool counts.
- Overall setup progress.
- Current phase summary.
- Final roster summary.

Overview should be a concise orientation page, not another Control Center.

### 5.6 Move Into Auction Preparation

- Budget configuration.
- Owner cost.
- Retention readiness.
- Pool generation.
- Readiness checklist.
- Open Auction Arena action.

Only the highest-priority preparation blocker should appear outside this
section.

### 5.7 Move Into Audit

- Unlock/relock history.
- Configuration mutation history.
- Setup changes.
- Auction-operation audit records.

### 5.8 Contextual Or Collapsible

- Configuration lock controls appear only in editable management sections.
- Lock explanation is collapsed by default unless a blocked action is
  attempted.
- Full readiness checklist is collapsed after readiness becomes `READY`.
- Import guidance lives in the import dialog, not the page.
- Advanced roster-mode explanation is collapsed under the setting.

### 5.9 Target Desktop Wireframe

```text
+--------------------------------------------------------------------------+
| Festival Name       ACTIVE | Auction: LIVE        [ Open Arena ] [ More ]|
| Command Center / Management / Results                                    |
+--------------------------------------------------------------------------+
| Overview | Participants | Teams | Owners | Retentions | Preparation ...  |
+--------------------------------------------------------------------------+
| SECTION TITLE                                  [ Primary Section Action ] |
|                                                                          |
| Actual working content begins here                                     |
|                                                                          |
+--------------------------------------------------------------------------+
```

## 6. Sport Tournament Command Center Redesign

### 6.1 Purpose

Create a conceptual Tournament Command Center distinct from the Management
workspace. It may initially share the same destination, but its information
architecture must be separate.

It answers:

- What is blocked?
- What is ready?
- Can the Auction be launched?
- What should the Tournament Owner do next?

### 6.2 Target Hierarchy

```text
Compact Tournament Context
-> Primary State And Action
-> Attention Required
-> Progress Steps
-> Supporting Summary
```

### 6.3 Always Visible

- Tournament name.
- Festival Team and Sport.
- Status.
- Highest-priority blocker or `Ready`.
- One primary action.

Primary actions:

| State | Action |
| --- | --- |
| No Teams | Review Teams |
| Missing Captains | Assign Captains |
| Missing Budgets | Configure Budgets |
| No Pool | Generate Pool |
| Ready | Open Sport Auction Arena |
| Live/Paused/Pending | Return to Arena |
| Completed | View Results |

### 6.4 Progress Tracking

Use a short workflow:

```text
Teams -> Captains -> Budgets -> Pool -> Ready -> Auction
```

Each step displays:

- Complete.
- Needs attention.
- Locked.
- Current.

Avoid a percentage when step completion communicates more clearly.

### 6.5 Expandable Supporting Information

- Full blocker list.
- Eligibility counts.
- Total credits.
- Pool composition.
- Readiness calculation details.

### 6.6 Remove From Default Command Center

- Eight-metric grid.
- Duplicate status metric.
- Permanently expanded blockers.
- Readiness percentage as the dominant visual.
- Overview metrics repeated by Management tabs.

## 7. Sport Tournament Management Redesign

### 7.1 Purpose

Management owns setup and correction:

```text
Teams
Captains
Budgets
Pool
Settings
```

Eligibility and Readiness support those tasks but should not compete as equal
primary destinations.

### 7.2 Final Management Structure

```text
Overview
Teams
Captains
Budgets
Pool
Settings

Supporting:
Eligibility
Readiness Details
```

Recommended treatment:

- `Eligibility` becomes a contextual view linked from Captains and Pool.
- `Readiness` becomes a drawer, expandable panel, or Command Center detail.
- The primary tab row contains the five working sections plus Overview.

### 7.3 Compact Header

Show:

- Tournament name.
- Sport and parent Festival Team.
- Status.
- One contextual action.
- Link to Command Center and Arena.

Do not show:

- Eight summary metrics.
- Full blocker list.
- Readiness percentage and progress bar when not needed.

### 7.4 Section Rules

Teams:

- Team names and edit action first.
- Captain, credits, and roster counts as compact secondary columns.

Captains:

- Missing assignments first.
- Eligibility explanation collapsible.
- Completed assignments below unresolved work.

Budgets:

- Distribution action first.
- Team allocations second.
- Total metrics compact and inline.

Pool:

- Generate/regenerate action first.
- Available count and freshness state second.
- Exclusion details collapsed.

Settings:

- Tournament identity and Auction configuration separated into labeled groups.
- Locked fields explain the reason only when interacted with or when the section
  opens.

## 8. Arena Experience Review

### 8.1 Arena Principle

The Arena is a live operations surface, not a scrollable report.

During an active round, the hierarchy is:

```text
Current Participant
-> Timer And Bid State
-> Role Action
-> My Team Context
-> Live Bid Stream
-> All-Team Comparison
-> Queue And Recent Results
```

### 8.2 Primary Zone

Always visible during a live round:

- Participant identity.
- Department, gender, and registered Sports where relevant.
- Base value.
- Current bid.
- Next bid.
- Leading Team.
- Timer.
- Place Bid for Owner/Captain.
- Pending finalization action for Admin/Owner-manager.

The primary zone must occupy the largest visual area.

### 8.3 Secondary Zone

- My Team purse or credits.
- Remaining slots.
- Compact all-Team comparison.
- Live bid stream.
- Connection state.

These support the live decision but must not exceed the participant stage's
visual weight.

### 8.4 Supporting Zone

- Queue summary.
- Re-auction controls.
- Recent results.
- Progress counts.
- Secondary lifecycle actions.

Treatment by state:

| State | Supporting Zone Behavior |
| --- | --- |
| Active bidding | Collapsed or below live stream |
| Pending finalization | Queue remains secondary; finalization dominates |
| Paused | Lifecycle controls become prominent |
| Between rounds | Queue selection becomes primary Admin work |
| Completed | Recent results and full Results action move upward |

### 8.5 Role-Specific Hierarchy

Admin or Tournament Owner:

- Lifecycle controls should be compact in the header.
- Round controls appear inside the participant stage only when no round is
  active.
- Finalization actions replace bidding emphasis when pending.

Festival Team Owner or Captain:

- Place Bid is the only dominant action.
- My Team context remains immediately adjacent.
- Administrative controls do not render.

Spectator:

- Participant, timer, current bid, leading Team, and live stream dominate.
- Team comparison is secondary.
- Queue and recent results are supporting.

### 8.6 Arena Distractions To Avoid

- Full histories.
- Full rosters.
- Management links repeated throughout the page.
- Readiness.
- Setup metrics.
- Configuration status.
- More than one dominant action.
- Large descriptive headings.

## 9. Results Experience

### 9.1 Results Hierarchy

Results should become a reporting family:

```text
Results
|-- Festival Results
|   |-- Main Auction Results
|   |-- Festival Team Rosters
|   `-- Festival Audit
|
`-- Sport Tournament Results
    |-- Sport Auction Results
    |-- Sport Team Rosters
    `-- Bid History
```

Future Competition Results join this hierarchy after Phase 5:

```text
Competition Results
|-- Match Results
|-- Standings
`-- Playoffs / Finals
```

### 9.2 Result Types

Festival Results:

- Sold and unsold participants.
- Winning Festival Team.
- Final price.
- Final Festival rosters.

Tournament Results:

- Sold and unsold players.
- Winning Sport Team.
- Final credits.
- Final Sport rosters.

Auction Results:

- Outcome-focused view.
- Filters by sold, unsold, Team, and participant.

Team Results:

- Final roster.
- Total spent.
- Remaining purse or credits.
- Purchases and retained/captain context.

### 9.3 History Separation

Results answer `what happened`.

Bid History answers `how the price progressed`.

Audit answers `who changed operational or configuration state`.

These should not be merged into one generic History destination.

### 9.4 Preview Rules

- Dashboard: maximum three recent outcomes.
- Command Center: maximum three Festival-scoped outcomes.
- Arena: maximum four latest finalized rounds.
- Full filtering, export, and analysis live only in Results.

## 10. Navigation Architecture

### 10.1 Final Global Navigation

Current approved foundation:

```text
Dashboard
Festivals
Auctions
Sport Tournaments
Employees
```

Recommended role visibility:

| Destination | Admin | Owner | Captain | Spectator |
| --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes |
| Festivals | Yes | Assigned context | Assigned context | Browse context |
| Auctions | Yes | Yes | Yes | Yes |
| Sport Tournaments | Yes | Managed | Assigned | No primary item |
| Results | Yes | Assigned | Assigned | Yes |
| Employees | Yes | No | No | No |

`Results` should become a top-level destination only when it can aggregate
Festival and Sport results coherently. Before that point, Results remains
contextual.

### 10.2 Context Navigation

Festival:

```text
Command Center | Management | Auction Arena | Results
```

Sport Tournament:

```text
Command Center | Management | Auction Arena | Results
```

These labels must have stable meanings:

- Command Center: status, attention, next action.
- Management: configuration and setup work.
- Arena: live operation.
- Results: completed outcomes and history.

### 10.3 Navigation Rules

1. An Arena link always opens an Arena.
2. A Management link never opens live bidding.
3. A Results link never opens an Arena as its final destination.
4. Command Center links resolve to the correct downstream surface.
5. Browser back returns to the source context without losing the selected
   management or result section.
6. Global navigation does not expose compatibility-era names.
7. Assignment-aware actions are surfaced on Dashboard and context pages without
   multiplying global navigation items.

### 10.4 Breadcrumb Model

Desktop contextual breadcrumb:

```text
Festivals / Corporate Sports Festival / Management / Teams
Festivals / Corporate Sports Festival / Cricket Men / Auction Arena
```

Mobile uses a compact back label:

```text
< Corporate Sports Festival
```

Breadcrumbs communicate hierarchy; they do not replace the contextual
destination switcher.

## 11. Mobile Hierarchy

### 11.1 Platform Rules

- First viewport contains identity, status, and primary action.
- Secondary actions move into `More`.
- Tabs are horizontally scrollable only when six or fewer short items remain;
  otherwise use a section selector.
- Metrics become compact inline summaries, not stacked full-width cards.
- Supporting lists default collapsed after the first three items.
- Tables use horizontal scrolling; pages do not.
- Sticky elements are limited to one navigation header and one live action
  region.

### 11.2 Dashboard Mobile

```text
[ Highest Priority Action ]
[ Live Now ]
[ My Work ]
[ Recent ]
```

- No large hero.
- One card per row.
- Empty sections hidden.
- Browse actions become links rather than additional cards.

### 11.3 Command Center Mobile

```text
Festival Name | Status
[ Primary Action ]
[ 2 blockers ]
[ Progress ]
[ More details ]
```

- Full metric grids hidden behind `Details`.
- Quick Actions become one primary button plus an action sheet.
- Tournament list uses compact rows.

### 11.4 Management Mobile

- Compact context header.
- Current section selector.
- Primary section action.
- Working form/list.
- Readiness and configuration details collapsed.
- Dialogs become full-screen where form density requires it.

### 11.5 Arena Mobile

Priority order:

```text
Participant
Timer
Current / Next Bid
Place Bid or Finalize
My Team
Live Bid Stream
Team Comparison
Queue
Recent Results
```

- Bid action may remain bottom-sticky.
- Participant and timer must not be hidden by the sticky action.
- Team comparison may use compact rows.
- Queue controls collapse during an active round.
- Admin lifecycle actions use an action sheet except the state-critical action.

### 11.6 Tablet

- Arena uses a two-column primary layout.
- Management may use a compact left section rail when width permits.
- Dashboard uses two-column cards only for items of equal priority.
- Command Center keeps Attention and Progress side by side.

## 12. Workspace Consistency Rules

### Headers

- One page header per experience.
- Context headers are compact.
- Descriptive paragraphs are optional and never larger than the working
  section.
- Status appears once in the header and once only when required in content.

### Status Indicators

- Use consistent lifecycle vocabulary.
- `Live`, `Paused`, `Pending Finalization`, `Ready`, `Blocked`, and `Completed`
  retain consistent color and wording.
- Do not combine status, readiness, and phase into one ambiguous label.

### Metrics

- Maximum four immediate metrics.
- A metric must support a decision.
- Detailed counts belong in Overview or expandable Details.
- Avoid one-card-per-number when inline values are sufficient.

### Tabs And Section Navigation

- Tabs represent peer working sections, not modes plus sections.
- No nested tab rows.
- Historical and administrative sections may be grouped under `More`.
- Active section is addressable and survives browser navigation.

### Actions

- One contained primary action per region.
- Secondary actions use lower emphasis.
- Destructive actions require explicit confirmation and are not visually
  dominant until relevant.
- Labels use verbs and destinations: `Open Arena`, `Assign Captains`,
  `Generate Pool`, `View Results`.

### Cards

- Cards group one decision or one object.
- Avoid cards used solely as spacing containers.
- Dense operational lists use rows rather than repeated large cards.
- Do not repeat the same object across multiple sections on one page.

### Empty States

- State what is missing.
- Explain whether this is expected.
- Present one next action when the user can resolve it.
- Hide non-actionable empty previews from dashboards.

### Alerts

- Errors and blockers remain visible until resolved or dismissed.
- Informational guidance belongs near the affected field or section.
- Do not stack multiple persistent banners above navigation.
- Success feedback is temporary and concise.

### Banners

- Reserve banners for cross-section conditions.
- Configuration lock is not a global banner unless the entire workspace is
  unavailable.
- Live connection loss is a valid Arena banner.

### Progress Displays

- Prefer named workflow steps over percentages for setup.
- Percentages are acceptable only when the calculation is meaningful and
  understandable.
- Do not show progress twice on the same page.

## 13. Implementation Roadmap

No implementation is included in this document.

### Phase 4E-H1: Hierarchy Simplification

Scope:

- Establish compact page headers and action hierarchy standards.
- Simplify role dashboards.
- Remove duplicate metric and status presentations.
- Collapse non-actionable empty sections.
- Define common lifecycle terminology.

Independent deployment:

- No route or workflow changes required.
- Existing destinations and permissions remain unchanged.

Success criteria:

- Primary action visible in the first viewport.
- Dashboard default height reduced materially.
- No page repeats the same status more than twice.

### Phase 4E-H2: Festival Workspace Modernization

Scope:

- Compact Festival Management header.
- Remove permanent Control Center and lock-card height from Management.
- Unify management navigation.
- Move metrics to Overview.
- Move readiness into Auction Preparation.
- Make configuration lock contextual.
- Simplify Festival Command Center.

Independent deployment:

- Festival Arena and Sport surfaces remain unchanged.
- Existing Festival workflows remain available.

Success criteria:

- At least 60% reduction in permanent top-page height.
- Active Festival task begins in the first laptop viewport.
- No nested mode and section tab rows.

### Phase 4E-H3: Tournament Workspace Modernization

Scope:

- Introduce action-first Tournament Command Center hierarchy.
- Compact Tournament Management header.
- Reduce primary Management sections.
- Make Eligibility and Readiness supporting views.
- Remove duplicate metrics and expanded blockers.

Independent deployment:

- Sport Arena behavior and Auction logic remain unchanged.

Success criteria:

- Tournament Owner sees blocker or launch action immediately.
- Teams, Captains, Budgets, Pool, and Settings are direct working destinations.
- Overview no longer duplicates the header.

### Phase 4E-H4: Navigation Cleanup

Scope:

- Standardize Command Center, Management, Arena, and Results context navigation.
- Define Results hierarchy.
- Add consistent breadcrumbs and destination labels.
- Remove remaining conceptual compatibility labels from visible navigation.

Independent deployment:

- Compatibility destinations may remain operational behind redirects.

Success criteria:

- No link labeled Management opens an Arena.
- No Results action terminates in a live operations screen.
- Users can identify their current product layer at a glance.

### Phase 4E-H5: Mobile Optimization

Scope:

- Mobile priority ordering.
- Compact section selectors.
- Arena action hierarchy.
- Collapsible secondary content.
- Touch target and viewport validation.

Independent deployment:

- Desktop hierarchy remains intact.

Success criteria:

- No page-level horizontal overflow.
- Primary action and status are visible without initial scrolling.
- Arena participant, timer, and role action remain continuously reachable.

## 14. Risks

### Discoverability Risk

Collapsing supporting information may make infrequent features harder to find.
Mitigation: stable context navigation, meaningful `More` grouping, and direct
links from blockers.

### Oversimplification Risk

Removing metrics indiscriminately can hide useful operational context.
Mitigation: retain metrics that change a decision and move the rest into
Overview or Details.

### Role Complexity Risk

One user may be an Owner, Captain, Admin, and Spectator in different scopes.
Mitigation: rank actions by capability and urgency rather than forcing one
exclusive persona.

### State-Dependent Layout Risk

Pages may shift significantly between setup, live, pending, and completed
states.
Mitigation: preserve stable page zones while changing the primary action and
supporting emphasis.

### Results Fragmentation Risk

Introducing a Results family without clear scope can create another navigation
layer.
Mitigation: keep Festival and Tournament context explicit and separate
outcomes, bids, and audit.

### Mobile Disclosure Risk

Collapsible content can hide errors or operationally important state.
Mitigation: blockers, connection failures, and required actions never collapse.

### Data Aggregation Risk

Cleaner Command Centers may still require broad frontend data aggregation.
Mitigation: treat summary endpoint design as a later performance concern; do
not let data-loading shape force visible information overload.

### Migration Risk

Users familiar with current tab positions may initially lose orientation.
Mitigation: deploy in independently reversible phases, preserve labels where
meaning remains correct, and use temporary contextual guidance.

## 15. Recommended Rollout Strategy

1. Approve hierarchy rules and lifecycle terminology before visual design.
2. Validate H1 using representative Admin, Owner, Captain, and Spectator data.
3. Modernize Festival surfaces before Tournament surfaces because Festival is
   the primary business object.
4. Keep Arena logic unchanged while adjusting only information priority.
5. Introduce Results hierarchy after Management and Arena boundaries are
   stable.
6. Complete mobile optimization after desktop content priority is approved,
   not as a separate visual redesign.
7. Measure each phase against:
   - Distance to primary action.
   - Initial viewport content.
   - Number of repeated statuses.
   - Number of sections before working content.
   - Mobile scroll depth.
   - Navigation errors between Management, Arena, and Results.

## Final Recommended Product Model

```text
Dashboard
|
|-- Festival
|   |-- Command Center
|   |-- Management
|   |-- Festival Auction Arena
|   |-- Results
|   |
|   `-- Sport Tournament
|       |-- Command Center
|       |-- Management
|       |-- Sport Auction Arena
|       `-- Results
|
|-- Auctions
|   |-- Live
|   |-- Ready
|   `-- Completed
|
`-- Results
    |-- Festival Results
    `-- Sport Tournament Results
```

The defining rule is:

> Command Centers decide, Management configures, Arenas operate live, and
> Results explain what happened.

This separation should be approved before any Phase 4E-H implementation begins.
