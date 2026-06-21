# AuctionArena — Backend

Node.js + Express REST API and Socket.IO server for the AuctionArena platform. Handles authentication, festival management, sport tournament management, real-time auction state, bid validation, and email delivery.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [Running Tests](#running-tests)
- [API Overview](#api-overview)
- [Socket.IO Events](#socketio-events)
- [Middleware](#middleware)
- [Models](#models)
- [Utilities](#utilities)
- [Validation](#validation)
- [Email Configuration](#email-configuration)
- [Security Notes](#security-notes)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime (ES Modules — `"type": "module"`) |
| Express | 4.21.x | HTTP framework |
| Socket.IO | 4.8.x | WebSocket server for real-time auction |
| Sequelize | 6.37.x | ORM |
| mysql2 | 3.14.x | MySQL driver |
| jsonwebtoken | 9.x | JWT auth token generation and verification |
| bcryptjs | 3.x | Password hashing |
| zod | 3.x | Request body validation schemas |
| nodemailer | 8.x | Email delivery (SMTP) |
| @sendgrid/mail | 8.x | SendGrid email provider |
| resend | 6.x | Resend email provider |
| dotenv | 16.x | Environment variable loading |
| nodemon | 3.x | Dev auto-restart |

---

## Project Structure

```
ipl-auction-tracker-backend/
├── src/
│   ├── index.js                        # Entry point — Express + Socket.IO setup
│   ├── config/
│   │   └── dbconfig.js                 # Sequelize connection config
│   ├── database/
│   │   └── migrator.js                 # Custom migration runner
│   ├── middleware/
│   │   ├── auth.middleware.js          # JWT verification + role guard
│   │   ├── validate.middleware.js      # Zod schema validation wrapper
│   │   └── multipartCsv.middleware.js  # CSV file upload handling
│   ├── models/                         # Sequelize model definitions (35+ models)
│   ├── controllers/                    # Route handlers (16 controllers)
│   ├── routes/                         # Express router definitions (11 route files)
│   ├── utils/                          # Business logic helpers (40+ utilities)
│   └── validation/                     # Zod schemas for request validation
├── scripts/
│   └── migrate.js                      # Migration CLI script
├── migrations/                         # Sequelize migration files
├── .env                                # Environment variables (gitignored)
└── package.json
```

---

## Prerequisites

- **Node.js** 18 or higher
- **MySQL** 8.0 or a TiDB-compatible instance
- **npm** 9 or higher
- An email provider account (SendGrid, Resend, or SMTP credentials)

---

## Installation

```bash
cd ipl-auction-tracker-backend
npm install
```

---

## Environment Variables

Create `ipl-auction-tracker-backend/.env`:

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

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | MySQL port (default 3306) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASS` | Yes | Database password |
| `JWT_SECRET` | Yes | Secret for signing JWTs — minimum 32 characters |
| `PORT` | No | HTTP server port (default 5000) |
| `FRONTEND_URL` | Yes | Allowed CORS origin (e.g. `https://your-app.vercel.app`) |
| `EMAIL_FROM` | Yes | Sender email address |

---

## Database Setup

### 1. Create the MySQL database

```sql
CREATE DATABASE auction_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. Run migrations

```bash
npm run db:migrate
```

This runs `scripts/migrate.js` which applies all pending migration files in order, recording each in the `SequelizeMeta` table. Safe to run multiple times — already-applied migrations are skipped.

---

## Running the Server

### Development (with auto-restart)

```bash
npm run start:dev
```

Uses `nodemon` to restart on file changes.

### Production

```bash
npm start
```

Runs `node src/index.js`. Socket.IO is attached to the same HTTP server instance as Express.

The server binds to `0.0.0.0:PORT` by default.

---

## Running Tests

```bash
npm test
```

Runs `node --test`. The Node.js built-in test runner is configured but no test files have been written yet. This is acknowledged technical debt — the infrastructure is in place.

---

## API Overview

All routes are prefixed with `/api` unless otherwise noted. The backend exposes two API versions:

### v1 — Legacy Auction System

| Route File | Prefix | Key Endpoints |
|---|---|---|
| `authRoutes.js` | `/v1/auth` | register, login, verify-email, forgot-password, reset-password, change-password |
| `tournmentRoutes.js` | `/v1/tournaments` | CRUD for legacy tournaments |
| `teamRoutes.js` | `/v1/teams` | CRUD for legacy teams |
| `playerRoutes.js` | `/v1/players` | CRUD for legacy players |
| `bidRoutes.js` | `/v1/bids` | Place bids in legacy auction |
| `auctionRoutes.js` | `/v1/auctions` | Legacy auction controls |
| `teamExportRoutes.js` | `/v1/export` | Export team rosters |

### v2 — Festival and Sport Tournament System

| Route File | Prefix | Key Endpoints |
|---|---|---|
| `festivalRoutes.js` | `/v2/festivals` | Festival CRUD, participants, teams, owners, readiness, auction lifecycle |
| `sportTournamentRoutes.js` | `/v2/sport-tournaments` | Tournament CRUD, teams, captains, budgets, pool, readiness, auction lifecycle |
| `sportRoutes.js` | `/v2/sports` | Sport type reference data |
| `employeeRoutes.js` | `/v2/employees` | Employee CRUD, CSV import |

### Key Endpoint Groups

**Authentication**
```
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/verify-email
POST /v1/auth/forgot-password
POST /v1/auth/reset-password
POST /v1/auth/change-password
GET  /v1/auth/me
```

**Festival Auction Lifecycle**
```
POST   /v2/festivals/:id/auction/start
POST   /v2/festivals/:id/auction/pause
POST   /v2/festivals/:id/auction/resume
POST   /v2/festivals/:id/auction/extend
POST   /v2/festivals/:id/auction/sell
POST   /v2/festivals/:id/auction/unsold
POST   /v2/festivals/:id/auction/complete
POST   /v2/festivals/:id/auction/bid
GET    /v2/festivals/:id/auction/current
GET    /v2/festivals/:id/auction/history
```

**Sport Tournament Auction Lifecycle**
```
POST   /v2/sport-tournaments/:id/auction/start
POST   /v2/sport-tournaments/:id/auction/pause
POST   /v2/sport-tournaments/:id/auction/resume
POST   /v2/sport-tournaments/:id/auction/sell
POST   /v2/sport-tournaments/:id/auction/unsold
POST   /v2/sport-tournaments/:id/auction/complete
POST   /v2/sport-tournaments/:id/auction/bid
GET    /v2/sport-tournaments/:id/auction/current
GET    /v2/sport-tournaments/:id/auction/history
GET    /v2/sport-tournaments/:id/readiness
```

---

## Socket.IO Events

The Socket.IO server is attached to the same HTTP server as Express. All events use the default namespace (`/`).

### Client → Server (emit)

| Event | Payload | Description |
|---|---|---|
| `join-festival-auction` | `{ festivalId: number }` | Join a festival auction room |
| `leave-festival-auction` | `{ festivalId: number }` | Leave a festival auction room |
| `join-sport-auction` | `{ sportTournamentId: number }` | Join a sport auction room |
| `leave-sport-auction` | `{ sportTournamentId: number }` | Leave a sport auction room |

### Server → Client (broadcast)

| Event | Payload | Description |
|---|---|---|
| `auction-state` | Full auction state snapshot | Broadcast to room after every state change (bid, sell, unsold, pause, resume) |

The payload includes:
- `scopeType` — `"festival"` or `"sport"`
- `scopeId` — festival ID or sport tournament ID
- `revision` — monotonically increasing integer for revision-guard on client
- `auction` — current auction state
- `history` — completed round history
- `teams` — team budget snapshots

---

## Middleware

| File | Purpose |
|---|---|
| `auth.middleware.js` | Verifies JWT Bearer token. Attaches `req.user`. Supports role guard (`requireRole("admin")`) and optional auth. |
| `validate.middleware.js` | Wraps Zod schemas into Express middleware. Returns 400 with error details on schema violation. |
| `multipartCsv.middleware.js` | Handles multipart/form-data for CSV employee import endpoints. |

### Auth Middleware Usage

```js
// Require any authenticated user
router.get("/endpoint", authenticate, handler);

// Require specific role
router.post("/endpoint", authenticate, requireRole("admin"), handler);

// Optional auth (attaches user if token present, proceeds if not)
router.get("/endpoint", optionalAuthenticate, handler);
```

---

## Models

### Auth & Users
| Model | File | Key Fields |
|---|---|---|
| User | `user.model.js` | id, email, role, mustChangePassword |
| Employee | `employee.model.js` | id, name, email, gender, userId |

### Festival System
| Model | File | Key Fields |
|---|---|---|
| Festival | `festival.model.js` | id, name, status, configurationLockState |
| FestivalTeam | `festivalTeam.model.js` | id, festivalId, name |
| FestivalParticipant | `festivalParticipant.model.js` | id, festivalId, employeeId, status |
| FestivalTeamOwner | `festivalTeamOwner.model.js` | id, festivalTeamId, userId |
| FestivalTeamMembership | `festivalTeamMembership.model.js` | id, festivalTeamId, festivalParticipantId |
| FestivalRetention | `festivalRetention.model.js` | id, festivalTeamId, festivalParticipantId |
| FestivalOperationAudit | `festivalOperationAudit.model.js` | id, festivalId, action, performedBy |

### Festival Auction
| Model | File | Key Fields |
|---|---|---|
| FestivalAuction | `festivalAuction.model.js` | id, festivalId, status, currentParticipantId, revision |
| FestivalAuctionConfig | `festivalAuctionConfig.model.js` | id, festivalAuctionId, budgetPerTeam, minBidIncrement |
| FestivalAuctionPool | `festivalAuctionPool.model.js` | id, festivalAuctionId, participantId, poolStatus |
| FestivalAuctionBid | `festivalAuctionBid.model.js` | id, festivalAuctionId, teamId, amount, round |
| FestivalAuctionResult | `festivalAuctionResult.model.js` | id, festivalAuctionId, participantId, outcome, finalAmount |

### Sport System
| Model | File | Key Fields |
|---|---|---|
| SportTournament | `sportTournament.model.js` | id, festivalId, name, status, genderRule |
| SportTeam | `sportTeam.model.js` | id, sportTournamentId, name |
| SportTeamCaptain | `sportTeamCaptain.model.js` | id, sportTeamId, userId |
| SportTeamBudget | `sportTeamBudget.model.js` | id, sportTeamId, totalCredits, usedCredits |

### Sport Auction
| Model | File | Key Fields |
|---|---|---|
| SportAuction | `sportAuction.model.js` | id, sportTournamentId, status, revision |
| SportAuctionConfig | `sportAuctionConfig.model.js` | id, sportAuctionId, minBidIncrement |
| SportAuctionPool | `sportAuctionPool.model.js` | id, sportAuctionId, participantId, poolStatus |
| SportAuctionBid | `sportAuctionBid.model.js` | id, sportAuctionId, sportTeamId, amount |
| SportAuctionResult | `sportAuctionResult.model.js` | id, sportAuctionId, participantId, outcome, finalCredits |

---

## Utilities

| File | Purpose |
|---|---|
| `auctionSynchronization.js` | `publishFestivalAuctionState()`, `publishSportAuctionState()` — builds full state snapshot and broadcasts via Socket.IO |
| `auctionIncrementEngine.js` | Computes suggested bid increments based on bid level and budget ratio |
| `festivalReadiness.js` | Evaluates festival setup blockers for the readiness check endpoint |
| `sportTournamentReadiness.js` | Evaluates sport tournament setup blockers |
| `festivalAuctionBudget.js` | Calculates remaining budget per festival team |
| `sportTeamBudget.js` | Calculates remaining credits per sport team |
| `festivalBidProgression.js` | Validates bid amounts against current auction state and config |
| `bidRules.js` | Shared bid validation rules (minimum increment, budget cap) |
| `emailService.js` | Provider-agnostic email sender — auto-selects SMTP / SendGrid / Resend from env |
| `festivalLocking.js` | Manages configuration lock/unlock state for festivals |
| `sportTournamentAuthorization.js` | Permission checks for sport tournament operations |
| `sportTournamentEligibility.js` | Computes participant eligibility for sport auction pools |
| `festivalParticipantImport.js` | Parses and imports participant data from CSV |
| `requestPerformance.js` | Request timing utilities |

---

## Validation

All mutating endpoints are protected by Zod validation middleware. Schema files:

| File | Covers |
|---|---|
| `auth.validation.js` | register, login, forgot-password, reset-password, change-password |
| `festival.validation.js` | festival create/update, team create, participant add, auction config |
| `sportTournament.validation.js` | tournament create/update, team create, captain assign, budget set |
| `auction.validation.js` | auction start, bid place, sell/unsold params |
| `employee.validation.js` | employee create/update, CSV import |
| `player.validation.js` | legacy player CRUD |
| `socket.validation.js` | Socket.IO event payload validation |
| `common.validation.js` | Shared validators (ID params, pagination) |

---

## Email Configuration

The backend auto-selects an email provider based on which environment variables are present:

1. **Resend** — if `RESEND_API_KEY` is set
2. **SendGrid** — if `SENDGRID_API_KEY` is set
3. **SMTP** — if `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are set

Emails are sent for:
- Email address verification on registration
- Password reset links
- Team owner credential delivery (auto-created accounts)
- "Resend credentials" admin action

---

## Security Notes

- **JWT** — All protected routes require `Authorization: Bearer <token>`. Tokens expire after 7 days.
- **Bcrypt** — Passwords are hashed with bcryptjs before storage. Plain-text passwords are never stored.
- **Zod validation** — All mutating endpoints validate request bodies. Unvalidated input never reaches the database layer.
- **Role guards** — Admin-only routes (`requireRole("admin")`) are enforced in middleware before controllers run.
- **CORS** — Origin is restricted to `FRONTEND_URL`. Set this to your production frontend URL before deploying.
- **Production checklist:**
  - Set `FRONTEND_URL` to the exact production origin (no wildcards)
  - Use a strong `JWT_SECRET` (32+ random characters)
  - Run behind HTTPS (Render provides this by default)
  - Consider adding rate limiting on `/v1/auth/login` and `/v1/auth/register`
