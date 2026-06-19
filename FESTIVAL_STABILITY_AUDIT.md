# Festival Stability Audit

Scope: Festival Creation, Festival Setup, Festival Configuration, and Festival Launch.

Path audited:

1. Create Festival
2. Participants
3. Teams
4. Owners
5. Auction Config
6. Ready
7. Launch

This is audit-only. No fixes were implemented.

## Executive Summary

Festival flow has solid double-click guards on most mutation buttons and server-side transactions around major setup and auction mutations. The main stability risks are:

- A backend readiness bug that can make readiness and launch fail.
- Stale client setup state caused by in-memory cache and skipped refreshes.
- Section-level refresh conflicts between active step, cached data, and forced refreshes.
- Setup status inconsistencies between `festival.status`, `lockState`, `FestivalAuctionConfig.auctionStatus`, and readiness.
- Null guard gaps in readiness and list rendering.

## Critical Issues

### 1. Readiness calculation references an undefined variable

- File: `ipl-auction-tracker-backend/src/utils/festivalReadiness.js`
- Area: Ready, Launch
- Root cause: `setupSteps.participants` uses `participants.length > 0`, but only `participantCount` exists in the function.
- Risk type: readiness inconsistency, app-breaking scenario
- User impact: Readiness endpoint can throw a `ReferenceError`, causing `/auction/readiness` to return 500. Launch also calls `getFestivalReadiness` inside `startFestivalAuction`, so an otherwise ready Festival can fail to launch.
- Fix recommendation: Replace `participants.length > 0` with `participantCount > 0`, and add a regression test for readiness with registered participants and sports.

### 2. Readiness UI assumes all readiness subfields exist

- File: `ipl-auction-tracker/src/components/FestivalReadiness.jsx`
- Area: Ready
- Root cause: The component reads `readiness.overallStatus.replace`, `readiness.counts[key]`, `readiness.teams.map`, and `readiness.blockers.length` without normalizing the payload.
- Risk type: missing null guards
- User impact: A partial readiness payload or backend regression can crash the Review & Launch step.
- Fix recommendation: Normalize readiness to default `{ counts: {}, teams: [], blockers: [] }` and render a warning when required fields are absent.

### 3. Launch depends on readiness but treats readiness errors as generic launch failure

- File: `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`
- Area: Launch
- Root cause: `startFestivalAuction` calls `getFestivalReadiness` in the launch transaction and only has a generic catch block for readiness calculation failures.
- Risk type: readiness inconsistency, setup status inconsistency
- User impact: Admins may see "Failed to start festival auction" instead of actionable setup blockers or a readiness service failure.
- Fix recommendation: Distinguish readiness calculation failure from "NOT_READY"; return a clear 500/422 response with a stable error code.

## High Issues

### 4. Forced refresh can use stale active-step requirements

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Participants, Teams, Owners, Auction Config
- Root cause: `invalidateFestivalSetup` calls `loadRegistrationData({ force: true })`, and `loadRegistrationData` decides what to fetch from the currently captured `activeStep`, `activeTab`, `configurationView`, and `operationsView`.
- Risk type: refresh conflict, stale state risk
- User impact: After a mutation and quick step navigation, the forced refresh can reload the wrong section or skip data needed by the newly visible step. The UI may show old participants/sports while readiness has already changed.
- Fix recommendation: Pass the intended section/step into refresh calls, or refresh all minimal setup primitives after mutations that change cross-step readiness.

### 5. Concurrent setup refreshes are skipped, not queued

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Participants, Teams, Owners, Auction Config, Ready
- Root cause: `refreshInFlight.current` causes later `invalidateFestivalSetup` calls to return early while a refresh is running.
- Risk type: race condition, stale state risk
- User impact: If two setup changes happen quickly, the second mutation can succeed but its follow-up refresh can be skipped. The page may keep readiness or participant/team state from the first mutation.
- Fix recommendation: Queue one follow-up refresh when a refresh is already in flight, or track a revision counter and rerun once after the active refresh completes.

