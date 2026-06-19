# Phase 4E UI Wireframes

## Status

UX and screen-structure planning only.

These wireframes visualize the approved product decisions:

```text
Festival
  -> Festival Auction
  -> Sport Tournaments
  -> Sport Auctions
  -> Competitions
```

Management and live execution remain separate:

```text
Festival Management != Festival Auction Arena
Sport Tournament Management != Sport Auction Arena
```

Dashboards are action-oriented and answer:

- What needs attention?
- What is live?
- What is blocked?
- What is next?

## Wireframe Legend

```text
[ PRIMARY ACTION ]     Main action for the current user and state
[ Secondary Action ]   Supporting navigation or lower-priority action
[ Disabled ]           Visible but unavailable due to current state

!  Urgent or blocking item
●  Live
◐  Paused
✓  Ready or completed
○  Upcoming or inactive
```

## 1. Admin Dashboard Wireframe

### Desktop

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA | Dashboard | Festivals | Auctions | Sport Tournaments | Competitions|
| Employees                                                        Search | Admin  |
+----------------------------------------------------------------------------------+
| ADMIN COMMAND CENTER                                                            |
| Monday, 15 June 2026                               [ Create Festival ] [ Auctions ]|
+----------------------------------------------------------------------------------+
| NEEDS ATTENTION                                                                 |
| +--------------------------+ +--------------------------+ +--------------------+ |
| | ! Pending Finalization   | | ! Festival Blocked      | | ! Sport Blocked    | |
| | ESPO Main Auction        | | Corporate Festival      | | Trojans Cricket    | |
| | Priya Shah               | | 3 readiness blockers    | | Captain missing    | |
| | Bid: 700,000             | | Owners: 1/2 active      | | Pool is stale      | |
| | [ Open Arena ]           | | [ Resolve Blockers ]     | | [ Open Workspace ] | |
| +--------------------------+ +--------------------------+ +--------------------+ |
+----------------------------------------------------------------------------------+
| LIVE NOW                                                                        |
| +--------------------------------------+ +-------------------------------------+ |
| | ● FESTIVAL AUCTION                  | | ● SPORT AUCTION                    | |
| | Corporate Sports Festival           | | Trojans Cricket Men                | |
| | Current: Employee 108 - Priya        | | Current: Employee 241 - Rahul      | |
| | Current bid: 700,000                 | | Current bid: 120 credits           | |
| | Timer: 00:12                         | | Timer: 00:08                       | |
| | [ Run Auction ] [ View Status ]      | | [ Run Auction ] [ View Status ]    | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| FESTIVAL JOURNEY                                                                |
| +------------------------------------------------------------------------------+ |
| | Corporate Sports Festival 2026                                               | |
| |                                                                              | |
| | Employees   Participants   Festival Teams   Main Auction   Sport Teams   Comp | |
| |    ✓             ✓               ✓              ●             ◐          ○   | |
| |                                                                              | |
| | Current phase: Sport Team allocation                                         | |
| | Next milestone: Complete 2 Sport Auctions                                    | |
| | [ Open Festival Command Center ]                                             | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
| NEXT ACTIONS                              | RECENT OUTCOMES                     |
| +---------------------------------------+ | +---------------------------------+ |
| | 1. Activate Trojans Owner             | | | Priya sold to Demons           | |
| | 2. Generate Volleyball Pool           | | | Cricket Team B bought Rahul    | |
| | 3. Launch Demons Cricket Auction      | | | Festival configuration relocked| |
| | 4. Review competition readiness       | | | View all activity              | |
| | [ View Full Action Queue ]            | | +---------------------------------+ |
| +---------------------------------------+ |                                     |
+----------------------------------------------------------------------------------+
```

### Dashboard Rules

- Urgent actions appear before metrics.
- Live Auctions occupy the most prominent horizontal section.
- Each card has one primary next action.
- Festival journey shows lifecycle progression, not decorative statistics.
- Completed counts may appear inside cards but never replace operational
  guidance.
- Future Competition tasks enter the same attention and next-action system.

## 2. Festival Command Center Wireframe

The Festival Command Center is the main entry into one Festival. It summarizes
the full Festival journey and routes users to the correct management, Arena,
Sport Tournament, or Competition experience.

### Desktop

```text
+----------------------------------------------------------------------------------+
| Global Navigation                                                               |
+----------------------------------------------------------------------------------+
| Festivals / Corporate Sports Festival 2026                                      |
| CORPORATE SPORTS FESTIVAL 2026                       Status: ALLOCATION          |
| 10 Aug - 20 Aug | Asia/Kolkata | INR                 [ Festival Settings ]      |
+----------------------------------------------------------------------------------+
| FESTIVAL JOURNEY                                                                |
| +------------------------------------------------------------------------------+ |
| | 1 Employees  2 Registration  3 Festival Teams  4 Main Auction  5 Sports  6 Comp|
| |      ✓              ✓               ✓                 ✓           ●        ○  |
| |                                                                              | |
| | Current stage: Sport Tournaments and Sport Auctions                           | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
| NEEDS ATTENTION                                                                 |
| +-------------------------+ +-------------------------+ +-----------------------+ |
| | ! Owner account pending | | ! Sport pool stale     | | ! Competition pending | |
| | Trojans                 | | Demons Volleyball      | | Cricket Men           | |
| | [ Manage Owners ]       | | [ Refresh Pool ]       | | [ Review Readiness ]  | |
| +-------------------------+ +-------------------------+ +-----------------------+ |
+----------------------------------------------------------------------------------+
| MAIN FESTIVAL AUCTION                                                           |
| +------------------------------------------------------------------------------+ |
| | ✓ COMPLETED | 2 Teams | 84 Participants | 80 Sold | 4 Unsold                | |
| | Final rosters are available.                                                  | |
| | [ View Auction Arena ] [ Results ] [ Bid History ] [ Manage Festival ]        | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
| SPORT TOURNAMENTS                                                               |
| +----------------------------+ +----------------------------+ +----------------+ |
| | Trojans Cricket Men        | | Demons Cricket Men         | | Add Tournament | |
| | ● Auction Live             | | ✓ Auction Completed        | |                | |
| | Teams 3 | Captains 3       | | Teams 3 | Rosters complete | | [ Create ]     | |
| | [ Open Arena ] [ Manage ]  | | [ Results ] [ Competition ]| |                | |
| +----------------------------+ +----------------------------+ +----------------+ |
| +----------------------------+ +----------------------------+                    |
| | Trojans Volleyball Women   | | Demons Throwball Women     |                    |
| | ◐ Setup Blocked            | | ✓ Ready for Auction        |                    |
| | 2 blockers                 | | Pool 18 | Teams 3          |                    |
| | [ Resolve ] [ Manage ]     | | [ Launch Auction ]         |                    |
| +----------------------------+ +----------------------------+                    |
+----------------------------------------------------------------------------------+
| COMPETITIONS                                                                    |
| +--------------------------------------+ +-------------------------------------+ |
| | Cricket Men                          | | Volleyball Women                    | |
| | ○ Not configured                    | | ○ Waiting for Sport rosters         | |
| | [ Create Competition ]               | | [ View Dependency ]                 | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| FESTIVAL MANAGEMENT SHORTCUTS                                                   |
| [ Participants ] [ Festival Teams ] [ Owners ] [ Retentions ] [ Rosters ]       |
| [ Results ] [ Audit ] [ Settings ]                                              |
+----------------------------------------------------------------------------------+
```

### Command Center Purpose

- Show the entire Festival as one business object.
- Make the current lifecycle stage obvious.
- Separate `Manage`, `Run/Watch Auction`, and `Competition` destinations.
- Provide cross-Festival progress without embedding management forms.
- Keep the Festival Auction, Sport Tournaments, and Competitions visible as
  children of the Festival.

## 3. Festival Auction Arena Wireframe

### Desktop: Live Owner View

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA | Corporate Festival - Main Auction                                |
| ● LIVE | Connected | You represent: DEMONS          [ Display Mode ] [ Exit ]   |
+----------------------------------------------------------------------------------+
| +--------------------------------------------------+ +-------------------------+ |
| | CURRENT PARTICIPANT                              | | MY TEAM - DEMONS        | |
| |                                                  | | Remaining: 17,300,000   | |
| | PRIYA SHAH                                       | | Spent:      2,700,000   | |
| | EMP003 | HR | Female                             | | Roster: 8                | |
| | Sports: Chess, Carrom                            | |                         | |
| |                                                  | | Owner: Vamsi Rao        | |
| | Base Price        Current Bid       Next Bid     | | Retained: 2             | |
| | 500,000           700,000           800,000      | | Purchased: 5            | |
| |                                                  | | [ View Team ]           | |
| | Leading Team: TROJANS       Bids: 4              | +-------------------------+ |
| |                                                  | | TEAM PURSES             | |
| |                 +------------+                   | | Demons       17,300,000 | |
| |                 |   00:12    |                   | | Trojans      16,900,000 | |
| |                 +------------+                   | | Titans       18,200,000 | |
| |                                                  | +-------------------------+ |
| | [              PLACE BID 800,000              ]  |                           |
| +--------------------------------------------------+                           |
+----------------------------------------------------------------------------------+
| +-----------------------------------------------+ +----------------------------+ |
| | LIVE BID STREAM                               | | AUCTION QUEUES             | |
| | #4 Trojans                  700,000   10:32:14 | | Available: 22             | |
| | #3 Demons                   600,000   10:32:05 | | Unsold: 3                 | |
| | #2 Trojans                  550,000   10:31:58 | | Current attempt: 1        | |
| | #1 Demons                   500,000   10:31:43 | | [ View Queues ]           | |
| +-----------------------------------------------+ +----------------------------+ |
+----------------------------------------------------------------------------------+
| RECENT RESULTS                                                                  |
| Arjun -> Demons 900,000 | Neha -> Trojans 650,000 | Kiran -> Unsold            |
+----------------------------------------------------------------------------------+
```

