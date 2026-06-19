# PHASE_4E_M — Setup-First Experience: Final Audit

Pre-implementation audit covering all Festival and Sport Tournament surfaces.
No code was changed during this audit.

---

## Reading guide

Each finding follows the same structure:

- **Surface** — file and approximate line
- **Current behaviour** — what the user sees today
- **Problem** — which setup-first principle it violates
- **Role affected** — which personas are exposed
- **Recommended change** — what to do

Findings are grouped by surface, then ordered by severity within each surface.

---

## 1. AuctionContextNavigation — fallback safe (fixed in item #1)

`AuctionContextNavigation.jsx:43`

**Current behaviour:** Fallback when `stage` is missing now renders SETUP items
only (Overview + Setup). This was fixed in item #1.

**Status:** ✅ Correct after item #1.

---

## 2. FestivalCommandCenter

**File:** `src/pages/FestivalCommandCenter.jsx`

### 2-A. Sport Tournament cards ignore Festival stage ✅

**Current behaviour:** Sport Tournament cards inside the Festival Command Center
show stage-aware buttons. When the parent Festival is in SETUP and the child
Sport Tournament's `status` is neither `auction_live` nor `auction_completed`,
the card routes to `Manage Tournament`.

**Assessment:** This is correct. The button label and route depend on the Sport
Tournament's own status, not the Festival stage. No change needed.

### 2-B. "Create Sport Tournament" button visible during all stages ⚠️

**Surface:** `FestivalCommandCenter.jsx:377–388`, inside the non-setup Quick
Actions branch.

**Current behaviour:** The "Create Sport Tournament" button only appears when
`!setupStage` (i.e., when the Festival has passed SETUP). During SETUP, the
Quick Actions section instead shows the setup progress card and the "Continue
Setup" + "Refresh Setup Check" buttons. Sport Tournament creation is NOT shown
during SETUP.

**Assessment:** ✅ Correct. No change needed.

### 2-C. Live Activity section shown to all roles ⚠️

**Surface:** `FestivalCommandCenter.jsx:392–411`

**Current behaviour:** When `!setupStage && liveActivity.length > 0`, a Live
Activity section with ActionCards is shown. All roles (admin, team_owner,
spectator) who can reach `/festivals/:festivalId/command-center` see this.

**Problem:** The Festival Command Center at `/festivals/:festivalId/command-center`
is admin-only in the route definition (`App.jsx:157`). Non-admin users cannot
reach it. The spectator and owner role audiences for this page are zero.

**Assessment:** ✅ No change needed for this file specifically.

---

## 3. FestivalDetail (Festival Management)

**File:** `src/pages/FestivalDetail.jsx`

### 3-A. Header CTA is stage-correct ✅

**Surface:** `FestivalDetail.jsx:650–661`

**Current behaviour:** During SETUP the header primary button reads "Continue
Setup" and routes to `/festivals/:festivalId/manage`. During non-setup stages it
reads "View Auction Details".

**Assessment:** ✅ Correct.

### 3-B. AuctionContextNavigation is stage-correct ✅

**Surface:** `FestivalDetail.jsx:664–671`

`stage={festivalStage}` is passed. During SETUP only Overview + Setup tabs are
shown.

**Assessment:** ✅ Correct after item #1.

### 3-C. "Auction Preparation" tab hidden during SETUP ✅

**Surface:** `FestivalDetail.jsx:139–148`

`visibleOperationTabs` excludes "Auction Preparation", "Bid History", and
"Results" when `setupStage` is true.

**Assessment:** ✅ Correct.

### 3-D. "View Auction Details" still the CTA when auction is READY/LIVE/COMPLETED ✅

The header CTA becomes "View Auction Details" for all post-setup stages. This
is acceptable but not ideal for READY: the more precise CTA would be "Review &
Launch" or "Open Live Auction". Low priority.

### 3-E. LIVE stage — setup sections still editable, no locked-state explanation ⚠️

**Surface:** `FestivalDetail.jsx:298–333` (workspace mode selector remains
functional); `FestivalDetail.jsx:739–728` ("Edit Festival Configuration" tab)

**Current behaviour:** When the Festival is LIVE, the Workspace Mode tab shows
"Setup Sections | Edit Festival Configuration". The "Edit Festival Configuration"
tab opens forms. Most fields are locked at the server level (`locked`/
`lifecycleLocked` booleans). However the workspace header description at line
644–648 still says "Review setup, auction details, and Festival operations"
without noting that setup is locked.

