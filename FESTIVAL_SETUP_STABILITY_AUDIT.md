# FESTIVAL_SETUP_STABILITY_AUDIT.md

**Audit Scope:** Festival Creation → Setup Wizard → Participants → Teams → Owners → Retentions → Auction Preparation → Readiness Validation → Festival Command Center → Auction Details → Launch Auction

**Date:** June 2026  
**Status:** Findings complete — awaiting approval before implementing fixes

---

## Executive Summary

The Festival setup and launch flow contains **three critical stage-calculation bugs** that result in misleading, contradictory, or entirely broken screens across the most important user paths. All three share the same root cause: different pages call `getFestivalAuctionStage()` with different sets of arguments, producing different stage results for the **same Festival at the same moment**.

Additionally, there is an incorrectly labeled action button ("Launch Auction") on the Festival Command Center that sends the admin to a broken screen instead of starting the auction.

Beyond the stage bugs, the setup stability improvements made in the prior session (race condition in `openStep`, `refreshReadiness` null crash, `invalidateFestivalSetup` concurrency guard) resolved the most acute wizard stability issues. Several medium-severity residual issues remain in the broader flow.

**Summary counts:**

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 5 |
| Medium   | 7 |
| Low      | 3 |

---

## 1. Festival Status Consistency

### How status is assembled — per component

Every component that displays a Festival stage computes it independently by calling one of two utility functions:

```js
getFestivalAuctionStage({ auctionStatus, readinessStatus, festivalStatus })
getFestivalAuctionStageFromState({ festival, auction, readiness, auctionStatus })
```

The three input values that drive stage resolution are:

| Value | Source endpoint |
|-------|----------------|
| `auctionStatus` | `GET /auction/current` → `config.auctionStatus` OR `GET /auction/readiness` → `counts.auctionStatus` |
| `readinessStatus` | `GET /auction/readiness` → `overallStatus` |
| `festivalStatus` | `GET /festivals/:id` → `status` |

**The stage function's READY resolution rule:**
```js
if (
  readyStatuses.has(normalizedFestivalStatus) ||       // festivalStatus = "ready"
  (normalizedAuctionStatus === "setup" &&
    normalizedReadinessStatus === "ready") ||           // readiness = READY and auction = setup
  normalizedReadinessStatus === "ready"                 // readiness = READY (any)
) {
  return AUCTION_STAGE.READY;
}
```

A festival is READY if `readinessStatus === "ready"`. But `readinessStatus` is only present when the readiness endpoint is fetched **and** passed to the stage function. Components that omit it can never compute READY.

### Component-by-component stage resolution table

| Component | Fetches readiness? | Passes readinessStatus? | Can compute READY? |
|-----------|-------------------|------------------------|-------------------|
| `FestivalDetail` | ✅ via `refreshReadiness` | ✅ via `getFestivalAuctionStageFromState` | ✅ |
| `FestivalCommandCenter` | ✅ via `useFestivalCommandCenterData` | ✅ via `getFestivalAuctionStageFromState` | ✅ |
| **`FestivalAuctionHub`** | ❌ not fetched | ❌ not passed | **❌ NEVER** |
| **`MainFestivalAuction`** | ❌ not fetched | ❌ not passed | **❌ NEVER** |
| `AuctionDirectory` (admin) | ✅ | ✅ via `getFestivalAuctionStageFromState` | ✅ |
| `AuctionDirectory` (non-admin) | ❌ skipped by role guard | ❌ | **❌ NEVER** |

### The inconsistency scenario

For any Festival where `festival.status = "setup"` and `readiness.overallStatus = "READY"` and `auctionStatus = "setup"` (the standard pre-launch ready state):

| Screen | Computed stage | Displayed state |
|--------|---------------|-----------------|
| FestivalDetail (manage) | **READY** ✅ | "Ready to Launch" chip |
| FestivalCommandCenter | **READY** ✅ | "Launch Auction" button |
| **FestivalAuctionHub** | **SETUP** ❌ | "Auction Setup Incomplete" error |
| **MainFestivalAuction (arena)** | **SETUP** ❌ | "Auction Setup Incomplete" ProductStateCard |
| AuctionDirectory (admin) | **READY** ✅ | "View Auction Details" button |
| AuctionDirectory (non-admin) | **SETUP** ❌ | Festival hidden from directory |

