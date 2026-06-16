import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

export default function QueueSummary({
  available,
  unsold,
  reauctionCount,
  isAdmin,
  busy,
  currentActive,
  selectedUnsoldIds,
  onToggleUnsold,
  onReauctionSelected,
  onReauctionAll,
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Queue Summary
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
            my: 2,
          }}
        >
          <QueueMetric label="Available" value={available.length} />
          <QueueMetric label="Unsold" value={unsold.length} />
          <QueueMetric label="Re-Auction Count" value={reauctionCount} />
        </Box>

        {isAdmin ? (
          <Stack spacing={1}>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>Available Queue</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ParticipantNames participants={available} />
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>
                  Unsold / Re-Auction Controls
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {unsold.length ? (
                  <Stack spacing={1}>
                    {unsold.map((participant) => (
                      <Stack
                        key={participant.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Checkbox
                          size="small"
                          inputProps={{
                            "aria-label": `Select ${participant.employee?.name || "participant"} for re-auction`,
                          }}
                          checked={selectedUnsoldIds.includes(participant.id)}
                          onChange={() => onToggleUnsold(participant.id)}
                        />
                        <Typography variant="body2">
                          {participant.employee?.employeeNumber} -{" "}
                          {participant.employee?.name} (re-auctions:{" "}
                          {participant.reauctionCount})
                        </Typography>
                      </Stack>
                    ))}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ pt: 1 }}
                    >
                      <Button
                        variant="outlined"
                        disabled={
                          busy ||
                          currentActive ||
                          selectedUnsoldIds.length === 0
                        }
                        onClick={onReauctionSelected}
                      >
                        Re-Auction Selected
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={busy || currentActive}
                        onClick={onReauctionAll}
                      >
                        Re-Auction All
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    No unsold participants are waiting.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Queue information is read-only. Admins manage participant selection
            and re-auction actions.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function QueueMetric({ label, value }) {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function ParticipantNames({ participants }) {
  if (!participants.length) {
    return (
      <Typography color="text.secondary">
        No participants are currently available.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      {participants.map((participant) => (
        <Typography key={participant.id} variant="body2">
          {participant.employee?.employeeNumber} - {participant.employee?.name}
        </Typography>
      ))}
    </Stack>
  );
}
