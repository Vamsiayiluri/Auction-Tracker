import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validate, validateSocketPayload } from "../src/middleware/validate.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../src/validation/auth.validation.js";
import {
  createTournamentSchema,
  updateTournamentStatusSchema,
} from "../src/validation/tournament.validation.js";
import { createPlayerSchema } from "../src/validation/player.validation.js";
import {
  playerAuctionActionSchema,
  startAuctionSchema,
} from "../src/validation/auction.validation.js";
import { placeBidSocketSchema } from "../src/validation/socket.validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readBackendFile = (relativePath) =>
  readFile(resolve(__dirname, "..", relativePath), "utf8");

const validPlayer = {
  id: "player-1",
  name: "Player One",
  sportId: "cricket",
  role: "Batsman",
  basePrice: 500000,
};

test("auth validation accepts valid payloads and rejects malformed data", () => {
  assert.equal(
    registerSchema.safeParse({
      body: {
        id: "spectator-1",
        name: "Spectator",
        email: "SPECTATOR@example.com",
        password: "password123",
        role: "spectator",
      },
    }).success,
    true
  );
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

  assert.equal(
    registerSchema.safeParse({
      body: {
        id: "admin-1",
        name: "Admin",
        email: "admin@example.com",
        password: "password123",
        role: "admin",
      },
    }).success,
    false
  );
  assert.equal(
    loginSchema.safeParse({
      body: { email: "owner@example.com", password: "anything" },
    }).success,
    true
  );
  assert.equal(
    forgotPasswordSchema.safeParse({ body: { email: "not-an-email" } }).success,
    false
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      body: { token: "token", password: "short" },
    }).success,
    false
  );
});

test("tournament validation enforces required arrays and status enum", () => {
  assert.equal(
    createTournamentSchema.safeParse({
      body: {
        id: "tournament-1",
        name: "Tournament",
        sportId: "cricket",
        budget: "20000000",
        teams: ["Team One"],
        players: [validPlayer],
      },
    }).success,
    true
  );
  assert.equal(
    createTournamentSchema.safeParse({
      body: {
        id: "tournament-1",
        name: "Tournament",
        sportId: "cricket",
        budget: 20000000,
        teams: [],
        players: [validPlayer],
      },
    }).success,
    false
  );
  assert.equal(
    updateTournamentStatusSchema.safeParse({
      params: { id: "tournament-1" },
      body: { status: "archived" },
    }).success,
    true
  );
  assert.equal(
    updateTournamentStatusSchema.safeParse({
      params: { id: "tournament-1" },
      body: { status: "deleted" },
    }).success,
    false
  );
});

test("player and auction schemas enforce required fields", () => {
  assert.equal(
    createPlayerSchema.safeParse({
      body: { ...validPlayer, tournamentId: "tournament-1" },
    }).success,
    true
  );
  assert.equal(
    createPlayerSchema.safeParse({
      body: { ...validPlayer, role: null, tournamentId: "tournament-1" },
    }).success,
    false
  );
  assert.equal(
    createPlayerSchema.safeParse({
      body: {
        ...validPlayer,
        sportId: "tt",
        role: null,
        tournamentId: "tournament-1",
      },
    }).success,
    true
  );
  assert.equal(
    startAuctionSchema.safeParse({
      params: { playerId: "player-1" },
      body: { auctionId: "auction-1", tournamentId: "tournament-1" },
    }).success,
    true
  );
  assert.equal(
    startAuctionSchema.safeParse({
      params: { playerId: "player-1" },
      body: { tournamentId: "tournament-1" },
    }).success,
    false
  );
  assert.equal(
    playerAuctionActionSchema.safeParse({
      params: { playerId: "player-1" },
    }).success,
    true
  );
});

test("socket bid validation rejects malformed data and coerces valid bid amount", () => {
  const valid = validateSocketPayload(placeBidSocketSchema, {
    id: "bid-1",
    playerId: "player-1",
    tournamentId: "tournament-1",
    bidAmount: "525000",
  });

  assert.equal(valid.success, true);
  assert.equal(valid.data.bidAmount, 525000);

  const invalid = validateSocketPayload(placeBidSocketSchema, {
    id: "bid-1",
    playerId: "player-1",
    tournamentId: "tournament-1",
    bidAmount: "not-a-number",
  });

  assert.equal(invalid.success, false);
  assert.equal(invalid.message, "Validation failed");
  assert.ok(Array.isArray(invalid.errors));
});

test("HTTP validation middleware normalizes legacy payloads and returns standard errors", () => {
  const middleware = validate(loginSchema);
  let statusCode;
  let jsonBody;
  let nextCalled = false;

  middleware(
    {
      body: {
        '{"email":"owner@example.com","password":"password123"}': "",
      },
      params: {},
      query: {},
    },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
      },
    },
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(statusCode, undefined);
  assert.equal(jsonBody, undefined);

  validate(loginSchema)(
    { body: { email: "bad" }, params: {}, query: {} },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
      },
    },
    () => {}
  );

  assert.equal(statusCode, 400);
  assert.deepEqual(jsonBody.success, false);
  assert.equal(jsonBody.message, "Validation failed");
  assert.ok(Array.isArray(jsonBody.errors));
});

test("Phase 4 routes and socket handler use centralized validation", async () => {
  const authRoutes = await readBackendFile("src/routes/authRoutes.js");
  const tournamentRoutes = await readBackendFile("src/routes/tournmentRoutes.js");
  const playerRoutes = await readBackendFile("src/routes/playerRoutes.js");
  const auctionRoutes = await readBackendFile("src/routes/auctionRoutes.js");
  const server = await readBackendFile("src/index.js");

  assert.match(authRoutes, /validate\(registerSchema\)/);
  assert.match(authRoutes, /validate\(loginSchema\)/);
  assert.match(tournamentRoutes, /validate\(createTournamentSchema\)/);
  assert.match(tournamentRoutes, /validate\(updateTournamentStatusSchema\)/);
  assert.match(playerRoutes, /validate\(createPlayerSchema\)/);
  assert.match(auctionRoutes, /validate\(startAuctionSchema\)/);
  assert.match(auctionRoutes, /validate\(playerAuctionActionSchema\)/);
  assert.match(server, /validateSocketPayload\(placeBidSocketSchema, data\)/);
});
