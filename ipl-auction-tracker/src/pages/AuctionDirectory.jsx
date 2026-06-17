import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";
import {
  AUCTION_STAGE,
  getFestivalAuctionStageFromState,
  getSportAuctionStage,
  getStageLabel,
  shouldShowInAuctionDirectory,
} from "../utils/auctionStages";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";

const getFestivalActions = (festival, stage) => {
  if (stage === AUCTION_STAGE.SETUP) {
    return {
      primaryLabel: "Continue Setup",
      primaryRoute: `/festivals/${festival.id}/manage`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/festivals/${festival.id}/auction-hub`,
    };
  }
  if (stage === AUCTION_STAGE.READY) {
    return {
      primaryLabel: "View Auction Details",
      primaryRoute: `/festivals/${festival.id}/auction-hub`,
      secondaryLabel: "Open Live Auction",
      secondaryRoute: `/auctions/festivals/${festival.id}`,
    };
  }
  if (stage === AUCTION_STAGE.LIVE) {
    return {
      primaryLabel: "Open Live Auction",
      primaryRoute: `/auctions/festivals/${festival.id}`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/festivals/${festival.id}/auction-hub`,
    };
  }
  return {
    primaryLabel: "View Results",
    primaryRoute: `/festivals/${festival.id}/results`,
    secondaryLabel: "View Auction Details",
    secondaryRoute: `/festivals/${festival.id}/auction-hub`,
  };
};

const getSportActions = (tournament, stage) => {
  if (stage === AUCTION_STAGE.SETUP) {
    return {
      primaryLabel: "Continue Setup",
      primaryRoute: `/sport-tournaments/${tournament.id}/manage`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/sport-tournaments/${tournament.id}/auction-hub`,
    };
  }
  if (stage === AUCTION_STAGE.READY) {
    return {
      primaryLabel: "View Auction Details",
      primaryRoute: `/sport-tournaments/${tournament.id}/auction-hub`,
      secondaryLabel: "Open Live Auction",
      secondaryRoute: `/auctions/sports/${tournament.id}`,
    };
  }
  if (stage === AUCTION_STAGE.LIVE) {
    return {
      primaryLabel: "Open Live Auction",
      primaryRoute: `/auctions/sports/${tournament.id}`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/sport-tournaments/${tournament.id}/auction-hub`,
    };
  }
  return {
    primaryLabel: "View Results",
    primaryRoute: `/sport-tournaments/${tournament.id}/results`,
    secondaryLabel: "View Auction Details",
    secondaryRoute: `/sport-tournaments/${tournament.id}/auction-hub`,
  };
};

