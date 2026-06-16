import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";

export default function AuctionDirectory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const selectedType = ["festival", "sport"].includes(requestedType)
    ? requestedType
    : "all";
  const [festivals, setFestivals] = useState([]);
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
    if (festivalResult.status === "fulfilled") {
      setFestivals(festivalResult.value.data.data || []);
    } else {
      nextErrors.push("Festival Auctions could not be loaded.");
    }
    if (tournamentResult.status === "fulfilled") {
      setTournaments(tournamentResult.value.data.data || []);
    } else {
      nextErrors.push("Sport Auctions could not be loaded.");
    }
    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAuctions();
  }, [loadAuctions]);

  const entries = useMemo(() => {
    const festivalEntries = festivals.map((festival) => ({
      id: `festival:${festival.id}`,
      type: "festival",
      title: festival.name,
      context: `${festival.code} | ${festival.startDate} to ${festival.endDate}`,
      status: festival.status,
      actionLabel: "View Auction Details",
      route: `/festivals/${festival.id}/auction-hub`,
      arenaRoute: `/auctions/festivals/${festival.id}`,
    }));
    const sportEntries = tournaments.map((tournament) => ({
        id: `sport:${tournament.id}`,
        type: "sport",
        title: tournament.name,
        context: `${tournament.festival?.name || "Festival"} | ${
          tournament.festivalTeam?.name || "Festival Team"
        } | ${tournament.sport?.name || "Sport"}`,
        status: tournament.status,
        actionLabel: "View Auction Details",
        route: `/sport-tournaments/${tournament.id}/auction-hub`,
        arenaRoute: `/auctions/sports/${tournament.id}`,
      }));

    return [...festivalEntries, ...sportEntries].filter(
      ({ type }) => selectedType === "all" || type === selectedType
    );
  }, [festivals, selectedType, tournaments]);

  const changeType = (_, value) => {
    if (!value) return;
    setSearchParams(value === "all" ? {} : { type: value });
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <CircularProgress size={36} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Auctions</Typography>
        <Typography color="text.secondary">
          Find live auctions, upcoming auctions, and completed auction details.
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

      {!entries.length ? (
        <Alert severity="info">
          No auctions match this view yet. Check back after a Festival or Sport Tournament is set up.
        </Alert>
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
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="overline" color="primary.main">
                      {entry.type === "festival"
                        ? "Festival Auction"
                        : "Sport Auction"}
                    </Typography>
                    <Typography variant="h6">{entry.title}</Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={entry.status.replaceAll("_", " ")}
                  />
                </Stack>
                <Typography color="text.secondary" variant="body2" sx={{ my: 2 }}>
                  {entry.context}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    onClick={() => navigate(entry.route)}
                    sx={{ minHeight: 44 }}
                  >
                    {entry.actionLabel}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(entry.arenaRoute)}
                    sx={{ minHeight: 44 }}
                  >
                    Open Live Auction
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