### Desktop: Admin Pending Finalization

```text
+----------------------------------------------------------------------------------+
| MAIN FESTIVAL AUCTION | PENDING FINALIZATION | Connected             [ Exit ]   |
+----------------------------------------------------------------------------------+
| CURRENT PARTICIPANT: PRIYA SHAH                                                  |
| Winning bid: 700,000 | Leading Team: TROJANS | Bid count: 4                     |
| Timer expired. Bidding is locked.                                                |
|                                                                                  |
| [ EXTEND ROUND ]       [ SELL TO TROJANS - 700,000 ]       [ Mark Unsold ]       |
+----------------------------------------------------------------------------------+
| Live Bid Stream                         | Team Purse Validation                  |
| Complete ordered bids                   | Trojans remaining after sale: 16.2M   |
+----------------------------------------------------------------------------------+
```

### Desktop: Admin Between Rounds

```text
+----------------------------------------------------------------------------------+
| MAIN FESTIVAL AUCTION | LIVE | No active participant                            |
+----------------------------------------------------------------------------------+
| START NEXT PARTICIPANT                                                           |
| [ Search available participant............................. ] [ Base Price ]      |
| [ Start Participant Round ]                                                       |
+----------------------------------------------------------------------------------+
| AVAILABLE QUEUE                         | UNSOLD / RE-AUCTION                    |
| 22 participants                         | 3 participants                         |
| [ Browse Available ]                    | [ Select Participants ] [ Re-Auction ] |
+----------------------------------------------------------------------------------+
| Team Purses | Recent Results | Auction Status                                    |
+----------------------------------------------------------------------------------+
```

