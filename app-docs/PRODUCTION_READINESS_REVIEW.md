# Production Readiness Review

Audit scope: Festival creation, Festival setup, Festival auction, Sport Tournament setup, Sport auction, Dashboard, Auction Directory, and Results flows.

This is an audit-only review. No fixes were implemented.

## Critical

### 1. Lazy route failures can render a blank application shell

- File: `ipl-auction-tracker/src/App.jsx:18`, `ipl-auction-tracker/src/App.jsx:64`
- Root cause: All major routes are loaded with `React.lazy`, but the route-level `Suspense` fallback is `null` and there is no error boundary for failed chunk loads.
- User impact: On slow networks, direct URLs can appear blank while the route chunk loads. If a deployed chunk is missing after a release, the user gets a permanent blank page instead of an error/reload state.
- Fix recommendation: Add a visible route loading fallback and a route-level error boundary with a reload/retry action.

### 2. Expired or invalid auth leaves users inside broken protected flows

- File: `ipl-auction-tracker/src/utils/api.js:7`, `ipl-auction-tracker/src/context/AuthContext.jsx:22`, `ipl-auction-tracker/src/webSocket/socket.js:6`
- Root cause: The API client only attaches the bearer token. It does not handle `401` responses globally, clear invalid auth, or redirect to login. The socket client also has no `connect_error` handling for auth rejection.
- User impact: A demo user with an expired token can stay on protected pages where every API call fails. Live auction socket updates can silently stop while the UI remains open.
- Fix recommendation: Add a response interceptor for `401`, central logout/session-expired handling, and socket `connect_error` handling that surfaces re-authentication.

### 3. Festival readiness can crash on partial readiness payloads

