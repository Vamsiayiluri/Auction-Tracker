# Auction Tracker — Project Plan and Deliverables

## 1. Project Timeline

The project was developed iteratively across multiple phases. The following timeline is inferred from the git commit history, phase implementation reports (PHASE_4A through PHASE_4E series), and feature groupings observed in the codebase.

| Period | Phase | Focus |
|---|---|---|
| Phase 1 | Foundation | Authentication, user model, basic Express server structure |
| Phase 2 | Core Legacy Auction | Teams, Players, Tournaments, Bids, legacy Socket.IO real-time |
| Phase 3 | Festival Module | Festival creation, participant management, festival teams and owners |
| Phase 4A | Festival Auction Engine | Festival auction lifecycle, bidding, retentions |
| Phase 4B | Festival Real-Time | Socket.IO festival rooms, revision-guarded state, arena UI |
| Phase 4C | Festival UX Polish | Command center, setup wizard, readiness checks, configuration lock |
| Phase 4D | Festival Stabilisation | Bug fixes, transaction integrity, audit trail |
| Phase 4E | Arena Architecture + Sport Module | Sport tournament model, Sport auction arena, sport team budgets |
| Phase 4E (sub-phases) | Information hierarchy, auction hub, product language audit | UI architecture refinements, AuctionHub tabs, AuctionDirectory |
| Phase 5 (current/near) | Sport parity + production hardening | Closing Sport vs Festival feature gaps, security improvements |

---

## 2. Milestones

| Milestone | Status | Description |
|---|---|---|
| M1: Authentication System | Complete | Register, login, email verification, password reset, JWT, role model |
| M2: Employee Directory | Complete | Employee CRUD, CSV import, employee-user auto-linking |
| M3: Legacy Auction System | Complete | Teams, players, tournaments, bidding, legacy real-time |
| M4: Festival Configuration | Complete | Festival CRUD, sports, participants, teams, owners, retentions |
| M5: Festival Live Auction | Complete | Auction lifecycle, bid engine, Socket.IO push, arena UI |
| M6: Festival Command Center | Complete | Setup wizard, readiness, configuration lock, command center |
| M7: Sport Tournament Setup | Complete | Tournament creation, sport teams, captain assignment, budgets |
| M8: Sport Auction Engine | Complete | Sport auction lifecycle, bid engine, sport arena UI |
| M9: Auction Directory + Hub | Complete | Unified auction directory, festival hub and sport hub |
| M10: Sport Parity | In Progress | Closing gaps identified in SPORT_PARITY_AUDIT.md |
| M11: Production Hardening | Planned | Socket auth, rate limiting, HTTPS cookies, structured logging |

---

## 3. Development Phases

### Phase 1 — Authentication and Foundation
Established the Node.js + Express backend with ES module syntax. Implemented JWT-based authentication with email verification, password reset via tokenised links, and the three-role user model (`admin`, `team_owner`, `spectator`). Created the React frontend scaffolding with Vite, React Router, and MUI.

### Phase 2 — Legacy Auction System
Built the original auction system: `Team`, `Player`, `Tournament`, `Bid`, and `Auction` models. Implemented basic Socket.IO rooms for real-time bid broadcasts. This system remains in the codebase at `/api/v1` and supports `AuctionPage.jsx`, `LiveAuctionPage.jsx`, and `SpectatorAuctionPage.jsx`.

### Phase 3 — Festival Module
Introduced the `Festival` → `FestivalTeam` → `FestivalParticipant` hierarchy. Built festival CRUD, participant import, sport selection, team creation, and team owner provisioning (auto-creates `team_owner` accounts with emailed credentials). Introduced the `FestivalOperationAudit` for change tracking.

### Phase 4 — Festival Auction Engine and Arena
Implemented the complete festival auction lifecycle:
- `FestivalAuction`, `FestivalAuctionBid`, `FestivalAuctionPool`, `FestivalAuctionResult` models
- Auction config (budget, increment, owner cost deduction)
- Retention picks, re-auction, pause/resume/extend/complete
- `MainFestivalAuction` arena with `ArenaHeader`, `ParticipantStage`, `TeamPanels`, `LiveBidStream`, `RecentResultsStrip`, `QueueSummary`
- Festival Command Center with setup wizard, readiness checks, configuration lock/unlock

