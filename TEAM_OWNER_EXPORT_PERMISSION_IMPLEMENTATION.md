# Team Owner Export Permission Implementation

## Permission Model

Excel team exports are no longer admin-only at the route layer. Export endpoints require authentication, then the controller applies role and ownership authorization before workbook generation.

- Admin users can export all finalized teams and all assigned players.
- Festival Team Owners can export only active Festival teams they own.
- Sport captains can export only active Sport teams they captain/manage.
- Authenticated users without a matching ownership assignment receive `403 Forbidden`.

## API Endpoints

- `GET /api/festivals/:festivalId/export/excel`
- `GET /api/v2/festivals/:festivalId/export/excel`
- `GET /api/sport-tournaments/:id/export/excel`
- `GET /api/v2/sport-tournaments/:sportTournamentId/export/excel`

The API contracts and response type are unchanged. Successful responses still stream an XLSX workbook without creating temporary files.

## Ownership Filtering Rules

### Festival Export

Admin export includes:

- `Tournament Info`
- `ImportData`
- One sheet per Festival team

Team Owner export uses `FestivalTeamOwner` as the source of truth:

- The signed-in user must have an active Employee record.
- The Employee must be a registered Festival participant.
- That participant must have an active `FestivalTeamOwner` assignment.
- Only matching `festivalTeamId` values are included.

Example: if the owner owns Trojans, the workbook contains:

- `Tournament Info`
- `ImportData` with Trojans players only
- `Trojans`

Demons, Titans, or any other Festival team sheets and players are omitted.

### Sport Tournament Export

Admin export includes all Sport teams.

Owner/Captain export uses `SportTeamCaptain` as the team-level source of truth:

- The signed-in user must have an active Employee record.
- The Employee must be a registered participant in the parent Festival.
- That participant must have an active `SportTeamCaptain` assignment in the Sport Tournament.
- Only matching `sportTeamId` values are included.

Example: if the captain manages Cricket Team A, the workbook contains:

- `Tournament Info`
- `ImportData` with Cricket Team A players only
- `Cricket Team A`

Other Sport team sheets and players are omitted.

## Security Considerations

Filtering is performed server-side before workbook creation. Team sheets, `ImportData`, and `Tournament Info` totals are all built from the same scoped arrays, so Team Owners cannot receive rows for teams they do not own.

The frontend only controls button visibility. The backend remains the security boundary and returns `403 Forbidden` for users without active ownership/captain assignments.

Completion validation is unchanged:

- Festival export still requires resolved Festival auction completion.
- Sport export still requires a finalized Sport Tournament status.

## Admin vs Owner Examples

Admin Festival export:

```text
Tournament Info
ImportData
Trojans
Demons
```

Trojans owner Festival export:

```text
Tournament Info
ImportData
Trojans
```

Admin Sport export:

```text
Tournament Info
ImportData
Cricket Team A
Cricket Team B
Cricket Team C
```

Cricket Team A captain export:

```text
Tournament Info
ImportData
Cricket Team A
```

## Files Modified

- `ipl-auction-tracker-backend/src/controllers/teamExport.controller.js`
- `ipl-auction-tracker-backend/src/routes/teamExportRoutes.js`
- `ipl-auction-tracker-backend/src/routes/festivalRoutes.js`
- `ipl-auction-tracker-backend/src/routes/sportTournamentRoutes.js`
- `ipl-auction-tracker-backend/test/team-export-excel.test.js`
- `ipl-auction-tracker/src/pages/FestivalAuctionResultsPage.jsx`
- `ipl-auction-tracker/src/pages/FestivalDetail.jsx`
- `ipl-auction-tracker/src/components/FestivalControlCenter.jsx`
- `ipl-auction-tracker/src/components/FestivalOverview.jsx`
- `ipl-auction-tracker/src/pages/SportAuctionResultsPage.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentCommandCenter.jsx`
- `ipl-auction-tracker/src/pages/SportTournamentWorkspace.jsx`
