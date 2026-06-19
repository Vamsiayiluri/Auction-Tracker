import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import {
  cachedRequest,
  getCachedValue,
  refreshCachedRequest,
  setCachedValue,
  stableCacheKey,
} from "../utils/clientCache";

const auctionVisibleStatuses = new Set([
  "auction_live",
  "auction_paused",
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
]);

const fulfilledData = (result, fallback = null) =>
  result.status === "fulfilled" ? result.value.data.data ?? fallback : fallback;

const idsParam = (items) =>
  items.map(({ id }) => id).filter(Boolean).join(",");

const toMap = (items, key) =>
  new Map((items || []).map((item) => [item[key], item]));

const COMMAND_CENTER_TTL_MS = 45_000;

export default function useFestivalCommandCenterData(festivalId) {
  const [state, setState] = useState({
    festival: null,
    festivalReadiness: null,
    festivalAuction: null,
    festivalHistory: [],
    sportTournaments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const load = useCallback(async ({ force = false, background = false } = {}) => {
    const commandCenterKey = stableCacheKey("festival-command-center", festivalId);
    const cachedState = !force ? getCachedValue(commandCenterKey) : null;
    if (cachedState) {
      setState(cachedState.state);
      setWarnings(cachedState.warnings || []);
      setError("");
      setLoading(false);
      void load({ force: true, background: true });
      return;
    }

    if (!background) {
      setLoading(true);
      setError("");
      setWarnings([]);
    }

    const read = (key, fetcher) =>
      force
        ? refreshCachedRequest(key, fetcher, { ttlMs: COMMAND_CENTER_TTL_MS })
        : cachedRequest(key, fetcher, { ttlMs: COMMAND_CENTER_TTL_MS });

    const baseResults = await Promise.allSettled([
      read(stableCacheKey("GET", `/v2/festivals/${festivalId}`), () =>
        api.get(`/v2/festivals/${festivalId}`)
      ),
      read(stableCacheKey("GET", "/v2/sport-tournaments", { festivalId }), () =>
        api.get("/v2/sport-tournaments", { params: { festivalId } })
      ),
      read(
        stableCacheKey("GET", "/v2/festivals/auction/summaries", {
          ids: festivalId,
          includeReadiness: true,
          includeOutcomes: true,
        }),
        () =>
          api.get("/v2/festivals/auction/summaries", {
            params: {
              ids: festivalId,
              includeReadiness: true,
              includeOutcomes: true,
            },
          })
      ),
    ]);

    const festival = fulfilledData(baseResults[0]);
    if (!festival) {
      setError("We could not load the Festival overview. Try again.");
      setLoading(false);
      return;
    }

    const tournamentSummaries = fulfilledData(baseResults[1], []).filter(
      (tournament) => tournament.festivalId === festivalId
    );
    const visibleTournamentSummaries = tournamentSummaries.filter(
      (tournament) =>
        auctionVisibleStatuses.has(tournament.status) ||
        Boolean(tournament.permissions?.canManage)
    );
    const sportSummaryResult = visibleTournamentSummaries.length
      ? await Promise.allSettled([
          read(
            stableCacheKey("GET", "/v2/sport-tournaments/auction/summaries", {
              ids: idsParam(visibleTournamentSummaries),
              includeReadiness: true,
              includeOutcomes: true,
              currentStatuses: "auction_live,auction_paused",
            }),
            () =>
              api.get("/v2/sport-tournaments/auction/summaries", {
                params: {
                  ids: idsParam(visibleTournamentSummaries),
                  includeReadiness: true,
                  includeOutcomes: true,
                  currentStatuses: "auction_live,auction_paused",
                },
              })
          ),
        ]).then(([result]) => result)
      : { status: "fulfilled", value: { data: { data: [] } } };

    const nextWarnings = [];
    if (baseResults[1].status === "rejected") {
      nextWarnings.push("Sport Tournaments could not be loaded.");
    }
    if (baseResults[2].status === "rejected") {
      nextWarnings.push("Festival Auction status could not be loaded.");
    }
    if (sportSummaryResult.status === "rejected") {
      nextWarnings.push("Some Sport Tournament status details are unavailable.");
    }

    const festivalSummary = fulfilledData(baseResults[2], [])[0] || {};
    const sportSummaryById = toMap(
      fulfilledData(sportSummaryResult, []),
      "sportTournamentId"
    );
    const sportTournaments = tournamentSummaries.map((tournament) => {
      const summary = sportSummaryById.get(tournament.id) || {};
      return {
        ...tournament,
        readiness: summary.readiness || null,
        auction: summary.current || null,
        history: [],
        recentOutcomes: summary.recentOutcomes || [],
      };
    });

    const nextState = {
      festival,
      festivalReadiness: festivalSummary.readiness || null,
      festivalAuction: festivalSummary.current || null,
      festivalHistory: (festivalSummary.recentOutcomes || []).map((outcome) => ({
        id: outcome.id,
        result: {
          outcome: outcome.outcome,
          teamName: outcome.teamName,
          finalAmount: outcome.value,
          finalizedAt: outcome.date,
        },
        participant: { name: outcome.title },
        finalizedAt: outcome.date,
      })),
      sportTournaments,
    };

    setState(nextState);
    setWarnings(nextWarnings);
    setCachedValue(
      commandCenterKey,
      { state: nextState, warnings: nextWarnings },
      COMMAND_CENTER_TTL_MS
    );
    if (!background) setLoading(false);
  }, [festivalId]);

  const reload = useCallback(() => load({ force: true }), [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      loading,
      error,
      warnings,
      reload,
    }),
    [error, loading, reload, state, warnings]
  );
}
