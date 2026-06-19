# Festival Setup Stabilization Report

Completed: 2026-06-11

## Scope

This pass fixes workflow regressions in the existing Festival Setup Wizard. It
adds no business features, does not change auction lifecycle logic, and does
not begin Phase 4.

## Root Causes

- Wizard completion was inferred independently in the frontend.
- Readiness was refreshed by the Control Center only when a revision happened.
- Several successful mutations refreshed their local component but did not
  invalidate readiness.
- Budget configuration did not notify the parent workspace.
- Team-dependent setup components could retain data loaded before Team changes.
- Numeric step persistence became ambiguous after changing step order.

## Stabilized Step Order

1. Festival Details
2. Setup Foundation (Sports and Employees)
3. Participants
4. Teams
5. Budget
6. Owners
7. Retentions
8. Auction Pool
9. Review & Launch

## Step Audit

| Step | Previous completion rule | Actual backend requirement | Bug found | Fix applied |
|---|---|---|---|---|
| Festival Details | Always complete | Festival exists and was returned by the authenticated API | No explicit backend step state | Backend readiness now returns `festivalDetails` |
| Setup Foundation | Sports and Employees were separate count checks | At least one enabled Sport and active Employee data available for setup | Separate screens and stale readiness blocked Next | Merged the UI and use backend `setupFoundation` |
| Participants | Participant count only | Registered participants and at least one participant sport registration | Participants could complete without sport registration | Backend `participants` checks both requirements |
| Teams | At least two Teams from stale frontend counts | At least two active Festival Teams | Team creation did not immediately update readiness/dependencies | Team mutations await centralized invalidation |
| Budget | Any readiness object existed | Festival auction config must exist | Budget could appear complete before configuration; save emitted no parent refresh | Backend `budget` uses `Boolean(config)` and save invalidates |
| Owners | Assigned count equaled Team count | Every active Team needs an assigned, linked, active `team_owner` Owner | Assignment count ignored activation blockers | Backend `owners` uses Team readiness cards |
| Retentions | Always complete | Retentions are optional | Rule was implicit and ordering was inconsistent | Backend explicitly returns `retentions: true` |
| Auction Pool | Available or unsold count | Setup requires a non-empty available pool | Unsold fallback was inconsistent with launch blockers | Backend `auctionPool` requires available pool size |
| Review & Launch | Frontend compared `overallStatus` | No backend readiness blockers | Could remain stale after valid mutations | Backend returns `reviewAndLaunch`; every mutation refreshes it |

## Invalidation Contract

`invalidateFestivalSetup` is the single parent refresh path. It:

1. Increments the shared setup revision.
2. Reloads Festival detail.
3. Reloads data required by the active step.
4. Reloads backend readiness immediately.

Sports, participant bulk actions, participant removal, sport assignment,
imports, roster mode changes, Team mutations, Budget changes, Owner
assignments, and Retention changes all await this invalidation.

Team creation therefore updates readiness immediately. Moving to Owners or
Retentions mounts the setup component with the new revision and loads the
current Team list and Owner records. No browser reload is used.

The wizard also provides Refresh Progress and refreshes when a step is opened.
This covers backend changes made outside the current admin page, such as an
Owner completing account registration in another browser.

## Persistence

Wizard resume now stores the stable step name under
`festival-setup-step-v2:<festivalId>`. Step names survive navigation and avoid
incorrect resume positions when the ordered step list changes.

## Tests

Coverage verifies:

- Sports/Employee foundation completion enables Next.
- Team creation invokes dependent-query invalidation.
- Budget completion unlocks Owners.
- No `window.location.reload` dependency exists.
- Completion state comes only from backend `setupSteps`.
- Step completion persists across navigation.
- Wizard resume resolves stable step names.

## Remaining Constraint

Owner completion intentionally remains blocked until every Owner satisfies the
existing backend account-linking, role, employment, and activation rules. This
is not a wizard regression; it is the launch requirement already enforced by
backend readiness.
