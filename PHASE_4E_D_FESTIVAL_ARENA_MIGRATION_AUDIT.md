# Phase 4E-D Festival Auction Arena Migration Audit

## Status

Audit and migration planning only.

This document does not authorize or implement code, route, API, socket,
permission, schema, or UI changes.

## 1. Audit Scope

This audit compares the approved Phase 4E product architecture with the current
Festival experience in:

- `FestivalLiveAuctionPage`
- `FestivalDetail`
- `MainFestivalAuction`
- Festival workspace tabs and setup steps
- Festival overview, readiness, Team, Owner, history, results, and audit views
- The canonical Festival Auction route established in Phase 4E-A

The approved product boundary is:

```text
Festival Command Center
|-- Festival Management
`-- Festival Auction Arena
```

Festival Management owns configuration, preparation, correction, rosters, and
reporting. The Festival Auction Arena owns only the focused live Auction
experience.

## 2. Classification Rules

| Classification | Meaning |
|---|---|
| A. Move to Arena | Required to understand or operate the current live Auction |
| B. Move to Festival Management | Configuration, detailed records, durable reporting, or administrative correction |
| C. Move to Festival Command Center | Festival-wide status, journey progress, blockers, and entry actions |
| D. Remove entirely | Duplicate navigation or presentation that has no place in the target information architecture |

`Remove entirely` means remove from the future Festival experience. It does not
mean delete business records or backend capabilities.

## 3. Current Architecture Findings

### 3.1 Dedicated Festival Auction Route

The canonical route is:

```text
/auctions/festivals/:festivalId
```

It currently renders `FestivalLiveAuctionPage` inside the standard application
shell. The page is not yet a focused Arena. It is a role-dependent tabbed
workspace:

```text
Admin/Spectator:
Overview | Live Auction | Teams | Results | History

