# Frontend Performance Audit

**Scope:** Dashboard, FestivalCommandCenter, FestivalDetail, FestivalAuctionHub,
SportTournamentCommandCenter, SportTournamentWorkspace, SportAuctionHub, AuctionDirectory

**Date:** June 2026  
**Method:** Static code analysis — no profiler runs. All findings are structural.

---

## Summary Table

| ID    | Severity | Page / Hook                    | Issue                                                       |
|-------|----------|--------------------------------|-------------------------------------------------------------|
| C-01  | Critical | Dashboard                      | N+1 waterfall: tournament list → details → per-tournament state |
| C-02  | Critical | FestivalCommandCenter          | N+1 waterfall + fetches ALL tournaments globally             |
| C-03  | Critical | SportTournamentWorkspace       | Full 6-endpoint reload on every mutation                     |
| H-01  | High     | Dashboard                      | 3-phase sequential waterfall before first render             |
| H-02  | High     | FestivalCommandCenter          | `/v2/sport-tournaments` fetched globally, filtered client-side |
| H-03  | High     | SportAuctionHub                | `loadHub` in socket `useEffect` deps causes spurious socket rejoin |
| H-04  | High     | FestivalAuctionHub             | `filteredRounds`, `saleValues`, `activityEntries`, `totalSpent` not memoized |
| H-05  | High     | SportAuctionHub                | `activityEntries` and "My Bid Activity" reducer not memoized |
| H-06  | High     | AuctionDirectory               | N+1 for festival auction stage data after initial list load  |
| M-01  | Medium   | SportTournamentWorkspace       | All 6 endpoints loaded on mount regardless of active tab     |
| M-02  | Medium   | SportTournamentCommandCenter   | `readiness` and `auction/current` fetched unconditionally for all roles |
| M-03  | Medium   | FestivalAuctionHub             | `activityEntries` not memoized despite socket-driven re-renders |
| M-04  | Medium   | All pages                      | No client-side cache — every navigation re-fetches everything |
| M-05  | Medium   | SportAuctionHub                | `viewerTeam` computed inline on every render                 |
| M-06  | Medium   | FestivalDetail                 | Lazy tab components each make independent API calls per tab switch |
| M-07  | Medium   | Dashboard / FestivalCC         | `useProductDashboardData` and `useFestivalCommandCenterData` share no state |
| L-01  | Low      | SportTournamentCommandCenter   | Partial loading state not surfaced (all-or-nothing display)  |
| L-02  | Low      | FestivalAuctionHub             | Redundant `festivalId` in `useEffect` deps alongside `load`  |
| L-03  | Low      | SportAuctionHub                | `localeCompare` team sort in `useMemo` on every teams change |
| L-04  | Low      | Both Hubs / Statistics         | `formatAuctionValue` (Intl.NumberFormat) called repeatedly without memoization |
| L-05  | Low      | Dashboard                      | `hasCaptainAssignments` computed inline on every render      |

---

## Critical Findings

---

### C-01 — Dashboard: N+1 waterfall for tournament details and states

**File:** `src/components/ProductDashboard/useProductDashboardData.js`

**Phases executed sequentially:**

```
Phase 1 (parallel):
  GET /v2/festivals
  GET /v2/sport-tournaments
  GET /v2/sport-tournaments/owner-contexts   (team_owner only)

Phase 2 (sequential after Phase 1 — N+1):
  For each tournament:
    GET /v2/sport-tournaments/:id            ← one request per tournament

Phase 3 (sequential after Phase 2 — N+1 per entity):
  For each visible festival (parallel within festival):
    GET /v2/festivals/:id/auction/current
    GET /v2/festivals/:id/auction/readiness  (admin only)
    GET /v2/festivals/:id/auction/history

  For each tournament detail (parallel within tournament):
    GET /v2/sport-tournaments/:id/auction/current    (conditional)
    GET /v2/sport-tournaments/:id/readiness          (admin/manager)
    GET /v2/sport-tournaments/:id/auction/history    (conditional)
```

**Request count example (admin, 3 festivals, 6 tournaments):**

| Phase | Requests |
|-------|----------|
| Phase 1 | 2 |
| Phase 2 | 6 (one per tournament) |
| Phase 3 festivals | 9 (3 × 3) |
| Phase 3 tournaments | 18 (6 × 3) |
| **Total** | **35** |

