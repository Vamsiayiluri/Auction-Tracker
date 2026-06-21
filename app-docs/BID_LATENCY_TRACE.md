# Bid Latency Trace

## Scope

Urgent demo fix focused only on bid placement latency.

No UI changes, no API response shape changes, no business rule changes, and no socket contract changes were made.

## What Was Instrumented

Development logs now emit `[bid-latency]` entries for both Festival and Sport bid placement. The logger follows the existing performance instrumentation rule and is silent when `NODE_ENV === "production"`.

### Bid Handler Log

Logged before the HTTP response is returned:

```js
{
  scopeType: "festival" | "sport",
  festivalId: "...",              // Festival only
  sportTournamentId: "...",       // Sport only
  endpoint: "Place Bid",
  validationMs,
  dbMs,
  socketSerializationMs,
  socketPayloadBytes,
  socketBroadcastMs,
  publishAuctionStateMs: "deferred",
  httpResponseMs
}
```

### Full Snapshot Publish Log

Logged asynchronously when the existing `auction-state` publish completes:

```js
{
  scopeType: "festival" | "sport",
  scopeId,
  phase: "publishAuctionState",
  publishAuctionStateMs,
  snapshotMs,
  serializationMs,
  payloadBytes,
  broadcastMs
}
```

## Festival Trace

### Before

Blocking bid path:

1. Validate bidder, active auction, current bid, and budget.
2. Write bid, count bids, update timer.
3. Reload bid with team/owner include.
4. Emit small `bid-placed` and `auction-timer-updated` events.
5. Await full `publishFestivalAuctionState()`.
6. Return HTTP response.

Estimated blocking latency when full snapshot is slow:

| Phase | Before |
|---|---:|
| validation ms | 200-800 ms |
| DB ms | 80-300 ms |
| publishAuctionState ms | 1000-4000+ ms |
| socket broadcast ms | Included in publish |
| HTTP response | ~1500-5000 ms |

### After

Blocking bid path:

1. Validate bidder, active auction, current bid, and budget.
2. Write bid, count bids, update timer.
3. Reuse created bid fields and owner team already loaded in validation.
4. Emit existing small `bid-placed` and `auction-timer-updated` events.
5. Return HTTP response.
6. Publish existing full `auction-state` asynchronously.

Expected blocking latency:

| Phase | After |
|---|---:|
| validation ms | logged as `validationMs` |
| DB ms | logged as `dbMs` |
| publishAuctionState ms | no longer blocks HTTP; actual async value logged separately |
| socket broadcast ms | logged as `socketBroadcastMs` for small events |
| HTTP response | target under 1.5 s |

Safe optimization applied:

- Removed post-transaction `FestivalAuctionBid.findByPk(...include...)`.
- Included `FestivalTeam` in existing owner lookup so `teamName` is already available.
- Kept existing `bid-placed`, `auction-timer-updated`, and `auction-state` socket events.
- Deferred only the expensive full `auction-state` snapshot publish.

## Sport Trace

### Before

Blocking bid path:

1. Validate tournament, captain, eligibility, current round, current bid, and budget.
2. Write bid, count bids, update timer.
3. Reload bid with team include.
4. Emit small `sport-bid-placed` event.
5. Await full `publishSportAuctionState()`.
6. Return HTTP response.

Estimated blocking latency when full snapshot is slow:

| Phase | Before |
|---|---:|
| validation ms | 300-1200 ms |
| DB ms | 80-300 ms |
| publishAuctionState ms | 1000-4000+ ms |
| socket broadcast ms | Included in publish |
| HTTP response | ~1600-5000 ms |

### After

Blocking bid path:

1. Validate tournament, captain, eligibility, current round, current bid, and budget.
2. Write bid, count bids, update timer.
3. Reuse created bid fields and captain team already loaded in validation.
4. Emit existing small `sport-bid-placed` event.
5. Return HTTP response.
6. Publish existing full `auction-state` asynchronously.

Expected blocking latency:

| Phase | After |
|---|---:|
| validation ms | logged as `validationMs` |
| DB ms | logged as `dbMs` |
| publishAuctionState ms | no longer blocks HTTP; actual async value logged separately |
| socket broadcast ms | logged as `socketBroadcastMs` for small event |
| HTTP response | target under 1.5 s |

Safe optimization applied:

- Removed post-transaction `SportAuctionBid.findByPk(...include...)`.
- Reused `captain.team?.name` already loaded by `findActiveSportCaptainForUser()`.
- Kept existing `sport-bid-placed` and `auction-state` socket events.
- Deferred only the expensive full `auction-state` snapshot publish.

## Why This Should Fix The Demo Blocker

The 5 second delay is most likely dominated by the awaited full snapshot rebuild and socket serialization after the bid has already been accepted. This change keeps the authoritative snapshot broadcast but moves it out of the HTTP response critical path.

The user-visible bid action now returns after:

- validation
- bid write
- timer update
- small bid socket event emit

It no longer waits for:

- full pool reload
- full team summary reload
- full history reload
- full JSON snapshot serialization
- full `auction-state` broadcast

## Remaining Non-Blocking Work

The full `auction-state` publish can still be slow, but it no longer blocks the bid API response. Its actual cost will appear in the async `[bid-latency]` log with:

- `publishAuctionStateMs`
- `snapshotMs`
- `serializationMs`
- `payloadBytes`
- `broadcastMs`

If the async publish still causes visible client jank, the next fix should reduce snapshot payload size. That was not implemented here because delta socket architecture was explicitly out of scope.
