# Database Master Data Audit

Scope: backend Sequelize models, migrations, validation constants, startup behavior, Festival setup, Sport Tournament setup, and auction flows.

No data was inserted. No code or migrations were changed.

## 1. Master Tables

### Sports

Table Name:
`Sports`

Purpose:
Supported sports in the platform. Referenced by legacy `Tournaments` and `Players`, Festival sports enablement, participant sport registrations, and Sport Tournament creation.

Required Records:

- `cricket` - Cricket
- `tt` - Table Tennis
- `volleyball` - Volleyball
- `badminton` - Badminton
- `chess` - Chess
- `carrom` - Carrom
- `throwball` - Throwball
- `other` - Other

Mandatory:
YES

Evidence:

- `migrations/202606080005-multi-sport-foundation.js` creates `Sports` and inserts Cricket, Table Tennis, Volleyball, Badminton, Chess, Carrom, Other.
- `migrations/202606090001-festival-foundation.js` inserts Throwball.
- `src/utils/sports.js` defines the current application sport constants and validation allow-list.
- `src/validation/common.validation.js` validates sport IDs against `SPORT_IDS`.
- `FestivalSports`, `FestivalParticipantSports`, `SportTournaments`, legacy `Tournaments`, and legacy `Players` reference `Sports`.

### Roles

Table Name:
None.

Purpose:
User roles are enum values on `Users.role`, not a lookup table.

Required Records:
Not applicable.

Mandatory:
NO TABLE

Allowed Values:

- `admin`
- `team_owner`
- `spectator`

Important:
Public registration currently permits only `spectator` through `src/validation/auth.validation.js`. Admin and team owner users must be created through controlled setup/admin flows or direct administrative insert.

### Status Tables

Table Name:
None.

Purpose:
Statuses are enum columns and code constants, not lookup tables.

Required Records:
Not applicable.

Mandatory:
NO TABLE

Key status enums are embedded in the schema:

- `Festivals.status`: `draft`, `registration_open`, `registration_closed`, `allocation`, `competition`, `completed`, `archived`
- `FestivalSports.status`: `draft`, `registration_open`, `allocation`, `competition`, `completed`
- `FestivalParticipants.status`: `registered`, `withdrawn`
- `FestivalTeams.status`: `active`, `inactive`
- `FestivalAuctionConfigs.status`: `setup`, `ready`, `started`, `completed`
- `FestivalAuctionConfigs.auctionStatus`: `setup`, `live`, `paused`, `completed`
- `FestivalAuctionPools.state`: `available`, `sold`, `unsold`
- `SportTournaments.status`: `draft`, `setup`, `ready`, `auction_live`, `auction_paused`, `auction_completed`, `competition_pending`, `competition_live`, `competition_completed`, `archived`
- `SportTeams.status`: `active`, `inactive`
- `SportTeamCaptains.status`: `active`, `inactive`
- `SportTeamBudgets.status`: `active`, `inactive`
- `SportAuctionPools.state`: `available`, `sold`, `unsold`
- `SportAuctions.status`: `live`, `paused`, `pending`, `sold`, `unsold`
- `SportAuctionResults.outcome`: `sold`, `unsold`

### FestivalSports

Table Name:
`FestivalSports`

Purpose:
Festival-specific enabled sports. This is configuration data for a festival, but not global master data.

Required Records:
Created per festival by selecting one or more records from `Sports`.

Mandatory:
YES, per Festival before participant sport registration and Sport Tournament setup.

### Configuration Tables

Table Name:
`FestivalAuctionConfigs`, `SportAuctionConfigs`

Purpose:
Auction setup/configuration for a specific Festival or Sport Tournament.

Required Records:
Created per Festival/Tournament through setup flows.

Mandatory:
YES, per auction before auction launch.

Global Master Data:
NO

## 2. System Configuration Data

The application does not use system-level configuration lookup tables for statuses, roles, auction states, or tournament states. These are enforced by Sequelize enum columns, validation schemas, and controller logic.

### Required Global Configuration

Only `Sports` requires global predefined data.

### Role Configuration

Stored in `Users.role`.

Allowed values:

- `admin`
- `team_owner`
- `spectator`

Startup does not seed an admin user. A fresh database needs at least one admin user before admin-only flows can be used.

### Default Festival Configuration

Created through application flows, not seeded globally:

- `Festivals.status` defaults to `draft`
- `Festivals.teamAssignmentStatus` defaults to `draft`
- `Festivals.rosterFormationMode` defaults to `auction`
- `Festivals.configurationLockState` defaults to `locked`
- `FestivalSports.status` defaults to `draft`
- `FestivalParticipants.status` defaults to `registered`
- `FestivalTeams.status` defaults to `active`
- `FestivalAuctionConfigs.status` defaults to `setup`
- `FestivalAuctionConfigs.auctionStatus` defaults to `setup`
- `FestivalAuctionConfigs.incrementPercentage` defaults to `20`

### Default Sport Tournament Configuration

Created through application flows, not seeded globally:

- `SportTournaments.status` defaults to `draft`
- `SportTeams.status` defaults to `active`
- `SportTeamCaptains.status` defaults to `active`
- `SportTeamBudgets.status` defaults to `active`
- `SportAuctionConfigs.timerDurationSeconds` defaults to `20`
- `SportAuctionConfigs.incrementPercentage` defaults to `20`
- `SportAuctionConfigs.reauctionEnabled` defaults to `true`

## 3. Transactional Tables

These tables should remain empty in a freshly initialized database until setup begins.

### Users

Initially empty unless creating the first admin manually. Public users and team owners are transactional identity records.

### Employees

Initially empty. Employees are imported or created through HR/admin flows. Participant import expects employees to already exist.

### Festivals

Initially empty. Created by admin.

### FestivalSports

Initially empty. Created per Festival by enabling sports from `Sports`.

### FestivalParticipants

Initially empty. Created by adding/importing employees into a Festival.

### FestivalParticipantSports

Initially empty. Created when participants select/register for enabled sports.

### FestivalTeams

Initially empty. Created per Festival.

### FestivalTeamOwners

Initially empty. Created when assigning owners to Festival Teams.

### FestivalRetentions

Initially empty. Created only if retentions are used.

### FestivalTeamMemberships

Initially empty. Filled by manual assignments, retentions, or auction results.

### FestivalAuctionConfigs

Initially empty. Created when auction budget/owner cost is configured.

### FestivalAuctionPools

Initially empty. Generated from eligible Festival Participants before/during auction setup.

### FestivalAuctions

Initially empty. Created when live auction rounds start.

### FestivalAuctionBids

Initially empty. Created by accepted bids.

### FestivalAuctionResults

Initially empty. Created when rounds are finalized as sold or unsold.

### FestivalOperationAudits

Initially empty. Filled by audited Festival operations.

### SportTournaments

Initially empty. Created after Festival Teams and Festival Sports exist.

### SportTeams

Initially empty. Generated when a Sport Tournament is created.

### SportTeamCaptains

Initially empty. Created when captains are assigned.

### SportTeamBudgets

Initially empty. Created by Sport auction preparation/budget distribution.

### SportTeamMemberships

Initially empty. Filled by captain assignments and sport auction results.

### SportAuctionConfigs

Initially empty. Created by Sport auction configuration.

### SportAuctionPools

Initially empty. Generated from eligible Festival Participants.

### SportAuctions

Initially empty. Created when Sport auction rounds start.

### SportAuctionBids

Initially empty. Created by accepted bids.

### SportAuctionResults

Initially empty. Created when Sport auction rounds are finalized.

### SportOperationAudits

Initially empty. Filled by audited Sport operations.

### Legacy Tables

`Tournaments`, `Teams`, `Players`, `Auctions`, `Bids`, and `TournamentTeams` should also remain empty initially unless using the legacy non-Festival auction flow.

## 4. Dependency Order

### Database and Global Setup

Step 1:
Run migrations.

Step 2:
Ensure `Sports` master records exist.

Step 3:
Create the first admin `Users` record.

Step 4:
Import or create `Employees`.

### Festival Setup

Step 5:
Create `Festivals`.

Step 6:
Create `FestivalSports` by enabling sports from `Sports`.

Step 7:
Create `FestivalParticipants` from `Employees`.

Step 8:
Create `FestivalParticipantSports` for participant sport registrations.

Step 9:
Create `FestivalTeams`.

Step 10:
Create `FestivalAuctionConfigs` by configuring total budget, owner cost, and increment percentage.

Step 11:
Create `FestivalTeamOwners`.

Step 12:
Optionally create `FestivalRetentions`.

Step 13:
Generate/populate `FestivalAuctionPools`.

Step 14:
Run Festival live auction, which creates `FestivalAuctions`, `FestivalAuctionBids`, `FestivalAuctionResults`, and auction-derived `FestivalTeamMemberships`.

### Sport Tournament Setup

Step 15:
Create `SportTournaments` from an active `FestivalTeam` and enabled `FestivalSport`.

Step 16:
Use generated `SportTeams`.

Step 17:
Assign `SportTeamCaptains`.

Step 18:
Configure/distribute `SportTeamBudgets`.

Step 19:
Create `SportAuctionConfigs`.

Step 20:
Generate `SportAuctionPools`.

Step 21:
Run Sport live auction, which creates `SportAuctions`, `SportAuctionBids`, `SportAuctionResults`, and auction-derived `SportTeamMemberships`.

## 5. SQL Insert Scripts

Scripts only. Do not execute blindly without confirming your database name, SQL dialect, and password hash strategy.

### Required Sports Master Data