Three surfaces say READY. Two surfaces say SETUP. All for the same festival at the same moment.

---

## Critical Issues

---

### C-01 — FestivalAuctionHub always shows "Auction Setup Incomplete" for READY festivals

**File:** `src/pages/FestivalAuctionHub.jsx`, lines 196–238  
**Severity:** Critical  
**User impact:** Admin completes full setup → navigates to Auction Details → sees error page with "Continue Festival Setup" link. Team owners see "Festival Auction in Setup" with a "Browse Auctions" action. The entire Auction Details surface is inaccessible for READY festivals.

**Root cause — stage calculation:**
```js
// Line 196-199 — current code
const auctionStatus = state?.config?.auctionStatus || "setup";
const festivalStage = getFestivalAuctionStage({
  auctionStatus,
  festivalStatus: festival?.status,
  // readinessStatus: MISSING
});
```

`getFestivalAuctionStage` cannot return READY without `readinessStatus`. For a READY pre-launch festival where `auctionStatus = "setup"` and `festival.status = "setup"`, it returns SETUP unconditionally.

**Compounding problem — `state` may be null:**  
The setup gate then checks:
```js
if (isSetupStage(festivalStage)) {
  if (state?.viewer?.isAdmin) {
    return <ProductStateCard title="Auction Setup Incomplete" ... />
  }
  // Falls through to non-admin message
  return <ProductStateCard title="Festival Auction in Setup" ... />
}
```

If `/auction/current` returns `{data: null}` (no active auction), `state = null`. Then `state?.viewer?.isAdmin = undefined = false`. The admin sees the **non-admin message** ("Festival Auction in Setup") with a "Browse Auctions" button, not the admin message.

**Fix required:** Fetch `GET /auction/readiness` in `FestivalAuctionHub.load()` and pass `readinessStatus` to the stage function. OR resolve viewer identity from `festival` object when `state` is null.

---

### C-02 — MainFestivalAuction Arena shows "Auction Setup Incomplete" for READY festivals

**File:** `src/components/MainFestivalAuction.jsx`, line 448  
**Severity:** Critical  
**User impact:** Any navigation to the arena before the auction has been started (e.g., from the "Launch Auction" button on FestivalCommandCenter or the secondary "Open Live Auction" button on AuctionDirectory) shows an error page with "Continue Festival Setup" instead of a "Ready to Launch" pre-launch state.

**Root cause:**
```js
// Line 448 — current code
const festivalStage = getFestivalAuctionStage({ auctionStatus: status });
// festivalStatus: MISSING, readinessStatus: MISSING
```

For `auctionStatus = "setup"` (pre-launch), this always returns SETUP regardless of readiness. The READY branch requires `readinessStatus = "ready"` which is not passed.

**Secondary impact:** The "Start Auction" button in `AdminLifecycleControls` is rendered inside the arena main view (reached only when `!isSetup`). If an admin navigates to the arena for a READY festival via any button, they can never reach the "Start Auction" button because the component returns early with the error ProductStateCard.

**Fix required:** Either fetch `GET /auction/readiness` in the arena's initial load, or add a `readinessStatus` prop to `MainFestivalAuction` passed from the parent route, or check `festival?.status` combined with the current logic.

---

### C-03 — "Launch Auction" button on FestivalCommandCenter sends admin to a broken screen

**File:** `src/pages/FestivalCommandCenter.jsx`, lines 354–361  
**Severity:** Critical  
**User impact:** Admin sees "Launch Auction" (the label implies it will start the auction) → clicks → arena shows "Auction Setup Incomplete" error (due to C-02) → admin is confused about what went wrong, clicks "Continue Festival Setup" → returns to FestivalDetail → sees they are still at READY state → no progress made.

**Root cause:**
```js
{readyStage && (
  <Button variant="contained" onClick={openFestivalAuction}>
    Launch Auction        {/* label implies API call */}
  </Button>
)}

const openFestivalAuction = () =>
  navigate(`/auctions/festivals/${festivalId}`);   // only navigates — no API call
```

`openFestivalAuction` only navigates to the arena. It does not call the start-auction API. The arena cannot self-start, and it shows a broken state for the READY pre-launch case (C-02).

**The actual launch path:** The only working launch flow is:
1. FestivalDetail → FestivalControlCenter sticky card (at top of manage page)
2. FestivalControlCenter calls `POST /auction/start`
3. After response, navigates to arena with `auctionStatus = "live"`
4. Arena renders correctly

