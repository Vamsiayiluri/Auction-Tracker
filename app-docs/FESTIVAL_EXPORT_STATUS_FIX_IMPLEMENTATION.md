# Festival Export Status Fix Implementation

## Root Cause

Festival export was blocked because the endpoint validated the parent Festival lifecycle status:

```js
festival.status === "completed"
```

Festival auction completion does not update `Festival.status`. It updates `FestivalAuctionConfig`:

```js
auctionStatus: "completed"
status: "completed"
completedAt: ...
```

This caused valid completed auctions to fail when the Festival itself remained in a non-completed lifecycle status such as `draft`.

## Code Modified

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`
- `ipl-auction-tracker-backend/test/team-export-excel.test.js`
- `ipl-auction-tracker/src/components/FestivalControlCenter.jsx`
- `ipl-auction-tracker/src/components/FestivalOverview.jsx`
- `ipl-auction-tracker/src/pages/FestivalDetail.jsx`

Sport Tournament export behavior was not changed.

## Old Validation

```js
if (festival.status !== "completed") {
  return res.status(409).json({ message: "Auction must be completed before export." });
}
```

This checked the wrong field and ignored `FestivalAuctionConfig.auctionStatus`.

## New Validation

Festival export now resolves completion from the same auction-stage source used by Festival workflow screens, with `FestivalAuctionConfig.auctionStatus` as the preferred source of truth:

```js
const resolvedCompletionState = resolveFestivalExportCompletionState({
  festivalStatus: festival.status,
  auctionConfigStatus: auctionConfig?.status,
  auctionConfigAuctionStatus: auctionConfig?.auctionStatus,
  readinessAuctionStatus: readiness?.counts?.auctionStatus,
  readinessStatus,
});

if (resolvedCompletionState !== "completed") {
  return res.status(409).json({ message: "Auction must be completed before export." });
}
```

Required cases now resolve as:

| Festival Status | Auction Status | Export |
|---|---|---|
| `draft` | `completed` | allowed |
| `draft` | `live` | blocked |
| `draft` | `setup` | blocked |

## Diagnostics

Temporary `[EXPORT_DEBUG]` logging remains in the Festival export path:

```js
festival.status
auctionConfig.status
auctionConfig.auctionStatus
resolvedCompletionState
```

## Frontend Alignment

Festival export button visibility in Command Center, Overview, and workspace Results now uses completed auction status instead of requiring `festival.status === "completed"`.

## Test Results

Passed:

- `node --test test\team-export-excel.test.js`
- Focused ESLint:
  - `src/components/FestivalControlCenter.jsx`
  - `src/components/FestivalOverview.jsx`
  - `src/pages/FestivalDetail.jsx`
- `npm run build`

The regression suite includes direct coverage that `draft + completed` resolves to `completed`, while `draft + live` and `draft + setup` remain blocked states.
