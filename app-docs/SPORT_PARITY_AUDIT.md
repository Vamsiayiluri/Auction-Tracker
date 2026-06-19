# SPORT PARITY AUDIT

---

## 1. Executive Summary

The Festival auction flow is the mature reference implementation. It has a fully articulated setup wizard, a separated command-center dashboard, a management workspace (FestivalDetail.jsx), a rich auction hub with five tabs (Overview, Teams, Bid History, Results, Statistics), a dedicated standalone results page that lazy-loads FestivalHistory, and sticky lifecycle controls (FestivalControlCenter.jsx) that surface the Start / Pause / Resume / Complete actions from within the workspace. The Sport Tournament flow covers the same surface area at a shallower level in almost every dimension.

The Sport Tournament Command Center (SportTournamentCommandCenter.jsx) is a thin page — about 220 lines — compared to the Festival Command Center (FestivalCommandCenter.jsx) at 550 lines. The Sport Command Center has no live-activity feed, no recent-results section, no per-tournament setup-progress bar with step chips, and no blocker categorization. The Festival Command Center computes blockerCategory to group issues by type (Missing Owners, Missing Captains, Missing Budgets, Pool Not Generated) and shows them as typed ActionCards; the Sport Command Center lists raw blocker strings in plain Alerts.

The Sport Tournament Workspace (SportTournamentWorkspace.jsx) is well-built in isolation but diverges from FestivalDetail.jsx in several structural ways. Festival setup persists the active step to localStorage and restores it across sessions. Sport setup uses no session persistence for the active tab. Festival setup shows a FestivalConfigurationStatus card and a FestivalSetupWizard with a stepper that visualises per-step completion ticks. Sport setup has no equivalent visual progress wizard — it shows a plain Tabs bar with a raw "Readiness" section. The Festival workspace switches between a "configuration" mode (wizard) and an "operations" mode (tabs showing Overview, Teams, Owners, Retentions, Auction Preparation, Bid History, Results, Audit), with tab visibility gated by auction stage. Sport workspace has a single flat tab set that is always visible regardless of stage.

The Sport Auction Hub (SportAuctionHub.jsx) comes close to parity with FestivalAuctionHub.jsx and is actually slightly richer in some dimensions (it has a "Team Assignments" tab that Festival lacks). However, it is missing the readiness integration on load (Sport hub does not fetch /readiness to correctly identify the READY stage — it only uses tournament status), it has no participant search field in Bid History (Festival has participant text search + team filter; Sport has only team filter), and the Results tab inside the hub is a component rather than a standalone page (SportAuctionResultsPage.jsx is a one-line redirect to the hub), whereas Festival has a fully dedicated FestivalAuctionResultsPage.jsx with its own AuctionContextNavigation and lazy-loaded FestivalHistory component.

The FestivalControlCenter.jsx sticky control bar (which provides real-time readiness metrics, an auction status chip, and inline lifecycle buttons from within the FestivalDetail workspace) has no equivalent in SportTournamentWorkspace.jsx. The sport workspace shows a notice banner when the auction is locked but does not embed a live control surface. The SportTournamentControlCenter.jsx exists as a standalone component with metrics and a navigation button, but it is not used inside SportTournamentWorkspace — it appears to be an older component that predates the workspace redesign.

---

## 2. Missing Features

- **Festival Command Center live-activity feed**: FestivalCommandCenter.jsx computes `liveActivity` (combining festival and sport auctions that are live or paused) and renders them as `ActionCard` components in a DashboardGrid. SportTournamentCommandCenter.jsx has no equivalent live-activity section.

- **Festival Command Center recent-results feed**: FestivalCommandCenter.jsx computes `recentOutcomes` (last 6 sold/unsold results sorted by date) and renders them in a DashboardSection. SportTournamentCommandCenter.jsx shows no recent outcomes.

- **Festival Command Center setup-progress bar and step chips**: FestivalCommandCenter.jsx renders a `LinearProgress` bar, a `{completedSetupSteps} of {N} steps complete` label, and a row of per-step `Chip` components showing done/pending state. SportTournamentCommandCenter.jsx has a raw readiness percentage from `SportTournamentControlCenter` but no per-step completion breakdown.

- **Festival Command Center blocker categorisation**: FestivalCommandCenter.jsx maps each blocker message through `blockerCategory()` to produce typed categories (Missing Owners, Missing Captains, Missing Budgets, Pool Not Generated) shown in ActionCards. SportTournamentCommandCenter.jsx shows raw blocker strings in plain MUI Alert components.

- **Sticky lifecycle control surface in workspace**: FestivalDetail.jsx renders `FestivalControlCenter` inside a `position: sticky` Card whenever the auction is past setup stage (`operationsView && !setupStage`). This embeds Start/Pause/Resume/Complete buttons with readiness metrics directly in the workspace without leaving the page. SportTournamentWorkspace.jsx has no sticky control surface — lifecycle actions require navigating to a separate page.

- **Workspace mode toggle (Configuration vs Operations)**: FestivalDetail.jsx provides a full-width two-tab toggle (`Edit Festival Configuration` vs `Setup Sections`) that switches between the step wizard and the operations tabs. SportTournamentWorkspace.jsx has a single flat tab bar with no equivalent mode separation.

