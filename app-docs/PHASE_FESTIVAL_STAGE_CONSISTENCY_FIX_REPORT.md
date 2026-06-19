# PHASE_FESTIVAL_STAGE_CONSISTENCY_FIX_REPORT.md

**Scope:** Festival Stage Consistency — C-01, C-02, C-03 from FESTIVAL_SETUP_STABILITY_AUDIT.md  
**Date:** June 2026  
**Status:** Complete

---

## Root Cause

All three issues share a single root cause: **different components called the stage utility with different subsets of the three required inputs**, producing different stage results for the same Festival at the same moment.

`getFestivalAuctionStage()` requires three inputs to correctly determine READY state:

| Input | Source |
|-------|--------|
| `auctionStatus` | `GET /auction/current` → `config.auctionStatus` |
| `readinessStatus` | `GET /auction/readiness` → `overallStatus` |
| `festivalStatus` | `GET /festivals/:id` → `status` |

The READY stage branch in the utility:
```js
if (
  readyStatuses.has(normalizedFestivalStatus) ||            // "ready" or "ready_to_launch"
  (normalizedAuctionStatus === "setup" &&
    normalizedReadinessStatus === "ready") ||               // pre-launch: setup + READY
  normalizedReadinessStatus === "ready"                     // any READY readiness
) {
  return AUCTION_STAGE.READY;
}
```

In the standard pre-launch state — `festival.status = "setup"`, `readiness.overallStatus = "READY"`, `auctionStatus = "setup"` — **READY can only be returned if `readinessStatus` is passed.** Components that omitted `readinessStatus` always fell through to the SETUP branch, showing "Auction Setup Incomplete."

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/FestivalAuctionHub.jsx` | C-01 — fetch readiness, use `getFestivalAuctionStageFromState`, add READY pre-launch state |
| `src/components/MainFestivalAuction.jsx` | C-02 — fetch readiness, use `getFestivalAuctionStageFromState`, fix loading gate, update info alert |
| `src/pages/FestivalCommandCenter.jsx` | C-03 — rename misleading "Launch Auction" label |

No other files were modified. Sport Tournament flows, bidding logic, sockets, and backend APIs are untouched.

---

## C-01 — FestivalAuctionHub

### Before

```js
// load() — three requests, Promise.all; any failure blanks the Hub
const [festivalResponse, currentResponse, historyResponse] = await Promise.all([...]);

// Stage calculation — readinessStatus never passed
const auctionStatus = state?.config?.auctionStatus || "setup";
const festivalStage = getFestivalAuctionStage({
  auctionStatus,
  festivalStatus: festival?.status,
  // readinessStatus: MISSING
});
```

**Result:** A READY pre-launch festival always resolved to SETUP → "Auction Setup Incomplete" error displayed. If `state` was null (no auction started), `state?.viewer?.isAdmin` was `undefined` → admin saw the non-admin "Festival Auction in Setup" message.

### After

```js
// load() — four requests, Promise.allSettled; readiness failure is non-fatal
const [festivalResult, currentResult, historyResult, readinessResult] =
  await Promise.allSettled([
    api.get(`/v2/festivals/${festivalId}`),
    api.get(`/v2/festivals/${festivalId}/auction/current`),
    api.get(`/v2/festivals/${festivalId}/auction/history`),
    api.get(`/v2/festivals/${festivalId}/auction/readiness`),  // new
  ]);
// each result applied only on "fulfilled"
// error surfaced only when BOTH festival and current fail

// Stage calculation — all three sources now provided
const festivalStage = getFestivalAuctionStageFromState({
  festival,
  auction: state,
  readiness,           // new — provides readinessStatus to stage function
});
```

A new READY pre-launch ProductStateCard is returned when `isReadyStage(festivalStage)`:
- **Team Owner:** "Auction Ready — Launching Soon" + "Browse Auctions"
- **Non-identified user:** "Festival Auction Ready to Launch" + "Browse Auctions"
- **Admin (when state?.viewer?.isAdmin):** "Festival Auction Ready to Launch" + "Go to Festival Management" + "View Festival Overview"

The Hub's live/completed content is unchanged — LIVE and COMPLETED stages fall through to the full tabbed content as before.

**Side effect (improvement):** `Promise.allSettled` means a failed history request no longer blanks the entire Hub. The Hub renders with empty history and a console warning instead.

---

## C-02 — MainFestivalAuction Arena

### Before

```js
// Single-argument call — readinessStatus and festivalStatus both missing
const festivalStage = getFestivalAuctionStage({ auctionStatus: status });

// Loading gate only guards against initial load
if (loading && !state) { return <LoadingStateCard />; }
```

**Result:** For any pre-launch festival (`auctionStatus = "setup"`), `festivalStage` was always SETUP → admin saw "Auction Setup Incomplete" with "Continue Festival Setup" action instead of the launch controls. The "Open Auction Arena" button from FestivalCommandCenter (C-03) led directly to this error.

### After

```js
// New readiness state + one-time fetch effect (non-fatal on error)
const [readiness, setReadiness] = useState(null);
const [readinessLoaded, setReadinessLoaded] = useState(false);

useEffect(() => {
  let active = true;
  api.get(`/v2/festivals/${festivalId}/auction/readiness`)
    .then((res) => { if (active) { setReadiness(res.data.data); setReadinessLoaded(true); } })
    .catch(() => { if (active) setReadinessLoaded(true); });
  return () => { active = false; };
}, [festivalId]);

// Full stage derivation with all three sources
const festivalStage = getFestivalAuctionStageFromState({
  festival,
  auction: state,
  readiness,
});

