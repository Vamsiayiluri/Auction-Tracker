import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

export default function RecentResultsStrip({
  results,
  formatMoney,
  onViewResults,
  viewerTeamId,
}) {
  const lastResult = results[0];
  const viewerWon =
    lastResult?.result?.outcome === "sold" &&
    lastResult.result.festivalTeamId === viewerTeamId;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Live Auction Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Newest finalized auction events first.
            </Typography>
          </Box>
          <Button onClick={onViewResults}>View Full Results</Button>
        </Stack>

        {lastResult && (
          <Alert
            severity={viewerWon ? "success" : "info"}
            sx={{ mb: 1.5, alignItems: "center" }}
          >
            <Typography variant="overline">
              Last Auction Result
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {lastResult.participant?.employee?.name || "Participant"}{" "}
              {lastResult.result?.outcome === "sold" ? "SOLD" : "remained unsold"}
            </Typography>
            {lastResult.result?.outcome === "sold" ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                <Chip size="small" label={`Winning Team: ${lastResult.result.teamName || "Team"}`} />
                <Chip size="small" label={`Winning Bid: ${formatMoney(lastResult.result.finalAmount)}`} />
                <Chip size="small" label={`Total Bids: ${(lastResult.bids || []).length}`} />
              </Stack>
            ) : null}
            {lastResult.result?.outcome === "sold" ? (
              <Typography sx={{ mt: 0.75 }}>
                {viewerWon
                  ? `Success. You acquired ${lastResult.participant?.employee?.name || "this participant"}.`
                  : `${lastResult.participant?.employee?.name || "Participant"} was acquired by ${lastResult.result.teamName || "Team"}.`}
              </Typography>
            ) : null}
          </Alert>
        )}

        {results.length ? (
          <Stack spacing={1}>
            {results.map((round) => (
              <Box
                key={round.id}
                sx={{
                  p: 1.5,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  gap={1}
                >
                  <Typography fontWeight={800}>
                    {round.result?.outcome === "sold"
                      ? `${round.participant?.employee?.name || "Participant"} sold to ${round.result?.teamName || "Team"} for ${formatMoney(round.result.finalAmount)}`
                      : `${round.participant?.employee?.name || "Participant"} remained unsold`}
                  </Typography>
                  <Chip
                    size="small"
                    color={round.result?.outcome === "sold" ? "success" : "warning"}
                    label={round.result?.outcome === "sold" ? "Sold" : "Unsold"}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            Finalized rounds will appear here.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
