# Phase 4E-J Product Review and Gap Analysis

## Status

This is a product review and gap analysis of
`PHASE_4E_J_SETUP_FIRST_EXPERIENCE_ARCHITECTURE.md`.

No implementation, code, route, API, database, Socket.IO, permission, bidding,
timer, auction-logic, or workflow change is included.

## Review Summary

The setup-first architecture is directionally correct. It identifies the main
product failure: newly created Festivals look like auction objects before they
are operationally ready. The proposed stage model is the right framing:

```text
Festival Setup
-> Festival Ready
-> Auction Live
-> Results & Reporting
```

The document is not yet implementation-ready. It needs sharper role-specific
journeys, clearer definitions for "Launch" versus "Open Live Auction", a better
new-Festival first-run path, and stronger rules for owner, captain, and
spectator waiting states. It also needs to decide whether some existing screens
are truly separate destinations or should become stage-specific views of the
same object.

## What Is Good

- Correctly reframes the product around setup before auction.
- Correctly identifies that route availability is not the same as product
  readiness.
- Correctly calls out shared contextual navigation as the primary source of
  premature exposure.
- Correctly separates Auction Details from Live Auction.
- Correctly treats Results as a post-outcome/reporting surface.
- Correctly avoids backend, schema, socket, timer, permission, and bidding rule
  changes.
- Correctly keeps setup validation anchored to existing server checks.
- Correctly warns that direct URL visits need setup-first fallback states.
- Correctly identifies Auction Directory as too broad and too auction-centric.
- Correctly continues Phase 4E-I terminology cleanup by preferring Setup
  Issues, Setup Status, Auction Details, Live Auction, and Results.

## Persona Review

### 1. First-Time Festival Admin

What works:

- Setup-first direction matches the admin's real first job.
- Proposed checklist gives the admin a path instead of a blank workspace.
- "Next required action" is the right first-viewport priority.

Gaps:

- The architecture does not fully define the first screen after creating a
  Festival. A first-time admin needs an immediate handoff: "Festival created.
  Continue setup."
- The setup checklist starts with Configure Festival, but a newly created
  Festival already has name, code, dates, timezone, and currency. The next step
  should distinguish "Review Festival Details" from "Configure missing
  Festival details."
- Employee prerequisite is under-specified. If no employees exist, Add
  Participants is impossible or confusing. The flow needs a clear Employee
  Directory prerequisite or import path.
- The order mixes Festival-level and Sport-level setup too early. Create Sport
  Tournaments and Assign Captains should not block the Main Festival Auction
  unless the product explicitly requires Sport setup before the main auction.
- Error recovery is too generic. Admins need retry, import correction,
  partial-save recovery, and "return to last incomplete step" behavior.

Needed before implementation:

- Define the first-run post-create destination and copy.
- Define prerequisites for employees, participants, sports, teams, owners,
  budgets, retentions, and pool generation.
- Decide whether Sport Tournament setup is required before launching the Main
  Festival Auction or belongs after Festival rosters are created.

### 2. Festival Team Owner

What works:

- The architecture recognizes that owners should not see setup-incomplete
  entities as auctions.
- Waiting states are mentioned for non-admin users.

Gaps:

- Owner setup responsibilities are not clearly separated from admin setup.
  Owners may need to review team roster, confirm retentions, manage Sport
  Tournaments, or simply wait.
- The proposed hiding rules risk removing useful context. An owner should know
  whether they have an assigned Festival Team, whether the Festival is still
  being configured, and whether they should prepare for bidding.
- "Waiting for Launch" is not enough. Owners need "Your Team", budget/purse,
  retained players, roster size, and auction start status when available.
- The architecture does not specify when owners first get access to team
  context: setup, ready, live, or completed.
- Owner dashboards may still have duplicate concepts: Festival team owner,
  Sport Tournament manager, and Sport Captain-like participation can overlap.

Needed before implementation:

- Define owner-visible setup states:
  no assignment, assigned/waiting, review team, ready for auction, live bidder,
  completed roster.
