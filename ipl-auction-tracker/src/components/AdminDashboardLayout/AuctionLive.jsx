import { useEffect, useMemo, useState } from "react";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { uid } from "uid";
import VisualTimer from "../VisualTimer";
import api from "../../utils/api";
import {
  formatCurrency,
  getRemainingSeconds,
} from "../../utils/bidUtils";
import { socket } from "../../webSocket/socket";

const roles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

const AuctionLive = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tournamentId = searchParams.get("id");
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [bidHistory, setBidHistory] = useState([]);
  const [highestBid, setHighestBid] = useState(null);
  const [highestBidder, setHighestBidder] = useState("");
  const [endsAt, setEndsAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTournaments = async () => {
      try {
        const response = await api.get("/tournament");
        if (active) setTournaments(response.data || []);
      } catch {
        if (active) setError("Unable to load tournaments for auction control.");
      }
    };

    const loadPlayers = async () => {
      if (!tournamentId) {
        setPlayers([]);
        return;
      }
      try {
        const response = await api.get(`/players?tournamentId=${tournamentId}`);
        if (active) setPlayers(response.data || []);
      } catch {
        if (active) setError("Unable to load the tournament player pool.");
      }
    };

    const loadCurrentRound = async () => {
      if (!tournamentId) {
        setCurrentPlayer(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/auction/currentPlayer?tournamentId=${tournamentId}`
        );
        if (!active) return;
        setCurrentPlayer(response.data.player);
        setBidHistory(response.data.bids || []);
        setHighestBid(
          response.data.bids.length
            ? response.data.bids[0].bidAmount
            : response.data.player.basePrice
        );
        setHighestBidder(response.data.bids[0]?.teamName || "");
        setEndsAt(response.data.endsAt);
      } catch {
        if (active) setCurrentPlayer(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleNewBid = (bid) => {
      if (bid.tournamentId !== tournamentId) return;
      setHighestBid(bid.bidAmount);
      setHighestBidder(bid.teamName);
      setBidHistory((current) =>
        current.some((item) => item.id === bid.id) ? current : [bid, ...current]
      );
    };

    const handleRoundStart = (player) => {
      if (player.tournamentId !== tournamentId) return;
      setCurrentPlayer(player);
      setBidHistory([]);
      setHighestBid(player.basePrice);
      setHighestBidder("");
      setEndsAt(player.endsAt);
      setResult(null);
      setBusy(false);
    };

    const handleTimerUpdate = ({ tournamentId: updatedTournamentId, endsAt: updatedEndsAt }) => {
      if (updatedTournamentId !== tournamentId) return;
      setEndsAt(updatedEndsAt);
    };

    const handleRoundFinalized = (roundResult) => {
      if (roundResult.tournamentId !== tournamentId) return;
      setResult(roundResult);
      setEndsAt(null);
      setTimeLeft(0);
      setCurrentPlayer(null);
      setSelectedPlayerId("");
      setBusy(false);
      loadPlayers();
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    loadTournaments();
    loadPlayers();
    loadCurrentRound();
    socket.on("new-bid", handleNewBid);
    socket.on("auction-started", handleRoundStart);
    socket.on("auction-timer-updated", handleTimerUpdate);
    socket.on("auction-finalized", handleRoundFinalized);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      active = false;
      socket.off("new-bid", handleNewBid);
      socket.off("auction-started", handleRoundStart);
      socket.off("auction-timer-updated", handleTimerUpdate);
      socket.off("auction-finalized", handleRoundFinalized);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!endsAt) return undefined;
    const updateTimer = () => setTimeLeft(getRemainingSeconds(endsAt));
    updateTimer();
    const timer = setInterval(updateTimer, 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const availablePlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.role === selectedRole &&
          !player.isInAuction &&
          !player.auctionId
      ),
    [players, selectedRole]
  );

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const selectedTournament = tournaments.find(
    (tournament) => tournament.id === tournamentId
  );

  const startRound = async () => {
    if (!selectedPlayer) return;

    setBusy(true);
    setError("");
    try {
      await api.post(`/auction/start/${selectedPlayer.id}`, {
        auctionId: uid(),
        tournamentId,
      });
    } catch (requestError) {
      setBusy(false);
      setError(
        requestError.response?.data?.message ||
          "Unable to start this player auction."
      );
    }
  };

  const closeRoundNow = async () => {
    if (!currentPlayer) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/auction/stop/${currentPlayer.id}`);
    } catch (requestError) {
      setBusy(false);
      setError(
        requestError.response?.data?.message ||
          "Unable to close this player auction."
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Auction Control</Typography>
          <Typography color="text.secondary">
            Select a tournament, start player rounds, and resume live auctions.
          </Typography>
        </Box>
        <Chip
          icon={<SensorsRoundedIcon />}
          label={connected ? "Connected Live" : "Reconnecting"}
          color={connected ? "success" : "warning"}
          variant="outlined"
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {result && (
        <Alert severity={result.status === "sold" ? "success" : "info"} sx={{ mb: 3 }}>
          {result.status === "sold"
            ? `${result.playerName} sold to ${result.soldToTeamName} for ${formatCurrency(
                result.finalPrice
              )}. Choose the next player to continue.`
            : `${result.playerName} went unsold. Choose the next player to continue.`}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6">Tournament control</Typography>
              <Typography color="text.secondary" variant="body2">
                Choose the tournament you want to run or resume.
              </Typography>
            </Box>
            <FormControl sx={{ minWidth: { xs: "100%", md: 320 } }}>
              <InputLabel>Tournament</InputLabel>
              <Select
                label="Tournament"
                value={tournamentId || ""}
                onChange={(event) => {
                  setSearchParams({ id: event.target.value });
                  setSelectedRole("");
                  setSelectedPlayerId("");
                  setCurrentPlayer(null);
                  setBidHistory([]);
                  setHighestBid(null);
                  setHighestBidder("");
                  setEndsAt(null);
                  setTimeLeft(0);
                  setResult(null);
                }}
              >
                {tournaments.map((tournament) => (
                  <MenuItem key={tournament.id} value={tournament.id}>
                    {tournament.name} ({tournament.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {!tournamentId && (
        <Alert severity="info">
          Select a tournament above to view its current player, resume an active
          round, or start the next player.
        </Alert>
      )}

      {tournamentId && !currentPlayer ? (
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <GavelRoundedIcon color="primary" />
              <Typography variant="h6">Start a Player Round</Typography>
            </Stack>
            {selectedTournament?.status === "completed" && (
              <Alert severity="info" sx={{ mb: 3 }}>
                This tournament is completed. No more player rounds are
                available.
              </Alert>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
                gap: 2,
                alignItems: "start",
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Player role</InputLabel>
                <Select
                  label="Player role"
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value);
                    setSelectedPlayerId("");
                  }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!selectedRole}>
                <InputLabel>Player</InputLabel>
                <Select
                  label="Player"
                  value={selectedPlayerId}
                  onChange={(event) => setSelectedPlayerId(event.target.value)}
                >
                  {availablePlayers.length ? (
                    availablePlayers.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.name} - {formatCurrency(player.basePrice)}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No available players</MenuItem>
                  )}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<GavelRoundedIcon />}
                disabled={!selectedPlayer || busy || !connected}
                onClick={startRound}
              >
                {busy ? "Starting..." : "Start Round"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : tournamentId && currentPlayer ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(350px, 1fr) 1fr" },
            gap: 2.5,
          }}
        >
          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Current Player
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {currentPlayer.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Chip label={currentPlayer.role} variant="outlined" />
                    <Chip
                      label={`Base ${formatCurrency(currentPlayer.basePrice)}`}
                      variant="outlined"
                    />
                  </Stack>
                </Box>
                <VisualTimer timeLeft={timeLeft} />
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Typography color="text.secondary" variant="body2">
                Current Highest Bid
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ mt: 0.5 }}>
                {formatCurrency(highestBid)}
              </Typography>
              <Typography color="text.secondary">
                {highestBidder || "No bids submitted yet"}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                sx={{ mt: 3 }}
                disabled={busy}
                onClick={closeRoundNow}
              >
                {busy ? "Closing..." : "Close Round Now"}
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Bid Stream
              </Typography>
              {bidHistory.length ? (
                <List disablePadding>
                  {bidHistory.map((bid, index) => (
                    <ListItem
                      key={bid.id}
                      disableGutters
                      divider={index < bidHistory.length - 1}
                    >
                      <ListItemText
                        primary={bid.teamName}
                        secondary={`Bid ${formatCurrency(bid.bidAmount)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography fontWeight={600}>No bids submitted</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Accepted bids will appear here live.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      ) : null}
    </Box>
  );
};

export default AuctionLive;