The "Launch Auction" button in FestivalCommandCenter bypasses this and navigates directly to the arena prematurely.

**Fix required:** Either rename the button to "Open Auction Arena" (accurate but confusing since the arena shows an error), OR fix C-02 first so the arena handles READY state correctly, OR change "Launch Auction" to navigate to the manage page where FestivalControlCenter is accessible. The ideal fix is C-02 plus renaming the button.

---

## High Issues

---

### H-01 — Stage inconsistency between FestivalDetail and FestivalAuctionHub for the same Festival

**Files:** `src/pages/FestivalDetail.jsx`, `src/pages/FestivalAuctionHub.jsx`  
**Severity:** High  
**Description:** For a READY pre-launch festival, FestivalDetail shows "Ready to Launch" in its stage chip and AuctionContextNavigation renders "Auction Details" as an available nav link. Clicking that link navigates to FestivalAuctionHub which computes SETUP and shows an error. The same festival simultaneously says READY on one page and SETUP on another.

**Root cause:** Documented in C-01 — FestivalAuctionHub does not fetch or pass `readinessStatus`.

---

### H-02 — AuctionDirectory hides READY festivals from non-admin users

**File:** `src/pages/AuctionDirectory.jsx`, lines 138–142  
**Severity:** High  
**Description:**
```js
user?.role === "admin"
  ? api.get(`/v2/festivals/${festival.id}/auction/readiness`)
  : Promise.resolve({ data: { data: null } }),   // non-admins skip readiness fetch
```

Non-admin users (team owners, spectators) do not fetch readiness. Without `readinessStatus`, a READY festival with `festival.status = "setup"` and `auctionStatus = "setup"` computes as SETUP. `shouldShowInAuctionDirectory(SETUP)` = false → festival is filtered out.

Team owners visiting the Auction Directory before the admin clicks "Start Auction" will not see the festival at all. They would see: "Auctions exist but are still in setup. They will appear here once setup is complete."

**Note:** This is partially intentional (hiding setup festivals from owners is reasonable) but the problem is a READY festival — where the auction is genuinely about to start — is also hidden, leaving team owners unable to find their festival until the admin actually clicks Start.

---

### H-03 — FestivalControlCenter readiness chip shows red "error" color during a live auction

**File:** `src/components/FestivalControlCenter.jsx`, lines 129–133  
**Severity:** High  
**Description:**
```js
<Chip
  color={readiness?.overallStatus === "READY" ? "success" : "error"}
  label={getAuctionDisplayStatus(readiness).replaceAll("_", " ")}
/>
```