- **Festival Setup Wizard stepper with completion ticks**: FestivalSetupWizard.jsx renders a `Stepper` (desktop) and `MobileStepper` (mobile) with per-step `completed` flags derived from `getSetupCompletion(readiness)`. Clicking any step tile navigates directly to it. SportTournamentWorkspace.jsx has flat Tabs and no visual progress stepper.

- **localStorage tab persistence in workspace**: FestivalDetail.jsx persists `activeTab` to `localStorage` under key `festival-workspace-tab:${festivalId}` and restores it on load, including honouring a `?section=` query param. SportTournamentWorkspace.jsx uses no localStorage persistence for `activeSection`.

- **`?section=` deep-link support in workspace**: FestivalDetail.jsx reads `searchParams.get("section")` and activates the matching tab on mount. SportTournamentWorkspace.jsx ignores query params for deep-linking into a setup section.

- **Audit Log tab in operations view**: FestivalDetail.jsx has an "Audit" operations tab that renders `<FestivalHistory sections={["Audit Log"]} />`. SportTournamentWorkspace.jsx has no equivalent audit log surface.

- **Bid History tab in operations workspace**: FestivalDetail.jsx has a `Bid History` operations tab that renders `<FestivalBidHistory>`. SportTournamentWorkspace.jsx does not expose bid history from the workspace; it is only available in the Auction Hub.

- **Results tab in operations workspace**: FestivalDetail.jsx has a `Results` operations tab that renders `<FestivalHistory sections={["Auction Results"]} />` from within the workspace. SportTournamentWorkspace.jsx has no results tab in the workspace.

- **Dedicated standalone results page with full navigation**: FestivalAuctionResultsPage.jsx is a standalone page with its own stage check, AuctionContextNavigation, page header, lazy-loaded FestivalHistory, and empty-state guard. SportAuctionResultsPage.jsx is a one-line file (`return <SportAuctionHub initialSection="Results" />`), which renders the hub with a pre-selected tab rather than a self-contained results page.

- **Participant CSV import with progress bar and error list**: FestivalDetail.jsx (step 1) includes a full CSV import flow: template download, file picker, `LinearProgress` upload progress, import result summary (processed/succeeded/failed), a detail breakdown (employees created/updated, participants created, sports added/removed), and a per-row error list. Sport Tournament setup has no CSV import capability for participants.

- **"Add All Employees" bulk participant action**: FestivalDetail.jsx provides an "Add All Employees To Festival" button that calls `/v2/festivals/${festivalId}/participants/add-all`. Sport Tournament setup has no equivalent bulk-add.

- **Participant bulk-remove with selection**: FestivalDetail.jsx allows selecting multiple participants via checkboxes then clicking "Remove Selected Participants". Sport Tournament setup has no participant management surface.

- **Participant sport-selection dialog (individual and bulk assign)**: FestivalDetail.jsx has a "Select Sports" per-row action and a "Bulk Assign Sports" action for selected participants that opens a dialog with festival sports checkboxes. Sport Tournament has no equivalent UI.

- **Team Building Mode (Auction vs Manual) selector**: FestivalDetail.jsx (step 0) includes a `RadioGroup` for choosing `rosterFormationMode` (auction / manual), which gates whether the auction-specific setup steps are shown. Sport Tournament has no such mode concept.

- **FestivalConfigurationStatus card in workspace**: FestivalDetail.jsx shows `<FestivalConfigurationStatus>` at the top of configuration view which gives a live summary of the festival's configuration completion. No equivalent summary card in SportTournamentWorkspace.jsx.

- **Role-separated hub empty states for READY stage (admin vs owner)**: FestivalAuctionHub.jsx shows different ProductStateCard messages for the READY stage depending on `state?.viewer?.isAdmin` vs `state?.viewer?.isOwner`. SportAuctionHub.jsx groups admin/owner empty state but does not differentiate between owner and spectator for the READY case — it handles `canBid` but not `isOwner` as a distinct role.

- **Search/participant filter in Bid History**: FestivalAuctionHub.jsx has both a "Winning Team" Select filter and a free-text "Participant" TextField for filtering bid history. SportAuctionHub.jsx Bid History has only the team filter; there is no participant name search.

- **Readiness fetch on hub load to correctly identify READY stage**: FestivalAuctionHub.jsx fetches `/v2/festivals/${festivalId}/auction/readiness` in its `Promise.allSettled` load sequence specifically to allow the hub to show a READY pre-launch state card. SportAuctionHub.jsx does not fetch readiness; it derives the stage only from tournament status, so the READY stage is only reachable if the tournament status is exactly `"ready"` — it will not be shown if status is `"setup"` but readiness is READY.

- **`shouldApplyAuctionSnapshot` revision guard on socket updates**: FestivalAuctionHub.jsx and FestivalLiveAuction apply `shouldApplyAuctionSnapshot(lastRevision.current, payload)` before applying a socket snapshot, preventing stale or out-of-order updates. SportAuctionHub.jsx applies the snapshot unconditionally after the scopeType/scopeId check, with no revision guard. (SportAuctionArena.jsx does use `shouldApplyAuctionSnapshot` correctly.)

