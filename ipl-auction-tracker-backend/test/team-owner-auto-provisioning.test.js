import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  changePasswordSchema,
  registerSchema,
} from "../src/validation/auth.validation.js";
import { toSafeUserResponse } from "../src/utils/userResponse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Team Owner accounts cannot be created through public registration", () => {
  assert.equal(
    registerSchema.safeParse({
      body: {
        id: "owner-1",
        name: "Owner",
        email: "owner@example.com",
        password: "password123",
        role: "team_owner",
      },
    }).success,
    false
  );
});

test("forced password change is included only as a safe user field", () => {
  const response = toSafeUserResponse({
    id: "user-1",
    name: "Owner",
    email: "owner@example.com",
    role: "team_owner",
    isVerified: true,
    mustChangePassword: true,
    password: "hash",
  });
  assert.equal(response.mustChangePassword, true);
  assert.equal("password" in response, false);
  assert.equal(
    changePasswordSchema.safeParse({
      body: { password: "new-password-123" },
    }).success,
    true
  );
});

test("owner assignment provisions users, sends credentials, and audits events", async () => {
  const controller = await readBackendFile(
    "src/controllers/festivalMainAuction.controller.js"
  );
  assert.match(controller, /User\.findOne/);
  assert.match(controller, /User\.create/);
  assert.match(controller, /mustChangePassword: true/);
  assert.match(controller, /role: "team_owner"/);
  assert.match(controller, /sendTeamOwnerCredentialsEmail/);
  assert.match(controller, /action: "user_auto_created"/);
  assert.match(controller, /action: "owner_assigned"/);
  assert.match(controller, /action: "credentials_sent"/);
  assert.match(controller, /status: "active"/);
});

test("password-change enforcement is server-side and audited", async () => {
  const [middleware, routes, controller, server] = await Promise.all([
    readBackendFile("src/middleware/auth.middleware.js"),
    readBackendFile("src/routes/authRoutes.js"),
    readBackendFile("src/controllers/auth.controller.js"),
    readBackendFile("src/index.js"),
  ]);
  assert.match(middleware, /PASSWORD_CHANGE_REQUIRED/);
  assert.match(server, /if \(user\.mustChangePassword\)/);
  assert.match(server, /Password change required/);
  assert.match(routes, /"\/change-password",\s*authMiddleware/s);
  assert.match(controller, /action: "password_reset_completed"/);
  assert.match(controller, /user\.mustChangePassword = false/);
});

test("owner UI exposes automatic provisioning and forced reset", async () => {
  const [setup, login, app, changePassword] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/Login.jsx"),
    readRepoFile("ipl-auction-tracker/src/App.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/ChangePassword.jsx"),
  ]);
  assert.match(setup, /User Status:/);
  assert.match(setup, /label="Active"/);
  assert.match(login, /mustChangePassword/);
  assert.match(app, /path="\/change-password"/);
  assert.match(changePassword, /\/auth\/change-password/);
});