With 10 festivals and 20 tournaments the count reaches **62 requests** before first render.

**Root cause:** The API exposes a tournament list endpoint (`GET /v2/sport-tournaments`) that returns
summaries without auction state. A detail endpoint (`GET /v2/sport-tournaments/:id`) is then called
for each item. There is no batch or include-state parameter.

**Impact:** Dashboard is the primary landing page. Every login, every tab refocus, and every
navigation back to Dashboard initiates this full waterfall. At even moderate scale (5+ festivals,
10+ tournaments) this introduces 500–1500ms of sequential network latency before data is available.

---

### C-02 — FestivalCommandCenter: N+1 waterfall and global tournament fetch

**File:** `src/hooks/useFestivalCommandCenterData.js`

**Phase structure:**

```
Phase 1 (parallel):
  GET /v2/festivals/:id
  GET /v2/festivals/:id/auction/readiness
  GET /v2/festivals/:id/auction/current
  GET /v2/festivals/:id/auction/history
  GET /v2/sport-tournaments              ← ALL tournaments, no filter

Phase 2 (N+1 — sequential after Phase 1):
  For each tournament WHERE tournament.festivalId === festivalId:
    GET /v2/sport-tournaments/:id

Phase 3 (N+1 per tournament — sequential after Phase 2):
  For each tournament (parallel within tournament):
    GET /v2/sport-tournaments/:id/readiness       (if canManage)
    GET /v2/sport-tournaments/:id/auction/current (if active status)
    GET /v2/sport-tournaments/:id/auction/history (if active status)
```

**Two compounding problems:**

1. **Global tournament fetch:** `GET /v2/sport-tournaments` returns every tournament visible to the
   user — across all festivals. The response is then filtered client-side by `festivalId`. An admin
   with 5 festivals each containing 8 tournaments receives 40 tournament records to discard 32 of them.

2. **N+1 for tournament details:** Even after fetching summaries, each tournament triggers a separate
   detail request in Phase 2, then 1–3 more in Phase 3.

**Request count (festival with 4 sport tournaments, all active):**

| Phase | Requests |
|-------|----------|
| Phase 1 | 5 |
| Phase 2 | 4 (one per tournament) |
| Phase 3 | 12 (4 × 3) |
| **Total** | **21** |

---

### C-03 — SportTournamentWorkspace: Full 6-endpoint reload on every mutation

**File:** `src/pages/SportTournamentWorkspace.jsx`

```js
const mutate = async (action, successMessage) => {
  // ...
  await action();
  await loadWorkspace();   // ← re-fetches ALL 6 endpoints
  // ...
};
```

`loadWorkspace` always fetches all six endpoints simultaneously:

```
GET /v2/sport-tournaments/:id
GET /v2/sport-tournaments/:id/eligibility
GET /v2/sport-tournaments/:id/readiness
GET /v2/sport-tournaments/:id/budgets
GET /v2/sport-tournaments/:id/pool
GET /v2/sport-tournaments/:id/auction/current
```

Every user action triggers all 6 regardless of which data changed:

- Rename a team → pool, eligibility, readiness, budgets, auction all reload
- Assign a captain → budgets, pool, readiness, auction all reload
- Generate auction pool → eligibility, budgets, team list all reload
- Save budget → team list, pool, eligibility, readiness all reload

For a tournament in heavy setup, a manager performing 10 sequential configuration actions
generates **60 API requests** — many of which return identical responses to the previous call.

---

## High Priority Findings

---

### H-01 — Dashboard: Three-phase sequential waterfall before first render

**File:** `src/components/ProductDashboard/useProductDashboardData.js`

Even after removing the N+1 issues (C-01), the three-phase structure is inherently sequential.
Phase 2 cannot begin until all of Phase 1 resolves. Phase 3 cannot begin until all of Phase 2
resolves. The wall-clock time to first data is:

```
T(dashboard_load) = T(phase1) + T(phase2) + T(phase3)
```

Where each phase contains network round-trips that block the next. Even with fast responses (50ms
per request), the three-phase structure adds a minimum of 100–150ms of avoidable latency on top of
the individual request times.

---

### H-02 — FestivalCommandCenter: Global tournament list, client-side festival filter

**File:** `src/hooks/useFestivalCommandCenterData.js`, line 38

