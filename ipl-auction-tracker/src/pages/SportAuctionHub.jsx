import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import { mergeAuctionSnapshotState } from "../utils/auctionSynchronization";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import {
  AuctionActivityFeed,
  BidHistorySummary,
  buildAuctionActivity,
  HubMetric,
  HubMetrics,
  HubProgress,
  HubTeamCard,
  LastAuctionResultPanel,
} from "../components/AuctionHubPrimitives";
import { formatAuctionValue } from "../utils/auctionHub";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";

const sections = ["Overview", "Teams", "Bid History", "Results", "Team Assignments", "Statistics"];

const normalizeHistory = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rounds)) return payload.rounds;
  if (Array.isArray(payload?.history)) return payload.history;
  return [];
};

const getTeamId = (team) => Number(team?.sportTeamId ?? team?.id);
const getParticipantName = (round) =>
  round?.participant?.employee?.name
  || round?.participant?.name
  || round?.player?.name
  || "Player";
const isSold = (round) =>
  String(round?.result?.outcome || round?.status).toUpperCase() === "SOLD";

function SportAuctionHub({ initialSection = null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [auction, setAuction] = useState(null);
  const [history, setHistory] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedBidRound, setSelectedBidRound] = useState(null);

  const requestedSection = initialSection || searchParams.get("section") || "Overview";
  const activeSection = sections.includes(requestedSection) ? requestedSection : "Overview";

  const loadHub = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [currentResponse, historyResponse, tournamentResponse] = await Promise.all([
        api.get(`/v2/sport-tournaments/${id}/auction/current`),
        api.get(`/v2/sport-tournaments/${id}/auction/history`),
        api.get(`/v2/sport-tournaments/${id}`),
      ]);
      setAuction(currentResponse.data.data);
      setHistory(normalizeHistory(historyResponse.data.data));
      setTournament(tournamentResponse.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We could not load the Sport auction details. Try again.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  useEffect(() => {
    const refresh = (payload) => {
      if (payload?.scopeType !== "sport" || Number(payload?.scopeId) !== Number(id)) return;
      setAuction((current) => mergeAuctionSnapshotState(current, payload));
      setHistory(payload.history || []);
    };

    socket.emit("join-sport-auction", { sportTournamentId: Number(id) });
    socket.on("auction-state", refresh);

    return () => {
      socket.emit("leave-sport-auction", { sportTournamentId: Number(id) });
      socket.off("auction-state", refresh);
    };
  }, [id, loadHub]);

  const teams = useMemo(() => {
    const source = auction?.teams || tournament?.teams || [];
    const viewerTeamId = Number(auction?.viewer?.sportTeamId);
    return [...source].sort((left, right) => {
      if (getTeamId(left) === viewerTeamId) return -1;
      if (getTeamId(right) === viewerTeamId) return 1;
      return String(left?.teamName || left?.name || "").localeCompare(
        String(right?.teamName || right?.name || ""),
      );
    });
  }, [auction?.teams, auction?.viewer?.sportTeamId, tournament?.teams]);

  const rounds = useMemo(
    () => history.filter((round) => teamFilter === "all"
      || Number(round?.result?.sportTeamId ?? round?.sportTeamId)
        === Number(teamFilter)
      || round?.bids?.some((bid) => Number(bid?.sportTeamId) === Number(teamFilter))),
    [history, teamFilter],
  );

  const soldRounds = useMemo(
    () => history.filter(isSold),
    [history],
  );
  const unsoldRounds = useMemo(
    () => history.filter((round) => String(round?.result?.outcome || round?.status).toUpperCase() === "UNSOLD"),
    [history],
  );
  const totalSpent = soldRounds.reduce(
    (total, round) => total + Number(round?.result?.finalCredits ?? round?.finalCredits ?? 0),
    0,
  );
  const highestSale = soldRounds.reduce(
    (highest, round) => Math.max(highest, Number(round?.result?.finalCredits ?? round?.finalCredits ?? 0)),
    0,
  );
  const lowestSale = soldRounds.length
    ? Math.min(...soldRounds.map((round) => Number(round?.result?.finalCredits ?? round?.finalCredits ?? 0)))
    : 0;
  const available = (auction?.pool || []).filter(
    ({ state: poolState, isCurrent }) => poolState === "available" && !isCurrent,
  ).length;
  const sold = Number(auction?.counts?.sold ?? soldRounds.length);
  const unsold = Number(auction?.counts?.unsold ?? unsoldRounds.length);
  const total = sold + unsold + available;
  const viewerTeam = teams.find(
    (team) => getTeamId(team) === Number(auction?.viewer?.sportTeamId),
  );
  const canManage = Boolean(auction?.viewer?.canManage);
  const canBid = Boolean(auction?.viewer?.canBid);
  const auctionStatus = auction?.tournament?.status || tournament?.status;
  const lastResult = history.find((round) => Boolean(round?.result)) || null;
  const activityEntries = buildAuctionActivity({
    history,
    status: auction?.tournament?.status || tournament?.status,
    label: "Sport Auction",
    formatValue: formatAuctionValue,
  });

  const routes = {
    commandCenter: canManage ? `/sport-tournaments/${id}/command-center` : null,
    management: canManage ? `/sport-tournaments/${id}/manage` : null,
    hub: `/sport-tournaments/${id}/auction-hub`,
    arena: `/auctions/sports/${id}`,
    results: `/sport-tournaments/${id}/results`,
  };

  const selectSection = (_, value) => {
    if (initialSection) {
      navigate(`/sport-tournaments/${id}/auction-hub${value === "Overview" ? "" : `?section=${encodeURIComponent(value)}`}`);
      return;
    }
    setSearchParams(value === "Overview" ? {} : { section: value });
  };

  if (loading) {
    return (
      <LoadingStateCard
        title="Loading Sport Auction Details"
        message="Preparing teams, player purchases, bid summaries, and results."
      />
    );
  }

  if (
    !canManage &&
    !["auction_live", "auction_paused", "auction_completed"].includes(
      auctionStatus
    )
  ) {
    return (
      <ProductStateCard
        eyebrow="Sport Auction"
        title={canBid ? "Waiting For Auction Launch" : "Sport Auction Not Started"}
        message={
          canBid
            ? "Your team is assigned, but the Sport auction is not ready yet. Setup, budgets, and the auction pool may still be in progress."
            : "This Sport auction is not live yet. The Tournament overview shows the current setup status."
        }
        actionLabel="Return To Tournament Overview"
        onAction={() => navigate(`/sport-tournaments/${id}`)}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent sx={{ py: 2.25 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h4">{auction?.tournament?.name || tournament?.name || "Sport Auction Details"}</Typography>
                <Chip
                  size="small"
                  label={
                    auction?.current?.status === "pending"
                      ? "waiting for confirmation"
                      : String(auction?.tournament?.status || tournament?.status || "Not started").replaceAll("_", " ")
                  }
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Auction status, team members, bid history, and results.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button startIcon={<RefreshIcon />} onClick={() => loadHub()}>
                Refresh
              </Button>
              <Button
                variant="contained"
                endIcon={<OpenInNewIcon />}
                onClick={() =>
                  navigate(
                    auctionStatus === "auction_completed"
                      ? routes.results
                      : routes.arena
                  )
                }
              >
                {auctionStatus === "auction_completed" ? "View Results" : "Open Live Auction"}
              </Button>
            </Stack>
          </Stack>
          <Box sx={{ mt: 2 }}>
            <AuctionContextNavigation {...routes} />
          </Box>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {viewerTeam ? (
        <Card sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}>
          <CardContent>
            <Typography variant="overline">My Team</Typography>
            <Typography variant="h5">{viewerTeam.teamName || viewerTeam.name}</Typography>
            <Box sx={{ mt: 1.5 }}>
              <HubMetrics>
                <HubMetric label="Credits Remaining" value={formatAuctionValue(viewerTeam.remainingCredits)} />
                <HubMetric label="Players Bought" value={viewerTeam.roster?.length ?? viewerTeam.playersWon ?? 0} />
                <HubMetric label="Players Remaining" value={viewerTeam.remainingSlots ?? "-"} />
                <HubMetric
                  label="My Bid Activity"
                  value={history.reduce(
                    (count, round) => count + (round?.bids || []).filter(
                      (bid) => Number(bid?.sportTeamId) === getTeamId(viewerTeam),
                    ).length,
                    0,
                  )}
                />
              </HubMetrics>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <Tabs
          value={activeSection}
          onChange={selectSection}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Sport auction details sections"
        >
          {sections.map((section) => <Tab key={section} value={section} label={section} />)}
        </Tabs>
      </Card>

      {activeSection === "Overview" ? (
        <Stack spacing={2}>
          <HubMetrics>
            <HubMetric label="Credits Spent" value={formatAuctionValue(totalSpent)} />
            <HubMetric
              label="Credits Remaining"
              value={formatAuctionValue(teams.reduce(
                (totalCredits, team) => totalCredits + Number(team?.remainingCredits || 0),
                0,
              ))}
            />
            <HubMetric label="Players Sold" value={sold} />
            <HubMetric label="Remaining" value={available} />
          </HubMetrics>
          <LastAuctionResultPanel
            round={lastResult}
            label="Sport Auction"
            formatValue={formatAuctionValue}
          />
          <HubProgress completed={sold + unsold} total={total} />
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Activity</Typography>
              {history.length ? history.slice(0, 6).map((round, index) => (
                <Box key={round?.id || index} sx={{ py: 1.25 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.5}>
                    <Typography fontWeight={700}>{getParticipantName(round)}</Typography>
                    <Typography color="text.secondary">
                      {isSold(round)
                        ? `${round.result.teamName || "Team"} | ${formatAuctionValue(round.result.finalCredits)}`
                        : round?.result?.outcome || round?.status || "Updated"}
                    </Typography>
                  </Stack>
                  {index < Math.min(history.length, 6) - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
                </Box>
              )) : <Typography color="text.secondary">No auction activity yet. Activity will appear once the auction begins.</Typography>}
            </CardContent>
          </Card>
          <AuctionActivityFeed entries={activityEntries} title="Live Activity" />
        </Stack>
      ) : null}

      {activeSection === "Teams" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {teams.length ? teams.map((team) => (
            <HubTeamCard
              key={getTeamId(team)}
              name={team.teamName || team.name}
              isViewer={getTeamId(team) === Number(auction?.viewer?.sportTeamId)}
              remaining={formatAuctionValue(team.remainingCredits)}
              spent={formatAuctionValue(
                Math.max(0, Number(team.allocatedCredits || 0) - Number(team.remainingCredits || 0)),
              )}
              labels={[
                `Captain: ${team.captain?.name || team.captainName || "Unassigned"}`,
                `${team.remainingSlots ?? "-"} players remaining`,
              ]}
              roster={team.roster || team.players || []}
              formatValue={formatAuctionValue}
            />
          )) : <Alert severity="info">No Sport Teams Created Yet. Create teams before continuing.</Alert>}
        </Box>
      ) : null}

      {activeSection === "Bid History" ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={2}>
              <Box>
                <Typography variant="h6">Bid History</Typography>
                <Typography color="text.secondary">Participant-level summaries keep the main page readable.</Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Team</InputLabel>
                <Select value={teamFilter} label="Team" onChange={(event) => setTeamFilter(event.target.value)}>
                  <MenuItem value="all">All teams</MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={getTeamId(team)} value={String(getTeamId(team))}>
                      {team.teamName || team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <BidHistorySummary
              rounds={rounds}
              selectedRound={selectedBidRound}
              onSelectRound={setSelectedBidRound}
              onClose={() => setSelectedBidRound(null)}
              formatValue={formatAuctionValue}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "Results" ? (
        <Stack spacing={2}>
          <HubMetrics>
            <HubMetric label="Sold" value={soldRounds.length} />
            <HubMetric label="Unsold" value={unsoldRounds.length} />
            <HubMetric label="Final Spend" value={formatAuctionValue(totalSpent)} />
          </HubMetrics>
          <SportResultsTable rounds={history} formatValue={formatAuctionValue} />
        </Stack>
      ) : null}

      {activeSection === "Team Assignments" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {teams.length ? teams.map((team) => (
            <Card key={getTeamId(team)} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography variant="h6">{team.teamName || team.name}</Typography>
                  <Chip size="small" label={`${team.remainingSlots ?? "-"} players remaining`} />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {formatAuctionValue(team.remainingCredits)} credits remaining
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                {(team.roster || team.players || []).length
                  ? (team.roster || team.players).map((player, index) => (
                    <Box
                      key={player.id || index}
                      sx={{
                        py: 0.85,
                        borderTop: index ? 1 : 0,
                        borderColor: "divider",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        gap={0.5}
                      >
                        <Typography fontWeight={700}>
                          {player.name || player.participant?.name || "Player"}
                        </Typography>
                        <Typography color="text.secondary">
                          Purchase Order: #{player.auctionOrder ?? player.purchaseOrder ?? index + 1}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Purchased For: ${formatAuctionValue(
                            player.finalCredits ?? player.purchasePrice ?? 0
                          )}`}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Acquired Through: ${player.acquisitionType || player.source || "Auction"}`}
                        />
                      </Stack>
                    </Box>
                  ))
                  : <Typography color="text.secondary">No players bought yet.</Typography>}
              </CardContent>
            </Card>
          )) : <Alert severity="info">No team assignments are available yet. Players bought through the auction will appear here.</Alert>}
        </Box>
      ) : null}

      {activeSection === "Statistics" ? (
        <Stack spacing={2}>
          <HubMetrics>
            <HubMetric label="Total Credits Used" value={formatAuctionValue(totalSpent)} />
            <HubMetric label="Highest Acquisition" value={formatAuctionValue(highestSale)} />
            <HubMetric label="Lowest Acquisition" value={formatAuctionValue(lowestSale)} />
            <HubMetric
              label="Average Acquisition"
              value={formatAuctionValue(soldRounds.length ? Math.round(totalSpent / soldRounds.length) : 0)}
            />
          </HubMetrics>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Team Credit Utilization</Typography>
              {teams.length ? teams.map((team, index) => {
                const allocated = Number(team.allocatedCredits ?? team.startingCredits ?? 0);
                const remaining = Number(team.remainingCredits ?? 0);
                const spent = Math.max(0, allocated - remaining);
                return (
                  <Box key={getTeamId(team)} sx={{ py: 1.25 }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Typography fontWeight={700}>{team.teamName || team.name}</Typography>
                      <Typography>{formatAuctionValue(spent)} used</Typography>
                    </Stack>
                    <HubProgress completed={spent} total={allocated} />
                    {index < teams.length - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
                  </Box>
                );
              }) : <Typography color="text.secondary">Team spending will appear after budgets are configured and purchases begin.</Typography>}
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </Stack>
  );
}

function SportResultsTable({ rounds, formatValue }) {
  const resultRounds = rounds.filter((round) => round?.result || round?.status);

  return (
    <Card variant="outlined">
      <TableContainer>
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Participant</TableCell>
              <TableCell>Winning Team</TableCell>
              <TableCell>Purchase Amount</TableCell>
              <TableCell>Acquisition Type</TableCell>
              <TableCell>Purchase Order</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resultRounds.map((round, index) => (
              <TableRow key={round?.id || index}>
                <TableCell>{getParticipantName(round)}</TableCell>
                <TableCell>{round?.result?.teamName || "-"}</TableCell>
                <TableCell>
                  {isSold(round)
                    ? formatValue(round?.result?.finalCredits ?? round?.finalCredits)
                    : "-"}
                </TableCell>
                <TableCell>{isSold(round) ? "Auction" : "-"}</TableCell>
                <TableCell>#{resultRounds.length - index}</TableCell>
                <TableCell>{isSold(round) ? "Sold" : "Unsold"}</TableCell>
              </TableRow>
            ))}
            {!resultRounds.length && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No results available yet. Results will appear once players are sold or marked unsold.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

export default SportAuctionHub;
