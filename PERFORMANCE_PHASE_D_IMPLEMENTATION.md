# Performance Phase D Implementation

## Scope

Phase D focused on frontend request reduction, in-memory summary reuse, stale-while-revalidate navigation behavior, and route-level lazy loading.

No business logic, auction rules, permissions, socket protocol, Redis, React Query, SWR, Redux, or live auction state caching were added.

## Implemented Changes

### Lightweight Client Cache

Added `ipl-auction-tracker/src/utils/clientCache.js`.

Capabilities:

- Stable cache keys from strings, arrays, and objects.
- User-scoped cache keys.
- TTL support.
- Manual invalidation.
- Request-scope in-flight dedupe for identical concurrent requests.
- `cachedRequest` for normal cache reads.
- `refreshCachedRequest` for forced refresh after mutations.

Default TTL used for Phase D targets: `45 seconds`, within the requested `30-60 seconds` window.

Live auction state is not cached.

### Stale-While-Revalidate Pages

Applied stale-while-revalidate behavior to:

- Dashboard.
- Auction Directory.
- Festival Command Center.
- Sport Tournament Command Center static setup data.

When cached data exists, these pages render immediately from memory and refresh in the background. The refresh does not block the initial render.

Not applied to:

- Live auction screens.
- Bid screens.
- Timers.
- Socket-driven auction state.

### Route-Level Lazy Loading

Updated `ipl-auction-tracker/src/App.jsx` to lazy-load route pages with `React.lazy` and `Suspense`.

This reduces the initial route bundle pressure by loading page modules when their route is visited instead of importing every page at app startup.

Existing inner lazy loading in larger pages was preserved.

## Frontend Request Audit

### Dashboard

Before:

- Loaded Festival list.
- Loaded Sport Tournament list.
- Loaded owner contexts when needed.
- Loaded Festival auction summaries.
- Loaded Sport auction summaries.
- Repeated the same calls on every navigation back to Dashboard.

After:

- Dashboard aggregate response is cached by user scope.
- Underlying list and summary requests are cached separately.
- Re-navigation within TTL renders immediately.
- Background refresh updates the cache without blocking.

### Festival Command Center

Before:

- Loaded Festival detail.
- Loaded Sport Tournament list.
- Loaded Festival summary.
- Loaded Sport summary.
- Repeated calls after Dashboard or Auction Directory had already fetched similar summaries.

After:

- Command Center aggregate state is cached.
- Festival summary and Sport summary calls reuse shared cache entries.
- Re-navigation renders stale data immediately and refreshes in background.

### Auction Directory

Before:

- Loaded Festival list.
- Loaded Sport Tournament list.
- Loaded Festival auction summaries.
- Repeated summary calls after Dashboard.

After:

- Directory aggregate state is cached.
- Festival and Sport list requests reuse Dashboard-compatible cache entries.
- Festival summary stage data reuses the shared summary cache.

### Festival Detail

Before:

- Parent page loaded readiness.
- `FestivalReadiness` could load readiness again independently.
- Registration/setup data could be reloaded during setup transitions.
- Participant and catalog data were fetched repeatedly on navigation.

After:

- Festival detail, sports, participant, catalog, and readiness requests are cached.
- Parent readiness is passed to `FestivalReadiness` as `initialReadiness`.
- Child readiness avoids a duplicate fetch when parent data is already present.
- Setup mutations force targeted cache refresh instead of relying on repeated passive fetches.

### Festival Setup Wizard

Before:

- Setup flow depended on parent refresh behavior and could trigger duplicate readiness refreshes through the readiness child.

After:

- Benefits from cached parent readiness and targeted invalidation from `FestivalDetail`.
- No wizard business flow changed.

### Sport Tournament Workspace

Before:

- Core load fetched Tournament, readiness, and current auction state.
- Eligibility, budgets, and pool sections fetched again on re-entry or tab revisit.
- Mutations could be followed by broad reloads.

After:

- Tournament, readiness, eligibility, budgets, and pool data are cached with user-scoped keys.
- Current auction state remains uncached.
- Lazy section loading is preserved, but revisits within TTL reuse cached section data.
- Mutations force refresh only for affected cached setup data.

### Sport Tournament Command Center

Before:

- Loaded Tournament, readiness, and current auction state on each navigation.

After:

- Tournament and readiness are cached and rendered immediately on re-navigation.
- Current auction state remains uncached and refreshes separately.

### Festival Auction Hub

Reviewed only.

No cache was added because this surface is live auction oriented and can include current state, bid screens, timers, and history-sensitive views.

### Sport Auction Hub

Reviewed only.

No cache was added because this surface is live auction oriented and can include current state, bid screens, timers, and history-sensitive views.

## Before vs After