- **Reconnect handling in hub socket listener**: FestivalAuctionHub.jsx registers `socket.on("connect", join)` so the festival room is rejoined after reconnects, and cleans up with `socket.off("connect", join)`. SportAuctionHub.jsx has no reconnect handler — if the socket disconnects and reconnects the hub will stop receiving updates until manually refreshed.

---

## 3. Missing UX Improvements

- **Snackbar for success notices in workspace**: FestivalDetail.jsx uses a `Snackbar` + filled `Alert` for success notices (appearing bottom-right, auto-hiding after 4 000 ms). SportTournamentWorkspace.jsx uses an inline `Alert severity="success"` that appears at the top of the page and requires manual dismissal — less disruptive on a long page.

- **Notice auto-dismiss timer**: FestivalDashboard.jsx uses a manual-close Alert for the festival-created notice. SportTournamentDirectory.jsx uses a similar inline Alert. Neither Sport page uses a `Snackbar` for success feedback, whereas Festival Detail does.

- **LoadingStateCard on initial hub load (not CircularProgress)**: Festival pages consistently use `<LoadingStateCard title="..." message="..." />` for full-page loading states. SportTournamentCommandCenter.jsx uses a raw `<CircularProgress>` centered in a Box — no title, no message, no context for the user.

- **Retry action on error Alert in command center**: FestivalCommandCenter.jsx shows `<Alert action={<Button onClick={data.reload}>Retry</Button>}>`. SportTournamentCommandCenter.jsx wraps the error in `<Alert action={<Button onClick={load}>Retry</Button>}>` for the tournament-not-found case but uses a plain `<Alert severity="warning">` without a retry action for soft errors inside the page (the error state after partial load).

- **Contextual label variation for CTA button by stage**: FestivalDetail.jsx dynamically labels the workspace header CTA as "Continue Setup", "Open Auction Arena", or "View Auction Details" based on the current stage. SportTournamentWorkspace.jsx does the same (headerCta) — this parity is good. However FestivalCommandCenter.jsx provides three-tier stage-variant CTAs (Continue Setup, Open Auction Arena, Open Live Auction, View Results, Create Sport Tournament) while SportTournamentCommandCenter.jsx shows a single primary button.

- **Stage-based tab visibility (hiding Auction Preparation, Bid History, Results during setup)**: FestivalDetail.jsx computes `visibleOperationTabs` to hide certain tabs when `setupStage` is true — users don't see Auction Preparation, Bid History, or Results tabs until setup is complete. SportTournamentWorkspace.jsx shows all tabs (Overview, Teams, Captains, Eligibility, Budgets, Pool, Readiness, Settings) at all stages, including after the auction has completed, when Budgets and Pool tabs are read-only but remain confusingly present.

- **Configuration-locked banner with specific explanation**: FestivalDetail.jsx renders two different Alert banners (`isLiveStage` vs `isCompletedStage`) with specific messages about what is locked and why. SportTournamentWorkspace.jsx shows a single generic `severity="info"` banner when `canManage && !canEditSetup` without differentiating live vs completed.

- **"Open Live Auction" / "View Results" hub header CTA adapts to completion stage**: FestivalAuctionHub.jsx changes the header Button label between "Open Live Auction" and "View Results" based on `isCompletedStage(festivalStage)`. SportAuctionHub.jsx does the same using `auctionStatus === "auction_completed"` — parity exists, but the Sport version uses a raw status string rather than the stage helper, making it less robust to future status additions.

- **Section URL query-param sync in hub**: FestivalAuctionHub.jsx calls `setSearchParams(value === "Overview" ? {} : { section: value })` on tab change, keeping the URL in sync. SportAuctionHub.jsx does the same — parity exists. However Sport uses `initialSection` prop as an override (for SportAuctionResultsPage), creating the awkward pattern where the results page is not a real standalone page but a hub instance with a tab override, meaning the URL on the results page is `/sport-tournaments/:id/results` but the rendered component has `initialSection="Results"` and navigates away to the hub URL when any other tab is selected.

- **"My Team" metrics highlight in hub Overview**: SportAuctionHub.jsx shows a highlighted `bgcolor="primary.main"` card for the viewer's team with remaining credits, players bought, slots remaining, and bid activity. FestivalAuctionHub.jsx also shows viewer team metrics but renders them inside a standard `HubMetrics` grid row without the coloured highlight card. This is one area where Sport is actually more polished than Festival.

---

## 4. Missing Stability Fixes

- **Null-festival guard in loadWorkspace (API returning null data)**: FestivalDetail.jsx has an explicit comment and guard: `if (nextFestival) { setFestival(nextFestival); } else { console.warn(...) }`. SportTournamentWorkspace.jsx does `setTournament(tournamentResponse.data.data)` without guarding against a null API response — a null would overwrite a valid prior state with null and hide the workspace.

- **refreshInFlight ref guard against concurrent invalidation calls**: FestivalDetail.jsx tracks `refreshInFlight.current` to skip concurrent `invalidateFestivalSetup` calls (double-clicks, step-change + mutation racing). SportTournamentWorkspace.jsx tracks `mutationInFlight.current` per-mutation but has no equivalent guard on the composite refresh path; multiple rapid save actions could fire overlapping refreshes.

