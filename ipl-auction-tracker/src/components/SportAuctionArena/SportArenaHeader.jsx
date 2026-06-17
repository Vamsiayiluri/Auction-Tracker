import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import {
  isLiveStage,
  isReadyStage,
  isCompletedStage,
  AUCTION_STAGE,
} from "../../utils/auctionStages";

const stageLabel = (stage) => {
  if (stage === AUCTION_STAGE.LIVE) return "Auction Live";
  if (stage === AUCTION_STAGE.READY) return "Ready to Launch";
  if (stage === AUCTION_STAGE.COMPLETED) return "Auction Completed";
  return "Auction Setup";
};

const stageChipColor = (stage) => {
  if (isLiveStage(stage)) return "success";
  if (isReadyStage(stage)) return "warning";
  return "default";
};

export default function SportArenaHeader({
  tournamentName,
  stage,
  connected,
  roomJoined,
  progress,
  highestBid,
  formatCredits,
  teamName,
  onExit,
}) {
  const connectionReady = connected && roomJoined;
  const completed = isCompletedStage(stage);

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
              {completed ? "Sport Auction Completed" : tournamentName || "Sport Auction"}
            </Typography>
            {completed && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Participants Processed: {progress.sold + progress.unsold} | Sold: {progress.sold} | Unsold: {progress.unsold} | Highest Bid: {formatCredits ? formatCredits(highestBid) : highestBid || 0}
              </Typography>
            )}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                color={stageChipColor(stage)}
                label={stageLabel(stage)}
              />
              <Chip
                color={connectionReady ? "success" : "warning"}
                variant="outlined"
                label={connectionReady ? "Connected" : "Reconnecting"}
              />
              {teamName && (
                <Chip variant="outlined" label={`Captain: ${teamName}`} />
              )}
              <Metric label="Sold" value={progress.sold} />
              <Metric label="Unsold" value={progress.unsold} />
              <Metric label="Remaining" value={progress.remaining} />
              <Metric
                label="Players Auctioned"
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
            flexWrap="wrap"
            useFlexGap
          >
            <Button color="inherit" onClick={onExit} sx={{ alignSelf: { lg: "center" } }}>
              Auction Details
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <Chip size="small" variant="outlined" label={`${label}: ${value}`} />
  );
}