**Problem:** A manager who visits Festival Management during a live auction
can still click into "Edit Festival Configuration" and see form fields
silently disabled with no explanation at the page entry level. The
`FestivalConfigurationStatus` component presumably shows a lock indicator, but
the top-level description does not set expectations.

**Recommended change:** During LIVE stage, add a contextual `Alert` above the
workspace mode tabs: "Festival configuration is locked while the auction is
active. Use Auction Details for live bidding controls."

**Priority:** Medium (UX polish).

### 3-F. No role differentiation — this route is admin-only ✅

`App.jsx:177` restricts `/festivals/:festivalId/manage` to `allowedRoles:
["admin"]`. No role-differentiation needed inside this component.

**Assessment:** ✅ Correct.

---

## 4. FestivalOverview

**File:** `src/components/FestivalOverview.jsx`

### 4-A. Rendered unconditionally inside Festival Management ✅

**Surface:** `FestivalDetail.jsx:739` renders `<FestivalOverview />` when
`operationsView && activeTab === "Overview"`.

**Current behaviour:** Shows eight readiness metric cards and a "Setup Status"
section with blockers. All content is relevant to any stage of Festival setup.

**Assessment:** ✅ Correct. This is a setup-specific component and the content
it shows is always relevant.

### 4-B. No stage-awareness in metrics cards ⚠️

**Surface:** `FestivalOverview.jsx:45–52`

**Current behaviour:** Eight metric cards always render: Sports Enabled,
Employees Imported, Participants Registered, Teams Created, Owners Assigned,
Owners Activated, Retentions, Auction Pool Size. During LIVE or COMPLETED
stages these metrics still show — including "Auction Pool Size", which is a
setup metric, not a live-operations metric.

**Problem:** Post-launch, viewing the Management Overview tab shows setup
metrics as if setup is still the primary concern. The expected post-launch
concern is auction status and spending, not whether the pool was configured.

**Recommended change:** During LIVE and COMPLETED stages, replace or de-emphasise
setup-only metrics. Show a compact summary: "Setup Complete — Auction is [Live /
Completed]" with a link to Auction Details instead of eight metric cards.
During SETUP and READY, the current display is correct.

**Priority:** Medium.

---

## 5. FestivalAuctionHub

**File:** `src/pages/FestivalAuctionHub.jsx`

### 5-A. Setup guard updated to use computed stage ✅

**Surface:** `FestivalAuctionHub.jsx` (updated in item #1)

After item #1, the guard reads `isSetupStage(festivalStage)` instead of the
raw `auctionStatus === "setup"` string. For non-admin users during SETUP, a
`ProductStateCard` is shown with appropriate messaging per role.

**Assessment:** ✅ Correct after item #1.

### 5-B. Admin sees full hub during SETUP — no guidance ⚠️

**Surface:** `FestivalAuctionHub.jsx:179` — guard bypassed for `isAdmin`.

**Current behaviour:** When the auction is in SETUP, the admin skips the guard
and sees the full Auction Hub with Overview, Teams, Bid History, Results, and
Statistics tabs.

**Problem:** During SETUP, the Hub is essentially empty — no teams have budgets,
no bids exist, no results exist. The admin sees four or five tabs that all render
empty states. The "Open Live Auction" header CTA routes them to the Arena, which
will itself show a setup state. There is no guidance telling the admin "Auction
setup is not complete — go to Festival Management."

**Recommended change:** During SETUP, show the admin a `ProductStateCard` with:
- Title: "Auction Setup Incomplete"
- Message: "Complete Festival setup before the Auction Details surface becomes
  meaningful. Teams, bids, and results will appear after launch."
- Action: "Continue Festival Setup" → `/festivals/:festivalId/manage`
- Secondary action: "View Festival Overview" → `/festivals/:festivalId/command-center`

This does not remove admin access; it redirects their attention to the right
surface. If an admin specifically needs to inspect hub data during setup, they
can be offered a secondary "View Anyway" link.

**Priority:** High.

### 5-C. AuctionContextNavigation now receives stage ✅

Updated in item #1. Stage-aware tabs are shown correctly.

**Assessment:** ✅ Correct after item #1.

### 5-D. Owner waiting state does not show team context ⚠️

**Surface:** `FestivalAuctionHub.jsx:179–193` — `ProductStateCard` for Owner.

**Current behaviour:** During SETUP, an Owner sees:
- Title: "Waiting For Festival Setup"
- Message: "The Festival Administrator is still preparing the Festival."
- Action: "View Festival Overview"

**Problem:** The message does not tell the Owner:
- Which team they are assigned to.
- How many participants their team currently has.
- What the next step is for them (nothing — they just wait).

The Phase 4E-J specification says the Owner setup-wait state should show "Team
information" and "What happens next."

**Recommended change:**
- Show the Owner's team name if available (`state?.viewer?.teamName` or
  similar from the server).