- File: `ipl-auction-tracker/src/components/FestivalReadiness.jsx:101`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx:137`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx:149`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx:168`
- Root cause: The component assumes `readiness.overallStatus`, `readiness.counts`, `readiness.teams`, and `readiness.blockers` all exist once `readiness` is truthy.
- User impact: A partial backend response or schema regression can crash Festival setup and Auction Preparation views.
- Fix recommendation: Normalize readiness data before rendering, default missing arrays/objects, and show an error/empty state when required sections are absent.

### 4. Sport Tournament workspace can crash when tournament payload is null

- File: `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:117`, `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:121`, `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:175`
- Root cause: The workspace dereferences `nextTournament.name`, `nextTournament.code`, and related fields immediately after a fulfilled request without checking that `data.data` is non-null.
- User impact: A deleted tournament, malformed successful response, or stale direct URL can crash the setup workspace.
- Fix recommendation: Treat fulfilled-but-empty payloads as load failures and render a not-found/error state before reading tournament fields.

## High

### 5. Sport workspace Pool and Eligibility tabs have null-reference risks

- File: `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:958`, `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:1018`
- Root cause: The Eligibility tab calls `participant.reasons.map(...)` without defaulting `reasons`. The Pool tab uses `pool?.counts.available`, which still throws when `pool` exists but `counts` is missing.
- User impact: Setup tabs can crash on partial eligibility or pool payloads, especially after failed generation or backend shape changes.
- Fix recommendation: Use `participant.reasons || []` and `pool?.counts?.available`, and display a warning when expected summary fields are missing.

### 6. Sport Auction Hub can misclassify failed loads as setup state

- File: `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:83`, `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:98`, `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:245`, `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:268`
- Root cause: `loadHub` uses `Promise.allSettled`, but after failures the page still derives stage from null state and may render setup/ready holding screens instead of a terminal load error.
- User impact: A bad direct URL or backend outage can show "Sport Auction In Setup" rather than "not found" or "unable to load", creating a navigation dead end.
- Fix recommendation: If tournament and current auction both fail, render a blocking error/not-found state with retry and dashboard/directory actions.

### 7. Festival Auction Hub can hide load errors behind setup holding screens

- File: `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx:81`, `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx:108`, `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx:239`, `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx:248`
- Root cause: The hub only blocks when both Festival and current auction requests fail, then continues to stage rendering. Setup-stage holding screens return before the later error alert can render.
- User impact: Direct URLs for inaccessible or failed Festival auctions can show a generic setup/waiting page instead of the real failure.
- Fix recommendation: Render a blocking error state before stage-specific holding screens when primary data is unavailable.

### 8. Live auction state load is all-or-nothing for current plus history

- File: `ipl-auction-tracker/src/components/MainFestivalAuction.jsx:86`, `ipl-auction-tracker/src/components/MainFestivalAuction.jsx:111`
- Root cause: `loadAuction` uses `Promise.all` for current state and history. A history endpoint failure discards a successful current-state response.
- User impact: Live bidding can fail to open even when the current auction state is available, because non-critical history failed.
- Fix recommendation: Load current auction state as the critical request and history as best-effort, with a warning if history cannot load.

### 9. Socket disconnect and auth failure handling is incomplete for live auctions

- File: `ipl-auction-tracker/src/components/MainFestivalAuction.jsx:200`, `ipl-auction-tracker/src/components/MainFestivalAuction.jsx:210`, `ipl-auction-tracker/src/pages/SportAuctionArena.jsx:198`, `ipl-auction-tracker/src/pages/SportAuctionArena.jsx:204`
- Root cause: The pages track `connected` and `roomJoined`, but do not handle `connect_error`, auth expiry, reconnect exhaustion, or prolonged room join failure with a strong blocking banner.
- User impact: Users may keep bidding or waiting on stale live data without understanding that real-time updates are unavailable.
- Fix recommendation: Add explicit socket error states, reconnect status, last successful sync timestamp, and a forced HTTP refresh/re-auth path when the socket cannot join.

### 10. Auction Directory can cache failed empty responses

- File: `ipl-auction-tracker/src/pages/AuctionDirectory.jsx:187`, `ipl-auction-tracker/src/pages/AuctionDirectory.jsx:193`, `ipl-auction-tracker/src/pages/AuctionDirectory.jsx:202`
- Root cause: The directory writes the aggregate cache even when one or both primary list requests fail, using empty arrays for failed sources.
- User impact: A transient API failure can become a cached empty directory, making auctions disappear for the TTL window.
- Fix recommendation: Only cache successful aggregate loads, or cache partial data with explicit error metadata and avoid replacing known-good cached data with empty failed data.

### 11. Dashboard can render normal empty cards after a total base-data failure

- File: `ipl-auction-tracker/src/components/ProductDashboard/useProductDashboardData.js:83`, `ipl-auction-tracker/src/pages/Dashboard.jsx:15`
- Root cause: When both Festival and Sport base requests fail, the hook sets an error and stops loading but keeps default empty dashboard data. The Dashboard still renders role dashboards below the error.
- User impact: Demo users can see both an error and apparently empty product state, which looks like missing data rather than a load failure.
- Fix recommendation: Expose a blocking failure state for total dashboard load failure and suppress normal dashboard cards until at least one base source succeeds.

### 12. Results pages can show "No Results Yet" after stage API failures

- File: `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx:20`, `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx:55`, `ipl-auction-tracker/src/pages/SportAuctionResultsPage.jsx:53`, `ipl-auction-tracker/src/pages/SportAuctionResultsPage.jsx:105`
- Root cause: Results pages default missing stage data to setup/ready states after `Promise.allSettled` failures.
- User impact: Backend or permission failures can be presented as "No Results Yet", hiding a real production issue and sending users away from valid results.
- Fix recommendation: Distinguish "loaded and no results" from "could not determine result availability"; show retry and navigation actions for the latter.

## Medium

### 13. Sport workspace tab-load failures are swallowed

- File: `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:257`, `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:320`
- Root cause: Deferred tab loading catches rejected requests with an empty catch block and does not set a tab-specific error.
- User impact: Eligibility, Budgets, or Pool tabs can appear empty or stale with no explanation.
- Fix recommendation: Track per-section loading and error state, render a retry action in the active tab, and avoid marking the section as loaded after failures.

### 14. Festival auction setup fails the whole section if one owner fetch fails

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx:74`, `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx:80`, `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx:113`
- Root cause: Owner lookup for every team is done with `Promise.all`; one failed owner request rejects the entire setup load.
- User impact: Budget, retentions, and pool setup can be hidden because one team-owner endpoint failed.
- Fix recommendation: Use `Promise.allSettled` for owner lookups and render failed owner cards with retry while keeping the rest of the setup usable.

### 15. Sport Tournament setup mutations share one global saving state

- File: `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:325`, `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx:330`
- Root cause: All mutations use one `mutationInFlight` and `saving` flag across settings, teams, captains, budgets, pool, and auction config.
- User impact: A slow request in one section disables unrelated actions and can leave the whole workspace feeling stuck during demos.
- Fix recommendation: Track active action by operation key and keep unrelated sections interactive where safe.

### 16. Festival Dashboard and Sport Directory assume status is always present

- File: `ipl-auction-tracker/src/pages/FestivalDashboard.jsx:173`, `ipl-auction-tracker/src/pages/SportTournamentDirectory.jsx:244`
- Root cause: Both pages call `status.replaceAll(...)` without optional chaining or fallback.
- User impact: A partial list response can crash directory pages before users can open any item.
- Fix recommendation: Render `String(status || "unknown").replaceAll(...)` and log/report malformed records.

### 17. Sport Auction Hub refresh button has no in-flight guard

