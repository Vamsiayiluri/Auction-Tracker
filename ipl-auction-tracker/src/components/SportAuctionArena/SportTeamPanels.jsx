import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

const wonCount = (team) =>
  (team?.roster || []).filter(({ source }) => source === "auction").length;

export function CaptainPanel({ team, remainingSlots, formatCredits }) {
  if (!team) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="primary.main">
          My Team
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {team.teamName}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1.5,
            mt: 2,
          }}
        >
          <Metric
            label="Remaining Credits"
            value={formatCredits(team.remainingCredits)}
          />
          <Metric label="Players Won" value={wonCount(team)} />
          <Metric label="Remaining Slots" value={remainingSlots} />
          <Metric label="Current Roster" value={team.roster?.length || 0} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Remaining slots are projected from the current pool and Team count.
        </Typography>
      </CardContent>
    </Card>
  );
}

export function TeamCreditComparison({
  teams,
  viewerTeamId,
  formatCredits,
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Team Credit Comparison
        </Typography>
        <Stack spacing={1}>
          {teams.map((team) => {
            const isViewerTeam = team.sportTeamId === viewerTeamId;
            return (
              <Box
                key={team.sportTeamId}
                sx={{
                  p: 1.25,
                  border: 1,
                  borderColor: isViewerTeam ? "primary.main" : "divider",
                  borderRadius: 1.5,
                }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography fontWeight={800}>{team.teamName}</Typography>
                  <Chip size="small" label={`${wonCount(team)} won`} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {formatCredits(team.remainingCredits)} credits remaining
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
