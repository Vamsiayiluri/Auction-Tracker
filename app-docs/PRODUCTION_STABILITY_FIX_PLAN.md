# Production Stability Fix Plan

Goal: no single page, lazy import, API failure, deployment mismatch, or socket failure should be capable of breaking the application.

## Phase 1: Chunk Failure Recovery

### 1. Add App-Level Error Boundary

Severity: Critical

Impact: Uncaught render errors and rejected lazy imports currently can white-screen the app.

Fix:

- Create `src/components/AppErrorBoundary.jsx`.
- Use a class boundary with `getDerivedStateFromError` and `componentDidCatch`.
- Detect chunk/import errors by message patterns:
  - `Failed to fetch dynamically imported module`
  - `Importing a module script failed`
  - `Expected a JavaScript module script`
  - `ChunkLoadError`
  - `Loading chunk`
- Render `ProductStateCard` with:
  - Retry button
  - Reload app button
  - Dashboard button where router context is available
- Wrap the full app under `ThemeProvider` or inside `AppRouter` so route chunks cannot crash the root.

Effort: 3 hours

### 2. Replace `Suspense fallback={null}`

Severity: High

Impact: Normal lazy loading and slow networks show a blank app.

Fix:

- Replace the top-level null fallback in `src/App.jsx` with `LoadingStateCard`.
- Prefer route-level wrappers:
  - `withRouteBoundary(<Page />)`
  - `RouteSuspense`
  - `RouteErrorBoundary`

Effort: 2 hours

### 3. Add Lazy Import Retry Helper

Severity: Critical

Impact: Transient chunk/network failures currently fail immediately.

Fix:

- Add `src/utils/lazyWithRetry.js`.
- Wrap dynamic imports with retry/backoff.
- On recognized stale chunk failure, set a session flag and trigger one hard reload:
  - `sessionStorage.setItem("auctionarena:chunk-reload:<buildId>", "1")`
  - `window.location.reload()`
- Prevent reload loops by only reloading once per build/path.

Effort: 4 hours

### 4. Add Vite Preload Error Handler

Severity: High

Impact: Vite emits `vite:preloadError` when preload chunks fail, but the app does not handle it.

Fix:

- In `src/main.jsx`, add:
  - `window.addEventListener("vite:preloadError", handler)`
- Handler should:
  - prevent default when possible
  - classify stale chunk errors
  - show a recovery page or reload once

Effort: 2 hours

## Phase 2: Deployment and Cache Safety

### 5. Fix Vercel Asset Rewrites

Severity: Critical

Impact: Missing `/assets/*.js` currently can be rewritten to `/`, returning HTML as a module.

Fix:

- Update `vercel.json` to preserve SPA fallback for routes but not for static assets.
- Add headers:
  - `/(.*).html` and `/`: `Cache-Control: no-cache, no-store, must-revalidate`
  - `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable`
- Ensure missing `/assets/*.js` returns real 404, not `index.html`.

Effort: 2 hours

### 6. Inject Build Version Metadata

Severity: High

Impact: Client cannot tell whether its loaded shell is stale.

Fix:

- Add Vite define values:
  - `__APP_BUILD_ID__`
  - `__APP_BUILD_TIME__`
- Generate `public/version.json` or emit a version endpoint at build time.
- Add a lightweight `checkForAppUpdate()` helper used on:
  - route navigation
  - chunk/preload failures
  - app visibility regain

Effort: 4 hours

### 7. Add Deployment Smoke Test

Severity: Medium

Impact: Chunk MIME problems are only discovered by users.

Fix:

- After build, parse `dist/index.html`.
- Fetch or inspect every generated JS/CSS asset.
- Assert:
  - file exists
  - JS assets start with JS, not HTML
  - MIME type is JavaScript in deployed environment
- Add Playwright production smoke path:
  - `/sport-tournaments`
  - `/dashboard`
  - `/auctions`
  - `/festivals/:id/results` where possible

Effort: 4 hours

## Phase 3: Route Boundary Coverage

### 8. Wrap Every Major Route

Severity: Critical

Impact: Page render errors can currently unmount the route tree.

Fix:

- Create `RouteBoundary` component.
- Use it for:
  - Dashboard
  - Festivals
  - Auctions
  - Sport Tournaments
  - Results
  - Command Centers
  - Live Auctions
  - Profile/settings
- Boundary fallback should include:
  - Retry route render
  - Reload app
  - Go to dashboard

Effort: 5 hours

### 9. Wrap Nested Lazy Regions

Severity: High

Impact: `FestivalDetail` and `FestivalLiveAuctionPage` nested lazy chunks can break their pages.

Fix:

- Add `ChunkBoundary` around:
  - `MainFestivalAuction`
  - `FestivalHistory`
  - `FestivalBidHistory`
  - `FestivalTeamBuilder`
  - `FestivalAuctionSetup`
  - `FestivalReadiness`
  - `FestivalOverview`
  - `FestivalTeamsDirectory`
