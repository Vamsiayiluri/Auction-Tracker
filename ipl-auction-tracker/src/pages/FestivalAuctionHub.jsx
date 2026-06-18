import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import api from "../utils/api";
import {
  mergeAuctionSnapshotState,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";
import { socket } from "../webSocket/socket";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";
import {
  getFestivalAuctionStageFromState,
  isSetupStage,
  isReadyStage,
  isCompletedStage,
} from "../utils/auctionStages";

const sections = ["Overview", "Teams", "Bid History", "Results", "Statistics"];

const participantName = (round) =>
  round?.participant?.employee?.name || "Participant";

export default function FestivalAuctionHub({ initialSection = "Overview" }) {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const [section, setSection] = useState(
    sections.includes(requestedSection) ? requestedSection : initialSection
  );
  const [festival, setFestival] = useState(null);
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [participantFilter, setParticipantFilter] = useState("");
  const [selectedBidRound, setSelectedBidRound] = useState(null);
  const lastRevision = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [festivalResult, currentResult, historyResult, readinessResult] =
        await Promise.allSettled([
          api.get(`/v2/festivals/${festivalId}`),
          api.get(`/v2/festivals/${festivalId}/auction/current`),
          api.get(`/v2/festivals/${festivalId}/auction/history`),
          // Readiness is required to correctly determine READY stage.
          // Failure is non-fatal — stage gracefully falls back to SETUP.
          api.get(`/v2/festivals/${festivalId}/auction/readiness`),
        ]);

      if (festivalResult.status === "fulfilled") {
        setFestival(festivalResult.value.data.data);
      }
      if (currentResult.status === "fulfilled") {
        setState(currentResult.value.data.data);
      }
      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value.data.data || []);
      }
      if (readinessResult.status === "fulfilled") {
        setReadiness(readinessResult.value.data.data);
      }

      // Surface an error only when both primary data sources fail.
      if (
        festivalResult.status === "rejected" &&
        currentResult.status === "rejected"
      ) {
        setError(
          currentResult.reason?.response?.data?.message ||
            "We could not load the Festival auction details. Try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [festivalId]);

  useEffect(() => {
    const applySnapshot = (payload) => {
      if (
        payload?.scopeType !== "festival" ||
        payload.scopeId !== festivalId ||
        !shouldApplyAuctionSnapshot(lastRevision.current, payload)
      ) {
        return;
      }
      lastRevision.current = payload.revision;
      setState((current) => mergeAuctionSnapshotState(current, payload));
      setHistory(payload.history || []);
    };
    const join = () => socket.emit("join-festival-auction", { festivalId });
    void load();
    socket.on("auction-state", applySnapshot);
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.emit("leave-festival-auction", { festivalId });
      socket.off("auction-state", applySnapshot);
      socket.off("connect", join);
    };
  }, [festivalId, load]);

  const results = useMemo(
    () => history.filter(({ result }) => Boolean(result)),
    [history]
  );
  const lastResult = results[0] || null;
  const sold = useMemo(
    () => results.filter(({ result }) => result.outcome === "sold"),
    [results]
  );
  const unsold = useMemo(
    () => results.filter(({ result }) => result.outcome === "unsold"),
    [results]
  );
  const remaining = (state?.pool?.length || 0) + (state?.unsold?.length || 0);
  const total = sold.length + unsold.length + remaining + (state?.current ? 1 : 0);
  const viewerTeamId = state?.viewer?.festivalTeamId;
  const viewerTeam = useMemo(
    () => state?.teamSummaries?.find(
      ({ festivalTeamId }) => festivalTeamId === viewerTeamId
    ),
    [state?.teamSummaries, viewerTeamId]
  );
  const bids = useMemo(
    () =>
      history
        .flatMap((round) =>
          (round.bids || []).map((bid) => ({
            ...bid,
            participant: participantName(round),
          }))
        )
        .sort(
          (left, right) =>
            new Date(right.placedAt).getTime() -
            new Date(left.placedAt).getTime()
        ),
    [history]
  );
  const saleValues = useMemo(
    () => sold.map(({ result }) => Number(result.finalAmount || 0)),
    [sold]
  );
  const totalSpent = useMemo(
    () => saleValues.reduce((sum, value) => sum + value, 0),
    [saleValues]
  );
  const filteredRounds = useMemo(
    () => history.filter((round) => {
      const matchesTeam =
        teamFilter === "all" ||
        String(round.result?.festivalTeamId) === teamFilter ||
        (round.bids || []).some((bid) => String(bid.festivalTeamId) === teamFilter);
      const matchesParticipant = participantName(round)
        .toLowerCase()
        .includes(participantFilter.trim().toLowerCase());
      return matchesTeam && matchesParticipant;
    }),
    [history, teamFilter, participantFilter]
  );
  const activityEntries = useMemo(
    () => buildAuctionActivity({
      history,
      status: state?.config?.auctionStatus,
      label: "Festival Auction",
      formatValue: formatAuctionValue,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, state?.config?.auctionStatus]
  );
  const changeSection = (_, value) => {
    setSection(value);
    setSearchParams(value === "Overview" ? {} : { section: value });
  };
  // Stage is derived from all three sources so that a READY pre-launch festival
  // (readiness = READY, auctionStatus = "setup", festivalStatus = "setup") is
  // correctly identified as READY rather than SETUP.
  const festivalStage = getFestivalAuctionStageFromState({
    festival,
    auction: state,
    readiness,
  });
  const hasResults = results.length > 0;

  if (loading && !state) {
    return (
      <LoadingStateCard
        title="Loading Festival Auction Details"
        message="Preparing teams, spending, bid summaries, and results."
      />
    );
  }

  if (isSetupStage(festivalStage)) {
    if (state?.viewer?.isAdmin) {
      return (
        <ProductStateCard
          eyebrow="Festival Auction"
          title="Auction Setup Incomplete"
          message="Teams, budgets, and the participant pool must be configured before Auction Details becomes meaningful. Complete Festival setup first."
          actionLabel="Continue Festival Setup"
          onAction={() => navigate(`/festivals/${festivalId}/manage`)}
          secondaryActionLabel="View Festival Overview"
          onSecondaryAction={() => navigate(`/festivals/${festivalId}/command-center`)}
        />
      );
    }
    return (
      <ProductStateCard
        eyebrow="Festival Auction"
        title={state?.viewer?.isOwner ? "Waiting For Festival Setup" : "Festival Auction in Setup"}
        message={
          state?.viewer?.isOwner
            ? "The Festival Administrator is still preparing the Festival. You will be able to participate once setup is complete."
            : "The Festival is being prepared by the Administrator. Auction details, bid history, and results will appear once the auction launches."
        }
        actionLabel="Browse Auctions"
        onAction={() => navigate("/auctions")}
      />
    );
  }

  // Pre-launch READY state: setup is complete but auction has not been started yet.
  // Show a holding screen rather than an empty Hub with no bids or team data.
  if (isReadyStage(festivalStage)) {
    return (
      <ProductStateCard
        eyebrow="Festival Auction"
        title={state?.viewer?.isOwner ? "Auction Ready — Launching Soon" : "Festival Auction Ready to Launch"}
        message={
          state?.viewer?.isOwner
            ? "Setup is complete. The administrator will start the auction shortly. Bid history, team summaries, and statistics will appear once bidding begins."
            : "The Festival auction is configured and ready. Auction details will be available once the administrator starts the auction."
        }
        actionLabel={state?.viewer?.isAdmin ? "Go to Festival Management" : "Browse Auctions"}
        onAction={
          state?.viewer?.isAdmin
            ? () => navigate(`/festivals/${festivalId}/manage`)
            : () => navigate("/auctions")
        }
        secondaryActionLabel={state?.viewer?.isAdmin ? "View Festival Overview" : undefined}
        onSecondaryAction={
          state?.viewer?.isAdmin
            ? () => navigate(`/festivals/${festivalId}/command-center`)
            : undefined
        }
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent sx={{ py: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                Festival Auction Details
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {festival?.name || "Festival Auction"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                <Chip
                  size="small"
                  label={String(
                    state?.config?.auctionStatus || "setup"
                  ).replaceAll("_", " ")}
                />
                {viewerTeam?.team?.name && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={`My Team: ${viewerTeam.team.name}`}
                  />
                )}
              </Stack>
            </Box>
            <Button
              variant="contained"
              onClick={() =>
                navigate(
                  isCompletedStage(festivalStage)
                    ? `/festivals/${festivalId}/results`
                    : `/auctions/festivals/${festivalId}`
                )
              }
            >
              {isCompletedStage(festivalStage) ? "View Results" : "Open Live Auction"}
            </Button>
          </Stack>
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            <AuctionContextNavigation
              commandCenter={
                state?.viewer?.isAdmin
                  ? `/festivals/${festivalId}/command-center`
                  : null
              }
              management={
                state?.viewer?.isAdmin ? `/festivals/${festivalId}/manage` : null
              }
              hub={`/festivals/${festivalId}/auction-hub`}
              arena={`/auctions/festivals/${festivalId}`}
              results={`/festivals/${festivalId}/results`}
              stage={festivalStage}
              hasResults={hasResults}
            />
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <Tabs
          value={section}
          onChange={changeSection}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          {sections.map((item) => (
            <Tab key={item} value={item} label={item} />
          ))}
        </Tabs>
      </Card>

      {section === "Overview" && (
        <Stack spacing={2}>
          {viewerTeam && (
            <HubMetrics>
              <HubMetric
                label="My Remaining Purse"
                value={formatAuctionValue(viewerTeam.remainingBudget)}
              />
              <HubMetric
                label="My Spending"
                value={formatAuctionValue(viewerTeam.spentBudget)}
              />
              <HubMetric
                label="My Purchases"
                value={viewerTeam.playersPurchased || 0}
              />
              <HubMetric
                label="My Bid Activity"
                value={
                  bids.filter(({ festivalTeamId }) => festivalTeamId === viewerTeamId)
                    .length
                }
              />
            </HubMetrics>
          )}
          <HubMetrics>
            <HubMetric label="Sold" value={sold.length} />
            <HubMetric label="Unsold" value={unsold.length} />
            <HubMetric label="Remaining" value={remaining} />
            <HubMetric label="Accepted Bids" value={bids.length} />
          </HubMetrics>
          <LastAuctionResultPanel
            round={lastResult}
            label="Festival Auction"
            formatValue={formatAuctionValue}
          />
          <Card variant="outlined">
            <CardContent>
              <HubProgress completed={results.length} total={total} />
            </CardContent>
          </Card>
          <AuctionActivityFeed entries={activityEntries} title="Recent Activity" />
        </Stack>
      )}

      {section === "Teams" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {(state?.teams || [])
            .slice()
            .sort((left, right) =>
              left.id === viewerTeamId ? -1 : right.id === viewerTeamId ? 1 : 0
            )
            .map((team) => {
              const summary = state?.teamSummaries?.find(
                ({ festivalTeamId }) => festivalTeamId === team.id
              );
              return (
                <HubTeamCard
                  key={team.id}
                  name={team.name}
                  isViewer={team.id === viewerTeamId}
                  remaining={formatAuctionValue(summary?.remainingBudget)}
                  spent={formatAuctionValue(summary?.spentBudget)}
                  roster={team.members || []}
                  formatValue={formatAuctionValue}
                  labels={[
                    `${summary?.retentions || 0} retained`,
                    `${summary?.playersPurchased || 0} players bought`,
                  ]}
                />
              );
            })}
        </Box>
      )}

      {section === "Bid History" && (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Team</InputLabel>
              <Select
                value={teamFilter}
                label="Team"
                onChange={(event) => setTeamFilter(event.target.value)}
              >
                <MenuItem value="all">All teams</MenuItem>
                {(state?.teams || []).map((team) => (
                  <MenuItem key={team.id} value={String(team.id)}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Participant"
              value={participantFilter}
              onChange={(event) => setParticipantFilter(event.target.value)}
              sx={{ minWidth: { sm: 260 } }}
            />
          </Stack>
          <BidHistorySummary
            rounds={filteredRounds}
            selectedRound={selectedBidRound}
            onSelectRound={setSelectedBidRound}
            onClose={() => setSelectedBidRound(null)}
            formatValue={formatAuctionValue}
          />
        </Stack>
      )}

      {section === "Results" && (
        <Stack spacing={2}>
          <LastAuctionResultPanel
            round={lastResult}
            label="Festival Auction"
            formatValue={formatAuctionValue}
          />
          <AuctionActivityFeed entries={activityEntries} title="Live Activity" />
          <HubTable
          columns={["Participant", "Status", "Winning Team", "Purchase Amount", "Acquisition Type", "Auction Order"]}
          rows={results}
          renderRow={(round, index) => (
            <TableRow key={round.id}>
              <TableCell>{participantName(round)}</TableCell>
              <TableCell>{round.result.outcome === "sold" ? "Sold" : "Unsold"}</TableCell>
              <TableCell>{round.result.teamName || "-"}</TableCell>
              <TableCell>{round.result.finalAmount ? formatAuctionValue(round.result.finalAmount) : "-"}</TableCell>
              <TableCell>{round.result.outcome === "sold" ? "Auction" : "-"}</TableCell>
              <TableCell>#{results.length - index}</TableCell>
            </TableRow>
          )}
          empty="No results available yet. Results will appear once participants are sold or marked unsold."
        />
        </Stack>
      )}

      {section === "Statistics" && (
        <Stack spacing={2}>
          <HubMetrics>
            <HubMetric label="Total Team Spending" value={formatAuctionValue(totalSpent)} />
            <HubMetric
              label="Highest Sale"
              value={formatAuctionValue(Math.max(0, ...saleValues))}
            />
            <HubMetric
              label="Lowest Sale"
              value={formatAuctionValue(saleValues.length ? Math.min(...saleValues) : 0)}
            />
            <HubMetric
              label="Average Sale"
              value={formatAuctionValue(saleValues.length ? totalSpent / saleValues.length : 0)}
            />
          </HubMetrics>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={800}>Team Spending</Typography>
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {(state?.teamSummaries || []).map((team) => {
                  const starting = Number(team.spentBudget || 0) + Number(team.remainingBudget || 0);
                  return (
                    <Box key={team.festivalTeamId}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography fontWeight={700}>{team.team?.name || "Festival Team"}</Typography>
                        <Typography>{formatAuctionValue(team.spentBudget)} spent</Typography>
                      </Stack>
                      <HubProgress completed={Number(team.spentBudget || 0)} total={starting} />
                    </Box>
                  );
                })}
                {!state?.teamSummaries?.length && (
                  <Typography color="text.secondary">Team spending appears after purchases are finalized.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}

function HubTable({ columns, rows, renderRow, empty }) {
  return (
    <Card variant="outlined">
      <TableContainer>
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => renderRow(row, index))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