### Arena Exclusions

The Arena does not display:

- Festival configuration.
- Employee import.
- Participant administration.
- Owner assignment.
- Retention setup.
- Budget setup.
- Full audit history.
- Sport Tournament configuration.

## 4. Festival Management Workspace Wireframe

### Desktop

```text
+----------------------------------------------------------------------------------+
| Global Navigation                                                               |
+----------------------------------------------------------------------------------+
| Festivals / Corporate Festival / Management                                     |
| FESTIVAL MANAGEMENT                                      [ Open Auction Arena ] |
| Status: Allocation | Configuration: Locked | Auction: Live                       |
+----------------------------------------------------------------------------------+
| +----------------------+ +-----------------------------------------------------+ |
| | CONTEXT NAVIGATION   | | ACTIVE SECTION: OWNERS                              | |
| |                      | |                                                     | |
| | Overview             | | Readiness: 2 of 2 Owners active                    | |
| | Setup                | |                                                     | |
| | Participants         | | +-------------------------------------------------+ | |
| | Festival Teams       | | | DEMONS                                          | | |
| | Owners          <--- | | | Owner: Vamsi Rao | Active | Login linked       | | |
| | Retentions           | | | [ View Details ] [ Replace Owner ]              | | |
| | Auction Preparation  | | +-------------------------------------------------+ | |
| | Rosters              | |                                                     | |
| | Results              | | +-------------------------------------------------+ | |
| | Bid History          | | | TROJANS                                         | | |
| | Audit                | | | Owner: Rahul Kumar | Active | Login linked      | | |
| | Settings             | | | [ View Details ] [ Replace Owner ]              | | |
| |                      | | +-------------------------------------------------+ | |
| +----------------------+ +-----------------------------------------------------+ |
+----------------------------------------------------------------------------------+
```

### Overview Section

```text
+----------------------------------------------------------------------------------+
| FESTIVAL OVERVIEW                                                               |
+----------------------------------------------------------------------------------+
| Journey Status                                                                  |
| Employees ✓ | Registration ✓ | Teams ✓ | Main Auction ● | Sports ◐ | Comp ○     |
+----------------------------------------------------------------------------------+
| Readiness and Blockers                 | Key Festival Counts                     |
| 2 blockers                             | Participants 84 | Teams 2 | Sports 7    |
| [ Review Blockers ]                    | Rosters 80 | Unsold 4                   |
+----------------------------------------------------------------------------------+
| Primary next action: [ Open Auction Arena ]                                      |
+----------------------------------------------------------------------------------+
```

### Auction Preparation Section

```text
+----------------------------------------------------------------------------------+
| AUCTION PREPARATION                                                             |
| [ Budget ] [ Pool ] [ Readiness ]                                                |
+----------------------------------------------------------------------------------+
| Configuration and readiness content only                                        |
|                                                                                  |
| Auction Status: LIVE                                                             |
| Configuration is locked.                                                        |
| [ Open Auction Arena ]                                                           |
+----------------------------------------------------------------------------------+
```

## 5. Owner Dashboard Wireframe

