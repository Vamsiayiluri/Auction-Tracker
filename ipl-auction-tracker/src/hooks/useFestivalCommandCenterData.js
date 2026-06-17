import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setWarnings([]);

    // ── Phase 1: festival core data + global tournament list (parallel) ──────
    //
    // NOTE (H-02 / PERFORMANCE_AUDIT.md): `GET /v2/sport-tournaments` returns
    // ALL tournaments visible to this user, regardless of which festival is
    // being viewed. The response is filtered client-side by `festivalId`.
    //
    // API improvement required to eliminate this over-fetch:
    //   Option A: Add query parameter support →
    //             GET /v2/sport-tournaments?festivalId=:festivalId
    //   Option B: Expose a sub-resource →
    //             GET /v2/festivals/:festivalId/sport-tournaments
    //
    // Until the API supports one of these, the client fetches the full list
    // and discards tournaments that belong to other festivals. For installations
    // with many festivals and tournaments this is significant wasted bandwidth.
    const baseResults = await Promise.allSettled([
      api.get(`/v2/festivals/${festivalId}`),
      api.get(`/v2/festivals/${festivalId}/auction/readiness`),
      api.get(`/v2/festivals/${festivalId}/auction/current`),
      api.get(`/v2/festivals/${festivalId}/auction/history`),
      api.get("/v2/sport-tournaments"),
    ]);

    const festival = fulfilledData(baseResults[0]);
    if (!festival) {
      setError("We could not load the Festival overview. Try again.");
      setLoading(false);
      return;
    }

    // Use summaries filtered by festivalId directly — no N+1 detail fetch.
    //
    // NOTE (C-02 / PERFORMANCE_AUDIT.md): The previous implementation fetched
    // GET /v2/sport-tournaments/:id for every tournament in this festival
    // (N+1 pattern), then used those detail objects to gate the per-tournament
    // state fetches below. Tournament summaries already contain `status` and
    // (depending on API version) `permissions`, which is all that is needed
    // to determine which state endpoints to call.
    //
    // If `permissions.canManage` is absent from the summary, the readiness
    // fetch is skipped for that tournament. This is an acceptable degradation
    // until the API includes permissions in list responses (same mitigation
    // as the Dashboard hook — see useProductDashboardData.js C-01 note).
    const tournamentSummaries = fulfilledData(baseResults[4], []).filter(
      (tournament) => tournament.festivalId === festivalId
    );

    // ── Phase 2: per-tournament state fetches (using summaries) ─────────────
    const tournamentStateResults = await Promise.allSettled(
      tournamentSummaries.map(async (tournament) => {
        const [readinessResult, auctionResult, historyResult] =
          await Promise.allSettled([
            Boolean(tournament.permissions?.canManage)
              ? api.get(`/v2/sport-tournaments/${tournament.id}/readiness`)
              : Promise.resolve({ data: { data: null } }),
            auctionVisibleStatuses.has(tournament.status)
              ? api.get(
                  `/v2/sport-tournaments/${tournament.id}/auction/current`
                )
              : Promise.resolve({ data: { data: null } }),
            auctionVisibleStatuses.has(tournament.status)
              ? api.get(
                  `/v2/sport-tournaments/${tournament.id}/auction/history`
                )
              : Promise.resolve({ data: { data: [] } }),
          ]);
        return {
          ...tournament,
          readiness: fulfilledData(readinessResult),
          auction: fulfilledData(auctionResult),
          history: fulfilledData(historyResult, []),
        };
      })
    );

    const nextWarnings = [];
    if (baseResults[1].status === "rejected") {
      nextWarnings.push("Festival setup status could not be loaded.");
    }
    if (baseResults[2].status === "rejected") {
      nextWarnings.push("Festival Auction status could not be loaded.");
    }
    if (baseResults[3].status === "rejected") {
      nextWarnings.push("Festival Auction history could not be loaded.");
    }
    if (baseResults[4].status === "rejected") {
      nextWarnings.push("Sport Tournaments could not be loaded.");
    }
    if (tournamentStateResults.some(({ status }) => status === "rejected")) {
      nextWarnings.push("Some Sport Tournament status details are unavailable.");
    }

    setState({
      festival,
      festivalReadiness: fulfilledData(baseResults[1]),
      festivalAuction: fulfilledData(baseResults[2]),
      festivalHistory: fulfilledData(baseResults[3], []),
      sportTournaments: tournamentStateResults
        .filter(({ status }) => status === "fulfilled")
        .map(({ value }) => value),
    });
    setWarnings(nextWarnings);
    setLoading(false);
  }, [festivalId]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      loading,
      error,
      warnings,
      reload: load,
    }),
    [error, load, loading, state, warnings]
  );
}
