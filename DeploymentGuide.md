# Deployment Guide

This is a code-evidence deployment guide, not a claim that a production
deployment pipeline exists. Database migration scripts are present, but no
Dockerfile, CI/CD workflow, process manager, monitoring, or backup automation
is present.

## Prerequisites

- Node.js and npm compatible with React 19/Vite 6 and Express 4.
- Reachable MySQL database with TLS support.
- Gmail account with 2-Step Verification and an App Password if application
  email is used. Resend remains available as an optional provider.
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
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
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

Gmail SMTP is the primary provider. Configure these variables on the Render
backend service:

```dotenv
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=complete-gmail-address@gmail.com
SMTP_PASS=16-character-google-app-password
SMTP_TIMEOUT_MS=15000
EMAIL_FROM=complete-gmail-address@gmail.com
CLIENT_URL=https://your-frontend.vercel.app
EMAIL_VERIFICATION_REQUIRED=true
SMTP_DEBUG_ENDPOINT_ENABLED=false
```

Port `587` uses STARTTLS, so `SMTP_SECURE` must be `false`. The transporter
sets `requireTLS: true`, requires TLS 1.2 or newer, and validates Gmail's
certificate. Do not disable certificate verification.

The Gmail account must have Google 2-Step Verification enabled. Generate an
App Password and place its 16 characters in `SMTP_PASS`. Do not use the normal
Google account password. If Google account security settings or the primary
password change, generate a new App Password. `EMAIL_FROM` should be the same
Gmail address as `SMTP_USER` unless the Gmail account is configured and
authorized to send from an alias.

Resend remains available as an optional provider:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="AuctionArena <verify@your-verified-domain.example>"
RESEND_TIMEOUT_MS=10000
```

Resend requires a verified sending domain. Selecting `EMAIL_PROVIDER=resend`
does not alter verification links or authentication flows.

### SMTP Diagnostics

Backend startup logs the provider, SMTP host, port, secure mode, and booleans
indicating whether the username, password, and sender are configured. It never
logs credential values. When SMTP is selected, startup calls
`transporter.verify()`. Failure is logged but does not stop the web service.

The temporary diagnostic endpoint is:

```text
GET /api/debug/smtp-test
Authorization: Bearer <admin-access-token>
```

It is protected by authentication and admin-role middleware. To use it:

1. Set `SMTP_DEBUG_ENDPOINT_ENABLED=true` on Render and redeploy.
2. Call the endpoint with an admin JWT.
3. Review the returned DNS, verify, and send stages.
4. Confirm the diagnostic message arrives at `SMTP_USER`.
5. Set `SMTP_DEBUG_ENDPOINT_ENABLED=false` and redeploy.

The endpoint returns `404` while disabled. It sends only to `SMTP_USER` and
cannot accept a recipient from the request.

Error categories:

- `connection_timeout`: `ETIMEDOUT`; Render could not complete the network
  connection before the timeout. `command: CONN` means Gmail authentication
  was never reached.
- `connection_refused`: `ECONNREFUSED`; the destination actively refused the
  TCP connection.
- `dns_failure`: SMTP hostname resolution failed.
- `tls_failure`: TLS negotiation or certificate validation failed.
- `gmail_authentication_failed`: Nodemailer `EAUTH`, Gmail `534`/`535`, an
  invalid/revoked App Password, or an account security restriction.
- `smtp_rejected`: Gmail connected and authenticated but rejected the message
  or sender.

`nodemailer` is a declared production dependency and must remain in both
`package.json` and `package-lock.json`.

### Render Compatibility Audit

- No tracked `render.yaml` exists. Render environment variables must be set on
  the backend service's Environment page and followed by a redeploy.
- The backend `.env` file is gitignored and is not copied to Render.
- Render's public environment-variable documentation explains runtime
  injection but does not document a general platform block on Gmail ports
  `465` or `587`.
- A startup or endpoint result of `connection_timeout` with `command: CONN`
  confirms a Render-to-Gmail network connection failure before TLS completion
  or Gmail authentication. Changing App Passwords cannot fix that result.
- `gmail_authentication_failed` confirms Render reached Gmail and the remaining
  issue is the account, App Password, or sender authorization.
- Startup verification runs after Express begins listening, so an unavailable
  SMTP dependency does not delay the web service health response.

### Email Verification Procedure

Local:

1. Set the SMTP variables in the backend `.env`.
2. Start the backend and confirm `SMTP transporter verification succeeded`.
3. Temporarily set `SMTP_DEBUG_ENDPOINT_ENABLED=true`.
4. Sign in as an admin and call `GET /api/debug/smtp-test`.
5. Confirm the response reports successful DNS, verify, and send stages.

Render:

1. Add the same variables on the backend service's Environment page.
2. Use **Save, rebuild, and deploy** so dependency and environment changes are
   included.
3. Confirm the startup configuration log shows port `587`, `secure: false`,
   and all credential booleans as `true`.
4. Enable the diagnostic endpoint, redeploy, call it with an admin token, and
   inspect its stage-specific result.
5. Disable the endpoint and redeploy after testing.

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
MySQL, Gmail SMTP, Resend, or Socket.IO. SMTP startup verification and the
temporary admin diagnostic endpoint provide email dependency diagnostics.

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
