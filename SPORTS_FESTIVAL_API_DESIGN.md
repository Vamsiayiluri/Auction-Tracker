# Corporate Sports Festival API Design

## 1. API Conventions

Recommended base: `/api/v2`.

Principles:

- Resource IDs are opaque.
- Every business resource is explicitly festival-scoped.
- Authentication identity is never accepted in mutation payloads.
- Owner/team scope is derived from active assignments.
- Mutations use Zod validation and server-side authorization.
- Financial/allocation finalization supports `Idempotency-Key`.
- List endpoints support `page`, `pageSize`, filters, and stable sorting.
- Responses use safe DTOs and do not expose raw Sequelize records.

Common response:

```json
{
  "data": {},
  "meta": {}
}
```

Common error:

```json
{
  "success": false,
  "code": "SPORT_ELIGIBILITY_REQUIRED",
  "message": "Employee is not registered for this sport",
  "errors": []
}
```

## 2. Authorization Vocabulary

- `platform_admin`: full platform administration.
- `festival_admin`: scoped through `FestivalRoleAssignment`.
- `employee`: normal authenticated user linked to an employee.
- `team_owner`: not a target global role. "Owner" below means an employee with
  an active `TeamOwnershipAssignment`.

Server policies:

- `canManageFestival(festivalId)`
- `canManageFestivalTeam(festivalTeamId)`
- `canBid(auctionEventId, bidderAccountId)`

## 3. Festival APIs

### `POST /api/v2/festivals`

Auth: platform admin.

```json
{
  "name": "Corporate Sports Festival 2027",
  "code": "CSF-2027",
  "startDate": "2027-02-01",
  "endDate": "2027-02-15",
  "timezone": "Asia/Kolkata",
  "registrationOpensAt": "2026-12-01T03:30:00Z",
  "registrationClosesAt": "2026-12-20T18:29:59Z"
}
```

```json
{
  "data": {
    "id": "festival_01",
    "name": "Corporate Sports Festival 2027",
    "status": "draft"
  }
}
```

### `GET /api/v2/festivals`

Auth: authenticated. Returns festivals visible to the caller.

### `GET /api/v2/festivals/:festivalId`

Auth: authenticated; visibility policy.

### `PATCH /api/v2/festivals/:festivalId`

Auth: platform/festival admin. Draft/configurable fields only.

### `POST /api/v2/festivals/:festivalId/transitions`

Auth: platform/festival admin.

```json
{"toStatus":"registration_open"}
```

The server validates the lifecycle transition.

## 4. Sport Management APIs

### `GET /api/v2/sports`

Auth: authenticated or public if catalog visibility is intended.

### `POST /api/v2/festivals/:festivalId/sports`

Auth: platform/festival admin.

```json
{
  "sportId": "cricket",
  "config": {
    "requiresInternalTeams": true,
    "maximumTeamsPerFestivalTeam": 3
  }
}
```

### `GET /api/v2/festivals/:festivalId/sports`

Auth: authenticated.

### `PATCH /api/v2/festivals/:festivalId/sports/:festivalSportId`

Auth: platform/festival admin.

## 5. Employee and Registration APIs

### `POST /api/v2/employees/import`

Auth: platform/festival admin according to directory policy.
Purpose: asynchronous HR import for larger datasets.

### `GET /api/v2/employees`

Auth: admin. Paginated and searchable by employee number/name/email.

### `GET /api/v2/me/employee`

Auth: authenticated linked employee.

### `PUT /api/v2/festivals/:festivalId/registrations/me`

Auth: employee. Replaces the caller's selected sports while registration is
open.

```json
{
  "selectedSportIds": [
    "chess",
    "cricket"
  ]
}
```

```json
{
  "data": {
    "festivalId": "festival_01",
    "employeeId": "employee_10",
    "status": "submitted",
    "sports": [
      {"id":"chess","name":"Chess"},
      {"id":"cricket","name":"Cricket"}
    ]
  }
}
```

No skill or rating is accepted.

### `GET /api/v2/festivals/:festivalId/registrations/me`

Auth: employee.

### `GET /api/v2/festivals/:festivalId/registrations`

Auth: festival admin. Filters: sport, status, allocated/unallocated.

### `PATCH /api/v2/festivals/:festivalId/registrations/:registrationId`

Auth: festival admin. Approve, reject, or correct under explicit audit policy.

