import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getApiMessage, getArrayData, getData } from "../utils/apiResponse";
import { safeApplySocketEvent } from "../utils/safeSocketEvent";
import { socket } from "../webSocket/socket";
import useSocketHealth from "../hooks/useSocketHealth";
import {
  getAuctionRemainingSeconds,
  getServerClockOffsetMs,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";
import {
  applyAuctionSnapshotEvent,
  applySportBidEvent,
  applySportParticipantStartedEvent,
  applySportTimerEvent,
  applySynchronizedClock,
  getRoundTimerDurationSeconds,
} from "../utils/liveAuctionEventApplication";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";
import {
  getSportAuctionStageFromState,
  isSetupStage,
  isReadyStage,
  isCompletedStage,
} from "../utils/auctionStages";

const credits = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const participantName = (record) =>
  record?.participant?.employee?.name || "Participant";

const logBidUiTrace = (details) =>
  console.info("[BID_UI_TRACE]", {
    timestamp: new Date().toISOString(),
    ...details,
  });

export default function SportAuctionArena() {
  const { sportTournamentId } = useParams();
  const navigate = useNavigate();
  const actionInFlight = useRef(false);
  const loadInFlight = useRef(false);
  const queuedLoad = useRef(false);
  const queuedForceState = useRef(false);
  const expiryRefreshInFlight = useRef(false);
  const lastRevision = useRef(0);
  const currentAuctionId = useRef(null);
  const bidRequestStartedAt = useRef(null);
  const clockOffsetRef = useRef(0);
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [roomJoined, setRoomJoined] = useState(false);
  const [error, setError] = useState("");
  const [contextWarning, setContextWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [resultToast, setResultToast] = useState(null);
  const socketHealth = useSocketHealth();
  const lastResultId = useRef(null);
  const [confirmation, setConfirmation] = useState(null);

  const load = useCallback(async ({ background = false, forceState = false } = {}) => {
    if (loadInFlight.current) {
      queuedLoad.current = true;
      queuedForceState.current = queuedForceState.current || forceState;
      return false;
    }
    loadInFlight.current = true;
    if (background) setRefreshing(true);
    const requestRevision = lastRevision.current;
    try {
      const [currentResult, historyResult] = await Promise.allSettled([
          api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/current`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/history`),
        ]);
      if (currentResult.status !== "fulfilled") throw currentResult.reason;
      const nextState = getData(currentResult.value, null);
      const historyResponse =
        historyResult.status === "fulfilled" ? historyResult.value : null;
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
        setHistory(getArrayData(historyResponse));
      }
      if (nextState.serverTime) {
        setClockOffsetMs(getServerClockOffsetMs(nextState.serverTime));
      }
      setError("");
      return true;
    } catch (requestError) {
      setError(
        getApiMessage(requestError, "Unable to synchronize the Sport Auction.")
      );
      return false;
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

  const manualRefresh = useCallback(async () => {
    if (refreshing || busy) return;
    setNotice("");
    const success = await load({ background: true, forceState: true });
    if (success) {
      setLastUpdated(new Date());
      setNotice("Live auction updated.");
      if (socket.connected && !roomJoined) {
        socket.emit("join-sport-auction", { sportTournamentId }, (response) => {
          setRoomJoined(Boolean(response?.success));
          if (response?.serverTime) {
            setClockOffsetMs(getServerClockOffsetMs(response.serverTime));
          }
        });
      }
    }
  }, [busy, load, refreshing, roomJoined, sportTournamentId]);

  useEffect(() => {
    currentAuctionId.current = state?.current?.id || null;
  }, [state]);

  useEffect(() => {
    clockOffsetRef.current = clockOffsetMs;
  }, [clockOffsetMs]);

  useEffect(() => {
    let active = true;
    api
      .get(`/v2/sport-tournaments/${sportTournamentId}`)
      .then((response) => {
        if (!active) return;
        setTournamentDetails(getData(response, null));
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
      const reconcileStartedAt = performance.now();
      if (
        payload?.scopeType !== "sport" ||
        payload.scopeId !== sportTournamentId ||
        !shouldApplyAuctionSnapshot(lastRevision.current, payload)
      ) {
        return;
      }
      if (payload.reason === "bid-placed") {
        logBidUiTrace({
          scopeType: "sport",
          sportTournamentId,
          phase: "auctionStateReceived",
          revision: payload.revision,
        });
      }
      lastRevision.current = payload.revision;
      safeApplySocketEvent({
        eventName: "sport:auction-state",
        payload,
        fallbackRefresh: () => void load({ background: true, forceState: true }),
        setError,
        apply: () => {
          setClockOffsetMs(getServerClockOffsetMs(payload.serverTime));
          setState((previous) => applyAuctionSnapshotEvent(previous, payload));
          setHistory(payload.history || []);
          setRefreshing(false);
        },
      });
      if (payload.reason === "bid-placed") {
        logBidUiTrace({
          scopeType: "sport",
          sportTournamentId,
          phase: "snapshotReconciliationComplete",
          revision: payload.revision,
          reconciliationLatencyMs: Number(
            (performance.now() - reconcileStartedAt).toFixed(2)
          ),
          snapshotLatencyMs: bidRequestStartedAt.current
            ? Number((performance.now() - bidRequestStartedAt.current).toFixed(2))
            : null,
        });
      }
    };
    const applyBidPlaced = (payload) => {
      const updateStartedAt = performance.now();
      if (payload?.sportTournamentId !== sportTournamentId) return;
      if (payload?.sportAuctionId !== currentAuctionId.current) return;
      safeApplySocketEvent({
        eventName: "sport:bid-placed",
        payload,
        fallbackRefresh: () => void load({ background: true, forceState: true }),
        setError,
        apply: () => {
          applySynchronizedClock(payload, setClockOffsetMs, clockOffsetRef.current);
      logBidUiTrace({
        scopeType: "sport",
        sportTournamentId,
        phase: "sportBidPlacedReceived",
        auctionId: payload.sportAuctionId,
        bidId: payload.id,
      });
          setState((previous) => applySportBidEvent(previous, payload));
        },
      });
      logBidUiTrace({
        scopeType: "sport",
        sportTournamentId,
        phase: "uiUpdated",
        auctionId: payload.sportAuctionId,
        bidId: payload.id,
        perceivedLatencyMs: Number(
          (
            performance.now() -
            (bidRequestStartedAt.current || updateStartedAt)
          ).toFixed(2)
        ),
        updateLatencyMs: Number((performance.now() - updateStartedAt).toFixed(2)),
      });
    };
    const applyParticipantStarted = (payload) => {
      if (payload?.sportTournamentId !== sportTournamentId) return;
      safeApplySocketEvent({
        eventName: "sport:participant-started",
        payload,
        fallbackRefresh: () => void load({ background: true, forceState: true }),
        setError,
        apply: () => {
          applySynchronizedClock(payload, setClockOffsetMs, clockOffsetRef.current);
          setState((previous) => applySportParticipantStartedEvent(previous, payload));
        },
      });
    };
    const applyTimerUpdated = (payload) => {
      if (payload?.sportTournamentId !== sportTournamentId) return;
      if (payload?.auctionId !== currentAuctionId.current) return;
      safeApplySocketEvent({
        eventName: "sport:timer-updated",
        payload,
        fallbackRefresh: () => void load({ background: true, forceState: true }),
        setError,
        apply: () => {
          applySynchronizedClock(payload, setClockOffsetMs, clockOffsetRef.current);
          setState((previous) => applySportTimerEvent(previous, payload));
        },
      });
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
    socket.on("sport-bid-placed", applyBidPlaced);
    socket.on("sport-participant-started", applyParticipantStarted);
    socket.on("sport-auction-extended", applyTimerUpdated);
    socket.on("sport-auction-resumed", applyTimerUpdated);
    socket.on("auction-state", applySnapshot);
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    socket.on("disconnect", disconnect);
    return () => {
      socket.emit("leave-sport-auction", { sportTournamentId });
      socket.off("connect", joinRoom);
      socket.off("disconnect", disconnect);
      socket.off("sport-bid-placed", applyBidPlaced);
      socket.off("sport-participant-started", applyParticipantStarted);
      socket.off("sport-auction-extended", applyTimerUpdated);
      socket.off("sport-auction-resumed", applyTimerUpdated);
      socket.off("auction-state", applySnapshot);
    };
  }, [load, sportTournamentId]);

  const currentEndsAt = state?.current?.endsAt;
  const timerDurationSeconds = getRoundTimerDurationSeconds(
    state?.current,
    state?.config?.timerDurationSeconds || 20
  );
  useEffect(() => {
    if (!currentEndsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const tick = () =>
      setTimeLeft(
        getAuctionRemainingSeconds(
          currentEndsAt,
          clockOffsetMs,
          Date.now(),
          timerDurationSeconds
        )
      );
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [clockOffsetMs, currentEndsAt, timerDurationSeconds]);

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
    bidRequestStartedAt.current = performance.now();
    logBidUiTrace({
      scopeType: "sport",
      sportTournamentId,
      phase: "bidRequestStarted",
      auctionId: current.id,
    });
    try {
      await api.post(
        `/v2/sport-tournaments/${sportTournamentId}/auction/bid`,
        {
          auctionId: current.id,
          expectedCurrentBid: current.currentCredits,
        }
      );
      logBidUiTrace({
        scopeType: "sport",
        sportTournamentId,
        phase: "apiResponseReceived",
        auctionId: current.id,
        socketConnected: socket.connected,
      });
      setNotice("Bid accepted.");
      if (!socket.connected) {
        await load({ background: true, forceState: true });
        logBidUiTrace({
          scopeType: "sport",
          sportTournamentId,
          phase: "fallbackStateReloadFinished",
          auctionId: current.id,
        });
      } else {
        logBidUiTrace({
          scopeType: "sport",
          sportTournamentId,
          phase: "waitingForAuctionState",
          auctionId: current.id,
        });
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
  const sportStage = getSportAuctionStageFromState({ tournament: state?.tournament, auction: state });
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
  const highestBid = useMemo(
    () =>
      history
        .filter(({ result }) => Boolean(result))
        .reduce(
          (highest, round) =>
            Math.max(highest, Number(round.result?.finalCredits || 0)),
          0
        ),
    [history]
  );
  const lastOwnPurchase = useMemo(
    () =>
      history.find(
        (round) =>
          round.result?.outcome === "sold" &&
          round.result?.sportTeamId === viewerTeamId
      ),
    [history, viewerTeamId]
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
      return "Bidding is locked while the result is waiting for confirmation.";
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

  useEffect(() => {
    if (socketHealth.status === "connected") return undefined;
    const timer = window.setInterval(() => {
      void load({ background: true, forceState: true });
    }, 7000);
    return () => window.clearInterval(timer);
  }, [load, socketHealth.status]);

  useEffect(() => {
    const latest = history.find(({ result }) => Boolean(result));
    if (lastResultId.current === null) {
      if (latest) lastResultId.current = latest.id;
      return;
    }
    if (!latest || latest.id === lastResultId.current) return;
    lastResultId.current = latest.id;
    const name = latest.participant?.employee?.name || latest.participant?.name || "Participant";
    const outcome = latest.result?.outcome;
    if (outcome === "sold") {
      setResultToast({
        message: `🏅 ${name} sold to ${latest.result.teamName} for ${credits(latest.result.finalCredits)} credits`,
        severity: "success",
      });
    } else if (outcome === "unsold") {
      setResultToast({ message: `${name} went unsold`, severity: "warning" });
    }
  }, [history]);

  const resultToastEl = (
    <Snackbar
      open={Boolean(resultToast)}
      autoHideDuration={6000}
      onClose={() => setResultToast(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={() => setResultToast(null)}
        severity={resultToast?.severity || "success"}
        variant="filled"
        sx={{ width: "100%", borderRadius: 2, boxShadow: 4, fontSize: "0.95rem" }}
      >
        {resultToast?.message}
      </Alert>
    </Snackbar>
  );

  if (loading && !state) {
    return (
      <LoadingStateCard
        title="Loading Sport Auction"
        message="Checking tournament setup, teams, credits, and the current player."
      />
    );
  }

  if (isCompletedStage(sportStage)) {
    return (
      <Fragment>
        <ProductStateCard
          eyebrow="Sport Auction"
          title="Auction Completed"
          message="The Sport auction is closed. Results and team purchases are ready to review."
          actionLabel="View Results"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}/results`)}
          secondaryActionLabel="View Auction Details"
          onSecondaryAction={() =>
            navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)
          }
        />
        {resultToastEl}
      </Fragment>
    );
  }

  if (isSetupStage(sportStage) && canManage) {
    return (
      <Fragment>
        <ProductStateCard
          eyebrow="Sport Auction"
          title="Tournament Setup Incomplete"
          message="Complete the tournament setup before the live auction can begin. Teams, credits, and the player pool must be configured."
          actionLabel="Continue Tournament Setup"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}/manage`)}
          secondaryActionLabel="View Tournament Overview"
          onSecondaryAction={() => navigate(`/sport-tournaments/${sportTournamentId}`)}
        />
        {resultToastEl}
      </Fragment>
    );
  }

  if (isReadyStage(sportStage) && !canManage) {
    return (
      <Fragment>
        <ProductStateCard
          eyebrow="Sport Auction"
          title={canBid ? "Auction Ready — Launching Soon" : "Auction Launching Soon"}
          message={
            canBid
              ? "The auction is fully configured and your team is ready. The tournament organiser will start bidding shortly."
              : "The Sport auction is configured and ready to launch. Bidding will begin once the organiser opens the first round."
          }
          actionLabel="Return To Tournament Overview"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}`)}
        />
        {resultToastEl}
      </Fragment>
    );
  }

  if (!canManage && isSetupStage(sportStage)) {
    return (
      <Fragment>
        <ProductStateCard
          eyebrow="Sport Auction"
          title={canBid ? "Waiting For Tournament Setup" : "Sport Auction In Setup"}
          message={
            canBid
              ? "Your team is assigned, but this Sport auction is not ready yet. The organiser may still be finishing team setup, budget configuration, or pool generation."
              : "This Sport auction has not started yet. Return to the Tournament overview for the current setup status."
          }
          actionLabel="Return To Tournament Overview"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}`)}
        />
        {resultToastEl}
      </Fragment>
    );
  }

  return (
    <Box id="sport-auction-arena">
      {refreshing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      <SportArenaHeader
        tournamentName={state?.tournament?.name}
        stage={sportStage}
        connected={socketHealth.status === "connected" && connected}
        roomJoined={roomJoined}
        progress={progress}
        highestBid={highestBid}
        formatCredits={credits}
        teamName={state?.viewer?.sportTeamName}
        onExit={() =>
          navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)
        }
      />

      {socketHealth.status !== "connected" && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={<Button onClick={manualRefresh}>Refresh</Button>}
        >
          Live updates are {socketHealth.status}. The auction remains visible and will refresh automatically.
        </Alert>
      )}

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
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setNotice("")} severity="success" variant="filled"
          sx={{ width: "100%", borderRadius: 2, boxShadow: 4 }}>
          {notice}
        </Alert>
      </Snackbar>
      {resultToastEl}

      {isReadyStage(sportStage) && canManage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The Sport auction is configured and ready. Select a player below to start the first bidding round.
        </Alert>
      )}

      {canManage && (
        <OwnerLifecycleControls
          status={status}
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
          timerDuration={timerDurationSeconds}
          formatCredits={credits}
          onRefresh={manualRefresh}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
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
              lastPurchase={lastOwnPurchase}
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
        viewerTeamId={viewerTeamId}
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
          Select Next Player
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
