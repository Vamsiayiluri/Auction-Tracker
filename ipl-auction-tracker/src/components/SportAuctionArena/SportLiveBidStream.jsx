import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

export default function SportLiveBidStream({
  bids,
  viewerTeamId,
  formatCredits,
}) {
  const newestFirst = bids.slice().reverse();

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Live Bid Stream
          </Typography>
          <Chip size="small" label={`${bids.length} bids`} />
        </Stack>
        {newestFirst.length ? (
          <Stack spacing={1}>
            {newestFirst.map((bid) => {
              const isViewerTeam = bid.sportTeamId === viewerTeamId;
              return (
                <Box
                  key={bid.id}
                  sx={{
                    p: 1.25,
                    border: 1,
                    borderColor: isViewerTeam ? "primary.main" : "divider",
                    borderRadius: 1.5,
                    bgcolor: isViewerTeam ? "primary.light" : "transparent",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography fontWeight={800}>
                        #{bid.bidNumber} {bid.teamName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(bid.placedAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {formatCredits(bid.amount)}
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