`getAuctionDisplayStatus` returns `"LIVE"` when `auctionStatus = "live"`. The label correctly says "LIVE". However, the chip color is driven by `overallStatus === "READY"`. During an active live auction, the readiness API may return `overallStatus = "NOT_READY"` (because "can we start the auction?" = no, it's already running). The chip then shows **red "LIVE"** — a success state branded as an error.

**Impact:** Admins managing a live auction see a red chip reading "LIVE", which implies something is wrong with an otherwise healthy auction.

**Fix required:** Condition chip color on `auctionStatus` value rather than `overallStatus`, or separate the live-stage display from the setup-readiness display.

---

### H-04 — FestivalAuctionSetup.loadSetup uses N+1 owner fetches

**File:** `src/components/FestivalAuctionSetup.jsx`, lines 80–88  
**Severity:** High (performance)  
**Description:**
```js
const ownerEntries = await Promise.all(
  loadedTeams.map(async (team) => {
    const response = await api.get(
      `/v2/festivals/${festivalId}/teams/${team.id}/owner`
    );
    return [team.id, response.data.data];
  })
);
```

All owner fetches run concurrently but there is still one HTTP request per team. For a festival with 8 teams, this is 8 concurrent `/teams/:teamId/owner` requests. This adds latency to loading the Budget, Owners, Retentions, and Auction Pool setup steps — all of which render `FestivalAuctionSetup`.

**Fix required:** API change — `GET /festivals/:id/teams` should return owner information inline. Frontend-only mitigation: cache owner data across tab switches in FestivalAuctionSetup.

---

### H-05 — FestivalAuctionSetup.loadSetup has no try/catch for the owner fetch loop

**File:** `src/components/FestivalAuctionSetup.jsx`, lines 80–88  
**Severity:** High (stability)  
**Description:**
```js
const ownerEntries = await Promise.all(
  loadedTeams.map(async (team) => {
    const response = await api.get(`/v2/festivals/${festivalId}/teams/${team.id}/owner`);
    return [team.id, response.data.data];
  })
);
```

This `Promise.all` is **inside** the outer `try/catch` but any individual owner fetch failure causes ALL owner data to be lost (Promise.all rejects on first failure). If any team's owner request returns a 404 or network error, the entire `loadSetup` catch block fires and the Budget/Owners/Pool tab shows a generic "Unable to load main auction setup" error with no indication of which team caused the problem.

**Fix required:** Use `Promise.allSettled` for the owner fetch loop and handle partial failures individually.

---

## Medium Issues

---

### M-01 — FestivalAuctionHub.load uses Promise.all — any single failure blanks the Hub

**File:** `src/pages/FestivalAuctionHub.jsx`, lines 74–95  
**Severity:** Medium  
**Description:**
```js
const [festivalResponse, currentResponse, historyResponse] =
  await Promise.all([
    api.get(`/v2/festivals/${festivalId}`),
    api.get(`/v2/festivals/${festivalId}/auction/current`),
    api.get(`/v2/festivals/${festivalId}/auction/history`),
  ]);
```

If history fails (intermittent 500), the entire Hub shows the generic error with "Retry". Festival info and current auction state are valid and could be displayed while history degrades gracefully. `Promise.allSettled` would allow partial rendering.

---

### M-02 — FestivalDetail has a redundant `auctionStatus` state that can briefly desync from `readiness`

**File:** `src/pages/FestivalDetail.jsx`, lines ~113–136  
**Severity:** Medium  
**Description:**
```js
const [auctionStatus, setAuctionStatus] = useState("setup");
// ...
const festivalStage = getFestivalAuctionStageFromState({
  festival,
  readiness,
  auctionStatus,   // derived from readiness, but stored separately
});
```

`auctionStatus` is set from `nextReadiness?.counts?.auctionStatus` inside `refreshReadiness`. However, `getFestivalAuctionStageFromState` internally also reads `readiness.counts?.auctionStatus` (via `auctionStatus || auction?.config?.auctionStatus || readiness?.counts?.auctionStatus`). Having a separate `auctionStatus` state means there is a brief render cycle between when `setReadiness(next)` fires and when `setAuctionStatus(next.counts?.auctionStatus)` fires where `readiness` and `auctionStatus` are from different generations.

Under React 18 batching, both state updates fire in the same batch from the same async function, so the desync window is minimal. However, if React ever processes these in separate batches (outside of event handlers), the stage would flicker.

**Fix required:** Remove the standalone `auctionStatus` state; derive it from `readiness?.counts?.auctionStatus` directly in the render scope. The `getFestivalAuctionStageFromState` function already accepts `readiness` and extracts it internally.

---

### M-03 — FestivalCommandCenter data can be stale when navigating from FestivalDetail

**Files:** `src/pages/FestivalCommandCenter.jsx`, `src/hooks/useFestivalCommandCenterData.js`  
**Severity:** Medium  
**Description:** `useFestivalCommandCenterData` loads fresh data on mount. When an admin navigates from FestivalDetail (where they just added participants, updating readiness) to FestivalCommandCenter, the command center always refetches — but there is no invalidation signal between the two pages. If the refetch completes before the server's readiness data is updated (possible if the readiness endpoint is cached server-side), the command center can show stale readiness.

This is a server-side caching concern, not a frontend bug, but it manifests as stale UI after mutations.

---

### M-04 — FestivalControlCenter "Start Auction" launch post-navigation error is swallowed

**File:** `src/components/FestivalControlCenter.jsx`, lines 95–98  
**Severity:** Medium  
**Description:**
```js
await api.post(`/v2/festivals/${festivalId}/auction/${action}`);
await loadStatus();
navigate(`/auctions/festivals/${festivalId}`);  // navigates even if loadStatus fails
```

If `loadStatus()` fails (e.g., network error immediately after a successful start), the navigation still proceeds. The error message set in `FestivalControlCenter` is visible for a fraction of a second before navigation. Once on the arena page, the user would see the arena's own loading state — the error is not surfaced.

More importantly: if the `POST /auction/start` succeeds but `loadStatus` returns stale data (race with server), the command center's readiness chip briefly shows stale state before the user navigates away. Not harmful but worth noting.

---

### M-05 — `FestivalReadiness.onLoaded` callback identity stability is fragile

**File:** `src/components/FestivalReadiness.jsx`, lines 40–57  
**Severity:** Medium (latent risk)  
**Description:**
```js
const loadReadiness = useCallback(async () => {
  ...
  onLoaded?.(response.data.data);
}, [festivalId, onLoaded]);

useEffect(() => {
  loadReadiness();
}, [loadReadiness, revision]);
```

`loadReadiness` recreates when `onLoaded` changes identity. If any future caller passes an inline arrow function `onLoaded={() => someHandler(data)}`, the `loadReadiness` callback recreates on every render, the `useEffect` fires on every render, and the component enters an infinite readiness-fetch loop.

Current callers pass `setReadiness` directly (useState setter — stable identity). Not a current bug, but a fragile pattern that will silently break if any caller changes.

---

### M-06 — FestivalOverview shows no loading state when readiness is being refreshed

**File:** `src/components/FestivalOverview.jsx`  
**Severity:** Medium (UX)  
**Description:** `FestivalOverview` receives `readiness` as a prop. When `invalidateFestivalSetup` is called and `refreshReadiness` is in-flight, `readiness` may momentarily be the previous value (no null transition, since `setReadiness` is called only on success). However, the component shows metrics from the previous readiness data without any indication that a refresh is in progress. The count metrics could show stale values for several seconds after a participant addition.

**The component only shows LoadingStateCard when `readiness` is null.** Since `refreshReadiness` only sets readiness on success (never sets to null during the request), the previous stale data is displayed during the refresh with no visual indicator.

---

### M-07 — Setup Incomplete status displays `overallStatus` label with underscore characters

**File:** `src/components/FestivalReadiness.jsx`, line 84  
**Severity:** Medium (UX)  
**Description:**
```js
label={readiness.overallStatus.replace("_", " ")}
```

Uses `String.replace` (replaces only the FIRST underscore), not `String.replaceAll`. If `overallStatus = "NOT_READY"` (one underscore), this produces "NOT READY" — correct. But if a future status value has two underscores (e.g., `"SETUP_NOT_READY"`), it would display "SETUP NOT_READY". Low impact now, but inconsistent with the rest of the codebase which uses `.replaceAll("_", " ")`.

---

## Low Issues

---

### L-01 — AuctionDirectory "Open Live Auction" secondary action for READY festivals navigates to broken arena

**File:** `src/pages/AuctionDirectory.jsx`, lines 35–57  
**Severity:** Low  
**Description:**
```js
if (stage === AUCTION_STAGE.READY) {
  return {
    primaryLabel: "View Auction Details",
    primaryRoute: `/festivals/${festival.id}/auction-hub`,
    secondaryLabel: "Open Live Auction",
    secondaryRoute: `/auctions/festivals/${festival.id}`,  // arena
  };
}
```

The secondary "Open Live Auction" button navigates to the arena. For a READY pre-launch festival, the arena shows "Auction Setup Incomplete" (C-02). The secondary button should either be removed for READY state, renamed to "Preview Auction", or the arena bug should be fixed first (C-02).

---

### L-02 — `FestivalAuctionSetup.loadSetup` overrides local config form state on every revision increment

**File:** `src/components/FestivalAuctionSetup.jsx`, lines 106–111  
**Severity:** Low  
**Description:**
```js
if (loadedConfig) {
  setConfigForm({
    totalBudget: String(loadedConfig.totalBudget),
    ownerCost: String(loadedConfig.ownerCost),
    incrementPercentage: loadedConfig.incrementPercentage || 20,
  });
}
```

Every time `operationRevision` increments (which happens when `rosterRevision` increments, which happens every time `invalidateFestivalSetup` runs), `loadSetup` refetches and overwrites the config form state. If an admin is in the middle of typing a new budget total while a participant addition happens in another step, their in-progress edit in the budget form is silently cleared.

---

### L-03 — Misleading "Auction Setup Incomplete" title for admin when festival readiness is actually READY

**Files:** `src/pages/FestivalAuctionHub.jsx` line 218, `src/components/MainFestivalAuction.jsx` line 482  
**Severity:** Low (secondary to C-01 and C-02)  
**Description:** Even if C-01 and C-02 are partially fixed, the error title "Auction Setup Incomplete" is factually wrong for a READY festival. A more accurate title would be "Auction Not Started Yet" with a message explaining the admin should use the manage page to start the auction. The current title implies the admin missed a setup step when they actually completed all steps.

---

## Root Causes

### Root Cause A — Inconsistent stage function call signatures across pages (causes C-01, C-02, H-01, H-02, L-01)

`getFestivalAuctionStage()` and `getFestivalAuctionStageFromState()` accept three independent status values. Different pages pass different subsets, producing different stage results for the same Festival:

- **Correct (full resolution):** FestivalDetail, FestivalCommandCenter, AuctionDirectory (admin)
- **Partial (missing readinessStatus):** FestivalAuctionHub (missing all), MainFestivalAuction (missing readinessStatus and festivalStatus), AuctionDirectory (non-admin, missing readinessStatus)

There is no enforced contract on which arguments must be passed, and no runtime warning when the function is called with insufficient data to resolve READY state. This makes the bug easy to introduce silently.

### Root Cause B — FestivalAuctionHub does not fetch the readiness endpoint (causes C-01)

The Hub loads festival data and auction current state, but never calls `GET /auction/readiness`. Without readiness data, it can never determine the READY stage. This was likely an intentional performance decision (readiness is heavyweight) but is not documented and produces incorrect behavior.

### Root Cause C — "Launch Auction" label implies an action that doesn't happen (causes C-03)

The button label "Launch Auction" implies a server mutation. It only navigates. The actual mutation (POST /auction/start) happens in FestivalControlCenter within the manage page. The button's name does not match its behavior, and its navigation target (the arena) renders incorrectly for READY pre-launch festivals.

### Root Cause D — Readiness chip color driven by readiness overallStatus instead of auction lifecycle (causes H-03)

The FestivalControlCenter chip uses `overallStatus === "READY"` for color. `overallStatus` is a setup-readiness signal, not a lifecycle signal. For a live auction, `overallStatus` may be "NOT_READY" (can't start again), causing a red chip despite a healthy live auction. The color should be driven by `auctionStatus` (live → success, paused → warning, setup → based on overallStatus).

### Root Cause E — FestivalAuctionSetup uses N+1 HTTP pattern for owner fetches (causes H-04, H-05)

The owner data for all teams is loaded via `Promise.all(teams.map(team => GET /teams/:id/owner))`. This is a known N+1 pattern without a server-side fix. The inner `Promise.all` is not wrapped in individual error handling, so a single team owner fetch failure surfaces as a full-page error.

---

## Fix Order

Fixes are ordered by: user impact severity, then ease of implementation.

### Phase 1 — Critical stage calculation fixes (unblock core user journey)

**Fix-1: Resolve C-01 — Add readiness fetch to FestivalAuctionHub**  
`src/pages/FestivalAuctionHub.jsx`
- In `load()`, add a call to `GET /v2/festivals/:festivalId/auction/readiness` (use `Promise.allSettled` so readiness failure doesn't break the rest of the Hub)
- Store readiness in state
- Derive `readinessStatus` from readiness and pass to `getFestivalAuctionStage`
- Use `festival` viewer data (not `state?.viewer`) for the admin check when `state` is null

**Fix-2: Resolve C-02 — Add readiness/festival context to MainFestivalAuction stage calculation**  
`src/components/MainFestivalAuction.jsx`
- Change `getFestivalAuctionStage({ auctionStatus: status })` to include `festivalStatus: festival?.status`
- The festival object is already fetched (line 137–148); use it
- This alone allows festival.status = "ready" or "ready_to_launch" to reach READY stage (but not the common "setup" + readiness=READY case)
- If the backend cannot update `festival.status` to "ready" at readiness READY time, also fetch readiness in `loadAuction` to fully resolve this

**Fix-3: Resolve C-03 — Rename or change behavior of "Launch Auction" button**  
`src/pages/FestivalCommandCenter.jsx`
- After Fix-2 is in place (arena handles READY state correctly), rename "Launch Auction" to "Open Live Auction" to match the arena nomenclature
- OR: change `openFestivalAuction` to navigate to `/festivals/:id/manage` (where FestivalControlCenter's Start button is) with a clear message

### Phase 2 — High issues

**Fix-4: Resolve H-03 — FestivalControlCenter readiness chip color**  
`src/components/FestivalControlCenter.jsx`
- Change chip color to: live → "success", paused → "warning", setup + READY → "success", setup + NOT_READY → "error"
- Decouple display label from color source

**Fix-5: Resolve H-05 — FestivalAuctionSetup owner fetch resilience**  
`src/components/FestivalAuctionSetup.jsx`
- Change `Promise.all(teams.map(owner fetch))` to `Promise.allSettled`
- Handle per-team failures with a null/fallback value and surface a partial-data warning instead of a full-page error

### Phase 3 — Medium issues

**Fix-6: Resolve M-01 — FestivalAuctionHub.load resilience**  
`src/pages/FestivalAuctionHub.jsx`
- Change inner `Promise.all` to `Promise.allSettled`
- Render festival and auction data even when history fails, showing a warning instead

**Fix-7: Resolve M-02 — Remove redundant `auctionStatus` state from FestivalDetail**  
`src/pages/FestivalDetail.jsx`
- Remove `const [auctionStatus, setAuctionStatus] = useState("setup")`
- Remove `setAuctionStatus(nextReadiness?.counts?.auctionStatus || "setup")` from `refreshReadiness`
- Derive `auctionStatus` in render: `const auctionStatus = readiness?.counts?.auctionStatus || "setup"`
- `getFestivalAuctionStageFromState` already reads from the `readiness` object; the separate state variable is redundant

**Fix-8: Resolve M-05 — Document `onLoaded` stability contract in FestivalReadiness**  
`src/components/FestivalReadiness.jsx`
- Add a comment above the `onLoaded` prop: "Must be a stable function reference (useCallback or useState setter). Inline arrow functions will cause an infinite reload loop."

---

## Stability Risk Assessment

### Overall risk: HIGH

The three critical issues (C-01, C-02, C-03) form a broken chain in the most important user action: the admin completing setup and launching the auction. The canonical launch path through FestivalControlCenter works correctly, but every alternative navigation path to the arena produces a misleading error page. This creates an extremely poor admin experience at the moment of launch.

### Risk-by-component matrix

| Component | Risk | Primary Issues |
|-----------|------|---------------|
| `FestivalAuctionHub` | 🔴 High | C-01, M-01, M-07 |
| `MainFestivalAuction` | 🔴 High | C-02, L-03 |
| `FestivalCommandCenter` | 🟡 Medium | C-03, H-03 |
| `FestivalDetail` | 🟡 Medium | M-02 (prior race conditions fixed in prev session) |
| `FestivalControlCenter` | 🟡 Medium | M-04 (launch path itself works) |
| `FestivalAuctionSetup` | 🟡 Medium | H-04, H-05 |
| `AuctionDirectory` | 🟡 Medium | H-02, L-01 |
| `FestivalSetupWizard` | 🟢 Low | Prior issues resolved in previous session |
| `FestivalReadiness` | 🟢 Low | M-05 (latent), M-07 (cosmetic) |

### What works correctly

- The canonical launch path: FestivalDetail → FestivalControlCenter → Start Auction → Arena works correctly
- FestivalDetail stage computation is correct for all scenarios
- FestivalCommandCenter stage computation is correct
- `getFestivalAuctionStage` / `getFestivalAuctionStageFromState` logic is correct when called with the right arguments
- The wizard Next/Back navigation race condition (fixed in previous session)
- The `refreshReadiness` null-safety crash (fixed in previous session)
- The `invalidateFestivalSetup` concurrency guard (fixed in previous session)
- Step-change diagnostic logging (added in previous session)
- Socket synchronization in the arena is solid
- Auction lifecycle controls (start/pause/resume/complete) work correctly once the arena is reached

### What will fail in production today

1. Admin clicks "Auction Details" nav link after completing full setup → error page
2. Admin clicks "Launch Auction" on Command Center → error page
3. Team Owner visits Auction Directory before admin clicks Start → festival not visible
4. Admin reaches FestivalAuctionHub via any route before auction is started → sees error
5. Admin navigates to arena directly before starting → sees error with no way to start

All five failures are caused by C-01, C-02, and C-03 sharing the same root cause (Root Cause A).

---

*Audit complete. Awaiting approval to implement fixes.*
