# PRODUCT_BACKLOG.md

Scope: UX, navigation, dashboard, auction visibility, results visibility,
notifications, profile management, mobile responsiveness, accessibility, and
terminology consistency.

Excludes: Competition Engine, fixtures, matches, standings, playoffs, backend
schema changes, socket authentication, timer infrastructure, bidding rule changes.

---

## Critical

Items in this group block product quality for active users or produce
incorrect, misleading, or inaccessible behavior today.

---

### C-01 — Auction Directory includes setup-stage entities

**Area:** Auction visibility  
**Source:** Phase 4E-J Final Plan Step 14; codebase scan of `auctionStages.js`

`shouldShowInAuctionDirectory()` currently returns `true` for all stages.
Festivals and Sport Tournaments in Setup Incomplete state appear in the
Auction Directory alongside live and completed auctions.

Impact: Spectators, Owners, and Captains see setup-stage objects as if they
were actionable auctions. The card actions — View Auction Details, Open Live
Auction — lead to empty or misleading states before any auction has launched.

Required fix:  
- `shouldShowInAuctionDirectory()` must return `false` for the SETUP stage.  
- Admin-only: optionally show a separate "Setup Needed" group that routes to
  the Festival or Sport Tournament setup workspace, not an auction surface.  
- Card actions must be stage-aware: Ready → Review & Launch, Live → Join / Watch
  Live / Open Live Auction, Completed → View Results.

---

### C-02 — Sport Tournament setup-first redesign not implemented

**Area:** UX, navigation  
**Source:** Phase 4E-J Final Plan Steps 10–13; Phase 4E-J Sprint 1 report
(explicitly "not implemented")

Sport Tournament Overview, Sport Tournament Management, Sport Auction Details,
and Sport Live Auction do not yet apply the setup-first stage model.

Impact: A newly created Sport Tournament immediately exposes Auction Details,
Live Auction, and Results in contextual navigation and quick actions. Non-manager
users see auction-centric screens before any auction has been configured.

Required fixes:
- Sport Tournament Overview: During SETUP show setup issues, Continue Tournament
  Setup for managers, and Waiting for Setup for captains and spectators.
- Sport Tournament Management: During SETUP hide Auction Details, Live Auction,
  and Results from context navigation and header actions.
- Sport Auction Details: During SETUP show a direct-visit fallback only
  ("Auction details will be available after launch. Continue Setup.").
- Sport Live Auction: During SETUP hide from navigation; during READY expose as
  Launch/Open for managers only; during COMPLETED guide to Results.

---

### C-03 — Owner, Captain, and Spectator waiting states missing for Sport context

**Area:** UX, dashboard  
**Source:** Phase 4E-J Final Plan Steps 16–18; Phase 4E-J Sprint 1 report
(explicitly "not implemented"); Phase 4E-L report

Owner, Captain, and Spectator per-stage waiting states for Sport Tournament
contexts are not fully implemented in the Sport Tournament Overview and Sport
Auction flows.

Impact: An Owner with a managed Sport Tournament, or a Captain assigned to a
Sport Team, sees the same screen as the Tournament Manager. A Spectator may
see audit and setup controls that are disabled but not explained.

Required fixes per stage:
- Owner/Captain SETUP: "Your team is being configured. You will be notified
  when the auction is ready."
- Owner/Captain READY: "Auction is ready. Waiting for launch." with Team and
  credit/purse summary.
- Captain LIVE: "Join Auction" with server-derived `canBid` guard.
- Spectator SETUP: No auction entry, empty state only ("No live auctions yet").
- Spectator READY: "Upcoming" label, no Watch Live until launched.
- All roles COMPLETED: Route to Results, remove live auction entry.

---

### C-04 — Direct-URL fallback states incomplete

**Area:** Navigation, UX  
**Source:** Phase 4E-J Final Plan Step 4; Phase 4E-J Sprint 1 report
(explicitly "not implemented"); Phase 4E-L report (partial)

Phase 4E-L added fallbacks for the Festival and Sport live auction routes for
non-admin users. Missing fallbacks for:

- `/festivals/:festivalId/auction-hub` visited during SETUP.
- `/festivals/:festivalId/results` visited before any finalized round.
- `/sport-tournaments/:id/auction-hub` visited during SETUP.
- `/sport-tournaments/:id/results` visited before finalized rounds.
- `/auctions/festivals/:festivalId` visited as Spectator during SETUP.
- `/auctions/sports/:sportTournamentId` visited as Spectator during SETUP.

Required fix:  
Every hidden future-stage page must return a `ProductStateCard` that explains
what the page is for, why it is not yet available, and what the user should do
instead (Continue Setup, Return to Overview, View Dashboard). Do not redirect
silently.

---

### C-05 — Results surfaces are duplicated without a clear primary

**Area:** Results visibility  
**Source:** Phase 4E-H §9; Phase 4E-J Final Plan Step 9; Phase 4E-J Review §4

Results content currently lives in:
1. Festival Management tab (Bid History, Results, Audit).
2. Festival Auction Details (Hub) — Results sub-tab.
3. Festival Auction Details (Hub) — Bid History sub-tab.
4. Dedicated `/festivals/:festivalId/results` page.
5. Arena recent-results strip.
6. Dashboard recent outcomes.

