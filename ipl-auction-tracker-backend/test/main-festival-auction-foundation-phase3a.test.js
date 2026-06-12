import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignFestivalTeamOwnerSchema,
  createFestivalRetentionSchema,
  updateFestivalAuctionConfigSchema,
} from "../src/validation/festival.validation.js";
import { calculateFestivalTeamBudget } from "../src/utils/festivalAuctionBudget.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readRepoFile = (relativePath) =>
  readFile(resolve(repoRoot, relativePath), "utf8");

test("Phase 3A calculates owner and retention purse deductions", () => {
  assert.deepEqual(
    calculateFestivalTeamBudget({
      totalBudget: 20_000_000,
      ownerCost: 2_000_000,
      retentionAmounts: [500_000, 750_000],
    }),
    {
      totalBudget: 20_000_000,
      ownerCost: 2_000_000,
      retentionSpent: 1_250_000,
      auctionSpent: 0,
      spentBudget: 3_250_000,
      remainingBudget: 16_750_000,
    }
  );
});

test("Phase 3A validates owner, retention, and auction config requests", () => {
  assert.equal(
    assignFestivalTeamOwnerSchema.safeParse({
      params: { festivalId: "festival-1", teamId: "team-1" },
      body: { participantId: "participant-1" },
    }).success,
    true
  );
  assert.equal(
    createFestivalRetentionSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        participantId: "participant-1",
        teamId: "team-1",
        amount: 500000,
      },
    }).success,
    true
  );
  assert.equal(
    createFestivalRetentionSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: {
        participantId: "participant-1",
        teamId: "team-1",
        amount: -1,
      },
    }).success,
    false
  );
  assert.equal(
    updateFestivalAuctionConfigSchema.safeParse({
      params: { festivalId: "festival-1" },
      body: { totalBudget: 20_000_000, ownerCost: 2_000_000 },
    }).success,
    true
  );
});

test("Phase 3A migration adds only festival auction foundation structures", async () => {
  const migration = await readBackendFile(
    "migrations/202606090005-main-festival-auction-foundation.js"
  );

  [
    "FestivalAuctionConfigs",
    "FestivalTeamOwners",
    "FestivalRetentions",
    "FestivalAuctionPools",
  ].forEach((tableName) =>
    assert.match(migration, new RegExp(`createTable\\("${tableName}"`))
  );
  assert.match(migration, /"rosterSource"/);
  assert.match(migration, /festival_team_owners_festival_participant_uq/);
  assert.match(migration, /festival_retentions_festival_participant_uq/);
  assert.match(migration, /festival_auction_pools_festival_participant_uq/);
  assert.doesNotMatch(
    migration,
    /(?:addColumn|changeColumn|createTable)\("(?:Tournaments|TournamentTeams|Teams|Players|Auctions|Bids)"/
  );
});

test("Phase 3A routes are authorized and expose only setup APIs", async () => {
  const routes = await readBackendFile("src/routes/festivalRoutes.js");

  assert.match(routes, /teams\/:teamId\/owner/);
  assert.match(routes, /"\/:festivalId\/retentions"/);
  assert.match(routes, /"\/:festivalId\/retentions\/:id"/);
  assert.match(routes, /"\/:festivalId\/auction-pool"/);
  assert.match(routes, /"\/:festivalId\/auction-config"/);
  assert.match(
    routes,
    /"\/:festivalId\/teams\/:teamId\/owner",\s*adminMiddleware/s
  );
  assert.match(
    routes,
    /"\/:festivalId\/retentions",\s*adminMiddleware/s
  );
  assert.doesNotMatch(routes, /festival.*(?:bid|live-auction)/i);
});

test("Phase 3A owner and retention operations are transactional and unique", async () => {
  const controller = await readBackendFile(
    "src/controllers/festivalMainAuction.controller.js"
  );

  assert.match(controller, /sequelize\.transaction/);
  assert.match(controller, /FestivalTeamOwner\.create/);
  assert.match(controller, /rosterSource: "owner_retention"/);
  assert.match(controller, /FestivalRetention\.create/);
  assert.match(controller, /rosterSource: "retention"/);
  assert.match(controller, /FestivalTeamMembership\.destroy/);
  assert.match(controller, /Retention amount exceeds the team's remaining purse/);
  assert.match(controller, /Team owner cannot be retained again/);
  assert.match(controller, /Participant is already retained/);
  assert.match(controller, /config\.status !== "setup"/);
  assert.doesNotMatch(
    controller,
    /\b(Tournament|TournamentTeam|Player|Auction|Bid)\b/
  );
});

test("Phase 3A auction pool excludes rostered participants and exposes candidate data", async () => {
  const controller = await readBackendFile(
    "src/controllers/festivalMainAuction.controller.js"
  );

  assert.match(controller, /!participant\.teamMembership/);
  assert.match(controller, /FestivalAuctionPool\.bulkCreate/);
  assert.match(controller, /sportCount:/);
  assert.match(controller, /model: Employee, as: "employee"/);
  assert.match(controller, /model: Sport, as: "sport"/);
});

test("Phase 3A UI contains configuration, owners, retentions, budgets, and pool", async () => {
  const [setup, detail, builder] = await Promise.all([
    readRepoFile("ipl-auction-tracker/src/components/FestivalAuctionSetup.jsx"),
    readRepoFile("ipl-auction-tracker/src/pages/FestivalDetail.jsx"),
    readRepoFile("ipl-auction-tracker/src/components/FestivalTeamBuilder.jsx"),
  ]);

  assert.match(detail, /<FestivalAuctionSetup/);
  assert.match(setup, /Main Festival Auction Setup/);
  assert.match(setup, /Team Owners And Budgets/);
  assert.match(setup, /Owner Cost/);
  assert.match(setup, /Retain Participant/);
  assert.match(setup, /Auction Pool/);
  assert.match(setup, /Remaining:/);
  assert.match(builder, /Auction roster formation is active/);
  assert.doesNotMatch(setup, /place-bid|socket|captain|sport team/i);
});
