# Deployment Guide

This is a code-evidence deployment guide, not a claim that a production
deployment pipeline exists. No Dockerfile, CI/CD workflow, migration scripts,
process manager, monitoring, or backup automation is present.

## Prerequisites

- Node.js and npm compatible with React 19/Vite 6 and Express 4.
- Reachable MySQL database with TLS support.
- SendGrid account if verification email is used.
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
SENDGRID_API_KEY=
EMAIL_FROM=
CLIENT_URL=
EMAIL_VERIFICATION_REQUIRED=true
```

Evidence: `ipl-auction-tracker-backend/src/config/dbconfig.js`,
`src/controllers/auth.controller.js`, `src/utils/emailService.js`,
`src/index.js`.

`JWT_SECRET` is used but not included in startup required-variable validation.
Treat it as mandatory.

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
npm start
```

The backend must support long-lived WebSocket connections. Use sticky sessions
if multiple instances are introduced, but current process-local timers and
Socket.IO state mean multiple instances are not safe without architectural
changes.

## Database Initialization

On startup the backend:

1. Authenticates to MySQL.
2. Runs `sequelize.sync({force:false})`.
3. Runs user and tournament-scope backfills.
4. Restores every live auction with a fresh 20-second timer.

Evidence: `src/index.js`, `src/models/index.js`,
`src/controllers/auction.controller.js`.

Production warning: replace this with reviewed migrations and persist timer
deadlines before production deployment.

## Health and Operations

`GET /health` confirms only that Express is responding. It does not verify
MySQL, SendGrid, or Socket.IO.

Required production additions:

- Explicit CORS allowlist and reverse-proxy WebSocket configuration.
- Structured logs, request IDs, metrics, traces, alerting, and dependency-aware
  health/readiness endpoints.
- Database backups, retention policy, and restore drills.
- CI/CD with lint, tests, build, dependency scanning, migrations, and rollback.
- Secret manager and rotation.
- Graceful shutdown and process supervision.

## Current Verification Limitation

During the 2026-06-05 audit and Phase 1 refactor, npm commands could not run
because `npm` is not installed or not available on `PATH` in the audit
environment. The backend now includes focused Phase 1 security tests under
`ipl-auction-tracker-backend/test`; run them with `npm test`.
