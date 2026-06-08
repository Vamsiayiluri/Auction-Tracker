# Architecture

## Repository Layout

```text
Auction-Tracker/
  ipl-auction-tracker/          React/Vite frontend
  ipl-auction-tracker-backend/  Express/Socket.IO/Sequelize backend
  Auction Management.docx       Original requirements/status document
```

The frontend and backend are independent Node projects. Evidence:
`ipl-auction-tracker/package.json`,
`ipl-auction-tracker-backend/package.json`.

## Frontend Architecture

`src/main.jsx` mounts the application with Material UI `ThemeProvider`.
`src/App.jsx` installs `AuthProvider`, React Router routes, route guards, and a
single Socket.IO connection.

Routes:

| Route | Guard | Component |
|---|---|---|
| `/login` | Guest | `src/pages/Login.jsx` |
| `/register` | Guest | `src/pages/Register.jsx` |
| `/verify-email/:token` | Public | `src/pages/VerifyEmail.jsx` |
| `/dashboard` | Authenticated | `src/pages/Dashboard.jsx` |
| `/start-live-auction` | Admin | `src/pages/LiveAuctionPage.jsx` |
| `/live-auction` | Team owner | `src/pages/AuctionPage.jsx` |
| `/spectator-live-auction` | Spectator | `src/pages/SpectatorAuctionPage.jsx` |

Evidence: `ipl-auction-tracker/src/App.jsx`,
`ipl-auction-tracker/src/components/RouteGuards.jsx`.

State management:

- Authentication context: `src/context/AuthContext.jsx`,
  `src/context/auth-context.js`.
- Local component state for all server data and UI state.
- URL query parameter `id` selects a tournament.
- No Redux, query cache, or custom hooks are implemented.

API and real time:

- Axios client uses `VITE_API_URL` and attaches bearer tokens:
  `src/utils/api.js`.
- Socket.IO singleton uses `VITE_API_URL` without auth:
  `src/webSocket/socket.js`.
- Shared bid display utilities: `src/utils/bidUtils.js`.

Component hierarchy:

```text
App
  AuthProvider
    Router
      AuthLayout
        Login / Register / VerifyEmail
      ProtectedRoute
        AppShell
          Dashboard
            AdminDashboard
              AuctionManagement
            TeamOwnerDashboard
              AvailableAuctions
            ViewerDashboard
              AvailableAuctions
          AdminAuctionDashboard
            AuctionLive
            TeamsOverview
            BidHistory
          BiddingAuction
            LiveAuction
            MyTeam
            TeamsOverview
            BidHistory
          SpectatorAuction
            LiveAuction
            TeamsOverview
            BidHistory
```

Reusable components include `AppShell`, `AuthLayout`, `AvailableAuctions`,
`TeamsOverview`, `BidHistory`, `LiveAuction`, `VisualTimer`, and `BrandLogo`.

Authentication flow:

```text
Login form -> POST /api/auth/login -> token + user
-> localStorage token/user -> AuthContext user
-> ProtectedRoute role check -> Axios bearer interceptor
```

This is a UI access-control layer, not a security boundary. The frontend trusts
the locally stored user role. Evidence: `src/context/AuthContext.jsx`,
`src/components/RouteGuards.jsx`.

## Backend Architecture

`src/index.js` configures Express, CORS, parsers, routes, HTTP server, Socket.IO,
database startup, model synchronization, and the complete socket bid handler.

```text
src/
  config/dbconfig.js
  controllers/
  middleware/auth.middleware.js
  models/
  routes/
  utils/
  index.js
```

HTTP request flow:

```text
Client
  -> Express route
  -> authMiddleware/adminMiddleware only where configured
  -> controller
  -> Sequelize models/transaction
  -> MySQL
  -> JSON response
```

Admin auction-control flow:

```text
Axios bearer request
  -> /api/auction/*
  -> authMiddleware
  -> adminMiddleware
  -> auction.controller.js
  -> Sequelize models/transaction
  -> MySQL
  -> Socket.IO tournament broadcast
```

Socket bid flow:

```text
Socket client
  -> join-tournament (unverified room join)
  -> place-bid payload (unverified identity)
  -> live/player/team/membership/purse/increment checks
  -> Sequelize transaction and Bid insert
  -> reset process-local timer
  -> new-bid broadcast to tournament room
```

Evidence: `ipl-auction-tracker-backend/src/index.js`,
`src/controllers/auction.controller.js`, `src/utils/bidRules.js`.

Backend layers:

- Routes: map URL paths to controllers.
- Controllers: contain validation, business rules, persistence, and responses.
- Models: Sequelize schemas and associations.
- Services: no general service layer; email sending is isolated in
  `src/utils/emailService.js`.
- Middleware: JWT authentication and two role checks in
  `src/middleware/auth.middleware.js`.
- Validation: manual checks only; no schema validation library.
- Error handling: local try/catch and status responses; no global error
  middleware.

## Auction State Model

An `Auction` row represents one player round. A player is available when
`isSold=false`, `isInAuction=false`, and `auctionId=""`. Starting a round sets
`isInAuction=true`, assigns `auctionId`, creates a live `Auction`, and starts a
20-second in-memory timer. Accepted bids reset the timer. Expiry changes the
auction to `pending`; admin sell/unsold finalization changes it to `completed`.

Evidence: `src/controllers/auction.controller.js`.

Important limitation: deadlines are not stored in the database. On process
restart, every live auction receives a fresh 20-second timer. Evidence:
`src/models/auction.model.js`, `restoreAuctionTimers` in
`src/controllers/auction.controller.js`.

## Documentation Discrepancies

- `ipl-auction-tracker/README.md` describes only the Vite template, not this
  application.
- `Auction Management.docx` says timer expiry awards the highest bidder or
  marks unsold. Code locks bidding and requires admin finalization.
- The Word document describes bid amount input and pass/fold controls. Code
  provides one button that sends the next server-provided minimum bid.
- The Word document calls Socket.IO updates future-facing in one section, while
  code implements them.
