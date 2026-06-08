import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  PUBLIC_REGISTRATION_ROLES,
  isPublicRegistrationRole,
} from "../src/utils/publicRegistrationRoles.js";
import { toSafeUserResponse } from "../src/utils/userResponse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("public registration allows only team owners and spectators", () => {
  assert.deepEqual(PUBLIC_REGISTRATION_ROLES, ["team_owner", "spectator"]);
  assert.equal(isPublicRegistrationRole("team_owner"), true);
  assert.equal(isPublicRegistrationRole("spectator"), true);
  assert.equal(isPublicRegistrationRole("admin"), false);
  assert.equal(isPublicRegistrationRole("Admin"), false);
  assert.equal(isPublicRegistrationRole("ADMIN"), false);
  assert.equal(isPublicRegistrationRole(" admin "), false);
  assert.equal(isPublicRegistrationRole(undefined), false);
});

test("frontend registration form does not expose admin as a public role", async () => {
  const registerPage = await readFile(
    resolve(__dirname, "../../ipl-auction-tracker/src/pages/Register.jsx"),
    "utf8"
  );

  assert.match(
    registerPage,
    /const publicRegistrationRoles = \["team_owner", "spectator"\];/
  );
  assert.doesNotMatch(registerPage, /<MenuItem value="admin">/);
  assert.doesNotMatch(registerPage, /publicRegistrationRoles = \[[^\]]*"admin"/);
});

test("tournament mutations require authentication and admin role", async () => {
  const tournamentRoutes = await readProjectFile("src/routes/tournmentRoutes.js");

  assert.match(
    tournamentRoutes,
    /router\.post\("\/create",\s*authMiddleware,\s*adminMiddleware,\s*createTournament\);/
  );
  assert.match(
    tournamentRoutes,
    /router\.patch\("\/:id\/status",\s*authMiddleware,\s*adminMiddleware,\s*updateStatus\);/
  );
});

test("player creation requires authentication and admin role", async () => {
  const playerRoutes = await readProjectFile("src/routes/playerRoutes.js");

  assert.match(
    playerRoutes,
    /router\.post\("\/",\s*authMiddleware,\s*adminMiddleware,\s*createPlayer\);/
  );
});

test("safe user response excludes authentication and verification secrets", () => {
  const safeUser = toSafeUserResponse({
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "spectator",
    isVerified: true,
    password: "password-hash",
    verificationToken: "token-hash",
    verificationExpires: new Date(),
  });

  assert.deepEqual(safeUser, {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "spectator",
    isVerified: true,
  });
});

test("safe user response supports Sequelize-style model instances", () => {
  const safeUser = toSafeUserResponse({
    get: () => ({
      id: "admin-1",
      name: "Existing Admin",
      email: "admin@example.com",
      role: "admin",
      isVerified: true,
      password: "password-hash",
    }),
  });

  assert.equal(safeUser.role, "admin");
  assert.equal("password" in safeUser, false);
});

test("login and registration responses use safe user DTOs", async () => {
  const authController = await readProjectFile("src/controllers/auth.controller.js");

  assert.match(authController, /user:\s*toSafeUserResponse\(newUser\)/);
  assert.match(authController, /user:\s*toSafeUserResponse\(user\)/);
  assert.doesNotMatch(authController, /user:\s*newUser\s*[,}]/);
  assert.doesNotMatch(authController, /user:\s*user\s*[,}]/);
});
