# AuctionArena — Frontend

React 19 single-page application for the AuctionArena platform. Provides the complete UI for festival auctions, sport tournament auctions, real-time bidding, and role-differentiated dashboards.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Building for Production](#building-for-production)
- [Linting](#linting)
- [Pages and Routes](#pages-and-routes)
- [Key Components](#key-components)
- [Utilities](#utilities)
- [Authentication Flow](#authentication-flow)
- [Real-Time (Socket.IO)](#real-time-socketio)
- [Role-Based UI](#role-based-ui)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 19.0.0 | UI rendering and component model |
| React DOM | 19.0.0 | DOM binding |
| React Router DOM | 7.4.0 | Client-side routing |
| Material UI (MUI) | 6.4.8 | Component library and theming |
| MUI Icons Material | 6.4.8 | Icon set |
| Emotion React / Styled | 11.14.0 | CSS-in-JS for MUI |
| Axios | 1.8.4 | HTTP client (wraps all API calls) |
| socket.io-client | 4.8.1 | WebSocket client for real-time auction |
| Vite | 6.2.0 | Build tool and development server |
| ESLint | 9.21.0 | Code quality |

---

## Project Structure

```
ipl-auction-tracker/
├── public/                        # Static assets
├── src/
│   ├── main.jsx                   # App entry point
│   ├── App.jsx                    # Root router — all route definitions
│   ├── theme.js                   # MUI theme configuration
│   ├── context/
│   │   ├── AuthContext.jsx        # Auth context provider (user, token, login, logout)
│   │   └── auth-context.js        # Context factory
│   ├── webSocket/
│   │   └── socket.js              # socket.io-client singleton
│   ├── pages/                     # One file per route/page
│   ├── components/                # Shared and feature-specific components
│   ├── hooks/                     # Custom React hooks
│   └── utils/                     # Utility functions
├── .env                           # Environment variables (gitignored)
├── vite.config.js                 # Vite configuration
└── eslint.config.js               # ESLint configuration
```

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- Backend running at the URL specified in `VITE_API_URL`

---

## Installation

```bash
cd ipl-auction-tracker
npm install
```

---

## Environment Variables

Create `ipl-auction-tracker/.env`:

```env
VITE_API_URL=http://localhost:5000
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API server. No trailing slash. |

---

## Running the App

```bash
npm run dev
```

Starts the Vite development server at `http://localhost:5173`.

---

## Building for Production

```bash
npm run build
```

Output is in `dist/`. Serve this directory from any static host (Vercel, Netlify, Nginx, CDN).

Configure the host with SPA routing — all paths should serve `index.html`.

```bash
npm run preview   # Preview the production build locally
```

---

## Linting

```bash
npm run lint
```

ESLint 9 is configured with:
- `eslint-plugin-react-hooks` — enforces React hooks rules
- `eslint-plugin-react-refresh` — warns on fast-refresh incompatible exports

---

## Pages and Routes

| Route | Page | Access |
|---|---|---|
| `/login` | `Login.jsx` | Guest only |
| `/register` | `Register.jsx` | Guest only |
| `/verify-email` | `VerifyEmail.jsx` | Guest only |
| `/forgot-password` | `ForgotPassword.jsx` | Guest only |
| `/reset-password` | `ResetPassword.jsx` | Guest only |
| `/dashboard` | `Dashboard.jsx` | Authenticated |
| `/profile` | `ProfilePage.jsx` | Authenticated |
| `/account-settings` | `AccountSettingsPage.jsx` | Authenticated |
| `/employees` | `EmployeeDirectory.jsx` | Admin |
| `/auctions` | `AuctionDirectory.jsx` | Authenticated |
| `/festivals` | `FestivalDashboard.jsx` | Authenticated |
| `/festivals/:id` | `FestivalCommandCenter.jsx` | Authenticated |
| `/festivals/:id/manage` | `FestivalDetail.jsx` | Admin |
| `/festivals/:id/auction-hub` | `FestivalAuctionHub.jsx` | Authenticated |
| `/auctions/festivals/:id` | `FestivalLiveAuctionPage.jsx` | Authenticated |
| `/festivals/:id/results` | `FestivalAuctionResultsPage.jsx` | Authenticated |
| `/sport-tournaments` | `SportTournamentDirectory.jsx` | Authenticated |
| `/sport-tournaments/:sportTournamentId` | `SportTournamentCommandCenter.jsx` | Authenticated |
| `/sport-tournaments/:sportTournamentId/manage` | `SportTournamentWorkspace.jsx` | Admin |
| `/sport-tournaments/:id/auction-hub` | `SportAuctionHub.jsx` | Authenticated |
| `/auctions/sports/:id` | `SportAuctionArena.jsx` | Authenticated |
| `/sport-tournaments/:id/results` | `SportAuctionResultsPage.jsx` | Authenticated |

---

## Key Components

### Layout
- **`AppShell.jsx`** — main layout wrapper (navigation sidebar + content area)
- **`RouteGuards.jsx`** — `GuestRoute`, `ProtectedRoute`, `DefaultRoute`

### Dashboard
- **`AdminDashboard.jsx`** — admin view with festivals, tournaments, employee summary
- **`TeamOwnerDashboard/`** — owner view with active auctions
- **`SpectatorDashboard/`** — spectator view with live auction links
- **`ProductDashboard/`** — role-differentiated entry point

### Festival Auction Arena
Located in `components/FestivalAuctionArena/`:
- **`ArenaHeader.jsx`** — auction title, status, timer, and admin controls
- **`ParticipantStage.jsx`** — current participant on auction with bidding interface
- **`TeamPanels.jsx`** — all festival team budget cards
- **`LiveBidStream.jsx`** — real-time feed of all bids placed
- **`RecentResultsStrip.jsx`** — last sold/unsold outcomes
- **`QueueSummary.jsx`** — remaining participants in auction pool

### Sport Auction Arena
Located in `components/SportAuctionArena/`:
- **`SportArenaHeader.jsx`**
- **`SportParticipantStage.jsx`**
- **`SportTeamPanels.jsx`**
- **`SportLiveBidStream.jsx`**
- **`SportRecentResultsStrip.jsx`**
- **`SportQueueSummary.jsx`**
- **`SportRoleControls.jsx`** — captain bid controls

### Shared
- **`AuctionContextNavigation.jsx`** — tab navigation between Command Center / Hub / Arena / Results
- **`ProductState.jsx`** — `LoadingStateCard` and `ProductStateCard` for loading/empty states

---

## Utilities

| File | Purpose |
|---|---|
| `utils/api.js` | Axios instance with base URL and auth header interceptor |
| `utils/auctionSynchronization.js` | `shouldApplyAuctionSnapshot()` — revision guard; `mergeAuctionSnapshotState()` |
| `utils/auctionStages.js` | `getSportAuctionStageFromState()`, `isSetupStage()`, `isReadyStage()`, `AUCTION_STAGE` enum |
| `utils/auctionHub.js` | `formatAuctionValue()` — credit currency formatter |
| `webSocket/socket.js` | Singleton `socket.io-client` instance shared across all pages |

---

## Authentication Flow

1. User logs in → `POST /v1/auth/login` → receives JWT
2. JWT stored in `localStorage` under key `token`
3. `AuthContext` reads token on load and provides `user`, `login()`, `logout()` to the app
4. `api.js` Axios interceptor attaches `Authorization: Bearer <token>` to every request
5. `ProtectedRoute` redirects unauthenticated users to `/login`
6. Provisioned team owner accounts have `mustChangePassword: true` — the app forces a password change on first login

---

## Real-Time (Socket.IO)

The socket singleton (`webSocket/socket.js`) connects once on app load. Pages join and leave auction rooms via socket events:

```js
// Festival
socket.emit("join-festival-auction", { festivalId: Number(id) });
socket.emit("leave-festival-auction", { festivalId: Number(id) });

// Sport
socket.emit("join-sport-auction", { sportTournamentId: Number(id) });
socket.emit("leave-sport-auction", { sportTournamentId: Number(id) });

// Incoming state snapshot
socket.on("auction-state", (payload) => { /* full state snapshot with revision */ });
```

### Revision Guard

Every `auction-state` payload includes a `revision` number. Pages use `shouldApplyAuctionSnapshot(lastRevision, payload)` before applying any update — stale or out-of-order payloads are discarded.

### Reconnect Handler

Pages register `socket.on("connect", rejoin)` so the room is automatically rejoined after any network interruption.

---

## Role-Based UI

UI controls are shown or hidden based on permissions returned from the API:

| Permission | Where Set | Controls |
|---|---|---|
| `tournament.permissions.canManage` | API response | Admin controls (start, pause, resume, complete) |
| `auction.viewer.canBid` | API response | Bid input and Place Bid button |
| `user.role === "admin"` | Auth context | Employee directory, festival management links |

Role is never assumed from the frontend alone — every sensitive operation is validated by the backend.