Festival Team Owner:
Overview | Teams | Auction | Bid History
```

This mixes the live experience with Festival browsing and reporting.

### 3.2 Festival Management Workspace

`FestivalDetail` currently contains:

- Festival Control Center
- Festival configuration status
- Operations/configuration mode tabs
- Setup wizard
- Operations tabs
- Festival overview
- Participant administration
- Team directory
- Owner assignment
- Retentions
- Auction configuration and pool
- Readiness
- Embedded live Auction
- Bid history
- Results
- Audit

The embedded `Auction` tab duplicates the live experience at the dedicated
Auction route and violates the approved Arena boundary.

### 3.3 Current Live Auction Component

`MainFestivalAuction` combines four concerns in one component:

1. Auction state loading and Socket.IO synchronization.
2. Timer and expiry recovery.
3. Admin and Owner Auction actions.
4. All live presentation, queue presentation, bid tables, and optional full
   Auction history.

The underlying behavior is appropriate for reuse, but the component boundary is
too broad for the target Arena composition.

### 3.4 Duplicate Data Ownership

Several concepts appear in multiple places:

- Festival status appears in viewer overview, management Control Center, and
  Command Center.
- Team purse and roster summaries appear in viewer overview, Team directory,
  and the live Auction.
- Auction history is exposed by `MainFestivalAuction`, `FestivalHistory`, and
  `FestivalBidHistory`.
- Readiness appears in `FestivalOverview`, `FestivalReadiness`, the management
  Control Center, and the Festival Command Center.

Phase 4E-D must assign each concept a primary home and use only compact,
purpose-specific summaries elsewhere.

## 4. Primary Migration Matrix

| Current Section | Current Location | Classification | Future Location | Decision |
|---|---|---:|---|---|
| Viewer tab bar | Festival Auction route | D | None | Remove the workspace-style tabs from the Arena |
| Viewer Overview tab | Festival Auction route | C | Festival Command Center | Festival identity, lifecycle, and broad counts are not live Auction content |
| Live Auction/Auction tab | Festival Auction route | A | Festival Auction Arena | Make this the route's primary and only page body |
| Teams tab | Festival Auction route | B | Festival Management: Teams/Rosters | Full Team browsing is management content |
| Results tab | Festival Auction route | B | Festival Management: Results | Full outcome reporting is not part of live execution |
| History tab | Festival Auction route | B | Festival Management: Bid History/Audit | Detailed history belongs in reporting |
| Owner Bid History tab | Festival Auction route | B | Festival Management or Owner reporting entry | Preserve Owner-filtered history, but remove it from the Arena |
| Operations/configuration mode tabs | Festival Management | B | Festival Management navigation | Replace ambiguous modes with explicit management sections |
| Operations tab bar | Festival Management | B/D | Festival Management sidebar/section navigation | Preserve sections; remove the embedded Auction destination |
| Management Overview | Festival Management | C/B | Command Center summary plus Management overview | Festival journey belongs in Command Center; detailed management state may remain |
| Participants | Festival Management | B | Festival Management: Participants | Unchanged product ownership |
| Teams | Festival Management | B | Festival Management: Festival Teams | Unchanged product ownership |
| Owners | Festival Management | B | Festival Management: Owners | Unchanged product ownership |
| Retentions | Festival Management | B | Festival Management: Retentions | Unchanged product ownership |
| Embedded Auction tab | Festival Management | A/D | Arena via `Open Auction Arena` | Move live content to Arena and remove the management tab |
| Bid History | Festival Management | B | Festival Management: Bid History | Preserve full searchable/drill-down reporting |
| Results | Festival Management | B | Festival Management: Results | Preserve durable Auction outcomes |
| Audit | Festival Management | B | Festival Management: Audit | Preserve administrative traceability |
| Festival setup wizard | Festival Management | B | Festival Management: Setup | Must never appear in Arena |
| Budget configuration | Festival setup | B | Festival Management: Auction Preparation | Must never appear in Arena |
| Auction pool generation/review | Festival setup | B | Festival Management: Auction Preparation | Arena may show live queue only, not pool configuration |
| Detailed readiness | Festival setup | B | Festival Management: Auction Preparation/Readiness | Preserve server-validated details and Team blocker cards |
| Readiness summary/blocker count | Management surfaces | C | Festival Command Center | Festival-wide operational summary |
| Configuration lock/unlock | Festival Management | B | Festival Management: Settings/Setup | Must never appear in Arena |

## 5. Live Auction Section Migration Matrix

| Current `MainFestivalAuction` Section | Classification | Target Treatment |
|---|---:|---|
| Auction identity and status | A | Arena header |
| Error and success messages | A | Arena-level status area; never behind live content |
| Start Auction | A | Admin Arena lifecycle controls when readiness permits |
| Pause Auction | A | Admin Arena lifecycle controls |
| Resume Auction | A | Admin Arena lifecycle controls |
| End Auction | A | Admin Arena lifecycle controls with destructive-action hierarchy |
| Current participant identity | A | Primary Arena panel |
| Employee number, department, and gender | A | Compact participant context |
| Registered Sports and Sport count | A | Compact participant context |
| Base price | A | Primary bid metrics |
| Increment percentage and amount | A | Secondary live metric |
| Current bid | A | Primary bid metrics |
| Next/opening bid | A | Primary bid metrics and Owner action label |
| Leading Team | A | Primary live state |
| Timer | A | Persistent primary live state |
| Pending-finalization state | A | Dedicated Admin finalization state |
| Team remaining purse list | A | Arena Team purse panel |
| Owner Team summary | A | Arena `My Team` panel |
| Owner Place Bid action | A | Arena primary action |
| Admin participant search | A | Between-round Arena state |
| Admin base-price entry | A | Between-round Arena state |
| Start participant round | A | Between-round Arena state |
| Extend round | A | Pending-finalization Admin action |
| Sell | A | Pending-finalization Admin action |
| Mark unsold | A | Pending-finalization Admin action |
| Available queue count | A | Compact queue summary |
| Available participant names | A | Expandable Arena queue drawer/panel |
| Unsold queue count | A | Compact queue summary |
| Unsold participant list | A | Admin queue panel |
| Re-auction selected/all | A | Admin queue controls |
| Current-round bid history table | A | Redesign as live bid stream |
| Full Auction history table | B | Festival Management: Results/Bid History |
| Roster-changed callback behavior | A | Preserve as integration behavior, not visible content |

## 6. Festival Overview Migration

### Current Viewer Overview

The current viewer Overview contains Festival identity, Festival dates,
Festival status, Auction status, Team count, pool count, unsold count, current
participant, and an Owner Team summary.

Migration:

| Overview Element | Classification | Future Location |
|---|---:|---|
| Festival name and code | A | Compact Arena identity |
| Festival dates and broad lifecycle status | C | Festival Command Center |
| Auction status | A | Arena header |
| Team count | C | Festival Command Center |
| Pool and unsold counts | A | Arena queue summary while Auction is active |
| Current participant | A | Arena primary panel |
| Owner Team remaining purse | A | Arena `My Team` panel |
| Owner Team full roster context | B | Festival Management: Teams/Rosters |

The `FestivalViewerOverview` page-level composition should not survive inside
the Arena. Its live data concepts should be consumed by dedicated Arena panels.

### Current Management Overview

`FestivalOverview` is a readiness/count dashboard. Its Festival-wide journey
and blocker summary belongs primarily in the Festival Command Center. A smaller
management overview may remain for setup context, but it must not duplicate the
Command Center.

## 7. Team View Migration

`FestivalTeamsDirectory` provides:

- All Festival Teams
- Owner identity
- Remaining purse
- Retentions
- Purchased participant count
- Full current roster
- Owner Team highlighting

Decision:

- **B. Festival Management** is the primary home for the complete component.
- **A. Arena** receives only compact live Team purse summaries and the current
  Owner's Team context.
- The full accordion Team directory and rosters must not appear inside the
  Arena.
- `View Team` may exit the Arena to the appropriate management/reporting view
  when the user's permissions allow it.

## 8. Owner View Migration

| Current Owner Experience | Classification | Target |
|---|---:|---|
| Owner assignment and activation | B | Festival Management: Owners |
| Owner credentials resend/change controls | B | Festival Management: Owners |
| Owner Team full roster | B | Festival Management: Teams/Rosters |
| Owner Team remaining purse | A | Arena `My Team` panel |
| Owner Team purchased/retained counts | A | Compact Arena context |
| One-click Place Bid | A | Primary Arena action |
| Owner read-only available/unsold queues | A | Compact/expandable Arena queue view |
| Owner bid history filters | B | Festival Management or Owner reporting |
| Won/outbid participant drill-down | B | Festival Management or Owner reporting |

Owner identity must continue to come from the authenticated server-side Auction
viewer context. The migration must not introduce client-selected Team identity.

## 9. History, Results, and Audit Migration

### Current-Round Live Bids

The bids for the active participant are execution-time information.

Decision: **A. Arena**

They should become a reverse-chronological live bid stream showing:

- Bid number
- Team
- Amount
- Timestamp
- Clear highlighting for the viewer's Team where applicable

### Full Bid History

`FestivalBidHistory` provides participant-level history, Owner filters, result
status, sold price, winning Team, and a complete bid-sequence dialog.

Decision: **B. Festival Management**

This is durable reporting, not live execution.

### Auction Results

`FestivalHistory` provides searchable and filterable Auction outcomes.

Decision: **B. Festival Management**

The Arena may show only a compact recent-results strip containing the latest
few finalized rounds. It must not expose full filtering or historical tables.

### Re-Auction History

Decision: **B. Festival Management**

The Arena keeps current unsold and re-auction controls, but the historical
record of re-auction actions remains reporting/audit content.

### Owner Activity and Retention History

Decision: **B. Festival Management**

These are administrative records and must not appear in the Arena.

### Audit Log

Decision: **B. Festival Management**

The complete audit log must never be embedded in the Arena.

## 10. Readiness Migration

`FestivalReadiness` contains server-validated prerequisite counts, Team
readiness cards, and exact blockers.

| Readiness Content | Classification | Target |
|---|---:|---|
| Full prerequisite counts | B | Festival Management: Auction Preparation/Readiness |
| Team readiness cards | B | Festival Management: Auction Preparation/Readiness |
| Exact actionable setup blockers | B | Festival Management with deep links to correction sections |
| Festival blocker count and highest-priority blockers | C | Festival Command Center |
| Ready/not-ready Auction summary | C | Festival Command Center |
| Live/paused/pending/completed Auction status | A | Arena header |
| Setup diagnostics during a live round | D | Remove from Arena |

The Arena may display a concise pre-launch unavailable state when the Auction
cannot start, with an authorized link back to readiness. It must not reproduce
the readiness workspace.

## 11. Tab Migration

### Current Festival Auction Tabs

```text
Overview
Live Auction / Auction
Teams
Results
History / Bid History
```

Target:

```text
No Arena tabs