The same content appears in at least three top-level surfaces simultaneously.
Users do not know which is authoritative. Completed-auction cards on the
Dashboard sometimes route to the Live Auction page instead of Results.

Required decisions and fixes:
- Designate `/festivals/:festivalId/results` and
  `/sport-tournaments/:id/results` as the canonical full Results destinations.
- Demote the Management Results tab to a shortcut link, not duplicate content.
- Demote Auction Details Results sub-tab to a "View Full Results" link out.
- Dashboard "Recent Outcomes" cards for completed auctions must route to the
  Results page, not the Live Auction page.
- Arena recent-results strip remains as a compact preview (max 4 items);
  "View All Results" exits to the Results page.

---

### C-06 — `FestivalAuctionDirectory.jsx` is an orphaned file

**Area:** Navigation  
**Source:** Codebase scan — file exists in `src/pages/` but is not referenced
in `App.jsx` routes

`FestivalAuctionDirectory.jsx` exists as a page file but has no registered
route. It is either a dead file or an incomplete route implementation that was
never wired.

Required action:  
Determine whether this file is superseded by `AuctionDirectory.jsx`. If so,
remove it. If it serves a distinct purpose, register its route or document why
it exists.

---

### C-07 — Pre-existing lint errors in `SportAuctionHub.jsx`

**Area:** UX (build correctness)  
**Source:** Phase 4E-J Sprint 1 report; codebase scan

`SportAuctionHub.jsx` has pre-existing ESLint errors:
- `no-constant-binary-expression`
- Reference to an undefined `bids` variable

These cause `npm run lint` to fail. The undefined variable is a runtime risk
that could produce a `ReferenceError` or silent `undefined` rendering in the
Sport Bid History section.

Required fix: Resolve the undefined `bids` reference and the constant binary
expression before Phase 5 work begins.

---

## High

Items that meaningfully degrade the user experience for one or more roles but
do not produce incorrect behavior or blocked flows today.

---

### H-01 — Dashboard cards do not consistently route to stage-correct destinations

**Area:** Dashboard  
**Source:** Phase 4E-J Final Plan Step 15; Phase 4E-J Review §4

Specific routing failures observed across roles:

- Admin: Ready Sport Tournament cards can open the Live Auction Arena instead
  of a Review & Launch step, skipping the intentional launch moment.
- Owner: Dashboard live auction cards sometimes route to Auction Details rather
  than Join Auction.
- Spectator: "Recent Outcomes" cards on the spectator dashboard can route to
  the Live Auction page of a completed auction.
- Admin: "Live Now" cards in the Admin Dashboard do not consistently distinguish
  "Open Arena" from "View Auction Details."

Required fix: Each dashboard card must derive its primary action from the
computed stage:
- SETUP → Continue Setup (admin) / Waiting for Setup (others).
- READY → Review & Launch (admin/manager) / Waiting for Launch (others).
- LIVE → Open Live Auction (admin/manager), Join Auction (owner/captain),
  Watch Live (spectator).
- COMPLETED → View Results.

---

### H-02 — Admin dashboard duplicates Festival Command Center information

**Area:** Dashboard  
**Source:** Phase 4E-H §3.2; Phase 4E-J Final Plan §1 (Admin problems)

The Admin Dashboard Festival Journey cards repeat the same festival lifecycle
status, blocker count, and Sport Tournament status already available in the
Festival Command Center (Overview). A user loading both pages sees the same
content twice with no added decision value.

Required fix:  
- Admin Dashboard should show a compact Festival selector (festival name +
  current phase + one action) rather than full journey cards.
- Full lifecycle detail belongs in the Festival Overview page only.
- Dashboard "Festival Operations" section should be a ranked priority list
  (e.g., "3 blocking issues — Resolve" or "Volleyball Auction ready — Launch"),
  not a duplicate lifecycle grid.

---

### H-03 — Spectator receives `CaptainProductDashboard` when Captain assignments exist

**Area:** Dashboard, navigation  
**Source:** Codebase scan of `Dashboard.jsx`

When a Spectator-role user has Captain assignments (i.e., is assigned as a
Sport Captain while holding the `spectator` global role), the dashboard renders
`CaptainProductDashboard`. However, a Spectator with Captain assignments is
a common multi-capability scenario explicitly described in Phase 4E.

The current logic treats it as mutually exclusive: Captain assignments → Captain
dashboard, otherwise → Spectator dashboard. A user who is both should see a
merged capability dashboard, not have one persona silently override the other.

Required fix:  
- When a Spectator-role user has captain assignments, render a merged dashboard
  that surfaces both Captain actions (Join Auction for assigned Sport Teams) and
  Spectator content (Watch Live for other auctions).
- Alternatively, show the Captain section first followed by the Spectator
  section, with clear labels.

---

### H-04 — Account menu "My Teams" shortcut routes Team Owner to `/sport-tournaments`

**Area:** Navigation, profile management  
**Source:** Codebase scan of `AppShell.jsx`; Phase 4E-H §10.1

The avatar account menu for a Team Owner shows "My Teams" linking to
`/sport-tournaments`. This is the general Sport Tournament directory — not the
owner's assigned Festival Team or their managed Sport Tournaments specifically.

