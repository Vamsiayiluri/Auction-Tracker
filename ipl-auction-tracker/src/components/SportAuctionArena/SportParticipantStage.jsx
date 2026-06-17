import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import VisualTimer from "../VisualTimer";

const formatTime = (date) =>
  date
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

export default function SportParticipantStage({
  current,
  festivalTeamName,
  timeLeft,
  formatCredits,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
  children,
}) {
  const employee = current?.participant?.employee;

  const refreshButton = (
    <Tooltip
      title={
        lastUpdated
          ? `Last refreshed at ${formatTime(lastUpdated)}`
          : "Fetch the latest auction state from the server"
      }
    >
      <span>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            refreshing ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <RefreshRoundedIcon />
            )
          }
          onClick={onRefresh}
          disabled={refreshing}
          sx={{ minHeight: 36, whiteSpace: "nowrap" }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Current Player
        </Typography>
        {current ? (
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 900, fontSize: { xs: "2rem", md: "3rem" } }}
                >
                  {employee?.name}
                </Typography>
                <Box sx={{ pt: 0.5, flexShrink: 0 }}>
                  {refreshButton}
                  {lastUpdated && (
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="right" sx={{ mt: 0.25 }}>
                      Updated {formatTime(lastUpdated)}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Typography color="text.secondary">
                {employee?.employeeNumber || "Employee number unavailable"} |{" "}
                {employee?.gender === "female" ? "Female" : "Male"} |{" "}
                {festivalTeamName || "Festival Team unavailable"}
              </Typography>
            </Box>
            <Divider />
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
              <Metric label="Base Price" value={formatCredits(current.baseCredits)} />
              <Metric
                label="Current Bid"
                value={
                  current.bidCount
                    ? formatCredits(current.currentCredits)
                    : "No bids"
                }
              />
              <Metric label="Next Bid" value={formatCredits(current.nextCredits)} />
              <Metric label="Leading Team" value={current.leadingTeam || "No leader"} />
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
              justifyContent="center"
              sx={{ borderRadius: 2, bgcolor: "action.hover", p: 2 }}
            >
              {current.status === "live" ? (
                <VisualTimer timeLeft={timeLeft} />
              ) : (
                <Chip
                  color={current.status === "pending" ? "warning" : "default"}
                  label={
                    current.status === "pending"
                      ? "Waiting for Confirmation"
                      : current.status
                  }
                />
              )}
              <Box>
                <Typography fontWeight={800}>
                  {current.status === "live"
                    ? "Bidding is open"
                    : "Bidding is locked"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {current.status === "live"
                    ? "Every accepted bid resets the server deadline."
                    : "The tournament manager must extend bidding, sell the player, or mark them unsold."}
                </Typography>
              </Box>
            </Stack>
            {children}
          </Stack>
        ) : (
          <Box sx={{ py: { xs: 5, md: 9 }, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              No participant is active
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              The next player will appear when the Tournament Owner starts a
              round.
            </Typography>
            <Box sx={{ mt: 2 }}>{refreshButton}</Box>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
    </Box>
  );
}
