import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";

export default function RecentResultsStrip({
  results,
  formatMoney,
  onViewResults,
}) {
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
              Recent Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Latest finalized rounds only.
            </Typography>
          </Box>
          <Button onClick={onViewResults}>View Full Results</Button>
        </Stack>

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
                  {round.result?.finalAmount
                    ? formatMoney(round.result.finalAmount)
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
