# Team Export To Excel Implementation

## Files Modified

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`
- `ipl-auction-tracker-backend/src/routes/teamExportRoutes.js`
- `ipl-auction-tracker-backend/src/routes/festivalRoutes.js`
- `ipl-auction-tracker-backend/src/routes/sportTournamentRoutes.js`
- `ipl-auction-tracker-backend/src/index.js`
- `ipl-auction-tracker-backend/src/utils/teamExportWorkbook.js`
- `ipl-auction-tracker-backend/package.json`
- `ipl-auction-tracker-backend/package-lock.json`
- `ipl-auction-tracker-backend/test/team-export-excel.test.js`
- `ipl-auction-tracker/src/components/TeamExportButton.jsx`
- `ipl-auction-tracker/src/components/FestivalControlCenter.jsx`
- `ipl-auction-tracker/src/components/FestivalOverview.jsx`
- `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx`
- `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionResultsPage.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentCommandCenter.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx`

## API Endpoints

- `GET /api/festivals/:festivalId/export/excel`
- `GET /api/sport-tournaments/:id/export/excel`
- `GET /api/v2/festivals/:festivalId/export/excel`
- `GET /api/v2/sport-tournaments/:sportTournamentId/export/excel`

All endpoints stream an XLSX response using ExcelJS. No temporary server files are created.

## Permission Model

Exports require authentication and `admin` role.

Festival export is allowed when the Festival Auction resolves to completed from the auction lifecycle state.

Sport Tournament export is allowed for finalized auction states:

- `auction_completed`
- `competition_pending`
- `competition_live`
- `competition_completed`
- `archived`

Setup, ready, live, and paused auctions return:

`Auction must be completed before export.`

## Workbook Structure

### Festival

Filename:

`FestivalName_Teams.xlsx`

Sheets:

- `Tournament Info`
- `ImportData`
- One sheet per Festival Team, named from the Team Name

`Tournament Info` rows:

| Field | Value |
|---|---|
| Tournament Type | Festival |
| Tournament Name | Festival name |
| Export Date | Current date |
| Total Teams | Team count |
| Total Players | Sold/assigned player count |

Team sheet columns:

| Team Name | Player Name | Employee ID | Email | Department | Base Price | Sold Price |
|---|---|---|---|---|---|---|

`ImportData` columns:

| Team Name | Player Name | Employee ID | Email | Department | Base Price | Sold Price |
|---|---|---|---|---|---|---|

Festival rows populate Team Name, Player Name, Employee ID, Email, Department, Base Price, and Sold Price. Festival Team and Credits Used are not included because they are not applicable to Festival auctions.

### Sport Tournament

Filename:

`SportTournamentName_Teams.xlsx`

Sheets:

- `Tournament Info`
- `ImportData`
- One sheet per Sport Team, named from the Team Name

`Tournament Info` rows:

| Field | Value |
|---|---|
| Tournament Type | Sport Tournament |
| Tournament Name | Sport Tournament name |
| Export Date | Current date |
| Total Teams | Team count |
| Total Players | Sold/assigned player count |

Team sheet columns:

| Team Name | Player Name | Employee ID | Festival Team | Credits Used |
|---|---|---|---|---|

`ImportData` columns:

| Team Name | Player Name | Employee ID | Email | Department | Festival Team | Credits Used |
|---|---|---|---|---|---|---|

Sport rows populate Team Name, Player Name, Employee ID, Email, Department, Festival Team, and Credits Used.

## Example Generated Workbook Structure

Festival:

1. `Tournament Info`
2. `ImportData`
3. `Trojans`
4. `Demons`

Sport Tournament:

1. `Tournament Info`
2. `ImportData`
3. `Warriors`
4. `Titans`
5. `Legends`

## ImportData Specification

`ImportData` is the official machine-readable integration contract. It is a flat table with one row per exported player.

Rules:

- Every exported player appears exactly once.
- `ImportData` row count equals the Total Players value in `Tournament Info`.
- Rows are independent and contain the team assignment needed by a scorecard importer.
- Future scorecard applications should read only `ImportData`; team sheets remain human-readable reports.

## Excel Formatting

- Header row is bold.
- Top row is frozen.
- Filter row is enabled.
- Columns are auto-sized with a practical max width.
- Workbook metadata is populated.
- Sheet names are sanitized for Excel constraints and de-duplicated.

## Error Handling

The export endpoints return friendly JSON errors before streaming begins:

- Tournament or Festival not found
- Auction not completed
- No teams found
- No players assigned
- Export generation failure

The frontend download button reads JSON error blobs and displays the message in a snackbar.

## Frontend Locations

Festival:

- Results Page
- Command Center
- Festival Overview
- Festival workspace Results tab

Sport:

- Results Page
- Command Center
- Tournament Overview / workspace

Buttons are visible only for admins and only after the finalized export state is reached.

## Future Cricket Scorecard Integration Strategy

The required scorecard import columns are always present, even when individual values are empty:

Festival required fields:

- Team Name
- Player Name
- Employee ID
- Email
- Department
- Base Price
- Sold Price

Sport required fields:

- Team Name
- Player Name
- Employee ID
- Email
- Department
- Festival Team
- Credits Used

Example import process:

1. Upload the workbook.
2. Open the `ImportData` sheet.
3. For each row, create or find the Team from `Team Name`.
4. Create or find the Player from `Employee ID` and `Player Name`.
5. Attach optional profile data from `Email`, `Department`, and `Festival Team`.
6. Assign the Player to the Team.
7. Optionally store Festival `Base Price` / `Sold Price` or Sport `Credits Used` as auction metadata.

The export intentionally uses finalized sold results, not draft roster setup or live auction state. This keeps the workbook stable as a future Cricket Scorecard import contract and avoids changing auction or allocation behavior. `ImportData` is the machine-readable format; team sheets remain the human-readable format.