```js
api.get("/v2/sport-tournaments"),  // ← no ?festivalId= filter
```

The response is then filtered at line 48:
```js
const tournamentSummaries = fulfilledData(baseResults[4], []).filter(
  (tournament) => tournament.festivalId === festivalId
);
```

**Problem:** The server is performing no filtering. The full tournament list visible to this user
is transferred over the network and immediately discarded on the client. With many festivals and
tournaments, this payload grows proportionally to the entire dataset — not to the single festival
being viewed.

**Fix vector:** Add `?festivalId=:id` as a query parameter to the sport-tournaments endpoint, or
expose a `GET /v2/festivals/:id/sport-tournaments` sub-resource endpoint.

---

### H-03 — SportAuctionHub: `loadHub` in socket `useEffect` deps causes spurious socket operations

**File:** `src/pages/SportAuctionHub.jsx`, lines 102–116

```js
useEffect(() => {
  const refresh = (payload) => { /* ... */ };

  socket.emit("join-sport-auction", { sportTournamentId: Number(id) });
  socket.on("auction-state", refresh);

  return () => {
    socket.emit("leave-sport-auction", { sportTournamentId: Number(id) });
    socket.off("auction-state", refresh);
  };
}, [id, loadHub]);   // ← loadHub is in deps but never called here
```

`loadHub` is included in the dependency array but is **never called** inside this effect — it was
presumably included to satisfy linting rules but is functionally wrong here. Since `loadHub` is a
`useCallback` with `[id]` as its dependency, it re-creates whenever `id` changes. However:

1. If `id` changes, `loadHub` also changes — the effect runs twice (once for `id`, once for
   `loadHub`) emitting `leave-sport-auction` and `join-sport-auction` in immediate succession.

2. Any future change that invalidates `loadHub` without changing `id` (e.g., a component refactor
   that adds a dep) would cause the socket to leave and rejoin the room unnecessarily, disrupting
   live state delivery.

**Fix:** Remove `loadHub` from this effect's dependency array. The effect only uses `id`.

---

### H-04 — FestivalAuctionHub: Multiple derived values not memoized

**File:** `src/pages/FestivalAuctionHub.jsx`

The following computations run on **every render** with no memoization:

```js
// Runs on every render — filters full history array
const filteredRounds = history.filter((round) => {
  const matchesTeam = ...;
  const matchesParticipant = ...;
  return matchesTeam && matchesParticipant;
});

// Runs on every render — maps results array
const saleValues = sold.map(({ result }) => Number(result.finalAmount || 0));

// Runs on every render — reduces mapped array
const totalSpent = saleValues.reduce((sum, value) => sum + value, 0);

// Runs on every render — calls buildAuctionActivity which processes full history
const activityEntries = buildAuctionActivity({
  history,
  status: state?.config?.auctionStatus,
  ...
});
```

During a live festival auction, the socket pushes `auction-state` events frequently. Each event
triggers `mergeAuctionSnapshotState` → `setState` → re-render. With a 200-round auction history
these O(n) operations run on every bid event, round transition, and status update.

`filteredRounds` is the most impactful: it must re-run on every render even when `history`,
`teamFilter`, and `participantFilter` have not changed.

---

### H-05 — SportAuctionHub: `activityEntries` and bid activity reducer not memoized

**File:** `src/pages/SportAuctionHub.jsx`

```js
// Runs on every render — processes full history
const activityEntries = buildAuctionActivity({
  history,
  status: auction?.tournament?.status || tournament?.status,
  label: "Sport Auction",
  formatValue: formatAuctionValue,
});

// Inside the viewer team card JSX — runs on every render
value={history.reduce(
  (count, round) => count + (round?.bids || []).filter(
    (bid) => Number(bid?.sportTeamId) === getTeamId(viewerTeam),
  ).length,
  0,
)}
```

The bid activity reducer is particularly expensive: for each history entry it filters the entire
bids sub-array. During an active auction this runs on every socket event.

---

### H-06 — AuctionDirectory: N+1 for festival auction stage data

**File:** `src/pages/AuctionDirectory.jsx`, lines 128–159

```js
if (nextFestivals.length) {
  const stageResults = await Promise.allSettled(
    nextFestivals.map(async (festival) => {
      const [currentResult, readinessResult] = await Promise.allSettled([
        api.get(`/v2/festivals/${festival.id}/auction/current`),
        api.get(`/v2/festivals/${festival.id}/auction/readiness`),  // admin only
      ]);
      // ...
    }),
  );
}
```