### Desktop

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA | Dashboard | My Auctions | My Festival Team | Sport Tournaments   |
| Competitions                                                        Owner Menu   |
+----------------------------------------------------------------------------------+
| WELCOME, VAMSI                                                                  |
| Festival Team Owner - DEMONS                                                     |
+----------------------------------------------------------------------------------+
| PRIMARY ACTION                                                                  |
| +------------------------------------------------------------------------------+ |
| | ● MAIN FESTIVAL AUCTION LIVE                                                  | |
| | Current participant: Priya Shah | Current bid: 700,000 | Timer: 00:12        | |
| | Your Team is not leading | Next bid: 800,000                                 | |
| | [ JOIN FESTIVAL AUCTION ]                                                     | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
| MY FESTIVAL TEAM                                                                |
| +--------------------------------------+ +-------------------------------------+ |
| | DEMONS                              | | RECENT ROSTER ACTIVITY              | |
| | Remaining purse: 17,300,000         | | Arjun purchased for 900,000        | |
| | Roster: 8                           | | Neha retained for 500,000          | |
| | Retentions: 2 | Purchases: 5        | | [ View Full Roster ]               | |
| | [ Open Team Overview ]              | +-------------------------------------+ |
| +--------------------------------------+                                       |
+----------------------------------------------------------------------------------+
| SPORT TOURNAMENTS I MANAGE                                                       |
| +----------------------------+ +----------------------------+                    |
| | Demons Cricket Men         | | Demons Volleyball Women    |                    |
| | ✓ Auction Completed       | | ! Setup Blocked             |                    |
| | Rosters complete           | | Captain missing             |                    |
| | [ Competition ] [ Results ]| | [ Resolve Blocker ]         |                    |
| +----------------------------+ +----------------------------+                    |
+----------------------------------------------------------------------------------+
| WHAT IS NEXT                                                                    |
| 1. Complete Volleyball Captain assignment                                       |
| 2. Generate Volleyball Auction Pool                                              |
| 3. Create Cricket competition                                                    |
| [ View All Actions ]                                                             |
+----------------------------------------------------------------------------------+
```

### Owner With No Active Main Auction

The primary card changes to the highest-value available action:

```text
+------------------------------------------------------------------------------+
| NEXT ACTION: Demons Volleyball is ready for Auction                          |
| 3 Teams | 3 Captains | Pool 18 | Credits configured                          |
| [ Launch Sport Auction ] [ Review Readiness ]                                |
+------------------------------------------------------------------------------+
```

## 6. Sport Tournament Management Wireframe

### Desktop

```text
+----------------------------------------------------------------------------------+
| Festival / Demons / Cricket Men / Management                                    |
| CRICKET MEN MANAGEMENT                                  [ Open Auction Arena ]  |
| Festival Team: Demons | Division: Men | Status: Auction Live                    |
+----------------------------------------------------------------------------------+
| +----------------------+ +-----------------------------------------------------+ |
| | CONTEXT NAVIGATION   | | ACTIVE SECTION: READINESS                           | |
| |                      | |                                                     | |
| | Overview             | | Readiness: READY                                    | |
| | Teams                | | Score: 100%                                         | |
| | Captains             | |                                                     | |
| | Eligibility          | | ✓ 3 active Teams                                    | |
| | Budgets              | | ✓ 3 eligible Captains                               | |
| | Auction Pool         | | ✓ 3 positive credit budgets                          | |
| | Auction Settings     | | ✓ Current Auction Pool                               | |
| | Readiness       <--- | | ✓ 18 available participants                          | |
| | Rosters              | |                                                     | |
| | Auction Results      | | Auction is already live.                            | |
| | Audit                | | [ Open Auction Arena ]                               | |
| | Settings             | |                                                     | |
| +----------------------+ +-----------------------------------------------------+ |
+----------------------------------------------------------------------------------+
```

### Teams Section

```text
+----------------------------------------------------------------------------------+
| SPORT TEAMS                                                                     |
| +--------------------------+ +--------------------------+ +--------------------+ |
| | Cricket Team A           | | Cricket Team B           | | Cricket Team C     | |
| | Captain: Priya Shah      | | Captain: Rahul Kumar     | | Captain: Neha Rao  | |
| | Roster: 5                | | Roster: 6                | | Roster: 5          | |
| | Credits remaining: 180   | | Credits remaining: 120   | | Credits: 200       | |
| | [ View Team ]            | | [ View Team ]            | | [ View Team ]      | |
| +--------------------------+ +--------------------------+ +--------------------+ |
+----------------------------------------------------------------------------------+
```

### Pre-Launch Control Area

```text
+----------------------------------------------------------------------------------+
| TOURNAMENT READINESS                                                            |
| ✓ Teams | ✓ Captains | ✓ Budgets | ✓ Pool | ✓ Auction Settings                 |
|                                                                                  |
| [ LAUNCH SPORT AUCTION ]                  [ Review Detailed Readiness ]          |
+----------------------------------------------------------------------------------+
```

### Competition Entry Point After Auction

```text
+----------------------------------------------------------------------------------+
| SPORT TEAM ALLOCATION COMPLETE                                                   |
| 3 final Sport Team rosters are ready.                                            |
| [ Create Competition ] [ View Auction Results ]                                  |
+----------------------------------------------------------------------------------+
```

## 7. Sport Auction Arena Wireframe

### Desktop: Captain View

```text
+----------------------------------------------------------------------------------+
| SPORT AUCTION | Demons Cricket Men                                              |
| ● LIVE | Connected | You captain: CRICKET TEAM A      [ Display Mode ] [ Exit ]|
+----------------------------------------------------------------------------------+
| +--------------------------------------------------+ +-------------------------+ |
| | CURRENT PARTICIPANT                              | | MY TEAM                 | |
| |                                                  | | Cricket Team A          | |
| | RAHUL KUMAR                                      | | Remaining: 180 credits  | |
| | EMP241 | Finance                                 | | Spent: 320 credits      | |
| |                                                  | | Roster: 5               | |
| | Base Credits      Current Credits    Next        | |                         | |
| | 100               120                140         | | [ View Roster ]         | |
| |                                                  | +-------------------------+ |
| | Leading Team: CRICKET TEAM B      Bids: 2        | | TEAM CREDITS            | |
| |                                                  | | Team A   180            | |
| |                 +------------+                   | | Team B   120            | |
| |                 |   00:08    |                   | | Team C   200            | |
| |                 +------------+                   | +-------------------------+ |
| |                                                  |                           |
| | [              PLACE BID 140 CREDITS          ]  |                           |
| +--------------------------------------------------+                           |
+----------------------------------------------------------------------------------+
| +-----------------------------------------------+ +----------------------------+ |
| | LIVE BID STREAM                               | | AUCTION QUEUES             | |
| | #2 Cricket Team B          120       10:42:08 | | Available: 12             | |
| | #1 Cricket Team A          100       10:41:53 | | Unsold: 2                 | |
| +-----------------------------------------------+ | Attempt: 1                 | |
|                                                   | [ View Queue ]             | |
|                                                   +----------------------------+ |
+----------------------------------------------------------------------------------+
| RECENT ALLOCATIONS                                                              |
| Priya -> Team A 180 | Arjun -> Team C 220 | Kiran -> Unsold                    |
+----------------------------------------------------------------------------------+
```

### Desktop: Tournament Manager View

```text
+----------------------------------------------------------------------------------+
| SPORT AUCTION | PENDING FINALIZATION | Connected                                |
+----------------------------------------------------------------------------------+
| Rahul Kumar | Winning Team: Cricket Team B | Final bid: 120 credits              |
|                                                                                  |
| [ EXTEND ] [ SELL TO CRICKET TEAM B ] [ Mark Unsold ]                           |
+----------------------------------------------------------------------------------+
| Team Credit Validation                 | Complete Bid Stream                     |
+----------------------------------------------------------------------------------+
```

### Arena Exclusions

The Arena does not display:

- Team rename controls.
- Captain assignment.
- Budget distribution.
- Eligibility analysis.
- Pool generation.
- Auction setting configuration.
- General Tournament settings.
- Competition setup.

## 8. Captain Dashboard Wireframe

Captain is an assignment-based experience and may coexist with other User
capabilities.

### Desktop

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA | Dashboard | My Auctions | My Sport Teams | Competitions | Schedule|
+----------------------------------------------------------------------------------+
| MY CAPTAIN ASSIGNMENTS                                                          |
| +------------------------------------------------------------------------------+ |
| | CRICKET TEAM A - DEMONS CRICKET MEN                                           | |
| | Festival: Corporate Sports Festival 2026                                      | |
| | ● Sport Auction Live | Remaining credits: 180 | Roster: 5                    | |
| | [ JOIN SPORT AUCTION ] [ View Team ]                                           | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
| WHAT NEEDS ATTENTION                                                            |
| +--------------------------------------+ +-------------------------------------+ |
| | ● Auction Live                      | | ○ Future Competition                | |
| | Current: Rahul Kumar                | | Cricket League not configured       | |
| | Next bid: 140 credits               | | Waiting for Auction completion      | |
| | [ Place Bid ]                       | | [ View Dependency ]                 | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| MY SPORT TEAM                                                                   |
| Captain: Priya Shah | Credits: 180 | Roster: 5                                  |
| +----------------+ +----------------+ +----------------+ +---------------------+ |
| | Priya Captain  | | Arjun Bought  | | Neha Bought   | | Two open roster spots| |
| +----------------+ +----------------+ +----------------+ +---------------------+ |
| [ View Full Team ]                                                              |
+----------------------------------------------------------------------------------+
| FUTURE: NEXT FIXTURE                                                            |
| Cricket Team A vs Cricket Team C | 18 Aug | Ground 1 | 10:00 AM                 |
| [ View Match ] [ My Schedule ]                                                   |
+----------------------------------------------------------------------------------+
```

