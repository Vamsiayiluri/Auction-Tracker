import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { updateTournamentStatusSchema } from "../src/validation/tournament.validation.js";
import {
  TOURNAMENT_STATUSES,
  isValidTournamentTransition,
  tournamentTransitionValidationError,
} from "../src/utils/tournamentStatus.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

test("F-002 supports only the current tournament status enum values", () => {
  assert.deepEqual(TOURNAMENT_STATUSES, ["upcoming", "live", "completed"]);
  assert.equal(TOURNAMENT_STATUSES.includes("archived"), false);

  assert.equal(
    updateTournamentStatusSchema.safeParse({
      params: { id: "tournament-1" },
      body: { status: "live" },
    }).success,
    true
  );
  assert.equal(
    updateTournamentStatusSchema.safeParse({
      params: { id: "tournament-1" },
      body: { status: "invalid-status" },
    }).success,
    false
  );
});

test("F-002 allows only forward tournament status transitions", () => {
  assert.equal(isValidTournamentTransition("upcoming", "live"), true);
  assert.equal(isValidTournamentTransition("live", "completed"), true);

  assert.equal(isValidTournamentTransition("upcoming", "completed"), false);
  assert.equal(isValidTournamentTransition("live", "upcoming"), false);
  assert.equal(isValidTournamentTransition("completed", "live"), false);
  assert.equal(isValidTournamentTransition("completed", "upcoming"), false);
  assert.equal(isValidTournamentTransition("upcoming", "invalid-status"), false);
  assert.equal(isValidTournamentTransition("invalid-status", "live"), false);
});

test("F-002 invalid transitions use the standard validation error envelope", () => {
  assert.deepEqual(
    tournamentTransitionValidationError("completed", "live"),
    {
      success: false,
      message: "Validation failed",
      errors: [
        {
          path: "body.status",
          message: "Invalid tournament status transition from completed to live",
        },
      ],
    }
  );
});

test("F-002 status endpoint uses centralized transition validation", async () => {
  const controller = await readBackendFile("src/controllers/tournment.controller.js");
  const route = await readBackendFile("src/routes/tournmentRoutes.js");
  const commonValidation = await readBackendFile("src/validation/common.validation.js");

  assert.match(route, /validate\(updateTournamentStatusSchema\)/);
  assert.match(commonValidation, /TOURNAMENT_STATUSES/);
  assert.match(controller, /isValidTournamentTransition\(tournament\.status, status\)/);
  assert.match(controller, /tournamentTransitionValidationError\(tournament\.status, status\)/);
  assert.doesNotMatch(controller, /status\s*=\s*req\.body\.status/);
});
