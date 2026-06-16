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

    const baseResults = await Promise.allSettled([
      api.get(`/v2/festivals/${festivalId}`),
      api.get(`/v2/festivals/${festivalId}/auction/readiness`),
      api.get(`/v2/festivals/${festivalId}/auction/current`),
      api.get(`/v2/festivals/${festivalId}/auction/history`),
      api.get("/v2/sport-tournaments"),
    ]);

    const festival = fulfilledData(baseResults[0]);
    if (!festival) {
      setError("Unable to load the Festival Command Center.");
      setLoading(false);
      return;
    }

    const tournamentSummaries = fulfilledData(baseResults[4], []).filter(
      (tournament) => tournament.festivalId === festivalId
    );
    const detailResults = await Promise.allSettled(
      tournamentSummaries.map((tournament) =>
        api.get(`/v2/sport-tournaments/${tournament.id}`)
      )
    );
    const tournamentDetails = detailResults
      .map((result, index) => fulfilledData(result, tournamentSummaries[index]))
      .filter(Boolean);

    const tournamentStateResults = await Promise.allSettled(
      tournamentDetails.map(async (tournament) => {
        const [readinessResult, auctionResult, historyResult] =
          await Promise.allSettled([
            tournament.permissions?.canManage
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
      nextWarnings.push("Festival readiness could not be loaded.");
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
