import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import api from "../utils/api";

export default function SportTournamentCommandCenter() {
  const { sportTournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [tournamentResult, readinessResult, auctionResult] = await Promise.allSettled([
      api.get(`/v2/sport-tournaments/${sportTournamentId}`),
      api.get(`/v2/sport-tournaments/${sportTournamentId}/readiness`),
      api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/current`),
    ]);

    if (tournamentResult.status === "fulfilled") {
      setTournament(tournamentResult.value.data.data);
    } else {
      setError(
        tournamentResult.reason?.response?.data?.message
          || "Unable to load the Sport Tournament.",
      );
    }
    if (readinessResult.status === "fulfilled") {
      setReadiness(readinessResult.value.data.data);
    }
    if (auctionResult.status === "fulfilled") {
      setAuction(auctionResult.value.data.data);
    }
    setLoading(false);
  }, [sportTournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const blockers = readiness?.blockers || [];
  const canManage = Boolean(tournament?.permissions?.canManage);
  const primaryAction = useMemo(() => {
    if (["auction_live", "auction_paused", "pending_finalization"].includes(auction?.status)) {
      return {
        label: "Open Live Sport Auction",
        route: `/auctions/sports/${sportTournamentId}`,
      };
    }
    if (readiness?.ready) {
      return {
        label: "View Auction Details",
        route: `/sport-tournaments/${sportTournamentId}/auction-hub`,
      };
    }
    if (!canManage) {
      return {
        label: "View Auction Details",
        route: `/sport-tournaments/${sportTournamentId}/auction-hub`,
      };
    }
    return {
      label: "Resolve Setup",
      route: `/sport-tournaments/${sportTournamentId}/manage`,
    };
  }, [auction?.status, canManage, readiness?.ready, sportTournamentId]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", minHeight: 320, placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tournament) {
    return <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" fontWeight={800}>{tournament.name}</Typography>
                <Chip label={String(tournament.status).replaceAll("_", " ")} />
                <Chip
                  color={readiness?.ready ? "success" : "warning"}
                  variant="outlined"
                  label={readiness?.ready ? "Ready" : `${blockers.length} setup issue(s)`}
                />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Tournament status, setup issues, and the next action.
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate(primaryAction.route)}>
              {primaryAction.label}
            </Button>
          </Stack>
          <Box sx={{ mt: 1.5 }}>
            <AuctionContextNavigation
              commandCenter={`/sport-tournaments/${sportTournamentId}`}
              management={canManage ? `/sport-tournaments/${sportTournamentId}/manage` : null}
              hub={`/sport-tournaments/${sportTournamentId}/auction-hub`}
              arena={`/auctions/sports/${sportTournamentId}`}
              results={`/sport-tournaments/${sportTournamentId}/results`}
            />
          </Box>
        </CardContent>
      </Card>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" }, gap: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Setup Issues</Typography>
            {!canManage ? (
              <Alert severity="info">
                Use Auction Details for teams, player assignments, bid history, statistics, and results.
              </Alert>
            ) : blockers.length ? (
              <Stack spacing={1}>
                {blockers.slice(0, 6).map((blocker, index) => (
                  <Alert key={blocker.code || blocker.message || index} severity="warning">
                    {blocker.message || blocker.label || blocker.code || "Tournament setup requires attention."}
                  </Alert>
                ))}
              </Stack>
            ) : (
              <Alert severity="success">No setup blockers are currently reported.</Alert>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Stack spacing={1}>
              {canManage ? (
                <Button variant="outlined" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/manage`)}>
                  Tournament Management
                </Button>
              ) : null}
              <Button variant="outlined" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)}>
                Auction Details
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/auctions/sports/${sportTournamentId}`)}>
                Open Live Auction
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/results`)}>
                View Results
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