- Add: "Once the auction launches, you will be able to bid for participants on
  behalf of [Team Name]."
- Keep "View Festival Overview" as the primary action.

**Priority:** High.

### 5-E. Spectator waiting state is generic ⚠️

**Surface:** `FestivalAuctionHub.jsx:179–193` — `ProductStateCard` for
non-owner, non-admin.

**Current behaviour:** During SETUP, a Spectator sees:
- Title: "Auction Not Started Yet"
- Message: "The Festival is still being prepared. Auction details, bid history,
  and results will appear after launch."
- Action: "View Festival Overview"

**Problem:** The message is generic but correct. The title "Auction Not Started
Yet" is slightly inaccurate — the auction is in setup, not simply "not started".
More importantly, there is no indication of when the spectator should come back.

**Recommended change:** Title: "Festival Auction in Setup". Message: "The
Festival is being prepared by the Administrator. Auction details, bid history,
and results will appear once the auction launches." Keep "View Festival Overview"
as the only action (no other actions are relevant to a spectator during setup).

**Priority:** Low.

---

## 6. Festival Live Auction Arena (MainFestivalAuction)

**File:** `src/components/MainFestivalAuction.jsx`

### 6-A. Non-admin/non-owner SETUP guard exists ✅

**Surface:** `MainFestivalAuction.jsx:444–458`

**Current behaviour:** During `status === "setup"`, non-admin users see a
`ProductStateCard`. Owner sees "Waiting For Festival Setup". Non-owner, non-admin
sees "Auction Not Started".

**Assessment:** ✅ Guard is in place.

### 6-B. Admin can enter a setup-stage Arena with no participant ⚠️

**Surface:** `MainFestivalAuction.jsx:444` — guard is `!isAdmin`.

**Current behaviour:** The admin bypasses the setup guard and enters the live
Arena when `status === "setup"`. The Arena will render with no `current` (no
active participant), no pool, and no history. The participant stage shows an
empty "Select Participant" dropdown with nothing available.

**Problem:** An admin who navigates directly to the Arena during setup sees the
full live-bidding controls over an empty state. This is confusing but not
blocked by the server (the API returns valid empty state). The admin's correct
path during setup is Festival Management, not the Arena.

**Recommended change:** If `status === "setup"`, show admin a
`ProductStateCard`:
- Title: "Festival Auction Not Ready"
- Message: "The auction pool, budgets, and participant setup must be complete
  before the live auction can begin."
- Action: "Complete Festival Setup" → `/festivals/:festivalId/manage`
- Secondary: "View Auction Details" → `/festivals/:festivalId/auction-hub`

**Priority:** High.

### 6-C. READY stage — admin sees empty Arena, no launch action ⚠️

**Surface:** `MainFestivalAuction.jsx` — no READY-stage handling exists.

**Current behaviour:** When `status === "ready"` (READY stage), all users reach
the full Arena, which has no current participant, no active bids, and no active
timer. The admin sees the "Select Participant" dropdown but may not know they
need to start a round — no guidance is given.

**Problem:** The Arena is a bidding surface, not a launch surface. A READY
auction needs a manager to trigger "Start Auction" before any participant
appears. Arriving at the Arena before launch gives no indication that an action
is required.

**Recommended change:** When `status === "ready"` and the user is an admin, show a
`ProductStateCard` or an inline prompt:
- Title: "Auction Ready to Launch"
- Message: "The Festival Auction is configured and ready. Select a participant to
  begin bidding."
- Action: "Open Live Auction Controls" — scrolls to or highlights the Start
  control, rather than redirecting away.

For non-admin during READY: show "Auction is ready. Waiting for the
Administrator to launch bidding."

**Priority:** High.

### 6-D. No Spectator-vs-Owner differentiation for non-live states (beyond setup) ✅

**Surface:** `MainFestivalAuction.jsx:444–458`