### Multiple Assignments

If one Employee captains multiple Sport Teams, the dashboard presents one card
per assignment and ranks live or urgent assignments first.

## 9. Spectator Dashboard Wireframe

### Desktop

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA | Dashboard | Watch Live | Competitions | Results                  |
+----------------------------------------------------------------------------------+
| LIVE NOW                                                                        |
| +--------------------------------------+ +-------------------------------------+ |
| | ● FESTIVAL AUCTION                  | | ● SPORT AUCTION                    | |
| | Corporate Sports Festival           | | Demons Cricket Men                 | |
| | Priya Shah | Bid 700,000 | 00:12    | | Rahul Kumar | 120 credits | 00:08  | |
| | [ WATCH LIVE ]                      | | [ WATCH LIVE ]                     | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| UPCOMING                                                                        |
| +--------------------------------------+ +-------------------------------------+ |
| | Demons Volleyball Auction           | | Future: Cricket Match              | |
| | Ready | Starts after Admin launch   | | Team A vs Team C | 18 Aug          | |
| | [ View Details ]                    | | [ View Fixture ]                   | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
| RECENT RESULTS                                                                  |
| +-----------------------------+ +-----------------------------+                  |
| | Festival Auction Result     | | Sport Auction Result        |                  |
| | Arjun -> Demons 900,000     | | Priya -> Cricket Team A 180 |                  |
| | [ View Results ]            | | [ View Results ]            |                  |
| +-----------------------------+ +-----------------------------+                  |
+----------------------------------------------------------------------------------+
| FESTIVAL EXPLORER                                                               |
| Corporate Sports Festival 2026                                                   |
| [ Festival Teams ] [ Sport Tournaments ] [ Competitions ] [ Standings ]          |
+----------------------------------------------------------------------------------+
```

### Spectator Standards

- Do not display disabled management actions.
- Use `Watch Live`, `View Results`, and `View Standings`.
- Clearly label Festival Auction versus Sport Auction.
- Future Match discovery shares the Live Now area but opens a Match Center,
  not an Auction Arena.

## 10. Mobile Wireframes

### Mobile Global Shell

```text
+----------------------------------+
| ☰  AUCTIONARENA       Profile    |
+----------------------------------+
| Page or context title            |
| Status / assignment subtitle     |
+----------------------------------+
|                                  |
| Active page content              |
|                                  |
+----------------------------------+
| Optional primary action bar      |
+----------------------------------+
```

### Mobile Admin Dashboard

```text
+----------------------------------+
| ADMIN COMMAND CENTER             |
| [ Create Festival ]              |
+----------------------------------+
| NEEDS ATTENTION                  |
| ! Pending Finalization           |
| ESPO Main Auction                |
| [ Open Arena ]                   |
+----------------------------------+
| ! Festival Blocked               |
| 3 blockers                       |
| [ Resolve ]                      |
+----------------------------------+
| LIVE NOW                         |
| ● Trojans Cricket Auction        |
| Rahul | 120 credits | 00:08      |
| [ Run Auction ]                  |
+----------------------------------+
| FESTIVAL JOURNEY                 |
| Setup ✓                          |
| Main Auction ✓                   |
| Sport Auctions ●                |
| Competitions ○                   |
| [ Open Festival ]                |
+----------------------------------+
| NEXT ACTIONS                     |
| 1. Assign Captain                |
| 2. Refresh Pool                  |
| 3. Create Competition            |
+----------------------------------+
```

### Mobile Festival Command Center

```text
+----------------------------------+
| Corporate Festival 2026          |
| Status: Allocation               |
+----------------------------------+
| JOURNEY                          |
| Employees ✓ -> Auction ✓         |
| Sports ● -> Competitions ○       |
+----------------------------------+
| MAIN AUCTION                     |
| Completed                        |
| [ Results ] [ Open Arena ]       |
+----------------------------------+
| SPORT TOURNAMENTS                |
| Trojans Cricket                  |
| ● Auction Live                   |
| [ Open Arena ]                   |
+----------------------------------+
| Demons Volleyball               |
| ! 2 blockers                     |
| [ Resolve ]                      |
+----------------------------------+
| MANAGEMENT                       |
| [ Participants ] [ Teams ]       |
| [ Owners ] [ Rosters ]           |
+----------------------------------+
```

### Mobile Festival Auction Arena

```text
+----------------------------------+
| ● MAIN AUCTION | Connected       |
| Demons                      Exit |
+----------------------------------+
| PRIYA SHAH                       |
| EMP003 | HR | Female             |
| Chess, Carrom                    |
+----------------------------------+
|             00:12                |
+----------------------------------+
| Current       Next               |
| 700,000       800,000            |
| Leading: Trojans                 |
+----------------------------------+
| MY TEAM: DEMONS                  |
| Remaining: 17,300,000            |
+----------------------------------+
| LIVE BIDS                        |
| #4 Trojans 700,000               |
| #3 Demons 600,000                |
| [ View All ]                     |
+----------------------------------+
| Team Purses (collapsed)          |
| Queues (collapsed)               |
| Recent Results                   |
+----------------------------------+
| [      PLACE BID 800,000       ] |
+----------------------------------+
```

### Mobile Sport Auction Arena

```text
+----------------------------------+
| ● CRICKET AUCTION | Connected    |
| Captain: Team A             Exit |
+----------------------------------+
| RAHUL KUMAR                      |
| EMP241 | Finance                 |
+----------------------------------+
|             00:08                |
+----------------------------------+
| Current       Next               |
| 120 credits   140 credits        |
| Leading: Team B                  |
+----------------------------------+
| MY TEAM                          |
| 180 credits remaining            |
+----------------------------------+
| LIVE BIDS                        |
| #2 Team B 120                    |
| #1 Team A 100                    |
+----------------------------------+
| Team Credits (collapsed)         |
| Queue (collapsed)                |
| Recent Allocations               |
+----------------------------------+
| [      PLACE BID 140 CREDITS   ] |
+----------------------------------+
```

### Mobile Management Workspace

```text
+----------------------------------+
| Festival Management              |
| [ Open Auction Arena ]           |
+----------------------------------+
| SECTION                          |
| [ Owners                   v ]   |
+----------------------------------+
| Active section content           |
|                                  |
| Owner card                       |
| Owner card                       |
|                                  |
+----------------------------------+
```

On small screens, wide contextual sidebars become a section selector or
drawer. The content remains one natural vertical flow.

## 11. Tablet Wireframes

### Tablet Dashboard

```text
+--------------------------------------------------------------+
| Header and compact navigation                                |
+--------------------------------------------------------------+
| NEEDS ATTENTION                                              |
| +---------------------------+ +----------------------------+ |
| | Pending Finalization      | | Festival Blocked           | |
| +---------------------------+ +----------------------------+ |
+--------------------------------------------------------------+
| LIVE NOW                                                     |
| +---------------------------+ +----------------------------+ |
| | Festival Auction          | | Sport Auction              | |
| +---------------------------+ +----------------------------+ |
+--------------------------------------------------------------+
| Festival Journey                                            |
+--------------------------------------------------------------+
| Next Actions                 | Recent Outcomes               |
+--------------------------------------------------------------+
```

### Tablet Festival Auction Arena

```text
+--------------------------------------------------------------+
| Arena Header                                                 |
+---------------------------------------+----------------------+
| Current Participant                   | My Team              |
| Bid values and timer                  | Team purses          |
| Primary action                        |                      |
+---------------------------------------+----------------------+
| Live Bid Stream                       | Queue Summary        |
+---------------------------------------+----------------------+
| Recent Results                                               |
+--------------------------------------------------------------+
```

### Tablet Sport Tournament Management

```text
+--------------------------------------------------------------+
| Context Header                         [ Open Auction Arena ] |
+--------------------------------------------------------------+
| Horizontal grouped section navigation                        |
+--------------------------------------------------------------+
| Active section content                                       |
| Two-column cards where appropriate                           |
+--------------------------------------------------------------+
```

### Tablet Competition Center

```text
+--------------------------------------------------------------+
| Competition Header                                           |
+--------------------------------------------------------------+
| Overview | Entries | Fixtures | Standings | Results          |
+--------------------------------------------------------------+
| Upcoming Fixtures               | Standings Snapshot          |
+---------------------------------+----------------------------+
| Schedule / Stage content                                     |
+--------------------------------------------------------------+
```

## 12. Navigation Layout

### Desktop Global Navigation

```text
+----------------------------------------------------------------------------------+
| AUCTIONARENA                                                                     |
| [ Dashboard ] [ Festivals ] [ Auctions ] [ Sport Tournaments ] [ Competitions ] |
| [ Employees ]                                              Search | User Menu   |
+----------------------------------------------------------------------------------+
```

Navigation visibility:

```text
Admin:
Dashboard | Festivals | Auctions | Sport Tournaments | Competitions | Employees

