# PERFORMANCE AND SCALABILITY AUDIT
## AuctionArena Platform
**Audit Date:** 2026-06-19  
**Auditor:** Claude Sonnet 4.6 (Automated Static Analysis)  
**Scope:** Full-stack — React 19 frontend, Node.js/Express backend, Sequelize ORM, TiDB Serverless, Socket.IO  
**Status:** Read-only audit. No code changes made.

---

## TABLE OF CONTENTS

1. [Frontend Request Audit](#1-frontend-request-audit)
2. [Mutation Performance Audit](#2-mutation-performance-audit)
3. [Bid Placement Trace](#3-bid-placement-trace)
4. [Backend API Performance Audit](#4-backend-api-performance-audit)
5. [Database / Indexes Audit](#5-database--indexes-audit)
6. [Socket Performance Audit](#6-socket-performance-audit)
7. [React Performance Audit](#7-react-performance-audit)
8. [Network Latency Audit](#8-network-latency-audit)
9. [Top 20 Performance Issues](#9-top-20-performance-issues)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. FRONTEND REQUEST AUDIT

### Summary Table

| Page / Hook | File | Total API Calls on Mount | Sequential Waves | Parallel Batch | N+1 Issues | Re-fetch After Mutation |
|---|---|---|---|---|---|---|
| Dashboard | `src/pages/Dashboard.jsx` | Delegates to hook | 0 | 0 | No | No |
| AuctionDirectory | `src/pages/AuctionDirectory.jsx` | 1 + 2N (N = festival count) | 2 waves | Wave 2 parallel per festival | **YES — 2 calls per festival** | Full reload on filter change |
| FestivalCommandCenter | `src/pages/FestivalCommandCenter.jsx` + `src/hooks/useFestivalCommandCenterData.js` | 5 + 3M (M = active tournaments) | **2 phases** | Phase 1: 5 parallel; Phase 2: up to 3 per tournament | **YES — 3 calls per tournament** | `invalidateFestivalSetup` → 3 parallel re-fetches |
| FestivalAuctionHub | `src/pages/FestivalAuctionHub.jsx` | 4 | 1 wave | All 4 parallel | No | Full reload on socket `auction-state` (history replace) |
| FestivalDetail | `src/pages/FestivalDetail.jsx` | 3–6 | **Cascading useEffects** | Some parallel in `invalidateFestivalSetup` | No | `invalidateFestivalSetup` → 3 parallel + conditional calls |
| FestivalLiveAuctionPage | `src/pages/FestivalLiveAuctionPage.jsx` | 0 (lazy loads child) | 0 | 0 | No | N/A |
| SportTournamentWorkspace | `src/pages/SportTournamentWorkspace.jsx` | 3 initial + deferred per tab | 1 initial wave | 3 parallel on core load | No | Targeted refresh per mutation type |
| SportTournamentCommandCenter | `src/pages/SportTournamentCommandCenter.jsx` | 3 | 1 wave | All 3 parallel | No | Manual retry button only |
| SportAuctionHub | `src/pages/SportAuctionHub.jsx` | 4 | 1 wave | All 4 parallel | No | Full reload on socket `auction-state` |
| SportTournamentDirectory | `src/pages/SportTournamentDirectory.jsx` | 2 | 1 wave | Both parallel | No | None |

### Detailed Findings

#### 1.1 AuctionDirectory — N+1 API Pattern
**File:** `ipl-auction-tracker/src/pages/AuctionDirectory.jsx`

```js
// Wave 1: fetch festival list
const festivalsData = await api.get("/v2/festivals", { params });

// Wave 2: for EACH festival (N=10 default page size) → 2 calls
const stageResults = await Promise.allSettled(
  nextFestivals.map(async (festival) => {
    const [currentResult, readinessResult] = await Promise.allSettled([
      api.get(`/v2/festivals/${festival.id}/auction/current`),
      user?.role === 'admin'
        ? api.get(`/v2/festivals/${festival.id}/auction/readiness`)
        : Promise.resolve(...),
    ]);
  })
);
```

**Impact:** With pageSize=10: **21 HTTP requests** on a single page load (1 list + 20 per-festival). With admin role on every festival, all 20 are real requests. Each HTTP round trip to Render = ~100–200 ms from Vercel. Total wave 2 latency = max(per-festival) ≈ 200 ms, but TiDB fanout from 20 concurrent requests will create connection pressure. With cold Render instance: 30–60 s before any response.

**Severity:** HIGH — should be a single aggregated endpoint.

#### 1.2 FestivalCommandCenter Hook — Two-Phase N+1
**File:** `ipl-auction-tracker/src/hooks/useFestivalCommandCenterData.js`

```js
// Phase 1: 5 parallel — over-fetches ALL tournaments
const baseResults = await Promise.allSettled([
  api.get(`/v2/festivals/${festivalId}`),
  api.get(`/v2/festivals/${festivalId}/auction/readiness`),
  api.get(`/v2/festivals/${festivalId}/auction/current`),
  api.get(`/v2/festivals/${festivalId}/auction/history`),
  api.get("/v2/sport-tournaments"),  // Returns ALL tournaments, filtered client-side
]);

// Phase 2: Per active tournament — up to 3 calls each
const tournamentDetailResults = await Promise.allSettled(
  activeTournaments.map((t) =>
    Promise.allSettled([
      api.get(`/v2/sport-tournaments/${t.id}/readiness`),
      api.get(`/v2/sport-tournaments/${t.id}/auction/current`),
      api.get(`/v2/sport-tournaments/${t.id}/auction/history`),
    ])
  )
);
```

**Impact:** With M=5 active tournaments: **5 + 15 = 20 HTTP calls** on initial load of the command center. Phase 2 creates a mandatory sequential wave after Phase 1. Total wall-clock: 2× round-trip latency minimum ≈ 400 ms on warm instance, much worse on cold start.

**Severity:** HIGH

#### 1.3 FestivalDetail — Cascading useEffect Re-fetches
**File:** `ipl-auction-tracker/src/pages/FestivalDetail.jsx`

Three separate `useEffect` hooks each trigger API calls. The `loadRegistrationData` effect depends on `configurationView` and `activeStep` state, meaning every tab switch triggers a new API call:

```js
// Effect 1: loads workspace on festivalId change
useEffect(() => { loadWorkspace(); }, [festivalId]);

// Effect 2: refreshes readiness
useEffect(() => { refreshReadiness(); }, [festivalId, activeStep]);

// Effect 3: loads registration data — refires on EVERY tab change
useEffect(() => {
  loadRegistrationData();
}, [festivalId, configurationView, activeStep, registrationSearch]);
```

`invalidateFestivalSetup` (called after every mutation) triggers all 3 in parallel:
```js
const results = await Promise.allSettled([
  loadWorkspace(),
  loadRegistrationData(),
  refreshReadiness(),
]);
```

**Impact:** Tab switching (UX interaction) fires API calls. With 5 tabs: 5 × 1–3 calls = 5–15 fetches just from tab navigation. After each mutation: 3 API calls minimum. **Severity:** MEDIUM

---

## 2. MUTATION PERFORMANCE AUDIT

| Mutation | File | Endpoint | DB Ops in Transaction | Post-Mutation Refresh | Socket Broadcast |
|---|---|---|---|---|---|
| Place Festival Bid | `festivalLiveAuction.controller.js` → `placeFestivalAuctionBid` | POST `/v2/festivals/:id/auction/bid` | ~12 ops (see §3) | `publishFestivalAuctionState` (11–13 queries) | Full state to entire room |
| Place Sport Bid | `sportLiveAuction.controller.js` → `placeSportAuctionBid` | POST `/v2/sport-tournaments/:id/auction/bid` | ~13 ops (see §3) | `publishSportAuctionState` (10–12 queries) | Full state to entire room |
| Re-auction Participants (Festival) | `festivalLiveAuction.controller.js` → `reauctionFestivalParticipants` | POST `.../auction/reauction` | N × 2 sequential writes | `publishFestivalAuctionState` | Full state to room |
| Re-auction Participants (Sport) | `sportLiveAuction.controller.js` → `reauctionSportParticipants` | POST `.../auction/reauction` | N × 2 sequential writes | `publishSportAuctionState` | Full state to room |
| Assign Festival Team Owner | `festivalMainAuction.controller.js` → `assignFestivalTeamOwner` | POST `/v2/festivals/:id/teams/:teamId/owner` | 8+ sequential findOnes + calculateTeamBudgets | Email send + audit transaction + findByPk reload | None |
| Start Festival Participant | `festivalLiveAuction.controller.js` → `startFestivalAuctionParticipant` | POST `.../auction/start-participant` | 5 parallel + eligibility + budgets | `publishFestivalAuctionState` | Full state to room |
| Start Sport Participant | `sportLiveAuction.controller.js` → `startSportAuctionParticipant` | POST `.../auction/start-participant` | 5 parallel + eligibility + budgets | `publishSportAuctionState` | Full state to room |
| Close Festival Auction Round | `festivalLiveAuction.controller.js` → `closeFestivalAuction` | POST `.../auction/close` | Multiple sequential + calculateTeamBudgets | `publishFestivalAuctionState` | Full state to room |
| Invalidate Festival Setup | `FestivalDetail.jsx` → `invalidateFestivalSetup` | Client-side re-fetch orchestrator | N/A | 3 parallel API calls | None |

### Key Observations

#### 2.1 Every Mutation Triggers Full State Rebuild
**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

```js
// Called at the end of EVERY mutation handler:
async function publishFestivalAuctionState(io, festivalId) {
  const snapshot = await getFestivalAuctionSynchronizationSnapshot(festivalId);
  io.to(`festival-auction:${festivalId}`).emit("auction-state", snapshot);
}

// getFestivalAuctionSynchronizationSnapshot internally calls BOTH:
async function getFestivalAuctionSynchronizationSnapshot(festivalId) {
  return db.sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async (t) => {
    const [shared, history] = await Promise.all([
      loadFestivalAuctionSharedState(festivalId, t),  // 11-13 queries
      loadFestivalAuctionHistory(festivalId, t),       // unbounded findAll + includes
    ]);
    return buildSnapshot(shared, history);
  });
}
```

This means placing a single bid causes: ~12 transaction queries + ~12–15 post-transaction queries for the broadcast. Total: **24–27 DB queries per bid**.

#### 2.2 Re-auction N+1 Write Loop
**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

```js
// reauctionFestivalParticipants:
for (const entry of entries) {
  await entry.update({ state: 'available', attemptNumber: ... }, { transaction });
  await FestivalOperationAudit.create({ action: 'reauction', ... }, { transaction });
}
```

With 10 participants re-auctioned: **20 sequential DB writes** inside a transaction. Equivalent in Sport controller is identical. Should be `bulkUpdate` + single audit batch insert.

---

## 3. BID PLACEMENT TRACE

### Festival Bid — End-to-End

**Frontend:** `FestivalAuctionHub.jsx` (or Arena component) → `api.post('/v2/festivals/:festivalId/auction/bid', { amount })`

**Route:** `ipl-auction-tracker-backend/src/routes/festivalLiveAuction.routes.js`  
→ `POST /v2/festivals/:festivalId/auction/bid`  
→ `authMiddleware` (JWT verify + `User.findByPk` — 1 DB query)  
→ `festivalLiveAuctionController.placeFestivalAuctionBid`

**Controller:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

#### DB Query Trace Inside Transaction

```
Transaction START (REPEATABLE READ)
  Query 1:  FestivalAuctionConfig.findOne({ where: { festivalId } })          ← loadConfig
  Query 2:  FestivalAuction.findOne({ where: { festivalId, status: 'active' } }) ← loadCurrentAuction
  
  [findOwnerForUser — 3 SEQUENTIAL queries, no parallelism possible due to chaining]
  Query 3:  Employee.findOne({ where: { userId, employmentStatus: 'active' } })
  Query 4:  FestivalParticipant.findOne({ where: { festivalId, employeeId } })
  Query 5:  FestivalTeamOwner.findOne({ where: { festivalId, festivalParticipantId } })
  
  Query 6:  FestivalAuctionBid.findOne({ where: { festivalAuctionId }, order: [['amount','DESC']] })
            ← get highest bid
  
  [calculateTeamBudgets — 4 PARALLEL queries]
  Query 7:  FestivalTeam.findAll({ where: { festivalId } })
  Query 8:  FestivalTeamOwner.findAll({ where: { festivalId, status: 'active' } })
  Query 9:  FestivalRetention.findAll({ where: { festivalId } })
  Query 10: FestivalAuctionResult.findAll({ where: { festivalId, outcome: 'sold' } })
  
  Query 11: FestivalAuctionBid.create({ festivalAuctionId, ownerId, amount, ... })
  Query 12: FestivalAuctionBid.count({ where: { festivalAuctionId } })
  Query 13: FestivalAuction.update({ leadingBid: amount, bidCount: N }, { where: { id } })
Transaction COMMIT

[Post-transaction]
Query 14: FestivalAuctionBid.findByPk(newBid.id, { include: [owner, team] })
Query 15: FestivalAuctionConfig.findOne({ where: { festivalId } })  ← loadConfig AGAIN

[publishFestivalAuctionState — new REPEATABLE READ transaction]
Transaction START
  [loadFestivalAuctionSharedState — 5 parallel groups]
  Query 16: FestivalAuctionConfig.findOne                           ← loadConfig THIRD TIME
  Query 17: FestivalAuction.findOne({ where: { status: 'active' } })
  [5 parallel after config]:
  Query 18: getTeamSummaries → [4 parallel]:
    Query 18a: calculateTeamBudgets → [FestivalTeam, FestivalTeamOwner, FestivalRetention, FestivalAuctionResult]
    Query 18b: FestivalTeamOwner.findAll
    Query 18c: FestivalTeamMembership.findAll
    Query 18d: FestivalRetention.findAll
  Query 19: getPoolParticipants → FestivalAuctionPool.findAll (NO LIMIT, full include)
  Query 20: FestivalAuctionPool.findAll({ where: { state: 'unsold' } })
  Query 21: FestivalTeam.findAll
  Query 22: FestivalTeamMembership.findAll
  
  [loadFestivalAuctionHistory — parallel with above]
  Query 23: FestivalAuction.findAll({ include: [participant→employee+sports, bids→team+owner, result→team] })
            ← NO LIMIT — returns entire auction history for the festival
  Query 24: FestivalOperationAudit.findAll({ limit: 500 })
  Query 25: FestivalAuctionConfig.findOne                           ← loadConfig FOURTH TIME
Transaction COMMIT

[Socket emit]
io.to('festival-auction:${festivalId}').emit('auction-state', fullSnapshot)
← Payload: entire auction history + full shared state, sent to ALL connected clients
```

**Total DB queries for a single bid placement: ~25 (14 transaction + 11 broadcast)**  
**Total round trips to TiDB: ~25 sequential-or-parallel operations across 2 transactions**  
**Socket payload: entire history (unbounded) + full shared state**

#### Frontend Re-render Path

```
Socket 'auction-state' event
→ FestivalAuctionHub.jsx: setHistory(payload.history || [])
→ React re-renders component tree
→ useMemo: results, sold, unsold, bids (flatMap over ALL history), filteredRounds,
           activityEntries, highestSaleRound — ALL recompute
→ Child components re-render: LiveBidStream, QueueSummary, RecentResultsStrip,
                               TeamPanels, ParticipantStage
```

Every single bid placement causes every connected client to recompute all auction statistics.

---

## 4. BACKEND API PERFORMANCE AUDIT

### 4.1 loadFestivalAuctionHistory — Unbounded Query
**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

```js
const auctions = await FestivalAuction.findAll({
  where: { festivalId },
  // NO LIMIT
  include: [
    {
      model: FestivalParticipant,
      include: [
        { model: Employee, include: [{ model: SportAssignment, ... }] },
        { model: FestivalSport },
      ],
    },
    {
      model: FestivalAuctionBid,
      include: [{ model: FestivalTeam }, { model: FestivalTeamOwner, ... }],
      separate: true,  // good: avoids cartesian product
    },
    { model: FestivalAuctionResult, include: [{ model: FestivalTeam }] },
  ],
  order: [['attemptNumber', 'ASC']],
});
```

With 200 participants and 3 attempts each: 600 auction rows × nested includes = massive result set. No pagination, no cursor, no limit. This is loaded and broadcast over socket on **every single mutation**.

**Estimated latency:** TiDB query with 200+ rows and nested includes = 50–300 ms per call. Called twice on every mutation (once for history endpoint, once for socket broadcast).

### 4.2 calculateTeamBudgets — No Request-Scope Caching
**File:** `ipl-auction-tracker-backend/src/controllers/festivalMainAuction.controller.js`

```js
export async function calculateTeamBudgets(festivalId, transaction) {
  const [teams, owners, retentions, results] = await Promise.all([
    FestivalTeam.findAll({ where: { festivalId }, transaction }),
    FestivalTeamOwner.findAll({ where: { festivalId, status: 'active' }, transaction }),
    FestivalRetention.findAll({ where: { festivalId }, transaction }),
    FestivalAuctionResult.findAll({ where: { festivalId, outcome: 'sold' }, transaction }),
  ]);
  // pure computation from these 4 datasets
  return computeBudgets(teams, owners, retentions, results);
}
```

This function is called:
1. Inside `placeFestivalAuctionBid` transaction (bid validation)
2. Inside `loadFestivalAuctionSharedState` → `getTeamSummaries` (broadcast)
3. Inside `assignFestivalTeamOwner` (setup mutation)
4. Potentially more call sites

Within a single request lifecycle, the exact same 4 queries run 2+ times with identical inputs. No memoization, no request-scope cache. **Each invocation = 4 DB round trips to TiDB.**

### 4.3 findOwnerForUser — Sequential Waterfall
**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

```js
async function findOwnerForUser(userId, festivalId, transaction) {
  const employee = await Employee.findOne({
    where: { userId, employmentStatus: 'active' },
    transaction
  });
  if (!employee) return null;

  const participant = await FestivalParticipant.findOne({
    where: { festivalId, employeeId: employee.id, status: 'registered' },
    transaction
  });
  if (!participant) return null;

  return FestivalTeamOwner.findOne({
    where: { festivalId, festivalParticipantId: participant.id, status: 'active' },
    transaction
  });
}
```

Three inherently sequential DB round trips. Can be rewritten as a single JOIN query or parallel lookup with post-filter. Each TiDB round trip ≈ 10–30 ms; this alone adds 30–90 ms to every bid validation.

### 4.4 getSportTournamentEligibility — Expensive On Every Bid
**File:** `ipl-auction-tracker-backend/src/controllers/sportLiveAuction.controller.js`

Called inside `placeSportAuctionBid` transaction. This function computes eligibility for all participants by loading pool entries, team memberships, existing results, and retention data, then computing who is eligible per team per sport role. It is recalculated on **every single bid placement** even though eligibility state does not change mid-round.

**Estimated cost:** 3–5 DB queries + CPU computation. Called again immediately in `loadSportAuctionSharedState` for the broadcast. Total: ~6–10 extra queries per bid.

### 4.5 getPoolParticipants — No Limit
**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js`

```js
async function getPoolParticipants(festivalId, transaction) {
  return FestivalAuctionPool.findAll({
    where: { festivalId },
    // NO LIMIT
    include: [{
      model: FestivalParticipant,
      include: [
        { model: Employee },
        { model: FestivalSport },
      ],
    }],
    transaction,
  });
}
```

Returns the entire pool for the festival with full includes. For a festival with 300 participants: 300 rows × 3-level include. Called on every broadcast cycle.

### 4.6 loadFestivalAuctionSharedState — Chain Depth

```
loadFestivalAuctionSharedState
  ├── loadConfig (Query A)
  ├── loadCurrentAuction (Query B, sequential after A)
  └── Promise.all([
        getTeamSummaries (Query group C)
          ├── calculateTeamBudgets → Promise.all([Q1, Q2, Q3, Q4])
          ├── FestivalTeamOwner.findAll (Q5)
          ├── FestivalTeamMembership.findAll (Q6)
          └── FestivalRetention.findAll (Q7)
        getPoolParticipants (Query D — NO LIMIT)
        FestivalAuctionPool.findAll unsold (Query E)
        FestivalTeam.findAll (Query F)
        FestivalTeamMembership.findAll (Query G — DUPLICATE of Q6)
      ])
```

Chain depth: 3 levels. Queries Q6 and G are duplicates (FestivalTeamMembership loaded twice in the same call chain). Total: 13 DB queries per state load.

### 4.7 Socket Join Triggers Full State Rebuild
**File:** `ipl-auction-tracker-backend/src/index.js`

```js
socket.on('join-festival-auction', async ({ festivalId, token }) => {
  // Auth: 1 DB query (User.findByPk)
  const user = await User.findByPk(decoded.id);
  socket.join(`festival-auction:${festivalId}`);
  
  // Full state rebuild just for this joining socket:
  const snapshot = await getFestivalAuctionSynchronizationSnapshot(festivalId);
  socket.emit('auction-state', snapshot);  // sent only to joining socket
});
```

Every user who opens the auction page triggers 25 DB queries. With 50 users joining simultaneously: 50 × 25 = 1,250 DB queries. This is also performed for `join-sport-auction`.

### 4.8 Auth Middleware — DB Query Per Request
**File:** `ipl-auction-tracker-backend/src/index.js` / auth middleware

```js
// On every socket connection:
const user = await User.findByPk(decoded.id);
```

JWT contains all needed claims. The DB lookup on every socket connection is redundant — the JWT signature verification is sufficient for identity. For HTTP routes, the same pattern likely exists in the auth middleware.

---

## 5. DATABASE / INDEXES AUDIT

### Index Audit Table

| Table | Column(s) | Index Present | Query Pattern | Severity |
|---|---|---|---|---|
| `festival_participants` | `(festivalId, status)` | **NO** | `WHERE festivalId=? AND status='registered'` — used in `findOwnerForUser` on every bid | **HIGH** |
| `festival_auction_pools` | `(festivalId, state)` | **NO** | `WHERE festivalId=? AND state='available'` — used in `getPoolParticipants` filtered calls | **HIGH** |
| `festival_auction_results` | `(festivalId, outcome)` | **NO** | `WHERE festivalId=? AND outcome='sold'` — used in `calculateTeamBudgets` on every bid | **HIGH** |
| `sport_auction_bids` | `(sportAuctionId, createdAt)` | **NO** | `ORDER BY amount DESC, createdAt DESC` tiebreaker — missing createdAt index for sort | **MEDIUM** |
| `sport_auction_bids` | `(sportTournamentId, sportAuctionId)` | **NO** | Cross-tournament bid aggregation queries | **MEDIUM** |
| `festival_auction_bids` | `(festivalAuctionId, amount)` | YES (unique) | Highest bid lookup — covered | OK |
| `festival_auction_bids` | `(festivalAuctionId, createdAt)` | YES | History ordering — covered | OK |
| `festival_auctions` | `(festivalId, status)` | YES | Current auction lookup — covered | OK |
| `festival_auctions` | `(festivalId, festivalParticipantId, attemptNumber)` | YES (unique) | — | OK |
| `festival_participants` | `(festivalId, employeeId)` | YES (unique) | Uniqueness enforced | OK |
| `festival_participants` | `(employeeId, status)` | YES | Employee→participant lookup — covered | OK |
| `festival_team_memberships` | `(festivalId, festivalParticipantId)` | YES (unique) | — | OK |
| `festival_team_memberships` | `(festivalTeamId, festivalId)` | YES | Team membership queries — covered | OK |
| `festival_team_owners` | `(festivalId, festivalParticipantId)` | YES (unique) | — | OK |
| `festival_team_owners` | `(festivalId, status)` | YES | Active owner queries — covered | OK |
| `sport_auction_pools` | `(sportTournamentId, state)` | YES | Pool state filtering — covered | OK |
| `sport_team_budgets` | `(sportTournamentId, sportTeamId)` | YES (unique) | — | OK |
| `sport_tournaments` | `(festivalId, festivalTeamId, status)` | YES | Status filtering — covered | OK |

### Missing Index DDL (reference, not implemented)

```sql
-- HIGH: festivalParticipant.festivalId + status
ALTER TABLE festival_participants
  ADD INDEX idx_festival_participants_festival_status (festivalId, status);

-- HIGH: festivalAuctionPool.festivalId + state  
ALTER TABLE festival_auction_pools
  ADD INDEX idx_festival_auction_pools_festival_state (festivalId, state);

-- HIGH: festivalAuctionResult.festivalId + outcome
ALTER TABLE festival_auction_results
  ADD INDEX idx_festival_auction_results_festival_outcome (festivalId, outcome);

-- MEDIUM: sportAuctionBid sort tiebreaker
ALTER TABLE sport_auction_bids
  ADD INDEX idx_sport_auction_bids_auction_created (sportAuctionId, createdAt);
```

---

## 6. SOCKET PERFORMANCE AUDIT

### 6.1 Full State on Every Event

**File:** `ipl-auction-tracker-backend/src/controllers/festivalLiveAuction.controller.js` → `publishFestivalAuctionState`

Every mutation broadcasts the complete auction snapshot to the entire room. The snapshot contains:
- Full auction history for the festival (unbounded — all rounds, all bids)
- All team summaries with budget calculations
- Complete participant pool (all states)
- All memberships
- Operation audit log (last 500 entries)

**Estimated payload size:**
- Small festival (50 participants, 2 rounds): ~50–100 KB JSON
- Medium festival (200 participants, 10 rounds with 3 bids each): ~500 KB–1 MB JSON
- Large festival (400 participants, full auction): potentially **2–5 MB per broadcast**

This payload is emitted **to every connected client** after every bid. With 50 bidders in a room and 200 bids in a session: 50 × 200 × ~500 KB = **5 GB of total socket data transferred**.

### 6.2 No Delta / Incremental Updates

```js
// Current pattern (festivalLiveAuction.controller.js):
io.to(`festival-auction:${festivalId}`).emit("auction-state", fullSnapshot);

// What should happen (not implemented):
io.to(`festival-auction:${festivalId}`).emit("bid-placed", {
  revision: newRevision,
  bid: { id, amount, ownerId, teamId, timestamp },
  currentAuction: { leadingBid: amount, bidCount: N },
});
```

No delta mechanism exists. Every event is a full replacement broadcast.

### 6.3 Broadcast Scope Not Scoped to Active Participants

The room `festival-auction:${festivalId}` receives full state updates including private information. No fan-out segmentation: admin data (all team budgets, all owner details) goes to the same payload as participant data. With role-based data, different users need different payloads but receive the same one.

### 6.4 Socket Join — Full Snapshot Per Joining Client

**File:** `ipl-auction-tracker-backend/src/index.js`

```js
socket.on('join-festival-auction', async ({ festivalId }) => {
  const snapshot = await getFestivalAuctionSynchronizationSnapshot(festivalId);
  socket.emit('auction-state', snapshot);
});
```

This is the same 25-query operation as the broadcast, triggered per individual joining socket. No cached snapshot is used. If 30 users join within 10 seconds (e.g., organizer sends a "join now" signal), this generates 750 DB queries in 10 seconds, saturating TiDB Serverless connection limits.

### 6.5 Missing Revision Guard on Frontend

**File:** `ipl-auction-tracker/src/utils/auctionSynchronization.js`

```js
export const shouldApplyAuctionSnapshot = (lastRevision, payload) =>
  Number(payload?.revision || 0) > Number(lastRevision || 0);
```

The guard function exists but usage in `FestivalAuctionHub.jsx` bypasses it — the socket handler calls `setHistory(payload.history || [])` directly without checking `shouldApplyAuctionSnapshot`. Out-of-order socket events can cause stale state display.

```js
// FestivalAuctionHub.jsx current implementation:
socket.on("auction-state", (payload) => {
  setHistory(payload.history || []);  // No revision check!
  // ...
});
```

### 6.6 Sport Auction Hub — Double State Application

**File:** `ipl-auction-tracker/src/pages/SportAuctionHub.jsx`

```js
socket.on("auction-state", (payload) => {
  setAuction(mergeAuctionSnapshotState(auction, payload));  // revision-guarded
  setHistory(payload.history || []);                         // NOT revision-guarded
});
```

`mergeAuctionSnapshotState` correctly uses `shouldApplyAuctionSnapshot`, but `setHistory` is called unconditionally on every socket event regardless of revision order.

---

## 7. REACT PERFORMANCE AUDIT

### 7.1 FestivalAuctionHub — useMemo Chains Recompute on Every Socket Event

**File:** `ipl-auction-tracker/src/pages/FestivalAuctionHub.jsx`

```js
// history updates on EVERY socket 'auction-state' event
const [history, setHistory] = useState([]);

// All these useMemo hooks depend on history:
const results = useMemo(() =>
  history.flatMap(round => round.result ? [round.result] : []), [history]);

const sold = useMemo(() =>
  results.filter(r => r.outcome === 'sold'), [results]);

const unsold = useMemo(() =>
  results.filter(r => r.outcome !== 'sold'), [results]);

const bids = useMemo(() =>
  history.flatMap(round => round.bids || []), [history]);

const filteredRounds = useMemo(() =>
  history.filter(...filterLogic...), [history, activeFilter]);

const activityEntries = useMemo(() => [...], [history, currentRound]);

const highestSaleRound = useMemo(() =>
  results.reduce(...), [results]);
```

Every socket event replaces `history` with the full new array (referential change even if data is identical), causing **all 7+ useMemo hooks to recompute simultaneously**. On a medium festival with 200 auction rows, `bids = history.flatMap(...)` iterates thousands of objects on every bid from anyone.

**Impact:** On an active auction with 5 bids/minute and 50 clients: each client runs 7 expensive computations 5 times/minute = 35 computation cycles/minute/client.

### 7.2 SportAuctionHub — Multiple Reduce Operations on Socket Updates

**File:** `ipl-auction-tracker/src/pages/SportAuctionHub.jsx`

```js
// All recompute on every socket 'auction-state' event:
const teams = useMemo(() => [...auction?.teams || []].sort(...), [auction]);
const rounds = useMemo(() => history.filter(...), [history, ...]);
const soldRounds = useMemo(() => rounds.filter(...), [rounds]);
const unsoldRounds = useMemo(() => rounds.filter(...), [rounds]);
const totalSpent = useMemo(() => teams.reduce((s, t) => s + t.spent, 0), [teams]);
const highestSale = useMemo(() => rounds.reduce(...), [soldRounds]);
const lowestSale = useMemo(() => rounds.reduce(...), [soldRounds]);
const myBidCount = useMemo(() => 
  history.reduce((n, r) => n + (r.bids || []).filter(b => b.ownerId === viewer?.id).length, 0),
  [history, viewer]);
const activityEntries = useMemo(() => [...], [history, ...]);
```

8+ chained `useMemo` hooks, all invalidated by a single `history` or `auction` state change from socket. Same issue as FestivalAuctionHub.

### 7.3 FestivalDetail — Tab Switch Triggers API Call via useEffect Dependency

**File:** `ipl-auction-tracker/src/pages/FestivalDetail.jsx`

```js
const [configurationView, setConfigurationView] = useState("participants");

useEffect(() => {
  if (festivalId) {
    loadRegistrationData();
  }
}, [festivalId, configurationView, activeStep, registrationSearch]);
```

`configurationView` and `activeStep` are UI state variables (tab selection). Including them as useEffect dependencies means every tab switch fires `loadRegistrationData()`. This is an anti-pattern — data should be loaded once or lazily per tab (like `SportTournamentWorkspace` does correctly with the `loadedSections` ref).

### 7.4 FestivalCommandCenter — Client-Side Filter on Full Tournament List

**File:** `ipl-auction-tracker/src/hooks/useFestivalCommandCenterData.js`

```js
// Fetches ALL sport tournaments:
const tournamentsRes = await api.get("/v2/sport-tournaments");
const tournaments = tournamentsRes.data?.data || [];

// Filters client-side for this festival:
const festivalTournaments = tournaments.filter(t => t.festivalId === festivalId);
```

`GET /v2/sport-tournaments` returns all tournaments across all festivals. The filter is done client-side. As the platform grows, this fetches increasingly large payloads to discard most of the data.

### 7.5 useFestivalCommandCenterData — Socket Subscription Inside Hook with No Dependency Guard

If `useFestivalCommandCenterData` registers socket listeners inside a `useEffect` without proper cleanup, multiple listeners can accumulate across re-renders. Not confirmed from available code but is a common pattern risk given the two-phase loading logic.

### 7.6 Missing useCallback on Inline Event Handlers

In `FestivalDetail.jsx`, multiple inline functions are passed as props to child components:

```js
// Each render creates a new function reference:
onDelete={() => handleDeleteParticipant(p.id)}
onEdit={() => openEditModal(p)}
```

For a 300-participant table, this creates 600 new function objects on every render. Without `useCallback` or stable references, child components that do shallow comparison will always re-render even if the participant data didn't change.

---

## 8. NETWORK LATENCY AUDIT

### 8.1 Render Free Tier — Cold Start Problem

**Hosting:** Render free tier for the backend (`ipl-auction-tracker-backend`)

| Condition | Estimated Latency |
|---|---|
| Warm instance (last request < 15 min ago) | 50–150 ms per HTTP request |
| Cold start (instance spun down) | **30–60 seconds** before first response |
| Cold start + TiDB connection pool init | **30–75 seconds** |

**Impact on user experience:** Any user who opens the app after 15 minutes of inactivity waits up to 60 seconds before the first API response. The frontend shows loading spinners but gives no indication the backend is cold-starting.

**Affected pages:** All authenticated pages — every page makes at least one API call on mount.

**AuctionDirectory worst case:** Cold start (60 s) + wave 1 list fetch (200 ms) + wave 2 N×2 parallel fetches (200 ms) = **~60.4 seconds** to render the directory page.

### 8.2 TiDB Serverless — Connection and Query Latency

**Database:** TiDB Serverless (separate region from Render backend)

| Operation | Estimated Latency |
|---|---|
| Single indexed query (point lookup) | 5–20 ms |
| Single unindexed table scan (small table) | 20–100 ms |
| findAll with 3-level includes, 200+ rows | 100–500 ms |
| TiDB cold/serverless scale-from-zero | **5–30 seconds** additional |
| Cross-region round trip (backend → TiDB) | 20–80 ms per query depending on regions |

**Cross-region impact:** If Render backend is in US-East and TiDB Serverless is in another region (e.g., AWS Singapore or US-West), each DB round trip adds 20–150 ms of network latency. With 25 queries per bid: **500 ms–3.75 s in pure network latency for the DB tier alone**, before computation time.

**TiDB Serverless connection limits:** Free tier allows limited concurrent connections. The socket join pattern (one full-state rebuild per joining socket) can exhaust the connection pool during concurrent joins.

### 8.3 Vercel Frontend — Vercel to Render Latency

**Frontend hosting:** Vercel (edge-optimized CDN)  
**Backend hosting:** Render single region

API calls from browser → Vercel edge (near user) → Render origin (single region) add consistent 50–200 ms depending on user geography relative to Render region.

**With N+1 patterns:** AuctionDirectory with 10 festivals = 21 HTTP requests. Even at 100 ms each = 100 ms per wave, but wave 2 saturates the browser's parallel connection limit per origin (typically 6 concurrent HTTP/1.1 connections). With 20 parallel requests: requests queue in groups of 6 = **4 batches × 100 ms = ~400 ms** just for wave 2.

### 8.4 Latency Budget Per User Action

| User Action | Best Case (warm, indexed) | Worst Case (cold, unindexed) |
|---|---|---|
| Open AuctionDirectory (10 festivals) | ~500 ms | **60–90 seconds** |
| Open FestivalCommandCenter (5 tournaments) | ~800 ms | **65–120 seconds** |
| Place a festival bid | ~300–500 ms | **1–3 seconds** per bid |
| Socket broadcast (50 clients × 500 KB) | ~200 ms emit latency | **1–5 seconds** for large payloads |
| Join auction room (50 concurrent) | N/A (doesn't queue) | **10–30 seconds** DB saturation |
| Open FestivalDetail + switch tabs 3× | ~1.2 seconds | **4–8 seconds** |

---

## 9. TOP 20 PERFORMANCE ISSUES

| Rank | Severity | Issue | File / Function | Estimated Latency Cost | Estimated Improvement If Fixed |
|---|---|---|---|---|---|
| 1 | CRITICAL | Full auction history loaded and broadcast on EVERY mutation (unbounded findAll with 3-level includes) | `festivalLiveAuction.controller.js` → `loadFestivalAuctionHistory` | +100–500 ms per bid × all clients | 80–95% reduction in socket payload and DB query time if paginated/incremental |
| 2 | CRITICAL | Full state rebuild (25 DB queries) triggered on every bid placement | `festivalLiveAuction.controller.js` → `publishFestivalAuctionState` | +200–800 ms per bid for DB operations | 70% reduction with delta broadcast + snapshot cache |
| 3 | CRITICAL | Render free tier cold starts: 30–60 second delay after 15 min inactivity | Hosting configuration | 30–60 seconds first-load penalty | Eliminated with paid tier or keep-alive ping |
| 4 | HIGH | AuctionDirectory N+1: 2N+1 HTTP calls for N festivals (default 10 = 21 calls) | `AuctionDirectory.jsx` → initial load | +200–400 ms (warm) / +60 s (cold) | 95% reduction with single aggregated endpoint |
| 5 | HIGH | FestivalCommandCenter hook N+1: 5+3M calls for M active tournaments | `useFestivalCommandCenterData.js` → phase 2 | +400–800 ms extra wave (warm) | 85% reduction with festival-scoped aggregated endpoint |
| 6 | HIGH | findOwnerForUser: 3 sequential DB queries on every bid validation | `festivalLiveAuction.controller.js` → `findOwnerForUser` | +30–90 ms per bid (sequential TiDB round trips) | Reduced to 1 query with JOIN or eliminated with JWT claims cache |
| 7 | HIGH | calculateTeamBudgets: 4 DB queries, called 2+ times per request with no caching | `festivalMainAuction.controller.js` → `calculateTeamBudgets` | +20–80 ms × 2 invocations per bid = +40–160 ms | Eliminated with request-scope memoization |
| 8 | HIGH | Missing index on `festival_participants (festivalId, status)` — used on every bid | `festivalParticipant.model.js` | +5–50 ms per query (table scan vs index seek) | Near-instant with composite index |
| 9 | HIGH | Missing index on `festival_auction_results (festivalId, outcome)` — used in calculateTeamBudgets | `festivalAuctionResult.model.js` | +10–100 ms per calculateTeamBudgets call | Near-instant with composite index |
| 10 | HIGH | Missing index on `festival_auction_pools (festivalId, state)` — used in getPoolParticipants | `festivalAuctionPool.model.js` | +10–80 ms per state load | Near-instant with composite index |
| 11 | HIGH | Socket join triggers full 25-query state rebuild per connecting socket | `index.js` → `join-festival-auction` handler | +200–800 ms × concurrent joins | 90% reduction with in-memory snapshot cache (30 s TTL) |
| 12 | HIGH | Re-auction N+1 write loop: N × 2 sequential writes inside transaction | `festivalLiveAuction.controller.js` → `reauctionFestivalParticipants` | +10 ms per entry × N participants = +100–500 ms for 10–50 entries | 90% reduction with bulkUpdate + batch insert |
| 13 | MEDIUM | getSportTournamentEligibility recalculated on every sport bid placement | `sportLiveAuction.controller.js` → `placeSportAuctionBid` | +50–200 ms per bid (eligibility doesn't change mid-round) | Eliminated with round-scoped cache or pre-computed snapshot |
| 14 | MEDIUM | getPoolParticipants: no limit on FestivalAuctionPool.findAll with full includes | `festivalLiveAuction.controller.js` → `getPoolParticipants` | +50–300 ms on large festivals, grows over time | Fixed with server-side pagination; pool > 200 entries requires paging |
| 15 | MEDIUM | FestivalDetail tab switch fires loadRegistrationData API call via useEffect dependency | `FestivalDetail.jsx` → useEffect on `configurationView` | +200–600 ms per tab switch | Eliminated with `loadedSections` ref pattern (like SportTournamentWorkspace) |
| 16 | MEDIUM | FestivalCommandCenter: GET /v2/sport-tournaments fetches ALL tournaments (over-fetch, client-side filter) | `useFestivalCommandCenterData.js` | Grows with platform scale; current +50–200 ms | Fixed with `?festivalId=` query param on the endpoint |
| 17 | MEDIUM | useMemo chains (7+ hooks) recompute on every socket event in FestivalAuctionHub and SportAuctionHub | `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` | +5–50 ms client-side CPU per bid × all clients | Reduced with stable socket state diffing and selective invalidation |
| 18 | MEDIUM | Missing index on `sport_auction_bids (sportAuctionId, createdAt)` for sort tiebreaker | `sportAuctionBid.model.js` | +5–30 ms on sort operations | Near-instant with composite index |
| 19 | LOW | Auth middleware DB query (User.findByPk) on every socket connection | `index.js` → socket auth middleware | +5–20 ms per connection (redundant — JWT is self-verifying) | Eliminated with JWT-only verification |
| 20 | LOW | FestivalAuctionHub + SportAuctionHub skip revision check on setHistory | `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` → socket handler | Potential stale renders from out-of-order events | Correct with existing `shouldApplyAuctionSnapshot` utility |

---

## 10. IMPLEMENTATION ROADMAP

### Phase A — Under 1 Day (Zero Risk, High Impact)

These changes require no architectural changes and carry minimal regression risk.

| Task | File(s) | Change | Expected Impact |
|---|---|---|---|
| A1: Add 3 missing DB indexes | `festivalParticipant.model.js`, `festivalAuctionPool.model.js`, `festivalAuctionResult.model.js` | Add composite indexes via Sequelize `indexes` array or migration | -50–150 ms per bid on unindexed queries |
| A2: Add sportAuctionBid sort index | `sportAuctionBid.model.js` | Add `(sportAuctionId, createdAt)` index | -5–30 ms per highest bid lookup |
| A3: Fix revision guard on setHistory | `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` | Wrap `setHistory` call with `shouldApplyAuctionSnapshot` check | Prevents stale renders on out-of-order socket events |
| A4: Memoize calculateTeamBudgets within request | `festivalMainAuction.controller.js` | Add request-scope Map cache keyed on `festivalId`, invalidated after transaction commit | -20–80 ms per bid (eliminates duplicate 4-query call) |
| A5: Remove redundant loadConfig calls in placeFestivalAuctionBid | `festivalLiveAuction.controller.js` | Pass config from transaction into post-transaction handlers instead of re-querying | -1 DB query per bid |
| A6: Remove redundant User.findByPk on socket auth | `index.js` | Verify JWT signature only; read claims from payload | -5–20 ms per socket connection |
| A7: Add `?festivalId=` filter to sport-tournaments endpoint | `sportTournament.routes.js` + controller | Add optional query param; filter in WHERE clause | Fixes over-fetch in useFestivalCommandCenterData; scales with data growth |

### Phase B — 1 to 3 Days (Moderate Risk, Very High Impact)

| Task | File(s) | Change | Expected Impact |
|---|---|---|---|
| B1: Rewrite findOwnerForUser as single JOIN query | `festivalLiveAuction.controller.js` | Replace 3 sequential findOnes with Sequelize literal JOIN: `Employee → FestivalParticipant → FestivalTeamOwner` in one query | -20–60 ms per bid |
| B2: Re-auction bulk write | `festivalLiveAuction.controller.js`, `sportLiveAuction.controller.js` → `reauction*` handlers | Replace for-loop sequential awaits with `Model.bulkCreate`/`Model.update` + single audit batch insert | -80–450 ms for 10–50 participant batches |
| B3: FestivalDetail tab lazy-load (port from SportTournamentWorkspace) | `FestivalDetail.jsx` | Introduce `loadedSections` ref; only call `loadRegistrationData` on first tab visit, not on every tab switch | -200–600 ms per subsequent tab switch |
| B4: AuctionDirectory aggregated endpoint | New route + controller function | Add `GET /v2/festivals/directory` that returns festival list with embedded `auctionCurrent` and `auctionReadiness` per entry in one DB query with joins | Reduces 21 HTTP calls to 1; -400–1,000 ms total load |
| B5: Add in-memory snapshot cache for socket join | `index.js` + cache utility | Cache the last `getFestivalAuctionSynchronizationSnapshot` result per festivalId with 30 s TTL; serve joining sockets from cache | -200–800 ms per socket join; prevents DB saturation on mass join |
| B6: Add keep-alive ping for Render free tier | New scheduled request or frontend polling | Simple `GET /health` from frontend every 10 minutes to prevent instance spin-down | Eliminates 30–60 s cold start for active users |
| B7: Paginate loadFestivalAuctionHistory | `festivalLiveAuction.controller.js` → `loadFestivalAuctionHistory` | Add `limit: 50, order: [['attemptNumber', 'DESC']]`; return latest rounds first | -100–500 ms per broadcast; payload reduction from MB to KB |

### Phase C — 3+ Days (High Risk, Architectural Change)

| Task | File(s) | Change | Expected Impact |
|---|---|---|---|
| C1: Delta socket broadcasts | `festivalLiveAuction.controller.js`, `sportLiveAuction.controller.js`, `FestivalAuctionHub.jsx`, `SportAuctionHub.jsx` | Replace full state emit with typed delta events (`bid-placed`, `round-closed`, `participant-started`); clients apply incremental updates to local state | 80–95% reduction in socket data volume; eliminates 10–13 post-bid DB queries |
| C2: Snapshot cache for broadcast | New `AuctionStateCache` service | Maintain in-memory snapshot updated incrementally on each mutation; broadcast from cache, not from DB rebuild | Eliminates `publishFestivalAuctionState` 11–13 query cycle entirely |
| C3: FestivalCommandCenter aggregated endpoint | New `GET /v2/festivals/:festivalId/command-center` route | Return festival + all tournament summaries in one response, computed server-side | Reduces 5+3M calls to 1; eliminates phase 2 waterfall |
| C4: Eligibility pre-computation cache | `sportLiveAuction.controller.js` → `getSportTournamentEligibility` | Compute eligibility once at round start; invalidate only on team change, not on every bid | -50–200 ms per sport bid; significant at scale |
| C5: Request-scope DataLoader for repeated queries | New middleware/util | Introduce DataLoader (or equivalent) pattern to de-duplicate identical queries within a single request lifecycle | Eliminates duplicate FestivalTeamMembership, calculateTeamBudgets loads across call chains |
| C6: Upgrade from Render free tier | Hosting configuration | Move to Render Starter ($7/month) or equivalent to eliminate cold starts | Eliminates 30–60 s cold start entirely |

---

## APPENDIX: Call Chain Reference

### placeFestivalAuctionBid — Full Call Chain

```
POST /v2/festivals/:festivalId/auction/bid
└── authMiddleware → User.findByPk (Q0)
└── placeFestivalAuctionBid
    ├── db.transaction (REPEATABLE READ)
    │   ├── loadConfig → FestivalAuctionConfig.findOne (Q1)
    │   ├── loadCurrentAuction → FestivalAuction.findOne (Q2)
    │   ├── findOwnerForUser
    │   │   ├── Employee.findOne (Q3)
    │   │   ├── FestivalParticipant.findOne (Q4)
    │   │   └── FestivalTeamOwner.findOne (Q5)
    │   ├── FestivalAuctionBid.findOne (highest bid) (Q6)
    │   ├── calculateTeamBudgets (Q7–Q10, parallel)
    │   ├── FestivalAuctionBid.create (Q11)
    │   ├── FestivalAuctionBid.count (Q12)
    │   └── FestivalAuction.update (Q13)
    ├── FestivalAuctionBid.findByPk (Q14)
    ├── loadConfig again (Q15)
    └── publishFestivalAuctionState
        └── getFestivalAuctionSynchronizationSnapshot
            └── db.transaction (REPEATABLE READ)
                ├── loadFestivalAuctionSharedState (Q16–Q22)
                │   ├── loadConfig (Q16)
                │   ├── FestivalAuction.findOne (Q17)
                │   ├── getTeamSummaries (Q18a–Q18d, parallel)
                │   │   ├── calculateTeamBudgets (Q18a–Q18d)
                │   │   ├── FestivalTeamOwner.findAll (Q18e)
                │   │   ├── FestivalTeamMembership.findAll (Q18f)
                │   │   └── FestivalRetention.findAll (Q18g)
                │   ├── getPoolParticipants (Q19, NO LIMIT)
                │   ├── FestivalAuctionPool.findAll unsold (Q20)
                │   ├── FestivalTeam.findAll (Q21)
                │   └── FestivalTeamMembership.findAll (Q22, DUPLICATE of Q18f)
                └── loadFestivalAuctionHistory (Q23–Q25, parallel with above)
                    ├── FestivalAuction.findAll (Q23, NO LIMIT, 3-level includes)
                    ├── FestivalOperationAudit.findAll limit:500 (Q24)
                    └── FestivalAuctionConfig.findOne (Q25, 4th time this request)
```

**Total: ~25 DB queries per bid placement (Q0 through Q25)**

---

*End of audit. No code was modified. All findings are based on static analysis of the codebase as of 2026-06-19.*