### 6. Client cache can show stale setup data after external changes

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx`
- Area: Participants, Teams, Owners, Auction Config, Ready
- Root cause: Festival detail, sports, participants, catalog sports, and readiness use a 45-second in-memory cache. Mutations in the current page force refresh, but changes from another tab/session are not invalidated.
- Risk type: stale state risk, readiness inconsistency
- User impact: In demos with multiple admins or browser tabs, one user can see stale readiness and setup data even after another user changes teams, owners, or pool.
- Fix recommendation: Add explicit force-refresh on entering Review & Launch, on visibility regain, and before navigating to live auction.

### 7. Operations/configuration mode can become inconsistent with actual auction state

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Ready, Launch
- Root cause: The page derives `configurationView` from `adminWorkspaceMode` and `setupStage`, where `setupStage` depends on `festival`, cached `readiness`, and local `auctionStatus`.
- Risk type: setup status inconsistency
- User impact: A stale `auctionStatus` or readiness response can keep an admin in configuration mode after launch or hide Auction Preparation while the Festival is actually ready.
- Fix recommendation: Treat `FestivalAuctionConfig.auctionStatus` from `/auction/current` or a forced readiness refresh as authoritative when switching between setup and operations.

### 8. Owner lookup failure fails the whole auction setup section

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx`
- Area: Owners, Auction Config
- Root cause: `loadSetup` loads teams, retentions, pool, then uses `Promise.all` for per-team owner requests. One failed owner request rejects the entire section.
- Risk type: missing error isolation, refresh conflict
- User impact: Budget, owners, retentions, and pool can all disappear behind a generic "Unable to load main auction setup" message because one team owner endpoint failed.
- Fix recommendation: Use `Promise.allSettled` for owner lookups and render per-team owner load errors without blocking budget/pool visibility.

### 9. Auction setup loads all section data even when only one section is visible

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx`
- Area: Auction Config, Owners, Retentions, Auction Pool
- Root cause: `section` controls rendering only; `loadSetup` always loads teams, retentions, pool, and all owners.
- Risk type: refresh conflict, stale state risk
- User impact: A failure in retentions or pool can block the Budget step, even though Budget does not need those sections to render.
- Fix recommendation: Split setup loads by section or use best-effort all-settled loading with section-specific errors.

### 10. Start Auction button is exposed from Ready view without a fresh readiness check on the client

- File: `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`, `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Ready, Launch
- Root cause: The UI navigates to live auction based on cached stage/readiness; server launch validates readiness, but the client does not force-refresh before entering the launch path.
- Risk type: stale state risk, readiness inconsistency
- User impact: Admin sees "configured and ready" then Start Auction fails because the backend readiness has changed.
- Fix recommendation: Force-refresh readiness immediately before showing launch controls or before invoking `/auction/start`.

## Medium Issues

### 11. Festival list rendering assumes status is always present

- File: `ipl-auction-tracker/src/pages/FestivalDashboard.jsx`
- Area: Create Festival
- Root cause: Festival cards call `festival.status.replaceAll("_", " ")`.
- Risk type: missing null guard
- User impact: A partial Festival list response can crash the Festival dashboard before the admin can open or create a Festival.
- Fix recommendation: Use `String(festival.status || "unknown").replaceAll("_", " ")`.

### 12. Registration open/close ordering is not validated client-side during creation

- File: `ipl-auction-tracker/src/pages/FestivalDashboard.jsx`
- Area: Create Festival
- Root cause: The create dialog validates start/end dates but not registration open/close order.
- Risk type: setup status inconsistency
- User impact: Admin can submit invalid registration timing and only receive a server error after posting.
- Fix recommendation: Validate registration window ordering before submit and align with backend date validation.

### 13. Festival details edit does not validate registration fields