Festival Team Owner:
Dashboard | My Festival Team | Auctions | Sport Tournaments | Competitions

Sport Captain:
Dashboard | My Sport Teams | Auctions | Competitions | Schedule

Spectator:
Dashboard | Watch Live | Competitions | Results
```

One user may receive combined navigation when they hold multiple assignments.

### Context Navigation

Within a selected Festival:

```text
Festival Command Center
Management
Festival Auction
Sport Tournaments
Competitions
```

Within a selected Sport Tournament:

```text
Overview
Management
Sport Auction
Competition
```

### Arena Navigation

Arena navigation is reduced:

```text
Brand | Event Identity | Live Status | Connection | Team Context | Exit
```

The full management navigation is not displayed inside the Arena.

## 13. Sidebar Layout

### Festival Management Sidebar

```text
+----------------------+
| FESTIVAL MANAGEMENT  |
+----------------------+
| Overview             |
| Setup                |
| Participants         |
| Festival Teams       |
| Owners               |
| Retentions           |
| Auction Preparation  |
| Rosters              |
| Results              |
| Bid History          |
| Audit                |
| Settings             |
+----------------------+
| [ Open Auction Arena]|
+----------------------+
```

### Sport Tournament Sidebar

```text
+----------------------+
| SPORT MANAGEMENT     |
+----------------------+
| Overview             |
| Teams                |
| Captains             |
| Eligibility          |
| Budgets              |
| Auction Pool         |
| Auction Settings     |
| Readiness            |
| Rosters              |
| Auction Results      |
| Audit                |
| Settings             |
+----------------------+
| [ Open Auction Arena]|
| [ Competition ]      |
+----------------------+
```

### Competition Sidebar

```text
+----------------------+
| COMPETITION          |
+----------------------+
| Overview             |
| Entries              |
| Format and Rules     |
| Stages               |
| Fixtures             |
| Schedule             |
| Standings            |
| Playoffs             |
| Results              |
| Audit                |
| Settings             |
+----------------------+
```

### Sidebar Rules

- Sidebars appear only in management and Competition contexts.
- The selected section is visually obvious.
- Urgent section badges may show blockers or pending approvals.
- Mobile replaces the sidebar with a drawer or section selector.
- Arenas do not use management sidebars.

## 14. Quick Actions Placement

### Dashboard

Place the primary quick action inside the most urgent card:

```text
Pending Finalization -> [ Open Arena ]
Blocked Setup        -> [ Resolve Blockers ]
Auction Live         -> [ Join / Run / Watch ]
Ready for Launch     -> [ Launch Auction ]
```

### Festival Command Center

```text
Header:
[ Festival Settings ]

