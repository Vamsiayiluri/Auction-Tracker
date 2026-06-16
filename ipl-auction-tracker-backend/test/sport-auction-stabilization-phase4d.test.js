import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const backend = (path) => readFile(resolve(__dirname, "..", path), "utf8");
const frontend = (path) =>
  readFile(resolve(repoRoot, "ipl-auction-tracker", path), "utf8");

test("Phase 4D uses a consistent tournament-config-round lock order", async () => {
  const controller = await backend(
    "src/controllers/sportLiveAuction.controller.js"
  );
  const expiry = controller.slice(
    controller.indexOf("const expireRound"),
    controller.indexOf("const scheduleEnd")
  );
  const transactionStart = expiry.indexOf("sequelize.transaction");
  const tournamentLock = expiry.indexOf(
    "SportTournament.findByPk",
    transactionStart
  );
  const configLock = expiry.indexOf("loadConfig", transactionStart);
  const roundLock = expiry.indexOf("SportAuction.findByPk", transactionStart);
  assert.ok(tournamentLock >= 0);
  assert.ok(configLock > tournamentLock);
  assert.ok(roundLock > configLock);
  assert.match(expiry, /transaction\.LOCK\.UPDATE/);
});

test("Phase 4D revalidates participant and Captain eligibility during live operations", async () => {
  const controller = await backend(
    "src/controllers/sportLiveAuction.controller.js"
  );
  assert.match(controller, /getSportTournamentEligibility/);
  assert.match(controller, /Participant eligibility changed/);
  assert.match(controller, /Captain eligibility changed/);
  assert.match(controller, /No Sport Team has enough remaining credits/);
});

test("Phase 4D protects Pool history and finalization state", async () => {
  const [liveController, preparationController] = await Promise.all([
    backend("src/controllers/sportLiveAuction.controller.js"),
    backend("src/controllers/sportAuctionPreparation.controller.js"),
  ]);
  assert.match(liveController, /state: "available"/);
  assert.match(liveController, /updatedPoolRows !== 1/);
  assert.match(liveController, /selected participants are no longer unsold/);
  assert.match(preparationController, /SportAuction\.count/);
  assert.match(preparationController, /cannot be regenerated after Sport Auction history exists/);
});

test("Phase 4D sockets acknowledge joins and the Arena rejoins after reconnect", async () => {
  const [server, arena, header] = await Promise.all([
    backend("src/index.js"),
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportArenaHeader.jsx"),
  ]);
  assert.match(server, /join-sport-auction[\s\S]*acknowledge/);
  assert.match(server, /serverTime/);
  assert.match(arena, /socket\.on\("connect", joinRoom\)/);
  assert.match(header, /Connected/);
  assert.match(arena, /clockOffsetMs/);
  assert.match(arena, /queuedLoad/);
});

test("Phase 4D prevents duplicate actions and confirms irreversible outcomes", async () => {
  const [arena, controls, queue, controlCenter] = await Promise.all([
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportRoleControls.jsx"),
    frontend("src/components/SportAuctionArena/SportQueueSummary.jsx"),
    frontend("src/components/SportTournamentControlCenter.jsx"),
  ]);
  assert.match(arena, /actionInFlight/);
  assert.match(controls, /Complete Sport Auction\?/);
  assert.match(controls, /Sell participant\?/);
  assert.match(controls, /Mark participant unsold\?/);
  assert.match(arena, /Return participants to the Pool\?/);
  assert.doesNotMatch(controlCenter, /launchInFlight/);
  assert.match(controlCenter, /Open Sport Auction Arena/);
  assert.match(controls, /Launching\.\.\./);
  assert.match(queue, /Re-Auction Selected/);
});

test("Phase 4D exposes spectator Sport Auctions and readable histories", async () => {
  const [app, shell, directory, arena, controller] = await Promise.all([
    frontend("src/App.jsx"),
    frontend("src/components/AppShell.jsx"),
    frontend("src/pages/SportTournamentDirectory.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
    backend("src/controllers/sportTournament.controller.js"),
  ]);
  assert.match(app, /allowedRoles=\{\["admin", "team_owner", "spectator"\]\}/);
  assert.match(shell, /label: "Auctions"/);
  assert.match(shell, /to: "\/auctions"/);
  assert.match(directory, /Follow active and completed Sport Auctions/);
  assert.match(arena, /SportLiveBidStream/);
  assert.match(arena, /SportRecentResultsStrip/);
  assert.doesNotMatch(arena, /Team Allocations/);
  assert.match(controller, /"auction_live"/);
  assert.match(controller, /"auction_completed"/);
});

test("Phase 4D locks setup UI after auction launch and adds actionable empty states", async () => {
  const [workspace, arena, participantStage, queue] = await Promise.all([
    frontend("src/pages/SportTournamentWorkspace.jsx"),
    frontend("src/pages/SportAuctionArena.jsx"),
    frontend("src/components/SportAuctionArena/SportParticipantStage.jsx"),
    frontend("src/components/SportAuctionArena/SportQueueSummary.jsx"),
  ]);
  assert.match(workspace, /const canEditSetup/);
  assert.match(workspace, /Tournament setup is locked/);
  assert.match(participantStage, /No participant is active/);
  assert.match(arena, /No available participants remain/);
  assert.match(queue, /No unsold participants are waiting/);
});

test("Phase 4D remains isolated from competition functionality", async () => {
  const files = await Promise.all([
    backend("src/controllers/sportLiveAuction.controller.js"),
    backend("src/routes/sportTournamentRoutes.js"),
    frontend("src/pages/SportAuctionArena.jsx"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(
    source,
    /fixtures|points tables|semi finals|competition engine/i
  );
});