- Ensure hiding Auction Directory entries does not hide the owner's assigned
  team context.
- Define owner primary actions per stage.

### 3. Sport Captain

What works:

- Sport Captain is acknowledged in prior Phase 4E work as assignment-derived,
  not a global role.
- Sport Tournament setup checklist includes captain assignment.

Gaps:

- The architecture does not define the captain's pre-auction experience.
  Captains need to know: "You captain this Sport Team", "Auction is not ready",
  "Auction is ready", or "Join Live Auction".
- Captains may be global spectators or team owners at the account level. The
  proposal needs capability-based dashboard language, not only role-based
  navigation.
- Captain access to Sport Auction Details before launch is ambiguous. They may
  need to see roster, credits, and eligible pool, but not bid history/results.
- There is no explicit captain onboarding or assignment-discovery moment.

Needed before implementation:

- Define Captain Dashboard cards separately from spectator cards.
- Define a captain waiting state on Sport Tournament Overview.
- Define what a captain may inspect before live auction without making the
  experience auction-first.

### 4. Spectator

What works:

- Spectators should not see setup-incomplete entities as auctions.
- The architecture keeps spectators away from management actions.

Gaps:

- Spectator discovery is under-specified. If Auctions hides setup-stage items,
  a spectator may see an empty product with no explanation.
- Spectators need a clear distinction between Upcoming, Live, and Completed.
  "Ready" may not mean watchable.
- Results discoverability is only discussed after outcomes exist, but
  spectators often return later specifically to find results.
- Direct URL behavior for spectators should not route to setup pages they
  cannot act on.

Needed before implementation:

- Define spectator empty states:
  no visible Festivals, upcoming but not launched, live now, completed results.
- Define whether spectators can see Festival Directory at all or only Auctions.
- Define "Watch Live" as distinct from "Open Live Auction" if the user cannot
  bid or manage.

### 5. Festival Organizer

What works:

- Setup-first philosophy maps well to organizer duties.
- Stage-based flow gives organizers operational clarity.

Gaps:

- "Festival Organizer" is not represented as a product capability distinct
  from admin. If organizer means admin, the architecture should say so. If it is
  a future scoped role, do not imply permission changes in Phase 4E-J.
- Organizer reporting needs are broader than auction results: setup completion,
  participant coverage, owner activation, missing captains, and budget status.
- The architecture proposes Reports in completed state but does not define
  what reports exist using current data.

Needed before implementation:

- Treat Festival Organizer as current admin capability unless a future role is
  explicitly introduced later.
- Define organizer-facing reports as current-data views, not new report
  engines.

## Product Flow Gaps

### Missing User Journeys

- Post-create Festival first-run journey.
- Employee import or employee prerequisite journey.
- Admin recovery when participant import partially fails.
- Owner assignment pending journey.
- Owner pre-auction preparation journey.
- Captain assignment discovery journey.
- Captain pre-auction waiting journey.
- Spectator upcoming/live/completed discovery journey.
- Direct-link recovery for hidden future-stage routes.
- Completed auction return journey from Dashboard, Auctions, Festival, and
  Sport Tournament surfaces.

### Confusing Transitions

- "Ready" to "Live" is not defined tightly enough. The architecture says
  Launch Festival Auction but does not specify whether this navigates to the
  Live Auction page, starts the auction, or opens a launch confirmation.
- Ready Sport Tournament actions still risk becoming Open Live Auction without
  a review step.
- Festival setup to Sport Tournament setup is unclear. The product has two
  auction layers, and the architecture needs to say when each layer becomes
  relevant.
- Completed state still includes Auction Details, which may duplicate Results
  unless each page has a clear job.

### Navigation Dead Ends

- If Auction Details is hidden during setup, direct visits need a route out:
  Continue Setup, Back to Overview, or Waiting for Launch.
- If owners/spectators cannot see setup-stage auctions, their Auctions page may
  become empty without explaining what will appear later.
- If Sport Tournaments remains in owner navigation, owners need clear cards for
  managed tournaments versus captain assignments versus watch-only tournaments.

### Missing Actions

