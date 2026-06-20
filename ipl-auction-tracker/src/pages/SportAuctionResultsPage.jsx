import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";
import TeamExportButton from "../components/TeamExportButton";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";
import { formatAuctionValue } from "../utils/auctionHub";
import {
  getSportAuctionStageFromState,
  isSetupStage,
  isReadyStage,
} from "../utils/auctionStages";

const getParticipantName = (round) =>
  round?.participant?.employee?.name ||
  round?.participant?.name ||
  round?.player?.name ||
  "Participant";

const isSold = (round) =>
  String(round?.result?.outcome || round?.status || "").toUpperCase() === "SOLD";

const sportExportStatuses = new Set([
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
  "archived",
]);

export default function SportAuctionResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [auction, setAuction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [tournamentResult, readinessResult, auctionResult, historyResult] =
      await Promise.allSettled([
        api.get(`/v2/sport-tournaments/${id}`),
        api.get(`/v2/sport-tournaments/${id}/readiness`),
        api.get(`/v2/sport-tournaments/${id}/auction/current`),
        api.get(`/v2/sport-tournaments/${id}/auction/history`),
      ]);
    if (tournamentResult.status === "fulfilled") {
      setTournament(tournamentResult.value.data.data);
    } else {
      setError(tournamentResult.reason?.response?.data?.message || "Unable to load Sport Tournament results.");
    }
    if (readinessResult.status === "fulfilled") setReadiness(readinessResult.value.data.data);
    if (auctionResult.status === "fulfilled") setAuction(auctionResult.value.data.data);
    if (historyResult.status === "fulfilled") {
      const raw = historyResult.value.data.data;
      setHistory(Array.isArray(raw) ? raw : Array.isArray(raw?.rounds) ? raw.rounds : []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const sportStage = getSportAuctionStageFromState({ tournament, readiness, auction });
  const soldRounds = history.filter(isSold);
  const unsoldRounds = history.filter(
    (r) => String(r?.result?.outcome || r?.status || "").toUpperCase() === "UNSOLD",
  );
  const totalSpent = soldRounds.reduce(
    (sum, r) => sum + Number(r?.result?.finalCredits ?? r?.finalCredits ?? 0),
    0,
  );
  const resultRounds = history.filter((r) => r?.result || r?.status);

  if (loading) {
    return (
      <LoadingStateCard
        title="Loading Results"
        message="Preparing completed auction outcomes and Sport Team purchases."
      />
    );
  }

  if (!tournament && error) {
    return (
      <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  }

  if (isSetupStage(sportStage) || isReadyStage(sportStage)) {
    return (
      <ProductStateCard
        eyebrow="Sport Auction"
        title="No Results Yet"
        message="The Sport auction has not launched yet. Results and team purchases will appear here once bidding begins and participants are finalised."
        actionLabel="Return to Tournament Overview"
        onAction={() => navigate(`/sport-tournaments/${id}`)}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {tournament?.name || "Sport Auction"} — Results
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Final assignments and completed auction outcomes.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button startIcon={<RefreshIcon />} onClick={load}>
                Refresh
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/sport-tournaments/${id}/auction-hub`)}
              >
                Auction Details
              </Button>
              <TeamExportButton
                endpoint={`/v2/sport-tournaments/${id}/export/excel`}
                tournamentName={tournament?.name}
                allowed={
                  (user?.role === "admin" || auction?.viewer?.canBid) &&
                  sportExportStatuses.has(tournament?.status)
                }
              />
            </Stack>
          </Stack>
          <Box sx={{ mt: 1.25 }}>
            <AuctionContextNavigation
              commandCenter={`/sport-tournaments/${id}`}
              hub={`/sport-tournaments/${id}/auction-hub`}
              arena={`/auctions/sports/${id}`}
              results={`/sport-tournaments/${id}/results`}
              stage={sportStage}
              hasResults={resultRounds.length > 0}
            />
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="warning">{error}</Alert>}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip label={`${soldRounds.length} Sold`} color="success" />
        <Chip label={`${unsoldRounds.length} Unsold`} color="warning" variant="outlined" />
        <Chip label={`${formatAuctionValue(totalSpent)} Total Credits`} />
      </Stack>

      <Card variant="outlined">
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Participant</TableCell>
                <TableCell>Winning Team</TableCell>
                <TableCell>Credits Paid</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resultRounds.map((round, index) => (
                <TableRow key={round?.id || index}>
                  <TableCell>{resultRounds.length - index}</TableCell>
                  <TableCell>{getParticipantName(round)}</TableCell>
                  <TableCell>{round?.result?.teamName || "—"}</TableCell>
                  <TableCell>
                    {isSold(round)
                      ? formatAuctionValue(round?.result?.finalCredits ?? round?.finalCredits)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={isSold(round) ? "Sold" : "Unsold"}
                      color={isSold(round) ? "success" : "warning"}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!resultRounds.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No results available yet. Results appear once players are sold or marked unsold.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}
