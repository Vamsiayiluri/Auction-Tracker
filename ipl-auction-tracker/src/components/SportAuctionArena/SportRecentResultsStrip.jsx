import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

export default function SportRecentResultsStrip({ results, formatCredits, viewerTeamId }) {
  const lastResult = results[0];
  const viewerWon =
    lastResult?.result?.outcome === "sold" &&
    lastResult.result.sportTeamId === viewerTeamId;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Live Auction Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Newest finalized auction events first.
        </Typography>
        {lastResult ? (
          <Alert severity={viewerWon ? "success" : "info"} sx={{ mb: 1.5 }}>
            <Typography variant="overline">Last Auction Result</Typography>
            <Typography variant="h6" fontWeight={900}>
              {lastResult.participant?.employee?.name || "Participant"}{" "}
              {lastResult.result?.outcome === "sold" ? "SOLD" : "remained unsold"}
            </Typography>
            {lastResult.result?.outcome === "sold" ? (
              <>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                  <Chip size="small" label={`Winning Team: ${lastResult.result.teamName || "Team"}`} />
                  <Chip size="small" label={`Winning Bid: ${formatCredits(lastResult.result.finalCredits)}`} />
                  <Chip size="small" label={`Total Bids: ${(lastResult.bids || []).length}`} />
                </Stack>
                <Typography sx={{ mt: 0.75 }}>
                  {viewerWon
                    ? `Success. You acquired ${lastResult.participant?.employee?.name || "this participant"}.`
                    : `${lastResult.participant?.employee?.name || "Participant"} was acquired by ${lastResult.result.teamName || "Team"}.`}
                </Typography>
              </>
            ) : null}
          </Alert>
        ) : null}
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
                      ? `${round.participant?.employee?.name || "Participant"} sold to ${round.result?.teamName || "Team"} for ${formatCredits(round.result.finalCredits)}`
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