This is executed **after** the festival list resolves, creating a sequential waterfall.

**Request count (admin, 5 festivals, 8 tournaments):**

| Call | Requests |
|------|----------|
| `GET /v2/festivals` | 1 |
| `GET /v2/sport-tournaments` | 1 |
| `GET /v2/festivals/:id/auction/current` × 5 | 5 |
| `GET /v2/festivals/:id/auction/readiness` × 5 (admin) | 5 |
| **Total** | **12** |

The festival current/readiness requests run in a second wave. Users on the Auction Directory page
see a loading state until all festival stage data resolves, even though the tournament cards could
render immediately from the first response.

---

## Medium Priority Findings

---

### M-01 — SportTournamentWorkspace: All 6 endpoints loaded on mount regardless of active tab

**File:** `src/pages/SportTournamentWorkspace.jsx`, lines 81–99

```js
const loadWorkspace = useCallback(async () => {
  const [...] = await Promise.all([
    api.get(`.../`),              // tournament
    api.get(`.../eligibility`),   // ← only needed on Eligibility tab
    api.get(`.../readiness`),     // ← only needed on Readiness tab
    api.get(`.../budgets`),       // ← only needed on Budgets tab
    api.get(`.../pool`),          // ← only needed on Pool tab
    api.get(`.../auction/current`), // ← only needed on Readiness tab
  ]);
});
```

The page has 8 sections: Overview, Teams, Captains, Eligibility, Budgets, Pool, Readiness, Settings.
All six endpoints are fetched immediately on mount, including data that is only relevant to tabs the
user may never visit during this session.

A manager visiting the page to quickly check readiness fetches eligibility lists, budget tables, and
pool configuration they did not request.

---

### M-02 — SportTournamentCommandCenter: Unconditional readiness and auction fetches

**File:** `src/pages/SportTournamentCommandCenter.jsx`, lines 34–38

