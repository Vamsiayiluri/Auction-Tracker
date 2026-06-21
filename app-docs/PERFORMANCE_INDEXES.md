# Performance Indexes

All indexes below are added by `ipl-auction-tracker-backend/migrations/202606190001-performance-phase-a-indexes.js`.
The migration is idempotent: it checks table, column, and existing index definitions before adding indexes.

| Table | Index | Query it optimizes | Expected impact |
|---|---|---|---|
| `FestivalParticipants` | `festival_participants_festival_status_idx` on `(festivalId, status)` | Festival bid owner validation, setup pool generation, readiness checks, and registered participant lists filtered by festival and status. | Avoids scans when resolving registered participants during bid validation and setup flows. |
| `FestivalAuctionResults` | `festival_auction_results_festival_outcome_idx` on `(festivalId, outcome)` | `calculateTeamBudgets()` and sold-result checks using `{ festivalId, outcome: "sold" }`. | Reduces repeated budget calculation and budget lock checks from table scans to indexed lookups. |
| `FestivalAuctionPools` | `festival_auction_pools_festival_state_idx` on `(festivalId, state)` | Auction pool/current state reads using `{ festivalId, state }`, including available/unsold lists. | Improves Auction Directory, Command Center, and live auction state rebuild reads over pool entries. |
| `SportAuctionBids` | `sport_auction_bids_auction_created_idx` on `(sportAuctionId, createdAt)` | Sport bid history ordering and bid tiebreaker reads within a round. | Speeds ordered bid reads for sport auction state and history payloads. |

Existing relevant indexes preserved:

| Table | Existing index | Covered query pattern |
|---|---|---|
| `FestivalAuctionBids` | `festival_auction_bids_auction_amount_uq` on `(festivalAuctionId, amount)` | Highest festival bid lookup and duplicate bid amount guard. |
| `FestivalAuctionBids` | `festival_auction_bids_auction_created_idx` on `(festivalAuctionId, createdAt)` | Festival bid history ordering. |
| `FestivalAuctionResults` | `festival_auction_results_festival_participant_uq` on `(festivalId, festivalParticipantId)` | Sold/unsold lookup for a participant in a festival. |
| `FestivalAuctionPools` | `festival_auction_pools_festival_participant_uq` on `(festivalId, festivalParticipantId)` | Pool uniqueness and participant pool lookup. |
| `SportAuctionPools` | `sport_auction_pools_tournament_state_idx` on `(sportTournamentId, state)` | Sport pool state reads. |
| `SportAuctionResults` | `sport_auction_results_auction_uq` on `(sportAuctionId)` | One result per sport auction round. |