// Loading gate extended: for pre-launch festivals, also wait for readiness
// to prevent a flash of "Auction Setup Incomplete" before readiness arrives.
// Live/completed auctions are deterministic from auctionStatus alone — no wait.
const preLaunch = status === "setup";
if ((loading && !state) || (preLaunch && !readinessLoaded)) {
  return <LoadingStateCard />;
}
```

**Result for READY pre-launch + admin:** Falls through to the full arena render with:
- An info alert: *"The Festival Auction is configured and ready to launch. Click 'Start Auction' in the Auction Controls above to begin."*
- `AdminLifecycleControls` with **Start Auction** enabled (since `status === "setup"`, which is the correct enable condition)
- After clicking Start Auction: `runAction("/auction/start", ...)` → `loadAuction({ forceState: true })` → `auctionStatus = "live"` → stage recalculates to LIVE → full live arena renders

**Result for READY pre-launch + non-admin/owner:** Falls through to the `isReady && !isAdmin` ProductStateCard ("Auction Ready — Launching Soon") which already existed and was already correct. No change in behavior.

**No regression for live/completed auctions:** `preLaunch = (status === "setup")` is `false` when `auctionStatus = "live"` or `"completed"`. The extended loading gate condition is not entered, so the arena renders as soon as `loadAuction` completes — same as before.

---

## C-03 — FestivalCommandCenter

### Before

```jsx
{readyStage && (
  <Button variant="contained" onClick={openFestivalAuction}>
    Launch Auction        {/* label implied API call; only navigated */}
  </Button>
)}
```

`openFestivalAuction` navigates to `/auctions/festivals/:id`. Before C-02 was fixed, this led to "Auction Setup Incomplete". The label "Launch Auction" implied a server action.

### After

```jsx
{readyStage && (
  <Button variant="contained" onClick={openFestivalAuction}>
    Open Auction Arena    {/* accurate: navigates to arena */}
  </Button>
)}
```

With C-02 fixed, clicking "Open Auction Arena" now leads to the correct pre-launch READY admin view in the arena, where the admin sees the "Start Auction" button in AdminLifecycleControls. The label matches what actually happens (navigation), and the destination is no longer broken.

---

## Verification Scenarios

### Scenario A — The primary audit scenario
**Festival state:** `festival.status = "setup"`, `readiness.overallStatus = "READY"`, `auctionStatus = "setup"`

| Surface | Before | After |
|---------|--------|-------|
| Festival Overview (FestivalCommandCenter) | ✅ READY — "Open Auction Arena" button | ✅ READY — "Open Auction Arena" button |
| Festival Setup (FestivalDetail / manage) | ✅ READY — "Ready to Launch" chip | ✅ READY — same |
| Festival Command Center | ✅ READY — "Open Auction Arena" button | ✅ READY — "Open Auction Arena" button (renamed) |
| **Festival Auction Hub** | ❌ SETUP — "Auction Setup Incomplete" | ✅ READY — "Festival Auction Ready to Launch" |
| **Festival Arena (admin)** | ❌ SETUP — "Auction Setup Incomplete" | ✅ READY — Info alert + Start Auction button |
| **Festival Arena (non-admin)** | ❌ SETUP — "Waiting For Festival Setup" | ✅ READY — "Auction Ready — Launching Soon" |
| Auction Directory (admin) | ✅ READY — visible | ✅ READY — unchanged |

### Scenario B — Live auction (`auctionStatus = "live"`)
All surfaces unchanged. LIVE is determined from `liveStatuses.has("live")` before the READY branch is even checked. The new readiness fetch in the arena never affects an already-live auction.

### Scenario C — Setup genuinely incomplete (`readiness.overallStatus = "NOT_READY"`)
- Hub: SETUP → "Auction Setup Incomplete" (correct, unchanged)
- Arena: SETUP → "Auction Setup Incomplete" (correct, unchanged)
- FestivalCommandCenter: SETUP → "Continue Setup" progress card (correct, unchanged)

### Scenario D — Readiness endpoint unavailable (non-admin or network error)
- Hub: readiness fetch rejected → `readiness = null` → stage falls back to `festival.status + auctionStatus` → SETUP for typical pre-launch festival → shows "Waiting For Festival Setup" (same as before; non-admins cannot determine READY)
- Arena: readiness fetch rejected → `readinessLoaded = true` → stage falls back → SETUP → shows setup screens. Arena is behind an auth boundary, so this primarily affects admins. For a network error on the admin path, the admin would see the setup screen and can retry.

### Scenario E — "Open Auction Arena" button flow (post C-02 fix)
1. Admin on FestivalCommandCenter, readyStage=true → clicks "Open Auction Arena"
2. Navigates to `/auctions/festivals/:id`
3. Arena loads, fetches readiness → readinessLoaded=true → stage=READY → `isReady && isAdmin`
4. Arena shows info alert + AdminLifecycleControls with enabled "Start Auction" button
5. Admin clicks "Start Auction" → `POST /auction/start` → `loadAuction({forceState: true})` → `auctionStatus = "live"` → stage=LIVE → full live arena renders

---

## What Was Not Changed

- `FestivalDetail.jsx` — already uses `getFestivalAuctionStageFromState` correctly
- `FestivalCommandCenter.jsx` (stage logic) — already uses `getFestivalAuctionStageFromState` correctly; only label changed
- `AuctionDirectory.jsx` — the non-admin readiness gap (H-02) is a separate audit item, not in scope
- `auctionStages.js` — stage utilities are correct; no changes needed
- All Sport Tournament components — untouched
- All bidding logic, socket handlers, backend APIs — untouched
