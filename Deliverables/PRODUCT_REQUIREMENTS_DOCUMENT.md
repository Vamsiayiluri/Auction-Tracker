# Auction Tracker — Product Requirements Document

## 1. Executive Summary

Auction Tracker is a full-stack web platform that automates and digitises employee sports auction events. It provides two distinct auction systems: a **Festival Auction** that allocates participating employees across multi-sport company events, and a **Sport Tournament Auction** that assigns individual athletes to competing teams within a single sport tournament. Both systems share a common real-time bidding engine powered by Socket.IO, a role-based access model enforced at every API endpoint, and a structured administrative workflow that progresses from setup through live auction to finalised results.

The platform eliminates the manual, error-prone process of running employee sports-day auctions on spreadsheets, whiteboards, or verbal announcements. It replaces that with a browser-based, multi-participant, real-time system that enforces budget constraints, records every bid permanently, and delivers auditable results.

---

## 2. Problem Statement

Company sports festivals and internal sport tournaments require a fair and transparent mechanism to assign employees to competing teams. Traditional approaches — spreadsheets, show-of-hands bidding, or verbal agreements — suffer from the following problems:

- **No simultaneous visibility:** Participants cannot all see the current bid at the same moment, leading to disputes.
- **No budget enforcement:** Team owners can accidentally overspend without a hard constraint.
- **No audit trail:** The history of who bid what and when is lost.
- **Manual coordination overhead:** An administrator must verbally announce each participant, record bids, and communicate results, often across multiple rooms.
- **No role separation:** Spectators, bidders, and administrators share the same view with no access differentiation.

---

## 3. Business Goal

To deliver a production-grade internal auction platform that enables:

1. Administrators to configure, launch, and complete festival and sport-tournament auctions entirely through a browser interface.
2. Team owners and sport team captains to place real-time bids from any device.
3. Spectators to observe live auctions in read-only mode.
4. Finance and HR teams to download auditable bid histories and final team rosters.

---

## 4. Mission Statement

To make every employee sports event auction fast, fair, and fully transparent by giving every participant a real-time window into the bidding process, and giving administrators the tools to run the full auction lifecycle from a single screen.

---

## 5. Vision Statement

To become the definitive internal tooling platform for gamified employee allocation events, extensible beyond sports to any scenario where employees are drafted or assigned to competing groups via a live bidding format.

---

## 6. Target Users

| User Group | Context |
|---|---|
| HR / Events Administrator | Responsible for creating the festival, importing employee data, configuring teams and budgets, and running the live auction. |
| Team Owner / Festival Team Owner | Assigned to a festival team; participates in the festival auction by bidding on employees. |
| Sport Team Captain | Assigned to a sport team within a sport tournament; bids on eligible participants in the sport auction. |
| Spectator / Employee | Views live auction progress without bidding. Sees which team they were assigned to. |

---

## 7. User Personas

### Persona 1 — Arjun (Admin / Events Manager)
- **Role in System:** `admin`
- **Goal:** Configure a company cricket festival, create 6 festival teams, assign owners, run a 90-minute live auction, then set up 4 sport tournaments (Men's Cricket, Women's Cricket, Badminton, Volleyball) with separate sub-auctions for each.
- **Pain Points:** Previously managed auctions via a shared Google Sheet, leading to version conflicts and budget overruns.
- **Key Actions:** Creates festivals, imports employee CSV, assigns team owners, configures retention picks, starts and controls the auction.

### Persona 2 — Priya (Team Owner)
- **Role in System:** `team_owner`
- **Goal:** Build the strongest squad by bidding strategically on employees within her allocated budget.
- **Pain Points:** In paper auctions, she could not see other teams' remaining budgets or the current high bid in real time.
- **Key Actions:** Logs in with provisioned credentials, views the live auction arena, places bids, monitors team budget, reviews her team roster.

### Persona 3 — Rohit (Sport Team Captain)
- **Role in System:** `team_owner` with a `SportTeamCaptain` record linked to a specific `SportTeam`
- **Goal:** Recruit the best athletes eligible for his sport tournament within his team's credit allocation.
- **Key Actions:** Views the Sport Auction Arena, bids on eligible festival participants, sees real-time credit balances for all competing teams.

### Persona 4 — Meera (Spectator / Employee)
- **Role in System:** `spectator`
- **Goal:** Watch the live auction to see which team she ends up on, and follow the bidding in real time.
- **Key Actions:** Views the auction directory, joins the live auction arena in read-only mode, sees the bid stream and team panels.

---

## 8. User Roles

The platform defines three roles in the `User` model (`role` ENUM):

