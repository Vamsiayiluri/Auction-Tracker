import { useEffect, useState } from "react";
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
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { uid } from "uid";
import { useSearchParams } from "react-router-dom";
import VisualTimer from "../VisualTimer";
import { socket } from "../../webSocket/socket";
import api from "../../utils/api";
import {
  formatCurrency,
  getNextBidAmount,
  getRemainingSeconds,
} from "../../utils/bidUtils";
import { useAuth } from "../../context/auth-context";

const LiveAuction = ({ userRole = "spectator" }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("id");
  const [timeLeft, setTimeLeft] = useState(0);
  const [endsAt, setEndsAt] = useState(null);
  const [highestBid, setHighestBid] = useState(null);
  const [highestBidder, setHighestBidder] = useState("");
  const [nextMinimumBid, setNextMinimumBid] = useState(null);
  const [auctionStatus, setAuctionStatus] = useState("idle");
  const [bidHistory, setBidHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(socket.connected);
  const [feedback, setFeedback] = useState(null);
  const [placingBid, setPlacingBid] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchCurrentPlayer = async () => {
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
          response.data.highestBid ?? response.data.player.basePrice
        );
        setHighestBidder(response.data.highestBidder || "");
        setNextMinimumBid(response.data.nextMinimumBid);
        setEndsAt(response.data.endsAt);
        setAuctionStatus(response.data.auctionStatus || "live");
        setResult(null);
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
      setNextMinimumBid(bid.nextMinimumBid);
      if (bid.endsAt) setEndsAt(bid.endsAt);
      setAuctionStatus("live");
      setPlacingBid(false);
      setBidHistory((current) =>
        current.some((item) => item.id === bid.id) ? current : [bid, ...current]
      );
    };

    const handleAuctionStarted = (player) => {
      if (player.tournamentId !== tournamentId) return;
      setCurrentPlayer(player);
      setHighestBid(player.basePrice);
      setHighestBidder("");
      setNextMinimumBid(player.nextMinimumBid);
      setBidHistory([]);
      setEndsAt(player.endsAt);
      setAuctionStatus("live");
      setResult(null);
      setFeedback(null);
    };

    const handleTimerUpdated = ({
      tournamentId: updatedTournamentId,
      endsAt: updatedEndsAt,
      highestBid: updatedHighestBid,
      highestBidder: updatedHighestBidder,
      nextMinimumBid: updatedNextMinimumBid,
    }) => {
      if (updatedTournamentId !== tournamentId) return;
      setEndsAt(updatedEndsAt);
      setAuctionStatus("live");
      if (typeof updatedHighestBid !== "undefined") {
        setHighestBid(updatedHighestBid);
      }
      if (typeof updatedHighestBidder !== "undefined") {
        setHighestBidder(updatedHighestBidder || "");
      }
      if (typeof updatedNextMinimumBid !== "undefined") {
        setNextMinimumBid(updatedNextMinimumBid);
      }
    };

    const handlePendingFinalization = (payload) => {
      if (payload.tournamentId !== tournamentId) return;
      setAuctionStatus("pending");
      setEndsAt(null);
      setTimeLeft(0);
      setHighestBid(payload.highestBid);
      setHighestBidder(payload.highestBidder || "");
      setNextMinimumBid(payload.nextMinimumBid);
      setPlacingBid(false);
    };

    const handleAuctionFinalized = (auctionResult) => {
      if (auctionResult.tournamentId !== tournamentId) return;
      setResult(auctionResult);
      setEndsAt(null);
      setTimeLeft(0);
      setAuctionStatus("completed");
      setPlacingBid(false);
    };

    const handleBidRejected = ({ message }) => {
      setPlacingBid(false);
      setFeedback({ severity: "warning", message });
    };

    const handleBidError = ({ message }) => {
      setPlacingBid(false);
      setFeedback({ severity: "error", message });
    };

    const handleConnect = () => {
      setConnected(true);
      if (tournamentId) socket.emit("join-tournament", { tournamentId });
    };
    const handleDisconnect = () => setConnected(false);

    fetchCurrentPlayer();
    if (tournamentId) socket.emit("join-tournament", { tournamentId });
    socket.on("new-bid", handleNewBid);
    socket.on("auction-started", handleAuctionStarted);
    socket.on("auction-timer-updated", handleTimerUpdated);
    socket.on("auction-extended", handleTimerUpdated);
    socket.on("auction-pending-finalization", handlePendingFinalization);
    socket.on("auction-finalized", handleAuctionFinalized);
    socket.on("bid-rejected", handleBidRejected);
    socket.on("bid-error", handleBidError);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      active = false;
      if (tournamentId) socket.emit("leave-tournament", { tournamentId });
      socket.off("new-bid", handleNewBid);
      socket.off("auction-started", handleAuctionStarted);
      socket.off("auction-timer-updated", handleTimerUpdated);
      socket.off("auction-extended", handleTimerUpdated);
      socket.off("auction-pending-finalization", handlePendingFinalization);
      socket.off("auction-finalized", handleAuctionFinalized);
      socket.off("bid-rejected", handleBidRejected);
      socket.off("bid-error", handleBidError);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!endsAt || result) return undefined;

    const updateTimer = () => setTimeLeft(getRemainingSeconds(endsAt));
    updateTimer();
    const timer = setInterval(updateTimer, 250);
    return () => clearInterval(timer);
  }, [endsAt, result]);

  useEffect(() => {
    if (userRole !== "team_owner" || !tournamentId) return undefined;

    let active = true;
    const fetchCurrentTeam = async () => {
      try {
        const response = await api.get(
          `/teams/getTeamByid/${user.id}?tournamentId=${tournamentId}`
        );
        if (active) setCurrentTeam(response.data.team);
      } catch {
        if (active) {
          setFeedback({
            severity: "error",
            message: "Your team could not be loaded for bidding.",
          });
        }
      }
    };

    fetchCurrentTeam();
    return () => {
      active = false;
    };
  }, [tournamentId, user.id, userRole]);

  const canBid =
    userRole === "team_owner" &&
    connected &&
    currentTeam &&
    currentPlayer &&
    currentTeam.tournamentId === currentPlayer.tournamentId &&
    auctionStatus === "live" &&
    timeLeft > 0 &&
    !result &&
    !placingBid &&
    highestBidder !== currentTeam.name;

  const placeBid = () => {
    if (!canBid) return;

    setFeedback(null);
    setPlacingBid(true);
    socket.emit("place-bid", {
      id: uid(),
      playerId: currentPlayer.id,
      teamId: currentTeam.id,
      ownerId: currentTeam.ownerId,
      teamName: currentTeam.name,
      tournamentId: currentPlayer.tournamentId,
      bidAmount: nextMinimumBid ?? getNextBidAmount(highestBid),
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!currentPlayer) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ py: 8, textAlign: "center" }}>
          <GavelRoundedIcon sx={{ fontSize: 48, color: "text.secondary" }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Waiting for the next player
          </Typography>
          <Typography color="text.secondary">
            {tournamentId
              ? "The live bidding panel will appear when the admin starts a round."
              : "Choose a live auction from your dashboard to open the correct tournament room."}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Live Auction</Typography>
          <Typography color="text.secondary">
            {userRole === "team_owner"
              ? auctionStatus === "pending"
                ? "Bidding is locked. Waiting for admin finalization."
                : "Place the next valid bid before the timer expires."
              : "You are watching this bidding round in real time."}
          </Typography>
        </Box>
        <Chip
          icon={<SensorsRoundedIcon />}
          label={connected ? "Connected Live" : "Reconnecting"}
          color={connected ? "success" : "warning"}
          variant="outlined"
        />
      </Stack>

      {feedback && (
        <Alert
          severity={feedback.severity}
          sx={{ mb: 3 }}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}
      {result && (
        <Alert severity={result.status === "sold" ? "success" : "info"} sx={{ mb: 3 }}>
          {result.status === "sold"
            ? `${result.playerName} sold to ${result.soldToTeamName} for ${formatCurrency(
                result.finalPrice
              )}.`
            : `${result.playerName} was marked unsold by the admin.`}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 1fr) 1fr" },
          gap: 2.5,
        }}
      >
        <Stack spacing={2.5}>
          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
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
                <Chip
                  label={
                    auctionStatus === "pending"
                      ? "Pending Finalization"
                      : auctionStatus === "live"
                        ? "Live"
                        : "Completed"
                  }
                  color={auctionStatus === "pending" ? "warning" : "success"}
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Current Highest Bid
                  </Typography>
                  <Typography variant="h4" color="primary.main" sx={{ mt: 0.5 }}>
                    {formatCurrency(highestBid)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {highestBidder || "No bids submitted yet"}
                  </Typography>
                </Box>
                {!result &&
                  (auctionStatus === "live" ? (
                    <VisualTimer timeLeft={timeLeft} />
                  ) : (
                    <Chip color="warning" label="Bidding locked" />
                  ))}
              </Stack>
              {auctionStatus === "pending" && !result && (
                <Alert severity="warning" sx={{ mt: 2.5 }}>
                  Timer ended. Highest bid is held while the admin decides to
                  extend, sell, or mark unsold.
                </Alert>
              )}
              {userRole === "team_owner" && !result && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    Next bid amount
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.25, mb: 2 }}>
                    {formatCurrency(nextMinimumBid ?? getNextBidAmount(highestBid))}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!canBid}
                    onClick={placeBid}
                  >
                    {placingBid ? "Placing Bid..." : "Place Bid"}
                  </Button>
                  {!canBid && highestBidder === currentTeam?.name && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      Your team currently holds the highest bid.
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Stack>

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
                <Typography fontWeight={600}>No bids yet</Typography>
                <Typography color="text.secondary" variant="body2">
                  The first accepted bid will appear here instantly.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default LiveAuction;