- Continue Setup.
- Resume Setup from last incomplete step.
- Review Festival Details.
- Import Employees.
- Add Participants.
- Assign Sports.
- Create Teams.
- Assign Owners.
- Configure Budget.
- Confirm Retentions.
- Generate Pool.
- Review & Launch.
- Waiting for Launch for non-admin users.
- Watch Live for spectators.
- Join Auction for active bidders.
- View Completed Results.

### Duplicate Screens

- Festival Overview and Festival Management Overview can duplicate setup
  status.
- Sport Tournament Overview and Sport Tournament Management Overview can
  duplicate readiness and counts.
- Auction Details Results tab and dedicated Results page can duplicate
  reporting.
- Dashboard Recent Outcomes and Auction Directory completed cards can duplicate
  Results discovery.
- Festival Results inside Management and dedicated Festival Results should not
  both be primary.

### Functionality Exposed Too Early

- Auction Details during setup.
- Live Auction during setup.
- Results during setup.
- Bid History during setup.
- Live Activity before launch.
- Recent Results before finalized outcomes.
- Auction Directory entries for draft/setup objects.
- Open Live Auction for ready-but-not-launched contexts when the intended
  action is Launch.

### Functionality Exposed Too Late

- Owner team context may become hidden until auction launch even though owners
  need to prepare.
- Captain team context may become hidden until Sport Auction launch.
- Spectator upcoming status may disappear if setup-stage items are removed too
  aggressively.
- Results should be discoverable as soon as the first finalized round exists,
  not only after full completion.

### Setup-First Violations Remaining In The Proposal

- Ready state still includes possible Auction Details pre-launch review without
  strict rules.
- Completed state still includes Auction Details before Results in one proposed
  nav order variant.
- Global Auctions remains a primary navigation item for all users, which may
  continue implying auction-first unless empty/setup states are redesigned.
- Sport Tournament setup is still partly described through Auction Rules and
  Auction Setup, which can be valid but needs careful placement.

## Setup Experience Review: Newly Created Festival

Scenario:

```text
Festival = Draft
Auction = Not Configured
Sport Tournaments = None
```

The proposed flow is directionally intuitive, but not complete enough for a
first-time admin.

### Missing Setup Steps

- Confirm employee directory exists or import employees.
- Enable Festival sports before assigning participant sports.
- Add or import participants.
- Assign participant sports.
- Choose roster formation mode if the product supports non-auction formation.
- Create Festival teams.
- Assign Festival team owners.
- Activate owner accounts or confirm linked users.
- Configure team budgets/purses.
- Configure auction rules.
- Configure retentions, if applicable.
- Generate main Festival auction pool.
- Run setup check.
- Review launch summary.
- Launch main Festival auction.

Sport Tournament setup should likely be a separate post-Festival-roster path:

- Create Sport Tournament.
- Confirm Sport Teams.
- Assign Captains.
- Configure credits.
- Review eligibility.
- Generate Sport auction pool.
- Review and launch Sport auction.

### Wrong Or Ambiguous Setup Order

- Create Sport Tournaments appears before the Festival auction has produced
  final Festival Team rosters. If Sport Tournaments depend on Festival Team
  membership, this should generally come after the main Festival auction or be
  clearly marked as later setup.
- Configure Auction Rules appears after Configure Budgets in the checklist, but
  timer/increment/reauction rules may be harmless to configure earlier.
- Assign Captains belongs to Sport Tournament setup, not the initial Festival
  setup path unless Sport setup is intentionally required before launch.

### Missing Guidance

- What is the minimum setup needed to launch the Main Festival Auction?
- Which steps are optional?
- Which steps can be done later?
- Who owns each step?
- Why is a step blocked?
- What data will be changed by each setup action?
- What happens after launch?

### Missing Completion Indicators

- Step completed.
- Step current.
- Step blocked by dependency.
- Step optional.
- Step locked after launch.
- Setup saved but not refreshed.
- Setup complete and ready to launch.

### Missing Success States

