# Phase 4E-J Header, Profile, and Account Experience

## Existing Problems

- The standalone Logout button occupied primary navigation space.
- The role badge competed with navigation and was disconnected from identity.
- The profile area was informational only and did not open account actions.
- Profile and account settings destinations did not exist.
- Mobile navigation risked becoming crowded as more destinations were added.

## New Header Architecture

The header now follows a modern SaaS pattern:

```text
Logo | Primary Navigation | Account Avatar
```

Primary navigation remains focused on product destinations. Account actions
move into the avatar menu. The user's role is shown only inside the menu.

## Profile Experience

`/profile` is a protected read-only page that uses existing authenticated user
data only.

Sections:

- Profile Information: name, employee identifier when available, email.
- Role Information: role, assigned teams summary, captain assignment summary.
- Account Information: joined date, last activity when available, account ID.
- Activity Summary: guidance to use the dashboard for current assignments and
  auction activity.

No editing, backend fetches, or account mutations are included.

## Account Settings Architecture

`/settings` is a protected future-ready settings surface.

Sections:

- Preferences
- Notifications
- Display Options
- Account Security

Each section is a placeholder card marked `Coming Soon`. Password changes,
notification delivery, themes, and session management are not implemented.

## Profile Menu

The avatar opens an account menu with:

- User name
- Role label
- My Profile
- Role-aware shortcut such as My Teams or My Auctions
- Account Settings
- Notifications, disabled and marked Coming Soon
- Activity History, disabled and marked Coming Soon
- Sign Out

Sign Out uses the existing logout function and redirects to `/login`.

## Mobile Behavior

Desktop and tablet keep:

```text
Logo | Navigation | Avatar
```

Mobile keeps:

```text
Logo | Hamburger Menu | Avatar
```

The drawer contains product navigation only. Account actions remain available
from the avatar menu, avoiding duplicate logout placement.

## Accessibility

- The avatar button has an explicit account-menu label.
- The menu uses Material UI menu behavior for keyboard navigation.
- Escape and outside click close the menu through the menu `onClose` handler.
- Menu items use text labels and icons.
- Disabled future items are visibly marked as unavailable.

## Future Extensibility

The menu structure can support:

- Notifications
- Help Center
- Theme Settings
- Support
- Activity Logs
- Session Management

These additions should remain inside the account menu unless they become
primary product workflows.

## Before Versus After UX

| Area | Before | After |
| --- | --- | --- |
| Header actions | Navigation, role badge, profile text, Logout | Navigation and account avatar |
| Logout | Persistent header button | Sign Out inside profile menu |
| Role | Standalone chip and profile subtitle | Inside profile menu |
| Profile | Static display only | Interactive account menu plus `/profile` |
| Settings | No destination | `/settings` placeholder architecture |
| Mobile | Drawer duplicated logout | Drawer for navigation, avatar for account |

## Files Changed

- `ipl-auction-tracker/src/components/AppShell.jsx`
- `ipl-auction-tracker/src/App.jsx`
- `ipl-auction-tracker/src/pages/ProfilePage.jsx`
- `ipl-auction-tracker/src/pages/AccountSettingsPage.jsx`
- `ipl-auction-tracker-backend/test/phase4e-j-header-profile.test.js`

## Risks

- Profile assignment details are limited because this phase avoids new backend
  APIs.
- Disabled menu items should be revisited when notification and activity
  features are implemented.
- Older users may initially look for Logout in the header; the profile menu now
  follows the common account-action pattern.

## Manual Testing Checklist

- Confirm the header has no standalone Logout button.
- Confirm no standalone role badge appears in the header.
- Open the avatar menu and verify name, role, My Profile, Account Settings,
  future items, and Sign Out.
- Press Escape and verify the menu closes.
- Click outside the menu and verify it closes.
- Navigate to `/profile`.
- Navigate to `/settings`.
- Verify mobile drawer navigation remains accessible.
- Verify Sign Out still redirects to `/login`.