| Role | Value | Capabilities |
|---|---|---|
| Administrator | `admin` | Full platform access. Create/manage festivals and sport tournaments. Run and control auctions. Manage employees. Provision team owner credentials. |
| Team Owner | `team_owner` | Access auction arenas where they are an active owner or captain. Place bids. View team rosters and bid histories. |
| Spectator | `spectator` | Read-only access to auction arenas. Cannot bid. Can view results. |

Additional junction-table roles exist at the domain level:
- **`FestivalTeamOwner`** — links a `team_owner` user to a specific festival team within a festival.
- **`SportTeamCaptain`** — links a `team_owner` user (via a `FestivalParticipant`) to a specific `SportTeam` within a `SportTournament`. The `canBid` permission in the `getSportTournament` API is derived dynamically by calling `findActiveSportCaptainForUser`.

---

## 9. Core Features

### 9.1 Authentication and Account Management
- Email/password registration with email verification (`/verify-email/:token`)
- JWT-based authentication with a 7-day access token
- Forgot password and reset password flows via email link
- Mandatory first-login password change for provisioned accounts (`mustChangePassword` flag)
- Profile management and account settings pages

### 9.2 Employee Directory
- Admin-managed employee records with fields: name, email, department, gender, employment status, employee number
- CSV import for bulk employee creation (`/employees/import`)
- Employee-to-user auto-linking when an employee with a matching email registers an account

### 9.3 Festival Auction Module (see Section 10)

### 9.4 Sport Tournament Auction Module (see Section 11)

### 9.5 Real-Time Auction Engine (see Section 12)

### 9.6 Auction Directory
- Unified view of all available auctions (festivals and sport tournaments) accessible to `admin`, `team_owner`, and `spectator` roles
- Filterable by auction type

---

## 10. Festival Auction Module

The Festival Auction is the primary, more mature auction system. It allocates **employee participants** to **festival teams** via a live bidding process.

### Festival Lifecycle

| Status | Description |
|---|---|
| `draft` | Initial creation. Sports, participants, and teams are being configured. |
| `registration_open` | Employees can be added as participants. |
| `registration_closed` | Participant list is locked. |
| `allocation` | Team rosters are being built (via auction or manual assignment). |
| `competition` | Sports competitions are running. |
| `completed` | Festival is concluded. |
| `archived` | Archived and read-only. |

### Festival Configuration Steps

1. **Festival Details** — Name, code, dates, timezone, currency, roster formation mode (`auction` or `manual`), configuration lock state.
2. **Sports Selection** — Enable sports from the `Sport` catalogue. Individual or bulk add.
3. **Participants** — Import employees individually, in bulk, via CSV import, or via "Add All Employees." Manage sport registrations per participant.
4. **Teams** — Create festival teams with name and code. Up to N teams.
5. **Team Owners** — Assign a participant as owner of each festival team. System auto-provisions a `team_owner` user account and sends credentials via email.
6. **Retentions** — Pre-auction direct assignments; participants retained by a team before bidding begins.
7. **Auction Configuration** — Set total budget per team, owner cost deduction, bid increment percentage. Choose `setup` → launch.

### Festival Auction Workflow

1. Admin clicks **Start Auction** → `auctionStatus` moves to `live`.
2. Admin selects a participant from the pool and clicks **Start Participant** → a timed round begins (`deadlineAt` set).
3. Team owners place bids from their arena. Each bid must exceed the current highest bid.
4. Admin clicks **Sell** → participant assigned to highest bidder's team, pool entry marked `sold`.
5. Admin clicks **Unsold** → participant returned to pool, state set to `unsold`.
6. Admin can **Pause**, **Resume**, or **Extend** the auction.
7. Admin clicks **Complete** → `auctionStatus` moves to `completed`, rosters locked.
8. Re-auction is supported for unsold participants via the `reauctionFestivalParticipants` endpoint.

### Festival Arena Components

- `FestivalAuctionArena/ArenaHeader.jsx` — Status, timer, current bid
- `FestivalAuctionArena/ParticipantStage.jsx` — Current participant card
- `FestivalAuctionArena/TeamPanels.jsx` — Live team budget panels
- `FestivalAuctionArena/LiveBidStream.jsx` — Scrolling bid log
- `FestivalAuctionArena/RecentResultsStrip.jsx` — Last few sold/unsold outcomes
- `FestivalAuctionArena/QueueSummary.jsx` — Remaining pool count
- Role-specific controls via `FestivalControlCenter.jsx`

---

## 11. Sport Tournament Auction Module

The Sport Tournament Auction distributes **festival participants who are eligible for a specific sport** to **sport teams** within a tournament. It sits one level below the festival in the hierarchy:

```
Festival → FestivalTeam → SportTournament → SportTeam
```

### Sport Tournament Lifecycle