For `status === "setup"` the message distinguishes Owner vs non-owner.
For `status === "completed"` the same `ProductStateCard` is shown to all roles.
The Completed state is correct — all roles should see "View Results."

**Assessment:** ✅ Acceptable.

---

## 7. SportTournamentCommandCenter

**File:** `src/pages/SportTournamentCommandCenter.jsx`

### 7-A. Stage computed, nav wired, quick actions stage-gated ✅

Updated in item #1. Stage is computed from `getSportAuctionStageFromState`.
`AuctionContextNavigation` receives `stage`. Quick Actions buttons are stage-gated.

**Assessment:** ✅ Correct after item #1.

### 7-B. Non-manager SETUP experience shows setup issues section with misleading content ⚠️

**Surface:** `SportTournamentCommandCenter.jsx:136–150`

**Current behaviour:** During SETUP, when `!canManage`, the Setup Issues card
renders:

```
<Alert severity="info">
  Use Auction Details for teams, player assignments, bid history, statistics, and results.
</Alert>
```

This is shown to Owners (who have no tournament management access) and Spectators
(who have no access at all). The message is technically correct but:

1. It tells non-managers to go to "Auction Details" during SETUP, which now shows
   a non-manager waiting state (`ProductStateCard` "Waiting For Auction Launch")
   — not the teams, assignments, and results mentioned. The suggestion is
   misleading.
2. Owners and Captains don't need a Setup Issues section heading at all. The heading
   "Setup Issues" suggests it is relevant to them when it is not.

**Recommended change:** During SETUP and `!canManage`, replace the entire Setup
Issues card with a role-appropriate waiting state:

- **Captain (canBid):**
  - Title: "Waiting for Tournament Setup"
  - Body: "Your team has been assigned, but the Sport Tournament is still being
    configured. You will be notified when the auction is ready to launch."
  - Show team name if available from `tournament.teams`.
  - No action button needed.

- **Spectator/Owner (!canBid, !canManage):**
  - Title: "Tournament in Setup"
  - Body: "This Sport Tournament is being prepared. Come back once it launches."
  - No action button.

**Priority:** High.

### 7-C. No role differentiation in header for non-managers ⚠️

**Surface:** `SportTournamentCommandCenter.jsx:100–117`

**Current behaviour:** The header shows the tournament name, status chip, and
setup issues count chip to all users. The description reads "Tournament status,
setup issues, and the next action." for everyone.

**Problem:** A Captain or Spectator does not have "setup issues" to address. The
description and the second chip ("3 setup issue(s)") make no sense to them and
potentially causes confusion ("Is this my fault? Do I need to do something?").

**Recommended change:**
- For non-managers: hide the setup issues count chip.
- For non-managers: change the description to "Sport Tournament overview.
  Auction details and live bidding will be available once the Tournament
  launches."
- For managers: current display is correct.

**Priority:** High.

### 7-D. Primary action button during SETUP for non-manager routes to Dashboard ⚠️

