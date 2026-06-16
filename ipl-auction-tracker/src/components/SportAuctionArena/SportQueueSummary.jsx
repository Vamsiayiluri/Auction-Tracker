import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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

const name = (entry) => entry.participant?.employee?.name || "Participant";

export default function SportQueueSummary({
  available,
  unsold,
  reauctionCount,
  canManage,
  busy,
  currentActive,
  reauctionEnabled,
  selectedUnsoldIds,
  onToggleUnsold,
  onReauction,
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
          <Metric label="Available" value={available.length} />
          <Metric label="Unsold" value={unsold.length} />
          <Metric label="Re-Auction" value={reauctionCount} />
        </Box>

        {canManage ? (
          <Stack spacing={1}>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography fontWeight={700}>Available Queue</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {available.length ? (
                  available.map((entry) => (
                    <Typography key={entry.id} variant="body2" sx={{ py: 0.25 }}>
                      {name(entry)}
                    </Typography>
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No available participants.
                  </Typography>
                )}
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
                    {unsold.map((entry) => (
                      <Stack
                        key={entry.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Checkbox
                          size="small"
                          inputProps={{
                            "aria-label": `Select ${name(entry)} for re-auction`,
                          }}
                          checked={selectedUnsoldIds.includes(
                            entry.festivalParticipantId
                          )}
                          onChange={() =>
                            onToggleUnsold(entry.festivalParticipantId)
                          }
                        />
                        <Typography variant="body2">{name(entry)}</Typography>
                      </Stack>
                    ))}
                    <Button
                      variant="outlined"
                      disabled={
                        busy ||
                        currentActive ||
                        !reauctionEnabled ||
                        selectedUnsoldIds.length === 0
                      }
                      onClick={onReauction}
                    >
                      Re-Auction Selected
                    </Button>
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
            Queue information is read-only for Captains and spectators.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
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
