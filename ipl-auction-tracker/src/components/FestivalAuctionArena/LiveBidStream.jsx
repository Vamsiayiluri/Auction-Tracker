import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

export default function LiveBidStream({
  bids,
  viewerTeamId,
  formatMoney,
}) {
  const newestFirst = bids.slice().reverse();

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Live Bid Stream
          </Typography>
          <Chip size="small" label={`${bids.length} bids`} />
        </Stack>

        {newestFirst.length ? (
          <Stack spacing={1}>
            {newestFirst.map((bid) => {
              const isViewerTeam = bid.festivalTeamId === viewerTeamId;
              return (
                <Box
                  key={bid.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: isViewerTeam ? "primary.main" : "divider",
                    bgcolor: isViewerTeam ? "primary.light" : "transparent",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        useFlexGap
                        flexWrap="wrap"
                      >
                        <Typography fontWeight={800}>
                          #{bid.bidNumber} {bid.teamName}
                        </Typography>
                        {isViewerTeam && (
                          <Chip size="small" color="primary" label="Your Bid" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(bid.placedAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {formatMoney(bid.amount)}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography fontWeight={700}>No bids in this round yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Accepted bids will appear here newest first.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