- Festival created.
- Participants added/imported.
- Teams created.
- Owners assigned.
- Owner accounts linked/activated.
- Budgets configured.
- Retentions saved.
- Pool generated.
- Setup check passed.
- Festival ready to launch.
- Auction launched.

### Missing Error Recovery Paths

- Retry setup status.
- Re-run setup check.
- Return to failed import rows.
- Resolve duplicate employee identity.
- Refresh after partial save.
- Regenerate pool after participant/team/budget changes.
- Explain locked setup after launch.
- Direct URL recovery when the user opens a hidden future-stage page.

## Auction Experience Review

### Festival Auction

What works:

- Separating Live Auction from Auction Details is correct.
- Results should become discoverable after finalized outcomes.
- Owners need Join Auction rather than generic Open Live Auction.

Gaps:

- Launch is not distinguished enough from opening the live page.
- Admins need a clear "select first participant" or "start first round" next
  step after launch.
- Owners need clear pre-live state, budget/purse context, and disabled bidding
  reasons.
- Spectators need Watch Live and readable status, not bidding vocabulary.
- Results should be visible after first finalized result and dominant after
  completion.

### Sport Auction

What works:

- Sport Auction has a better capability model because captains bid based on
  server-returned permissions.
- Sport setup checklist covers most setup prerequisites.

Gaps:

- Captains need an explicit "You are Captain of X" context before the auction.
- Owners/managers and captains can be different people; the stage model needs
  to account for both.
- Ready state should not skip review. A manager should see Ready to Launch; a
  captain should see Waiting for Launch or Join when live.
- Team Assignments and Results overlap in Sport Auction Details.
- Spectators need the same watch/upcoming/completed model as Festival Auction.

### Results Discoverability

Results should be stage-aware:

- No finalized rounds: hide Results or show "No results yet" only if directly
  visited.
- Some finalized rounds while live: show Results/progress as secondary.
- Completed: make Results primary.
- Dashboard and Auction Directory should link completed cards directly to
  Results, not Live Auction.

## Information Architecture Review

### Dashboard

Keep, but simplify. It should answer "What should I do now?" and vary by role
or capability.

Recommended hierarchy:

1. Action Required
2. Ready to Launch / Ready to Join
3. Live Now
4. My Assignments
5. Recent Results

Avoid long role dashboards that repeat Festival, Sport Tournament, Auction
Details, and Results in multiple card groups.

### Festivals

Keep as the admin's Festival directory. It should remain Festival-first and
not auction-first.

Change before implementation:

- Cards should route to stage-aware Festival Overview.
- Setup-stage action should be Continue Setup.
- Completed action should be View Results or Open Festival Summary.

### Sport Tournaments

Keep, but clarify purpose. It currently mixes creation, setup, owner
management, captain participation, and spectator discovery.

Potential split:

- For admins/owners: Sport Tournaments as setup/management.
- For captains/spectators: relevant active/upcoming/completed Sport Auctions
  should surface through Dashboard and Auctions.

Do not add new global navigation yet unless the role/capability model demands
it.

### Auctions

Keep only if it becomes a stage-aware auction directory:

- Ready to launch
- Live / paused
- Completed

It should not be the place for draft/setup Festivals. Setup belongs under
Festivals or Sport Tournaments.

### Merge Or Split Decisions

Should merge or demote:

- Festival Management Overview should not duplicate Festival Overview.
- Sport Tournament Management Overview should not duplicate Sport Tournament
  Overview.
- Management Results tabs should be demoted if dedicated Results pages exist.

Should stay separate:

- Setup/Management and Live Auction should remain separate.
- Auction Details and Live Auction should remain separate.
- Dashboard and directories should remain separate because one is task-first
  and the other is browsing/search.

Needs decision:

- Auction Details versus Results after completion. If Auction Details is broad
  reporting and Results is final outcomes, keep both but make Results primary
  after completion.

## Phase 4E UX Debt Review

### Remaining UX Debt

