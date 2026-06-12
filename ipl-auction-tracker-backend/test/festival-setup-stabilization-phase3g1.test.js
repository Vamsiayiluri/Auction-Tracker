import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FESTIVAL_SETUP_STEPS,
  getSetupCompletion,
  getStoredSetupStep,
} from "../../ipl-auction-tracker/src/utils/festivalWorkspace.js";

const readFrontend = (path) =>
  readFile(new URL(`../../ipl-auction-tracker/src/${path}`, import.meta.url), "utf8");
const readBackend = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const readyThrough = (stepKey) => {
  const keys = [
    "festivalDetails",
    "setupFoundation",
    "participants",
    "teams",
    "budget",
    "owners",
    "retentions",
    "auctionPool",
    "reviewAndLaunch",
  ];
  const limit = keys.indexOf(stepKey);
  return {
    setupSteps: Object.fromEntries(
      keys.map((key, index) => [key, index <= limit])
    ),
  };
};

test("wizard uses the stabilized nine-step order", () => {
  assert.deepEqual(FESTIVAL_SETUP_STEPS, [
    "Festival Details",
    "Setup Foundation",
    "Participants",
    "Teams",
    "Budget",
    "Owners",
    "Retentions",
    "Auction Pool",
    "Review & Launch",
  ]);
});

test("sports and employees foundation completion enables Next immediately", () => {
  const completion = getSetupCompletion(readyThrough("setupFoundation"));
  assert.equal(completion[1], true);
  assert.equal(completion[2], false);
});

test("budget configuration unlocks the Owners step", () => {
  const completion = getSetupCompletion(readyThrough("budget"));
  assert.equal(completion[4], true);
  assert.equal(completion[5], false);
});

test("step completion and resume persist by stable step name", () => {
  assert.equal(getStoredSetupStep("Owners"), 5);
  assert.equal(getStoredSetupStep("Review & Launch"), 8);
  assert.equal(getStoredSetupStep(null), 0);
});

test("backend readiness owns every wizard completion rule", async () => {
  const [readinessSource, workspaceSource] = await Promise.all([
    readBackend("src/utils/festivalReadiness.js"),
    readFrontend("utils/festivalWorkspace.js"),
  ]);
  assert.match(readinessSource, /setupSteps:/);
  assert.match(readinessSource, /setupFoundation: enabledSports > 0 && employees > 0/);
  assert.match(readinessSource, /participants:\s*participants\.length > 0 && sportRegistrations > 0/);
  assert.match(readinessSource, /budget: Boolean\(config\)/);
  assert.match(readinessSource, /owners: allTeamsHaveReadyOwners/);
  assert.match(readinessSource, /reviewAndLaunch: blockers\.length === 0/);
  assert.doesNotMatch(workspaceSource, /counts\.sportsEnabled/);
  assert.doesNotMatch(workspaceSource, /counts\.teamsCreated/);
});

test("all setup mutations invalidate readiness and dependent queries", async () => {
  const [detail, teams, setup] = await Promise.all([
    readFrontend("pages/FestivalDetail.jsx"),
    readFrontend("components/FestivalTeamBuilder.jsx"),
    readFrontend("components/FestivalAuctionSetup.jsx"),
  ]);

  assert.match(detail, /const invalidateFestivalSetup = useCallback/);
  assert.match(detail, /Promise\.allSettled\(\[\s*loadWorkspace\(\),\s*loadRegistrationData\(\),\s*refreshReadiness\(\)/s);
  assert.match(detail, /await invalidateFestivalSetup\(\)/);
  assert.match(detail, /onRefresh=\{invalidateFestivalSetup\}/);
  assert.match(teams, /await onTeamsChanged\?\.\(\)/);
  assert.match(setup, /saveConfig[\s\S]*await onRosterChanged\?\.\(\)/);
  assert.match(setup, /assignOwner[\s\S]*await onRosterChanged\?\.\(\)/);
  assert.match(setup, /createRetention[\s\S]*await onRosterChanged\?\.\(\)/);
});

test("team creation refreshes Owner and Retention dependencies without reload", async () => {
  const [detail, teams, setup] = await Promise.all([
    readFrontend("pages/FestivalDetail.jsx"),
    readFrontend("components/FestivalTeamBuilder.jsx"),
    readFrontend("components/FestivalAuctionSetup.jsx"),
  ]);
  assert.match(teams, /await loadTeamBuilder\(\);\s*await onTeamsChanged\?\.\(\)/);
  assert.match(detail, /onTeamsChanged=\{invalidateFestivalSetup\}/);
  assert.match(detail, /operationRevision=\{rosterRevision\}/);
  assert.match(setup, /api\.get\(`\/v2\/festivals\/\$\{festivalId\}\/teams`\)/);
  assert.doesNotMatch(detail, /window\.location\.reload/);
});