| Surface | Before API Count | After Cold API Count | After Re-navigation Blocking Count | Notes |
| --- | ---: | ---: | ---: | --- |
| Dashboard | 4-5 | 4-5 | 0 | Cached aggregate renders immediately; background refresh may issue up to the same cold count. |
| Auction Directory | 3 | 3 | 0 | Summary/list cache shared with Dashboard. |
| Festival Command Center | 4 | 4 | 0 | Festival/Sport summaries are shared by cache key. |
| Sport Tournament Command Center | 3 | 3 | 1 | Static tournament/readiness data cached; live current auction remains uncached. |
| Festival Detail | 2-4 | 2-4 | 0-1 | Duplicate readiness fetch removed; active setup sections reuse cached data. |
| Sport Tournament Workspace | 3 core + 1 per lazy section | Same cold count | 1 core live request | Static setup and section data cached; current auction remains uncached. |

## Page Load Count

Cold page load counts are intentionally mostly unchanged because Phase D did not alter required first-load business data.

The main reduction is for repeat navigation and related pages that need the same summary data:

- Dashboard to Auction Directory no longer requires blocking refetch of shared lists and summaries.
- Dashboard to Festival Command Center can reuse summary data within TTL.
- Back navigation to Dashboard renders from cached aggregate data.
- Command Center re-entry renders from cached aggregate data.
- Workspace tab revisits reuse cached eligibility, budgets, and pool data.

## Response and Payload Impact

Phase D primarily reduces repeated responses, not backend response shape.

Estimated repeated payload avoided within TTL:

- Dashboard re-navigation: one full dashboard aggregate equivalent avoided from blocking render.
- Auction Directory after Dashboard: Festival/Sport list and summary payloads avoided from blocking render.
- Festival Command Center after Dashboard: summary payloads avoided from blocking render.
- Festival Detail readiness: one duplicate readiness response avoided when parent already loaded it.
- Sport workspace tab revisit: one section response avoided per cached lazy section.

Backend response-size optimization was handled in Phase C. Phase D avoids unnecessary frontend re-downloads of those already-reduced payloads.

## Re-navigation Count

Estimated blocking request count after a cached re-navigation:

- Dashboard: `0`.
- Auction Directory: `0`.
- Festival Command Center: `0`.
- Sport Tournament Command Center: `1` live current auction request.
- Festival Detail: `0-1`, depending on active section and mutation invalidation.
- Sport Tournament Workspace: `1` live current auction request plus uncached mutation-specific refreshes.

Background refreshes still occur for summary surfaces so the UI does not stay stale beyond the TTL window.

## Cache Hit Rate Estimate

Expected hit rates during normal navigation:

- Cold first load: `0%`.
- Dashboard back/forward re-navigation within 45 seconds: `70-90%`.
- Dashboard to Auction Directory within 45 seconds: `60-85%`.
- Dashboard to Festival Command Center within 45 seconds: `60-85%`.
- Command Center re-entry within 45 seconds: `70-90%`.
- Sport workspace tab revisit after first section load: `80-95%`.

Actual hit rate depends on user navigation speed, mutation frequency, and whether the user lands directly on a deep page.

## Top 10 Performance Wins

1. Dashboard now renders immediately from cached aggregate data on re-navigation.
2. Auction Directory reuses Dashboard-compatible list and summary data.
3. Festival Command Center reuses shared Festival/Sport summary responses.
4. Sport Tournament Command Center caches static setup data while keeping live auction state uncached.
5. Festival Detail avoids duplicate readiness fetches between parent and `FestivalReadiness`.
6. Sport Tournament Workspace reuses cached eligibility, budgets, and pool section data.
7. Mutation flows force refresh affected cached setup data instead of relying on broad passive reloads.
8. In-flight request dedupe prevents identical concurrent summary/list calls from multiplying.
9. Route-level lazy loading prevents every page module from being imported into the initial app path.
10. Cached pages use stale-while-revalidate so refresh cost moves off the critical render path.

## Top 10 Remaining Bottlenecks

1. The shared app/vendor output remains large. The verified build still reports a main shared chunk around `517 kB` minified.
2. Live auction current state and history remain intentionally uncached.
3. Festival Auction Hub and Sport Auction Hub still prioritize live correctness over cache reuse.
4. `FestivalDetail` remains a large route because it owns setup, readiness, registration, and auction entry surfaces.
5. Auction arena route chunks still carry live auction UI and state-management cost.
6. Cold Dashboard still needs base lists before it can assemble scoped summary data.
7. Festival registration sections still need full participant data when those sections are active.
8. Sport pool setup still depends on pool and eligibility data when the Pool section is opened.
9. Cache invalidation is intentionally in-memory and coarse; it does not persist across reloads or browser tabs.
10. Further bundle reduction would require deeper component-level splitting or manual chunk strategy, which was outside the safe route-level lazy-loading scope.

## Verification

Performed:

- Static syntax check for added/changed `.js` utility and hook files.
- Vite production build with route-level lazy loading enabled.

Build result:

- Passed.
- Output checked with `vite build --outDir node_modules/.phase-d-build-check --emptyOutDir true`.

Not performed:

- Automated tests, per request.