## 6. Festival Team and Ownership APIs

### `POST /api/v2/festivals/:festivalId/teams`

Auth: festival admin.
Purpose: configures a franchise destination only. It does not add employees to
the roster.

```json
{
  "name": "Demons",
  "code": "DMN",
  "color": "#C62828"
}
```

### `GET /api/v2/festivals/:festivalId/teams`

Auth: authenticated. DTO fields vary by policy; private budget and owner
details require admin or matching owner assignment.

### `GET /api/v2/festivals/:festivalId/teams/:teamId`

Auth: authenticated with scoped DTO.

### `POST /api/v2/festivals/:festivalId/teams/:teamId/owner-assignments`

Auth: festival admin.
Purpose: atomically creates the owner assignment, mandatory owner retention,
main-purse charge, and festival team membership.

```json
{
  "employeeId": "employee_x",
  "assignmentRole": "owner",
  "retentionAmount": 500000,
  "mainBudgetAccountId": "demons_main_budget",
  "startsAt": "2026-12-01T00:00:00Z"
}
```

The endpoint rejects employees already owned by another festival team, duplicate
membership, or insufficient purse. It never creates another user or employee.

### `GET /api/v2/me/team-assignments?festivalId=:festivalId`

Auth: employee. Returns active and historical ownership assignments.

### `POST /api/v2/festivals/:festivalId/teams/:teamId/owner-assignments/:assignmentId/revoke`

Auth: festival admin.

## 7. Main Purse and Allocation Credit APIs

### `POST /api/v2/festivals/:festivalId/teams/:teamId/budgets`

Auth: festival admin.

```json
{
  "accountType": "main_purse",
  "initialAmount": 20000000
}
```

### `GET /api/v2/festivals/:festivalId/teams/:teamId/budgets`

Auth: festival admin or active owner of the team.

```json
{
  "data": [{
    "id": "budget_1",
    "accountType": "main",
    "initialAmount": 20000000,
    "spentAmount": 500000,
    "reservedAmount": 0,
    "availableAmount": 19500000
  }]
}
```

### `GET /api/v2/budgets/:budgetAccountId/transactions`

Auth: scoped admin/owner. Paginated.

These endpoints are financial and apply only to the main festival auction.

### `POST /api/v2/auction-events/:auctionEventId/allocation-credit-accounts`

Auth: festival admin or active owner of the host festival team.

```json
{
  "sportTeamId": "demons_cricket_a",
  "initialCredits": 1000
}
```

### `GET /api/v2/auction-events/:auctionEventId/allocation-credit-accounts`

Auth: scoped admin/owner.

```json
{
  "data": [{
    "id": "credits_team_a",
    "sportTeamId": "demons_cricket_a",
    "initialCredits": 1000,
    "spentCredits": 200,
    "reservedCredits": 0,
    "availableCredits": 800
  }]
}
```

Allocation credits are non-financial and must never be returned with currency,
price, amount-spent, or purse labels.

## 8. Retention APIs

### Main Retention

`POST /api/v2/auction-events/:auctionEventId/retentions`

Auth: festival admin. An owner may be allowed to propose, but confirmation
should be separately authorized.

Owner retention is not created through this general endpoint. It is mandatory
and atomic with owner assignment through the owner-assignment endpoint.

```json
{
  "employeeId": "employee_a",
  "festivalTeamId": "demons",
  "amount": 500000
}
```

```json
{
  "data": {
    "id": "retention_1",
    "type": "main",
    "status": "confirmed",
    "employee": {"id":"employee_a","name":"Employee A"},
    "festivalTeam": {"id":"demons","name":"Demons"},
    "amount": 500000
  }
}
```

### Sport Retention

Same endpoint, scoped by the sport auction event:

```json
{
  "employeeId": "employee_b",
  "festivalTeamId": "demons",
  "sportTeamId": "demons_cricket_a",
  "credits": 100
}
```

Server validates festival membership, sport registration, roster capacity, and
available allocation credits. Confirmation creates sport membership and consumes
credits atomically.

### Reverse Retention

`POST /api/v2/auction-events/:auctionEventId/retentions/:retentionId/reverse`

Auth: festival admin; only before configured lock/start boundary.

```json
{"reason":"Employee withdrew before auction lock"}
```

## 9. Main Auction APIs

### Create Main Auction

`POST /api/v2/festivals/:festivalId/auction-events`