**Surface:** `SportTournamentCommandCenter.jsx:72–75` (updated in item #1)

**Current behaviour:** During SETUP + `!canManage`, primary action is "Back to
Dashboard" → `/dashboard`.

**Problem:** This is a dead-end action. A Captain who visits the Sport Tournament
Command Center during setup and clicks "Back to Dashboard" is taken away from
the tournament context with no further explanation of what they should do.

**Recommended change:** For SETUP + canBid (Captain), replace the primary
action button with: "View My Assignment" which navigates to the Captain's Sport
Team details, or simply hide the button and replace the entire primary area with
the waiting state card described in 7-B.

For SETUP + !canBid (!canManage, !canBid = Spectator), hide the primary action
button entirely.

**Priority:** Medium.

---

## 8. SportTournamentWorkspace

**File:** `src/pages/SportTournamentWorkspace.jsx`

### 8-A. AuctionContextNavigation receives no stage ⚠️

**Surface:** `SportTournamentWorkspace.jsx:336–342`

**Current behaviour:**

```jsx
<AuctionContextNavigation
  commandCenter={...}
  management={...}
  hub={...}
  arena={...}
  results={...}
/>
```

No `stage` prop is passed. Since the item #1 fallback now renders SETUP items
only (Overview + Setup), this is *safer* than before but still incorrect —
during LIVE and COMPLETED stages the nav will only show Overview + Setup tabs,
hiding Auction Details and Results from a manager who visits Management.

**Recommended change:** Compute `getSportAuctionStageFromState({ tournament,
readiness, auction: auctionState })` and pass `stage` and `hasResults` to
`AuctionContextNavigation`.

**Priority:** Critical — breaks manager nav during LIVE/COMPLETED.

### 8-B. Header primary CTA is "View Auction Details" unconditionally ⚠️

**Surface:** `SportTournamentWorkspace.jsx:328–333`

**Current behaviour:** The header primary button always reads "View Auction
Details" and routes to `/sport-tournaments/:id/auction-hub`, regardless of
stage.

**Problem:** During SETUP, the Hub shows a non-manager waiting state. For the
manager (the only user who can reach this route), "View Auction Details" during
SETUP leads to an Auction Hub that shows an empty overview with no active auction
data. The CTA should be stage-aware:

- SETUP: "Check Setup Status" → `/sport-tournaments/:id` (Command Center / Overview)
- READY: "Review & Launch" → `/sport-tournaments/:id/auction-hub`
- LIVE: "Open Live Auction" → `/auctions/sports/:id`
- COMPLETED: "View Results" → `/sport-tournaments/:id/results`

**Priority:** High.

### 8-C. No route guard for non-managers ⚠️

**Surface:** `App.jsx:321–329` — route allows `admin`, `team_owner`, `spectator`.

**Current behaviour:** Owners and Spectators can navigate to
`/sport-tournaments/:id/manage`. The `canManage` boolean is computed from
`tournament?.permissions?.canManage` and controls form editability, but a
Spectator who lands on the Workspace sees the full list of eight section tabs
with setup forms — all of which will be read-only or empty, with no explanation.

**Problem:** The route allows all roles but the page is meaningless to
non-managers. This is not a security issue (API is the guard), but it is a UX
problem: a Captain who follows a link to the Management workspace sees team
setup forms they cannot submit.

**Recommended change:** At the top of `SportTournamentWorkspace`, if `!canManage`
after loading, render a `ProductStateCard`:
- Title: "Sport Tournament Setup"
- Message: "Team configuration, budgets, and pool setup are managed by the
  tournament organiser."
- Action: "Return to Tournament Overview" → `/sport-tournaments/:id`

**Priority:** High.

### 8-D. Loading state is a bare spinner ⚠️

**Surface:** `SportTournamentWorkspace.jsx:182–188`

**Current behaviour:** `if (loading && !tournament)` returns a `<CircularProgress />`
centred in a `Stack` — not a `LoadingStateCard`.

**Recommended change:** Replace with `<LoadingStateCard title="Loading Sport
Tournament Setup" message="Preparing teams, captains, budgets, and pool data." />`

**Priority:** Low.

---

## 9. SportAuctionHub

**File:** `src/pages/SportAuctionHub.jsx`

### 9-A. Stage computed, nav wired ✅

Updated in item #1. `sportStage` is computed and passed to
`AuctionContextNavigation` with `hasResults`.

**Assessment:** ✅ Correct after item #1.

### 9-B. Non-manager guard uses raw status list, not computed stage ⚠️

**Surface:** `SportAuctionHub.jsx:201–219`

**Current behaviour:**

```js
if (
  !canManage &&
  !["auction_live", "auction_paused", "auction_completed"].includes(auctionStatus)
) {
  return <ProductStateCard ... />;
}
```

`auctionStatus` is `auction?.tournament?.status || tournament?.status`. This
means:

1. During `"pending_finalization"` (which is a LIVE sub-state), non-managers
   bypass the guard and see the full Hub. This is correct — the auction is
   live-ish.
2. During `"ready"` or `"ready_to_launch"`, non-managers also bypass the guard
   because these statuses are not in the raw exclusion list above. Wait — these
   are NOT in the list `["auction_live", "auction_paused", "auction_completed"]`,
   so non-managers ARE shown the waiting state. That seems correct.
3. However, the guard uses raw status string matching instead of `isSetupStage(sportStage)`.
   If the server returns a new setup-variant status string not in `setupStatuses`
   in `auctionStages.js`, the guard could break silently.

**Recommended change:** Replace the raw status list with the computed stage:

```js
if (!canManage && (isSetupStage(sportStage) || isReadyStage(sportStage))) {
  // show waiting state
}
```

This makes the Hub guard consistent with `auctionStages.js` and removes the
dependency on raw status string matching.

**Priority:** High.

### 9-C. Waiting state messages distinguish canBid vs not, but miss READY nuance ⚠️

**Surface:** `SportAuctionHub.jsx:208–219`

**Current behaviour:**

- `canBid` (Captain): "Waiting For Auction Launch" — correct.
- `!canBid` (Spectator): "Sport Auction Not Started" — correct during SETUP,
  but inaccurate during READY (auction exists and is configured, just not launched).

**Recommended change:** Differentiate SETUP vs READY for both roles:

- SETUP + canBid: "Waiting For Tournament Setup" — "Your team is assigned but
  the tournament setup is not yet complete."
- READY + canBid: "Auction Ready — Waiting to Launch" — "The tournament is
  configured. The organiser is about to launch the auction."
- SETUP + !canBid: "Sport Auction in Setup" — "The tournament is being prepared."
- READY + !canBid: "Auction Launching Soon" — "The Sport Auction is configured
  and ready to launch."

**Priority:** High.

---

## 10. Sport Auction Arena

**File:** `src/pages/SportAuctionArena.jsx`

### 10-A. Completed guard exists ✅

**Surface:** `SportAuctionArena.jsx:425–439`

When `state?.tournament?.status === "auction_completed"`, a `ProductStateCard`
with "View Results" and "View Auction Details" is shown.

**Assessment:** ✅ Correct.

### 10-B. Non-manager pre-live guard exists ✅

**Surface:** `SportAuctionArena.jsx:441–458`

When `!canManage && !["auction_live", "auction_paused"].includes(tournament.status)`,
a `ProductStateCard` is shown. `canBid` differentiates message.

**Assessment:** ✅ Correct. Same raw-status caveat as 9-B but lower risk here
because the Arena is more obviously empty without a live round.

### 10-C. Manager (canManage) can reach the Arena during SETUP ⚠️

**Surface:** `SportAuctionArena.jsx:441` — guard is `!canManage`.

**Current behaviour:** A tournament manager bypasses the guard. During SETUP,
they reach the full Arena with empty pool and no current participant.
`OwnerLifecycleControls` is rendered (line 505–513) with `status` derived from
`state?.tournament?.status`.

**Problem:** The LifecycleControls component will render setup-or-pre-launch
controls over an empty Arena state. The manager may not know the setup is
incomplete. There is no "Setup Incomplete" message in the Arena for managers.

**Recommended change:** If `isSetupStage(sportStage)` and `canManage`, show
a `ProductStateCard`:
- Title: "Sport Auction Not Ready"
- Message: "Complete team assignment, budget configuration, and pool generation
  before the live auction can begin."
- Action: "Continue Tournament Setup" → `/sport-tournaments/:id/manage`
- Secondary: "View Tournament Overview" → `/sport-tournaments/:id`

**Priority:** High.

### 10-D. READY stage — manager sees empty Arena with no launch prompt ⚠️

**Surface:** `SportAuctionArena.jsx` — no READY-stage handling.

**Current behaviour:** During READY, the manager reaches the full Arena with no
current participant and the `OwnerLifecycleControls` showing. The controls
include a "Start Auction" action only when `status` allows it per the backend.

**Problem:** It is unclear to the manager whether arriving at an empty Arena
during READY means "click something here to start" or "something is wrong."
There is no prompt.

**Recommended change:** If `isReadyStage(sportStage)` and `canManage`, show an
inline info banner above `OwnerLifecycleControls`:

```
"The Sport Auction is configured and ready. Use the controls below to start
bidding on the first player."
```

For non-manager during READY: same as 10-B — `ProductStateCard` "Waiting to
Launch."

**Priority:** Medium.

---

## Summary table

| ID | Surface | Problem | Severity | Role affected |
|----|---------|---------|----------|---------------|
| 2-B | FestivalCommandCenter | Sport Tournament "Create" timing — N/A | ✅ N/A | — |
| 3-D | FestivalDetail | "View Auction Details" CTA during READY not ideal | Low | Admin |
| 3-E | FestivalDetail | No locked-state explanation during LIVE | Medium | Admin |
| 4-B | FestivalOverview | Setup metrics shown post-launch | Medium | Admin |
| 5-B | FestivalAuctionHub | Admin sees empty Hub during SETUP with no guidance | **High** | Admin |
| 5-D | FestivalAuctionHub | Owner waiting state lacks team context | **High** | Owner |
| 5-E | FestivalAuctionHub | Spectator waiting state title inaccurate | Low | Spectator |
| 6-B | FestivalArena | Admin can enter empty Arena during SETUP | **High** | Admin |
| 6-C | FestivalArena | READY stage — no launch prompt for Admin | **High** | Admin |
| 7-B | SportCommandCenter | Non-manager sees "Setup Issues" section with wrong guidance | **High** | Captain, Spectator |
| 7-C | SportCommandCenter | Non-manager sees setup-issues count chip | **High** | Captain, Spectator |
| 7-D | SportCommandCenter | SETUP + non-manager primary action routes to Dashboard | Medium | Captain, Spectator |
| **8-A** | SportWorkspace | **AuctionContextNavigation has no stage — nav broken in LIVE/COMPLETED** | **Critical** | Admin |
| 8-B | SportWorkspace | Header CTA always "View Auction Details" regardless of stage | **High** | Admin |
| 8-C | SportWorkspace | Non-managers can reach Management workspace with no guard | **High** | Owner, Spectator |
| 8-D | SportWorkspace | Bare spinner loading state | Low | All |
| 9-B | SportAuctionHub | Non-manager guard uses raw status strings | **High** | Captain, Spectator |
| 9-C | SportAuctionHub | Waiting state messages miss SETUP-vs-READY distinction | **High** | Captain, Spectator |
| 10-C | SportArena | Manager reaches empty Arena during SETUP | **High** | Admin/Manager |
| 10-D | SportArena | READY stage — no launch prompt for manager | Medium | Admin/Manager |

---

## Recommended implementation order

### Sprint 1 — Critical and structural (unblock everything downstream)

1. **8-A** `SportTournamentWorkspace` — add `getSportAuctionStageFromState`, pass `stage` to `AuctionContextNavigation`. Without this, the workspace nav is broken for managers during LIVE and COMPLETED.

2. **8-B** `SportTournamentWorkspace` — make header CTA stage-aware using the computed stage from fix #1.

3. **8-C** `SportTournamentWorkspace` — add non-manager guard at the top of the rendered output.

4. **9-B** `SportAuctionHub` — replace raw status list with `isSetupStage(sportStage) || isReadyStage(sportStage)` using the computed `sportStage` from item #1.

5. **6-B** `MainFestivalAuction` — add SETUP guard for admin. Currently the admin sees the full empty Arena during setup.

6. **6-C** `MainFestivalAuction` — add READY state: non-admin sees waiting state; admin sees a launch prompt rather than silent empty controls.

7. **10-C** `SportAuctionArena` — add SETUP guard for managers using `sportStage`.

### Sprint 2 — High priority UX corrections

8. **5-B** `FestivalAuctionHub` — add SETUP `ProductStateCard` for admin.

9. **5-D** `FestivalAuctionHub` — extend Owner waiting state with team name.

10. **7-B + 7-C** `SportTournamentCommandCenter` — non-manager waiting state, hide setup chips.

11. **9-C** `SportAuctionHub` — improve waiting state messages to distinguish SETUP vs READY.

### Sprint 3 — Medium/low polish

12. **3-E** `FestivalDetail` — locked-state `Alert` during LIVE.
13. **4-B** `FestivalOverview` — suppress setup metrics post-launch.
14. **7-D** `SportTournamentCommandCenter` — improve non-manager CTA during SETUP.
15. **10-D** `SportAuctionArena` — READY launch prompt for managers.
16. **8-D** `SportTournamentWorkspace` — replace bare spinner with `LoadingStateCard`.
17. **5-E** `FestivalAuctionHub` — improve Spectator waiting title.

---

## Files affected

| File | Sprint |
|------|--------|
| `src/pages/SportTournamentWorkspace.jsx` | 1 |
| `src/pages/SportAuctionHub.jsx` | 1, 2 |
| `src/components/MainFestivalAuction.jsx` | 1 |
| `src/pages/SportAuctionArena.jsx` | 1, 3 |
| `src/pages/FestivalAuctionHub.jsx` | 2 |
| `src/pages/SportTournamentCommandCenter.jsx` | 2, 3 |
| `src/pages/FestivalDetail.jsx` | 3 |
| `src/components/FestivalOverview.jsx` | 3 |

`auctionStages.js` — import only; no additional changes needed beyond item #1.
`AuctionContextNavigation.jsx` — no additional changes needed beyond item #1.
