import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
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
  HubMetric,
  HubMetrics,
  HubProgress,
  HubTeamCard,
} from "../components/AuctionHubPrimitives";
import { formatAuctionValue } from "../utils/auctionHub";

const sections = ["Overview", "Teams", "Bid History", "Results", "Allocations", "Statistics"];

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

  const bids = useMemo(
    () => rounds
      .flatMap((round) => (round?.bids || []).map((bid) => ({
        ...bid,
        participantName: getParticipantName(round),
      })))
      .sort((left, right) => new Date(right?.placedAt || right?.createdAt || right?.timestamp || 0)
        - new Date(left?.placedAt || left?.createdAt || left?.timestamp || 0)),
    [rounds],
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
      <Box sx={{ display: "grid", minHeight: 320, placeItems: "center" }}>
        <CircularProgress />
      </Box>
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
                      ? "pending finalization"
                      : String(auction?.tournament?.status || tournament?.status || "Not started").replaceAll("_", " ")
                  }
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Auction status, team rosters, bid history, and results.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button startIcon={<RefreshIcon />} onClick={() => loadHub()}>
                Refresh
              </Button>
              <Button
                variant="contained"
                endIcon={<OpenInNewIcon />}
                onClick={() => navigate(routes.arena)}
              >
                Open Live Auction
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
                <HubMetric label="Players Won" value={viewerTeam.roster?.length ?? viewerTeam.playersWon ?? 0} />
                <HubMetric label="Remaining Slots" value={viewerTeam.remainingSlots ?? "—"} />
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
          aria-label="Sport auction hub sections"
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
                        ? `${round.result.teamName || "Team"} · ${formatAuctionValue(round.result.finalCredits)}`
                        : round?.result?.outcome || round?.status || "Updated"}
                    </Typography>
                  </Stack>
                  {index < Math.min(history.length, 6) - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
                </Box>
              )) : <Typography color="text.secondary">No auction activity yet.</Typography>}
            </CardContent>
          </Card>
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
                `${team.remainingSlots ?? "—"} slots left`,
              ]}
              roster={team.roster || team.players || []}
            />
          )) : <Alert severity="info">No sport teams are available yet.</Alert>}
        </Box>
      ) : null}

      {activeSection === "Bid History" ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={2}>
              <Box>
                <Typography variant="h6">Bid Timeline</Typography>
                <Typography color="text.secondary">Chronological team participation across completed and active rounds.</Typography>
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
            {bids.length ? bids.map((bid, index) => (
              <Box key={bid.id || `${bid.sportTeamId}-${bid.amount}-${index}`} sx={{ py: 1.2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.5}>
                  <Box>
                    <Typography fontWeight={700}>{bid.teamName || "Team"} · {bid.participantName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bid.placedAt || bid.createdAt || bid.timestamp
                        ? new Date(bid.placedAt || bid.createdAt || bid.timestamp).toLocaleString()
                        : "Time unavailable"}
                    </Typography>
                  </Box>
                  <Typography variant="h6">{formatAuctionValue(bid.amount ?? bid.bidAmount)}</Typography>
                </Stack>
                {index < bids.length - 1 ? <Divider sx={{ mt: 1.2 }} /> : null}
              </Box>
            )) : <Typography color="text.secondary">No matching bids found.</Typography>}
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
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Final Team Assignments</Typography>
              {history.length ? history.map((round, index) => (
                <Box key={round?.id || index} sx={{ py: 1.2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.5}>
                    <Typography fontWeight={700}>{getParticipantName(round)}</Typography>
                    <Typography color={isSold(round) ? "success.main" : "text.secondary"}>
                      {isSold(round)
                        ? `${round.result.teamName || "Team"} · ${formatAuctionValue(round.result.finalCredits)}`
                        : "Unsold"}
                    </Typography>
                  </Stack>
                  {index < history.length - 1 ? <Divider sx={{ mt: 1.2 }} /> : null}
                </Box>
              )) : <Typography color="text.secondary">No finalized rounds yet.</Typography>}
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {activeSection === "Allocations" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {teams.length ? teams.map((team) => (
            <Card key={getTeamId(team)} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography variant="h6">{team.teamName || team.name}</Typography>
                  <Chip size="small" label={`${team.remainingSlots ?? "—"} slots left`} />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {formatAuctionValue(team.remainingCredits)} credits remaining
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                {(team.roster || team.players || []).length
                  ? (team.roster || team.players).map((player, index) => (
                    <Stack key={player.id || index} direction="row" justifyContent="space-between" py={0.65}>
                      <Typography>{player.name || player.participant?.name || "Player"}</Typography>
                      <Typography color="text.secondary">{formatAuctionValue(player.finalCredits ?? player.purchasePrice)}</Typography>
                    </Stack>
                  ))
                  : <Typography color="text.secondary">No players allocated.</Typography>}
              </CardContent>
            </Card>
          )) : <Alert severity="info">No allocations are available yet.</Alert>}
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
              }) : <Typography color="text.secondary">No team credit data is available.</Typography>}
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </Stack>
  );
}

export default SportAuctionHub;