- File: `ipl-auction-tracker/src/components/FestivalDetailsConfiguration.jsx`
- Area: Festival Configuration
- Root cause: Details configuration only edits and validates name/code/start/end. It does not show or validate registration open/close even though creation supports them.
- Risk type: setup status inconsistency
- User impact: Admin cannot correct registration timing from the visible Festival Details step.
- Fix recommendation: Either display editable registration fields consistently or clearly route that configuration elsewhere.

### 14. Step completion can be based on stale readiness while section data is newer

- File: `ipl-auction-tracker/src/components/FestivalSetupWizard.jsx`, `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Participants, Teams, Owners, Ready
- Root cause: Step completion is calculated from `readiness.setupSteps`, while visible section tables come from separate participant/team/setup endpoints with independent fetch timing and cache entries.
- Risk type: readiness inconsistency
- User impact: A step may appear incomplete even after visible data shows it is complete, or vice versa.
- Fix recommendation: After setup mutations, refresh readiness last and update step completion only after dependent section refreshes settle.

### 15. Local-storage step resume can reopen an invalid step after status changes

- File: `ipl-auction-tracker/src/components/FestivalSetupWizard.jsx`, `ipl-auction-tracker/src/utils/festivalWorkspace.js`
- Area: Festival Setup
- Root cause: The stored step is restored by label without validating against current readiness, lock state, or auction lifecycle.
- Risk type: setup status inconsistency, stale state risk
- User impact: Returning to a Festival after launch or lock changes can open a setup step that is no longer actionable.
- Fix recommendation: Clamp restored setup step to the current lifecycle and first incomplete prerequisite.

### 16. Team builder uses all-or-nothing loading for teams and assignments

- File: `ipl-auction-tracker/src/components/FestivalTeamBuilder.jsx`
- Area: Teams
- Root cause: `loadTeamBuilder` uses `Promise.all` for teams and assignments.
- Risk type: refresh conflict
- User impact: If assignments fail, active teams cannot render even though team definitions loaded successfully.
- Fix recommendation: Load teams as the primary request and assignments as best-effort with a section-level warning.

### 17. Owner and retention actions rely on local pool availability

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx`
- Area: Owners, Retentions
- Root cause: Owner and retention candidate lists come from local `pool` state. If pool refresh is stale, the UI can offer candidates that the server later rejects.
- Risk type: stale state risk, race condition
- User impact: Admin may select a participant that has become retained, sold, current, or otherwise unavailable in another session.
- Fix recommendation: Refresh pool before opening owner/retention selection, or surface server conflict responses as "selection changed, reload candidates".

### 18. Bulk participant selection can act on stale visible participants

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- Area: Participants
- Root cause: Bulk remove and bulk sport assignment use `selectedParticipantIds` from local filtered participant state.
- Risk type: stale state risk
- User impact: If participants are changed externally, the selected IDs may include withdrawn or changed records and produce partial server failures.
- Fix recommendation: Clear selected IDs after any participant refresh and reconcile selections against latest registered participants before submit.

### 19. Readiness status and auction status use different sources in different views

- File: `ipl-auction-tracker/src/pages/FestivalDetail.jsx`, `ipl-auction-tracker/src/components/FestivalReadiness.jsx`, `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- Area: Ready, Launch
- Root cause: Setup page uses readiness counts, live auction uses `/auction/current` plus readiness, and setup shell also tracks local `auctionStatus`.
- Risk type: setup status inconsistency
- User impact: Different Festival pages can show different status labels around setup, ready, and live transitions.
- Fix recommendation: Centralize Festival stage derivation around one normalized state object and use it consistently across setup, readiness, hub, and live auction entry.

### 20. Launch page current-state load is coupled to history load

- File: `ipl-auction-tracker/src/components/MainFestivalAuction.jsx`
- Area: Launch
- Root cause: `loadAuction` uses `Promise.all` for `/auction/current` and `/auction/history`.
- Risk type: refresh conflict, app-breaking scenario
- User impact: A history endpoint failure can prevent the launch screen from rendering current auction controls.
- Fix recommendation: Make `/auction/current` critical and history best-effort.

## Low Issues

### 21. Auction pool empty row has a column count mismatch

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx`
- Area: Auction Pool
- Root cause: The pool table has six columns, but the empty row uses `colSpan={5}`.
- Risk type: empty-state problem
- User impact: Minor visual/layout inconsistency when no pool rows match the filter.
- Fix recommendation: Match `colSpan` to the table column count.