### Phase 4E — Sport Tournament Module
Built the parallel sport auction system:
- `SportTournament`, `SportTeam`, `SportTeamCaptain`, `SportTeamBudget`, `SportAuction`, `SportAuctionBid`, `SportAuctionPool`, `SportAuctionResult`, `SportOperationAudit` models
- `SportAuctionArena` page with all sport-specific arena sub-components
- Sport tournament eligibility and readiness checks
- Budget distribution (equal or manual)
- Auction pool generation based on gender rule

### Phase 4E Sub-phases — Product Polish
- Information hierarchy: AuctionDirectory, AuctionHub tabs for festival and sport
- Product language audit: consistent terminology across all pages
- Header and profile experience improvements
- `AppShell` navigation layout
- `ProductDashboard` (role-differentiated: Admin, Owner, Spectator)
- `auctionSynchronization.js`, `auctionStages.js` utility extraction for testability

---

## 4. Phase Deliverables

| Phase | Key Deliverables |
|---|---|
| 1 | User model, auth controller, JWT middleware, email verification, React auth pages |
| 2 | Legacy auction models, tournament controller, Socket.IO room management, legacy arena pages |
| 3 | Festival model suite (10+ models), festival controller, festival team controller, email provisioning |
| 4A | Festival auction config, retention, pool management, auction lifecycle endpoints |
| 4B | Festival live auction controller, Socket.IO festival rooms, FestivalAuctionArena components |
| 4C | FestivalCommandCenter, FestivalSetupWizard, FestivalReadiness, FestivalControlCenter |
| 4D | Transaction integrity, configuration lock, audit trail, stabilisation |
| 4E | SportTournament model suite (10+ models), sport controllers, SportAuctionArena page + components |
| 4E-I/J/K/L | AuctionDirectory, AuctionHub, AppShell, ProductDashboard, auctionStages utility |

---

## 5. Tools Used

| Tool | Version | Purpose |
|---|---|---|
| Vite | 6.2.0 | Frontend build tool and dev server |
| React | 19.0.0 | UI framework |
| React Router DOM | 7.4.0 | Client-side routing |
| MUI (Material UI) | 6.4.8 | UI component library |
| Axios | 1.8.4 | HTTP client |
| socket.io-client | 4.8.1 | WebSocket client |
| Express | 4.21.2 | Backend HTTP framework |
| Socket.IO | 4.8.1 | WebSocket server |
| Sequelize | 6.37.6 | ORM |
| MySQL2 | 3.14.0 | Database driver |
| Zod | 3.25.76 | Schema validation |
| jsonwebtoken | 9.0.2 | JWT implementation |
| bcryptjs | 3.0.2 | Password hashing |
| nodemailer | 8.0.11 | SMTP email |
| @sendgrid/mail | 8.1.6 | SendGrid email provider |
| resend | 6.12.4 | Resend email provider |
| ESLint | 9.21.0 | Code linting |
| nodemon | 3.1.9 | Dev server auto-restart |
| Claude Code (AI) | — | AI-assisted development |
| Codex (AI) | — | AI-assisted development |


---

## 6. Technologies Used

### Frontend
- **React 19** with functional components, hooks, Suspense, and lazy loading
- **React Router 7** for declarative, nested routing with route guards
- **Material UI 6** for accessible, themeable UI components
- **Emotion** for CSS-in-JS styling
- **Socket.IO Client 4** for WebSocket real-time communication
- **Axios** for REST API calls with interceptors

### Backend
- **Node.js** with native ES Modules (`"type": "module"`)
- **Express 4** with middleware chain architecture
- **Socket.IO 4** for WebSocket server with room-based broadcasting
- **Sequelize 6** ORM with model associations and transaction support
- **MySQL / TiDB** relational database
- **Zod** for request schema validation
- **JWT** for stateless authentication
- **bcryptjs** for password hashing
- **Multi-provider email**: Nodemailer (SMTP), SendGrid, Resend

### Infrastructure
- Custom migration runner (no Sequelize CLI dependency)
- Environment-based configuration via dotenv

---

## 7. Development Methodology

The project followed an **iterative, feature-phase methodology** with continuous integration of feedback between phases:

