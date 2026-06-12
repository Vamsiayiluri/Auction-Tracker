import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readProjectFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("production email delivery supports Resend over HTTPS", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /EMAIL_PROVIDER/);
  assert.match(service, /https:\/\/api\.resend\.com\/emails/);
  assert.match(service, /Authorization: `Bearer \$\{process\.env\.RESEND_API_KEY\}`/);
});

test("SMTP diagnostics log configuration without credential values", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /smtpHost: SMTP_HOST/);
  assert.match(service, /smtpPort: SMTP_PORT/);
  assert.match(service, /smtpUserConfigured: Boolean\(SMTP_USER\)/);
  assert.match(service, /smtpPasswordConfigured: Boolean\(SMTP_PASS\)/);
  assert.match(service, /await transporter\.verify\(\)/);
  assert.doesNotMatch(service, /smtpPassword:\s*SMTP_PASS/);
});

test("all authentication emails use the shared provider delivery path", async () => {
  const service = await readProjectFile("src/utils/emailService.js");

  assert.match(service, /"verification"\s*\)/);
  assert.match(service, /"password_reset"\s*\)/);
  assert.match(service, /"team_owner_credentials"\s*\)/);
});