Auth: festival admin.

```json
{
  "scopeType": "main",
  "valueType": "money",
  "name": "2027 Main Festival Auction",
  "rules": {
    "lotDurationSeconds": 20,
    "resetOnAcceptedBid": true,
    "incrementPolicy": "festival_default"
  }
}
```

### Configure Bidders

`POST /api/v2/auction-events/:auctionEventId/bidders`

Auth: festival admin.

```json
{
  "festivalTeamId": "demons",
  "budgetAccountId": "demons_main_budget"
}
```

### Build Eligible Pool

`POST /api/v2/auction-events/:auctionEventId/lots:generate`

Auth: festival admin.

```json
{
  "baseAmount": 100000,
  "ordering": "employee_name"
}
```

Response includes included and excluded employee counts and reasons.
Confirmed owner/main retentions are excluded. Auction readiness fails if an
active owner assignment lacks mandatory retention.

### Auction Reads

- `GET /api/v2/auction-events/:auctionEventId`
- `GET /api/v2/auction-events/:auctionEventId/lots`
- `GET /api/v2/auction-events/:auctionEventId/current-lot`
- `GET /api/v2/auction-events/:auctionEventId/history`

Auth: authenticated with festival visibility.

### Auction Control

- `POST /api/v2/auction-events/:auctionEventId/lots/:lotId/start`
- `POST /api/v2/auction-events/:auctionEventId/lots/:lotId/lock`
- `POST /api/v2/auction-events/:auctionEventId/lots/:lotId/extend`
- `POST /api/v2/auction-events/:auctionEventId/lots/:lotId/finalize-sale`
- `POST /api/v2/auction-events/:auctionEventId/lots/:lotId/finalize-unsold`

Auth: festival admin for main auction.

Sale request:

```json
{
  "winningBidId": "bid_99"
}
```

The server independently verifies that this is the highest accepted bid.

## 10. Sport Allocation Auction APIs

### Create Sport Auction

`POST /api/v2/festivals/:festivalId/auction-events`

Auth: festival admin or active owner where policy permits.

```json
{
  "scopeType": "sport",
  "valueType": "allocation_credit",
  "festivalSportId": "festival_cricket",
  "hostFestivalTeamId": "demons",
  "name": "Demons Cricket Auction",
  "rules": {
    "lotDurationSeconds": 20,
    "resetOnAcceptedBid": true,
    "minimumRosterSize": 6,
    "maximumRosterSize": 12
  }
}
```

### Eligible Pool

`GET /api/v2/auction-events/:auctionEventId/eligible-employees`

Auth: festival admin or active owner of host team.

```json
{
  "data": [{
    "employeeId": "employee_a",
    "name": "Employee A",
    "festivalTeamId": "demons",
    "sportId": "cricket",
    "eligibility": "eligible"
  }]
}
```

The pool cannot include employees outside the host festival team or employees
who did not select the sport.

### Sport Bidders

For multiple internal teams:

```json
{
  "sportTeamId": "demons_cricket_a",
  "allocationCreditAccountId": "credits_cricket_a"
}
```

### Sport Auction Readiness

`GET /api/v2/auction-events/:auctionEventId/readiness`

```json
{
  "data": {
    "ready": false,
    "blockers": [
      {"code":"CAPTAIN_REQUIRED","sportTeamId":"demons_cricket_b"},
      {"code":"RETENTIONS_NOT_LOCKED"}
    ]
  }
}
```

A sport auction cannot start until sport teams, credit accounts, roster limits,
locked retentions, and required retained captains exist. Auction-enabled sports
also require at least two active internal sport teams.

Sport auction control endpoints reuse the main lifecycle but finalization
consumes allocation credits and creates sport memberships. It creates no
financial transaction.

## 11. Socket.IO Auction Contract

Connect with JWT in handshake auth. Join:

```json
{"auctionEventId":"auction_1"}
```

Place bid:

```json
{
  "clientBidId": "client-generated-id",
  "auctionLotId": "lot_1",
  "auctionBidderAccountId": "bidder_demons_team_a",
  "bidValue": 125
}
```

The bidder account ID identifies the requested destination, but authorization
is entirely server-derived:

- main auction: caller has active owner assignment for bidder festival team
- sport auction: caller has active owner assignment for host team and may
  operate the selected sport-team bidder