| Status | Description |
|---|---|
| `draft` | Being configured. |
| `setup` | Teams and captains are being assigned. |
| `ready` | All readiness checks pass; auction can start. |
| `auction_live` | Live bidding in progress. |
| `auction_paused` | Bidding paused by admin. |
| `auction_completed` | Bidding completed; rosters finalised. |
| `competition_pending` | Competition scheduled. |
| `competition_live` | Competition in progress. |
| `competition_completed` | Competition done. |
| `archived` | Archived. |

### Sport Tournament Configuration Steps

1. Create the tournament under a FestivalTeam + FestivalSport combination
2. Auto-generated teams (`Cricket Team A`, `Cricket Team B`, etc.) based on `teamCount`
3. Assign a `SportTeamCaptain` to each team (must be eligible based on gender rule and festival membership)
4. Configure budgets: equal distribution or manual per-team
5. Generate the auction pool (eligible participants filtered by gender rule)
6. Configure auction parameters (`incrementPercentage`, base credits)
7. Start auction

### Sport Arena Components

- `SportAuctionArena/SportArenaHeader.jsx`
- `SportAuctionArena/SportParticipantStage.jsx`
- `SportAuctionArena/SportTeamPanels.jsx` — includes `CaptainPanel` and `TeamCreditComparison`
- `SportAuctionArena/SportLiveBidStream.jsx`
- `SportAuctionArena/SportQueueSummary.jsx`
- `SportAuctionArena/SportRecentResultsStrip.jsx`
- `SportAuctionArena/SportRoleControls.jsx` — `CaptainBidControl`, `OwnerLifecycleControls`, `PendingFinalizationControls`

---

## 12. Real-Time Auction Engine

The real-time layer uses **Socket.IO 4** on the backend and **socket.io-client 4** on the frontend.

### Socket Connection
- The client establishes a Socket.IO connection authenticated by passing a JWT token in `socket.auth = { token }`.
- Connection is managed in `ipl-auction-tracker/src/webSocket/socket.js`.

### Socket Room Events

| Event | Direction | Purpose |
|---|---|---|
| `join-auction` | Client → Server | Join the festival auction room for a given `festivalId` |
| `leave-auction` | Client → Server | Leave the festival auction room |
| `join-sport-auction` | Client → Server | Join the sport auction room for a given `sportTournamentId` |
| `leave-sport-auction` | Client → Server | Leave the sport auction room |
| `auction-state` | Server → Client | Push a full auction state snapshot |

### Revision-Based Guard (Anti-Stale Update)
Every `auction-state` push includes a monotonically increasing `revision` number. The client stores the last applied revision in `lastRevision.current` (a React ref) and applies the `shouldApplyAuctionSnapshot` guard before updating UI state:

```js
export const shouldApplyAuctionSnapshot = (lastRevision, payload) =>
  Number(payload?.revision || 0) > Number(lastRevision || 0);
```

This prevents out-of-order socket pushes from overwriting newer state.

### Scope Discrimination
Each socket push includes `scopeType` (`"festival"` or `"sport"`) and `scopeId` (the festival or tournament ID). The client checks these before applying the snapshot, ensuring cross-auction contamination is impossible.

### Server Clock Synchronisation
The payload includes `serverTime`. The client computes a `clockOffsetMs` via `getServerClockOffsetMs` and applies it when calculating auction countdown timers, ensuring all participants see the same remaining time regardless of client-clock drift.

### Bid Increment Engine
The backend calculates the next minimum bid using `auctionIncrementEngine.js`:
- Tiered base increments based on current bid level (₹25K for bids under ₹1M, up to ₹5L for bids over ₹10M)
- Budget ratio adjustment: reduces increment when remaining purse is low, increases when purse is large
- Auction stage adjustment: increases increment in the final 25% of the pool
- Three profiles: `conservative`, `standard`, `aggressive`; plus a `custom` profile with configurable rules

---

## 13. Role-Based Access Model

### Route Guards (Frontend)
- `GuestRoute` — accessible only when not logged in (login, register, forgot/reset password)
- `ProtectedRoute` — requires authentication; optionally restricts to specific roles via `allowedRoles` prop
- `DefaultRoute` — redirects to the appropriate dashboard based on session state

### API Middleware (Backend)
- `authMiddleware` — validates Bearer JWT, attaches `req.user`; rejects if `mustChangePassword` is set (except on the change-password route)
- `adminMiddleware` — rejects non-admin users with 403
- `teamOwnerMiddleware` — rejects non-team-owner users with 403

### Domain-Level Authorization
- `canManageFestivalTeamSports` — checks whether a user is admin or is the owner of the parent festival team; used to gate sport tournament mutations
- `loadAuthorizedSportTournament` — verifies tournament access for the requesting user
- `findActiveSportCaptainForUser` — determines `canBid` for the sport auction arena by looking up a `SportTeamCaptain` record for the current user and tournament
- Festival participant read access: `requireParticipantReadAccess` checks if the requesting user is admin or the linked employee

