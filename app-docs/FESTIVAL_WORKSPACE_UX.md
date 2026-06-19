# Festival Workspace UX

## Workspace Enhancement Scope

Phase 3G.1 converts the Festival admin page from a long configuration document
into a focused operational workspace. It adds no Sport Teams, Sport Captains,
Sport Auctions, scheduling, competition, standings, or result business logic.

## Navigation Structure

The admin workspace uses a persistent Control Center followed by an explicit
view selector:

```text
Festival Control Center
  Operations View
    Overview
    Participants
    Teams
    Owners
    Retentions
    Auction
    Bid History
    Results
    Audit

  Edit Festival Configuration
    1. Festival Details
    2. Setup Foundation
    3. Participants
    4. Teams
    5. Budget
    6. Owners
    7. Retentions
    8. Auction Pool
    9. Review & Launch
```

Horizontal scrollable tabs were selected instead of a second side drawer. The
application already has primary shell navigation, and nested drawers would
reduce usable width and create two mobile navigation controls.

## Setup Journey

Only one wizard step is mounted at a time. Back and Next are always available,
Next is disabled until the current step's server-derived completion condition
passes, and completed steps remain directly accessible. The current step is
stored under `festival-setup-step:<festivalId>` in browser storage.

Configuration is the default before launch. Operations is the default after
launch, but admins may reopen Edit Festival Configuration at any time. Live,
paused, and completed lock states continue to disable dangerous controls, and
the backend remains authoritative for every mutation.

## Admin Journey

1. Open a Festival and review the Control Center.
2. Resume the saved setup step or continue with Back and Next.
3. Resolve blockers in Review & Launch.
4. Start the auction from the Control Center.
5. Use the Operations tabs without leaving the Festival route.
6. Pause, resume, open, complete, or review the auction from persistent quick
   actions.
7. Use Teams, Bid History, Results, and Audit as focused operational views.
8. Reopen Edit Festival Configuration for post-launch reference or permitted
   changes without leaving the workspace.

## Owner Journey

Owner workspace tabs:

- Overview
- Teams
- Auction
- Bid History

The Auction section remains shared and derives bidding identity server-side.
Teams displays both Festival Team summaries read-only and highlights the
authenticated Owner's assigned Team, Owner identity, remaining purse,
retentions, purchased players, and current roster. Bid History filters Owner
activity into My Bid Activity, Won Participants, and Outbid Participants.

## Spectator Journey

Spectator workspace tabs:

- Overview
- Live Auction
- Teams
- Results
- History

All sections are read-only. Spectator navigation does not grant auction
mutation permissions.

## Auction Journey

The Auction tab contains current lifecycle status, participant, base/current
and next bid, leading Team, countdown, Team summaries, participant selection,
pause/resume controls, pending finalization controls, unsold queue, re-auction
controls, pool selection, and live bid history. Completed history is separated
into the History tab.

## Control Center Design

The sticky Control Center displays Festival name, Festival status, auction
status, readiness status, participant count, Team count, Owner count, auction
pool count, and unsold count.

Quick actions are state-driven:

| State | Actions |
|---|---|
| Ready/setup | Start Auction |
| Live | Open Auction, Pause Auction |
| Paused | Resume Auction, Open Auction |
| Completed | View Results, View History |

Start remains disabled until server readiness is `READY`.

## Overview Dashboard

Overview shows Sports Enabled, Employees Imported, Participants Registered,
Teams Created, Owners Assigned, Owners Activated, Retentions, Auction Pool
Size, Unsold Players, Auction Status, readiness, and exact blockers.

## Tournament UX Alignment

Festival Teams and Bid History follow the established Tournament Auction
interaction model.

- Operations Teams lists every Festival Team as an expandable row.
- Selecting a Team reveals Owner, remaining purse, retentions, purchased
  players, and current roster.
- Bid History starts with an Auctioned Players list.
- Each participant row provides **View Bids**.
- The bid dialog shows base price, sold price, sold Team, full ordered bid
  sequence, and timestamps.
- Results and Audit are separate admin tabs instead of being mixed into one
  History screen.

These views use existing Festival read APIs and do not change auction
lifecycle, validation, purse, bidding, or finalization rules.

## Responsive Behavior

- Operations tabs scroll horizontally and expose mobile scroll buttons.
- Wizard navigation uses a compact mobile progress control.
- Multi-column metrics collapse to one or two columns.
- Action groups stack vertically on narrow screens.
- Tables remain inside horizontal scroll containers.
- The Control Center wraps metrics and actions without widening the page.

## Performance

- Heavy Teams, Auction Setup, Auction, Overview, Readiness, and History
  components use `React.lazy`.
- Only the active configuration step, operations tab, viewer tab, or History
  subsection is mounted.
- Sports and participant collections are requested only by steps/tabs that use
  them.
- Employee search is disabled outside Setup Foundation.
- Derived filtering and completion state use memoized or pure helpers.

The current participant endpoint still returns pool and Team summaries
together. Future scale work should add backend pagination/summary endpoints
instead of increasing frontend fan-out.

## Configuration Unlock Workflow

The Control Center is followed by a persistent Configuration Status card.
Festival configuration defaults to `LOCKED`. This means normal lifecycle
restrictions apply; setup remains editable before auction start.

After auction start, an admin may select **Unlock Configuration**, type
`UNLOCK`, and confirm. The action is audited. While unlocked, Festival
Details, Participants, Teams, Owners, Retentions, Auction Pool membership, and
eligible budget fields can be corrected through Edit Festival Configuration.
Operations View remains the default auction workspace.

Relocking requires typing `RELOCK`. Relock is also audited and immediately
restores normal lifecycle restrictions.

Unlock never permits mutation of bids, auction result rows, winning amounts,
or sold roster assignments. A participant involved in the current round
cannot be withdrawn, retained, or assigned as an Owner. Budget is read-only
after the first sold result. Sports and roster formation mode remain locked
after auction start.
