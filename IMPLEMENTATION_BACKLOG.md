# IMPLEMENTATION_BACKLOG.md

Generated: 2026-06-05

Source documents: `AUDIT_VALIDATION.md` and `IMPROVEMENT_ROADMAP.md`.

Ordering principle: highest ROI first, based on security/business risk reduced per unit of implementation effort. Some lower-effort hardening items are intentionally above larger architectural work because they reduce exposure quickly.

## Backlog

| ID | Issue | Priority | Business impact | Security impact | Complexity | Dependencies | Estimated implementation time | Estimated testing time |
|---|---|---:|---|---|---|---|---:|---:|
| SEC-001 | Fix password hash and verification metadata exposure through team owner includes. | Critical | Prevents severe trust damage from credential-related data leakage; protects all registered users. | Removes public exposure path for password hashes and verification tokens from `/api/teams` owner includes. | Low-Medium | Owner/user DTO design; optional Sequelize default scope decision. | 1-2 days | 0.5-1 day |
| SEC-002 | Replace permissive HTTP and Socket.IO CORS with explicit origin allowlists. | Critical | Quickly reduces exposure to untrusted origins and prepares app for safer session handling. | Stops arbitrary-origin credentialed access patterns and reduces cross-origin abuse surface. | Low | Known frontend deployment origins; environment variable configuration. | 0.5-1 day | 0.25-0.5 day |
| SEC-003 | Add integration tests proving public admin self-registration remains blocked. | High | Preserves a previously fixed critical issue and prevents regression. | Ensures public registration cannot create `admin` users. | Low | Existing `publicRegistrationRoles` helper; test harness. | 0.5 day | 0.5 day |
| SEC-004 | Require auth and authorization for team read APIs. | Critical | Prevents anonymous/cross-team access to squads, purse data, owner IDs, and player assignments. | Closes public arbitrary-owner reads and supports self/admin/tournament access boundaries. | Medium-High | Auth policy; team DTOs; frontend API adjustment if response shape changes. | 3-6 days | 1-2 days |
| SEC-005 | Authenticate Socket.IO and derive bidder identity server-side. | Critical | Protects auction integrity; prevents fraudulent bidding and unauthorized live-room access. | Stops unauthenticated room joins and caller-supplied `ownerId`/`teamId` spoofing. | High | JWT/session approach; team ownership lookup; frontend socket auth update; bid ID generation plan. | 4-7 days | 1-3 days |
| SEC-006 | Protect tournament read APIs with role-aware visibility. | High | Prevents unauthorized tournament enumeration and makes backend match business access rules. | Removes public access to tournament metadata; stops reliance on frontend filtering. | Medium | Access policy for admin/team_owner/spectator; tournament DTOs. | 3-5 days | 1-2 days |
| SEC-007 | Protect player and bid-history read APIs with role/tournament membership checks. | High | Prevents unauthorized access to player pools, bid history, and tournament scouting data. | Removes public player and bid-history enumeration. | Medium | Tournament/team authorization helpers; player/bid DTOs. | 3-6 days | 1-2 days |
| SEC-008 | Add JWT expiration to access tokens. | High | Reduces long-term exposure from stolen tokens with a small initial change. | Adds time-bound token validity; does not fully solve localStorage or refresh/revocation risk. | Low | Agreement on access token lifetime; frontend expired-token handling. | 0.5-1 day | 0.5-1 day |
| SEC-009 | Implement full safer session model with refresh rotation and logout/revocation. | High | Supports production-grade account lifecycle and reduces incident blast radius. | Reduces XSS token theft impact when combined with HttpOnly/SameSite cookies and CSP. | High | SEC-008 or replacement; CSRF strategy; frontend auth refactor; storage model decision. | 5-10 days | 2-4 days |
| SEC-010 | Add socket and auth rate limiting. | High | Reduces abuse during login, registration, email resend, and live bidding. | Limits brute force, spam, and bid-flood attacks. | Medium | Shared store decision for production; socket auth ideally complete first. | 2-4 days | 1-2 days |
| SEC-011 | Add server-side schema validation for auth, tournament, player, team, and socket payloads. | High | Prevents bad data and invalid states that disrupt tournaments. | Reduces injection-like malformed payloads, spoofing edge cases, and unsafe client-controlled IDs/roles. | Medium | Validation library choice; endpoint schemas; DTO contracts. | 4-7 days | 2-3 days |
| SEC-012 | Add security headers, CSP, and email HTML escaping. | High | Improves baseline browser security and reduces support/security incidents. | Reduces XSS blast radius and user-controlled email HTML risk. | Medium | CSP source inventory; email escaping helper. | 2-4 days | 1-2 days |
| SEC-013 | Add controlled admin provisioning or invite flow. | Medium-High | Enables safe operational onboarding of admins beyond manual DB changes. | Prevents pressure to reopen public admin registration or use insecure manual workflows. | Medium | Auth/session hardening; admin audit policy. | 3-5 days | 1-2 days |

## Issue Details

### SEC-001 - Fix Password Hash And Verification Metadata Exposure

Priority: Critical

Business impact: Avoids severe trust damage and compliance concerns from leaking credential-related fields.

Security impact: Prevents public `/api/teams` responses from exposing nested owner `password`, `verificationToken`, or `verificationExpires` fields.

Complexity: Low-Medium

Dependencies:

- Decide between explicit DTOs, Sequelize `attributes` exclusions, default user scope, or a combined approach.
- Coordinate with `SEC-004` if team read responses are being reshaped.

Estimated implementation time: 1-2 days

Estimated testing time: 0.5-1 day

### SEC-002 - Replace Permissive CORS

Priority: Critical

Business impact: Fast reduction in cross-origin exposure; required before safer cookie-based sessions.