- Stage visibility is not centralized.
- Direct URL fallback states are not defined in enough detail.
- Dashboard still risks long, duplicated role sections.
- Auction Directory still risks becoming an object dump.
- Setup progress is not yet the dominant first-run experience.
- Owner/captain/spectator waiting states are under-designed.
- Result surfaces remain duplicated across Dashboard, Hub, Management, Arena
  strips, and dedicated Results pages.
- Empty states need stronger "what happens next" guidance.

### Remaining Terminology Issues

- "Launch", "Open", "Join", and "Watch" need strict role/stage usage.
- "Ready" needs qualification: Ready to Launch, Ready to Join, or Waiting for
  Launch.
- "Auction Details" may sound relevant before launch; if hidden, direct-visit
  copy must clarify when it becomes useful.
- "Festival Organizer" should not imply a new role in Phase 4E-J.
- "Auction Rules" is better than "Auction Settings" when describing setup.

### Remaining Workflow Inconsistencies

- Festival main auction and Sport auction have different status vocabularies.
- Festival owner and Sport captain participation models differ.
- Ready Sport Tournament actions historically open Arena; the review should
  add a launch/review step.
- Results sometimes route to Arena-like pages and sometimes dedicated results.
- Setup lock behavior is visible but not always explained as a stage transition.

### Remaining Dashboard Inconsistencies

- Admin, owner, captain, and spectator dashboards may not share the same stage
  language.
- Captain capability is still assignment-derived and can be buried.
- Recent outcomes should route to Results, not live pages.
- Empty Live Now sections should not occupy priority space.
- Dashboard hero should not default to Auctions unless live/ready items exist.

### Remaining Arena Inconsistencies

- Festival and Sport Arenas should share consistent launch/live/completed
  entry semantics.
- Start controls should be clearly separated from live bidding controls.
- Recent Results strips should be secondary during live bidding and absent
  before any result exists.
- Completed auctions should not keep Live Auction as a primary destination.
- Spectator language should be Watch Live, not Join/Open when there are no
  controls.

## What Should Change Before Implementation

1. Add a role/capability matrix for every stage.
2. Define first-run Festival setup flow from Festival creation to first setup
   action.
3. Decide whether Sport Tournament setup is part of the pre-main-auction
   Festival setup path or a later post-roster path.
4. Define exact button language by role and stage:
   Continue Setup, Review Setup, Launch Auction, Join Auction, Watch Live, View
   Results.
5. Define direct-URL fallback states for hidden future-stage pages.
6. Decide which Results surfaces remain primary and which become secondary.
7. Define Auction Directory inclusion rules.
8. Define owner/captain/spectator waiting states.
9. Define setup success and error-recovery states.
10. Add acceptance criteria before implementation begins.

## Priority Ranking

### Critical

- Define stage visibility rules by role/capability, not just by screen.
- Define the newly created Festival first-run setup journey.
- Resolve whether Sport Tournament setup is required before Main Festival
  Auction launch.
- Replace premature Auction Details, Live Auction, Results, Bid History, and
  Live Activity exposure during setup.
- Define direct-URL fallback states for hidden future-stage routes.

### High

- Clarify Launch versus Open Live Auction versus Join Auction versus Watch
  Live.
- Define owner, captain, and spectator waiting states.
- Make Auction Directory stage-aware and remove setup-stage object dumping.
- Remove duplicate Results as primary destinations across Management, Hub, and
  dedicated Results pages.
- Make Dashboard cards route to stage-correct destinations.
- Add setup success states and recovery paths.

### Medium

- Refine setup checklist order and dependency labels.
- Demote duplicate Overview sections inside Management pages.
- Add stronger completion indicators to setup progress.
- Standardize Festival and Sport status language.
- Ensure Results appears after the first finalized outcome, not only after full
  completion.
- Define completed-state IA where Results is primary and Auction Details is
  secondary.

### Low

- Tune empty-state copy across role dashboards.
- Add optional "upcoming auction" spectator context.
- Revisit Account/Profile shortcuts once setup-first navigation settles.
- Keep Competition wording absent from Phase 4E-J user-facing flows.
- Add future frontend tests after the architecture is approved and an
  implementation plan exists.