Main Auction card:
[ Open Arena ] [ Results ] [ Bid History ]

Sport Tournament card:
[ Open Arena ] [ Manage ] [ Competition ]
```

### Management Control Center

```text
Pre-launch:
[ Review Readiness ] [ Launch Auction ]

Live or paused:
[ Open Auction Arena ]

Completed:
[ View Results ] [ Create Competition ]
```

### Arena

Owner/Captain:

```text
[ PLACE BID ]
```

Admin/Manager:

```text
[ Pause ] [ Resume ] [ Complete ]
[ Extend ] [ Sell ] [ Unsold ]
```

The current state determines which action group is prominent.

### Mobile

- One primary live action may use a bottom action bar.
- Secondary actions remain in page flow or an action menu.
- No more than one destructive action is visually dominant.

## 15. Live Auction Discovery Flow

### Unified Discovery

```text
Dashboard
   |
   +-- Live Now card ---------------------------+
   |                                            |
   +-- Urgent Auction action                    |
   |                                            v
   +-- Auctions --------------------------> Auction Directory
                                                |
                                                +-- My Active
                                                +-- Live
                                                +-- Ready
                                                +-- Completed
                                                +-- Festival
                                                +-- Sport
                                                        |
                                                        v
                                                   Auction Arena
```

### Admin Flow

```text
Dashboard
-> Pending Finalization / Live Auction / Ready Auction
-> Open Arena
```

### Owner Flow

```text
Dashboard
-> My Active Auctions
-> Festival Arena or managed Sport Arena
```

### Captain Flow

```text
Dashboard
-> Captain Assignment card
-> Join Sport Auction
```

### Spectator Flow

```text
Dashboard
-> Live Now
-> Watch Live
```

### Auction Directory Wireframe

```text
+----------------------------------------------------------------------------------+
| AUCTIONS                                                                        |
| [ My Active ] [ Live ] [ Ready ] [ Completed ]     Type: [ All v ]             |
+----------------------------------------------------------------------------------+
| +--------------------------------------+ +-------------------------------------+ |
| | ● FESTIVAL AUCTION                  | | ● SPORT AUCTION                    | |
| | Corporate Sports Festival           | | Demons Cricket Men                 | |
| | Current: Priya | 00:12              | | Current: Rahul | 00:08             | |
| | Your capability: Owner              | | Your capability: Captain           | |
| | [ Join Auction ]                    | | [ Join Auction ]                   | |
| +--------------------------------------+ +-------------------------------------+ |
| +--------------------------------------+ +-------------------------------------+ |
| | ✓ SPORT AUCTION COMPLETED           | | ! READY FOR LAUNCH                 | |
| | Trojans Volleyball                  | | Demons Throwball                   | |
| | [ View Results ]                    | | [ Review / Launch ]                | |
| +--------------------------------------+ +-------------------------------------+ |
+----------------------------------------------------------------------------------+
```

## 16. Future Enhancements (Out of Scope)

Competition management, fixtures, standings, playoffs, and match operations
were evaluated but are intentionally excluded from the current product scope.

## 17. Role-Based Experience Flow

### Admin

```text
Login
-> Admin Command Center
-> Needs Attention
   |-- Festival setup blocker -> Festival Management
   |-- Pending Auction action -> Auction Arena
   `-- Sport readiness blocker -> Sport Tournament Management
```