- Each nested fallback should preserve surrounding navigation and page shell.

Effort: 3 hours

## Phase 4: API Contract Hardening

### 10. Add API Response Normalizers

Severity: High

Impact: Malformed successful responses can crash pages.

Fix:

- Add helpers in `src/utils/apiResponse.js`:
  - `getData(response, fallback)`
  - `getArrayData(response)`
  - `requireObjectData(response, label)`
  - `getApiMessage(error, fallback)`
- Replace direct `response.data.data` usage in high-risk pages first.

Effort: 6 hours

### 11. Add Axios Timeout and Network Classification

Severity: Medium

Impact: Hung requests leave users waiting without a clear retry path.

Fix:

- Set Axios timeout, for example 20 seconds.
- Normalize error types:
  - offline
  - timeout
  - unauthorized
  - forbidden
  - server unavailable
  - malformed response
- Add global auth expiry handling for 401/403 where appropriate.

Effort: 4 hours

### 12. Replace Risky `Promise.all` with Partial Loading

Severity: Medium

Impact: Non-critical endpoint failures block usable page data.

Fix:

- Convert independent loads to `Promise.allSettled`.
- Apply first to:
  - `SportTournamentDirectory`
  - `FestivalControlCenter`
  - `FestivalAuctionSetup`
  - `FestivalTeamBuilder`
  - `FestivalTeamsDirectory`
  - `MainFestivalAuction`
  - `SportAuctionArena`
- Show per-section warnings and retry buttons.

Effort: 6 hours

## Phase 5: Live Auction Fault Isolation

### 13. Wrap Socket Event Reducers

Severity: High

Impact: One malformed socket payload can crash live auction rendering.

Fix:

- Add `safeApplySocketEvent({ eventName, payload, apply, fallbackRefresh })`.
- Wrap reducer calls in `try/catch`.
- On reducer failure:
  - log diagnostic
  - show non-blocking warning
  - trigger REST refresh
- Apply to Festival and Sport auction pages/hubs/history components.

Effort: 5 hours

### 14. Centralize Socket Connection State

Severity: Medium

Impact: Reconnect/auth errors are handled inconsistently.

Fix:

- Extend `src/webSocket/socket.js` with:
  - `connect_error`
  - `reconnect_attempt`
  - `reconnect_failed`
  - `disconnect` reason tracking
  - token refresh/logout hooks
- Expose a small hook:
  - `useSocketHealth()`
- Use it in live auction headers and hubs.

Effort: 5 hours

### 15. Add Live Auction Offline Mode

Severity: Medium

Impact: Users see disconnect status but not always a clear recovery path.

Fix:

- When socket disconnects:
  - keep last known state visible
  - show reconnecting banner
  - enable manual refresh
  - fall back to polling every 5-10 seconds while disconnected
- Stop fallback polling once socket rejoins.

Effort: 6 hours

## Phase 6: Tests and Release Gates

### 16. Add Chunk Failure Tests

Severity: Critical

Impact: Current build can ship with chunk recovery broken.

Fix:

- Unit test chunk error classifier.
- Playwright test that intercepts a dynamic chunk and returns:
  - 404
  - HTML
  - delayed timeout
- Assert user sees recovery UI, not a blank page.

Effort: 6 hours

### 17. Add API Malformed Payload Tests

Severity: High

Impact: Pages may crash on unexpected but successful API responses.

Fix:

- Mock malformed payloads for:
  - Sport Tournament Directory
  - Sport Tournament Workspace
  - Sport Auction Arena
  - Festival Detail
  - Main Festival Auction
- Assert safe fallback/error UI.

Effort: 6 hours

### 18. Add Live Socket Resilience Tests

Severity: High

Impact: Live auction is the highest operational-risk surface.

Fix:

- Simulate:
  - disconnect
  - reconnect
  - malformed payload
  - stale revision
  - REST fallback failure
- Assert UI remains mounted and state is recoverable.

Effort: 8 hours

## Recommended Execution Order

1. App-level error boundary and non-null route fallback.
2. Vercel asset rewrite/header fix.
3. Lazy import retry and Vite preload error handler.
4. Route and nested chunk boundaries.
5. API response normalizers for Sport Tournament and live auction paths.
6. Socket reducer isolation and fallback polling.
7. Deployment and Playwright smoke tests.

## Estimated Total Effort

Minimum production hardening pass: 20-28 hours.

Full platform stability program with tests: 60-70 hours.

## Acceptance Criteria

- Missing or stale dynamic chunks never produce a blank screen.
- HTML returned for a JS chunk produces a recovery UI or one safe reload.
- Every major route has an error boundary and retry path.
- `response.data.data` is not trusted without normalization in high-risk pages.
- Live auctions remain visible during socket disconnects and recover through REST fallback.
- Vercel does not rewrite missing JS assets to `index.html`.
- Deployment smoke tests verify generated assets before release.
