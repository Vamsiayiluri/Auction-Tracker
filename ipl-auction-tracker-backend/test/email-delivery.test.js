import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("Gmail SMTP is the default provider and Resend remains optional", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /process\.env\.EMAIL_PROVIDER \|\| "smtp"/);
  assert.match(service, /process\.env\.SMTP_PORT \|\| 587/);
  assert.match(service, /requireTLS: !SMTP_SECURE/);
  assert.match(service, /https:\/\/api\.resend\.com\/emails/);
});

test("SMTP diagnostics log configuration without credential values", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /hostname: SMTP_HOST/);
  assert.match(service, /port: SMTP_PORT/);
  assert.match(service, /userConfigured: Boolean\(SMTP_USER\)/);
  assert.match(service, /passwordConfigured: Boolean\(SMTP_PASS\)/);
  assert.match(service, /await transporter\.verify\(\)/);
  assert.doesNotMatch(service, /password:\s*SMTP_PASS/);
});

test("all authentication emails use the shared provider delivery path", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /"verification"\s*\)/);
  assert.match(service, /"password_reset"\s*\)/);
  assert.match(service, /"team_owner_credentials"\s*\)/);
});

test("SMTP failures are classified and the test route is admin protected", async () => {
  const service = await readProjectFile("src/utils/emailService.js");
  const routes = await readProjectFile("src/routes/debugRoutes.js");
  const index = await readProjectFile("src/index.js");

  assert.match(service, /connection_timeout/);
  assert.match(service, /connection_refused/);
  assert.match(service, /gmail_authentication_failed/);
  assert.match(service, /tls_failure/);
  assert.match(service, /setDefaultResultOrder\("ipv4first"\)/);
  assert.match(service, /resolve4\(SMTP_HOST\)/);
  assert.match(service, /resolve6\(SMTP_HOST\)/);
  assert.match(service, /host: smtpAddressSelection\.chosenAddress/);
  assert.match(service, /servername: SMTP_HOST/);
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(routes, /router\.get\("\/smtp-test", testSmtpDelivery\)/);
  assert.match(index, /app\.use\("\/api\/debug", DebugRoutes\)/);
});

test("Nodemailer is declared in package and lock metadata", async () => {
  const packageJson = await readProjectFile("package.json");
  const packageLock = await readProjectFile("package-lock.json");

  assert.match(packageJson, /"nodemailer": "\^8\.0\.11"/);
  assert.match(packageLock, /"node_modules\/nodemailer"/);
});

test("admin network diagnostics test Gmail TCP ports without sending mail", async () => {
  const diagnostic = await readProjectFile("src/utils/smtpNetworkDiagnostic.js");
  const controller = await readProjectFile("src/controllers/debug.controller.js");
  const routes = await readProjectFile("src/routes/debugRoutes.js");

  assert.match(diagnostic, /port: 587/);
  assert.match(diagnostic, /port: 465/);
  assert.match(diagnostic, /tls\.connect/);
  assert.match(diagnostic, /dnsSuccess/);
  assert.match(diagnostic, /tcp587Success/);
  assert.match(diagnostic, /tcp465Success/);
  assert.match(diagnostic, /tlsSuccess/);
  assert.doesNotMatch(diagnostic, /sendMail/);
  assert.match(controller, /runGmailNetworkDiagnostic/);
  assert.match(routes, /router\.get\("\/network-test", testSmtpNetwork\)/);
});
