import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "../src/utils/passwordReset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readFrontendFile = (relativePath) =>
  readFile(resolve(__dirname, "../../ipl-auction-tracker", relativePath), "utf8");

test("JWT access tokens are configured with a one-hour expiration", async () => {
  const authController = await readProjectFile("src/controllers/auth.controller.js");

  assert.match(authController, /const ACCESS_TOKEN_EXPIRES_IN = "1h";/);
  assert.match(
    authController,
    /jwt\.sign\(\s*\{ id: user\.id, role: user\.role \},\s*process\.env\.JWT_SECRET,\s*\{ expiresIn: ACCESS_TOKEN_EXPIRES_IN \}\s*\)/
  );
});

test("password reset tokens are random, hashed, and time-limited", () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();

  assert.equal(PASSWORD_RESET_TOKEN_TTL_MS, 60 * 60 * 1000);
  assert.equal(first.rawToken.length, 64);
  assert.notEqual(first.rawToken, second.rawToken);
  assert.equal(first.hashedToken, hashPasswordResetToken(first.rawToken));
  assert.notEqual(first.hashedToken, first.rawToken);
  assert.ok(first.expiresAt.getTime() > Date.now());
});

test("password reset API routes are registered", async () => {
  const authRoutes = await readProjectFile("src/routes/authRoutes.js");

  assert.match(
    authRoutes,
    /router\.post\("\/forgot-password",\s*validate\(forgotPasswordSchema\),\s*forgotPassword\);/
  );
  assert.match(
    authRoutes,
    /router\.post\("\/reset-password",\s*validate\(resetPasswordSchema\),\s*resetPassword\);/
  );
});

test("password reset storage fields are present on the user model", async () => {
  const userModel = await readProjectFile("src/models/user.model.js");
  const modelsIndex = await readProjectFile("src/models/index.js");

  assert.match(userModel, /resetPasswordToken:/);
  assert.match(userModel, /resetPasswordExpires:/);
  assert.match(modelsIndex, /ensureUserPasswordResetColumns/);
});

test("forgot password stores hashed token and sends reset email", async () => {
  const authController = await readProjectFile("src/controllers/auth.controller.js");

  assert.match(authController, /createPasswordResetToken\(\)/);
  assert.match(authController, /user\.resetPasswordToken = hashedToken;/);
  assert.match(authController, /user\.resetPasswordExpires = expiresAt;/);
  assert.match(authController, /sendPasswordResetEmail\(user\.email, user\.name, rawToken\)/);
  assert.doesNotMatch(authController, /resetPasswordToken = rawToken/);
});

test("reset password rejects invalid or expired tokens and clears token after use", async () => {
  const authController = await readProjectFile("src/controllers/auth.controller.js");

  assert.match(authController, /const \{ token, password \} = req\.body;/);
  assert.match(authController, /hashPasswordResetToken\(token\)/);
  assert.match(authController, /resetPasswordExpires: \{ \[Op\.gt\]: new Date\(\) \}/);
  assert.match(authController, /Invalid or expired password reset token/);
  assert.match(authController, /user\.password = await bcrypt\.hash\(password, 10\);/);
  assert.match(authController, /user\.resetPasswordToken = null;/);
  assert.match(authController, /user\.resetPasswordExpires = null;/);
});

test("password reset frontend routes and pages exist", async () => {
  const app = await readFrontendFile("src/App.jsx");
  const login = await readFrontendFile("src/pages/Login.jsx");
  const forgotPassword = await readFrontendFile("src/pages/ForgotPassword.jsx");
  const resetPassword = await readFrontendFile("src/pages/ResetPassword.jsx");

  assert.match(app, /path="\/forgot-password"/);
  assert.match(app, /path="\/reset-password\/:token"/);
  assert.match(login, /to="\/forgot-password"/);
  assert.match(forgotPassword, /\/auth\/forgot-password/);
  assert.match(resetPassword, /\/auth\/reset-password/);
});
