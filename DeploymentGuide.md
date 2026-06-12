# Deployment Guide

This is a code-evidence deployment guide, not a claim that a production
deployment pipeline exists. Database migration scripts are present, but no
Dockerfile, CI/CD workflow, process manager, monitoring, or backup automation
is present.

## Prerequisites

- Node.js and npm compatible with React 19/Vite 6 and Express 4.
- Reachable MySQL database with TLS support.
- Resend account and verified sending domain if application email is used.
- Two deployable services: static frontend and stateful Node backend.

Evidence: both `package.json` files and backend `src/config/dbconfig.js`.

## Backend Environment

Required by code:

```dotenv
MYSQL_DB_NAME=
MYSQL_DB_USER=
MYSQL_DB_HOST=
```

Used by code:

```dotenv
PORT=5000
MYSQL_DB_PASSWORD=
MYSQL_DB_PORT=3306
JWT_SECRET=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=
CLIENT_URL=
EMAIL_VERIFICATION_REQUIRED=true
```

Evidence: `ipl-auction-tracker-backend/src/config/dbconfig.js`,
`src/controllers/auth.controller.js`, `src/utils/emailService.js`,
`src/index.js`.

`JWT_SECRET` is used but not included in startup required-variable validation.
Treat it as mandatory.

### Production Email Delivery

Use Resend from Render so delivery uses HTTPS instead of an outbound SMTP
connection:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="AuctionArena <verify@your-verified-domain.example>"
CLIENT_URL=https://your-frontend.vercel.app
EMAIL_VERIFICATION_REQUIRED=true
```

The sender domain in `EMAIL_FROM` must be verified in Resend. Add the DNS
records Resend provides before testing registration, resend verification,
password reset, or team-owner credential delivery.

Gmail SMTP remains an explicit diagnostic/local fallback:

```dotenv
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=complete-gmail-address@example.com
SMTP_PASS=16-character-google-app-password
SMTP_TIMEOUT_MS=10000
EMAIL_FROM=complete-gmail-address@example.com
```

For Gmail port `465`, use `SMTP_SECURE=true` because TLS starts immediately.
For port `587`, use `SMTP_SECURE=false`; Nodemailer upgrades the connection
with STARTTLS. Do not set `tls.rejectUnauthorized=false`. Gmail password
authentication requires Google 2-Step Verification and an App Password.

SMTP mode dynamically loads Nodemailer because it is not part of the
production Resend path. Install and declare `nodemailer` before selecting
`EMAIL_PROVIDER=smtp` in a clean deployment.

## Frontend Environment

```dotenv
VITE_API_URL=https://backend.example.com
```

Evidence: `ipl-auction-tracker/src/utils/api.js`,
`src/webSocket/socket.js`.

## Local Start Commands

```powershell
cd ipl-auction-tracker-backend
npm install
npm start

cd ..\ipl-auction-tracker
npm install
npm run dev
```

Backend scripts: `start` and `start:dev`. Frontend scripts: `dev`, `build`,
`lint`, and `preview`.

## Build and Deploy

Frontend:

```powershell
cd ipl-auction-tracker
npm ci
npm run lint
npm run build
```

Serve the generated `dist` directory with SPA fallback. A tracked
`ipl-auction-tracker/vercel.json` exists for frontend hosting.

Backend:

```powershell
cd ipl-auction-tracker-backend
npm install --omit=dev
npm run db:migrate -- status
npm run db:migrate
npm start
```

The backend must support long-lived WebSocket connections. Use sticky sessions
if multiple instances are introduced, but current process-local timers and
Socket.IO state mean multiple instances are not safe without architectural
changes.

## Database Initialization

Before each backend deployment:

1. Take and verify a database backup.
2. Run `npm run db:migrate -- status`.
3. Run `npm run db:migrate`.
4. Start the backend only after migrations succeed.

Migrations are tracked in the `SequelizeMeta` table and run in filename order.
The baseline migration supports fresh databases and additively upgrades the
legacy schema. The Phase 5 integrity migration fails before adding constraints
if unsupported enum values or orphaned references exist; it does not delete
those records.

Useful commands:

```powershell
npm run db:migrate
npm run db:migrate -- status
npm run db:migrate -- down
```

`down` reverts only the latest migration. The initial baseline is intentionally
non-destructive and cannot be reverted. Restore a tested backup for baseline
rollback.

Backend startup now authenticates to MySQL and starts the application without
running `sequelize.sync()` or schema backfills. It still restores every live
auction with a fresh 20-second timer because deadlines are not persisted.

Evidence: `scripts/migrate.js`, `src/database/migrator.js`, `migrations/`,
`src/index.js`, `src/controllers/auction.controller.js`.

## Health and Operations

`GET /health` confirms only that Express is responding. It does not verify
MySQL, Resend, or Socket.IO. Backend startup logs validate that the email
provider credentials are present. SMTP mode additionally runs
`transporter.verify()` and logs connection metadata without logging secrets.

Required production additions:

- Explicit CORS allowlist and reverse-proxy WebSocket configuration.
- Structured logs, request IDs, metrics, traces, alerting, and dependency-aware
  health/readiness endpoints.
- Database backups, retention policy, and restore drills.
- CI/CD with lint, tests, build, dependency scanning, migration gates, and rollback.
- Secret manager and rotation.
- Graceful shutdown and process supervision.

## Current Verification Limitation

During the 2026-06-08 Phase 5 work, npm commands could not run because `npm`
and Node.js are not installed or not available on `PATH` in the audit
environment. The backend includes focused tests under
`ipl-auction-tracker-backend/test`; run them with `npm test`.
