import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
  getAuctionDisplayStatus,
  getQuickActions,
} from "../utils/festivalWorkspace";

const metrics = [
  ["participants", "Participants"],
  ["teamsCreated", "Teams"],
  ["ownersAssigned", "Owners"],
  ["auctionPoolSize", "Auction Pool"],
  ["unsoldPlayers", "Unsold"],
];

export default function FestivalControlCenter({
  festival,
  festivalId,
  revision = 0,
  onNavigate,
  onReadiness,
  onAuctionStatus,
}) {
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");
  const actionInFlight = useRef(false);

  const loadStatus = useCallback(async () => {
    setError("");
    try {
      const [readinessResponse, auctionResponse] = await Promise.all([
        api.get(`/v2/festivals/${festivalId}/auction/readiness`),
        api.get(`/v2/festivals/${festivalId}/auction/current`).catch(() => null),
      ]);
      const nextReadiness = readinessResponse.data.data;
      const auctionStatus =
        auctionResponse?.data?.data?.config?.auctionStatus ||
        nextReadiness.counts?.auctionStatus ||
        "setup";
      setReadiness(nextReadiness);
      onReadiness?.(nextReadiness);
      onAuctionStatus?.(auctionStatus);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load Festival control status."
      );
    } finally {
      setLoading(false);
    }
  }, [festivalId, onAuctionStatus, onReadiness]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus, revision]);

  const auctionStatus = readiness?.counts?.auctionStatus || "setup";
  const runAction = async (action) => {
    if (["open", "results", "history"].includes(action)) {
      if (action === "open") {
        navigate(`/auctions/festivals/${festivalId}`);
        return;
      }
      onNavigate(
        action === "history"
          ? "Bid History"
          : action === "results"
            ? "Results"
            : "Auction"
      );
      return;
    }
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction(action);
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}/auction/${action}`);
      await loadStatus();
      navigate(`/auctions/festivals/${festivalId}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "We could not update the auction. Try again."
      );
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      setActiveAction("");
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, position: "sticky", top: 8, zIndex: 5, bgcolor: "background.paper" }}
    >
      <CardContent>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>{festival?.name}</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={`Festival: ${festival?.status?.replaceAll("_", " ")}`} />
              <Chip
                size="small"
                color={auctionStatus === "live" ? "success" : auctionStatus === "paused" ? "warning" : "default"}
                label={`Auction: ${String(auctionStatus).replaceAll("_", " ")}`}
              />
              <Chip
                size="small"
                color={readiness?.overallStatus === "READY" ? "success" : "error"}
                label={getAuctionDisplayStatus(readiness).replaceAll("_", " ")}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(90px, 1fr))" },
              gap: 1,
              flex: 1,
              maxWidth: 720,
            }}
          >
            {metrics.map(([key, label]) => (
              <Box key={key} sx={{ minWidth: 0 }}>
                <Typography variant="h6">{readiness?.counts?.[key] ?? "-"}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Box>

          {/* <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignSelf={{ lg: "center" }}>
            {loading && <CircularProgress size={24} />}
            {!loading && getQuickActions(auctionStatus).map((action) => (
              <Button
                key={action}
                variant={["start", "resume", "open"].includes(action) ? "contained" : "outlined"}
                disabled={busy || (action === "start" && readiness?.overallStatus !== "READY")}
                onClick={() => runAction(action)}
              >
                {activeAction === action
                  ? "Processing..."
                  : action === "open"
                    ? "Open Live Auction"
                    : action === "results"
                      ? "View Results"
                      : action === "history"
                        ? "View History"
                        : `${action[0].toUpperCase()}${action.slice(1)} Auction`}
              </Button>
            ))}
          </Stack> */}
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}