- **Promise.allSettled with partial-failure detection in loadWorkspace**: FestivalDetail.jsx uses `Promise.allSettled` in `invalidateFestivalSetup` and checks each settled result, surfacing a degraded-load warning when any sub-request fails. SportTournamentWorkspace.jsx `loadCore` uses `Promise.all`, which will reject entirely if any of the three sub-requests fails, potentially leaving the workspace in a blank error state even when two of three requests succeeded.

- **saveInFlight ref guard on create form**: FestivalDashboard.jsx uses `saveInFlight.current` to prevent double-create from double-clicking "Create Festival". SportTournamentDirectory.jsx uses the same pattern correctly — parity exists here.

- **Socket revision guard in hub**: As noted in section 2, SportAuctionHub.jsx does not call `shouldApplyAuctionSnapshot` before applying snapshots. Out-of-order or late-arriving socket payloads can overwrite newer state with stale data.

- **Socket reconnect room rejoin in hub**: As noted in section 2, SportAuctionHub.jsx does not handle `socket.on("connect", ...)` to re-join the auction room after a reconnect. After a reconnect the hub will silently stop receiving live updates until the user manually refreshes.

- **Optional-chaining null guard on readiness counts**: FestivalDetail.jsx has a specific comment explaining that `nextReadiness?.counts?.auctionStatus` correctly guards when `nextReadiness` is null. SportTournamentWorkspace.jsx accesses `auctionResponse.data.data?.config` and `readinessResponse.data.data` without equivalent null guards — if the API returns `{ data: { data: null } }` the destructuring assignments will produce null values that later cause rendering errors.

- **loadedSections Set prevents redundant tab fetches**: SportTournamentWorkspace.jsx correctly uses `loadedSections.current` to avoid re-fetching deferred data on every tab revisit — this is a good pattern not present in the older Festival workspace. No parity gap here.

- **Error boundary / fallback on lazy-loaded Festival components**: FestivalDetail.jsx wraps lazy-loaded tab content in `<Suspense fallback={<LoadingStateCard .../>}>`. SportTournamentWorkspace.jsx has no lazy-loaded components (all sections are rendered inline), so no Suspense is needed — but also means the initial JS bundle is larger.

---

## 5. Missing Navigation Patterns

- **Festival root URL redirect to command center**: `/festivals/:festivalId` redirects to `/festivals/:festivalId/command-center` via `FestivalRootRedirect`. There is no equivalent redirect for `/sport-tournaments/:sportTournamentId` — it renders `SportTournamentCommandCenter` directly, which is correct, but means there is no canonical root-redirect pattern that could be updated if the command-center path changes.

- **Command-center link in AuctionContextNavigation (admin-only, not null for non-admin)**: FestivalAuctionHub.jsx passes `commandCenter` conditionally (`state?.viewer?.isAdmin ? route : null`) so non-admin users do not see the command-center link. SportAuctionHub.jsx does the same with `canManage`. Parity exists here.

- **"Open Auction Arena" vs "View Auction Details" button gated by stage in Festival Command Center**: FestivalCommandCenter.jsx shows "Open Auction Arena" only when `readyStage`, "Open Live Auction" when `liveStage`, and falls back to "View Results" when `completedStage`. SportTournamentCommandCenter.jsx has equivalent stage-based primary actions via `primaryAction` memo. Structural parity exists but Festival CC is richer because it also shows Create Sport Tournament and Open Live Sport Auction as additional contextual actions.

- **`?section=` deep-link from FestivalDetail "Edit Budget" / "Manage Pool" buttons**: FestivalDetail.jsx includes two buttons in the Auction Preparation operations tab that call `setAdminWorkspaceMode("configuration"); setActiveStep(4)` or `setActiveStep(7)` to jump directly to specific wizard steps. Sport Tournament workspace has no equivalent cross-tab deep-link navigation between sections.

- **Navigate to results from workspace**: FestivalDetail.jsx has a "Results" tab in the operations view that renders results inline without leaving the workspace. The Sport workspace has no results tab — to see results the user must navigate to the Hub or the dedicated results redirect page.

- **FestivalCommandCenter link from FestivalDetail workspace header**: FestivalDetail.jsx's `AuctionContextNavigation` passes a `commandCenter` link. SportTournamentWorkspace.jsx passes the same link. Parity exists.

- **Back navigation from Sport results page**: SportAuctionResultsPage.jsx renders the hub with `initialSection="Results"` and when the user clicks any other tab the `selectSection` handler calls `navigate("/sport-tournaments/:id/auction-hub?section=...")`, navigating away from the results URL. This means the browser Back button from any non-results tab returns to the results URL which immediately redirects back to the same tab — an infinite navigation loop risk. FestivalAuctionResultsPage.jsx is a proper standalone page so no such loop exists.

---

## 6. Missing Results Features

- **Standalone results page**: Festival has `FestivalAuctionResultsPage.jsx` — a fully self-contained page with its own stage loading, empty-state, page header with `AuctionContextNavigation`, and lazy-loaded `FestivalHistory`. Sport's `SportAuctionResultsPage.jsx` is a one-line wrapper: `return <SportAuctionHub initialSection="Results" />`. The hub's results tab is a simple table with no page header, no separate navigation, and no empty-state guard based on stage.

