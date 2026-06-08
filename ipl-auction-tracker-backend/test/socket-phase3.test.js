import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");
const readFrontendFile = (relativePath) =>
  readFile(resolve(__dirname, "../../ipl-auction-tracker", relativePath), "utf8");

test("Socket.IO handshake requires and verifies a JWT", async () => {
  const server = await readBackendFile("src/index.js");

  assert.match(server, /io\.use\(async \(socket, next\) =>/);
  assert.match(server, /socket\.handshake\.auth\?\.token/);
  assert.match(server, /jwt\.verify\(token, process\.env\.JWT_SECRET\)/);
  assert.match(server, /User\.findByPk\(decoded\.id\)/);
  assert.match(server, /socket\.user = \{/);
  assert.match(server, /Socket authentication required/);
  assert.match(server, /Socket authentication failed/);
});

test("only authenticated team owners can place socket bids", async () => {
  const server = await readBackendFile("src/index.js");

  assert.match(server, /socket\.user\?\.role !== "team_owner"/);
  assert.match(server, /Only team owners can place bids\./);
  assert.match(server, /Join the tournament room before placing bids\./);
});

test("socket bids derive owner and team server-side", async () => {
  const server = await readBackendFile("src/index.js");

  assert.doesNotMatch(
    server,
    /const \{ id, playerId, teamId, ownerId, bidAmount, tournamentId \} = data;/
  );
  assert.match(server, /Team\.findAll\(\{\s*where: \{ ownerId: socket\.user\.id \}/);
  assert.match(server, /teamId: ownedTeamIds/);
  assert.match(server, /teamId: biddingTeam\.id/);
  assert.match(server, /ownerId: socket\.user\.id/);
  assert.doesNotMatch(server, /biddingTeam\.ownerId !== ownerId/);
});

test("frontend sends JWT during socket connection", async () => {
  const socketHelper = await readFrontendFile("src/webSocket/socket.js");
  const authContext = await readFrontendFile("src/context/AuthContext.jsx");
  const app = await readFrontendFile("src/App.jsx");

  assert.match(socketHelper, /socket\.auth = \{ token \};/);
  assert.match(socketHelper, /socket\.connect\(\)/);
  assert.match(authContext, /connectSocket\(token\)/);
  assert.match(authContext, /disconnectSocket\(\)/);
  assert.doesNotMatch(app, /connectSocket\(\)/);
});

test("frontend bid payload does not include client-owned identity fields", async () => {
  const liveAuction = await readFrontendFile(
    "src/components/TeamOwnerDashboard/LiveAuction.jsx"
  );
  const bidEmit = liveAuction.slice(liveAuction.indexOf('socket.emit("place-bid"'));

  assert.match(bidEmit, /playerId: currentPlayer\.id/);
  assert.match(bidEmit, /tournamentId: currentPlayer\.tournamentId/);
  assert.match(bidEmit, /bidAmount:/);
  assert.doesNotMatch(bidEmit, /teamId:/);
  assert.doesNotMatch(bidEmit, /ownerId:/);
  assert.doesNotMatch(bidEmit, /teamName:/);
});
