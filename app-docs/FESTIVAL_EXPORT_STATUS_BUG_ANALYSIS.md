# Festival Export Status Bug Analysis

## Summary

`GET /api/festivals/:festivalId/export/excel` rejects completed Festival auctions because it validates only `Festival.status`.

Current export validation:

```js
if (festival.status !== "completed") {
  return res.status(409).json({ message: "Auction must be completed before export." });
}
```

Code location:

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`

## Root Cause

The export endpoint is checking the wrong source of truth.

The Festival auction completion flow updates `FestivalAuctionConfig`, not the parent `Festival` lifecycle status.

Completion code:

- `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- `completeFestivalAuction`

On completion it writes:

```js
await config.update({
  auctionStatus: "completed",
  status: "completed",
  completedAt,
});
```

It does not update:

```js
festival.status
```

Therefore a completed auction can have:

| Field | Value |
|---|---|
| `Festival.status` | not `completed` |
| `FestivalAuctionConfig.auctionStatus` | `completed` |
| `FestivalAuctionConfig.status` | `completed` |
| resolved Festival auction stage | `completed` |

The export endpoint rejects before looking at the auction config.

## Temporary Diagnostics Added

Added `[EXPORT_DEBUG]` logging before the existing Festival export rejection branch.

Code location:

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`

Logged fields:

```js
console.info("[EXPORT_DEBUG]", {
  festivalId,
  "festival.status": festival.status,
  "auction.status": latestAuction?.status || null,
  "auctionConfig.status": auctionConfig?.status || null,
  auctionStatus,
  readinessStatus,
  resolvedStage,
});
```

This is diagnostic-only. The export validation has not been changed.

## Status Values Being Evaluated

Export currently evaluates only:

| Source | Field | Used by export validation |
|---|---|---|
| `Festival` | `status` | yes |
| `FestivalAuctionConfig` | `auctionStatus` | no, diagnostics only |
| `FestivalAuctionConfig` | `status` | no, diagnostics only |
| latest `FestivalAuction` | `status` | no, diagnostics only |
| readiness | `overallStatus` | no, diagnostics only |
| derived stage | `resolvedStage` | no, diagnostics only |

Expected failing diagnostic pattern:

```txt
[EXPORT_DEBUG] {
  festivalId: "...",
  "festival.status": "competition" | "allocation" | another non-completed festival lifecycle value,
  "auction.status": "sold" | "unsold" | null,
  "auctionConfig.status": "completed",
  auctionStatus: "completed",
  readinessStatus: "READY" | "NOT_READY",
  resolvedStage: "completed"
}
```

The exact `festival.status` value should be captured from the runtime `[EXPORT_DEBUG]` log for the failing Festival ID.

## Comparison With Festival Workflow Completion Logic

### Festival Results Page

File:

- `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx`

Completion is derived with:

```js
getFestivalAuctionStage({
  auctionStatus: auctionStatus || "setup",
  festivalStatus,
});
```

The helper returns completed when either `auctionStatus` or `festivalStatus` is completed.

### Festival Command Center

File:

- `ipl-auction-tracker/src/pages/FestivalCommandCenter.jsx`

Completion is derived with:

```js
getFestivalAuctionStageFromState({
  festival: data.festival,
  auction: data.festivalAuction,
  readiness: data.festivalReadiness,
  auctionStatus: festivalAuctionStatus,
});
```

`festivalAuctionStatus` is sourced from:

```js
data.festivalAuction?.config?.auctionStatus ||
data.festivalReadiness?.counts?.auctionStatus ||
"setup"
```

Related frontend export-button note:

- `ipl-auction-tracker/src/components/FestivalControlCenter.jsx`
- `ipl-auction-tracker/src/components/FestivalOverview.jsx`
- `ipl-auction-tracker/src/pages/FestivalDetail.jsx`

These export button visibility checks currently require both:

```js
festival?.status === "completed" &&
auctionStatus === "completed"
```

That condition has the same risk as the backend export validation. It can hide the export button even when the shared stage helper would resolve the Festival auction as completed from `auctionStatus`.

### Festival Auction Hub

File:

- `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx`

Completion is derived with:

```js
getFestivalAuctionStageFromState({
  festival,
  auction: state,
  readiness,
});
```

The hub uses all three sources and treats `auction.config.auctionStatus === "completed"` as completed.

### Shared Stage Helper

File:

- `ipl-auction-tracker/src/utils/auctionStages.js`

Completion rule:

```js
if (
  completedStatuses.has(normalizedAuctionStatus) ||
  completedStatuses.has(normalizedFestivalStatus)
) {
  return AUCTION_STAGE.COMPLETED;
}
```

This is more permissive and more accurate than the export endpoint because it accepts the auction config status.

## Determination

The export endpoint is checking the wrong status field.

It uses:

```js
Festival.status
```

It should align with Festival workflow completion logic, which resolves completion from:

```js
FestivalAuctionConfig.auctionStatus
```

with fallback to readiness `counts.auctionStatus` and/or the shared stage helper behavior.

This is a stage-helper mismatch and source-of-truth mismatch. It is not caused by team allocation data or workbook generation.

## Recommended Fix

Use the same completion determination used throughout Festival workflow:

Primary source of truth:

```js
FestivalAuctionConfig.auctionStatus === "completed"
```

Recommended backend validation shape:

```js
const resolvedStage = resolveFestivalStage({
  festivalStatus: festival.status,
  auctionStatus: auctionConfig?.auctionStatus || readiness?.counts?.auctionStatus,
  readinessStatus: readiness?.overallStatus,
});

if (resolvedStage !== "completed") {
  return res.status(409).json({ message: "Auction must be completed before export." });
}
```

Longer-term recommendation:

- Move the Festival stage resolver into a shared backend utility mirroring `src/utils/auctionStages.js`.
- Use that utility in export, current-state summaries, command-center APIs, and any future completed-auction backend features.
- Remove `[EXPORT_DEBUG]` after the failing Festival ID confirms the runtime values.

Do not use `Festival.status` alone for auction completion because it represents the overall Festival lifecycle, not the Main Festival Auction lifecycle.
