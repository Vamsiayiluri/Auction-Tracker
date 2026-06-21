# Production Stability Implementation

## Summary

Implemented platform-level crash protection and recovery for dynamic imports, route failures, malformed API responses, deployment chunk mismatches, and live auction socket failures.

No auction rules, allocation behavior, permissions, or business workflows were changed.

## Files Modified

- `ipl-auction-tracker/src/App.jsx`
- `ipl-auction-tracker/src/main.jsx`
- `ipl-auction-tracker/src/components/AppErrorBoundary.jsx`
- `ipl-auction-tracker/src/components/RouteBoundary.jsx`
- `ipl-auction-tracker/src/components/ProductState.jsx`
- `ipl-auction-tracker/src/utils/chunkRecovery.js`
- `ipl-auction-tracker/src/utils/lazyWithRetry.js`
- `ipl-auction-tracker/src/utils/apiResponse.js`
- `ipl-auction-tracker/src/utils/api.js`
- `ipl-auction-tracker/src/utils/safeSocketEvent.js`
- `ipl-auction-tracker/src/webSocket/socket.js`
- `ipl-auction-tracker/src/hooks/useSocketHealth.js`
- `ipl-auction-tracker/src/pages/FestivalLiveAuctionPage.jsx`
- `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx`
- `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- `ipl-auction-tracker/src/components/FestivalControlCenter.jsx`
- `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentDirectory.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionArena.jsx`
- `ipl-auction-tracker/vite.config.js`
- `ipl-auction-tracker/vercel.json`

## Architecture Changes

### AppErrorBoundary

Added `AppErrorBoundary` to catch:

- render failures
- route failures
- `React.lazy` failures
- chunk loading failures
- dynamic import failures

Recognized chunk error signatures:

- `Failed to fetch dynamically imported module`
- `ChunkLoadError`
- `Loading chunk`
- `Expected JavaScript module script`
- `Importing a module script failed`

Fallback UI uses `ProductStateCard` and provides:

- Retry
- Reload App
- Go to Dashboard

### RouteBoundary

Added `RouteBoundary` and wrapped major routes in `App.jsx`, including:

- Dashboard
- Festivals
- Festival Management
- Festival Command Center
- Festival Auction Hub
- Festival Live Auction
- Festival Results
- Auctions
- Sport Tournament Directory
- Sport Command Center
- Sport Workspace
- Sport Auction Hub
- Sport Live Auction
- Sport Results
- Profile
- Settings

### Dynamic Import Recovery

Added `lazyWithRetry()`:

- retries failed dynamic imports with exponential backoff
- detects stale chunk failures
- triggers one safe hard reload using `sessionStorage` guard
- prevents reload loops by scoping reload attempts per route/path

All route-level lazy imports in `App.jsx` now use `lazyWithRetry`.

Nested Festival chunks also use `lazyWithRetry`:

- `MainFestivalAuction`
- `FestivalHistory`
- `FestivalBidHistory`
- `FestivalOverview`
- `FestivalReadiness`
- `FestivalAuctionSetup`
- `FestivalTeamBuilder`
- `FestivalTeamsDirectory`

### Vite Preload Recovery

`main.jsx` installs a `vite:preloadError` listener through `installVitePreloadRecovery()`.

When Vite preload failures indicate stale or missing chunks, the app logs diagnostics and performs the same guarded one-time reload recovery.

## Error Recovery Flows

### Chunk Failure

1. Lazy import fails.
2. `lazyWithRetry` retries with backoff.
3. If still failing and recognized as a chunk error, the app performs one guarded hard reload.
4. If reload is already attempted, `AppErrorBoundary` shows recovery UI.

### Render Failure

1. Route or component throws during render.
2. Nearest `RouteBoundary` or `AppErrorBoundary` catches it.
3. User can retry the section, reload the app, or go to Dashboard.

### Vite Preload Failure

1. Browser emits `vite:preloadError`.
2. Recovery handler classifies the failure.
3. Stale chunk failures trigger guarded reload.

## API Hardening Coverage

Added `apiResponse.js` helpers:

- `getData()`
- `getArrayData()`
- `requireObjectData()`
- `getApiMessage()`

Hardened high-risk pages:

- Sport Tournament Directory
- Sport Tournament Workspace
- Festival Control Center
- Main Festival Auction
- Sport Auction Arena

Changes include:

- object shape validation before field access
- array normalization before list state updates
- friendly timeout/offline/server/auth messages
- partial load behavior using `Promise.allSettled` where requests are independent

## Axios Hardening

`api.js` now includes:

- 20 second request timeout
- offline classification
- timeout classification
- server unavailable classification
- authentication failure classification
- friendly message metadata for callers

## Promise Failure Isolation

Converted high-risk independent request groups to `Promise.allSettled`:

- Sport Tournament Directory list/context load
- Festival Control Center readiness/current load
- Festival live auction current/history load
- Sport live auction current/history load

Result: one failed endpoint no longer automatically blocks all other data when partial rendering is possible.

## Socket Protection Coverage

Added `safeApplySocketEvent()` and applied it to:

- Festival auction state snapshots
- Festival bid events
- Festival participant-started events
- Festival timer events
- Sport auction state snapshots
- Sport bid events
- Sport participant-started events
- Sport timer events

If a socket reducer or malformed payload throws:

1. error is logged with `[SOCKET_EVENT_ERROR]`
2. UI remains mounted
3. user sees a live-update warning
4. REST fallback refresh is triggered

## Socket Health Management

Extended `webSocket/socket.js` with health tracking for:

- connected
- disconnected
- reconnecting
- connect errors
- reconnect attempts
- reconnect failure
- disconnect reason

Added `useSocketHealth()` hook.

Festival and Sport live auctions now:

- keep current auction state visible during disconnect
- show reconnect warning banner
- provide manual refresh
- poll REST every 7 seconds while disconnected/reconnecting
- stop fallback polling when socket reconnects

## Deployment Hardening

### Vite

`vite.config.js` now injects:

- `__APP_BUILD_ID__`
- `__APP_BUILD_TIME__`

### Vercel

`vercel.json` now:

- applies immutable caching for `/assets/*`
- applies no-cache headers for app-shell routes
- avoids rewriting `/assets/*` requests to `/`

Goal: missing JS assets should not be served as `index.html`, preventing `text/html` module responses.

## Route Protection Coverage

Protected with route-level boundaries:

- Dashboard
- Festivals
- Festival Management
- Festival Command Center
- Festival Auctions
- Festival Results
- Sport Tournament Directory
- Sport Workspace
- Sport Auctions
- Sport Results
- Sport Command Centers
- Profile
- Settings

Nested Festival management sections are protected with local boundaries so one failed section does not break the whole management page.

## Validation

Ran focused ESLint on modified stability files:

```text
0 errors
```

Ran production build:

```text
npm run build
✓ built successfully
```

Build still reports the existing large chunk warning for the main bundle. That warning existed before this stability work and does not block this implementation.

## Remaining Risks

- Full automated Playwright tests for simulated stale chunks, malformed API payloads, and socket payload corruption are not yet added.
- Some lower-risk pages still use direct `response.data.data`; the highest-risk production surfaces were hardened first.
- Vercel rewrite behavior should be verified in the actual deployed environment because local build cannot prove production CDN routing semantics.
- Main bundle remains over 500 kB. Future work should add manual chunk strategy for better startup resilience and caching.