Impact: An Owner clicking "My Teams" arrives at a directory that lists all
tournaments and requires filtering to find their own. This does not reflect the
intended ownership model where an Owner's primary identity is their Festival Team.

Required fix:  
- "My Teams" should route to a Festival-Team-specific view: the Owner's assigned
  Festival Team roster or the Owner Dashboard section showing their assignments.
- If no dedicated "My Festival Team" route exists, route to
  `/dashboard` with the Owner's team card in focus.
- Spectator account menu shortcut "My Auctions" → `/auctions` is acceptable.

---

### H-05 — Festival Command Center (Overview) still exposes auction surfaces during setup

**Area:** UX, navigation  
**Source:** Phase 4E-J Final Plan Step 5; Phase 4E-J Sprint 1 (implemented
overview setup-first, but some surfaces remain)

Phase 4E-J Sprint 1 partially redesigned the Festival Command Center. However:
- Quick Actions may still expose "View Auction Details" and "Open Live Festival
  Auction" during setup stages via the `AuctionContextNavigation` component when
  stage data is not passed correctly.
- Sport Tournament cards inside the Festival Command Center can offer "Open Live
  Auction" before the parent Festival setup is complete.
- "Recent Results" section appears before any finalized results exist.

Required fixes:
- Sport Tournament cards must be stage-aware: show setup status and
  "Resolve Setup Issues" until Sport setup is ready.
- "Recent Results" must use `shouldShowResults()` before rendering — hide
  entirely if no finalized results.
- Verify `AuctionContextNavigation` receives the correct Festival stage in all
  `FestivalCommandCenter` render paths.

---

### H-06 — Festival Management top-page height is excessive before working content

**Area:** UX, navigation  
**Source:** Phase 4E-H §5 (target: ≥60% reduction); current implementation
retains Control Center and configuration lock card above workspace tabs

Festival Management still renders the Festival Control Center block and the
configuration lock card above the workspace tab row. On a typical laptop
viewport, the actual working content (Participants, Teams, Owners, etc.) begins
below the fold.

Phase 4E-H2 specifies a compact header of approximately 160–220 px for the
entire top region (excluding temporary alerts).

Required fixes:
- Collapse the Festival Control Center block. Replace with a compact header:
  `Festival Name | Status | Auction Status | [Open Live Auction] [More]`.
- Move configuration lock explanation to be contextual (show only when a locked
  field is interacted with, or when the active management section is editable).
- The Management section nav tabs must be visible without scrolling.

---

### H-07 — Sport Tournament Management Control Center renders before workspace tabs

**Area:** UX, navigation  
**Source:** Phase 4E-H §6–7; Phase 4E-H3

Sport Tournament Management renders a large Control Center block — eight
metrics, a readiness progress bar, permanently expanded blockers, and an
Open Arena action — before the eight workspace tabs appear. The active section
content is often one full scroll below the top of the page.

Required fixes:
- Replace the large Control Center with a compact header:
  `Tournament Name | Sport | Status | [one contextual action]`.
- Move the full blocker list to an expandable panel triggered by a badge or
  "Setup Issues" link.
- Make the readiness percentage contextual: show it in the Readiness section
  only, not in permanent page chrome.
- The primary Management tab row must be visible in the first viewport.

---

### H-08 — `AuctionContextNavigation` fallback renders all five items regardless of stage

**Area:** Navigation  
**Source:** Codebase scan of `AuctionContextNavigation.jsx`

When the `stage` prop does not match any known stage value, the component
falls through to a default case that renders all five navigation items:
Overview, Setup, Auction Details, Live Auction, and Results.

This means that any surface where stage computation fails or is not yet wired
(e.g., Sport Tournament Management when stage data is not fully supplied)
exposes all items including the hidden future-stage ones.

Required fix:  
- The fallback should render only `Overview` and `Setup`, matching the SETUP
  stage behavior.
- Add a `console.error` or assertion in development when an unrecognized stage
  is received, so wiring failures are caught early.

---

### H-09 — Stage-aware Management tabs missing for Festival Management post-launch sections

**Area:** UX, navigation  
**Source:** Phase 4E-J Final Plan Step 6; Phase 4E-J Sprint 1 report

Sprint 1 hides `Auction Preparation`, `Bid History`, and `Results` tabs during
SETUP. However, post-launch (LIVE and COMPLETED stages) the reverse problem
exists: setup-only tabs remain visible and modifiable when configuration is
locked by the server.

Required fixes:
- LIVE: Setup wizard steps and mutating setup forms should be visually read-only
  (not disabled silently). Add a "Configuration is locked" contextual note near
  each editable section header.
- COMPLETED: Hide or clearly demote setup-entry actions. Replace "Continue
  Setup" with "Review Setup" (read-only).
- The `Results` and `Bid History` tabs are correctly visible post-launch.
  Verify they are not also hidden accidentally when `hideAuctionTabs` is true.

---

### H-10 — Duplicate `/festivals/:festivalId` and `/festivals/:festivalId/command-center` routes

**Area:** Navigation  
**Source:** Codebase scan of `App.jsx` — both routes exist

Two routes render the Festival Command Center (Overview) for the same festival:
- `/festivals/:festivalId`
- `/festivals/:festivalId/command-center`

Both appear to load `FestivalCommandCenter`. This creates ambiguity in browser
history and breadcrumbs, and means internal links may use inconsistent paths.

