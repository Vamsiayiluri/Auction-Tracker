import { Box, Card, CardContent, Typography } from "@mui/material";

export default function SportRecentResultsStrip({ results, formatCredits }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Recent Results
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Latest finalized rounds only.
        </Typography>
        {results.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1,
            }}
          >
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
                <Typography fontWeight={800} noWrap>
                  {round.participant?.employee?.name || "Participant"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {round.result?.teamName || "Unsold"}
                </Typography>
                <Typography sx={{ fontWeight: 900, mt: 0.5 }}>
                  {round.result?.finalCredits
                    ? formatCredits(round.result.finalCredits)
                    : "-"}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">
            Finalized rounds will appear here.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