Arena Header
Active Live Content
Optional links: Results | Exit
```

The results link leaves the Arena. It does not mount results inside an Arena
tab.

### Current Festival Management Tabs

```text
Overview
Participants
Teams
Owners
Retentions
Auction
Bid History
Results
Audit
```

Target:

```text
Overview
Setup
Participants
Festival Teams
Owners
Retentions
Auction Preparation
Rosters
Results
Bid History
Audit
Settings
```

The current `Auction` tab is removed. Its live content moves to the Arena.
Configuration and readiness content are named `Auction Preparation`.

## 12. Component Disposition

### 12.1 Reuse With Minimal or No Behavioral Change

| Component/Utility | Disposition |
|---|---|
| `VisualTimer` | Reuse in Arena |
| `auctionSynchronization` utilities | Reuse without changing synchronization semantics |
| API client in `utils/api.js` | Reuse |
| Socket singleton in `webSocket/socket.js` | Reuse |
| `FestivalTeamsDirectory` | Keep in Festival Management |
| `FestivalBidHistory` | Keep as reporting outside Arena |
| `FestivalHistory` | Keep as results/audit reporting outside Arena |
| `FestivalReadiness` | Keep in Festival Management |
| `FestivalAuctionSetup` | Keep in Festival Management |
| `FestivalTeamBuilder` | Keep in Festival Management |
| `FestivalDetailsConfiguration` | Keep in Festival Management |

### 12.2 Components Requiring Extraction

`MainFestivalAuction` should be decomposed by responsibility. Required
extractions:

- Auction state loading and refresh orchestration
- Festival Auction Socket.IO room lifecycle
- Revision-aware snapshot application
- Timer/clock-offset and expiry-confirmation behavior
- Auction action execution and in-flight protection
- Current participant panel
- Live bid metrics
- Live bid stream
- Team purse panel
- Owner Team and bid controls
- Admin lifecycle controls
- Admin participant selection
- Admin finalization controls
- Available/unsold queue controls
- Compact recent-results data

The extraction must preserve current server-authoritative behavior. It must not
rewrite bidding, timer, finalization, or synchronization rules as part of the
layout migration.

### 12.3 Components Requiring Redesign

| Component/Area | Required Redesign |
|---|---|
| `FestivalLiveAuctionPage` | Replace tabbed viewer composition with focused Arena composition |
| `MainFestivalAuction` presentation | Replace single long card with role-aware Arena regions |
| Current bid-history table | Present as a live bid stream |
| Remaining purse cards | Prioritize viewer Team and compact all-Team comparison |
| Auction queues | Use summary plus expandable detail; prioritize Admin controls |
| Admin controls | Group by lifecycle, between-round, and pending-finalization states |
| Owner controls | Make the next valid bid the single primary action |
| Arena header | Add identity, status, connection, Team context, and exit |
| Recent results | Add a compact strip; link to full Management results |

### 12.4 Components That Should Not Be Reused Inside the Arena

- `FestivalViewerOverview`
- Full `FestivalTeamsDirectory`
- Full `FestivalBidHistory`
- Full `FestivalHistory`
- `FestivalReadiness`
- `FestivalOverview`
- `FestivalControlCenter`
- `FestivalConfigurationStatus`
- `FestivalSetupWizard`
- `FestivalAuctionSetup`

Their data may overlap with Arena data, but their page-level information
architecture is not Arena-appropriate.

## 13. Exact Target Festival Auction Arena Layout

### 13.1 Global Arena Rules

- No workspace tab bar.
- No management sidebar.
- No setup wizard.
- One natural document scroll.
- No nested vertical scrolling except a bounded table/list treatment where
  unavoidable.
- Current participant, timer, current bid, next bid, and primary action remain
  visually dominant.
- Role changes controls, not the core information hierarchy.
- Status, connection, errors, and server synchronization notices remain visible
  above affected content.

### 13.2 Desktop Layout

```text
+--------------------------------------------------------------------------------+
| AUCTIONARENA | Festival Name - Main Auction                                    |
| LIVE/PAUSED/PENDING | Connection | Team Context | Results | Exit              |
+---------------------------------------------------+----------------------------+
| CURRENT PARTICIPANT                               | MY TEAM                    |
| Name, employee context, Sports                    | Team, Owner                |
|                                                   | Remaining purse            |
| Base Price | Current Bid | Next Bid | Leader      | Spent, roster, retained    |
|                                                   +----------------------------+
|                      TIMER                        | TEAM PURSES                 |
|                                                   | Compact all-Team comparison|
| PRIMARY ROLE ACTION                               |                            |
| Owner: Place Bid                                  |                            |
| Admin: Extend / Sell / Unsold when pending        |                            |
+---------------------------------------------------+----------------------------+
| LIVE BID STREAM                                   | AUCTION QUEUES             |
| Ordered active-round bids                         | Available / Unsold counts  |
| Viewer Team highlighted                           | Role-appropriate controls  |
+---------------------------------------------------+----------------------------+
| RECENT RESULTS: latest finalized rounds | View Full Results                   |
+--------------------------------------------------------------------------------+
```

### 13.3 Admin State: Between Rounds

The primary panel changes to:

```text
START NEXT PARTICIPANT
Search available participant
Review participant identity and Sports
Enter base price
Start participant round
```

Queue detail and re-auction controls become prominent. Team purses and recent
results remain visible.

### 13.4 Admin State: Pending Finalization

The primary panel changes to:

```text
PENDING FINALIZATION
Participant
Winning bid
Leading Team
Bid count
Purse validation context

