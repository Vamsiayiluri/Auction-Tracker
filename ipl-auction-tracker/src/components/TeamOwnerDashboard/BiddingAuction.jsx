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
import MyTeam from "./MyTeam";
import BidHistory from "./BidHistory";
import LiveAuction from "./LiveAuction";
import TeamsOverview from "../AdminDashboardLayout/TeamsOverview";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/bidUtils";

const BiddingAuction = () => {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState(0);
  const [tournament, setTournament] = useState(null);
  const [summary, setSummary] = useState({ teams: 0, players: 0 });
  const [loadingTournament, setLoadingTournament] = useState(Boolean(tournamentId));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTournament = async () => {
      if (!tournamentId) {
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
      } catch {
        if (active) setError("Unable to load this tournament room.");
      } finally {
        if (active) setLoadingTournament(false);
      }
    };

    loadTournament();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loadingTournament) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!tournamentId) {
    return (
      <Alert severity="info">
        Select a tournament from your dashboard to view live bidding, squads,
        and history for that auction.
      </Alert>
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
                    Tournament room
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
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Live Auction" />
          <Tab label="My Team" />
          <Tab label="Teams" />
          <Tab label="Bid History" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <LiveAuction userRole="team_owner" />}
        {activeTab === 1 && <MyTeam tournamentId={tournamentId} />}
        {activeTab === 2 && <TeamsOverview tournamentId={tournamentId} />}
        {activeTab === 3 && <BidHistory tournamentId={tournamentId} />}
      </Box>
    </Box>
  );
};

export default BiddingAuction;
