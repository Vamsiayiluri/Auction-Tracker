# Festival Summary Endpoint Failure

## Scope

Investigated the dashboard warning:

`Festival Auction state is temporarily unavailable.`

The warning is emitted by `ipl-auction-tracker/src/components/ProductDashboard/useProductDashboardData.js` when `festivalSummaryResult.status === "rejected"` after requesting:

`GET /v2/festivals/auction/summaries`

For the backend this maps to:

`GET /api/v2/festivals/auction/summaries`

## Exact Root Cause

The endpoint fails when the dashboard requests Festival summaries with readiness enabled for admins.

Request path:

1. Dashboard calls `GET /v2/festivals/auction/summaries` with `includeReadiness: user.role === "admin"`.
2. Backend route `GET /auction/summaries` is registered under `/api/v2/festivals`.
3. `getFestivalAuctionSummaries` calls `getFestivalReadiness(festivalId)` inside a `Promise.all`.
4. `getFestivalReadiness` throws `ReferenceError: participants is not defined`.
5. That readiness promise rejects the controller-level `Promise.all`.
6. The endpoint returns HTTP 500.
7. Axios rejects the request, so `festivalSummaryResult.status === "rejected"` and the dashboard shows the warning.

Faulty code:

`ipl-auction-tracker-backend/src/utils/festivalReadiness.js`

```js
setupSteps: {
  participants:
    participants.length > 0 && sportRegistrations > 0,
}
```

`participants` is not defined anywhere in `calculateFestivalReadiness`. The available value is `participantCount`.

## Minimal Fix

Replace the undefined variable with the existing count:

```js
participants: participantCount > 0 && sportRegistrations > 0,
```

This is a one-line fix in `ipl-auction-tracker-backend/src/utils/festivalReadiness.js`. I did not apply it because this task requested diagnosis only.

## Temporary Logging Added

Added temporary logging to:

`ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Logs now include:

```js
console.info("[festival-summary] request", {
  ids: festivalIds,
  includeReadiness,
  includeOutcomes,
});
```

```js
console.info("[festival-summary] response count", data.length);
```

```js
console.error("[festival-summary] error stack", error.stack || error);
```

## Route Registration Audit

Status: OK

Route mount:

`ipl-auction-tracker-backend/src/index.js`

```js
app.use("/api/v2/festivals", FestivalRoutes);
```

Route registration:

`ipl-auction-tracker-backend/src/routes/festivalRoutes.js`

```js
router.get("/auction/summaries", getFestivalAuctionSummaries);
```

Frontend API base URL uses `/api`, so frontend `/v2/festivals/auction/summaries` resolves to backend `/api/v2/festivals/auction/summaries`.

No 404 route mismatch found.

## Controller Audit

Controller:

`ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

Success response shape:

```js
{
  festivalId,
  current,
  readiness,
  recentOutcomes,
}
```

The contract is present for every summary object on the success path:

- `festivalId`: from each scoped Festival id.
- `current`: from `loadFestivalAuctionSummaryState`, or `null`.
- `readiness`: from `readinessByFestivalId`, or `null`.
- `recentOutcomes`: from `outcomesByFestivalId`, or `[]`.

The response contract is not the cause of the dashboard rejection. The failure happens before the controller reaches serialization.

## Failure Checklist

| Check | Result | Notes |
| --- | --- | --- |
| 404 route mismatch | Not found | Route is registered as `/api/v2/festivals/auction/summaries`. |
| 500 exceptions | Found | Readiness throws `ReferenceError: participants is not defined`. |
| Missing Sequelize imports | Not found | Controller imports `Op`, `Transaction`, models, and `getFestivalReadiness`. |
| Undefined model references | Not found in summary controller | The undefined reference is a local variable in readiness, not a model. |
| Invalid include clauses | Not found for summary route | Recent outcomes includes valid `participant.employee` and `team` clauses. |
| Promise.all failures | Found | `getFestivalReadiness` is executed inside `Promise.all`; one readiness exception rejects the whole endpoint. |
| Serialization errors | Not found | Data serialization is not reached on failure. |

## Why The Dashboard Warns

`ipl-auction-tracker/src/components/ProductDashboard/useProductDashboardData.js` uses `Promise.allSettled` for Festival and Sport summaries.

When the Festival summary endpoint returns HTTP 500, Axios rejects the promise. The dashboard then executes:

```js
if (festivalSummaryResult.status === "rejected") {
  nextWarnings.push("Festival Auction state is temporarily unavailable.");
}
```

This is expected frontend behavior for the backend 500.

## Minimal Remediation Plan

1. Apply the one-line readiness fix:
   `participants.length > 0` -> `participantCount > 0`.
2. Keep the temporary `[festival-summary]` logs until the endpoint is confirmed stable in the dashboard.
3. After confirmation, remove the temporary logs or gate them behind the existing logging pattern.

No refactor is required.