- File: `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:83`, `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:320`
- Root cause: Manual refresh starts `loadHub` without a `refreshing` or in-flight guard.
- User impact: Repeated clicks can issue overlapping hub loads and cause stale responses to win last.
- Fix recommendation: Add a refresh-in-flight guard or request sequence number, and disable the refresh button while loading.

### 18. Festival setup cache can briefly show stale state after external mutations

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx:139`, `ipl-auction-tracker/src/pages/FestivalDetail.jsx:186`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx:36`
- Root cause: Setup data is cached in memory for 45 seconds and only force-refreshes for mutations made in the same page. Changes made by another browser/session are not invalidated immediately.
- User impact: During multi-user demos, setup readiness or participant/team state can appear stale until refresh.
- Fix recommendation: Add visible "last refreshed" status and force-refresh on explicit setup progress checks or when returning from key mutation routes.

### 19. Direct URL not-found handling is inconsistent across deep pages

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx:139`, `ipl-auction-tracker/src/pages/SportTournamentCommandCenter.jsx:96`, `ipl-auction-tracker/src/pages/SportAuctionHub.jsx:98`
- Root cause: Some pages render a retry alert when primary data is missing, while others fall into stage-specific empty states or generic load errors.
- User impact: Bad IDs, deleted entities, or permission changes can lead to different and sometimes misleading user experiences.
- Fix recommendation: Standardize not-found/access-denied/load-failed states for Festival and Sport entity routes.

### 20. Festival import flow lacks client-side file validation feedback

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Root cause: The import dialog accepts CSV files but relies on the server for most validation and displays row errors only after upload.
- User impact: Demo imports with the wrong file shape can spend time uploading before users learn the format is invalid.
- Fix recommendation: Add lightweight client-side checks for extension, file size, and required headers before posting.

## Low

### 21. Festival auction pool empty row uses an incorrect column span

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx:798`
- Root cause: The auction pool table has six columns but the empty-state row uses `colSpan={5}`.
- User impact: Minor visual misalignment in empty pool/filter states.
- Fix recommendation: Set the empty row column span to match the table column count.

### 22. Festival creation does not validate registration open/close order client-side

- File: `ipl-auction-tracker/src/pages/FestivalDashboard.jsx:62`, `ipl-auction-tracker/src/pages/FestivalDashboard.jsx:71`
- Root cause: The create dialog validates Festival start/end dates but not registration open/close ordering before submit.
- User impact: Users can submit avoidable invalid payloads and only learn from server errors.
- Fix recommendation: Validate registration open and close timestamps locally before posting.

### 23. Account shell has no visible route-loading state after navigation

- File: `ipl-auction-tracker/src/App.jsx:64`
- Root cause: The route `Suspense` fallback is null, separate from the blank-page critical failure mode.
- User impact: Normal route transitions on slower devices can feel unresponsive because there is no loading indicator.
- Fix recommendation: Use a small shell-level route loading indicator that does not redesign the UI.

### 24. Disabled future account menu items look like product dead ends

- File: `ipl-auction-tracker/src/components/AppShell.jsx:229`
- Root cause: Notifications and Activity History are visible but disabled as future functionality.
- User impact: In production demos, visible unavailable navigation may be interpreted as incomplete product functionality.
- Fix recommendation: Hide planned-only menu items in production builds or move them behind a feature flag.

### 25. Empty results copy can be ambiguous during in-progress auctions

- File: `ipl-auction-tracker/src/components/FestivalHistory.jsx:179`, `ipl-auction-tracker/src/pages/SportAuctionResultsPage.jsx:180`
- Root cause: Empty result tables do not always distinguish "auction has not produced outcomes" from "history failed to load but page shell loaded".
- User impact: Users can misread missing data as no completed outcomes.
- Fix recommendation: Pair empty result tables with explicit load-status metadata and warnings when history failed.

## Cross-Flow Summary

The highest production-readiness risks are not core auction business-rule failures. They are resilience issues around partial API responses, auth/session expiry, socket room failures, and direct URL handling.

Most flows have basic loading and error states, and many mutation buttons have double-click guards. The remaining demo risks are concentrated in:

- Deep direct URLs after data is missing or inaccessible.
- Live auction pages when socket auth/reconnect fails.
- Setup tabs that assume complete nested payloads.
- Summary/directory surfaces that can render stale or empty cached data after failed refreshes.

Recommended production-hardening order:

1. Add route error boundary and visible route loading fallback.
2. Add global `401` handling and socket auth error handling.
3. Normalize readiness, pool, eligibility, and tournament payloads before rendering.
4. Standardize direct URL not-found/error states.
5. Make current live auction state independent from non-critical history loads.
6. Add explicit socket reconnect/room-join failure UI.
7. Prevent failed aggregate fetches from replacing good cached directory/dashboard data.