For a main auction `bidValue` is money in the festival's configured integer
unit. For a sport auction it is non-financial allocation credits. The server
derives and returns `valueType`; clients do not choose or convert it.

Events:

- `auction:lot-started`
- `auction:bid-accepted`
- `auction:bid-rejected`
- `auction:deadline-updated`
- `auction:pending-finalization`
- `auction:lot-sold`
- `auction:lot-unsold`
- `auction:completed`

Rooms use `auction:{auctionEventId}`.

## 12. Roster and Captain APIs

### Festival Roster

`GET /api/v2/festivals/:festivalId/teams/:teamId/roster`

Auth: authenticated; financial acquisition fields are scoped.

### Create Sport Team

`POST /api/v2/festivals/:festivalId/sports/:festivalSportId/teams`

Auth: festival admin or active owner of parent festival team.

```json
{
  "festivalTeamId": "demons",
  "name": "Team A",
  "code": "A"
}
```

### Sport Roster

`GET /api/v2/festivals/:festivalId/teams/:teamId/sports/:festivalSportId/roster`

### Direct Membership

`POST /api/v2/sport-teams/:sportTeamId/members`

Auth: scoped admin/owner and only where the festival sport explicitly uses
direct selection, or for an audited migration/correction operation. It is not a
normal formation endpoint for auction-enabled sport teams and is disabled after
setup lock.

```json
{"employeeId":"employee_a"}
```

Server validates festival ownership and sport registration.

### Assign Captain

`POST /api/v2/sport-teams/:sportTeamId/captain-assignments`

```json
{
  "employeeId": "employee_a",
  "captainType": "captain",
  "startsAt": "2027-01-15T00:00:00Z"
}
```

Auth: festival admin or active owner. Captain must be an active member.
For auction-built sport teams, the member must have been added by a confirmed
sport retention. Captain assignment and retention must be complete before the
sport auction readiness check can pass.

An employee may be assigned to teams in different sports simultaneously. The
API rejects duplicate active internal-team membership only within the same
festival sport by default.

## 13. Future Enhancements (Out of Scope)

Competition management, fixtures, standings, playoffs, and match operations
were evaluated but are intentionally excluded from the current product scope.

## 14. UI-to-API Flow

### Admin

- Festival wizard uses festival, sport, team, and ownership endpoints.
- Registration dashboard uses registration lists and summary endpoints.
- Main auction console uses auction event/lot REST plus auction Socket.IO room.
- Sport setup uses sport roster, sport team, budget, retention, and sport
  allocation-credit auction endpoints.

### Owner

- Assignment selector uses `/me/team-assignments`.
- Team dashboard uses scoped roster/budget/sport endpoints.
- Auction consoles use server-authorized bidder accounts.
- Sport auction screens label bids and balances as credits, never currency.
- Captain and sport-team actions derive parent team authorization server-side.

### Employee

- Registration uses `/registrations/me`.
- Personal allocations and schedule use `/me` endpoints.
- Published teams and results use festival visibility endpoints.

## 17. Legacy API Compatibility

During migration:

- Keep `/api/tournament`, `/api/players`, `/api/teams`, and `/api/auction` as
  deprecated v1 routes.
- Add deprecation headers and telemetry.
- Adapt target entities into legacy DTOs only for legacy festivals/auctions.
- Do not expose sport auctions through legacy tournament endpoints.
- Stop new frontend development against v1.
- Remove legacy owner ID path parameters from v2 entirely.

## 18. Migration Impact

- Existing v1 tournaments, purse values, sold prices, and bids map only to v2
  main auction resources with `valueType=money`.
- Existing team owners require mandatory-retention reconciliation before their
  v2 assignments become active.
- Existing sold players become festival roster members only; no sport
  memberships are inferred.
- Sport allocation-credit endpoints and socket payloads are new and have no v1
  compatibility representation.
- Legacy adapters may expose main purse balances, but must not merge or convert
  sport credits.
- Frontend auction components can share timer/history behavior, but labels,
  validation messages, balance widgets, and finalization DTOs must branch on
  server-provided `valueType`.

## 19. Phase 1 Implemented Endpoints

Implemented under `/api/v2/festivals`:

- `POST /`
- `GET /`
- `GET /:festivalId`
- `POST /:festivalId/sports`
- `GET /:festivalId/sports`
- `POST /:festivalId/participants`
- `GET /:festivalId/participants`
- `POST /:festivalId/teams`
- `GET /:festivalId/teams`