---

## 14. Key User Journeys

### Journey 1 — Admin: Full Festival Auction Setup to Results
1. Admin logs in → `/dashboard`
2. Admin navigates to `/festivals` → creates a new festival
3. Admin adds sports, imports employees via CSV, creates teams, assigns owners (system sends credentials email)
4. Admin sets retentions, configures auction budget and increment
5. Admin opens `/festivals/:festivalId/command-center` → reviews readiness
6. Admin navigates to `/auctions/festivals/:festivalId` → clicks Start Auction
7. Admin calls each participant, team owners bid; Admin sells/marks unsold
8. Admin completes auction → results locked
9. All participants view `/festivals/:festivalId/results`

### Journey 2 — Sport Team Captain: Bidding in a Sport Auction
1. Captain receives credentials, logs in, changes password
2. Captain views `/sport-tournaments` → selects their tournament
3. Captain navigates to `/auctions/sports/:sportTournamentId`
4. Arena loads; captain sees `CaptainBidControl` with current base credits and bid button
5. Captain clicks bid → bid is placed via `POST /v2/sport-tournaments/:id/auction/bid`
6. Socket broadcast updates all participants' screens with new bid
7. When auction completes, captain views team roster in the Sport Auction Hub

---

## 15. Value Proposition

| Stakeholder | Value Delivered |
|---|---|
| Event Organiser | Eliminates manual auction coordination. Full lifecycle in one browser tab. |
| Team Owner / Captain | Fair, transparent process with real-time budget visibility. |
| Employee / Spectator | Engaging live view of how teams are being built. |
| HR / Compliance | Complete, immutable audit log of every bid and assignment. |

---

## 16. Competitive Analysis

| Capability | Spreadsheet-Based | Generic Bidding Tools | Auction Tracker |
|---|---|---|---|
| Real-time simultaneous bid visibility | No | Partial | Yes (Socket.IO) |
| Budget enforcement | Manual | Limited | Automatic per-team purse |
| Role separation (admin/owner/spectator) | No | Partial | Yes |
| Sport-level sub-auctions within a festival | No | No | Yes |
| Employee data integration | Manual | No | Direct import |
| Audit trail | Manual | No | Full audit log |
| Email credential provisioning | No | No | Yes |

---

## 17. Differentiators

1. **Nested auction hierarchy** — Festival auction and sport tournament auctions are linked by the same participant pool, enabling coordinated multi-sport bidding under a single event umbrella.
2. **Revision-guarded real-time state** — The monotonic revision guard prevents stale socket pushes from corrupting client state, a common failure in naively implemented real-time apps.
3. **Adaptive bid increment engine** — Bid increments scale dynamically with budget depletion stage and auction progress, creating natural bidding tension.
4. **Auto-provisioned user accounts** — When an admin assigns a team owner, the system creates a `team_owner` account and emails credentials automatically, removing manual onboarding.
5. **Configuration lock system** — Festivals have a `configurationLockState` that prevents accidental edits to participant lists or team composition once the auction is underway, with explicit unlock/relock requiring a typed confirmation.

---

## 18. Future Roadmap

Based on `SPORT_PARITY_AUDIT.md` and `TODO.md`:

### Short Term (Next Quarter)
- Bring Sport Tournament Command Center to full parity with Festival Command Center (live-activity feed, per-step progress bar, blocker categorisation)
- Add sticky lifecycle control surface in `SportTournamentWorkspace.jsx`
- Add `localStorage` tab persistence and `?section=` deep-link support to sport tournament workspace
- Add participant CSV import and bulk participant management to sport tournament setup

### Medium Term
- JWT refresh token rotation with secure HttpOnly cookies
- Explicit CORS allowlist (replace `origin: true`)
- Socket.IO connection authentication via JWT handshake
- Rate limiting on login, registration, and bid endpoints
- Admin user management: invite, disable, role change

### Long Term
- Configurable auction duration per round (persisted `endsAt`)
- Export team squads and bid history as CSV/PDF
- Competition scheduling and result tracking post-auction
- Mobile-responsive PWA wrapper

---

## 19. Success Metrics

| Metric | Target |
|---|---|
| Auction setup time (admin) | Under 30 minutes from festival creation to auction start |
| Real-time bid latency | Under 200ms from bid submission to all-participant screen update |
| Budget compliance | Zero cases of a team's final roster cost exceeding allocated budget |
| Audit coverage | 100% of bids, sells, and unsolds recorded in bid history |
| System availability during auction | No unplanned downtime during a live auction session |