Required fix:  
- Choose one canonical path. The Phase 4E architecture specifies
  `/festivals/:festivalId` as the primary Festival entry (Command Center /
  Overview).
- `/festivals/:festivalId/command-center` should redirect to
  `/festivals/:festivalId` using a `replace` redirect.
- Update all internal links to use the canonical route.

---

### H-11 — Spectator navigation has no access to Festival directory or results

**Area:** Navigation, results visibility  
**Source:** Codebase scan of `AppShell.jsx`; Phase 4E master plan §11.4

Spectator global navigation shows only Dashboard and Auctions. There is no
access to:
- Festivals directory (to browse completed Festivals).
- Results (to review outcomes after an auction completes).
- A "Watch Live" or "Live Now" direct shortcut.

The Auction Directory is the only discovery path, but if setup-stage items are
removed (C-01) the directory may appear sparse without a "Completed" view
prominently featured.

Required fix:  
- Add "Results" or "View Results" to Spectator navigation, or make completed
  auction results prominently discoverable from the Auction Directory with a
  Completed filter.
- Consider adding a "Festivals" read-only browse link for Spectators, or ensure
  the Auction Directory Completed tab surfaces enough context.

---

### H-12 — Mobile account menu does not guard against narrow viewport overflow

**Area:** Mobile responsiveness  
**Source:** Phase 4E-L report (partial fix: `maxWidth: calc(100vw - 24px)` on
menu); manual risk noted in Phase 4E-G

The account menu `maxWidth` guard was added in Phase 4E-L for mobile. However:
- Long user names that exceed the menu width may still truncate incorrectly.
- The menu items "Notifications — Coming Soon" and "Activity History — Coming
  Soon" remain disabled with small text but have no accessible explanation of
  why they are unavailable.
- On iOS Safari, the fixed-position menu may clip against the safe area bottom
  on devices without a home button.

Required fix:  
- Add `overflow: hidden` and `text-overflow: ellipsis` to the user name line
  in the menu.