```js
const [tournamentResult, readinessResult, auctionResult] = await Promise.allSettled([
  api.get(`/v2/sport-tournaments/${sportTournamentId}`),
  api.get(`/v2/sport-tournaments/${sportTournamentId}/readiness`),
  api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/current`),
]);
```

**Readiness:** Fetched for all roles including spectators. Non-managers have no use for readiness
data and the server likely returns empty or 403. The three calls always run in parallel regardless
of the user's role or the tournament's stage.

**Auction/current:** Fetched even during `draft` and `setup` stages when no auction exists. The
server returns null/empty, wasting the request.

Better pattern: fetch tournament first, check permissions and status, then fetch readiness/auction
conditionally. The current parallel approach trades latency savings for unconditional request cost.

---

### M-03 — FestivalAuctionHub: `activityEntries` not memoized despite socket-driven re-renders

**File:** `src/pages/FestivalAuctionHub.jsx`

The Festival Auction Hub joins the `festival-auction` socket room and receives `auction-state`
snapshots. Each snapshot calls `mergeAuctionSnapshotState` → `setState` → re-render. With the
socket active, renders happen frequently (every bid, every timer tick that merges state).

`activityEntries` calls `buildAuctionActivity(history, ...)` inline on every render, rebuilding
the full activity log from the complete history on every socket-driven update.

This is distinct from H-04's broader unmemoized-values issue because the Hub page specifically
connects to the live socket, making the re-render frequency much higher than pages without sockets.

---

### M-04 — All pages: No client-side caching

No page implements any form of client-side result caching (React Query, SWR, or equivalent).

**Consequence:** Every navigation to a previously-visited page triggers a full data reload:

- Navigate to Dashboard → 35 requests
- Navigate to FestivalCommandCenter → 21 requests
- Navigate back to Dashboard → 35 requests again

The same festival data, tournament list, and auction states are re-fetched on every visit. For an
admin working across multiple festival management workflows this generates hundreds of redundant
requests per session.

**Specific cases where caching would eliminate most requests:**
- Dashboard → FestivalCommandCenter: both fetch festival data, tournament list, and auction states
- FestivalCommandCenter → FestivalAuctionHub: both fetch `festivals/:id/auction/current` and `/history`
- SportTournamentCommandCenter → SportAuctionHub: both fetch `sport-tournaments/:id` and `auction/current`

---

### M-05 — SportAuctionHub: `viewerTeam` computed inline on every render

**File:** `src/pages/SportAuctionHub.jsx`

```js
const viewerTeam = teams.find(
  (team) => getTeamId(team) === Number(auction?.viewer?.sportTeamId),
);
```

`teams` is correctly memoized. However `viewerTeam` is derived from `teams` plus
`auction?.viewer?.sportTeamId` — both stable references — but is recomputed on every render
because it is not wrapped in `useMemo`.

During a live auction with frequent socket updates this derivation runs on every state merge.

---

### M-06 — FestivalDetail: Lazy tab components each make independent API calls per switch

**File:** `src/pages/FestivalDetail.jsx`

```js
const FestivalTeamBuilder = lazy(() => import("../components/FestivalTeamBuilder"));
const FestivalAuctionSetup = lazy(() => import("../components/FestivalAuctionSetup"));
const FestivalReadiness = lazy(() => import("../components/FestivalReadiness"));
const FestivalOverview = lazy(() => import("../components/FestivalOverview"));
const FestivalHistory = lazy(() => import("../components/FestivalHistory"));
const FestivalBidHistory = lazy(() => import("../components/FestivalBidHistory"));
const FestivalTeamsDirectory = lazy(() => import("../components/FestivalTeamsDirectory"));
```

Each lazy-loaded component contains its own data fetching. Switching between tabs unmounts the
previous component and mounts the new one, triggering a fresh fetch each time. A user who switches
between the Participants tab and the Teams Directory tab and back fetches the same teams data three
times with no intermediate caching.

Additionally, the parent `FestivalDetail` itself loads festival metadata, participants, sports, and
sports catalog on mount — some of which overlaps with what the lazy child components fetch.

---

### M-07 — Dashboard and FestivalCommandCenter share no state despite overlapping data

**Files:** `useProductDashboardData.js`, `useFestivalCommandCenterData.js`

Both hooks independently fetch:
- `GET /v2/festivals`
- `GET /v2/sport-tournaments`
- `GET /v2/festivals/:id/auction/current`
- `GET /v2/festivals/:id/auction/readiness`

When an admin navigates from Dashboard to FestivalCommandCenter, all of this data is re-fetched
from scratch with zero reuse of what was already loaded. There is no shared context, cache, or
data-passing mechanism between these two frequently co-visited pages.

---

## Low Priority Findings

---

### L-01 — SportTournamentCommandCenter: Raw `<CircularProgress>` hides partial load state

**File:** `src/pages/SportTournamentCommandCenter.jsx`

```js
if (loading) {
  return (
    <Box sx={{ display: "grid", minHeight: 320, placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}
```

All three parallel requests (tournament, readiness, auction) must resolve before anything renders.
The tournament response is usually the fastest (and most important). Showing a full-page spinner
blocks the user from seeing the tournament name and primary action button while readiness and
auction data are still loading.

---

### L-02 — FestivalAuctionHub: Redundant `festivalId` in `useEffect` deps alongside `load`

**File:** `src/pages/FestivalAuctionHub.jsx`, line 120

```js
useEffect(() => {
  // ...
  void load();
  // ...
}, [festivalId, load]);
```

`load` is a `useCallback` with `[festivalId]` as its dependency. When `festivalId` changes, both
`load` and the effect re-run — but `festivalId` in the deps list is redundant since `load` already
captures the new `festivalId`. No functional impact but creates confusion about the effect's intent.

---

### L-03 — SportAuctionHub: `localeCompare` team sort inside `useMemo`

**File:** `src/pages/SportAuctionHub.jsx`

```js
const teams = useMemo(() => {
  const source = auction?.teams || tournament?.teams || [];
  const viewerTeamId = Number(auction?.viewer?.sportTeamId);
  return [...source].sort((left, right) => {
    if (getTeamId(left) === viewerTeamId) return -1;
    if (getTeamId(right) === viewerTeamId) return 1;
    return String(left?.teamName || left?.name || "").localeCompare(
      String(right?.teamName || right?.name || ""),
    );
  });
}, [auction?.teams, auction?.viewer?.sportTeamId, tournament?.teams]);
```

Correctly memoized. `localeCompare` is locale-sensitive and moderately expensive. At small team
counts (8–12 teams) this is negligible. If team counts grow this sort could be pre-computed once
and cached rather than re-sorted on each `auction.teams` update during a live auction.

---

### L-04 — Statistics sections: `formatAuctionValue` called per-team without memoization

**Files:** `FestivalAuctionHub.jsx` Statistics section, `SportAuctionHub.jsx` Statistics section

`formatAuctionValue` wraps `Intl.NumberFormat` and is called for each team entry during the
Statistics tab render. These values only change when the underlying data changes. The computations
could be memoized alongside their source values.

**Impact is low** because the Statistics tab is not rendered during live bidding (users are on
Overview or Teams), and `Intl.NumberFormat.format()` is fast in modern engines.

---

### L-05 — Dashboard: `hasCaptainAssignments` computed inline every render

**File:** `src/pages/Dashboard.jsx`

```js
const hasCaptainAssignments = data.sportStates.some(
  ({ tournament }) => tournament.permissions?.canBid
);
```

`data.sportStates` is included in `useProductDashboardData`'s `useMemo` output and changes only
when data reloads. This `.some()` runs on every Dashboard render. Wrapping it in `useMemo([data.sportStates])`
or moving it inside the data hook would prevent re-computation on unrelated re-renders.

**Impact is very low** because Dashboard re-renders infrequently and `sportStates` is typically
a small array.

---

## Request Count Reference

| Page              | Min requests | Typical (5 festivals, 8 tournaments) | Worst case (admin, 10+/20+) |
|-------------------|-------------|--------------------------------------|-----------------------------|
| Dashboard         | 4           | 35                                   | 60+                         |
| FestivalCC        | 5           | 21                                   | 37+                         |
| FestivalDetail    | 5+          | 7–12 (lazy tab loads)                | 12+                         |
| FestivalAuctionHub| 3           | 3                                    | 3                           |
| SportCC           | 3           | 3                                    | 3                           |
| SportWorkspace    | 6           | 6                                    | 6                           |
| SportAuctionHub   | 3           | 3                                    | 3                           |
| AuctionDirectory  | 2           | 12                                   | 22+ (admin)                 |

---

## Recommended Fix Priority

### Phase A — Highest ROI, lowest risk (address C-01, C-02, C-03)

1. **C-03 (SportTournamentWorkspace):** Replace `loadWorkspace()` in `mutate()` with targeted
   single-endpoint refreshes. Only re-fetch the endpoint that the completed action modified.
   Estimated reduction: from 6 requests per mutation to 1–2.

2. **C-02 / H-02 (FestivalCommandCenter):** Add `festivalId` filter to the sport-tournaments API
   call, or expose `GET /v2/festivals/:id/sport-tournaments`. Eliminates wasted data transfer.
   Estimated reduction: eliminates Phase 2 N+1 or reduces payload to per-festival scope.

3. **C-01 / H-01 (Dashboard):** Consider a `/v2/dashboard` aggregate endpoint or batch endpoint
   for tournament details. Alternatively, include auction state in the tournament list response via
   an `?includeAuction=true` query parameter to collapse Phase 2 and Phase 3 into Phase 1.

### Phase B — Medium effort, meaningful gains (address H-03 through H-06, M-01)

4. **H-03 (SportAuctionHub socket effect):** Remove `loadHub` from the socket `useEffect` deps.
5. **H-04 / H-05 (missing memoization):** Wrap `filteredRounds`, `activityEntries`, `saleValues`,
   `totalSpent`, and the bid-activity reducer in `useMemo`.
6. **H-06 (AuctionDirectory):** Move festival stage fetches into the initial `Promise.allSettled`
   alongside the festival list, or defer them to a non-blocking second render.
7. **M-01 (SportTournamentWorkspace tab-based loading):** Load tournament metadata eagerly,
   defer eligibility/pool/budgets to tab activation.

### Phase C — Infrastructure (address M-04, long-term)

8. **M-04 (caching):** Introduce React Query or SWR for the data hooks that are shared across pages
   (`useProductDashboardData`, `useFestivalCommandCenterData`). Stale-while-revalidate with a 30–60s
   TTL would eliminate most duplicate requests from page navigation.

---

*This audit covers structural API and render patterns only. Actual latency numbers depend on network
conditions, server response times, and data volume. Profile in a staging environment against
representative data to quantify bottlenecks before prioritizing fixes.*