Security impact: Stops arbitrary origin reflection for Express and Socket.IO when credentials are enabled.

Complexity: Low

Dependencies:

- Production and local frontend origin inventory.
- Environment variable such as `CLIENT_ORIGINS`.

Estimated implementation time: 0.5-1 day

Estimated testing time: 0.25-0.5 day

### SEC-003 - Test Admin Self-Registration Block

Priority: High

Business impact: Preserves an already-fixed access-control issue with minimal effort.

Security impact: Prevents regression where public users can create admin accounts.

Complexity: Low

Dependencies:

- Existing Node test runner.
- Registration route integration-test setup or controller-level mock harness.

Estimated implementation time: 0.5 day

Estimated testing time: 0.5 day

### SEC-004 - Protect Team Read APIs

Priority: Critical

Business impact: Protects team ownership, squad, and purse information from unauthorized viewing.

Security impact: Closes public arbitrary-owner data access and removes the largest remaining user-data exposure route.

Complexity: Medium-High

Dependencies:

- Auth and authorization policy for admin, team owner, spectator.
- Explicit team/owner DTOs.
- Frontend updates if routes or response shapes change.

Estimated implementation time: 3-6 days

Estimated testing time: 1-2 days

### SEC-005 - Authenticate Socket.IO And Derive Bidder Identity

Priority: Critical

Business impact: Protects the core auction outcome from spoofed bids.

Security impact: Stops anonymous socket access and prevents clients from claiming another team/owner identity.

Complexity: High

Dependencies:

- JWT/session strategy.
- Socket middleware.
- Tournament membership authorization.
- Frontend socket auth update.
- Server-side bid ID generation decision.

Estimated implementation time: 4-7 days

Estimated testing time: 1-3 days

### SEC-006 - Protect Tournament Read APIs

Priority: High

Business impact: Keeps tournament visibility aligned with product roles and invitations.

Security impact: Stops anonymous tournament enumeration and limits team-owner visibility to assigned tournaments.

Complexity: Medium

Dependencies:

- Shared authorization helpers.
- Tournament DTOs.
- Frontend dashboard adjustments.

Estimated implementation time: 3-5 days

Estimated testing time: 1-2 days

### SEC-007 - Protect Player And Bid-History Read APIs

Priority: High

Business impact: Protects auction strategy data, player pools, and historical bids.

Security impact: Stops anonymous/cross-tournament player and bid-history reads.

Complexity: Medium

Dependencies:

- Tournament/team membership checks.
- Player and bid-history DTOs.
- Potential pagination follow-up.

Estimated implementation time: 3-6 days

Estimated testing time: 1-2 days

### SEC-008 - Add JWT Expiration

Priority: High

Business impact: Quick improvement to account security with low implementation cost.

Security impact: Reduces indefinite validity of stolen tokens, but does not solve localStorage or revocation.

Complexity: Low

Dependencies:

- Token lifetime policy.
- Frontend behavior for expired tokens.

Estimated implementation time: 0.5-1 day

Estimated testing time: 0.5-1 day

### SEC-009 - Implement Safer Session Model

Priority: High

Business impact: Makes authentication lifecycle production-appropriate and reduces support/security risk.

Security impact: Adds refresh rotation, logout/revocation, and safer storage when implemented with HttpOnly/SameSite cookies.

Complexity: High

Dependencies:

- Session design.
- CSRF strategy if cookies are used.
- Frontend auth refactor.
- Token persistence/revocation storage.

Estimated implementation time: 5-10 days

Estimated testing time: 2-4 days

### SEC-010 - Add Socket And Auth Rate Limiting

Priority: High

Business impact: Reduces login abuse, email spam, and live auction disruption.

Security impact: Limits brute-force attempts and bid-event flooding.

Complexity: Medium

Dependencies:

- Shared store for production if more than one backend instance is possible.
- Socket auth should precede per-user bid limiting.

Estimated implementation time: 2-4 days

Estimated testing time: 1-2 days

### SEC-011 - Add Server-Side Validation

Priority: High

Business impact: Reduces bad data, invalid auction states, and production support issues.

Security impact: Reduces malformed request risk and client-controlled state abuse.

Complexity: Medium

Dependencies:

- Validation library selection.
- Request/response contract definitions.
- Frontend error handling updates.

Estimated implementation time: 4-7 days

Estimated testing time: 2-3 days

### SEC-012 - Add Security Headers, CSP, And Email Escaping

Priority: High

Business impact: Improves security posture with visible production-readiness value.

Security impact: Reduces XSS impact and prevents unsafe user-controlled email HTML interpolation.

Complexity: Medium

Dependencies:

- CSP source inventory.
- Email template escaping helper.

Estimated implementation time: 2-4 days

Estimated testing time: 1-2 days

### SEC-013 - Add Controlled Admin Provisioning

Priority: Medium-High

Business impact: Provides a safe operational workflow for adding admins.

Security impact: Reduces reliance on manual database edits and avoids reopening public admin registration.

Complexity: Medium

Dependencies:

- Auth/session hardening.
- Audit log policy if admin invitations are tracked.

Estimated implementation time: 3-5 days

Estimated testing time: 1-2 days

## Recommended Sprint Cut

If only one short hardening sprint is available, do:

1. `SEC-001` password hash exposure cleanup.
2. `SEC-002` CORS allowlist.
3. `SEC-003` admin registration regression tests.
4. `SEC-008` basic JWT expiration.
5. Start `SEC-004` team read API authorization.

If one larger security sprint is available, add:

1. `SEC-005` socket authentication and server-derived bidder identity.
2. `SEC-006` tournament read authorization.
3. `SEC-007` player/bid-history read authorization.