### Festival Team Owner

```text
Login
-> Owner Dashboard
-> My Festival Team
   |-- Main Auction live -> Festival Auction Arena
   |-- Sport setup task -> Sport Tournament Management
   `-- Sport Auction live -> Sport Auction Arena
```

### Sport Captain

```text
Login
-> Captain-aware Dashboard
-> My Sport Team
   |-- Sport Auction live -> Sport Auction Arena
   `-- Final roster -> Team View
```

### Spectator

```text
Login
-> Spectator Dashboard
   |-- Festival Auction live -> Festival Auction Arena
   |-- Sport Auction live -> Sport Auction Arena
   `-- Results -> Results View
```

### Multi-Capability User

One user may be:

- Festival Team Owner.
- Sport Captain.
- Admin.
- Spectator in unrelated events.

The experience should merge relevant actions rather than force one exclusive
persona:

```text
Dashboard
|-- Admin actions
|-- Owned Team actions
|-- Captain actions
`-- Watch-only events
```

Actions are labeled with context:

```text
Run Auction - Admin
Manage Tournament - Festival Team Owner
Place Bid - Cricket Team A Captain
Watch Live - Viewer
```

## Final Screen Hierarchy

```text
Dashboard
|
|-- Festival Command Center
|   |-- Festival Management Workspace
|   |-- Festival Auction Arena
|   |-- Sport Tournament Management
|   |   |-- Sport Auction Arena
|   |   `-- Competition Center
|   `-- Festival Results and Audit
|
|-- Auctions Directory
|   |-- Festival Auction Arena
|   `-- Sport Auction Arena
|
`-- Competitions
    |-- Competition Center
    |-- Fixtures and Schedule
    |-- Match Center
    |-- Standings
    `-- Playoffs and Finals
```

This hierarchy keeps Festival as the primary business object while making
Auctions and future live Matches immediately discoverable, focused, and
independent from management configuration.
