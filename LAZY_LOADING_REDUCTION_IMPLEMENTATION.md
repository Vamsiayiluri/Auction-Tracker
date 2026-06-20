# Lazy Loading Reduction Implementation

## Goal

Reduce dependency on route-level dynamic imports for an internal business platform where reliability is more important than aggressive code splitting.

No business logic, route paths, permissions, auction rules, allocation behavior, or page behavior was changed.

## Audit Result

Before this change, `src/App.jsx` lazy-loaded 26 route-level pages with `lazyWithRetry()`.

Nested lazy loading also existed for core Festival management/results sections:

- `FestivalHistory`
- `FestivalBidHistory`
- `FestivalOverview`
- `FestivalReadiness`
- `FestivalAuctionSetup`
- `FestivalTeamBuilder`
- `FestivalTeamsDirectory`

Those nested sections are core business surfaces, not optional consumer-scale code splitting.

## Routes Converted To Static Imports

Core business pages converted from `lazyWithRetry()` to standard imports:

- Dashboard
- Festival Directory
- Festival Detail / Management
- Festival Command Center
- Festival Results
- Festival Auction Hub
- Sport Tournament Directory
- Sport Tournament Workspace
- Sport Tournament Command Center
- Sport Tournament Results
- Sport Auction Hub
- Profile
- Settings
- Auction Directory
- Employee Directory

Additional non-heavy shell/auth pages converted to standard imports:

- Login
- Register
- Forgot Password
- Reset Password
- Verify Email
- Change Password

Core nested Festival management/results sections converted to standard imports:

- `FestivalHistory`
- `FestivalBidHistory`
- `FestivalOverview`
- `FestivalReadiness`
- `FestivalAuctionSetup`
- `FestivalTeamBuilder`
- `FestivalTeamsDirectory`

The obsolete `Suspense` wrapper around these Festival management sections was removed.

## Routes Still Lazy Loaded

Lazy loading remains only for heavy auction surfaces:

- `AuctionPage`
- `FestivalLiveAuctionPage`
- `LiveAuctionPage`
- `SpectatorAuctionPage`
- `SportAuctionArena`

Nested heavy lazy load retained:

- `MainFestivalAuction`

These retained dynamic imports still use `lazyWithRetry()`, route boundaries, preload recovery, and chunk recovery from the production stability layer.

## Bundle Impact

Baseline before reduction was measured from the existing pre-change `dist` output:

- Main bundle before: `index-DvPA29NA.js`
- Main bundle size before: `522,182` bytes
- Route-level lazy page chunks before: `26`

After reduction:

- Main bundle after: `index-DwTgFri-.js`
- Main bundle size after: `980,229` bytes
- Route-level lazy page chunks after: `5`
- Total JS chunks after: `11`
- Non-main JS chunks after: `10`

Tradeoff:

- Main bundle increased by `458,047` bytes.
- Route-level chunk dependency dropped from `26` to `5`.
- Core business navigation no longer depends on loading separate route chunks.

This is the intended stability tradeoff for an internal platform.

## Stability Benefits

- Core business pages no longer fail because a route chunk is stale, missing, or served as HTML.
- Sport Tournament Directory and Workspace are now bundled into the main application payload.
- Festival management and results no longer depend on nested dynamic chunks.
- Production deploy/cache mismatch risk is reduced to heavy auction surfaces only.
- Route behavior and permission checks remain unchanged because only import strategy changed.
- Existing `AppErrorBoundary`, `RouteBoundary`, `lazyWithRetry`, and Vite preload recovery remain available for the few retained heavy chunks.

## Remaining Chunk Dependencies

The remaining production chunk failure risk is limited to heavy auction experiences:

- legacy team-owner auction page
- Festival live auction wrapper
- legacy admin live auction page
- spectator live auction page
- Sport live auction arena
- nested `MainFestivalAuction`

Those surfaces are intentionally kept lazy because they are operationally heavier and less frequently opened than the core business pages.

## Validation

Ran focused ESLint on changed files:

```text
src/App.jsx
src/pages/FestivalAuctionResultsPage.jsx
src/pages/FestivalDetail.jsx
src/pages/FestivalLiveAuctionPage.jsx

0 errors
```

Ran production build:

```text
npm run build
✓ built successfully
```

The existing large bundle warning remains expected after intentionally moving core business pages into the main bundle.
