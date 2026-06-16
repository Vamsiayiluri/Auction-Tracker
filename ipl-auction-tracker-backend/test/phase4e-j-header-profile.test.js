import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const frontend = (relativePath) =>
  fs.readFile(path.join(root, "ipl-auction-tracker", relativePath), "utf8");

test("Phase 4E-J modernizes the header account surface", async () => {
  const shell = await frontend("src/components/AppShell.jsx");

  assert.match(shell, /aria-label="Open account menu"/);
  assert.match(shell, /id="account-menu"/);
  assert.match(shell, /MenuListProps=\{\{ "aria-label": "Account menu" \}\}/);
  assert.match(shell, /My Profile/);
  assert.match(shell, /Account Settings/);
  assert.match(shell, /Notifications/);
  assert.match(shell, /Activity History/);
  assert.match(shell, /Sign Out/);
  assert.match(shell, /roleLabels = \{\s*admin: "Administrator"/);

  assert.doesNotMatch(shell, /label=\{roleLabels/);
  assert.doesNotMatch(shell, />\s*Logout\s*</);
});

test("Phase 4E-J account menu supports close behavior and existing logout", async () => {
  const shell = await frontend("src/components/AppShell.jsx");

  assert.match(shell, /const closeAccountMenu = \(\) => setAccountMenuAnchor\(null\)/);
  assert.match(shell, /onClose=\{closeAccountMenu\}/);
  assert.match(shell, /setAccountMenuAnchor\(null\);\s*logout\(\);\s*navigate\("\/login"/s);
  assert.match(shell, /aria-haspopup="menu"/);
  assert.match(shell, /aria-expanded=\{accountMenuOpen \? "true" : undefined\}/);
});

test("Phase 4E-J adds protected profile and settings routes", async () => {
  const app = await frontend("src/App.jsx");

  assert.match(app, /path="\/profile"/);
  assert.match(app, /<ProfilePage \/>/);
  assert.match(app, /path="\/settings"/);
  assert.match(app, /<AccountSettingsPage \/>/);
});

test("Phase 4E-J creates read-only profile and future-ready settings pages", async () => {
  const [profile, settings, document] = await Promise.all([
    frontend("src/pages/ProfilePage.jsx"),
    frontend("src/pages/AccountSettingsPage.jsx"),
    fs.readFile(
      path.join(root, "PHASE_4E_J_HEADER_PROFILE_EXPERIENCE.md"),
      "utf8",
    ),
  ]);

  for (const label of [
    "Profile Information",
    "Role Information",
    "Account Information",
    "Activity Summary",
  ]) {
    assert.match(profile, new RegExp(label));
  }

  for (const label of [
    "Preferences",
    "Notifications",
    "Display Options",
    "Account Security",
    "Coming Soon",
  ]) {
    assert.match(settings, new RegExp(label));
  }

  for (const section of [
    "Existing Problems",
    "New Header Architecture",
    "Profile Experience",
    "Account Settings Architecture",
    "Mobile Behavior",
    "Accessibility",
    "Before Versus After UX",
  ]) {
    assert.match(document, new RegExp(section));
  }
});
