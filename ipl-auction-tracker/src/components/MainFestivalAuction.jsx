import { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import VisualTimer from "./VisualTimer";
import { getRemainingSeconds } from "../utils/bidUtils";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const eventNames = [
  "auction-started",
  "participant-started",
  "bid-placed",
  "participant-sold",
  "participant-unsold",
  "participants-reauctioned",
  "auction-paused",
  "auction-resumed",
  "auction-extended",
  "auction-timer-updated",
  "auction-pending-finalization",
  "auction-completed",
];

export default function MainFestivalAuction({
  festivalId,
  onRosterChanged,
  showHistory = true,
}) {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUnsoldIds, setSelectedUnsoldIds] = useState([]);

  const loadAuction = useCallback(async () => {
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        api.get(`/v2/festivals/${festivalId}/auction/current`),
        showHistory
          ? api.get(`/v2/festivals/${festivalId}/auction/history`)
          : null,
      ]);
      setState(currentResponse.data.data);
      if (historyResponse) setHistory(historyResponse.data.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load the Main Festival Auction."
      );
    }
  }, [festivalId, showHistory]);

  useEffect(() => {
    loadAuction();
    socket.emit("join-festival-auction", { festivalId });
    const refresh = () => loadAuction();
    eventNames.forEach((eventName) => socket.on(eventName, refresh));
    return () => {
      socket.emit("leave-festival-auction", { festivalId });
      eventNames.forEach((eventName) => socket.off(eventName, refresh));
    };
  }, [festivalId, loadAuction]);

  const currentEndsAt = state?.current?.endsAt;

  useEffect(() => {
    const endsAt = currentEndsAt;
    if (!endsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const updateTimer = () => setTimeLeft(getRemainingSeconds(endsAt));
    updateTimer();
    const timer = setInterval(updateTimer, 250);
    return () => clearInterval(timer);
  }, [currentEndsAt]);

  const runAction = async (
    path,
    successMessage,
    rosterChanged = false,
    body = {}
  ) => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}${path}`, body);
      setNotice(successMessage);
      setSelectedParticipantId("");
      setBasePrice("");
      await loadAuction();
      if (rosterChanged) onRosterChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Auction action failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const placeBid = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}/auction/bid`, {});
      setNotice("Bid accepted.");
      await loadAuction();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Bid was not accepted."
      );
    } finally {
      setBusy(false);
    }
  };

  const config = state?.config;
  const current = state?.current;
  const isAdmin = state?.viewer?.isAdmin;
  const isOwner = state?.viewer?.isOwner;
  const status = config?.auctionStatus || "setup";
  const leadingBid = current?.bids?.at(-1);
  const unsold = state?.unsold || [];
  const roundStatus = current?.status;
  const ownBudget = useMemo(
    () =>
      state?.budgets?.find(
        ({ festivalTeamId }) =>
          festivalTeamId === state?.viewer?.festivalTeamId
      ),
    [state]
  );

  return (
    <Card id="festival-auction" variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Main Festival Auction</Typography>
            <Typography color="text.secondary">
              This auction creates the primary Festival Team rosters.
            </Typography>
          </Box>
          <Chip
            color={status === "live" ? "success" : "default"}
            label={`Status: ${status}`}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setNotice("")}
          >
            {notice}
          </Alert>
        )}

        {isAdmin && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            sx={{ mb: 3 }}
          >
            <Button
              variant="contained"
              disabled={busy || status !== "setup"}
              onClick={() =>
                runAction("/auction/start", "Festival auction started.")
              }
            >
              Start Auction
            </Button>
            <Button
              variant="outlined"
              disabled={busy || status !== "live"}
              onClick={() =>
                runAction("/auction/pause", "Festival auction paused.")
              }
            >
              Pause
            </Button>
            <Button
              variant="outlined"
              disabled={busy || status !== "paused"}
              onClick={() =>
                runAction("/auction/resume", "Festival auction resumed.")
              }
            >
              Resume
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={
                busy ||
                !["live", "paused"].includes(status) ||
                Boolean(current)
              }
              onClick={() =>
                runAction("/auction/complete", "Festival auction completed.")
              }
            >
              End Auction
            </Button>
          </Stack>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Current Participant
              </Typography>
              {current ? (
                <Stack spacing={1}>
                  <Typography variant="h5">
                    {current.participant?.employee?.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {current.participant?.employee?.employeeNumber} |{" "}
                    {current.participant?.employee?.department || "Department not set"}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {(current.participant?.sports || []).map((registration) => (
                      <Chip
                        key={registration.id}
                        size="small"
                        label={registration.sport?.name || registration.sportId}
                      />
                    ))}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Sport Count: ${current.participant?.sportCount || 0}`}
                    />
                  </Stack>
                  <Divider />
                  <Typography>
                    Base Price: <strong>{formatMoney(current.basePrice)}</strong>
                  </Typography>
                  <Typography>
                    Bid Increment:{" "}
                    <strong>
                      {current.incrementPercentage}% (
                      {formatMoney(current.incrementAmount)})
                    </strong>
                  </Typography>
                  <Typography>
                    Current Bid: <strong>{formatMoney(current.currentBid)}</strong>
                  </Typography>
                  <Typography>
                    Next Bid: <strong>{formatMoney(current.nextBid)}</strong>
                  </Typography>
                  <Typography>
                    Leading Team: {leadingBid?.teamName || "-"}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {roundStatus === "live" ? (
                      <VisualTimer timeLeft={timeLeft} />
                    ) : (
                      <Chip
                        color={roundStatus === "pending" ? "warning" : "default"}
                        label={
                          roundStatus === "pending"
                            ? "Pending Finalization"
                            : roundStatus
                        }
                      />
                    )}
                    <Typography color="text.secondary">
                      {roundStatus === "live"
                        ? "Timer resets after every accepted bid."
                        : roundStatus === "pending"
                          ? "Bidding is locked."
                          : "Round timer is paused."}
                    </Typography>
                  </Stack>
                </Stack>
              ) : (
                <Typography color="text.secondary">
                  No participant is currently active.
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Remaining Purse
              </Typography>
              <Stack spacing={1}>
                {(state?.teamSummaries || []).map((budget) => (
                  <Card key={budget.festivalTeamId} variant="outlined">
                    <CardContent>
                      <Typography fontWeight={700}>{budget.team?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Owner: {budget.owner?.employee?.name || "Not assigned"}
                      </Typography>
                      <Typography>Remaining: {formatMoney(budget.remainingBudget)}</Typography>
                      <Typography variant="body2">
                        Purchased {budget.playersPurchased} | Retentions{" "}
                        {budget.retentions} | Roster {budget.currentRosterCount}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {isOwner && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1">Owner Controls</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Your remaining purse: {formatMoney(ownBudget?.remainingBudget)}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Next bid: {formatMoney(current?.nextBid)}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                disabled={
                  busy ||
                  status !== "live" ||
                  roundStatus !== "live" ||
                  timeLeft <= 0 ||
                  !current ||
                  leadingBid?.festivalTeamId === state?.viewer?.festivalTeamId
                }
                onClick={placeBid}
              >
                Place Bid
              </Button>
            </CardContent>
          </Card>
        )}

        {isAdmin && !current && ["live", "paused"].includes(status) && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 3 }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Next Participant</InputLabel>
              <Select
                label="Next Participant"
                value={selectedParticipantId}
                onChange={(event) =>
                  setSelectedParticipantId(event.target.value)
                }
              >
                {(state?.pool || []).map((participant) => (
                  <MenuItem key={participant.id} value={participant.id}>
                    {participant.employee?.employeeNumber} -{" "}
                    {participant.employee?.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Base Price"
              type="number"
              size="small"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
            />
            <Button
              variant="contained"
              disabled={
                busy ||
                status !== "live" ||
                !selectedParticipantId ||
                !Number(basePrice)
              }
              onClick={() =>
                runAction(
                  `/auction/participants/${selectedParticipantId}/start`,
                  "Participant bidding started.",
                  false,
                  { basePrice: Number(basePrice) }
                )
              }
            >
              Next Participant
            </Button>
          </Stack>
        )}

        {isAdmin && current && (
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            {roundStatus === "pending" && (
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() =>
                  runAction("/auction/extend", "Auction timer extended.")
                }
              >
                Extend 20 Seconds
              </Button>
            )}
            <Button
              variant="contained"
              disabled={busy || roundStatus !== "pending" || !leadingBid}
              onClick={() =>
                runAction(
                  `/auction/participants/${current.festivalParticipantId}/sell`,
                  "Participant sold and added to the winning roster.",
                  true
                )
              }
            >
              Sell
            </Button>
            <Button
              color="warning"
              variant="outlined"
              disabled={busy || roundStatus !== "pending"}
              onClick={() =>
                runAction(
                  `/auction/participants/${current.festivalParticipantId}/unsold`,
                  "Participant marked unsold."
                )
              }
            >
              Unsold
            </Button>
          </Stack>
        )}

        {isAdmin && unsold.length > 0 && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1">Unsold Players</Typography>
              <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                <Button
                  variant="outlined"
                  disabled={busy || !selectedUnsoldIds.length || Boolean(current)}
                  onClick={() =>
                    runAction(
                      "/auction/reauction",
                      "Selected players returned to the auction pool.",
                      false,
                      { participantIds: selectedUnsoldIds }
                    ).then(() => setSelectedUnsoldIds([]))
                  }
                >
                  Re-Auction Selected
                </Button>
                <Button
                  variant="outlined"
                  disabled={busy || Boolean(current)}
                  onClick={() =>
                    runAction(
                      "/auction/reauction",
                      "All unsold players returned to the auction pool."
                    )
                  }
                >
                  Re-Auction All
                </Button>
              </Stack>
              {unsold.map((participant) => (
                <Stack
                  key={participant.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <input
                    type="checkbox"
                    checked={selectedUnsoldIds.includes(participant.id)}
                    onChange={() =>
                      setSelectedUnsoldIds((currentIds) =>
                        currentIds.includes(participant.id)
                          ? currentIds.filter((id) => id !== participant.id)
                          : [...currentIds, participant.id]
                      )
                    }
                  />
                  <Typography>
                    {participant.employee?.employeeNumber} -{" "}
                    {participant.employee?.name} (re-auctions:{" "}
                    {participant.reauctionCount})
                  </Typography>
                </Stack>
              ))}
            </CardContent>
          </Card>
        )}

        <Typography variant="subtitle1">Bid History</Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bid Number</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Placed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(current?.bids || []).map((bid) => (
                <TableRow key={bid.id}>
                  <TableCell>{bid.bidNumber}</TableCell>
                  <TableCell>{bid.teamName}</TableCell>
                  <TableCell>{formatMoney(bid.amount)}</TableCell>
                  <TableCell>
                    {new Date(bid.placedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {showHistory && (
          <>
            <Typography variant="subtitle1">Auction History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Participant</TableCell>
                    <TableCell>Outcome</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Final Amount</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell>
                        {auction.participant?.employee?.employeeNumber} -{" "}
                        {auction.participant?.employee?.name}
                      </TableCell>
                      <TableCell>{auction.result?.outcome || auction.status}</TableCell>
                      <TableCell>{auction.result?.teamName || "-"}</TableCell>
                      <TableCell>
                        {auction.result?.finalAmount
                          ? formatMoney(auction.result.finalAmount)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {auction.result?.finalizedAt
                          ? new Date(auction.result.finalizedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
