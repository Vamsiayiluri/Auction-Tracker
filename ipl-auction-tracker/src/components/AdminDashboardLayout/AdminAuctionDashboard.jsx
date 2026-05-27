import { useEffect, useState } from "react";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import AuctionLive from "./AuctionLive";
import TeamsOverview from "./TeamsOverview";
import BidHistory from "../TeamOwnerDashboard/BidHistory";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/bidUtils";

const AdminDashboardLayout = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("id");
  const [tabIndex, setTabIndex] = useState(0);
  const [tournament, setTournament] = useState(null);
  const [summary, setSummary] = useState({ teams: 0, players: 0 });
  const [loadingTournament, setLoadingTournament] = useState(Boolean(tournamentId));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTournament = async () => {
      if (!tournamentId) {
        setTournament(null);
        setLoadingTournament(false);
        return;
      }

      setLoadingTournament(true);
      setError("");

      try {
        const [tournamentResponse, teamsResponse, playersResponse] =
          await Promise.all([
            api.get(`/tournament/${tournamentId}`),
            api.get(`/teams?tournamentId=${tournamentId}`),
            api.get(`/players?tournamentId=${tournamentId}`),
          ]);

        if (!active) return;
        setTournament(tournamentResponse.data);
        setSummary({
          teams: teamsResponse.data?.length || 0,
          players: playersResponse.data?.length || 0,
        });
        if (tournamentResponse.data?.status === "completed") {
          setTabIndex(2);
        }
      } catch {
        if (active) setError("Unable to load this tournament.");
      } finally {
        if (active) setLoadingTournament(false);
      }
    };

    loadTournament();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const handleTabChange = (_, newIndex) => {
    setTabIndex(newIndex);
  };

  if (loadingTournament) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {tournament && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GavelRoundedIcon color="primary" />
                  <Typography variant="overline" color="primary.main">
                    Admin tournament room
                  </Typography>
                </Stack>
                <Typography variant="h5">{tournament.name}</Typography>
                <Typography color="text.secondary">
                  Budget {formatCurrency(tournament.budget)} · {summary.teams} teams ·{" "}
                  {summary.players} players
                </Typography>
              </Stack>
              <Chip
                label={tournament.status}
                color={tournament.status === "live" ? "error" : "success"}
                variant={tournament.status === "live" ? "filled" : "outlined"}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Paper variant="outlined" sx={{ px: { xs: 1, sm: 2 } }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Live Auction" />
          <Tab label="Teams" />
          <Tab label="Bid History" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {tabIndex === 0 && <AuctionLive />}
        {tabIndex === 1 && <TeamsOverview tournamentId={tournamentId} />}
        {tabIndex === 2 && <BidHistory tournamentId={tournamentId} />}
      </Box>
    </Box>
  );
};

export default AdminDashboardLayout;
