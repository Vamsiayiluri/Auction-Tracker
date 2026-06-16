import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import {
  mergeAuctionSnapshotState,
  shouldApplyAuctionSnapshot,
} from "../utils/auctionSynchronization";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

export default function FestivalViewerOverview({ festivalId, ownerView = false }) {
  const [festival, setFestival] = useState(null);
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRevision = useRef(0);

  const loadOverview = useCallback((showLoading = true) => {
    let active = true;
    if (showLoading === true) setLoading(true);
    setError("");
    Promise.all([
      api.get(`/v2/festivals/${festivalId}`),
      api.get(`/v2/festivals/${festivalId}/auction/current`),
    ])
      .then(([festivalResponse, auctionResponse]) => {
        if (!active) return;
        setFestival(festivalResponse.data.data);
        setAuction(auctionResponse.data.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load Festival overview."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
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
      lastRevision.current = payload.revision;
      setAuction((previous) => mergeAuctionSnapshotState(previous, payload));
      setLoading(false);
    };
    const joinRoom = () =>
      socket.emit("join-festival-auction", { festivalId });
    const cancelLoad = loadOverview();
    socket.on("auction-state", applySnapshot);
    socket.on("connect", joinRoom);
    if (socket.connected) joinRoom();
    return () => {
      cancelLoad?.();
      socket.emit("leave-festival-auction", { festivalId });
      socket.off("auction-state", applySnapshot);
      socket.off("connect", joinRoom);
    };
  }, [festivalId, loadOverview]);

  const ownerTeam = auction?.teamSummaries?.find(
    ({ festivalTeamId }) =>
      festivalTeamId === auction?.viewer?.festivalTeamId
  );

  if (loading && !festival) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h5">{festival?.name}</Typography>
              <Typography color="text.secondary">
                {festival?.code} | {festival?.startDate} to {festival?.endDate}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip label={`Festival: ${festival?.status || "-"}`} />
              <Chip
                color={auction?.config?.auctionStatus === "live" ? "success" : "default"}
                label={`Auction: ${auction?.config?.auctionStatus || "setup"}`}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <Metric label="Teams" value={auction?.teamSummaries?.length || 0} />
        <Metric label="Auction Pool" value={auction?.pool?.length || 0} />
        <Metric label="Unsold" value={auction?.unsold?.length || 0} />
        <Metric
          label="Current Participant"
          value={auction?.current?.participant?.employee?.name || "None"}
        />
      </Box>

      {ownerView && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">
              {ownerTeam?.team?.name || "No active Festival Team assignment"}
            </Typography>
            {ownerTeam && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip label={`Remaining: ${formatMoney(ownerTeam.remainingBudget)}`} />
                <Chip label={`Roster: ${ownerTeam.currentRosterCount}`} />
                <Chip label={`Purchased: ${ownerTeam.playersPurchased}`} />
                <Chip label={`Retentions: ${ownerTeam.retentions}`} />
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

function Metric({ label, value }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}
