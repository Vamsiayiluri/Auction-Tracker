# Owner and User Linking Flow

Updated: 2026-06-10, Phase 3D

## Identity Model

```text
User (login identity)
  0..1
Employee (canonical corporate identity)
  1
FestivalParticipant
  0..1
FestivalTeamOwner
```

Employee remains canonical. Registration never creates an Employee and never
replaces an existing Employee link.

## Registration Auto-Linking

```mermaid
sequenceDiagram
  actor Person
  participant Auth
  participant User
  participant Employee
  participant Audit
  participant Owner

  Person->>Auth: Register with email and role
  Auth->>User: Reject existing User email case-insensitively
  Auth->>User: Create User in transaction
  Auth->>Employee: Find by normalized email
  alt exactly one unlinked Employee
    Auth->>Employee: Set userId
    Auth->>Owner: Activate assignments for team_owner account
    Auth->>Audit: Record linked
  else no Employee
    Auth->>Audit: Record no_match
  else duplicate Employee emails
    Auth->>Audit: Record duplicate_email and Employee IDs
  else identity conflict
    Auth->>Audit: Record conflict without overwrite
  end
```

Outcomes returned as `employeeLinkStatus`:

- `linked`
- `no_match`
- `duplicate_email`
- `employee_already_linked`
- `user_already_linked`

## Existing Link Rules

- An Employee linked to another User is never overwritten.
- A User linked to another Employee is never moved.
- Re-registration with an existing User email is rejected before identity
  mutation.
- Manual admin linking uses the same conflict and audit rules.
- Duplicate Employee email matches require manual review.

## Owner Activation

`FestivalTeamOwners.status` values:

- `pending_user_registration`: no linked User.
- `active`: active Employee linked to a `team_owner` User.
- `inactive`: linked account has an incompatible role or identity is inactive.

```mermaid
flowchart LR
  A[Admin assigns Employee owner] --> Q{Linked User?}
  Q -- No --> P[pending_user_registration]
  Q -- team_owner --> X[active]
  Q -- other role --> I[inactive]
  P -->|later team_owner registration with matching email| X
```

No manual owner activation command is required. Successful registration-time
or admin linking updates existing owner assignments.

## Authorization

An accepted Festival bid requires:

```text
Authenticated User.role = team_owner
  -> Employee.userId
  -> active Employee
  -> registered FestivalParticipant
  -> FestivalTeamOwner.status = active
  -> assigned Festival Team
```

Spectators can view current state, bids, history, rosters, and authenticated
auction broadcasts. They cannot bid or call lifecycle/finalization routes.

Admins alone can start, pause, resume, complete, select participants, sell, or
mark unsold.

## Superseded Owner Registration Flow

The registration-dependent owner states above are retained only as historical
context for older data. New owner assignments use automatic provisioning:

1. Admin selects a Festival Participant backed by an Employee.
2. The server reuses the linked or email-matched User, or creates one.
3. The User is linked to the Employee and assigned `team_owner`.
4. Ownership is activated in the same database transaction.
5. Credentials and login/reset instructions are emailed automatically.
6. Auto-created users must change the temporary password before HTTP or
   Socket.IO application access.

Current readiness is: Employee exists, User exists, User role is
`team_owner`, and ownership status is `active`. Public Team Owner registration
is disabled.
