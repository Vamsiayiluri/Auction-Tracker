# Production Stability Audit

Scope: frontend route loading, dynamic imports, error boundaries, API failure handling, deployment/cache behavior, and live auction socket resilience.

## Executive Summary

The Sport Tournament production failure is a platform-level chunk-loading failure, not a Sport Tournament-only bug.

The application currently has:

- Route-level `React.lazy` chunks for nearly every page.
- A single top-level `Suspense fallback={null}` in `src/App.jsx`.
- No application or route-level error boundary.
- Vercel rewrites every unmatched path to `/`, including missing hashed JS assets.
- No Vite/build version metadata or client-side stale-deployment recovery.

When a deployed HTML shell references a stale chunk such as `SportTournamentDirectory-*.js`, Vercel can return `index.html` for the missing asset. The browser then rejects it with:

```text
Expected JavaScript module but received text/html
Failed to fetch dynamically imported module
```

Because no error boundary catches rejected lazy imports, the UI can white-screen.

## Phase 1: Route Audit

### Route-level lazy imports

`src/App.jsx` lazy-loads these page chunks:

- `AccountSettingsPage`
- `AuctionDirectory`
- `AuctionPage`
- `ChangePassword`
- `Dashboard`
- `EmployeeDirectory`
- `FestivalAuctionHub`
- `FestivalAuctionResultsPage`
- `FestivalCommandCenter`
- `FestivalDashboard`
- `FestivalDetail`
- `FestivalLiveAuctionPage`
- `ForgotPassword`
- `LiveAuctionPage`
- `Login`
- `ProfilePage`
- `Register`
- `ResetPassword`
- `SpectatorAuctionPage`
- `SportAuctionArena`
- `SportAuctionHub`
- `SportAuctionResultsPage`
- `SportTournamentCommandCenter`
- `SportTournamentDirectory`
- `SportTournamentWorkspace`
- `VerifyEmail`

All of these can fail during route navigation if their chunk is unavailable, stale, or served as HTML.

### Current fallback behavior

`src/App.jsx` wraps the full route tree in:

```jsx
<Suspense fallback={null}>
```

Impact:

- Loading a route chunk shows a blank screen instead of a loading state.
- A rejected route import has no local recovery UI.
- A stale-deploy chunk failure can break the whole app shell.

### Nested lazy imports

Nested lazy imports exist in:

- `src/pages/FestivalLiveAuctionPage.jsx`: `MainFestivalAuction`
- `src/pages/FestivalAuctionResultsPage.jsx`: `FestivalHistory`
- `src/pages/FestivalDetail.jsx`: `FestivalTeamBuilder`, `FestivalAuctionSetup`, `FestivalReadiness`, `FestivalOverview`, `FestivalHistory`, `FestivalBidHistory`, `FestivalTeamsDirectory`

Nested `Suspense` fallbacks exist in some places, but they are not error boundaries. A failed nested chunk still throws to the nearest error boundary, which does not exist.

## Phase 2: Chunk Failure Audit

### Missing recovery

There is no implementation for:

- Chunk load error classification.
- Stale deployment detection.
- Automatic hard refresh after a new deployment.
- User-visible retry for failed dynamic imports.
- Vite preload error handling.

### Failure behavior by response type

| Failure | Current Behavior |
| --- | --- |
| `404` chunk | Dynamic import rejects. No boundary catches it. UI can white-screen. |
| `500` chunk | Dynamic import rejects. No recovery path. |
| `text/html` chunk | Browser rejects module MIME type. No recovery path. This matches the reported production error. |
| Network timeout/offline | Dynamic import rejects or hangs until browser timeout. User sees blank or stale screen. |

### Vercel asset invalidation risk

`vercel.json` currently rewrites all paths:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

This is correct for SPA route fallback, but unsafe for missing static assets because `assets/*.js` can receive `index.html`. That produces the exact MIME mismatch seen in production.

## Phase 3: Error Boundary Audit

No `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError`, `ChunkLoadError`, or dynamic import recovery implementation was found in `src`.

Major page groups currently lack page-level error boundaries:

- Dashboard
- Festivals
- Auctions
- Sport Tournaments
- Results
- Command Centers
- Live Auctions
- Authentication pages
- Settings/profile pages

Existing `ProductStateCard` and `LoadingStateCard` provide good fallback UI building blocks, but they are only used for explicit state rendering, not uncaught render/import errors.

## Phase 4: API Failure Audit

### API client

`src/utils/api.js` creates an Axios client with:

```js
baseURL: `${import.meta.env.VITE_API_URL}/api`
```

Risks:

- If `VITE_API_URL` is missing, requests target `undefined/api`.
- No timeout is configured.
- No response shape normalization exists.
- No global handling for expired sessions, 5xx retries, network offline state, or malformed response payloads.

### High-risk response shape assumptions

The following pages/components dereference `response.data.data` and then immediately use fields from it:

- `src/pages/SportTournamentWorkspace.jsx`: `nextTournament.name`, `nextTournament.teams`, settings initialization.
- `src/pages/SportTournamentDirectory.jsx`: `response.data.data.id` after create.
- `src/pages/SportAuctionArena.jsx`: `currentResponse.data.data`, `historyResponse.data.data`.
- `src/components/MainFestivalAuction.jsx`: `currentResponse.data.data`, server time, viewer state.
- `src/components/FestivalControlCenter.jsx`: `nextReadiness.counts?.auctionStatus` without guarding `nextReadiness`.
- `src/pages/FestivalDetail.jsx`: several setup and refresh flows still assume fulfilled responses contain valid data.

Many list loads use `response.data.data || []`, which helps for null arrays, but does not validate that the payload is actually an array. A truthy object can still reach `.map` later and crash.

### Promise failure cascades

High-risk `Promise.all` usage:

- `src/pages/SportTournamentDirectory.jsx`: tournament list and owner contexts fail as a unit.
- `src/components/FestivalControlCenter.jsx`: readiness failure makes auction status unavailable even when auction/current succeeds.
- `src/components/FestivalAuctionSetup.jsx`, `FestivalTeamBuilder.jsx`, `FestivalTeamsDirectory.jsx`, `MainFestivalAuction.jsx`, and `SportAuctionArena.jsx` use paired requests where one endpoint failure can downgrade the whole screen.

Some newer pages use `Promise.allSettled`, which is safer:

- `AuctionDirectory`
- `FestivalAuctionHub`
- `SportAuctionHub`
- `SportAuctionResultsPage`
- `SportTournamentCommandCenter`
- parts of `SportTournamentWorkspace`

## Phase 5: Deployment Safety Audit

### Vite config

`vite.config.js` only enables React:

```js
export default defineConfig({
  plugins: [react()],
})
```

Missing:

- Build metadata/version injection.
- Stable manual chunk strategy for high-risk operational pages.
- Runtime stale-version check.
- `vite:preloadError` listener guidance.
- Asset cache policy coordination.

### Vercel config

Current rewrite sends every path to `/`. Missing:

- Explicit asset handling for `/assets/*`.
- Headers ensuring `index.html` is revalidated.
- Immutable caching for hashed assets.
- A clear failure mode for missing assets.

Recommended target behavior:

- `index.html`: `no-cache` or `max-age=0, must-revalidate`.
- Hashed `/assets/*`: immutable long cache.
- Missing `/assets/*.js`: real `404`, not HTML fallback.

## Phase 6: Live Auction Safety Audit

### Current strengths

Festival and Sport live auction pages already include some resilience:

- Socket disconnect state is tracked.
- Manual refresh exists.
- Bid/action failures reload latest state.
- Socket event handlers are cleaned up on unmount.
- State revision checks reduce stale socket event application.

### Remaining risks

Festival live auction:

- `FestivalLiveAuctionPage` lazy-loads `MainFestivalAuction`. If that nested chunk fails, the live auction cannot render.
- No error boundary protects the live auction from malformed socket payload reducer errors.
- Socket join failure sets an error but does not provide a full recovery workflow.

Sport live auction:

- `SportAuctionArena` is a route chunk. If stale, it cannot render.
- Uses `Promise.all` for current/history; either endpoint failure blocks initial sync.
- Socket payload handlers call reducer utilities without local try/catch. A malformed event can throw during state update.

Shared socket layer:

- `src/webSocket/socket.js` uses a singleton socket with `autoConnect: false`.
- No centralized `connect_error`, reconnect attempt telemetry, auth-expired handling, or offline/online recovery policy.

## Severity Findings

### Critical: Missing route-level error boundaries for dynamic import failure

Impact: Any stale or missing route chunk can white-screen the app.

Affected: All lazy routes in `src/App.jsx`.

### Critical: Vercel SPA rewrite can serve HTML for missing JS chunks

Impact: Browser rejects chunk with MIME error. This matches the reported production failure.

Affected: All hashed dynamic chunks under `/assets`.

### High: Top-level `Suspense fallback={null}`

Impact: Route transitions show blank UI even for normal loading and provide no confidence during slow networks.

Affected: Whole application.

### High: No stale-deployment recovery

Impact: Users with old HTML/client state cannot self-recover after deploy.

Affected: All code-split routes.

### High: API response shape assumptions can crash pages

Impact: Malformed 200 responses or partial backend failures can crash pages even when HTTP succeeded.

Affected: Sport Tournament Workspace, live auctions, Festival management, setup components.

### Medium: Promise.all cascades over independent data

Impact: One non-critical endpoint can block a mostly usable page.

Affected: Sport Tournament Directory, Festival Control Center, setup/building components, live auction current/history loads.

### Medium: Live socket event handlers are not locally fault-isolated

Impact: One malformed live event can break live auction rendering.

Affected: Festival and Sport live auction screens, auction hubs/history listeners.

### Low: Client cache has no deployment-version dimension

Impact: Data cached across a deploy can be applied to updated components with different expectations for up to 45 seconds.

Affected: Sport Tournament Workspace, Command Center, dashboard hooks.
