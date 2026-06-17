import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import {
  getAuctionRemainingSeconds,
  getServerClockOffsetMs,
  mergeAuctionSnapshotState,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";
import ArenaHeader from "./FestivalAuctionArena/ArenaHeader";
import ParticipantStage from "./FestivalAuctionArena/ParticipantStage";
import {
  MyTeamPanel,
  TeamPurseComparison,
} from "./FestivalAuctionArena/TeamPanels";
import LiveBidStream from "./FestivalAuctionArena/LiveBidStream";
import QueueSummary from "./FestivalAuctionArena/QueueSummary";
import RecentResultsStrip from "./FestivalAuctionArena/RecentResultsStrip";
import { LoadingStateCard, ProductStateCard } from "./ProductState";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const participantId = (round) =>
  round?.festivalParticipantId || round?.participant?.id;

export default function MainFestivalAuction({
  festivalId,
  onRosterChanged,
}) {
  const navigate = useNavigate();
  const [festival, setFestival] = useState(null);
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUnsoldIds, setSelectedUnsoldIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [roomJoined, setRoomJoined] = useState(false);
  const [expiryConfirmationDelayed, setExpiryConfirmationDelayed] =
    useState(false);
  const actionInFlight = useRef(false);
  const expiryRefreshInFlight = useRef(false);
  const loggedExpiryKey = useRef("");
  const lastRevision = useRef(0);

  const loadAuction = useCallback(
    async ({ refreshHistory = true, forceState = false } = {}) => {
      setError("");
      const requestRevision = lastRevision.current;
      try {
        const [currentResponse, historyResponse] = await Promise.all([
          api.get(`/v2/festivals/${festivalId}/auction/current`),
          refreshHistory
            ? api.get(`/v2/festivals/${festivalId}/auction/history`)
            : null,
        ]);
        const socketAdvancedDuringRequest =
          lastRevision.current > requestRevision;
        const preserveSocketState =
          lastRevision.current &&
          socket.connected &&
          (!forceState || socketAdvancedDuringRequest);
        setState((previous) =>
          preserveSocketState
            ? {
                ...previous,
                viewer: currentResponse.data.data?.viewer,
              }
            : currentResponse.data.data
        );
        if (!preserveSocketState && historyResponse) {
          setHistory(historyResponse.data.data || []);
        }
        setClockOffsetMs(
          getServerClockOffsetMs(currentResponse.data.data?.serverTime)
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load the Main Festival Auction."
        );
      } finally {
        setLoading(false);
      }
    },
    [festivalId]
  );

  useEffect(() => {
    let active = true;
    api
      .get(`/v2/festivals/${festivalId}`)
      .then((response) => {
        if (active) setFestival(response.data.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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
      if (payload.reason === "auction-pending-finalization") {
        console.info("[festival-auction-expiry] socket event received", {
          auctionId: payload.state?.current?.id,
          festivalId,
        });
      }
      lastRevision.current = payload.revision;
      setClockOffsetMs(getServerClockOffsetMs(payload.serverTime));
      setState((previous) => mergeAuctionSnapshotState(previous, payload));
      setHistory(payload.history || []);
    };
    const joinRoom = () => {
      setConnected(true);
      socket.emit("join-festival-auction", { festivalId }, (response) => {
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

    void loadAuction();
    socket.on("auction-state", applySnapshot);
    socket.on("connect", joinRoom);
    socket.on("disconnect", disconnect);
    if (socket.connected) joinRoom();
    return () => {
      socket.emit("leave-festival-auction", { festivalId });
      socket.off("auction-state", applySnapshot);
      socket.off("connect", joinRoom);
      socket.off("disconnect", disconnect);
    };
  }, [festivalId, loadAuction]);

  const currentEndsAt = state?.current?.endsAt;

  useEffect(() => {
    const endsAt = currentEndsAt;
    if (!endsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const updateTimer = () =>
      setTimeLeft(getAuctionRemainingSeconds(endsAt, clockOffsetMs));
    updateTimer();
    const timer = setInterval(updateTimer, 250);
    return () => clearInterval(timer);
  }, [clockOffsetMs, currentEndsAt]);

  const runAction = async (
    path,
    successMessage,
    rosterChanged = false,
    body = {},
    actionName = "action"
  ) => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction(actionName);
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}${path}`, body);
      setNotice(successMessage);
      setSelectedParticipantId("");
      setBasePrice("");
      await loadAuction({ forceState: true });
      if (rosterChanged) await onRosterChanged?.();
      return true;
    } catch (requestError) {
      await loadAuction({ forceState: true });
      setError(
        requestError.response?.data?.message || "Auction action failed."
      );
      return false;
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      setActiveAction("");
    }
  };

  const placeBid = async () => {
    if (actionInFlight.current || !state?.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction("bid");
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}/auction/bid`, {
        auctionId: state.current.id,
        expectedCurrentBid: state.current.currentBid,
      });
      setNotice("Bid accepted.");
      await loadAuction({ forceState: true });
    } catch (requestError) {
      await loadAuction({ forceState: true });
      setError(
        requestError.response?.data?.message || "Bid was not accepted."
      );
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      setActiveAction("");
    }
  };

  const config = state?.config;
  const current = state?.current;
  const isAdmin = Boolean(state?.viewer?.isAdmin);
  const isOwner = Boolean(state?.viewer?.isOwner);
  const viewerTeamId = state?.viewer?.festivalTeamId;
  const status = config?.auctionStatus || "setup";
  const leadingBid = current?.bids?.at(-1);
  const unsold = useMemo(() => state?.unsold || [], [state?.unsold]);
  const available = useMemo(() => state?.pool || [], [state?.pool]);
  const roundStatus = current?.status;
  const locallyExpired = roundStatus === "live" && timeLeft <= 0;
  const adminActions = current?.adminActions || {
    extend: roundStatus === "pending",
    sell: roundStatus === "pending" && Boolean(leadingBid),
    unsold: roundStatus === "pending" && !leadingBid,
  };

  useEffect(() => {
    if (!locallyExpired || !current?.id) {
      expiryRefreshInFlight.current = false;
      setExpiryConfirmationDelayed(false);
      return undefined;
    }

    const expiryKey = `${current.id}:${current.endsAt}`;
    if (loggedExpiryKey.current !== expiryKey) {
      loggedExpiryKey.current = expiryKey;
      console.info("[festival-auction-expiry] timer reached zero", {
        auctionId: current.id,
        festivalId,
        endsAt: current.endsAt,
      });
    }

    const confirmServerExpiry = async () => {
      if (expiryRefreshInFlight.current) return;
      expiryRefreshInFlight.current = true;
      try {
        await loadAuction({ refreshHistory: false, forceState: true });
      } finally {
        expiryRefreshInFlight.current = false;
      }
    };

    confirmServerExpiry();
    const retryTimer = window.setInterval(confirmServerExpiry, 1000);
    const delayedTimer = window.setTimeout(
      () => setExpiryConfirmationDelayed(true),
      3000
    );
    return () => {
      window.clearInterval(retryTimer);
      window.clearTimeout(delayedTimer);
    };
  }, [
    current?.endsAt,
    current?.id,
    festivalId,
    loadAuction,
    locallyExpired,
  ]);

  const ownBudget = useMemo(
    () =>
      state?.teamSummaries?.find(
        ({ festivalTeamId }) => festivalTeamId === viewerTeamId
      ),
    [state?.teamSummaries, viewerTeamId]
  );
  const selectedParticipant =
    available.find(({ id }) => id === selectedParticipantId) || null;
  const finalizedResults = useMemo(
    () => history.filter((round) => Boolean(round.result)),
    [history]
  );
  const recentResults = finalizedResults.slice(0, 4);
  const highestBid = finalizedResults.reduce(
    (highest, round) =>
      Math.max(highest, Number(round.result?.finalAmount || 0)),
    0
  );
  const lastOwnPurchase = useMemo(
    () =>
      finalizedResults.find(
        (round) =>
          round.result?.outcome === "sold" &&
          round.result?.festivalTeamId === viewerTeamId
      ),
    [finalizedResults, viewerTeamId]
  );
  const soldParticipantIds = useMemo(
    () =>
      new Set(
        finalizedResults
          .filter((round) => round.result?.outcome === "sold")
          .map(participantId)
          .filter(Boolean)
      ),
    [finalizedResults]
  );
  const allParticipantIds = useMemo(() => {
    const ids = new Set(soldParticipantIds);
    for (const participant of available) ids.add(participant.id);
    for (const participant of unsold) ids.add(participant.id);
    if (current) ids.add(participantId(current));
    return ids;
  }, [available, current, soldParticipantIds, unsold]);
  const progress = {
    sold: soldParticipantIds.size,
    unsold: unsold.length,
    remaining: available.length + unsold.length + (current ? 1 : 0),
    current: current ? Math.min(soldParticipantIds.size + 1, allParticipantIds.size) : 0,
    total: allParticipantIds.size,
  };
  const projectedRosterSize = state?.teamSummaries?.length
    ? Math.ceil(
        ((state?.teams || []).reduce(
          (count, team) => count + (team.members?.length || 0),
          0
        ) +
          available.length +
          unsold.length +
          (current ? 1 : 0)) /
          state.teamSummaries.length
      )
    : 0;
  const remainingSlots = Math.max(
    0,
    projectedRosterSize - Number(ownBudget?.currentRosterCount || 0)
  );
  const reauctionCount = unsold.reduce(
    (total, participant) =>
      total + Number(participant.reauctionCount || 0),
    0
  );
  const arenaStatus =
    current?.status === "pending" ? "pending_finalization" : status;

  const bidDisabledReason = useMemo(() => {
    if (!current) return "Waiting for the next participant.";
    if (status !== "live") {
      return status === "paused"
        ? "The Auction is paused."
        : "The Auction is not live.";
    }
    if (roundStatus !== "live" || timeLeft <= 0) {
      return "Bidding is locked while the result is waiting for confirmation.";
    }
    if (leadingBid?.festivalTeamId === viewerTeamId) {
      return "Your Team already leads this round.";
    }
    if (Number(current.nextBid) > Number(ownBudget?.remainingBudget || 0)) {
      return "Your Team does not have enough remaining purse for the next bid.";
    }
    if (busy) return "Another Auction action is processing.";
    return "";
  }, [
    busy,
    current,
    leadingBid?.festivalTeamId,
    ownBudget?.remainingBudget,
    roundStatus,
    status,
    timeLeft,
    viewerTeamId,
  ]);

  const viewResults = () => navigate(`/festivals/${festivalId}/results`);
  const exitArena = () =>
    navigate(`/festivals/${festivalId}/auction-hub`);
  const returnToFestivalOverview = () =>
    navigate(`/festivals/${festivalId}/command-center`);

  if (loading && !state) {
    return (
      <LoadingStateCard
        title="Loading Festival Auction"
        message="Checking auction status, teams, bids, and the current participant."
      />
    );
  }

  if (status === "completed") {
    return (
      <ProductStateCard
        eyebrow="Festival Auction"
        title="Auction Completed"
        message="The live auction is closed. Results and team purchases are available in reporting."
        actionLabel="View Results"
        onAction={viewResults}
        secondaryActionLabel="View Auction Details"
        onSecondaryAction={exitArena}
      />
    );
  }

  if (status === "setup" && !isAdmin) {
    return (
      <ProductStateCard
        eyebrow="Festival Auction"
        title={isOwner ? "Waiting For Festival Setup" : "Auction Not Started"}
        message={
          isOwner
            ? "The Festival Administrator is still preparing the Festival. You will be able to participate once setup is complete."
            : "The Festival auction has not started yet. Check back once the Administrator launches it."
        }
        actionLabel="Return To Festival Overview"
        onAction={returnToFestivalOverview}
      />
    );
  }

  return (
    <Box id="festival-auction">
      <ArenaHeader
        festivalName={festival?.name}
        status={arenaStatus}
        connected={connected}
        roomJoined={roomJoined}
        progress={progress}
        highestBid={highestBid}
        formatMoney={formatMoney}
        teamName={ownBudget?.team?.name}
        onExit={exitArena}
        onViewResults={viewResults}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
          action={
            <Button
              color="inherit"
              onClick={() => loadAuction({ forceState: true })}
            >
              Retry
            </Button>
          }
        >
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
        <AdminLifecycleControls
          status={status}
          current={current}
          busy={busy}
          activeAction={activeAction}
          onRun={runAction}
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
        <ParticipantStage
          current={current}
          leadingBid={leadingBid}
          timeLeft={timeLeft}
          formatMoney={formatMoney}
        >
          {isOwner && (
            <OwnerBidControls
              current={current}
              disabledReason={bidDisabledReason}
              busy={busy}
              activeAction={activeAction}
              onBid={placeBid}
            />
          )}
          {isAdmin && !current && ["live", "paused"].includes(status) && (
            <RoundControls
              available={available}
              selectedParticipant={selectedParticipant}
              basePrice={basePrice}
              status={status}
              busy={busy}
              activeAction={activeAction}
              onParticipantChange={setSelectedParticipantId}
              onBasePriceChange={setBasePrice}
              onStart={() =>
                runAction(
                  `/auction/participants/${selectedParticipantId}/start`,
                  "Participant bidding started.",
                  false,
                  { basePrice: Number(basePrice) },
                  "start-participant"
                )
              }
            />
          )}
          {isAdmin && current && (
            <PendingFinalizationControls
              current={current}
              leadingBid={leadingBid}
              adminActions={adminActions}
              busy={busy}
              activeAction={activeAction}
              locallyExpired={locallyExpired}
              expiryConfirmationDelayed={expiryConfirmationDelayed}
              onRun={runAction}
            />
          )}
        </ParticipantStage>

        <Stack spacing={2}>
          {isOwner && (
            <MyTeamPanel
              team={ownBudget}
              remainingSlots={remainingSlots}
              lastPurchase={lastOwnPurchase}
              formatMoney={formatMoney}
            />
          )}
          <TeamPurseComparison
            teams={state?.teamSummaries || []}
            viewerTeamId={viewerTeamId}
            totalBudget={config?.totalBudget}
            formatMoney={formatMoney}
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
        <LiveBidStream
          bids={current?.bids || []}
          viewerTeamId={viewerTeamId}
          formatMoney={formatMoney}
        />
        <QueueSummary
          available={available}
          unsold={unsold}
          reauctionCount={reauctionCount}
          isAdmin={isAdmin}
          busy={busy}
          currentActive={Boolean(current)}
          selectedUnsoldIds={selectedUnsoldIds}
          onToggleUnsold={(id) =>
            setSelectedUnsoldIds((currentIds) =>
              currentIds.includes(id)
                ? currentIds.filter((item) => item !== id)
                : [...currentIds, id]
            )
          }
          onReauctionSelected={() =>
            runAction(
              "/auction/reauction",
              "Selected players returned to the auction pool.",
              false,
              { participantIds: selectedUnsoldIds },
              "reauction-selected"
            ).then((succeeded) => {
              if (succeeded) setSelectedUnsoldIds([]);
            })
          }
          onReauctionAll={() =>
            runAction(
              "/auction/reauction",
              "All unsold players returned to the auction pool.",
              false,
              {},
              "reauction-all"
            )
          }
        />
      </Box>

      <RecentResultsStrip
        results={recentResults}
        formatMoney={formatMoney}
        viewerTeamId={viewerTeamId}
        onViewResults={viewResults}
      />
    </Box>
  );
}

function AdminLifecycleControls({
  status,
  current,
  busy,
  activeAction,
  onRun,
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Auction Controls
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="contained"
            disabled={busy || status !== "setup"}
            onClick={() =>
              onRun(
                "/auction/start",
                "Festival auction started.",
                false,
                {},
                "start-auction"
              )
            }
          >
            {activeAction === "start-auction" ? "Starting..." : "Start Auction"}
          </Button>
          <Button
            variant="outlined"
            disabled={busy || status !== "live"}
            onClick={() =>
              onRun(
                "/auction/pause",
                "Festival auction paused.",
                false,
                {},
                "pause"
              )
            }
          >
            {activeAction === "pause" ? "Pausing..." : "Pause Auction"}
          </Button>
          <Button
            variant="outlined"
            disabled={busy || status !== "paused"}
            onClick={() =>
              onRun(
                "/auction/resume",
                "Festival auction resumed.",
                false,
                {},
                "resume"
              )
            }
          >
            {activeAction === "resume" ? "Resuming..." : "Resume Auction"}
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
              onRun(
                "/auction/complete",
                "Festival auction completed.",
                false,
                {},
                "complete"
              )
            }
          >
            {activeAction === "complete"
              ? "Completing..."
              : "Complete Auction"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RoundControls({
  available,
  selectedParticipant,
  basePrice,
  status,
  busy,
  activeAction,
  onParticipantChange,
  onBasePriceChange,
  onStart,
}) {
  return (
    <Card variant="outlined" sx={{ mt: 3, textAlign: "left" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Select Next Participant
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Select the next available participant and enter the base price.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Autocomplete
            fullWidth
            options={available}
            value={selectedParticipant}
            onChange={(event, participant) =>
              onParticipantChange(participant?.id || "")
            }
            getOptionLabel={(participant) =>
              `${participant.employee?.employeeNumber || ""} - ${
                participant.employee?.name || "Participant"
              } - ${
                participant.employee?.gender === "female" ? "Female" : "Male"
              }`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search available participant"
                size="small"
              />
            )}
          />
          <TextField
            label="Base Price"
            type="number"
            size="small"
            value={basePrice}
            onChange={(event) => onBasePriceChange(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={
              busy ||
              status !== "live" ||
              !selectedParticipant?.id ||
              !Number(basePrice)
            }
            onClick={onStart}
            sx={{ whiteSpace: "nowrap" }}
          >
            {activeAction === "start-participant"
              ? "Starting..."
              : "Start Round"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PendingFinalizationControls({
  current,
  leadingBid,
  adminActions,
  busy,
  activeAction,
  locallyExpired,
  expiryConfirmationDelayed,
  onRun,
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        mt: 1,
        borderColor:
          current.status === "pending" ? "warning.main" : "divider",
      }}
    >
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Waiting for Confirmation
            </Typography>
            <Typography color="text.secondary">
              Extend bidding, sell the participant, or mark the participant as unsold.
            </Typography>
          </Box>
          <Chip
            color={current.status === "pending" ? "warning" : "default"}
            label={
              current.status === "pending"
                ? "Action Required"
                : "Waiting for Timer"
            }
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            disabled={busy || !adminActions.extend}
            onClick={() =>
              onRun(
                "/auction/extend",
                "Auction timer extended.",
                false,
                {},
                "extend"
              )
            }
          >
            {activeAction === "extend" ? "Extending..." : "Extend 20 Seconds"}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !adminActions.sell}
            onClick={() =>
              onRun(
                `/auction/participants/${current.festivalParticipantId}/sell`,
                "Participant sold and added to the winning Team.",
                true,
                {},
                "sell"
              )
            }
          >
            {activeAction === "sell"
              ? "Selling..."
              : `Sell${leadingBid ? ` to ${leadingBid.teamName}` : ""}`}
          </Button>
          <Button
            color="warning"
            variant="outlined"
            disabled={busy || !adminActions.unsold}
            onClick={() =>
              onRun(
                `/auction/participants/${current.festivalParticipantId}/unsold`,
                "Participant marked unsold.",
                false,
                {},
                "unsold"
              )
            }
          >
            {activeAction === "unsold" ? "Updating..." : "Mark Unsold"}
          </Button>
        </Stack>
        {locallyExpired && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {expiryConfirmationDelayed
              ? "Confirmation is taking longer than expected. Checking again..."
              : "Confirming the timer has ended..."}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function OwnerBidControls({
  current,
  disabledReason,
  busy,
  activeAction,
  onBid,
}) {
  return (
    <Box
      sx={{
        position: { xs: "sticky", md: "static" },
        bottom: { xs: 8, md: "auto" },
        zIndex: 3,
        bgcolor: "background.paper",
        borderRadius: 2,
        p: 1,
        boxShadow: { xs: 4, md: 0 },
      }}
    >
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={Boolean(disabledReason)}
        onClick={onBid}
        sx={{ minHeight: 58, fontSize: { xs: "1rem", sm: "1.1rem" } }}
      >
        {activeAction === "bid"
          ? "Placing Bid..."
          : `Place Bid ${formatMoney(current?.nextBid)}`}
      </Button>
      {disabledReason && !busy && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 1 }}
        >
          {disabledReason}
        </Typography>
      )}
    </Box>
  );
}