```sql
INSERT INTO Sports (id, code, name, isActive, createdAt, updatedAt)
VALUES
  ('cricket', 'cricket', 'Cricket', 1, NOW(), NOW()),
  ('tt', 'tt', 'Table Tennis', 1, NOW(), NOW()),
  ('volleyball', 'volleyball', 'Volleyball', 1, NOW(), NOW()),
  ('badminton', 'badminton', 'Badminton', 1, NOW(), NOW()),
  ('chess', 'chess', 'Chess', 1, NOW(), NOW()),
  ('carrom', 'carrom', 'Carrom', 1, NOW(), NOW()),
  ('throwball', 'throwball', 'Throwball', 1, NOW(), NOW()),
  ('other', 'other', 'Other', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  code = VALUES(code),
  name = VALUES(name),
  isActive = VALUES(isActive),
  updatedAt = VALUES(updatedAt);
```

### First Admin User Template

`Users` is not a master table, but a fresh database cannot use admin flows without an admin user. Generate a bcrypt password hash outside SQL and replace the placeholders.

```sql
INSERT INTO Users (
  id,
  name,
  email,
  password,
  role,
  isVerified,
  verificationToken,
  verificationExpires,
  resetPasswordToken,
  resetPasswordExpires,
  mustChangePassword,
  createdAt,
  updatedAt
)
VALUES (
  '<admin-user-id>',
  '<admin-name>',
  '<admin-email>',
  '<bcrypt-password-hash>',
  'admin',
  1,
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  NOW(),
  NOW()
);
```

## 6. Application Startup Check

### Required Before Server Starts

The server can start with no business data if the schema exists and migrations have run.

Startup does not seed master data automatically from `src/utils/sports.js`; migration execution is responsible for inserting `Sports`.

### Required Before Application Can Be Used

`Sports`:
Required for sports listing, Festival sport enablement, participant sport validation, Sport Tournament creation, and legacy Cricket defaults.

Admin `Users` row:
Required to access admin-only creation/setup flows. Public registration only creates `spectator` users.

### What Breaks If Missing

If `Sports` is empty:

- `GET /api/sports` returns an empty list.
- Festival sport enablement has no valid persisted sports to attach.
- Sport Tournament creation fails because it requires an enabled `FestivalSport` backed by an active `Sport`.
- Legacy `Tournaments` and `Players` default to `sportId = 'cricket'`; foreign key checks require `Sports.id = 'cricket'`.
- Validation still accepts hard-coded sport IDs from `src/utils/sports.js`, so a request may validate but fail at persistence/lookup if the row is missing.

If no admin user exists:

- No one can create Festivals, import employees through protected routes, create Festival Teams, configure auctions, or manage Sport Tournaments.

If no employees exist:

- Festival participant imports fail with: `Employee not found; import the Employee Directory CSV with Gender first`.
- Owner/captain assignment cannot be completed.

If no FestivalSports exist for a Festival:

- Participants cannot be registered for sports in a meaningful way.
- Sport Tournament creation fails with `Selected Sport is not enabled for this Festival`.
- Festival readiness reports `No Festival Sports are enabled`.

If no FestivalAuctionConfig exists:

- Festival readiness reports auction budget/owner cost missing.
- Main Festival auction setup and pool generation are blocked by missing budget configuration.

If no FestivalAuctionPool exists:

- Festival readiness reports `Auction pool is empty`.
- Live auction cannot select available participants.

If no SportAuctionConfig exists:

- Sport readiness reports auction settings missing.
- Sport auction cannot be considered ready.

If no SportAuctionPool exists:

- Sport readiness reports pool not generated/no available participants.
- Sport live auction has no available participants.

## 7. Admin First-Time Setup Flow

Step 1:
Fresh database.

Step 2:
Run migrations.

Step 3:
Insert required `Sports` master data if migrations did not already insert it.

Step 4:
Create first admin user in `Users` with role `admin`, verified email, and a valid bcrypt password hash.

Step 5:
Log in as admin.

Step 6:
Import or create `Employees`.

Step 7:
Create a `Festival`.

Step 8:
Enable Festival sports by creating `FestivalSports` from active `Sports`.

Step 9:
Register Festival participants from `Employees`.

Step 10:
Register participant sports in `FestivalParticipantSports`.

Step 11:
Create Festival Teams.

Step 12:
Configure Festival auction budget and owner cost in `FestivalAuctionConfigs`.

Step 13:
Assign Festival Team Owners.

Step 14:
Optionally configure retentions.

Step 15:
Generate/review the Festival auction pool.

Step 16:
Run the Festival Auction.

Step 17:
Create Sport Tournaments for enabled Festival sports and Festival Teams.

Step 18:
Review generated Sport Teams.

Step 19:
Assign Sport Team Captains.

Step 20:
Configure Sport Team Budgets.

Step 21:
Configure Sport Auction settings.

Step 22:
Generate Sport Auction Pool.

Step 23:
Run Sport Auction.

## Summary

Tables requiring true global seed data:

- `Sports`

Tables requiring first-time operational setup data:

- `Users` with at least one `admin`
- `Employees`

Tables that are configured per Festival/Tournament and should not be globally seeded:

- `FestivalSports`
- `FestivalAuctionConfigs`
- `SportAuctionConfigs`

Tables that should remain empty on a clean database until workflows create data:

- All Festival, Sport Tournament, Auction, Bid, Result, Team Membership, Audit, and legacy auction transactional tables.