[ Extend Round ] [ Sell to Leading Team ] [ Mark Unsold ]
```

Bidding controls are disabled because the server locks bidding on expiry.

### 13.5 Owner State

Owner priority order:

1. Current participant.
2. Timer.
3. Current and next bid.
4. Owner remaining purse.
5. Place Bid.
6. Live bid stream.
7. All-Team purses.
8. Queue summary.
9. Recent results.

### 13.6 Spectator State

Spectator priority order:

1. Current participant.
2. Timer.
3. Current bid, next bid, and leading Team.
4. Live bid stream.
5. Team purse comparison.
6. Queue summary.
7. Recent results.

No disabled Admin or Owner controls should be shown.

### 13.7 Mobile Layout

```text
+----------------------------------+
| Auction Status | Connection      |
| Team Context              Exit   |
+----------------------------------+
| Current Participant              |
| Employee and Sports context      |
+----------------------------------+
| Timer                            |
+----------------------------------+
| Current | Next | Leading Team    |
+----------------------------------+
| My Team and Remaining Purse      |
+----------------------------------+
| Live Bid Stream                  |
+----------------------------------+
| Team Purses (expandable)         |
| Queues (expandable)              |
| Recent Results                   |
+----------------------------------+
| Sticky primary live action       |
+----------------------------------+
```

Only the primary live action may be sticky. Content itself must remain in normal
document flow.

### 13.8 Tablet Layout

Use two columns:

- Left: current participant, bid values, timer, primary action, bid stream.
- Right: My Team, Team purses, queue summary.
- Full width: recent results.

## 14. Arena Exclusions

The Festival Auction Arena must not contain:

- Festival setup or configuration
- Employee import
- Participant registration or editing
- Team creation or renaming
- Owner assignment or credential management
- Retention configuration
- Budget configuration
- Pool generation
- Full readiness diagnostics
- Configuration unlock/relock
- Full Team roster directory
- Full results filtering
- Full bid-history reporting
- Re-auction audit history
- Owner activity history
- Retention history
- Full audit log
- Sport Tournament management
- Competition management

## 15. Recommended Migration Sequence

This is a planning sequence for Phase 4E-D, not an implementation.

1. Freeze current Auction behavior with focused regression coverage for
   loading, sockets, timer expiry, bidding, finalization, and re-auction.
2. Extract Auction state/synchronization/action responsibilities from
   `MainFestivalAuction` without changing behavior.
3. Introduce the focused Arena composition at the existing canonical route.
4. Migrate current participant, timer, bid metrics, Team purse, and role
   controls into the new layout.
5. Convert current-round bid history into the live bid stream.
6. Add compact recent outcomes from existing history data.
7. Remove viewer tabs from `FestivalLiveAuctionPage`.
8. Remove the embedded live `Auction` tab from Festival Management.
9. Replace the removed management tab with `Auction Preparation` and a
   prominent `Open Auction Arena` action.
10. Keep Results, Bid History, Audit, Teams, Owners, Retentions, and Readiness
    in Festival Management.
11. Validate Admin, Owner, and Spectator experiences across live, paused,
    pending-finalization, between-round, and completed states.

## 16. Migration Risks

### State Duplication

Splitting `MainFestivalAuction` can accidentally create multiple socket
subscriptions or competing local copies of Auction state. The Arena should have
one state owner and pass derived data to panels.

### Timer Regression

The existing timer uses server clock offset, revision-aware snapshots, and
expiry confirmation. Visual extraction must not change these rules.

### Permission Confusion

Frontend role checks remain presentation only. Existing backend authorization
must continue to decide who may start, pause, bid, sell, mark unsold, complete,
or re-auction.

### History Overfetching

The Arena needs only compact recent outcomes, while Management needs complete
history. Reusing the full reporting component in the Arena would preserve the
current overload and increase rendering cost.

### Owner Identity

Owner Team context must continue to be derived from the authenticated Auction
viewer response. It must not be inferred from URL or client input.

### Completed Auction Experience

A completed Arena should show status, final compact outcomes, and a clear link
to full results. It should not turn back into a reporting workspace.

### Mobile Action Safety

A sticky Owner bid action must always show the exact next bid and disabled
reason. Admin destructive actions must not share equal visual weight with safe
actions.

## 17. Audit Conclusion

The Festival Auction implementation already contains the required business
behavior for a dedicated Arena, but its presentation is split across two
workspace-style entry points and one oversized live component.

Phase 4E-D should be a structural UI migration:

- Keep the canonical Festival Auction route.
- Make that route a focused, tab-free Arena.
- Extract and preserve current Auction state, socket, timer, and action
  behavior.
- Remove the embedded live Auction from Festival Management.
- Keep detailed Teams, Owners, Retentions, Readiness, Results, Bid History, and
  Audit in Festival Management.
- Keep Festival-wide journey status and blockers in the Festival Command
  Center.

No backend schema, Auction rules, socket contract, or business workflow change
is required by this migration audit.
