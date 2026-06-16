import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import api from "../utils/api";

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
}) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReadiness = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(
        `/v2/festivals/${festivalId}/auction/readiness`
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
    loadReadiness();
  }, [loadReadiness, revision]);

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
              Server-validated prerequisites for the Main Festival Auction.
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
            <Button onClick={loadReadiness} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {loading && !readiness && <CircularProgress size={28} />}

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
                    label={team.ready ? "Ready" : "Blocked"}
                  />
                </ListItem>
              ))}
            </List>

            {readiness.blockers.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2">Exact blockers</Typography>
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
