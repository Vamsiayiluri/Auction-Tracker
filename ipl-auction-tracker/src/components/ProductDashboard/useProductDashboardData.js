import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import {
  cachedRequest,
  getCachedValue,
  refreshCachedRequest,
  setCachedValue,
  stableCacheKey,
  userCacheScope,
} from "../../utils/clientCache";

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

const idsParam = (items) =>
  items.map(({ id }) => id).filter(Boolean).join(",");

const sortByDateDescending = (left, right) =>
  new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime();

const toMap = (items, key) =>
  new Map((items || []).map((item) => [item[key], item]));

const DASHBOARD_TTL_MS = 45_000;
const emptyDashboardData = {
  festivals: [],
  ownerContexts: [],
  tournaments: [],
  tournamentDetails: [],
  festivalStates: [],
  sportStates: [],
  recentOutcomes: [],
};

export default function useProductDashboardData(user) {
  const [data, setData] = useState(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const load = useCallback(async ({ force = false, background = false } = {}) => {
    const scope = userCacheScope(user);
    const dashboardKey = stableCacheKey("dashboard", scope);
    const cachedDashboard = !force ? getCachedValue(dashboardKey) : null;
    if (cachedDashboard) {
      setData(cachedDashboard.data);
      setWarnings(cachedDashboard.warnings || []);
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
        ? refreshCachedRequest(key, fetcher, { ttlMs: DASHBOARD_TTL_MS })
        : cachedRequest(key, fetcher, { ttlMs: DASHBOARD_TTL_MS });

    const baseResults = await Promise.allSettled([
      read(stableCacheKey("GET", scope, "/v2/festivals"), () =>
        api.get("/v2/festivals")
      ),
      read(stableCacheKey("GET", scope, "/v2/sport-tournaments"), () =>
        api.get("/v2/sport-tournaments")
      ),
      user.role === "team_owner"
        ? read(stableCacheKey("GET", scope, "/v2/sport-tournaments/owner-contexts"), () =>
            api.get("/v2/sport-tournaments/owner-contexts")
          )
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

    const ownerFestivalIds = new Set(
      ownerContexts.map(({ festivalId }) => festivalId)
    );
    const visibleFestivals =
      user.role === "team_owner"
        ? festivals.filter(({ id }) => ownerFestivalIds.has(id))
        : festivals;
    const visibleSportTournaments = tournaments.filter(
      (tournament) =>
        historySportStatuses.has(tournament.status) ||
        Boolean(tournament.permissions?.canBid) ||
        Boolean(tournament.permissions?.canManage) ||
        user.role === "admin"
    );

    const [festivalSummaryResult, sportSummaryResult] =
      await Promise.allSettled([
        visibleFestivals.length
          ? read(
              stableCacheKey("GET", scope, "/v2/festivals/auction/summaries", {
                ids: idsParam(visibleFestivals),
                includeReadiness: user.role === "admin",
                includeOutcomes: true,
              }),
              () =>
                api.get("/v2/festivals/auction/summaries", {
                  params: {
                    ids: idsParam(visibleFestivals),
                    includeReadiness: user.role === "admin",
                    includeOutcomes: true,
                  },
                })
            )
          : Promise.resolve({ data: { data: [] } }),
        visibleSportTournaments.length
          ? read(
              stableCacheKey("GET", scope, "/v2/sport-tournaments/auction/summaries", {
                ids: idsParam(visibleSportTournaments),
                includeReadiness:
                  user.role === "admin" || user.role === "team_owner",
                includeOutcomes: true,
                currentStatuses: [...activeSportStatuses].join(","),
              }),
              () =>
                api.get("/v2/sport-tournaments/auction/summaries", {
                  params: {
                    ids: idsParam(visibleSportTournaments),
                    includeReadiness:
                      user.role === "admin" || user.role === "team_owner",
                    includeOutcomes: true,
                    currentStatuses: [...activeSportStatuses].join(","),
                  },
                })
            )
          : Promise.resolve({ data: { data: [] } }),
      ]);

    if (festivalSummaryResult.status === "rejected") {
      nextWarnings.push("Festival Auction state is temporarily unavailable.");
    }
    if (sportSummaryResult.status === "rejected") {
      nextWarnings.push("Sport Auction state is temporarily unavailable.");
    }

    const festivalSummaryById = toMap(
      fulfilledData(festivalSummaryResult, []),
      "festivalId"
    );
    const sportSummaryById = toMap(
      fulfilledData(sportSummaryResult, []),
      "sportTournamentId"
    );

    const festivalStates = visibleFestivals.map((festival) => {
      const summary = festivalSummaryById.get(festival.id) || {};
      return {
        festival,
        current: summary.current || null,
        readiness: summary.readiness || null,
        history: [],
        recentOutcomes: summary.recentOutcomes || [],
      };
    });
    const sportStates = visibleSportTournaments.map((tournament) => {
      const summary = sportSummaryById.get(tournament.id) || {};
      return {
        tournament,
        current: summary.current || null,
        readiness: summary.readiness || null,
        history: [],
        recentOutcomes: summary.recentOutcomes || [],
      };
    });

    const festivalOutcomes = festivalStates.flatMap(
      ({ festival, recentOutcomes }) =>
        (recentOutcomes || []).map((outcome) => ({
          id: `festival:${outcome.id}`,
          ...outcome,
          context: festival.name,
          route: `/festivals/${festival.id}/results`,
        }))
    );
    const sportOutcomes = sportStates.flatMap(
      ({ tournament, recentOutcomes }) =>
        (recentOutcomes || []).map((outcome) => ({
          id: `sport:${outcome.id}`,
          ...outcome,
          context: tournament.name,
          route: `/sport-tournaments/${tournament.id}/results`,
        }))
    );

    const nextData = {
      festivals,
      ownerContexts,
      tournaments,
      tournamentDetails: tournaments,
      festivalStates,
      sportStates,
      recentOutcomes: [...festivalOutcomes, ...sportOutcomes]
        .sort(sortByDateDescending)
        .slice(0, 8),
    };
    setCachedValue(dashboardKey, { data: nextData, warnings: nextWarnings }, DASHBOARD_TTL_MS);
    setData(nextData);
    setWarnings(nextWarnings);
    if (!background) setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => load({ force: true }), [load]);

  return useMemo(
    () => ({
      ...data,
      loading,
      error,
      warnings,
      reload,
      activeAuctionStatuses,
      activeSportStatuses,
    }),
    [data, error, loading, reload, warnings]
  );
}
