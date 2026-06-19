# Auction Tracker

A full-stack real-time auction platform for company sports events. Manages the complete lifecycle of employee allocation auctions — from festival setup and team creation through live bidding to final rosters — across two modules: Festival Auctions and Sport Tournament Auctions.

---

## Features

### Festival Auction Module
- Create multi-sport company festivals with configurable dates, teams, and participants
- Import employees from CSV or add them individually
- Assign team owners with automatic user account provisioning and email delivery
- Configure pre-auction retention picks
- Run a live, real-time auction with pause, resume, extend, re-auction, and complete controls
- Role-separated views: admin controls, owner bidding panel, spectator read-only mode
- Audit log of all administrative actions
- Support for auction mode and manual roster formation mode

### Sport Tournament Auction Module
- Create sport tournaments under festival teams (e.g., Men's Cricket, Women's Volleyball)
- Auto-generate sport teams with sequential naming (Cricket Team A, B, C…)
- Assign captains to each sport team with eligibility validation
- Configure per-team credit budgets (equal distribution or manual)
- Generate an auction pool filtered by gender rule and festival participation
- Run a live sport auction with the same lifecycle controls as the festival auction
- `canBid` permission dynamically computed based on captain assignment

### Real-Time Auction Engine
- Socket.IO rooms for festival and sport auctions
- Revision-guarded state updates prevent stale socket pushes from corrupting UI
- Server clock synchronisation for consistent countdown timers across all clients
- Adaptive bid increment engine: tiered by bid level, budget ratio, and auction stage

### Authentication and Access Control
- Email/password registration with email verification
- JWT Bearer token authentication (7-day expiry)
- Three-role model: `admin`, `team_owner`, `spectator`
- Mandatory first-login password change for provisioned accounts
- Forgot-password and reset-password flows via email link

---

## Architecture

```
ipl-auction-tracker/       # React 19 + Vite 6 SPA (frontend)
ipl-auction-tracker-backend/  # Express 4 + Socket.IO 4 + Sequelize 6 (backend)
```

- **Frontend**: React 19, React Router 7, Material UI 6, Axios, socket.io-client 4
- **Backend**: Node.js ES Modules, Express 4, Socket.IO 4, Sequelize 6, MySQL
- **Auth**: JWT (jsonwebtoken), bcryptjs
- **Validation**: Zod schemas on all mutating routes
- **Email**: Nodemailer (SMTP), SendGrid, or Resend (configurable)

---

## Prerequisites

- **Node.js** 18 or higher (for native `crypto.randomUUID()` and `node --test`)
- **MySQL** 8.0 or a TiDB-compatible instance
- **npm** 9 or higher
- An email provider account (SendGrid, Resend, or SMTP credentials)

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Auction-Tracker
```

### 2. Install frontend dependencies

```bash
cd ipl-auction-tracker
npm install
```

### 3. Install backend dependencies

```bash
cd ../ipl-auction-tracker-backend
npm install
```

---

## Environment Variables

### Backend — create `ipl-auction-tracker-backend/.env`

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auction_tracker
DB_USER=your_db_user
DB_PASS=your_db_password

# Authentication
JWT_SECRET=your_jwt_secret_minimum_32_characters

# Application
PORT=5000
FRONTEND_URL=http://localhost:5173

# Email — choose one provider:

# Option A: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@example.com

# Option B: SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@example.com

# Option C: Resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@example.com
```

### Frontend — create `ipl-auction-tracker/.env`

```env
VITE_API_URL=http://localhost:5000
```

---

## Database Setup

### 1. Create the MySQL database

```sql
CREATE DATABASE auction_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run migrations

```bash
cd ipl-auction-tracker-backend
npm run db:migrate
```

This runs the custom migrator (`scripts/migrate.js`) which applies all pending migrations in order, recording each in the `SequelizeMeta` table.

---

## Running the Frontend

```bash
cd ipl-auction-tracker
npm run dev
```

Starts the Vite development server. Default URL: `http://localhost:5173`

To build for production:

```bash
npm run build
# Output in dist/
```

To preview the production build:

```bash
npm run preview
```

---

## Running the Backend

Development (with auto-restart on file changes):

```bash
cd ipl-auction-tracker-backend
npm run start:dev
```

Production:

```bash
cd ipl-auction-tracker-backend
npm start
```

