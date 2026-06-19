import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import api from "../utils/api";
import {
  cachedRequest,
  refreshCachedRequest,
  stableCacheKey,
} from "../utils/clientCache";

const labels = {
  employees: "Employees",
  participants: "Participants",
  sportsRegistered: "Sports Registered",
  teamsCreated: "Teams Created",
  ownersAssigned: "Owners Assigned",
  ownersActivated: "Owners Activated",
  retentions: "Retentions",
  auctionPoolSize: "Auction Pool Size",
  unsoldPlayers: "Unsold Players",
  sportsEnabled: "Sports Enabled",
  auctionStatus: "Auction Status",
};

export default function FestivalReadiness({
  festivalId,
  revision = 0,
  onLoaded,
  initialReadiness = null,
}) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [loading, setLoading] = useState(!initialReadiness);
  const [error, setError] = useState("");
  const loadedRevisionRef = useRef(null);

  const loadReadiness = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const response = await (force ? refreshCachedRequest : cachedRequest)(
        stableCacheKey("GET", `/v2/festivals/${festivalId}/auction/readiness`),
        () => api.get(`/v2/festivals/${festivalId}/auction/readiness`),
        { ttlMs: 45_000 }
      );
      setReadiness(response.data.data);
      onLoaded?.(response.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not load the Festival setup check."
      );
    } finally {
      setLoading(false);
    }
  }, [festivalId, onLoaded]);

  useEffect(() => {
    if (loadedRevisionRef.current === revision) return;
    if (initialReadiness && revision === 0) {
      loadedRevisionRef.current = revision;
      setReadiness(initialReadiness);
      setLoading(false);
      return;
    }
    loadedRevisionRef.current = revision;
    loadReadiness({ force: revision > 0 });
  }, [initialReadiness, loadReadiness, revision]);

  return (
    <Card id="festival-readiness" variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Festival Setup Check</Typography>
            <Typography color="text.secondary">
              Setup checks required before the Main Festival Auction can start.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {readiness && (
              <Chip
                color={
                  readiness.overallStatus === "READY" ? "success" : "error"
                }
                label={readiness.overallStatus.replace("_", " ")}
              />
            )}
            <Button onClick={() => loadReadiness({ force: true })} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {loading && !readiness && (
          <Box sx={{ py: 3 }}>
            <Typography fontWeight={800}>Checking Festival Setup</Typography>
            <Typography color="text.secondary">
              Validating teams, owners, budgets, retentions, and the auction pool.
            </Typography>
          </Box>
        )}

        {readiness && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1,
                mb: 2,
              }}
            >
              {Object.entries(labels).map(([key, label]) => (
                <Card variant="outlined" key={key}>
                  <CardContent>
                    <Typography variant="h5">
                      {String(readiness.counts[key] ?? 0).replaceAll("_", " ")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Typography variant="subtitle1">Team Setup Status</Typography>
            <List dense>
              {readiness.teams.map((team) => (
                <ListItem key={team.festivalTeamId} disableGutters>
                  <ListItemText
                    primary={team.teamName}
                    secondary={
                      team.ready
                        ? `${team.userStatus || "Existing User"} | Ownership Active`
                        : team.blockers.join("; ")
                    }
                  />
                  <Chip
                    size="small"
                    color={team.ready ? "success" : "error"}
                    label={team.ready ? "Ready" : "Needs Setup"}
                  />
                </ListItem>
              ))}
            </List>

            {readiness.blockers.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2">Setup Issues</Typography>
                <List dense disablePadding>
                  {readiness.blockers.map((blocker) => (
                    <ListItem key={blocker} disableGutters>
                      <ListItemText primary={blocker} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
