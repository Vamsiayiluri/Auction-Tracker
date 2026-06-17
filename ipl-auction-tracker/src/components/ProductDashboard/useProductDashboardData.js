import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

const activeAuctionStatuses = new Set(["live", "paused"]);
const activeSportStatuses = new Set(["auction_live", "auction_paused"]);
const historySportStatuses = new Set([
  "auction_live",
  "auction_paused",
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
]);

const fulfilledData = (result, fallback = null) =>
  result.status === "fulfilled" ? result.value.data.data ?? fallback : fallback;

const sortByDateDescending = (left, right) =>
  new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime();

export default function useProductDashboardData(user) {
  const [data, setData] = useState({
    festivals: [],
    ownerContexts: [],
    tournaments: [],
    tournamentDetails: [],
    festivalStates: [],
    sportStates: [],
    recentOutcomes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setWarnings([]);

    const baseResults = await Promise.allSettled([
      api.get("/v2/festivals"),
      api.get("/v2/sport-tournaments"),
      user.role === "team_owner"
        ? api.get("/v2/sport-tournaments/owner-contexts")
        : Promise.resolve({ data: { data: [] } }),
    ]);

    const festivals = fulfilledData(baseResults[0], []);
    const tournaments = fulfilledData(baseResults[1], []);
    const ownerContexts = fulfilledData(baseResults[2], []);

    if (
      baseResults[0].status === "rejected" &&
      baseResults[1].status === "rejected"
    ) {
      setError("Dashboard data could not be loaded. Refresh to try again.");
      setLoading(false);
      return;
    }
    const nextWarnings = [];
    if (baseResults[0].status === "rejected") {
      nextWarnings.push("Festival dashboard data is temporarily unavailable.");
    }
    if (baseResults[1].status === "rejected") {
      nextWarnings.push(
        "Sport Tournament dashboard data is temporarily unavailable."
      );
    }
    if (baseResults[2].status === "rejected") {
      nextWarnings.push("Owner assignment context could not be loaded.");
    }

    const detailResults = await Promise.allSettled(
      tournaments.map((tournament) =>
        api.get(`/v2/sport-tournaments/${tournament.id}`)
      )
    );
    const tournamentDetails = detailResults
      .map((result) => fulfilledData(result))
      .filter(Boolean);
    if (detailResults.some(({ status }) => status === "rejected")) {
      nextWarnings.push("Some Sport Tournament details could not be loaded.");
    }

    const ownerFestivalIds = new Set(
      ownerContexts.map(({ festivalId }) => festivalId)
    );
    const visibleFestivals =
      user.role === "team_owner"
        ? festivals.filter(({ id }) => ownerFestivalIds.has(id))
        : festivals;

    const festivalStateResults = await Promise.allSettled(
      visibleFestivals.map(async (festival) => {
        const [currentResult, readinessResult, historyResult] =
          await Promise.allSettled([
            api.get(`/v2/festivals/${festival.id}/auction/current`),
            user.role === "admin"
              ? api.get(`/v2/festivals/${festival.id}/auction/readiness`)
              : Promise.resolve({ data: { data: null } }),
            api.get(`/v2/festivals/${festival.id}/auction/history`),
          ]);
        return {
          festival,
          current: fulfilledData(currentResult),
          readiness: fulfilledData(readinessResult),
          history: fulfilledData(historyResult, []),
        };
      })
    );
    const festivalStates = festivalStateResults
      .filter(({ status }) => status === "fulfilled")
      .map(({ value }) => value);

    const sportStateResults = await Promise.allSettled(
      tournamentDetails.map(async (tournament) => {
        const shouldLoadAuction =
          historySportStatuses.has(tournament.status) ||
          tournament.permissions?.canBid;
        const [currentResult, readinessResult, historyResult] =
          await Promise.allSettled([
            shouldLoadAuction
              ? api.get(
                  `/v2/sport-tournaments/${tournament.id}/auction/current`
                )
              : Promise.resolve({ data: { data: null } }),
            user.role === "admin" || tournament.permissions?.canManage
              ? api.get(`/v2/sport-tournaments/${tournament.id}/readiness`)
              : Promise.resolve({ data: { data: null } }),
            historySportStatuses.has(tournament.status)
              ? api.get(
                  `/v2/sport-tournaments/${tournament.id}/auction/history`
                )
              : Promise.resolve({ data: { data: [] } }),
          ]);
        return {
          tournament,
          current: fulfilledData(currentResult),
          readiness: fulfilledData(readinessResult),
          history: fulfilledData(historyResult, []),
        };
      })
    );
    const sportStates = sportStateResults
      .filter(({ status }) => status === "fulfilled")
      .map(({ value }) => value);

    const festivalOutcomes = festivalStates.flatMap(({ festival, history }) =>
      (history || [])
        .filter(({ result }) => result)
        .map((round) => ({
          id: `festival:${round.id}`,
          type: "Festival Auction",
          title:
            round.participant?.employee?.name ||
            round.participant?.name ||
            "Participant",
          context: festival.name,
          outcome: round.result.outcome,
          teamName: round.result.teamName,
          value: round.result.finalAmount,
          unit: festival.currencyCode || "INR",
          date: round.result.finalizedAt || round.finalizedAt,
          route: `/festivals/${festival.id}/results`,
        }))
    );
    const sportOutcomes = sportStates.flatMap(({ tournament, history }) =>
      (history || [])
        .filter(({ result }) => result)
        .map((round) => ({
          id: `sport:${round.id}`,
          type: "Sport Auction",
          title:
            round.participant?.employee?.name ||
            round.participant?.name ||
            "Participant",
          context: tournament.name,
          outcome: round.result.outcome,
          teamName: round.result.teamName,
          value: round.result.finalCredits,
          unit: "credits",
          date: round.result.finalizedAt || round.finalizedAt,
          route: `/sport-tournaments/${tournament.id}/results`,
        }))
    );

    setData({
      festivals,
      ownerContexts,
      tournaments,
      tournamentDetails,
      festivalStates,
      sportStates,
      recentOutcomes: [...festivalOutcomes, ...sportOutcomes]
        .sort(sortByDateDescending)
        .slice(0, 8),
    });
    setWarnings(nextWarnings);
    setLoading(false);
  }, [user.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      warnings,
      reload: load,
      activeAuctionStatuses,
      activeSportStatuses,
    }),
    [data, error, load, loading, warnings]
  );
}