- Each phase produced a written implementation report (PHASE_4A_IMPLEMENTATION_REPORT.md through PHASE_4E_L_FINAL_PRODUCT_POLISH_REPORT.md)
- Architecture decisions were documented in ARCHITECTURE.md, PHASE_4_ARCHITECTURE.md, and PHASE_4E_AUCTION_ARENA_ARCHITECTURE.md
- Audit documents (FESTIVAL_SETUP_STABILITY_AUDIT.md, FESTIVAL_AUCTION_STABILIZATION_REPORT.md, SPORT_PARITY_AUDIT.md) tracked known gaps and regressions
- A structured backlog (TODO.md, PRE_PHASE5_PRODUCT_BACKLOG.md, IMPLEMENTATION_BACKLOG.md) tracked upcoming work
- Code was reviewed and refactored between phases, with a dedicated "product language audit" (PHASE_4E_I_PRODUCT_LANGUAGE_AUDIT.md) to standardise terminology

---

## 8. Risk Management

| Risk | Probability | Impact | Mitigation Applied |
|---|---|---|---|
| Real-time state desynchronisation | Medium | High | Revision-guarded snapshot updates (auctionSynchronization.js) |
| Database corruption during auction | Medium | High | Sequelize transactions with LOCK.UPDATE on all auction-critical writes |
| Accidental config edit mid-auction | High | Medium | Festival configurationLockState; requires typed UNLOCK/RELOCK confirmation |
| Email delivery failure for owner credentials | Medium | High | Multi-provider email (Nodemailer + SendGrid + Resend); resend credentials endpoint |
| Budget overspend by bidder | Low | Medium | Server-side budget validation before accepting bids |
| Stale socket state applied out of order | Medium | Medium | Revision guard rejects any push with revision ≤ lastRevision |

---

## 9. Lessons Learned

1. **Architecture-first pays off.** The early decision to separate Festival and Sport Tournament into independent model hierarchies (rather than overloading a single generic "tournament" model) prevented painful schema migrations later.

2. **Revision guards are essential for real-time state.** WebSocket events can arrive out of order under network conditions. The monotonic revision guard prevented several categories of state corruption that would have been impossible to debug post-production.

3. **Iterative product audits are valuable.** Structured audit documents (SPORT_PARITY_AUDIT.md, FESTIVAL_SETUP_STABILITY_AUDIT.md) identified regressions and feature gaps that informal testing would have missed.

4. **Email provisioning is a critical path.** Team owner login depends on auto-provisioned credentials being deliverable. Having multiple email providers (SMTP, SendGrid, Resend) and a resend-credentials endpoint was necessary resilience.

5. **Configuration lock systems prevent production incidents.** The `configurationLockState` pattern — requiring a typed confirmation to unlock — stopped several accidental edits to participant lists after auction setup was complete.

6. **Shared utilities improve testability.** Extracting `auctionSynchronization.js`, `auctionStages.js`, and `auctionIncrementEngine.js` as pure utility modules made the core auction logic testable independently of React components or Express controllers.

---

## 10. Final Deliverables Matrix

| # | Deliverable | Location | Status |
|---|---|---|---|
| 1 | Frontend React SPA | `ipl-auction-tracker/` | Complete |
| 2 | Backend Express + Socket.IO API | `ipl-auction-tracker-backend/` | Complete |
| 3 | Festival Auction Module | `src/controllers/festival*.controller.js` | Complete |
| 4 | Sport Tournament Auction Module | `src/controllers/sport*.controller.js` | Complete |
| 5 | Real-Time Socket.IO Engine | `src/index.js` + `src/webSocket/socket.js` | Complete |
| 6 | Sequelize Data Models (35+) | `src/models/` | Complete |
| 7 | Zod Validation Schemas | `src/validation/` | Complete |
| 8 | Email Provisioning System | `src/utils/emailService.js` | Complete |
| 9 | Audit Trail System | `FestivalOperationAudit`, `SportOperationAudit` | Complete |
| 10 | Festival Command Center | `FestivalCommandCenter.jsx` | Complete |
| 11 | Sport Tournament Workspace | `SportTournamentWorkspace.jsx` | Complete |
| 12 | Sport Parity Improvements | Per SPORT_PARITY_AUDIT.md | In Progress |
| 13 | Automated Test Suite | None present | Planned |
| 14 | Production Security Hardening | Per TODO.md | Planned |
| 15 | Submission Documents | Repo root `.md` files | Complete |