- Add `aria-disabled="true"` and a tooltip or inline note ("Available in a
  future update") to disabled menu items.
- Verify menu positioning on iOS Safari with a safe-area-inset-bottom test.

---

## Medium

Items that reduce UX quality or consistency but have usable workarounds or
affect lower-frequency paths.

---

### M-01 — Dashboard "Live Now" and "Action Required" sections render empty cards

**Area:** Dashboard  
**Source:** Phase 4E-H §2; Phase 4E-J Final Plan Step 15

When no auctions are live and no action is required, the Admin and Owner
dashboards still render the section headings and empty card containers for
"Live Now" and "Action Required." These occupy significant vertical space with
no content and no next action.

Required fix:  
- Conditionally render each dashboard section header and its cards only when at
  least one item exists for that section.
- Replace empty primary sections with a single compact notice ("No live auctions
  right now") rather than a blank grid.

---

### M-02 — Festival Management Overview duplicates Festival Command Center content

**Area:** UX, dashboard  
**Source:** Phase 4E-H §5.5; Phase 4E-J Final Plan §4 Simplification Plan

The `FestivalOverview` component inside Festival Management renders festival
dates, status, participant count, team count, owner count, pool count, and
setup progress — the same metrics shown in the Festival Command Center
(Overview) header and body.

Required fix:  
- The Management Overview section should function as a contextual orientation
  page, not a second Command Center.
- Keep only data relevant to the current management task: which sections need
  attention, which sections are complete, and the primary next management action.
- Remove duplicate counts and lifecycle summaries that are already visible in
  the compact Management header.

---

### M-03 — Sport Tournament Management Overview duplicates Command Center readiness

**Area:** UX  
**Source:** Phase 4E-H §7; Phase 4E-J Final Plan §4

The Sport Tournament Management Overview tab re-renders Teams, Captains,
Eligible Participants, Pool count, and readiness percentage — all of which are
already shown in the Sport Tournament Command Center (Overview) and in the
large Control Center block above the tabs.

Required fix:  
- Demote the Overview tab inside Sport Tournament Management to a compact
  orientation summary: current working step, one blocking issue if present,
  and a link to the Command Center for full context.
- Remove the metric grid that duplicates the Control Center.

---

### M-04 — Profile page shows static content only with no assignment summary

**Area:** Profile management  
**Source:** Phase 4E-J Header/Profile document; codebase scan (`ProfilePage.jsx`)

`/profile` is explicitly read-only and uses only the authenticated user object.
The Role Information section mentions "assigned teams summary" and "captain
assignment summary" but these are derived from `user` data in `localStorage`,
not a live fetch.

Impact: An Owner who is reassigned or a Captain who gains new Sport Team
assignments will see stale assignment data on their Profile page without
relogging.

Required fix (frontend-only, no new API):  
- Source assignment data from the live `useProductDashboardData` hook or the
  existing Festival/Sport state already loaded on the dashboard, not solely from
  `localStorage`.
- Add a note on the Profile page: "Assignment details reflect your last login
  session. Return to Dashboard for current assignments."
- If the `user` object does not carry assignment fields, make the Role
  Information section reflect what is known and direct to Dashboard.

---

### M-05 — Account Settings page consists entirely of "Coming Soon" placeholders

**Area:** Profile management  
**Source:** Phase 4E-J Header/Profile document; codebase scan (`AccountSettingsPage.jsx`)

`/settings` shows four placeholder cards: Preferences, Notifications, Display
Options, Account Security — all marked "Coming Soon." There is no interactive
content. Users who navigate here from the avatar menu arrive at a page that
offers nothing.

Required fix:  
- Add at least one functional setting: Change Password (route to the existing
  `/change-password` flow) under Account Security.
- Label the remaining sections "Planned" instead of "Coming Soon" to set
  accurate expectations.
- Add a back link to Dashboard so the page is not a dead end.

---

### M-06 — `ForgotPassword.jsx` and `ResetPassword.jsx` routes exist but are not confirmed in navigation

**Area:** Navigation, profile management  
**Source:** Codebase scan of `App.jsx` (routes `/forgot-password` and
`/reset-password/:token` exist); `AppShell.jsx` account menu does not reference
them; Phase 4E-J report does not mention them

The forgot-password and reset-password flows are registered as guest routes but
are only reachable if:
(a) The Login page has a "Forgot Password?" link, or
(b) The user knows the URL.

The account menu has no "Change Password" or "Forgot Password" link. The only
existing path is via `/change-password` (enforced at login).

Required fix:  
- Verify that the Login page (`Login.jsx`) links to `/forgot-password`.
- Add "Change Password" to the Account Settings page (M-05) pointing to the
  appropriate flow.
- Ensure `/reset-password/:token` displays a clear invalid-token error state
  when the token is expired or absent.

---

### M-07 — Arena header metrics region pushes participant stage lower in viewport

**Area:** UX, live auction  
**Source:** Phase 4E-HX findings; Phase 4E-G audit; Phase 4E-H §8.2

Both the Festival and Sport Arena headers compress the current participant
panel when a secondary metric row (connection state, round count, queue
summary) is rendered in the header area. On a 13-inch laptop the live bid
action may fall below the initial viewport before any scrolling.

Phase 4E-HX documented this and compressed the Arena header into one row.
The Phase 4E-G report confirmed it was partially fixed, but Phase 4E-H §8.2
still identifies it as a remaining issue.

Required fix:  
- Arena header must be a single compact row: brand, event name, status chip,
  connection indicator, team context, exit link.
- Secondary metrics (round count, queue counts, progress) move into the body
  below the primary panel or into an expandable chip.
- Verify at 1280×800 that current participant, timer, current bid, next bid,
  and Place Bid / Finalize action are all visible before scrolling.

---

### M-08 — Auction Directory tab filter "type=festival" applied but Festival filter does not exist in UI

**Area:** Navigation, auction visibility  
**Source:** Codebase scan — `FestivalAuctionDirectory.jsx` orphan file; App.jsx
redirect `/festival-auctions` → `/auctions?type=festival`

The redirect sends users to `/auctions?type=festival`, implying the Auction
Directory supports a "type" query filter that scopes to Festival auctions.
The scan shows the Auction Directory uses `useSearchParams` — but whether a
`type=festival` param is actually consumed and wired to a filter tab or chip
needs confirmation.

Required fix:  
- Verify `AuctionDirectory.jsx` reads and applies `?type=festival` and
  `?type=sport` as initial filter states.
- If not, implement it: the redirect would silently drop the parameter and
  always show all types.
- Ensure browser back from a type-filtered Auction Directory preserves the
  filter in URL, not just local state.

---

### M-09 — Empty state for Spectator Auction Directory when no live/ready/completed auctions exist

**Area:** UX, auction visibility  
**Source:** Phase 4E-J Final Plan Step 18 (Spectator — No Upcoming Auctions);
Phase 4E-L report (partial)

Phase 4E-L added a "No Live Auctions" state for the Auction Directory. However
the empty state does not differentiate:
- No auctions at all vs.
- Auctions exist but none are ready/live/completed (all are in Setup).

A Spectator who arrives during a Festival setup period sees the same empty
state as if the platform had never been used.

Required fix:  
- If auctions exist but are in setup stage: "Auctions are being configured. Check
  back soon."
- If no Festival or Sport Tournament has been created: "No auctions scheduled
  yet."
- Both states must include a "Refresh" action, not a Create action (Spectators
  cannot create).

---

### M-10 — "Pending Finalization" still appears as internal label in some Arena states

**Area:** Terminology consistency  
**Source:** Phase 4E-I terminology audit; Phase 4E-K report

Phase 4E-I replaced "Pending Finalization" with "Waiting for Confirmation" in
most touched screens. However:
- The `getSportAuctionStage()` function in `auctionStages.js` checks for
  `"pending_finalization"` as a status value — this is an internal identifier
  and is correct.
- The concern is whether the user-facing label on Arena status chips, Arena
  headers, or admin control panels still renders "Pending Finalization" in
  places Phase 4E-K did not touch (e.g., legacy tournament arena, spectator
  banners).

Required fix:  
- Audit all visible status chips, banners, and section headings for the string
  "Pending Finalization."
- Replace all user-facing occurrences with "Waiting for Confirmation."
- Internal code identifiers (`pending_finalization`, `PENDING`) remain unchanged.

---

### M-11 — "Roster" appears as a user-facing label in untouched components

**Area:** Terminology consistency  
**Source:** Phase 4E-I, Phase 4E-K, Phase 4E-L reports — confirmed cleanup in
touched files; untouched components noted

Phase 4E-K and 4E-L replaced "Roster" with "Team Members" or "Players Bought"
in touched components. Components not in those phase lists (e.g.,
`TeamOwnerDashboard/`, `AdminDashboardLayout/`, legacy `AuctionManagement.jsx`,
`MyTeam.jsx`, `TeamsOverview.jsx`) may still use "Roster."

Required fix:  
- Audit all user-facing string occurrences of "Roster", "Slot", and "Allocation"
  in components outside the Phase 4E-K/L modified file list.
- Apply the Phase 4E-I dictionary: "Roster" → "Team Members" or "Players
  Bought" depending on context; "Allocation" → "Team Assignment" or "Players
  Won."
- Internal variable names (e.g., `rosterCount`, `allocationData`) are not
  changed.

---

### M-12 — "Resolve Blockers" and "Readiness" remain in some visible surfaces

**Area:** Terminology consistency  
**Source:** Phase 4E-I terminology audit; Phase 4E-L cleanup (partial)

Phase 4E-I specified "Resolve Blockers" → "Fix Setup Issues" and
"Readiness" → "Setup Status" or "Setup Check." Phase 4E-L applied this in
the Festival and Sport Overview and readiness components touched in that phase.

Remaining occurrences likely in:
- `FestivalReadiness.jsx` section headings and check labels.
- `SportTournamentControlCenter.jsx` blocker list labels.
- Admin Dashboard "Resolve" action labels.

Required fix:  
- Replace all user-visible "Resolve Blockers" buttons and links with
  "Fix Setup Issues."
- Replace "Readiness" headings with "Setup Status" or "Setup Check."
- Replace "Readiness Score" with "Setup Progress."
- Leave API field names (`readinessStatus`, `overallStatus`) unchanged.

---

### M-13 — "Command Center" label still used internally and may surface to users

**Area:** Terminology consistency  
**Source:** Phase 4E-I terminology audit; App.jsx route `/festivals/:festivalId/command-center`

Phase 4E-I renamed "Command Center" to "Overview" in user-facing screens.
However:
- The route `/festivals/:festivalId/command-center` exists in `App.jsx`.
- If breadcrumbs, page titles, or links render the route segment as a label,
  users would see "Command Center."
- `SportTournamentCommandCenter.jsx` is a page component whose rendered title
  may still say "Command Center."

Required fix:  
- Ensure page `<title>` and visible headings for both Festival and Sport
  Tournament Command Center pages use "Overview" not "Command Center."
- The route path `/command-center` may remain as a technical path but must not
  be visible as a breadcrumb label without mapping to "Overview."
- Audit `AppShell.jsx` page-title logic for this route.

---

### M-14 — Re-auction checkboxes lack participant-specific accessible labels

**Area:** Accessibility  
**Source:** Phase 4E-G audit findings (confirmed fix listed); Phase 4E-K/L
did not touch this area

Phase 4E-G added participant-specific accessible labels to Festival and Sport
re-auction checkboxes. Verify this was not reverted and extends to:
- The Sport Arena queue drawer re-auction checkboxes.
- Any "Select All" checkbox for re-auction batches.

Required fix:  
- Each re-auction checkbox must carry `aria-label="Re-auction [participant
  name]"` or equivalent.
- "Select All" must carry `aria-label="Select all participants for re-auction"`.
- Verify these labels are present after Phase 4E-K component rewrites.

---

### M-15 — Arena pages do not suppress the AppShell page heading

**Area:** UX, mobile responsiveness  
**Source:** Phase 4E-G audit fix; Phase 4E-L risk note ("some legacy dashboard
components still contain spinner-only loading states")

Phase 4E-G removed the redundant AppShell page heading on Arena routes. Verify
this suppression applies to:
- `/auctions/festivals/:festivalId` (Festival Arena).
- `/auctions/sports/:sportTournamentId` (Sport Arena).
- Legacy `/start-live-auction` (Admin legacy auction).

If `AppShell` renders a page title based on route matching and any Arena route
is missing from the suppression list, that page will show a duplicate heading
that consumes vertical real estate on smaller screens.

Required fix:  
- Audit the `AppShell` heading suppression list against all current Arena routes.
- Apply suppression to any missing route.

---

### M-16 — Loading states in legacy dashboard components remain spinner-only

**Area:** UX  
**Source:** Phase 4E-L risk notes ("some legacy dashboard components still
contain spinner-only loading states")

The `AdminDashboardLayout/` components and legacy `TeamOwnerDashboard/` and
`SpectatorDashboard/` components pre-date the `LoadingStateCard` introduced in
`ProductState.jsx`. They display a bare spinner with no message, no context,
and no retry option on network failure.

Required fix:  
- Replace bare spinner states in legacy dashboard components with
  `LoadingStateCard` (contextual message, optional retry action).
- Ensure error states in these components use `ProductStateCard` with a retry
  button, not a raw error string.

---

### M-17 — Mobile tab bar scrolls horizontally on Festival Management with many sections

**Area:** Mobile responsiveness  
**Source:** Phase 4E-H §11.1 rule: "Tabs are horizontally scrollable only
when six or fewer short items remain; otherwise use a section selector"

Festival Management workspace has ten or more navigation sections:
Overview, Participants, Festival Teams, Owners, Retentions, Auction
Preparation, Rosters, Results, Bid History, Audit, Settings. This exceeds
the six-item threshold for horizontal tab scrolling.

Required fix:  
- On mobile (< 600 px), replace the horizontal tab strip with a section
  selector (dropdown or drawer-based navigation).
- On tablet (600–960 px), use grouped horizontal tabs or a compact left rail.
- Sport Tournament Management has a similar issue with its eight tabs.

---

### M-18 — Breadcrumbs missing from Festival and Sport workspace pages

**Area:** Navigation  
**Source:** Phase 4E-H §10.4

Phase 4E-H specifies a contextual breadcrumb model:

```
Festivals / Corporate Sports Festival / Management / Teams
Festivals / Corporate Sports Festival / Cricket Men / Auction Arena
```

No breadcrumb component is visible in the scanned pages (`FestivalDetail.jsx`,
`SportTournamentWorkspace.jsx`). Users cannot determine their location in the
Festival → Sport Tournament → Arena hierarchy without manually reading the page
heading or URL.

Required fix:  
- Add a compact breadcrumb row below the compact header on Festival Management,
  Sport Tournament Management, Festival Arena, and Sport Arena pages.
- Mobile breadcrumb uses a single back label: `< Corporate Festival`.
- Breadcrumbs do not replace the contextual nav; they communicate hierarchy.

---

### M-19 — "Open Arena" label still used in some navigation and button text

**Area:** Terminology consistency  
**Source:** Phase 4E-I renamed "Open Arena" → "Open Live Auction"; codebase
may have untouched instances in `FestivalCommandCenter.jsx`, Festival and Sport
Management Control Center CTA buttons, Auction Directory cards

Required fix:  
- Search all `.jsx` files for the string "Open Arena" and "Open Hub."
- Replace "Open Arena" with "Open Live Auction."
- Replace "Open Hub" with "View Auction Details."
- Exception: internal comments and documentation strings are not changed.

---

## Low

Items that are improvements to polish, edge-case coverage, or future-proofing
that do not affect current core workflows.

---

### L-01 — `/settings` has no functional content accessible from account menu

**Area:** Profile management  
**Source:** Phase 4E-J Header/Profile; M-05

The Account Settings page is navigable from the avatar menu but contains no
working controls. Users who discover it expect at minimum a password-change
entry point.

This is lower priority than M-05 only because the current `/change-password`
route is enforced at login for users who need it. Users who want to proactively
change their password have no self-service path outside of the forced flow.

Required fix: Tracked in M-05.

---

### L-02 — Spectator eligibility empty states in Sport Tournament lack explanation

**Area:** UX, accessibility  
**Source:** Phase 4E-G findings ("Sport eligibility lists could render as
unexplained blank sections")

Phase 4E-G added explanatory empty states for Sport eligibility. Verify these
are still in place after Phase 4E-K component changes to `SportAuctionHub.jsx`
and related files.

Required fix:  
- Each empty eligibility list must show: "No eligible participants" with a
  reason ("Participants must be registered for [Sport] and belong to a Festival
  Team in this Tournament.").
- Add a "Review Eligibility Rules" link to the relevant Sport Tournament
  Management section.

---

### L-03 — "Activity History" disabled menu item has no explanation

**Area:** Profile management, accessibility  
**Source:** Codebase scan of `AppShell.jsx`; Phase 4E-J report

The avatar menu shows "Activity History — Coming Soon" as a disabled item with
no tooltip or accessible description explaining when it will become available
or what it will show.

Required fix:  
- Add `title="Planned for a future update"` and `aria-disabled="true"` to the
  disabled menu items.
- Wrap in a MUI `Tooltip` with the explanation text.
- Use "Planned" instead of "Coming Soon" per the general terminology principle
  (avoids implying imminent delivery).

---

### L-04 — Vite production bundle exceeds 500 kB chunk threshold

**Area:** UX (load performance)  
**Source:** Phase 4E-G and Phase 4E-J Sprint 1 reports

The primary frontend bundle consistently exceeds Vite's default 500 kB chunk
warning. This warning has persisted across multiple phases without being
addressed. On slower mobile connections this increases first-contentful-paint
time, which is particularly harmful for Owners and Captains joining a live
auction on mobile devices.

Required fix:  
- Run `npx vite-bundle-visualizer` (or equivalent) to identify the largest
  contributors.
- Apply route-based code splitting for the heaviest pages (Festival Management,
  Sport Tournament Management, Auction Hub, Arena pages).
- Material UI tree-shaking should already be in effect; confirm it via the
  bundle analysis.
- Target: no single chunk above 500 kB.

---

### L-05 — "Needs Attention" label still present in some dashboard sections

**Area:** Terminology consistency  
**Source:** Phase 4E-I renamed "Needs Attention" → "Action Required"

Phase 4E-I explicitly lists "Replaced 'Needs Attention' with 'Action Required'."
Verify this replacement is applied to all dashboard section headings and card
eyebrow labels across Admin, Owner, Captain, and Spectator dashboards.

Required fix:  
- Search `.jsx` files for "Needs Attention" as a rendered string.
- Replace with "Action Required."

---

### L-06 — Festival Journey label survives in some admin dashboard sections

**Area:** Terminology consistency  
**Source:** Phase 4E-I renamed "Festival Journey" → "Festival Progress"

Phase 4E-I lists "Replaced 'Festival Journey' with 'Festival Progress'." Verify
this applies to the `AdminProductDashboard` and any `FestivalCommandCenter`
section still using the old label.

Required fix:  
- Search rendered strings for "Festival Journey."
- Replace with "Festival Progress."

---

### L-07 — Arena mobile sticky bid action may obscure live content at certain heights

**Area:** Mobile responsiveness  
**Source:** Phase 4E-G and Phase 4E-H mobile risk notes

The sticky "Place Bid" bottom action bar is documented as a risk on mobile:
if not properly offset, the fixed bar can cover the last visible content row
(e.g., the live bid stream or team balance). Phase 4E-G verified the basic
responsive structure but noted real-device testing is still needed.

Required fix:  
- Add `padding-bottom` equal to the sticky bar height to the page scroll
  container so the bar never covers content.
- Verify on iPhone SE (375 px) and Android at 360 px that the timer, current
  bid, and Place Bid button are all reachable without scrolling.
- Verify that when the virtual keyboard opens (e.g., if any input field exists
  in the Arena), the sticky bar repositions correctly.

---

### L-08 — Confirmation dialogs for irreversible Admin actions lack consistent destructive-action hierarchy

**Area:** UX, accessibility  
**Source:** Phase 4E-G mobile risks; Phase 4E-H §12 workspace consistency rules

Phase 4E documentation specifies that irreversible finalization actions (Sell,
Mark Unsold, Complete Auction, End Auction) must require explicit confirmation,
and that destructive actions must not share equal visual weight with safe
actions.

Audit required:
- Does "Mark Unsold" have the same button weight as "Extend Round"?
- Does "Sell to [Team]" use a primary CTA style while "Extend" uses a secondary
  style, or are both primary buttons?
- Does "Complete Auction" have a confirmation dialog with consequence
  explanation?

Required fix:  
- Destructive finalization actions (Sell, Mark Unsold, Complete Auction, End
  Auction) must use a confirmation dialog that states the consequence.
- Safe recovery actions (Extend Round, Refresh, Cancel) must be visually less
  prominent than the finalization action.

---

### L-09 — Keyboard navigation not confirmed for Arena bid action and admin finalization controls

**Area:** Accessibility  
**Source:** Phase 4E-J Header/Profile (MUI keyboard behavior documented for
profile menu); Arena keyboard behavior not audited

The Arena is a time-sensitive interaction surface. Keyboard users (and screen
reader users) need to:
- Tab to the Place Bid button without cycling through Team Purse rows.
- Tab to Extend, Sell, and Mark Unsold without ambiguity about the order.
- Receive a live region announcement when a new bid is placed by another team.

Required fix:  
- Verify tab order in the Arena places the primary action (Place Bid / Finalize)
  reachable in ≤ 3 Tab presses from the Arena header.
- Add `aria-live="polite"` to the Live Bid Stream so new bids are announced to
  screen readers.
- Add `aria-live="assertive"` to the timer display so expiry is announced.
- Confirm all icon-only buttons in the Arena have `aria-label`.

---

### L-10 — `VerifyEmail` page has no link back to Login on success or error

**Area:** UX, navigation  
**Source:** Codebase scan — `VerifyEmail.jsx` exists as an unprotected route;
not referenced in any Phase 4E documentation

The email verification page is an unprotected route visited from an email link.
After verification succeeds (or fails), the user needs a clear path to login.
If no explicit navigation exists, users who land on this page from a stale or
already-used link may be stranded.

Required fix:  
- On success: show a success message and a prominent "Continue to Login" button.
- On error (invalid or expired token): show a clear error message, explain what
  happened, and offer "Return to Login" or "Resend Verification Email" if a
  resend flow exists.

---

### L-11 — `ChangePassword.jsx` page has no "Cancel" path for forced change flows

**Area:** UX, profile management  
**Source:** Codebase scan — `RouteGuards.jsx` redirects to `/change-password`
when `user.mustChangePassword` is true; only forced-change path is documented

When `mustChangePassword` is true the user is redirected to `/change-password`
and cannot reach any other protected route. There is no way to log out from
this page if the user wants to abort the session.

Required fix:  
- Add a "Sign Out" link on the Change Password page.
- The sign-out action must clear the session and redirect to `/login`.
- The user should not be able to navigate back to a protected route via the
  browser back button without completing the password change or signing out.

---

### L-12 — `DefaultRoute` catch-all behavior not confirmed for unknown authenticated routes

**Area:** Navigation  
**Source:** Codebase scan — `App.jsx` has `*` → `DefaultRoute` which redirects
to `/dashboard`; no 404 page exists

Unknown URLs visited by authenticated users silently redirect to `/dashboard`
with no message. Users who follow a stale or incorrect internal link do not
know why they were redirected.

Required fix:  
- Add a `NotFoundState` (using `ProductStateCard`) that renders for the `*`
  catch-all route when the user is authenticated.
- Show: "Page not found. The link you followed may be outdated." with a
  "Go to Dashboard" action.
- The redirect to Dashboard may remain as a fallback after a brief delay, or
  the state page may include both a countdown and an immediate action.

---
