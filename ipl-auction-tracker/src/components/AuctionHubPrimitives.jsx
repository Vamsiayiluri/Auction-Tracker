import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

export function HubMetric({ label, value, detail }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
          {value}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function HubMetrics({ children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

export function HubTeamCard({
  name,
  isViewer,
  remaining,
  spent,
  roster = [],
  labels = [],
}) {
  return (
    <Card
      variant="outlined"
      sx={isViewer ? { borderColor: "primary.main", borderWidth: 2 } : undefined}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {roster.length} roster member(s)
            </Typography>
          </Box>
          {isViewer && <Chip size="small" color="primary" label="My Team" />}
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1,
            my: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Remaining
            </Typography>
            <Typography fontWeight={800}>{remaining}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Spent
            </Typography>
            <Typography fontWeight={800}>{spent}</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {labels.map((label) => (
            <Chip key={label} size="small" variant="outlined" label={label} />
          ))}
        </Stack>
        <Stack spacing={0.75} sx={{ mt: 2 }}>
          {roster.slice(0, 8).map((member) => (
            <Stack
              key={member.id}
              direction="row"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2">
                {member.participant?.employee?.name || "Participant"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {member.rosterSource || member.source || ""}
              </Typography>
            </Stack>
          ))}
          {!roster.length && (
            <Typography variant="body2" color="text.secondary">
              No roster allocations yet.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function HubProgress({ completed, total }) {
  const percentage = total ? Math.min(100, (completed / total) * 100) : 0;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="body2">Auction progress</Typography>
        <Typography variant="body2" fontWeight={800}>
          {completed} / {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 8, borderRadius: 999 }}
      />
    </Box>
  );
}