All routes require authentication. Mutations and participant lists require the
existing admin role. Child mutations are draft-only.

Participant APIs use `employeeId`. Employee identity is independent from
optional application login accounts.

## 20. Phase 2 Implemented Endpoints

Phase 2 Employee Registration & Sports Selection is complete.

### Register one sport

`POST /api/v2/festivals/:festivalId/participants/:participantId/sports`

Auth: admin.

```json
{"sportId":"cricket"}
```

Returns `201`. Duplicate registration returns `409`. A sport not enabled for
the festival returns the standard `400` validation response.

### Read participant sports

`GET /api/v2/festivals/:festivalId/participants/:participantId/sports`

Auth: admin or the user linked to that participant. Other authenticated users
receive `403`.

```json
{
  "data": [
    {
      "id": "registration-id",
      "festivalParticipantId": "participant-id",
      "sportId": "cricket",
      "sport": {"id":"cricket","name":"Cricket"}
    }
  ],
  "meta": {"count":1}
}
```

### Read participants for a sport

`GET /api/v2/festivals/:festivalId/sports/:sportId/participants`

Auth: admin. Returns only registrations whose participant belongs to the
festival and whose sport is enabled for the festival.

### Bulk register sports

`POST /api/v2/festivals/:festivalId/participant-sports/bulk`

Auth: admin.

```json
{
  "participantId": "participant-id",
  "sports": ["cricket", "chess", "volleyball"]
}
```

The array must be non-empty and contain no duplicate IDs. Every sport must be
enabled for the festival and none may already be registered. The insert is
transactional.

### Import participant sports

`POST /api/v2/festivals/:festivalId/participant-sports/import`

Auth: admin. Content type: `multipart/form-data`. File field: `csv`.

```json
{
  "imported": 95,
  "failed": 5,
  "errors": [
    {"row": 8, "message": "Festival participant not found"}
  ]
}
```

`imported` and `failed` count data rows. A valid row may create zero or many
sport registrations. Valid rows are retained when other rows fail.

The accepted file is an Excel-exported `.csv`. Native `.xlsx` files are
rejected with an instruction to export the worksheet as CSV.

### Download import template

`GET /api/v2/festivals/:festivalId/participant-sports/import/template`

Auth: admin. Returns `text/csv`.

All sport-registration writes require festival status `draft` or
`registration_open`. Phase 2 adds no owner, retention, budget, or auction API.

## 21. Employee Identity and Import Redesign

Employee administration:

- `POST /api/v2/employees`
- `GET /api/v2/employees`
- `GET /api/v2/employees/:employeeId`
- `PATCH /api/v2/employees/:employeeId`
- `POST /api/v2/employees/:employeeId/link-user`

All Employee APIs require admin authorization. Festival participant creation
accepts `{"employeeId":"employee-id"}`.

The primary import endpoints are:

- `POST /api/v2/festivals/:festivalId/participants/import`
- `GET /api/v2/festivals/:festivalId/participants/import/template`

The import uses Employee Number as its primary key and creates or updates
Employee, FestivalParticipant, and FestivalParticipantSport per row. Legacy
`participant-sports/import` paths remain temporary aliases. Participant
self-read resolves authenticated User to Employee before checking participant
ownership.

## 22. Phase 2.1 HR Onboarding UX

Employee onboarding adds admin-only endpoints:

- `GET /api/v2/employees/import/template`
- `POST /api/v2/employees/import`

Rows are matched by normalized Employee Number. Missing Employees are created,
existing directory fields are updated, invalid rows are skipped, and the
response reports created, updated, failed, and row-level errors. No User/login
record is created.

Festival participant onboarding adds:

- `POST /api/v2/festivals/:festivalId/participants/bulk`
- `POST /api/v2/festivals/:festivalId/participants/add-all`
- `POST /api/v2/festivals/:festivalId/participants/bulk-remove`

Operations are restricted to `draft` and `registration_open`. Duplicate active
membership is ignored, withdrawn membership is reactivated, and removal uses
withdrawn status rather than deletion.

## 23. Phase 3 Festival Team Builder

All mutations require authenticated admin authorization.

Festival Team endpoints:

- `POST /api/v2/festivals/:festivalId/teams`
- `GET /api/v2/festivals/:festivalId/teams`
- `PATCH /api/v2/festivals/:festivalId/teams/:teamId`
- `DELETE /api/v2/festivals/:festivalId/teams/:teamId`