- **FestivalHistory results component vs inline table**: FestivalAuctionResultsPage.jsx delegates rendering to `<FestivalHistory sections={["Auction Results"]} />`, which is a separate lazy-loaded component with its own data fetching, retentions grouping, and rich presentation. Sport results render a raw `SportResultsTable` function component defined inline at the bottom of SportAuctionHub.jsx. The Sport table shows: Participant, Winning Team, Purchase Amount, Acquisition Type, Purchase Order, Status — which is close to the Festival equivalent — but it lacks any grouping by team, retention information, and a "retentions vs auction" breakdown.

- **Results page empty-state guard based on auction stage**: FestivalAuctionResultsPage.jsx checks `isSetupStage(festivalStage)` and renders a `ProductStateCard` with "No Results Yet" message. SportAuctionResultsPage.jsx (being the hub) shows an empty table without a stage-aware empty state — a user visiting the results URL before any auction has started will see an empty `SportResultsTable` with the generic "No results available yet" row, not an informative empty state.

- **Retentions vs auction purchases distinction in results**: The Festival results (via FestivalHistory) tracks retentions vs auction acquisitions. Sport results only show "Auction" as the acquisition type column value for all sold participants (hardcoded to "Auction" in `SportResultsTable`).

- **Summary metrics on the standalone results page**: FestivalAuctionResultsPage.jsx (via FestivalHistory) includes team-level summaries. Sport results on the hub Results tab show `HubMetrics` with Sold, Unsold, and Final Spend counts, but these are only visible when on the Results tab, not on a dedicated page.

---

## 7. Missing Reporting Features

- **Bid History tab full-text participant search**: FestivalAuctionHub.jsx Bid History has a `TextField` participant filter in addition to the team select. SportAuctionHub.jsx Bid History has only the team select.

- **Statistics tab Highest/Lowest Sale with participant name detail**: FestivalAuctionHub.jsx Statistics shows `HubMetric` for Highest Sale with `detail={highestSaleRound ? participantName(highestSaleRound) : undefined}` and the same for Lowest Sale. SportAuctionHub.jsx Statistics shows highest/lowest values but without the participant name detail prop — the `HubMetric` `detail` prop is not passed, so the context "who was the highest sale" is not visible.

- **Team Spending section with per-team progress bars in Statistics**: Both Festival and Sport Statistics show per-team spending with `HubProgress` bars. Parity exists here. However Festival Statistics uses `state?.teamSummaries` from the auction state (which includes `spentBudget` directly from the server), while Sport calculates spent as `allocated - remaining`, which could show inaccurate values if allocated credits differ from effective budget due to adjustments.

- **"Accepted Bids" metric in Overview**: FestivalAuctionHub.jsx Overview shows a fourth HubMetric for "Accepted Bids" (total bid count across all rounds). SportAuctionHub.jsx Overview shows Credits Spent, Credits Remaining, Players Sold, and Remaining — no total bid count metric.

