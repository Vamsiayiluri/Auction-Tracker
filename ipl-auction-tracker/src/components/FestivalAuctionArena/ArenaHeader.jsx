import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

const formatStatus = (status) =>
  String(status || "setup").replaceAll("_", " ");

export default function ArenaHeader({
  festivalName,
  status,
  connected,
  roomJoined,
  progress,
  teamName,
  onExit,
  onViewResults,
}) {
  const connectionReady = connected && roomJoined;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {festivalName || "Festival Auction"}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 0.75 }}
            >
              <Chip
                color={
                  status === "live"
                    ? "success"
                    : status === "pending_finalization"
                      ? "warning"
                      : "default"
                }
                label={formatStatus(status)}
              />
              <Chip
                color={connectionReady ? "success" : "warning"}
                variant="outlined"
                label={connectionReady ? "Connected" : "Reconnecting"}
              />
              {teamName && (
                <Chip variant="outlined" label={`You represent: ${teamName}`} />
              )}
              <ProgressMetric label="Sold" value={progress.sold} />
              <ProgressMetric label="Unsold" value={progress.unsold} />
              <ProgressMetric label="Remaining" value={progress.remaining} />
              <ProgressMetric
                label="Auction Progress"
                value={
                  progress.current
                    ? `${progress.current}/${progress.total}`
                    : `${progress.sold}/${progress.total}`
                }
              />
            </Stack>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignSelf={{ lg: "center" }}
          >
            <Button variant="outlined" onClick={onViewResults}>
              View Full Results
            </Button>
            <Button color="inherit" onClick={onExit}>
              Auction Hub
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProgressMetric({ label, value }) {
  return (
    <Chip size="small" variant="outlined" label={`${label}: ${value}`} />
  );
}
