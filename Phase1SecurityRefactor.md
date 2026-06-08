# Phase 1 Security Refactor

Scope: only public registration roles, tournament/player mutation
authorization, and safe authentication user responses.

## Task 1: Remove Admin Self Registration

### Analysis

The public registration UI offered `admin`, and the backend persisted any
caller-supplied role. An unauthenticated caller could create an admin and use
admin-protected auction controls.

### Implementation Plan

1. Remove Admin from the frontend role selector.
2. Validate the selected frontend role against the two public roles.
3. Enforce the same allowlist before any backend database lookup/write.

### Code Changes

- `ipl-auction-tracker/src/pages/Register.jsx`
  - Public roles are `team_owner` and `spectator`.
  - Removed the Admin menu item.
- `ipl-auction-tracker-backend/src/utils/publicRegistrationRoles.js`
  - Defines and validates the backend allowlist.
- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
  - Returns `400` for missing, `admin`, or any unknown public role.

Updated API behavior:

```json
HTTP 400
{"message":"Role must be either team_owner or spectator"}
```

### Verification

1. Open `/register`; confirm only Team Owner and Spectator appear.
2. Register each allowed role; confirm `201`.
3. Send `POST /api/auth/register` with `"role":"admin"`; confirm `400` and no
   user is created.
4. Send the request with a missing/unknown role; confirm `400`.

### Regression Risks

- Existing admin accounts continue to log in and use admin functionality.
- Any external client that previously used public registration to provision
  admins will now receive `400`; admin provisioning must occur outside this
  public endpoint.

## Task 2: Protect Tournament Management APIs

### Analysis

Unauthenticated callers could create tournaments or change tournament status.
The create controller also trusted a spoofable `createdBy` request field.

### Implementation Plan

1. Reuse `authMiddleware` to verify bearer JWT and load the current user.
2. Reuse `adminMiddleware` to require the persisted user's admin role.
3. Derive `createdBy` from `req.user.id`.

### Code Changes

- `ipl-auction-tracker-backend/src/routes/tournmentRoutes.js`
  - Protects `POST /create` and `PATCH /:id/status`.
- `ipl-auction-tracker-backend/src/controllers/tournment.controller.js`
  - Uses `req.user.id` as `createdBy`.
- `ipl-auction-tracker-backend/src/middleware/auth.middleware.js`
  - Parses a case-insensitive Bearer scheme and safely handles missing users.
- `ipl-auction-tracker/src/components/AuctionManagement.jsx`
  - Stops sending client-controlled `createdBy`.

### Verification

For both mutation endpoints:

1. Send no token; confirm `401`.
2. Send malformed/invalid token; confirm `401`.
3. Send valid spectator/team-owner token; confirm `403`.
4. Send valid admin token; confirm existing create/status behavior succeeds.
5. Create a tournament and confirm `createdBy` equals the authenticated admin.

### Regression Risks

- Admin requests require the Axios bearer interceptor or equivalent header.
- Existing clients sending `createdBy` are not broken, but that field is
  ignored.
- Allowed tournament status-transition validation is unchanged and outside
  Phase 1.

## Task 3: Protect Player Creation APIs

### Analysis

`POST /api/players` allowed unauthenticated player insertion into any existing
tournament.

### Implementation Plan

Apply the existing authentication and admin middleware chain without changing
the player controller or payload.

### Code Changes

- `ipl-auction-tracker-backend/src/routes/playerRoutes.js`
  - `POST /` now runs `authMiddleware`, then `adminMiddleware`, then
    `createPlayer`.

### Verification

1. Call `POST /api/players` with no token; confirm `401`.
2. Call with a valid non-admin token; confirm `403`.
3. Call with a valid admin token and existing payload; confirm `201`.
4. Confirm missing/unknown tournament behavior remains `400`/`404`.

### Regression Risks

- Non-admin integrations that previously created players will stop working.
- Existing admin UI remains compatible because Axios already attaches the JWT.

## Task 4: Stop Returning Sensitive User Data

### Analysis

Registration and login serialized full Sequelize user models, exposing password
hashes, verification-token hashes, verification expiry, and timestamps.

### Implementation Plan

1. Add an explicit allowlist-based user response DTO.
2. Use it for registration and login responses.
3. Preserve frontend-required identity and role fields.

### Code Changes

- `ipl-auction-tracker-backend/src/utils/userResponse.js`
  - Returns only `id`, `name`, `email`, `role`, and `isVerified`.
- `ipl-auction-tracker-backend/src/controllers/auth.controller.js`
  - Uses the DTO for registration and login.

Updated response shape:

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "team_owner",
    "isVerified": true
  }
}
```

### Verification

1. Register and log in.
2. Confirm `user` contains only the five documented fields.
3. Confirm `password`, `verificationToken`, `verificationExpires`,
   `createdAt`, and `updatedAt` are absent.
4. Confirm frontend login, route guards, dashboard name, and role navigation
   still work.

### Regression Risks

- Clients relying on undocumented raw Sequelize fields will no longer receive
  them.
- Team read endpoints may still expose nested user data; that is a separate
  unresolved finding outside Phase 1.

## Automated Verification

`ipl-auction-tracker-backend/test/security-phase1.test.js` verifies the public
role allowlist and safe user DTO. `npm test` now runs Node's built-in test
runner. Runtime execution was not possible in the refactor environment because
Node/npm are unavailable.

No JWT expiry, password reset, socket authentication, or Phase 2 changes were
implemented.
