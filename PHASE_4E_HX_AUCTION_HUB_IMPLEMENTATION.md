# Phase 4E-HX Auction Hub Implementation

## Findings

- Separating Management from Arena removed reporting clutter from live bidding, but left no obvious auction-monitoring destination.
- Auction Directory and several role dashboards still treated Arena as the default destination for roster, spending, history, and result inspection.
- Festival and Sport Management repeated large status/control-center regions before working content.
- Arena headers used a second metric region that pushed the participant stage lower in the viewport.
- Sport Tournament did not have a distinct operational Command Center route; its context route opened Management.

## Architecture Decisions

- Added Auction Hub as the read-oriented monitoring layer between Management and Arena.
- Preserved Arena routes and auction behavior. Hub screens use the existing current-state, history, Festival, and Sport Tournament read APIs.
- Reused the existing auction socket singleton and existing `auction-state` contract. Each Hub owns one scoped room subscription and does not create a second auction state store inside Arena.
- Kept Results as a distinct contextual destination. Results do not render bidding controls.
- Added shared contextual navigation with:
  - Command Center
  - Management
  - Auction Hub
  - Arena
  - Results
- Made Auction Directory open Hub by default while retaining an explicit Open Arena action.

## Screens Changed

### Festival Auction Hub

- Overview: sold, unsold, remaining, progress, recent activity, and owner-first team summary.
- Teams: rosters, remaining purse, spending, retentions, and purchases.
- Bid History: newest-first history with team and participant filters.
- Results: sold/unsold outcomes and final assignments.
- Statistics: highest, lowest, average, total spend, and team spending utilization.

### Sport Auction Hub

- Overview: credit use, remaining credits, progress, and recent activity.
- Teams: rosters, credits, captains, purchases, and remaining slots.
- Bid History: team-filtered bid timeline.
- Results: sold/unsold players and final allocations.
- Allocations: roster composition and remaining slots.
- Statistics: credit utilization and acquisition summaries.

### Command Centers And Management

- Added a distinct Sport Tournament Command Center using existing read APIs.
- Festival Command Center now uses compact context and routes monitoring/results to Hub/Results.
- Festival Management no longer renders the large Festival Control Center above its workspace.
- Sport Management no longer renders the large Tournament Control Center above its workspace.
- Both Management screens expose compact context, Auction Hub access, and working tabs in the first viewport.

### Arenas

- Compressed Festival and Sport Arena title, status, connection, role, and progress into one compact header.
- Arena exit actions now return to the relevant Auction Hub.
- Festival full-results action now uses the dedicated Results destination.
- No bidding, timer, socket, authorization, or lifecycle behavior was changed.

## Components Changed

- Added `AuctionContextNavigation`.
- Added shared Auction Hub metric, progress, and team primitives.
- Added Festival and Sport Auction Hub pages.
- Added Sport Tournament Command Center.
- Updated role dashboards to make Hub the inspection destination while active bid participation continues to use Arena.
- Updated Auction Directory to expose both Hub and Arena actions.

## Navigation Changes

- Added `/festivals/:festivalId/auction-hub`.
- Added `/sport-tournaments/:id/auction-hub`.
- Added `/sport-tournaments/:id/results`.
- Kept `/auctions/festivals/:festivalId` and `/auctions/sports/:sportTournamentId`.
- Kept all legacy compatibility routes.
- `/sport-tournaments/:sportTournamentId` now represents the Command Center; `/manage` remains setup/configuration.

## Risks

- Hub aggregation still uses existing multiple read endpoints because backend API changes were prohibited.
- Hubs subscribe to live snapshots for monitoring; high-frequency auctions may trigger broad Hub rerenders.
- The frontend production bundle remains above Vite's default 500 kB chunk warning threshold.
- Role visibility is based on server-returned viewer/permission context. Backend authorization remains the security boundary.

## Manual Testing Checklist

- Admin: open Festival Command Center, Management, Hub, Arena, and Results using contextual navigation.
- Owner: confirm Festival Hub shows My Team, spending, purchases, bid activity, roster, and global read-only data.
- Captain: confirm Sport Hub shows team credits, roster, allocations, purchases, and bid activity.
- Spectator: confirm both Hubs are read-only and contain no mutation controls.
- Auction Directory: verify Open Auction Hub and Open Arena target the correct Festival/Tournament.
- Festival Hub: verify team and participant bid-history filters.
- Sport Hub: verify team filters, allocation cards, and credit statistics.
- Start or join a live Festival auction and verify Hub snapshots update without affecting Arena synchronization.
- Start or join a live Sport auction and verify Hub snapshots update without duplicate Arena subscriptions.
- Verify browser back/forward across Command Center, Management, Hub, Arena, and Results.
- Verify Management working tabs begin in the first viewport on desktop, tablet, and mobile.
- Verify Arena participant, timer, current bid, next bid, leader, and bid action remain visible at common laptop and tablet heights.
- Verify old Festival and Sport auction URLs still open the existing Arenas.
