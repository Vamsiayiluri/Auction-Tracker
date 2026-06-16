import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const Metric = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6">{value}</Typography>
  </Box>
);

export default function SportTournamentControlCenter({
  tournament,
  readiness,
  budgets,
  pool,
}) {
  const navigate = useNavigate();
  const ready = readiness?.readinessStatus === "READY";
  const statusLabel =
    tournament.status === "auction_live"
      ? "AUCTION LIVE"
      : tournament.status === "auction_paused"
        ? "AUCTION PAUSED"
        : tournament.status === "auction_completed"
          ? "AUCTION COMPLETED"
          : ready
            ? "READY FOR AUCTION"
            : "SETUP INCOMPLETE";

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        minWidth: 0,
        background:
          "linear-gradient(135deg, rgba(25,118,210,0.09), rgba(46,125,50,0.07))",
      }}
    >
      <CardContent>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                Sport Tournament Control Center
              </Typography>
              <Typography variant="h4">{tournament.name}</Typography>
              <Typography color="text.secondary">
                {tournament.festivalTeam?.name} | {tournament.sport?.name} |{" "}
                {tournament.division}
              </Typography>
            </Box>
            <Stack alignItems={{ lg: "flex-end" }} spacing={1}>
              <Chip
                color={
                  tournament.status === "auction_paused"
                    ? "warning"
                    : tournament.status === "auction_completed"
                      ? "info"
                      : ready || tournament.status === "auction_live"
                        ? "success"
                        : "warning"
                }
                label={`Auction Status: ${statusLabel}`}
              />
              <Typography variant="h5">
                {readiness?.readinessScore || 0}% ready
              </Typography>
              <Box sx={{ width: { xs: "100%", lg: 240 } }}>
                <LinearProgress
                  variant="determinate"
                  value={readiness?.readinessScore || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
                xl: "repeat(8, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <Metric label="Status" value={tournament.status.replaceAll("_", " ")} />
            <Metric label="Teams" value={readiness?.counts.activeTeams || 0} />
            <Metric
              label="Captains"
              value={readiness?.counts.captainsAssigned || 0}
            />
            <Metric
              label="Eligible"
              value={readiness?.counts.eligibleParticipants || 0}
            />
            <Metric label="Pool" value={pool?.counts.available || 0} />
            <Metric
              label="Budgets"
              value={`${readiness?.counts.budgetsConfigured || 0}/${readiness?.counts.activeTeams || 0}`}
            />
            <Metric
              label="Total Credits"
              value={budgets?.totalEffectiveCredits || 0}
            />
            <Metric
              label="Blockers"
              value={readiness?.blockers?.length || 0}
            />
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<LockClockRoundedIcon />}
              onClick={() => navigate(`/auctions/sports/${tournament.id}`)}
            >
              Open Sport Auction Arena
            </Button>
          </Stack>
          {readiness?.blockers?.length > 0 && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Current blockers</Typography>
              {readiness.blockers.map((blocker) => (
                <Typography key={blocker} variant="body2" color="text.secondary">
                  - {blocker}
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
