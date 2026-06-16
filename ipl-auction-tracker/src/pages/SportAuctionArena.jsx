import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SportArenaHeader from "../components/SportAuctionArena/SportArenaHeader";
import SportParticipantStage from "../components/SportAuctionArena/SportParticipantStage";
import {
  CaptainPanel,
  TeamCreditComparison,
} from "../components/SportAuctionArena/SportTeamPanels";
import SportLiveBidStream from "../components/SportAuctionArena/SportLiveBidStream";
import SportQueueSummary from "../components/SportAuctionArena/SportQueueSummary";
import SportRecentResultsStrip from "../components/SportAuctionArena/SportRecentResultsStrip";
import {
  CaptainBidControl,
  OwnerLifecycleControls,
  PendingFinalizationControls,
} from "../components/SportAuctionArena/SportRoleControls";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import {
  getAuctionRemainingSeconds,
  getServerClockOffsetMs,
  mergeAuctionSnapshotState,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";

const credits = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const participantName = (record) =>
  record?.participant?.employee?.name || "Participant";

export default function SportAuctionArena() {
  const { sportTournamentId } = useParams();
  const navigate = useNavigate();
  const actionInFlight = useRef(false);
  const loadInFlight = useRef(false);
  const queuedLoad = useRef(false);
  const queuedForceState = useRef(false);
  const expiryRefreshInFlight = useRef(false);
  const lastRevision = useRef(0);
  const [state, setState] = useState(null);
  const [tournamentDetails, setTournamentDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [baseCredits, setBaseCredits] = useState("");
  const [selectedUnsoldIds, setSelectedUnsoldIds] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [roomJoined, setRoomJoined] = useState(false);
  const [error, setError] = useState("");
  const [contextWarning, setContextWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const load = useCallback(async ({ background = false, forceState = false } = {}) => {
    if (loadInFlight.current) {
      queuedLoad.current = true;
      queuedForceState.current = queuedForceState.current || forceState;
      return;
    }
    loadInFlight.current = true;
    if (background) setRefreshing(true);
    const requestRevision = lastRevision.current;
    try {
      const [currentResponse, historyResponse] = await Promise.all([
          api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/current`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/history`),
        ]);
      const nextState = currentResponse.data.data;
      const socketAdvancedDuringRequest =
        lastRevision.current > requestRevision;
      const preserveSocketState =
        lastRevision.current &&
        socket.connected &&
        (!forceState || socketAdvancedDuringRequest);
      setState((previous) =>
        preserveSocketState
          ? { ...previous, viewer: nextState.viewer }
          : nextState
      );
      if (!preserveSocketState) {
        setHistory(historyResponse.data.data || []);
      }
      if (nextState.serverTime) {
        setClockOffsetMs(getServerClockOffsetMs(nextState.serverTime));
      }
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to synchronize the Sport Auction."
      );
    } finally {
      loadInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
      if (queuedLoad.current) {
        const forceQueuedState = queuedForceState.current;
        queuedLoad.current = false;
        queuedForceState.current = false;
        void load({ background: true, forceState: forceQueuedState });
      }
    }
  }, [sportTournamentId]);

  useEffect(() => {
    let active = true;
    api
      .get(`/v2/sport-tournaments/${sportTournamentId}`)
      .then((response) => {
        if (!active) return;
        setTournamentDetails(response.data.data);
        setContextWarning("");
      })
      .catch(() => {
        if (active) {
          setContextWarning(
            "Tournament context is temporarily unavailable. Live Auction state remains connected."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [sportTournamentId]);

  useEffect(() => {
    const applySnapshot = (payload) => {
      if (
        payload?.scopeType !== "sport" ||
        payload.scopeId !== sportTournamentId ||
        !shouldApplyAuctionSnapshot(lastRevision.current, payload)
      ) {
        return;
      }
      lastRevision.current = payload.revision;
      setClockOffsetMs(getServerClockOffsetMs(payload.serverTime));
      setState((previous) => mergeAuctionSnapshotState(previous, payload));
      setHistory(payload.history || []);
      setRefreshing(false);
    };
    const joinRoom = () => {
      setConnected(true);
      socket.emit("join-sport-auction", { sportTournamentId }, (response) => {
        setRoomJoined(Boolean(response?.success));
        if (response?.serverTime) {
          setClockOffsetMs(getServerClockOffsetMs(response.serverTime));
        }
        if (!response?.success) {
          setError(response?.message || "Unable to join live auction updates.");
        }
      });
    };
    const disconnect = () => {
      setConnected(false);
      setRoomJoined(false);
    };

    void load();
    socket.on("auction-state", applySnapshot);
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    socket.on("disconnect", disconnect);
    return () => {
      socket.emit("leave-sport-auction", { sportTournamentId });
      socket.off("connect", joinRoom);
      socket.off("disconnect", disconnect);
      socket.off("auction-state", applySnapshot);
    };
  }, [load, sportTournamentId]);

  const currentEndsAt = state?.current?.endsAt;
  useEffect(() => {
    if (!currentEndsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const tick = () =>
      setTimeLeft(getAuctionRemainingSeconds(currentEndsAt, clockOffsetMs));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [clockOffsetMs, currentEndsAt]);

  const run = async (
    path,
    body = {},
    message = "Auction updated.",
    action = "action"
  ) => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction(action);
    setError("");
    try {
      await api.post(
        `/v2/sport-tournaments/${sportTournamentId}/auction${path}`,
        body
      );
      setNotice(message);
      setParticipant(null);
      setBaseCredits("");
      setSelectedUnsoldIds([]);
      if (!socket.connected) {
        await load({ background: true, forceState: true });
      }
      return true;
    } catch (requestError) {
      await load({ background: true, forceState: true });
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.errors?.[0]?.message ||
          "Auction action failed. The latest server state has been loaded."
      );
      return false;
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      setActiveAction("");
    }
  };

  const placeBid = async () => {
    const current = state?.current;
    if (!current || actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction("bid");
    setError("");
    try {
      await api.post(
        `/v2/sport-tournaments/${sportTournamentId}/auction/bid`,
        {
          auctionId: current.id,
          expectedCurrentBid: current.currentCredits,
        }
      );
      setNotice("Bid accepted.");
      if (!socket.connected) {
        await load({ background: true, forceState: true });
      }
    } catch (requestError) {
      await load({ background: true, forceState: true });
      setError(
        requestError.response?.data?.message ||
          "Bid was not accepted. The latest state is loading."
      );
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      setActiveAction("");
    }
  };

  const requestConfirmation = (title, description, action) =>
    setConfirmation({ title, description, action });

  const current = state?.current;
  const canManage = Boolean(state?.viewer?.canManage);
  const canBid = Boolean(state?.viewer?.canBid);
  const viewerTeamId = state?.viewer?.sportTeamId;
  const ownTeam = state?.teams?.find(
    ({ sportTeamId }) => sportTeamId === viewerTeamId
  );
  const available = useMemo(
    () =>
      (state?.pool || []).filter(
        ({ state: poolState, isCurrent }) =>
          poolState === "available" && !isCurrent
      ),
    [state]
  );
  const unsold = useMemo(
    () =>
      (state?.pool || []).filter(
        ({ state: poolState }) => poolState === "unsold"
      ),
    [state]
  );
  const recentResults = useMemo(
    () => history.filter(({ result }) => Boolean(result)).slice(0, 4),
    [history]
  );
  const totalParticipants =
    Number(state?.counts?.sold || 0) +
    Number(state?.counts?.unsold || 0) +
    available.length +
    (current ? 1 : 0);
  const progress = {
    sold: state?.counts?.sold || 0,
    unsold: state?.counts?.unsold || 0,
    remaining: available.length + unsold.length + (current ? 1 : 0),
    current: current
      ? Math.min(Number(state?.counts?.sold || 0) + 1, totalParticipants)
      : 0,
    total: totalParticipants,
  };
  const projectedRosterSize = state?.teams?.length
    ? Math.ceil(
        ((state.teams || []).reduce(
          (total, team) => total + (team.roster?.length || 0),
          0
        ) +
          available.length +
          unsold.length +
          (current ? 1 : 0)) /
          state.teams.length
      )
    : 0;
  const remainingSlots = Math.max(
    0,
    projectedRosterSize - Number(ownTeam?.roster?.length || 0)
  );
  const reauctionCount = unsold.reduce(
    (total, entry) => total + Number(entry.reauctionCount || 0),
    0
  );
  const status =
    current?.status === "pending"
      ? "pending_finalization"
      : state?.tournament?.status;
  const bidDisabledReason = useMemo(() => {
    if (!current) return "Waiting for the next participant.";
    if (state?.tournament?.status !== "auction_live") {
      return state?.tournament?.status === "auction_paused"
        ? "The Auction is paused."
        : "The Auction is not live.";
    }
    if (current.status !== "live" || timeLeft <= 0) {
      return "Bidding is locked pending finalization.";
    }
    if (current.bids?.at(-1)?.sportTeamId === viewerTeamId) {
      return "Your Team already leads this round.";
    }
    if (Number(current.nextCredits) > Number(ownTeam?.remainingCredits || 0)) {
      return "Your Team does not have enough remaining credits.";
    }
    if (busy) return "Another Auction action is processing.";
    return "";
  }, [
    busy,
    current,
    ownTeam?.remainingCredits,
    state?.tournament?.status,
    timeLeft,
    viewerTeamId,
  ]);
  const locallyExpired = current?.status === "live" && timeLeft <= 0;

  useEffect(() => {
    if (!locallyExpired || !current?.id) {
      expiryRefreshInFlight.current = false;
      return undefined;
    }

    const confirmServerExpiry = async () => {
      if (expiryRefreshInFlight.current) return;
      expiryRefreshInFlight.current = true;
      try {
        await load({ background: true, forceState: true });
      } finally {
        expiryRefreshInFlight.current = false;
      }
    };

    void confirmServerExpiry();
    const retryTimer = window.setInterval(confirmServerExpiry, 1000);
    return () => window.clearInterval(retryTimer);
  }, [current?.id, load, locallyExpired]);

  if (loading && !state) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography color="text.secondary">
          Synchronizing Sport Auction...
        </Typography>
      </Stack>
    );
  }

  return (
    <Box id="sport-auction-arena">
      {refreshing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      <SportArenaHeader
        tournamentName={state?.tournament?.name}
        status={status}
        connected={connected}
        roomJoined={roomJoined}
        progress={progress}
        teamName={state?.viewer?.sportTeamName}
        onExit={() =>
          navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
          action={
            <Button
              color="inherit"
              onClick={() => load({ background: true, forceState: true })}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {contextWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {contextWarning}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      {canManage && (
        <OwnerLifecycleControls
          status={state?.tournament?.status}
          current={current}
          busy={busy}
          activeAction={activeAction}
          onRun={run}
          onConfirm={requestConfirmation}
        />
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1.65fr) minmax(300px, 0.75fr)",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        <SportParticipantStage
          current={current}
          festivalTeamName={tournamentDetails?.festivalTeam?.name}
          timeLeft={timeLeft}
          formatCredits={credits}
        >
          {canBid && (
            <CaptainBidControl
              current={current}
              disabledReason={bidDisabledReason}
              activeAction={activeAction}
              onBid={placeBid}
            />
          )}
          {canManage &&
            !current &&
            state?.tournament?.status === "auction_live" && (
              <RoundControls
                available={available}
                participant={participant}
                baseCredits={baseCredits}
                busy={busy}
                activeAction={activeAction}
                onParticipantChange={setParticipant}
                onBaseCreditsChange={setBaseCredits}
                onStart={() =>
                  run(
                    `/participants/${participant.festivalParticipantId}/start`,
                    { baseCredits: Number(baseCredits) },
                    "Participant round started.",
                    "start-round"
                  )
                }
              />
            )}
          {canManage && current?.status === "pending" && (
            <PendingFinalizationControls
              current={current}
              busy={busy}
              activeAction={activeAction}
              formatCredits={credits}
              onRun={run}
              onConfirm={requestConfirmation}
            />
          )}
        </SportParticipantStage>

        <Stack spacing={2}>
          {canBid && (
            <CaptainPanel
              team={ownTeam}
              remainingSlots={remainingSlots}
              formatCredits={credits}
            />
          )}
          <TeamCreditComparison
            teams={state?.teams || []}
            viewerTeamId={viewerTeamId}
            formatCredits={credits}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1.4fr) minmax(300px, 0.8fr)",
          },
          gap: 2,
          alignItems: "stretch",
          my: 2,
        }}
      >
        <SportLiveBidStream
          bids={current?.bids || []}
          viewerTeamId={viewerTeamId}
          formatCredits={credits}
        />
        <SportQueueSummary
          available={available}
          unsold={unsold}
          reauctionCount={reauctionCount}
          canManage={canManage}
          busy={busy}
          currentActive={Boolean(current)}
          reauctionEnabled={Boolean(state?.config?.reauctionEnabled)}
          selectedUnsoldIds={selectedUnsoldIds}
          onToggleUnsold={(id) =>
            setSelectedUnsoldIds((ids) =>
              ids.includes(id)
                ? ids.filter((selectedId) => selectedId !== id)
                : [...ids, id]
            )
          }
          onReauction={() =>
            requestConfirmation(
              "Return participants to the Pool?",
              `${selectedUnsoldIds.length} participant(s) will become available for a new auction attempt.`,
              () =>
                run(
                  "/reauction",
                  { participantIds: selectedUnsoldIds },
                  "Participants returned to the available pool.",
                  "reauction"
                )
            )
          }
        />
      </Box>

      <SportRecentResultsStrip
        results={recentResults}
        formatCredits={credits}
      />

      <Dialog
        open={Boolean(confirmation)}
        onClose={() => !busy && setConfirmation(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogContent dividers>
          <Typography>{confirmation?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setConfirmation(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              const action = confirmation?.action;
              setConfirmation(null);
              await action?.();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function RoundControls({
  available,
  participant,
  baseCredits,
  busy,
  activeAction,
  onParticipantChange,
  onBaseCreditsChange,
  onStart,
}) {
  return (
    <Card variant="outlined" sx={{ mt: 3, textAlign: "left" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Round Controls
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Select an available participant and set the opening credits.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Autocomplete
            fullWidth
            options={available}
            value={participant}
            onChange={(_, value) => onParticipantChange(value)}
            getOptionLabel={participantName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No available participants"
            renderInput={(params) => (
              <TextField {...params} label="Available participant" size="small" />
            )}
            disabled={busy}
          />
          <TextField
            label="Base Credits"
            type="number"
            size="small"
            value={baseCredits}
            onChange={(event) => onBaseCreditsChange(event.target.value)}
            inputProps={{ min: 1 }}
            disabled={busy}
          />
          <Button
            variant="contained"
            disabled={busy || !participant || !Number(baseCredits)}
            onClick={onStart}
            sx={{ whiteSpace: "nowrap" }}
          >
            {activeAction === "start-round" ? "Starting..." : "Start Round"}
          </Button>
        </Stack>
        {!available.length && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No available participants remain. Re-auction unsold participants or
            complete the auction.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
