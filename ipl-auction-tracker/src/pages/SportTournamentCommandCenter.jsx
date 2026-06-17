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
import {
  getSportAuctionStageFromState,
  AUCTION_STAGE,
  isSetupStage,
} from "../utils/auctionStages";
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
  const canBid = Boolean(auction?.viewer?.canBid);
  const stage = getSportAuctionStageFromState({ tournament, readiness, auction });
  const primaryAction = useMemo(() => {
    if (stage === AUCTION_STAGE.COMPLETED) {
      return {
        label: "View Results",
        route: `/sport-tournaments/${sportTournamentId}/results`,
      };
    }
    if (stage === AUCTION_STAGE.LIVE) {
      return {
        label: "Open Live Sport Auction",
        route: `/auctions/sports/${sportTournamentId}`,
      };
    }
    if (stage === AUCTION_STAGE.READY) {
      return {
        label: "Review & Launch",
        route: `/sport-tournaments/${sportTournamentId}/auction-hub`,
      };
    }
    if (!canManage) {
      return {
        label: "Back to Dashboard",
        route: `/dashboard`,
      };
    }
    return {
      label: "Continue Setup",
      route: `/sport-tournaments/${sportTournamentId}/manage`,
    };
  }, [stage, canManage, sportTournamentId]);

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
                {(canManage || readiness?.ready) && (
                  <Chip
                    color={readiness?.ready ? "success" : "warning"}
                    variant="outlined"
                    label={readiness?.ready ? "Ready" : `${blockers.length} setup issue(s)`}
                  />
                )}
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {canManage
                  ? "Tournament status, setup issues, and the next action."
                  : "Sport auction overview and current status."}
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
              stage={stage}
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
              isSetupStage(stage) ? (
                <Alert severity="info">
                  {canBid
                    ? "Waiting for the tournament organiser to complete setup. You will be notified when the auction is ready."
                    : "The tournament is currently in setup. Check back once the organiser has configured teams and the auction pool."}
                </Alert>
              ) : (
                <Alert severity="info">
                  Use Auction Details for teams, player assignments, bid history, statistics, and results.
                </Alert>
              )
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
              {canManage && stage === AUCTION_STAGE.SETUP && (
                <>
                  <Button variant="contained" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/manage`)}>
                    Continue Setup
                  </Button>
                  <Button variant="outlined" onClick={load}>
                    Refresh Setup Check
                  </Button>
                </>
              )}
              {canManage && stage === AUCTION_STAGE.READY && (
                <Button variant="contained" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)}>
                  Review &amp; Launch
                </Button>
              )}
              {canManage && stage === AUCTION_STAGE.LIVE && (
                <Button variant="contained" onClick={() => navigate(`/auctions/sports/${sportTournamentId}`)}>
                  Open Live Auction
                </Button>
              )}
              {canManage && stage === AUCTION_STAGE.COMPLETED && (
                <Button variant="contained" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/results`)}>
                  View Results
                </Button>
              )}
              {canManage && stage !== AUCTION_STAGE.SETUP && (
                <Button variant="outlined" onClick={() => navigate(`/sport-tournaments/${sportTournamentId}/manage`)}>
                  Tournament Management
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
