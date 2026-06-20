# Sport Export Captain Fix Implementation

## Root Cause

Sport Tournament exports were built only from `SportAuctionResult` rows with `outcome = "sold"`.

Captains are not stored in auction allocations. They are configured separately as active `SportTeamCaptain` records linked to:

- `sportTournamentId`
- `sportTeamId`
- `festivalParticipantId`

Because the export controller did not load `SportTeamCaptain` records and the workbook generator only iterated auction results, captains were excluded from both team sheets and the `ImportData` sheet.

## Files Modified

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`
- `ipl-auction-tracker-backend/src/utils/teamExportWorkbook.js`
- `ipl-auction-tracker-backend/test/team-export-excel.test.js`
- `TEAM_EXPORT_TO_EXCEL_IMPLEMENTATION.md`
- `SPORT_EXPORT_CAPTAIN_FIX_IMPLEMENTATION.md`

## Captain Storage Audit

Captains are represented by `SportTeamCaptain`.

Each captain row references a `FestivalParticipant`, and the participant links to the underlying `Employee`. That means captains export through the same person identity fields used by auction-assigned players:

- Player Name: `FestivalParticipant.employee.name`
- Employee ID: `FestivalParticipant.employee.employeeNumber` or employee id
- Email: `FestivalParticipant.employee.email`
- Department: `FestivalParticipant.employee.department`
- Festival Team: `FestivalParticipant.teamMembership.team.name`

Captains can also appear in auction allocations if the same `FestivalParticipant` exists in `SportAuctionResult`.

## Implementation

The sport export endpoint now loads active captains alongside teams and sold auction results:

- `SportTeam.findAll(...)`
- `SportAuctionResult.findAll(...)`
- `SportTeamCaptain.findAll({ status: "active" })`

Captain includes load:

- Sport team
- Festival participant
- Employee
- Festival team membership
- Festival team

The workbook generator now receives `captains` and builds a final roster before writing sheets.

## Captain Merge Strategy

`buildSportExportRosterRows()` creates a normalized roster with one row shape for both captains and players:

- Team Name
- Player Name
- Employee ID
- Email
- Department
- Festival Team
- Credits Used
- Role

Captain rows are inserted first with `Role = Captain`.

Auction result rows are inserted afterward with `Role = Player`.

If the same participant appears in both captains and auction results, the captain row wins.

## Deduplication Logic

The primary dedupe key is `FestivalParticipant.id`.

Fallback identity fields are used only when participant id is missing:

- Employee id
- Employee number
- Email
- Employee name

Rules:

- One exported row per person.
- Captain row wins over player row.
- Duplicate captain/player rows are suppressed.
- If a duplicate auction result exists, its `Credits Used` value is retained on the single captain row.

## Workbook Changes

Sport team sheets now include captains and players:

| Team Name | Player Name | Employee ID | Email | Department | Festival Team | Credits Used | Role |
|---|---|---|---|---|---|---|---|

Sport `ImportData` now includes captains and players:

| Team Name | Player Name | Employee ID | Email | Department | Festival Team | Credits Used | Role |
|---|---|---|---|---|---|---|---|

Festival `ImportData` and team sheets also include `Role` for contract consistency:

| Team Name | Player Name | Employee ID | Email | Department | Role | Base Price | Sold Price |
|---|---|---|---|---|---|---|---|

Festival rows use `Role = Player`.

## Before / After Examples

Before:

| Team Name | Player Name | Credits Used |
|---|---|---|
| Warriors | Ravi | 35 |

Captain `Vamsi` was missing if he was configured only as captain.

After:

| Team Name | Player Name | Credits Used | Role |
|---|---|---|---|
| Warriors | Vamsi |  | Captain |
| Warriors | Ravi | 35 | Player |

Duplicate captain/player case:

| Team Name | Player Name | Credits Used | Role |
|---|---|---|---|
| Warriors | Vamsi | 50 | Captain |

The captain appears once. The auction credits are preserved, and `Role = Captain`.

## Validation

Covered by `test/team-export-excel.test.js`:

- Captain not in auction allocations appears in `ImportData`.
- Captain already in auction allocations exports once.
- Multiple teams export each captain under the correct sport team.
- `ImportData` row count includes captains.
- Sport team sheets include `Role`.
- Festival rows keep `Role = Player`.

Verification command:

```powershell
node --test test\team-export-excel.test.js
```

Result:

- `10` tests passed.
- `0` failed.

