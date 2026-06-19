# Implementation Plan

Scope: seven focused areas, no Phase 5, no profile/settings, no mobile/a11y/bundle.

---

## Priority order and rationale

| # | Area | Why this order |
|---|------|---------------|
| 1 | Stage calculation consistency | Every downstream fix depends on correct stage. Bad stage = wrong nav, wrong visibility, wrong actions everywhere. |
| 2 | Setup-first experience | Builds directly on #1. Once stage is reliable, each surface shows the right state per role. |
| 3 | Duplicated actions / navigation | Safe to do after #2. Most duplication comes from stage-unaware quick-action blocks. |
| 4 | Results architecture consolidation | Depends on correct nav (#1) and stage gates (#2). Removes the duplicate Results tab in Hub. |
| 5 | Auction sale notifications | Self-contained Arena change. No dependency on earlier items. |
| 6 | Bid history redesign | Self-contained Hub change. No dependency on earlier items. |
| 7 | Team roster purchase amount visibility | Self-contained HubTeamCard change. No dependency on earlier items. |

Items 5–7 are independent and can be done in any order.

---

## Item 1 — Stage calculation consistency

### What is broken

**Bug A — `shouldShowInAuctionDirectory` includes SETUP**

`auctionStages.js:123–128` returns `true` for every stage including SETUP.
`AuctionDirectory.jsx:188–206` filters using this function.
Result: setup-stage Festivals and Sport Tournaments appear in the Auction
Directory as actionable auctions.

**Bug B — `SportTournamentCommandCenter` passes no `stage` to `AuctionContextNavigation`**

`SportTournamentCommandCenter.jsx:119–126` calls `<AuctionContextNavigation>`
with no `stage` prop. The component falls through to the default case
(`auctionStages.js:43–49`) and renders all five tabs (Overview, Setup, Auction
Details, Live Auction, Results) regardless of actual auction stage.

**Bug C — `FestivalAuctionHub` passes no `stage` to `AuctionContextNavigation`**

`FestivalAuctionHub.jsx:243–257` calls `<AuctionContextNavigation>` without a
`stage` prop — same all-five-tabs fallback.

**Bug D — `SportAuctionHub` passes no `stage` to `AuctionContextNavigation`**

`SportAuctionHub.jsx:268–269` spreads `{...routes}` but no `stage` prop —
same fallback.

**Bug E — `AuctionContextNavigation` default case shows all five tabs**

`AuctionContextNavigation.jsx:43` — when `stage` is undefined or unknown the
fallback renders every tab. Should fall back to SETUP behavior (Overview +
Setup only) so that a missing stage never over-exposes post-launch tabs.

### Fixes

1. `auctionStages.js`: `shouldShowInAuctionDirectory` returns false for SETUP.
2. `auctionStages.js`: export `getSportAuctionStageFromState` parallel to the
   Festival equivalent, accepting `{ tournament, readiness, auction }`.
3. `SportTournamentCommandCenter.jsx`: import `getSportAuctionStage`,
   compute stage from `tournament.status` + `readiness?.ready`, pass to nav and
   primary-action logic.
4. `FestivalAuctionHub.jsx`: import `getFestivalAuctionStage`, compute stage
   from `auctionStatus`, pass to nav.
5. `SportAuctionHub.jsx`: import `getSportAuctionStage`, compute stage from
   `auctionStatus` + `canManage`, pass to nav.
6. `AuctionContextNavigation.jsx`: change fallback to SETUP items only.

---

## Item 2 — Setup-first experience

### What is broken

- `SportTournamentCommandCenter` Quick Actions always shows "Open Live Auction"
  and "View Results" regardless of stage.
- `SportTournamentCommandCenter` has no per-role waiting state (owner, captain,
  spectator see the same page as the manager).
- `SportTournamentWorkspace` passes no stage to `AuctionContextNavigation`.
- `SportAuctionHub` guards only on `canManage` + raw `auctionStatus` string, not
  the computed stage — misses READY state for captains.
- `FestivalAuctionHub` early exit uses `auctionStatus === "setup"` raw string
  comparison instead of the computed stage.

### Fixes

Per-stage action matrix for Sport Tournament Command Center:
- SETUP + canManage: primary = "Continue Setup", no Live Auction, no Results.
- SETUP + !canManage: `ProductStateCard` "Waiting for Tournament Setup".
- READY + canManage: primary = "Review & Launch" (→ auction-hub).
- READY + canBid: "Auction is ready. Waiting for launch."
- LIVE: primary = "Open Live Auction" (all roles).
- COMPLETED: primary = "View Results" (all roles).

Sport Workspace: add stage computation and pass to nav.
Festival Hub: replace raw string check with `isSetupStage(stage)`.
Sport Hub: replace raw `auctionStatus` guard with computed stage check.

---

## Item 3 — Duplicated actions / navigation

### What is broken

- `SportTournamentCommandCenter` Quick Actions (lines 157–174): four buttons
  always rendered — Tournament Management, Auction Details, Open Live Auction,
  View Results. Stage-unaware and role-unaware.
- `FestivalCommandCenter` ready/live actions section shows "Create Sport
  Tournament" unconditionally alongside launch buttons. Not wrong, but creates
  visual noise next to the stage-specific primary action.
- `FestivalDetail.jsx` (Festival Management) exposes Auction Preparation, Bid
  History, Results tabs during SETUP — Sprint 1 partially hides these but the
  completed-stage path does not convert the Setup tab to read-only.
- `FestivalAuctionHub` Results section duplicates `FestivalAuctionResultsPage`
  content in full. After item #4 this tab will become a redirect.

### Fixes

- Replace Sport Command Center Quick Actions with a stage+role-aware button list.
- Audit Festival Management tab visibility per stage (Setup/Ready/Live/Completed).
- After item #4: convert Hub Results tab to a "View Full Results" link, not
  a full duplicate table.

---

## Item 4 — Results architecture consolidation

### What is broken

Two full Results tables exist for both Festival and Sport:
- `FestivalAuctionHub` Results tab: full `HubTable` with all columns.
- `FestivalAuctionResultsPage`: independent full results page.
- `SportAuctionHub` Results tab: full `SportResultsTable`.
- `SportAuctionResultsPage`: independent full results page.

The Hub Results tab is a full duplicate with no additional context. Dashboard
cards for completed auctions route inconsistently between the two.

### Fixes

- Hub Results tab: replace full table with a compact summary (sold count, unsold
  count, total spend) + a prominent "View Full Results" button.
- `FestivalAuctionResultsPage` and `SportAuctionResultsPage` become the canonical
  full results surfaces.
- Completed auction cards on dashboard: confirm primary action routes to Results
  page, not Live Auction.
- `AuctionContextNavigation` COMPLETED stage already shows Results first — verify
  this routes to the Results page, not the Hub Results tab.

---

## Item 5 — Auction sale notifications

### What is broken

Sale events in the Arena feed are generic "Round finalized" entries. The
last-result panel in the Hub shows participant name and outcome but does not
prominently show:
- Who acquired the participant (winning team name).
- At what final amount.
- How many bids were placed.
- Whether the viewer's team was the winner.

### Fixes

- `LastAuctionResultPanel` in `AuctionHubPrimitives.jsx`: add winning team name,
  final amount, and bid count to the panel.
- Arena `RecentResultsStrip` (Festival) and `SportRecentResultsStrip` (Sport):
  verify sale announcement includes participant name + SOLD/UNSOLD + team +
  amount. Phase 4E-K touched these files — verify they still show all fields.
- Viewer-aware callout: if `result.festivalTeamId === viewer.festivalTeamId` (or
  sport equivalent) render a highlighted "You acquired [Name]" banner.

---

## Item 6 — Bid history redesign

### What is broken

- `BidHistorySummary` in `AuctionHubPrimitives.jsx` renders participant summary
  cards. The modal for detailed bids exists. This works but the modal close
  behavior needs review (is `onClose` wired?).
- Festival Hub Bid History has both Team and Participant filters — good.
- Sport Hub Bid History has only Team filter — Participant filter missing.
- Neither Hub shows a "No bid history" empty state when history is empty.

### Fixes

- Sport Hub Bid History: add Participant text filter matching Festival Hub.
- Both Hubs: add empty state when `rounds.length === 0`.
- Verify `BidHistorySummary` modal close (`onClose`) is correctly wired in both
  Hub implementations.

---

## Item 7 — Team roster purchase amount visibility

### What is broken

- `HubTeamCard` in `AuctionHubPrimitives.jsx` renders a `roster` list but shows
  only player name. Purchase amount, acquisition type, and purchase order are not
  visible in the Teams tab.
- `SportAuctionHub` Team Assignments section (lines 419–475) does show these
  fields correctly in chips — but this is a separate section, not the Teams tab.
- Festival Hub Teams tab uses `HubTeamCard` which does not show purchase details.
- Result: purchase details are only visible after the user navigates to Team
  Assignments (Sport) or stays in Results (Festival). The Teams tab is the
  first thing a captain or owner looks at.

### Fixes

- `HubTeamCard`: extend roster rows to show purchase amount chip and acquisition
  type chip, using the same chip pattern already in Sport Team Assignments.
- Festival Teams tab: ensure `team.members` contains `finalAmount` /
  `acquisitionType` / `purchaseOrder` from the existing server response shape.
  If not present at the top level, look in `state.results` for cross-reference.
- Sport Teams tab: same — `team.roster` / `team.players` items should carry
  `finalCredits` / `acquisitionType`.

---

## Files touched per item

| Item | Files |
|------|-------|
| 1 | `auctionStages.js`, `AuctionContextNavigation.jsx`, `SportTournamentCommandCenter.jsx`, `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` |
| 2 | `SportTournamentCommandCenter.jsx`, `SportTournamentWorkspace.jsx`, `SportAuctionHub.jsx`, `FestivalAuctionHub.jsx` |
| 3 | `SportTournamentCommandCenter.jsx`, `FestivalDetail.jsx`, `FestivalAuctionHub.jsx` |
| 4 | `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx`, `FestivalAuctionResultsPage.jsx`, `SportAuctionResultsPage.jsx` |
| 5 | `AuctionHubPrimitives.jsx`, `FestivalAuctionArena/RecentResultsStrip.jsx`, `SportAuctionArena/SportRecentResultsStrip.jsx` |
| 6 | `AuctionHubPrimitives.jsx`, `SportAuctionHub.jsx`, `FestivalAuctionHub.jsx` |
| 7 | `AuctionHubPrimitives.jsx`, `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` |
