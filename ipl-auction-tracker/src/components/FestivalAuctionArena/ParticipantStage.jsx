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

export default function ParticipantStage({
  current,
  leadingBid,
  timeLeft,
  timerDuration,
  formatMoney,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
  children,
}) {
  const employee = current?.participant?.employee;
  const roundStatus = current?.status;

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
          Current Participant
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
                {employee?.department || "Department not set"} |{" "}
                {employee?.gender === "female" ? "Female" : "Male"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {(current.participant?.sports || []).map((registration) => (
                <Chip
                  key={registration.id}
                  size="small"
                  label={registration.sport?.name || registration.sportId}
                />
              ))}
              {!current.participant?.sports?.length && (
                <Chip size="small" label="No registered Sports" />
              )}
            </Stack>

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
              <BidMetric
                label="Base Price"
                value={formatMoney(current.basePrice)}
              />
              <BidMetric
                label="Current Bid"
                value={
                  current.bidCount
                    ? formatMoney(current.currentBid)
                    : "No bids"
                }
              />
              <BidMetric
                label="Next Bid"
                value={formatMoney(current.nextBid)}
              />
              <BidMetric
                label="Leading Team"
                value={leadingBid?.teamName || "No leader"}
              />
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
              justifyContent="center"
              sx={{
                borderRadius: 2,
                bgcolor: "action.hover",
                px: 2,
                py: 2,
              }}
            >
              {roundStatus === "live" ? (
                <VisualTimer timeLeft={timeLeft} duration={timerDuration} />
              ) : (
                <Chip
                  color={roundStatus === "pending" ? "warning" : "default"}
                  label={
                    roundStatus === "pending"
                      ? "Waiting for Confirmation"
                      : String(roundStatus || "inactive").replaceAll("_", " ")
                  }
                />
              )}
              <Box>
                <Typography fontWeight={800}>
                  {roundStatus === "live"
                    ? "Bidding is open"
                    : roundStatus === "pending"
                      ? "Bidding is locked"
                      : "Round is not accepting bids"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {roundStatus === "live"
                    ? "The server resets the deadline after every accepted bid."
                    : roundStatus === "pending"
                      ? "An admin must extend bidding, sell the participant, or mark them unsold."
                      : "Live controls will update when the round resumes."}
                </Typography>
              </Box>
            </Stack>

            {children}
          </Stack>
        ) : (
          <Box sx={{ py: { xs: 5, md: 9 }, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              No participant is currently active
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              The next participant will appear here when an Admin starts a
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

function BidMetric({ label, value }) {
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