The server starts on `PORT` (default 5000). Socket.IO is attached to the same HTTP server.

---

## Running Tests

```bash
cd ipl-auction-tracker-backend
npm test
# Runs: node --test
# Currently outputs no results (no test files have been written yet)

cd ipl-auction-tracker
npm run lint
# Runs ESLint across all frontend source files
```

---

## Deployment

### Backend
1. Provision a Node.js server (any VPS or PaaS)
2. Set all required environment variables
3. Run `npm run db:migrate` to apply database schema
4. Start with `npm start` or a process manager (PM2, systemd)

### Frontend
1. Run `npm run build` to produce the `dist/` directory
2. Serve the `dist/` directory from a static host (Nginx, CDN, Vercel, Netlify)
3. Ensure the CDN/Nginx has proper SPA routing (all paths serve `index.html`)

### CORS Configuration
In production, update the CORS configuration in `ipl-auction-tracker-backend/src/index.js` to specify the exact frontend origin rather than `origin: true`.

```javascript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
})
```

---

## Troubleshooting

### "Unable to synchronize the Sport Auction" error in the arena
- Verify the backend is running and accessible at `VITE_API_URL`
- Check the Socket.IO connection: the arena shows a "Connected" / "Disconnected" badge in the header
- Use the manual refresh button in the arena to force a REST API fetch

### Email credentials not delivered to team owner
- Verify your email provider environment variables are set correctly
- Use the "Resend Credentials" button in the team owner panel (`POST /v2/festivals/:festivalId/teams/:teamId/owner/credentials`)
- Check the backend console for email service error messages

### "Festival configuration is locked after draft status"
- The festival's `configurationLockState` is `locked`. An admin must navigate to the festival command center and use the Unlock Configuration option, entering `UNLOCK` to confirm.

### "Complete and finalize the Festival roster before creating Sport Tournaments"
- Sport tournaments can only be created after the parent festival's roster is finalized. If using auction mode, complete the festival auction first. If using manual mode, lock the team assignments first.

### JWT token expired or invalid
- Clear `localStorage` in the browser (key: `token`) and log in again
- Ensure `JWT_SECRET` environment variable matches between restarts

### Socket.IO connection not establishing
- Ensure `VITE_API_URL` does not have a trailing slash
- The socket connects to the root of `VITE_API_URL` — the backend must serve Socket.IO on the same port as the HTTP API

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full platform access. Create and manage all festivals, tournaments, employees. Run and control all auctions. |
| `team_owner` | Access festivals and sport tournaments where they are assigned as an owner or captain. Place bids in live auctions. |
| `spectator` | Read-only access to auction arenas and results. Cannot place bids. |

### How roles are assigned
- **Admin**: Must be set directly in the database or by another admin (no public admin registration)
- **Team Owner**: Automatically assigned when an admin designates a festival participant as team owner. The system creates a `team_owner` account and emails credentials.
- **Spectator**: The default role for all self-registered accounts

---

## Screenshots Placeholders

| Screen | Description |
|---|---|
| `screenshots/dashboard.png` | Role-differentiated dashboard view |
| `screenshots/festival-command-center.png` | Festival Command Center with readiness indicators |
| `screenshots/festival-auction-arena.png` | Live festival auction arena with team panels and bid stream |
| `screenshots/sport-tournament-workspace.png` | Sport tournament setup workspace with captain assignment |
| `screenshots/sport-auction-arena.png` | Sport auction arena with CaptainBidControl and TeamCreditComparison |
| `screenshots/auction-directory.png` | Unified auction directory showing all active auctions |
| `screenshots/festival-results.png` | Final festival auction results page |

---

## Future Roadmap

### Short Term
- Sport tournament command center parity with festival (live activity feed, setup progress bar, blocker categorisation)
- Sticky lifecycle control surface in sport tournament workspace
- Participant search in sport auction bid history
- Deep-link (`?section=`) support in sport tournament workspace

### Medium Term
- JWT refresh token rotation with HttpOnly cookies (replace localStorage)
- Socket.IO JWT handshake authentication
- Explicit CORS allowlist
- Rate limiting on login, registration, and bid endpoints
- Integration test suite

### Long Term
- Configurable auction round timer (persisted `endsAt` field)
- CSV export of team rosters and bid history
- Competition scheduling and result tracking post-auction
- Mobile PWA wrapper
- Admin user management (invite, disable, role change)