Assignment endpoints:

- `POST /api/v2/festivals/:festivalId/team-assignments`
- `POST /api/v2/festivals/:festivalId/team-assignments/auto-balance`
- `GET /api/v2/festivals/:festivalId/team-assignments`
- `PATCH /api/v2/festivals/:festivalId/team-assignments/lock`

Manual assignment request:

```json
{
  "participantId": "participant-id",
  "teamId": "demons-id"
}
```

Manual assignment creates or moves the participant's single membership and
records the authenticated admin and assignment time.

Auto-balance sorts participants by descending selected-sport count, uses stable
Employee Number/name/ID tie-breaking, and snake-distributes across every active
Festival Team. Existing builder memberships are replaced transactionally.

Locking fails while any registered participant is unassigned. Team,
participant, sport-selection, and membership mutations are rejected after
lock. Team reads include participant count, calculated strength total, and
member composition.

The Employee picker uses paginated server search across Employee Number, name,
email, and department. Clients debounce requests and select from loaded
results. Add-all executes server-side and does not load the entire directory
into the browser.

## 24. Phase 3A Main Festival Auction Foundation

Owner management:

- `POST /api/v2/festivals/:festivalId/teams/:teamId/owner`
- `GET /api/v2/festivals/:festivalId/teams/:teamId/owner`

Retention management:

- `POST /api/v2/festivals/:festivalId/retentions`
- `DELETE /api/v2/festivals/:festivalId/retentions/:id`
- `GET /api/v2/festivals/:festivalId/retentions`

Configuration and candidate pool:

- `PATCH /api/v2/festivals/:festivalId/auction-config`
- `GET /api/v2/festivals/:festivalId/auction-pool`

Owner assignment requires an active Festival Participant, charges the configured
owner cost, and creates the owner's roster membership atomically. Retentions
validate uniqueness and remaining purse and are editable only while auction
configuration status is `setup`.

The pool returns Employee Number, name, department, registered sports, sport
count, and per-team budget summaries. No bidding or live-auction endpoint is
introduced.

## 25. Phase 3B Main Festival Live Auction

Admin lifecycle:

- `POST /api/v2/festivals/:festivalId/auction/start`
- `POST /api/v2/festivals/:festivalId/auction/pause`
- `POST /api/v2/festivals/:festivalId/auction/resume`
- `POST /api/v2/festivals/:festivalId/auction/complete`

Admin participant commands:

- `POST /api/v2/festivals/:festivalId/auction/participants/:participantId/start`
- `POST /api/v2/festivals/:festivalId/auction/participants/:participantId/sell`
- `POST /api/v2/festivals/:festivalId/auction/participants/:participantId/unsold`

Owner bid and authenticated views:

- `POST /api/v2/festivals/:festivalId/auction/bid`
- `GET /api/v2/festivals/:festivalId/auction/current`
- `GET /api/v2/festivals/:festivalId/auction/history`

Bid request:

```json
{"amount":700000}
```

The server derives the bidder team from the authenticated user's linked
Employee and FestivalTeamOwner assignment. Current state includes lifecycle,
candidate identity and sports, bids, pool, viewer capabilities, and per-team
purse summaries.

Socket clients join `festival-auction:<festivalId>` through
`join-festival-auction`. Broadcast events are `auction-started`,
`participant-started`, `bid-placed`, `participant-sold`,
`participant-unsold`, `auction-paused`, `auction-resumed`, and
`auction-completed`.

## 26. Phase 3C Roster Formation Mode

```http
PATCH /api/v2/festivals/:festivalId/roster-formation-mode
Authorization: Bearer <admin-token>
Content-Type: application/json

{"rosterFormationMode":"manual"}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "festival-id",
    "rosterFormationMode": "manual",
    "teamAssignmentStatus": "draft"
  }
}
```

Authorization: global admin only.

| Operation | Auction mode | Manual mode |
|---|---:|---:|
| Manual assignment | Reject | Allow |
| Auto-balance | Reject | Allow |
| Lock assignments | Reject | Allow |
| Auction configuration | Allow | Reject |
| Owner assignment | Allow | Reject |
| Retention | Allow | Reject |
| Main Auction start/sale | Allow | Reject |

Mode changes reject incompatible persisted activity. Pool responses exclude
participants with any membership, auction result, or auction round.