### 22. Retentions table has no explicit empty state

- File: `ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx`
- Area: Retentions
- Root cause: `filteredRetentions.map` renders rows, but no table row explains when there are no retentions or no filter matches.
- Risk type: empty-state problem
- User impact: Admin may interpret a blank table as a loading or rendering issue.
- Fix recommendation: Add a no-retentions/no-filter-results row.

### 23. Create Festival does not navigate to the new Festival

- File: `ipl-auction-tracker/src/pages/FestivalDashboard.jsx`
- Area: Create Festival
- Root cause: After successful creation, the page reloads the Festival list and shows a notice rather than navigating to the new Festival setup.
- Risk type: navigation dead end
- User impact: In demos, the admin has to locate the newly created Festival manually before setup.
- Fix recommendation: Return created Festival ID from the POST and navigate directly to `/festivals/:id/command-center` or `/manage`.

## Step-by-Step Stability Notes

### Create Festival

Current guards:

- Double-click submit guard exists with `saveInFlight`.
- Required name/code/start/end validation exists.

Main gaps:

- Missing null guard for list status.
- Registration window validation is incomplete client-side.
- Successful create leaves user on list instead of setup.

### Participants

Current guards:

- Mutations are serialized by `actionInFlight`.
- Backend uses transactions for bulk add/remove/import.

Main gaps:

- Forced refresh can skip or fetch the wrong active step.
- Selected participants can become stale after external changes.
- Cached participant data can lag readiness.

### Teams

Current guards:

- Team create/edit/delete and manual assignment actions are serialized.
- Backend locks rows in key setup mutations.

Main gaps:

- Team builder load is all-or-nothing.
- Local-storage step restore can reopen stale team setup.
- Readiness can fail due the backend `participants.length` bug before team completion is reflected.

### Owners

Current guards:

- Owner assignment has server-side transaction and conflict checks.
- UI prevents double-click owner assignment.

Main gaps:

- Owner lookup failure blocks the whole auction setup surface.
- Owner candidate list depends on possibly stale pool state.
- Owner readiness can differ between visible owner cards and cached readiness.

### Auction Config

Current guards:

- Server prevents owner cost changes after owners are assigned.
- UI disables owner cost when owners exist.

Main gaps:

- Budget step can be blocked by unrelated owner/retention/pool load failures.
- Client/server setup status can diverge around lock state and `auctionStatus`.

### Ready

Current guards:

- Server readiness is authoritative for launch.
- UI exposes refresh controls.

Main gaps:

- Backend readiness bug can break readiness entirely.
- Readiness UI lacks payload normalization.
- Step completion can be stale relative to section data.

### Launch

Current guards:

- Server launch runs inside a transaction.
- Server checks readiness before setting `auctionStatus` to live.
- UI serializes launch button clicks with `actionInFlight`.

Main gaps:

- Client may show stale "ready" state before launch.
- Launch failure messaging does not distinguish readiness-calculation failure from blockers.
- Current state and history are coupled in the live auction load.

## Recommended Fix Order

1. Fix `participants.length` in `festivalReadiness.js`.
2. Normalize readiness payloads in the UI.
3. Queue a follow-up setup refresh when `invalidateFestivalSetup` is called during an active refresh.
4. Force-refresh readiness before showing or invoking launch controls.
5. Split `FestivalAuctionSetup` loading by visible section or use all-settled partial rendering.
6. Decouple live auction current-state load from history load.
7. Standardize Festival stage derivation across setup, readiness, hub, and live auction entry.
8. Reconcile selected participants and candidate pools before bulk mutations.
