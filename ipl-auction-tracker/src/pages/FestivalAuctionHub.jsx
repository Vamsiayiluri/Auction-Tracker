import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  HubMetric,
  HubMetrics,
  HubProgress,
  HubTeamCard,
} from "../components/AuctionHubPrimitives";
import { formatAuctionValue } from "../utils/auctionHub";
import api from "../utils/api";
import {
  mergeAuctionSnapshotState,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";
import { socket } from "../webSocket/socket";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [participantFilter, setParticipantFilter] = useState("");
  const lastRevision = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [festivalResponse, currentResponse, historyResponse] =
        await Promise.all([
          api.get(`/v2/festivals/${festivalId}`),
          api.get(`/v2/festivals/${festivalId}/auction/current`),
          api.get(`/v2/festivals/${festivalId}/auction/history`),
        ]);
      setFestival(festivalResponse.data.data);
      setState(currentResponse.data.data);
      setHistory(historyResponse.data.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not load the Festival auction details. Try again."
      );
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
  const sold = results.filter(({ result }) => result.outcome === "sold");
  const unsold = results.filter(({ result }) => result.outcome === "unsold");
  const remaining = (state?.pool?.length || 0) + (state?.unsold?.length || 0);
  const total = sold.length + unsold.length + remaining + (state?.current ? 1 : 0);
  const viewerTeamId = state?.viewer?.festivalTeamId;
  const viewerTeam = state?.teamSummaries?.find(
    ({ festivalTeamId }) => festivalTeamId === viewerTeamId
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
  const saleValues = sold.map(({ result }) => Number(result.finalAmount || 0));
  const totalSpent = saleValues.reduce((sum, value) => sum + value, 0);
  const filteredBids = bids.filter((bid) => {
    const matchesTeam =
      teamFilter === "all" || String(bid.festivalTeamId) === teamFilter;
    const matchesParticipant = bid.participant
      .toLowerCase()
      .includes(participantFilter.trim().toLowerCase());
    return matchesTeam && matchesParticipant;
  });
  const changeSection = (_, value) => {
    setSection(value);
    setSearchParams(value === "Overview" ? {} : { section: value });
  };

  if (loading && !state) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading auction details...</Typography>
      </Stack>
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
              onClick={() => navigate(`/auctions/festivals/${festivalId}`)}
            >
              Open Live Auction
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
          <Card variant="outlined">
            <CardContent>
              <HubProgress completed={results.length} total={total} />
              <Typography variant="h6" fontWeight={800} sx={{ mt: 2 }}>
                Recent Activity
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {history.slice(0, 6).map((round) => (
                  <Stack
                    key={round.id}
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography>{participantName(round)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {round.result?.outcome
                        ? `${round.result.outcome} ${
                            round.result.teamName || ""
                          }`
                        : round.status}
                    </Typography>
                  </Stack>
                ))}
                {!history.length && (
                  <Typography color="text.secondary">
                    Auction activity will appear here.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
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
                  labels={[
                    `${summary?.retentions || 0} retained`,
                    `${summary?.playersPurchased || 0} purchased`,
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
          <HubTable
            columns={["Time", "Participant", "Team", "Bid"]}
            rows={filteredBids}
            renderRow={(bid) => (
              <TableRow key={bid.id}>
                <TableCell>{new Date(bid.placedAt).toLocaleString()}</TableCell>
                <TableCell>{bid.participant}</TableCell>
                <TableCell>{bid.teamName}</TableCell>
                <TableCell>{formatAuctionValue(bid.amount)}</TableCell>
              </TableRow>
            )}
            empty="No bids match the selected filters."
          />
        </Stack>
      )}

      {section === "Results" && (
        <HubTable
          columns={["Participant", "Outcome", "Team", "Final Value"]}
          rows={results}
          renderRow={(round) => (
            <TableRow key={round.id}>
              <TableCell>{participantName(round)}</TableCell>
              <TableCell>{round.result.outcome}</TableCell>
              <TableCell>{round.result.teamName || "-"}</TableCell>
              <TableCell>
                {round.result.finalAmount
                  ? formatAuctionValue(round.result.finalAmount)
                  : "-"}
              </TableCell>
            </TableRow>
          )}
          empty="No finalized results are available."
        />
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
            {rows.map(renderRow)}
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
