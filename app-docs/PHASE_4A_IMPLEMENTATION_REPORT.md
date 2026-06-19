# Phase 4A Sport Tournament Foundation

Completed: 2026-06-14

## Findings

- `Employee` and `FestivalParticipant` already provide the required canonical
  person and Festival identity.
- `FestivalTeamMemberships` is the authoritative parent Team roster.
- `FestivalParticipantSports` is the authoritative Sport registration source.
- `FestivalTeamOwners` provides the correct assignment-derived mini-admin
  boundary.
- No existing legacy Tournament or Festival Auction table can safely represent
  internal Sport Tournaments, Teams, or Captains.
- Festival Team Owners must remain eligible participants. No Owner exclusion
  was added.

## Database Changes

Migration:

```text
202606140002-sport-tournament-foundation.js
```

New tables:

- `SportTournaments`
- `SportTeams`
- `SportTeamCaptains`
- `SportTeamMemberships`

The migration is additive, recovery-aware at table level, and does not create
Sport Auction, bid, fixture, match, standing, or competition tables.

The complete approved Sport Tournament status enum is stored. Phase 4A only
transitions setup state between `draft`, `setup`, and `ready`.

## API Changes

All routes require bearer authentication. Mutation authorization is derived
server-side from admin status or the active parent `FestivalTeamOwner`
assignment.

```text
GET   /api/v2/sport-tournaments
GET   /api/v2/sport-tournaments/owner-contexts
POST  /api/v2/festivals/:festivalId/teams/:festivalTeamId/sport-tournaments
GET   /api/v2/sport-tournaments/:sportTournamentId
PATCH /api/v2/sport-tournaments/:sportTournamentId

GET   /api/v2/sport-tournaments/:sportTournamentId/teams
PATCH /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId

POST   /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain
DELETE /api/v2/sport-tournaments/:sportTournamentId/teams/:sportTeamId/captain

GET /api/v2/sport-tournaments/:sportTournamentId/eligibility
GET /api/v2/sport-tournaments/:sportTournamentId/readiness
```

No Sport Auction lifecycle, bidding, budget, pool, result, or Socket.IO API was
added.

## UI Changes

New authenticated routes:

```text
/sport-tournaments
/sport-tournaments/:sportTournamentId
```

Admins and Team Owners receive a Sport Tournaments navigation item.

The directory supports assignment-scoped Tournament creation. Creation
automatically generates the configured number of Teams using names such as:

```text
Cricket Team A
Cricket Team B
Cricket Team C
```

The workspace provides:

- Overview
- Teams
- Captains
- Eligibility
- Readiness
- Settings

Teams can be renamed. Captains are selected from server-derived eligible
Employees. Settings changes recompute readiness.

## Eligibility Design

The reusable eligibility service evaluates every Festival Participant and
returns included and excluded records.

Required conditions:

- Registered Festival Participant
- Active Employee
- Parent Festival Team membership
- Registration for the Tournament Sport
- Gender rule match

Exclusion reason codes:

- `PARTICIPANT_WITHDRAWN`
- `EMPLOYEE_INACTIVE`
- `NOT_ON_PARENT_FESTIVAL_TEAM`
- `SPORT_NOT_REGISTERED`
- `GENDER_RULE_MISMATCH`

Festival Team ownership is not an exclusion. An eligible Owner can be assigned
as Captain.

## Readiness Design

Readiness is server-authored and returns:

- `readinessScore`
- `readinessStatus`
- Exact `blockers`
- Counts
- Per-Team Captain readiness

Checks:

- Tournament exists
- Active Team count matches configured Team count
- Every Team has a Captain
- Every Captain remains eligible
- At least one eligible non-Captain participant remains

The service persists `ready` only when all checks pass; otherwise setup state is
`setup`.

## Tests Added

`sport-tournament-foundation-phase4a.test.js` covers:

- Complete status model
- Valid eligibility
- Exact exclusion reasons
- Owner-as-Captain validity
- Zod validation
- Additive migration and table scope
- Assignment-derived API authorization contracts
- Readiness score/status/blockers
- Dedicated UI routes and sections
- Absence of Phase 4B+ UI and API actions

Verification:

- Phase 4A focused tests: 9 passed
- Phase 4A named suite selection: 43 passed
- Backend module import smoke check: passed
- Frontend ESLint: passed
- Frontend production build: passed
- Full backend suite: 203 passed, 15 failed due to pre-existing static-contract
  mismatches in unrelated legacy/Festival files and documentation

## Manual Verification

1. Apply migrations with `npm run db:migrate`.
2. Complete a Festival Auction so the parent Festival roster is final.
3. Log in as an active Festival Team Owner.
4. Open Sport Tournaments and create Cricket Men with three Teams.
5. Confirm Cricket Team A, B, and C are generated.
6. Rename a Team and confirm the workspace refreshes.
7. Open Eligibility and confirm only active Trojans Cricket Male participants
   are included.
8. Confirm excluded Employees display exact reason codes.
9. Assign eligible Captains to each Team.
10. Assign the Festival Team Owner as Captain when eligible and confirm it is
    accepted.
11. Attempt to assign one Employee to a second Team in the same Tournament and
    confirm the request is rejected.
12. Confirm readiness reaches `READY` only when every Team has an eligible
    Captain and at least one eligible non-Captain participant remains.
13. Confirm no Sport Auction or bid actions are visible.

## Remaining Risks

- Migration execution was not performed against a live database in this task.
- Full concurrent Captain-assignment integration tests require a disposable
  MySQL database.
- Parent Festival roster changes after Sport setup can invalidate eligibility;
  Phase 4B must define locking or audited recovery before auctions start.
- Sport Tournament Manager delegation remains deferred.
- Captain login-specific workflow and Captain bidding remain Phase 4B+.
- Competition Engine, fixtures, matches, standings, and progression remain
  unimplemented.
