# Phase 4E-I Product Language Audit

## 1. Full Terminology Inventory

Reviewed surfaces:

- Dashboard and role dashboards
- Festival Overview, Setup, Auction Details, Live Auction, and Results
- Sport Tournament Overview, Setup, Auction Details, Live Auction, and Results
- Auction Directory
- Owner, Captain, Admin, and Spectator views
- Empty states, loading states, alerts, status chips, page descriptions, and action cards
- Navigation labels and contextual page links
- Live auction decision controls

## 2. Existing Wording

Internal or unclear wording found:

- Command Center
- Auction Hub
- Arena
- Lifecycle
- Operations
- Blockers
- Readiness
- Pending Finalization
- Finalization
- Allocation
- Resolve Blockers
- Open Arena
- Open Hub
- Festival Journey
- Needs Attention
- Auction Progress
- Open Auctions
- Control Center

## 3. Proposed Wording

| Existing wording | New wording |
| --- | --- |
| Command Center | Overview |
| Auction Hub | Auction Details |
| Arena | Live Auction |
| Lifecycle | Controls or Status |
| Operations | Setup Sections |
| Blockers | Setup Issues |
| Readiness | Setup Status or Setup Check |
| Pending Finalization | Waiting for Confirmation |
| Finalization | Confirmation or Decision |
| Allocation | Team Assignment |
| Resolve Blockers | Fix Setup Issues |
| Open Arena | Open Live Auction |
| Open Hub | View Auction Details |
| Festival Journey | Festival Progress |
| Needs Attention | Action Required |
| Auction Progress | Players Auctioned |
| Open Auctions | View Active Auctions |
| Control Center | Overview |

## 4. Reason For Change

- Users should understand destinations without knowing the internal product architecture.
- Live bidding should be described as an action, not an implementation area.
- Reporting screens should read as details/results pages, not a “Hub.”
- Setup problems should use plain language: “Fix Issues” instead of “Resolve Blockers.”
- Status labels should describe what the user sees next: “Waiting for Confirmation” is clearer than “Pending Finalization.”

## 5. UX Consistency Rules

- Use “Overview” for status and next-action pages.
- Use “Setup” for configuration and preparation pages.
- Use “Auction Details” for bids, teams, spending, rosters, statistics, and monitoring.
- Use “Live Auction” only for the real-time bidding screen.
- Use “Results” only for completed outcomes.
- Avoid technical words in section titles, status chips, and primary buttons.
- Empty states must explain what is missing and what to do next.
- Error states should be actionable and avoid internal validation language.

## 6. Global Naming Dictionary

- Festival Overview: parent Festival status and next actions.
- Festival Setup: participants, teams, owners, retentions, and configuration.
- Festival Auction Details: teams, spending, bid history, statistics, and results context.
- Festival Live Auction: real-time bidding only.
- Sport Tournament Overview: tournament status and next actions.
- Sport Tournament Setup: teams, captains, eligibility, budgets, pool, and settings.
- Sport Auction Details: rosters, credits, bid history, assignments, statistics, and results context.
- Sport Live Auction: real-time sport bidding only.

## 7. Navigation Naming Standards

Contextual navigation order:

1. Overview
2. Setup
3. Auction Details
4. Live Auction
5. Results

Global navigation:

- Dashboard
- Festivals
- Auctions
- Employees
- Sport Tournaments

## 8. Button Naming Standards

- Use “View Auction Details” for monitoring/reporting.
- Use “Open Live Auction” for real-time bidding.
- Use “Join Auction” when the user is an active bidder.
- Use “View Results” for completed outcomes.
- Use “Fix Setup Issues” for missing setup requirements.
- Use “View Active Auctions” for product-level auction browsing.

## 9. Status Naming Standards

| Internal status | User-facing label |
| --- | --- |
| setup | Setup Incomplete |
| ready | Ready |
| live / auction_live | Live Auction |
| paused / auction_paused | Auction Paused |
| pending / pending_finalization | Waiting for Confirmation |
| completed / auction_completed | Completed Auction |
| blocked | Setup Incomplete |
| urgent | Action Required |

## 10. Future Wording Guidelines

- Write for a festival organizer using the product for the first time.
- Avoid naming backend state machines or frontend architecture.
- Prefer verbs on buttons: View, Open, Join, Fix, Create, Save.
- Prefer nouns for destinations: Overview, Setup, Auction Details, Live Auction, Results.
- Avoid “finalize” unless the user is explicitly confirming a final result.
- Avoid “readiness” outside developer docs; use “setup status.”
- Avoid “allocation” in UI; use “team assignment,” “roster,” or “players won.”
- Keep Competition wording future-facing until Phase 5 implementation exists.

## Complete Terminology Changes List

- Replaced Dashboard “Admin Command Center” with “Admin Dashboard.”
- Replaced “Needs Attention” with “Action Required.”
- Replaced “Festival Journey” with “Festival Progress.”
- Replaced “Open Auctions” with “View Active Auctions.”
- Replaced “Open Arena” with “Open Live Auction.”
- Replaced “Auction Hub” with “Auction Details.”
- Replaced “Command Center” with “Overview.”
- Replaced “Pending Finalization” with “Waiting for Confirmation.”
- Replaced “Auction Lifecycle” with “Auction Controls.”
- Replaced “Round Controls” with “Select Next Participant.”
- Replaced “Blockers” with “Setup Issues.”
- Replaced “Readiness” with “Setup Status” or “Setup Check.”
- Replaced “Final Allocations” with “Final Team Assignments.”
- Replaced “Auction Progress” with “Players Auctioned.”

## Screens Affected

- Admin Dashboard
- Owner Dashboard
- Captain Dashboard
- Spectator Dashboard
- Auction Directory
- AppShell page titles and page descriptions
- Festival Overview
- Festival Setup / Management
- Festival Auction Details
- Festival Live Auction
- Festival Results
- Sport Tournament Overview
- Sport Tournament Setup
- Sport Auction Details
- Sport Live Auction
- Legacy Festival auction control card

## Before / After Examples

- “Festival Command Center” -> “Festival Overview”
- “Auction Hub” -> “Auction Details”
- “Open Arena” -> “Open Live Auction”
- “Pending Finalization” -> “Waiting for Confirmation”
- “Resolve Blockers” -> “Fix Setup Issues”
- “Readiness score” -> “Setup progress”
- “Final Allocations” -> “Final Team Assignments”

## UX Consistency Report

- Navigation now explains destinations instead of architecture.
- Buttons now describe actions directly.
- Status labels now describe the user-visible state.
- Setup language is consistent across Festival and Sport workflows.
- Live auction pages keep bidding-specific language and avoid reporting terminology.
- Auction Details pages keep reporting/monitoring language and avoid bidding-control language.