export default function AuctionDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const selectedType = ["festival", "sport"].includes(requestedType)
    ? requestedType
    : "all";
  const [festivals, setFestivals] = useState([]);
  const [festivalStageData, setFestivalStageData] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const loadAuctions = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const [festivalResult, tournamentResult] = await Promise.allSettled([
      api.get("/v2/festivals"),
      api.get("/v2/sport-tournaments"),
    ]);

    const nextErrors = [];
    let nextFestivals = [];
    if (festivalResult.status === "fulfilled") {
      nextFestivals = festivalResult.value.data.data || [];
      setFestivals(nextFestivals);
    } else {
      nextErrors.push("Festival Auctions could not be loaded.");
    }
    if (tournamentResult.status === "fulfilled") {
      setTournaments(tournamentResult.value.data.data || []);
    } else {
      nextErrors.push("Sport Auctions could not be loaded.");
    }

    if (nextFestivals.length) {
      const stageResults = await Promise.allSettled(
        nextFestivals.map(async (festival) => {
          const [currentResult, readinessResult] = await Promise.allSettled([
            api.get(`/v2/festivals/${festival.id}/auction/current`),
            user?.role === "admin"
              ? api.get(`/v2/festivals/${festival.id}/auction/readiness`)
              : Promise.resolve({ data: { data: null } }),
          ]);
          return {
            festivalId: festival.id,
            auction:
              currentResult.status === "fulfilled"
                ? currentResult.value.data.data
                : null,
            readiness:
              readinessResult.status === "fulfilled"
                ? readinessResult.value.data.data
                : null,
          };
        }),
      );
      setFestivalStageData(
        Object.fromEntries(
          stageResults
            .filter(({ status }) => status === "fulfilled")
            .map(({ value }) => [value.festivalId, value]),
        ),
      );
    } else {
      setFestivalStageData({});
    }

    setErrors(nextErrors);
    setLoading(false);
  }, [user?.role]);

  useEffect(() => {
    void loadAuctions();
  }, [loadAuctions]);

  const entries = useMemo(() => {
    const festivalEntries = festivals
      .map((festival) => {
        const stageData = festivalStageData[festival.id] || {};
        const stage = getFestivalAuctionStageFromState({
          festival,
          auction: stageData.auction,
          readiness: stageData.readiness,
        });
        const actions = getFestivalActions(festival, stage);
        return {
          id: `festival:${festival.id}`,
          type: "festival",
          title: festival.name,
          context: `${festival.code} | ${festival.startDate} to ${festival.endDate}`,
          status: festival.status,
          stage,
          ...actions,
        };
      })
      .filter(({ stage }) => shouldShowInAuctionDirectory(stage));
    const sportEntries = tournaments
      .map((tournament) => {
        const stage = getSportAuctionStage({ status: tournament.status });
        const actions = getSportActions(tournament, stage);
        return {
          id: `sport:${tournament.id}`,
          type: "sport",
          title: tournament.name,
          context: `${tournament.festival?.name || "Festival"} | ${
            tournament.festivalTeam?.name || "Festival Team"
          } | ${tournament.sport?.name || "Sport"}`,
          status: tournament.status,
          stage,
          ...actions,
        };
      })
      .filter(({ stage }) => shouldShowInAuctionDirectory(stage));

    return [...festivalEntries, ...sportEntries].filter(
      ({ type }) => selectedType === "all" || type === selectedType,
    );
  }, [festivalStageData, festivals, selectedType, tournaments]);

  const changeType = (_, value) => {
    if (!value) return;
    setSearchParams(value === "all" ? {} : { type: value });
  };

  if (loading) {
    return (
      <LoadingStateCard
        title="Loading Auctions"
        message="Finding setup, ready, live, and completed auctions."
      />
    );
  }

  const emptyMessage = (() => {
    if (entries.length) return null;
    const totalEntries = festivals.length + tournaments.length;
    if (totalEntries === 0) {
      return "No Festival or Sport Auctions have been created yet. Ask your administrator to create a Festival or Sport Tournament.";
    }
    const allFestivalStages = festivals.map((festival) => {
      const stageData = festivalStageData[festival.id] || {};
      return getFestivalAuctionStageFromState({
        festival,
        auction: stageData.auction,
        readiness: stageData.readiness,
      });
    });
    const allSportStages = tournaments.map((t) =>
      getSportAuctionStage({ status: t.status })
    );
    const allInSetup = [...allFestivalStages, ...allSportStages].every(
      (s) => s === AUCTION_STAGE.SETUP
    );
    if (allInSetup) {
      return "Auctions exist but are still in setup. They will appear here once setup is complete and the auction is ready or live.";
    }
    if (selectedType !== "all") {
      return `No ${selectedType === "festival" ? "Festival" : "Sport"} Auctions match this filter. Try switching to "All Auctions".`;
    }
    return "No auctions are currently visible. Check back once an auction is ready or live.";
  })();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Auctions</Typography>
        <Typography color="text.secondary">
          Find setup, ready, live, and completed Festival and Sport auctions.
        </Typography>
      </Box>

      {errors.map((message) => (
        <Alert
          key={message}
          severity="warning"
          action={<Button onClick={loadAuctions}>Retry</Button>}
        >
          {message}
        </Alert>
      ))}

      <Card variant="outlined">
        <Tabs
          value={selectedType}
          onChange={changeType}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Auction type filter"
        >
          <Tab value="all" label="All Auctions" />
          <Tab value="festival" label="Festival Auctions" />
          <Tab value="sport" label="Sport Auctions" />
        </Tabs>
      </Card>

      {emptyMessage ? (
        <Alert severity="info">{emptyMessage}</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {entries.map((entry) => (
            <Card key={entry.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="overline" color="primary.main">
                      {entry.type === "festival"
                        ? "Festival Auction"
                        : "Sport Auction"}
                    </Typography>
                    <Typography variant="h6">{entry.title}</Typography>
                  </Box>
                  <Chip size="small" label={getStageLabel(entry.stage)} />
                </Stack>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ my: 2 }}
                >
                  {entry.context}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    onClick={() => navigate(entry.primaryRoute)}
                    sx={{ minHeight: 44 }}
                  >
                    {entry.primaryLabel}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(entry.secondaryRoute)}
                    sx={{ minHeight: 44 }}
                  >
                    {entry.secondaryLabel}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}
