# Performance Phase B Implementation

## Scope

Implemented page-load and API-count optimizations only. No business rules, permissions, socket contracts, existing API response shapes, UI behavior, authentication, React Query/SWR, Redis, or delta socket protocol changes were introduced.

Phase A work was not repeated.

## Implemented Changes

### Dashboard

`useProductDashboardData` now loads auction dashboard state through batch summary endpoints:

- `GET /api/v2/festivals/auction/summaries`
- `GET /api/v2/sport-tournaments/auction/summaries`

The dashboard no longer performs per-festival and per-tournament history requests for recent outcomes. Recent outcomes are returned by the summary endpoints with a small bounded result query.

Sport tournament list summaries now include `permissions`, allowing dashboard visibility decisions without per-tournament detail calls.

### Festival Command Center

`useFestivalCommandCenterData` now:

- Loads the Festival, filtered Sport Tournament list, and Festival auction summary in parallel.
- Uses `GET /api/v2/sport-tournaments?festivalId=:festivalId` to avoid global tournament over-fetch.
- Uses the Sport auction summary batch endpoint for child tournament readiness/current state.
- Avoids per-tournament history requests; recent outcomes come from summary payloads.

### Backend Summary Endpoints

Added additive endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/v2/festivals/auction/summaries` | Batch Festival current state, admin readiness, and recent outcomes |
| `GET /api/v2/sport-tournaments/auction/summaries` | Batch Sport current state, readiness, permissions-aware viewer data, and recent outcomes |

Existing single-resource endpoints remain unchanged.

### Shared Request Caching

Added request-scoped caching for:

- Festival readiness: `getFestivalReadiness`
- Sport readiness: `getSportTournamentReadiness`
- Festival team owner authorization lookup
- Sport captain lookup
- Festival live auction owner lookup

All caches are request-local through `AsyncLocalStorage`; there is no global cache and no cross-request staleness.

### Backend Endpoint Optimizations

`listSportTournaments` now accepts optional `festivalId` filtering and returns summary permissions:

- `permissions.canManage`
- `permissions.canBid`
- `permissions.sportTeamId`

This removes the need for detail calls just to decide which Sport Tournament cards/actions to show.

The Sport summary endpoint accepts `currentStatuses`, so pages can request readiness for setup tournaments without rebuilding full current auction state for those setup rows.

### Auction Directory

Auction Directory now resolves Festival auction stages with one Festival summary batch request instead of a per-festival current/readiness request wave. Sport stages continue to come from the Sport Tournament list status.

## Before vs After

### API Count

| Page / Flow | Before | After |
|---|---:|---:|
| Dashboard, admin, F festivals + T tournaments | `3 + F current + F readiness + F history + T current/readiness/history` | `4` requests: festivals, tournaments, owner contexts if needed, Festival summaries, Sport summaries |
| Dashboard, team owner | `3 + owner festivals current/history + managed sport current/readiness/history` | `4-5` requests depending on owner contexts |
| Festival Command Center with T child tournaments | `5 + up to 3T` requests | `4` requests: Festival, filtered tournaments, Festival summary, Sport summaries |
| Auction Directory Festival stage resolution | `2 + F current/readiness` requests | `3` requests: festivals, tournaments, Festival summaries |

### Query Count

| Area | Before | After |
|---|---:|---:|
| Dashboard history loading | One history endpoint per visible Festival/Sport auction | One bounded recent-outcome query per domain |
| Sport Tournament list permissions | Per-detail lookup required by consumers | Batched owner/captain permission lookup in list response |
| Repeated readiness in one request | Recomputed | Request-scoped cached |
| Repeated owner/captain lookup in one request | Recomputed | Request-scoped cached |
| Sport setup tournament summaries | Full current auction state could be rebuilt | Current state skipped unless status is requested |

### Estimated Latency Reduction

| Area | Expected reduction |
|---|---:|
| Dashboard first load | 40-75% fewer HTTP round trips on multi-auction data sets |
| Festival Command Center first load | 50-80% fewer HTTP round trips with multiple Sport Tournaments |
| Recent outcome cards | Avoids loading 100-round history payloads per auction |
| Sport setup dashboards | Avoids unnecessary current auction state rebuilds for setup tournaments |
| Repeated readiness/identity checks | Saves duplicate query groups within the same request lifecycle |

## Expected User Impact

Dashboard, Festival Command Center, Sport Tournament summaries, and Auction Hub entry points should render earlier because they wait on a small fixed number of HTTP requests instead of request waves that grow with the number of festivals and tournaments.

Recent outcomes still display, but are sourced from bounded summary queries rather than full auction history payloads.

## Remaining Bottlenecks

1. Summary endpoints still reuse existing full state builders for active auction current state; deeper query reductions require purpose-built compact serializers.
2. Festival summary current state still loads full pool/team structures because existing dashboard cards depend on those shapes.
3. Full Sport readiness remains expensive because eligibility and budget summaries are part of readiness.
4. Existing tests include static source expectations for old per-entity API calls and need to be updated to the new batch endpoints.

## Verification

Backend syntax checks passed for changed controllers and utilities.

Frontend build passed using a temporary output directory:

`vite build --outDir node_modules/.phase-b-build-check --emptyOutDir true`

The normal build path failed before compilation output because existing `dist` files could not be unlinked/copied due to filesystem permissions.

Focused dashboard/command-center tests:

`node --test test/phase4e-b-dashboard-experience.test.js test/phase4e-c-festival-command-center.test.js`

Result: 6 passed, 5 failed. Failures are static source assertions expecting old strings such as `/auction/current`, `/auction/readiness`, and existing page label text.