- **Auction order column direction**: FestivalAuctionHub.jsx Results tab shows `#{results.length - index}` as Auction Order (so #1 = earliest). SportResultsTable uses the same formula. Parity exists.

- **FestivalBidHistory component with additional filters**: FestivalDetail.jsx uses a `<FestivalBidHistory>` lazy-loaded component in its operations Bid History tab. This component may have richer filtering than the hub's BidHistorySummary. The Sport workspace has no equivalent component.

- **Audit log / change history surface**: FestivalDetail.jsx has a dedicated "Audit" operations tab rendering `<FestivalHistory sections={["Audit Log"]} />` which shows administrative actions taken on the festival. Sport Tournament has no audit log surface anywhere in the flow.

---

## 8. Status Consistency Gaps

| Surface | Festival Handling | Sport Tournament Handling | Gap |
|---|---|---|---|
| Command Center loading state | `<LoadingStateCard title="Loading Festival Operations" ...>` | `<CircularProgress>` in centered Box | Sport uses raw spinner, no context |
| Workspace loading state | `<LoadingStateCard title="Loading Festival Setup" ...>` | `<LoadingStateCard title="Loading Sport Tournament Setup" ...>` | Consistent |
| Hub loading state | `<LoadingStateCard title="Loading Festival Auction Details" ...>` | `<LoadingStateCard title="Loading Sport Auction Details" ...>` | Consistent |
| Arena loading state | `<LoadingStateCard ...>` | `<LoadingStateCard ...>` | Consistent |
| Hub SETUP stage (admin) | ProductStateCard "Auction Setup Incomplete" with Continue Setup + View Overview | ProductStateCard "Auction Setup Incomplete" with Continue Setup + View Overview | Consistent |
| Hub SETUP stage (owner) | ProductStateCard "Waiting For Festival Setup" | ProductStateCard "Waiting For Tournament Setup" (via `canBid`) | Consistent |
| Hub SETUP stage (spectator) | ProductStateCard "Festival Auction in Setup" | Shown as same as owner SETUP branch | Spectator not separately addressed in Sport |
| Hub READY stage | ProductStateCard with admin vs owner message split | ProductStateCard with `canBid` split | Festival splits on `isAdmin` + `isOwner`; Sport splits on `canBid` only |
| Hub READY stage — readiness loaded? | Yes — hub fetches /readiness, READY stage is derived from all three sources | No — hub does not fetch /readiness; READY only if status = "ready" | Sport may show SETUP state when tournament is actually READY |
| Workspace locked state banner | Two banners: distinct for LIVE (warning, lists locked items) vs COMPLETED (info) | Single generic banner `canManage && !canEditSetup` | Sport does not differentiate live vs completed lock state |
| Results page type | Standalone full page with stage guard and navigation | One-line redirect to hub with tab override | Sport results is not a real page |
| Success notice presentation | Snackbar bottom-right (FestivalDetail) | Inline top Alert (SportTournamentWorkspace) | Inconsistent pattern |
| Socket reconnect handling | Hub re-joins room on connect event | Hub has no reconnect handler | Sport hub loses live updates after disconnect |
| Snapshot revision guard | `shouldApplyAuctionSnapshot` called in Festival hub | Not called in SportAuctionHub | Sport hub susceptible to stale-socket overwrite |
| Blocker display in command center | Typed ActionCards with categorised headings | Raw Alert list | Festival is more actionable |
| Setup progress in command center | LinearProgress + step chips with per-step done/pending | Readiness score percentage (from SportTournamentControlCenter, not directly in command center page) | Festival command center has richer progress display |

---

## 9. High Priority Fixes

1. **Add readiness fetch to SportAuctionHub load sequence** (`SportAuctionHub.jsx`). The hub currently cannot correctly identify the READY pre-launch stage without fetching `/v2/sport-tournaments/${id}/readiness`. Without this fix, a tournament that is fully configured but not yet started will show a SETUP empty state in the hub instead of the correct READY pre-launch card. Mirror the FestivalAuctionHub pattern: include readiness in the `Promise.allSettled` load and pass it to `getSportAuctionStageFromState`.

2. **Add socket reconnect handler to SportAuctionHub** (`SportAuctionHub.jsx`). After a socket disconnect and reconnect the hub silently stops receiving live auction-state events because the sport auction room is never rejoined. Add `socket.on("connect", () => socket.emit("join-sport-auction", { sportTournamentId: Number(id) }))` in the socket useEffect and clean it up on unmount. This is the same fix FestivalAuctionHub.jsx already has.

3. **Add `shouldApplyAuctionSnapshot` revision guard to SportAuctionHub socket handler** (`SportAuctionHub.jsx`). The hub applies any sport-scoped payload unconditionally. Late-arriving or replayed payloads can overwrite newer in-memory state. Add `lastRevision.current` tracking and gate the setState calls behind `shouldApplyAuctionSnapshot`, mirroring FestivalAuctionHub.jsx.

4. **Convert SportAuctionResultsPage to a real standalone page** (`SportAuctionResultsPage.jsx`). The current one-line redirect causes URL/navigation inconsistency: clicking any tab in the hub navigates away from `/sport-tournaments/:id/results`, and the browser Back button creates a redirect loop. Create a proper standalone page mirroring FestivalAuctionResultsPage.jsx with its own loadStage, stage guard, page header, AuctionContextNavigation, and rendered results content (using SportResultsTable or a Sport-specific history component).

5. **Replace CircularProgress with LoadingStateCard in SportTournamentCommandCenter** (`SportTournamentCommandCenter.jsx`). The command center is the landing page for the tournament. Using a raw spinner with no title or message while loading is inconsistent with every other page in the app and gives the user no context. Replace with `<LoadingStateCard title="Loading Sport Tournament" message="Checking setup status, readiness, and auction state." />`.

6. **Guard against null API response in SportTournamentWorkspace loadCore** (`SportTournamentWorkspace.jsx`). Replace `Promise.all` with `Promise.allSettled` so a failure in one sub-request (readiness or auction) does not abort the whole load. Set state only when the corresponding result is fulfilled. This mirrors the defensive pattern in FestivalDetail.jsx's `invalidateFestivalSetup`.

---

## 10. Medium Priority Fixes

1. **Add participant name search field to SportAuctionHub Bid History** (`SportAuctionHub.jsx`). Festival hub has a `TextField` for participant name filtering alongside the team Select. Sport hub has only the team filter. Add a `participantFilter` state and a TextField, and filter `rounds` by `getParticipantName(round).toLowerCase().includes(participantFilter.toLowerCase())`.

2. **Surface "Accepted Bids" count in SportAuctionHub Overview** (`SportAuctionHub.jsx`). Festival Overview shows a fourth HubMetric for total accepted bids across all rounds. Replace one of the less-informative Sport metrics (e.g. Credits Remaining which is also in the My Team card) with a bid-count metric, or add a fifth metric.

3. **Add participant name detail to Highest/Lowest Sale metrics in SportAuctionHub Statistics** (`SportAuctionHub.jsx`). Festival Statistics passes `detail={participantName}` to HubMetric for highest and lowest sale. Find the corresponding rounds in Sport (reduce over soldRounds as Festival does) and pass the participant name as the `detail` prop to HubMetric.

4. **Add per-step setup progress (stepper or chips) to SportTournamentCommandCenter** (`SportTournamentCommandCenter.jsx`). Festival Command Center shows a LinearProgress bar and a row of step chips (e.g. "Teams: done", "Captains: done", "Budgets: pending"). Sport Command Center shows only a raw readiness percentage. Add a per-step breakdown based on `readiness.counts` (configuredTeams, captainsAssigned, budgetsConfigured, poolGenerated) mapped to readable step labels and chips.

5. **Add blocker categorisation to SportTournamentCommandCenter** (`SportTournamentCommandCenter.jsx`). Festival CC maps each blocker string through `blockerCategory()` to show typed ActionCards. Sport CC shows raw strings in plain Alerts. Adopt the same categorisation pattern (or a simplified version using Chip labels instead of ActionCards) to make setup issues more actionable.

6. **Add success Snackbar to SportTournamentWorkspace** (`SportTournamentWorkspace.jsx`). The workspace currently uses an inline `Alert severity="success"` at the top of the page. Replace with a `Snackbar` anchored bottom-right with autoHideDuration=4000, matching the pattern in FestivalDetail.jsx. This prevents success notices from pushing content down or requiring manual dismissal.

7. **Persist activeSection to localStorage in SportTournamentWorkspace** (`SportTournamentWorkspace.jsx`). Festival workspace saves the active tab on change and restores it on load. Add `localStorage.setItem(\`sport-workspace-tab:${sportTournamentId}\`, activeSection)` on change and read it on initial state. This matches the festival experience where returning to the workspace reopens the last-viewed tab.

8. **Add `?section=` deep-link support to SportTournamentWorkspace** (`SportTournamentWorkspace.jsx`). Read `useSearchParams` on mount and set `activeSection` from `searchParams.get("section")` if it matches one of the known sections. This allows external links to jump directly to, for example, the Budgets or Readiness tab.

9. **Add stage-based tab visibility to SportTournamentWorkspace** (`SportTournamentWorkspace.jsx`). After the auction is live or completed, the Budgets, Pool, and Eligibility tabs are read-only but still visible and confusing. Mirror FestivalDetail's `visibleOperationTabs` pattern: hide setup-only tabs when the tournament is past the setup stage. At minimum, show a clear "locked" message inside each tab when `!canEditSetup`.

10. **Differentiate LIVE vs COMPLETED lock-state banners in SportTournamentWorkspace** (`SportTournamentWorkspace.jsx`). The current single generic `severity="info"` banner does not tell the user whether the auction is live (and will resume bidding) or completed (and is read-only forever). Add two distinct banners using `isLiveStage` and `isCompletedStage`, mirroring FestivalDetail.jsx lines 807-819.

---

## 11. Low Priority Fixes

1. **Stage helper usage in SportAuctionHub header CTA** (`SportAuctionHub.jsx`). The header button currently checks `auctionStatus === "auction_completed"` directly rather than `isCompletedStage(sportStage)`. This is inconsistent with the stage abstraction used elsewhere and would fail if a future status string like "completed" were added. Replace with `isCompletedStage(sportStage)`.

2. **`SportTournamentControlCenter` component is unused in the workspace** (`SportTournamentControlCenter.jsx`). This component exists with a full metrics grid, status chip, and navigation button, but is not imported or rendered in `SportTournamentWorkspace.jsx` or `SportTournamentCommandCenter.jsx`. It appears to be an orphaned component from a prior architecture. Either integrate it into the command center or workspace, or document its intended use.

3. **FestivalControlCenter quick-action buttons are commented out** (`FestivalControlCenter.jsx`, lines 154-174). The Start / Pause / Resume / Complete action buttons inside the sticky control bar are wrapped in a JSX comment block. The `runAction` function and `getQuickActions` utility are fully implemented. Uncomment and enable these lifecycle buttons so the admin can control the auction from within the workspace without navigating away.

4. **Hardcoded "Auction" acquisition type in SportResultsTable** (`SportAuctionHub.jsx`, `SportResultsTable`). All sold participants show "Auction" in the Acquisition Type column. If the backend ever returns a retention or other acquisition type, it will be silently misrepresented. Change to use the round's actual `result.acquisitionType` field with a fallback to "Auction".

5. **Sport Command Center Chip status color for "ready" is "success"** (`SportTournamentDirectory.jsx`). The directory card uses explicit `color` conditions for each status string. The condition for `"ready"` maps to `"success"` while `"auction_live"` also maps to `"success"`. Consider using `"primary"` for ready (not yet live) to differentiate visually, matching how FestivalCommandCenter.jsx colours the READY stage differently from LIVE.

6. **Workspace Overview tab shows minimal content** (`SportTournamentWorkspace.jsx`). The Overview section renders four count Chips and a single Typography paragraph. FestivalDetail.jsx renders `<FestivalOverview readiness={readiness} />` (a dedicated lazy-loaded component). While this is a minor polish gap, enriching the Sport Overview tab with a readiness summary card (matching the style of SportTournamentControlCenter) would improve first-impression clarity.

7. **No "Refresh Progress" button in Sport workspace setup check** (`SportTournamentWorkspace.jsx`, Readiness tab). FestivalSetupWizard.jsx has an explicit "Refresh Progress" button that calls `onRefresh` to re-run the full invalidation. Sport workspace's Readiness tab has no refresh action — users must reload the page to re-check readiness after fixing a blocker outside the workspace.

8. **Auction order column shows descending number** (`SportAuctionHub.jsx`). The Results table shows `#{resultRounds.length - index}`, meaning the most recently sold participant is #1 and the earliest is #N. This is the same as FestivalAuctionHub.jsx. The label "Purchase Order" implies ascending order (first bought = #1). Consider labelling the column "Auction Round" or reversing the numbering to match the implied meaning. (This is a label clarity issue, not a functional bug.)

9. **Missing `Collapse` / expand for team rosters in SportAuctionHub Teams tab** (`SportAuctionHub.jsx`). `HubTeamCard` from `AuctionHubPrimitives.jsx` already implements a "Show N more players" expand/collapse button when roster length exceeds 6. The Sport Teams tab uses `HubTeamCard` correctly, so this feature exists. No gap here — just noting that any direct roster rendering outside HubTeamCard (e.g. Team Assignments tab) would not get collapse behaviour.

10. **Sport Directory card "Open Auction" vs "Open Workspace" label uses inline status array** (`SportTournamentDirectory.jsx`). The card CTA label and navigation target repeat the same `["ready", "auction_live", "auction_paused", "auction_completed"]` status array twice inline. Extract to a named constant (e.g. `LIVE_OR_READY_STATUSES`) to reduce duplication and ensure both the label and route logic stay in sync.

---

## 12. Recommended Implementation Order

1. **Add readiness fetch to SportAuctionHub** (High Priority #1) — corrects an incorrect stage display that would confuse all users trying to access a READY-but-not-started auction through the hub.

2. **Add socket reconnect handler to SportAuctionHub** (High Priority #2) — prevents live-auction updates from silently stopping after any brief connectivity blip; affects all live-auction participants.

3. **Add shouldApplyAuctionSnapshot guard to SportAuctionHub** (High Priority #3) — prevents stale socket payloads from corrupting in-memory bid state; a correctness fix that should accompany item 2 in the same commit.

4. **Convert SportAuctionResultsPage to a real standalone page** (High Priority #4) — eliminates the URL loop bug and gives the results surface a proper page identity with navigation, matching all other results pages in the app.

5. **Replace CircularProgress with LoadingStateCard in SportTournamentCommandCenter** (High Priority #5) — a one-line change with high user-experience impact; the command center is the first page a user lands on.

6. **Guard loadCore against null API responses (Promise.allSettled)** (High Priority #6) — a defensive stability fix; prevents a bad readiness or auction response from wiping the tournament workspace.

7. **Add participant name search to SportAuctionHub Bid History** (Medium Priority #1) — fills the most visible functional gap in the Hub compared to FestivalAuctionHub.

8. **Add per-step setup progress chips to SportTournamentCommandCenter** (Medium Priority #4) — improves setup visibility for admins and team owners on the command center's "continue setup" surface.

9. **Add blocker categorisation to SportTournamentCommandCenter** (Medium Priority #5) — makes the setup-issues section actionable instead of showing raw strings.

10. **Add success Snackbar to SportTournamentWorkspace** (Medium Priority #6) — aligns the success-feedback pattern across all workspace pages; the current inline Alert is disruptive on a long workspace page.

11. **Persist activeSection to localStorage + add ?section= deep-link support** (Medium Priority #7 + #8) — improves workspace ergonomics for admins who frequently return to the same section; implement together in one pass.

12. **Stage-based tab visibility in SportTournamentWorkspace** (Medium Priority #9) — reduces noise for post-auction views; straightforward guard on the tab list.

13. **Differentiate LIVE vs COMPLETED lock banners in SportTournamentWorkspace** (Medium Priority #10) — a two-Alert substitution; low effort, clear UX improvement.

14. **Add Highest/Lowest Sale participant detail to Statistics** (Medium Priority #3) — a prop addition to two existing HubMetric calls; small change with reporting value.

15. **Add "Accepted Bids" metric to Hub Overview** (Medium Priority #2) — adds the one metric present in Festival Overview that is absent in Sport Overview.

16. **Fix stage helper usage in SportAuctionHub header CTA** (Low Priority #1) — a minor consistency fix; use `isCompletedStage(sportStage)` instead of raw status comparison.

17. **Audit and either integrate or remove SportTournamentControlCenter** (Low Priority #2) — resolve the orphaned component; either connect it to the command center or remove it to avoid confusion.

18. **Uncomment FestivalControlCenter lifecycle buttons** (Low Priority #3) — the Festival workspace sticky bar has its action buttons commented out; re-enabling them is a one-line change that restores intended functionality.

19. **Fix hardcoded "Auction" in SportResultsTable** (Low Priority #4) — correctness improvement for acquisition type display.

20. **Add Refresh button to Sport Readiness tab** (Low Priority #7) — low-effort quality-of-life improvement so admins can re-check readiness after fixing a blocker without a full page reload.
