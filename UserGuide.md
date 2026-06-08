# User Guide

This guide covers implemented behavior for team owners and spectators.

## Registration

Entry point: `/register`.

1. Enter name, email, role, and password.
2. Team owners must also enter a team name.
3. Submit; the frontend calls `POST /api/auth/register`.
4. The backend creates the user and optional team, then attempts a verification
   email.

Success: the login page displays that a verification email was sent.
Failures: frontend validation, duplicate email/team name, or backend failure.

Evidence: `ipl-auction-tracker/src/pages/Register.jsx`,
`ipl-auction-tracker-backend/src/controllers/auth.controller.js`.

Public registration permits only Team Owner and Spectator accounts. Admin
accounts must be provisioned outside public registration.

## Email Verification

Open the emailed `/verify-email/:token` link. The verification page calls the
backend and displays success or failure. The login page can resend a link after
an unverified-login error.

Verification is enforced at login only when the backend setting
`EMAIL_VERIFICATION_REQUIRED` equals `true`.

Evidence: `src/pages/VerifyEmail.jsx`, `src/pages/Login.jsx`, backend
`src/controllers/auth.controller.js`.

## Login and Logout

Entry point: `/login`.

Successful login stores a one-hour JWT access token and user object in browser
localStorage and opens `/dashboard`. Logout removes both and returns to login.

Evidence: `src/pages/Login.jsx`, `src/context/AuthContext.jsx`,
`src/components/AppShell.jsx`.

## Password Reset

Entry points: `/forgot-password` and emailed `/reset-password/:token`.

1. Select **Forgot password?** from the login page.
2. Enter the account email.
3. The frontend calls `POST /api/auth/forgot-password`.
4. If the account exists, the backend stores a hashed one-hour reset token and
   sends a SendGrid email.
5. Open the emailed reset link.
6. Enter and confirm a new password.
7. The frontend calls `POST /api/auth/reset-password`.

Reset links expire after one hour and can be used only once. For privacy, the
forgot-password response does not reveal whether the submitted email exists.

Evidence: `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx`,
backend `src/controllers/auth.controller.js`, `src/utils/passwordReset.js`.

## Team Owner Workflow

### Find an Auction

The dashboard lists only tournaments whose team list contains the owner's team.
Use All, Live, or Completed filters. Upcoming tournaments cannot be opened.

Evidence: `src/components/AvailableAuctions.jsx`.

### Join and Place a Bid

1. Open a live tournament.
2. The live room loads the current player and joins its Socket.IO room.
3. Review player, current highest bid, bidder, and timer.
4. Select **Place Bid** to submit the displayed next amount.
5. A valid bid is broadcast to all room participants and resets the timer.

A bid is disabled/rejected when the owner is already highest bidder, timer is
closed, team is not participating, purse is insufficient, amount is below the
minimum, or the round is not live.

There is no free-form bid amount or pass/fold control in the implemented UI.

Evidence: `src/components/TeamOwnerDashboard/LiveAuction.jsx`, backend
`src/index.js`, `src/utils/bidRules.js`.

### Review My Team

Open the **My Team** tab to see total budget, amount spent, remaining purse,
and purchased players. Players can be filtered by role and sorted by name,
role, or price.

Evidence: `src/components/TeamOwnerDashboard/MyTeam.jsx`.

### Review Teams and Bid History

The **Teams** tab shows all tournament squads and purse usage. The **Bid
History** tab filters completed player rounds by all/sold/unsold and opens each
player's bid list.

Evidence: `src/components/AdminDashboardLayout/TeamsOverview.jsx`,
`src/components/TeamOwnerDashboard/BidHistory.jsx`.

## Spectator Workflow

The spectator dashboard lists live and completed tournaments, excluding
upcoming tournaments. Open a tournament to watch its current player, timer,
highest bid, teams, squads, and bid history. Spectator mode does not render a
bid button.

Evidence: `src/components/AvailableAuctions.jsx`,
`src/components/SpectatorDashboard/SpectatorAuction.jsx`,
`src/components/TeamOwnerDashboard/LiveAuction.jsx`.

## Auction Outcomes

At timer expiry, bidding is locked. The player is not automatically sold or
marked unsold. The admin must extend the round, sell to the highest bidder, or
mark the player unsold. The result is then broadcast.

Evidence: backend `src/controllers/auction.controller.js`.
