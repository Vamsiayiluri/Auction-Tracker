import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

export function MyTeamPanel({
  team,
  remainingSlots,
  formatMoney,
}) {
  if (!team) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="primary.main">
          My Team
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {team.team?.name || "Assigned Festival Team"}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1.5,
            mt: 2,
          }}
        >
          <TeamMetric
            label="Remaining Purse"
            value={formatMoney(team.remainingBudget)}
          />
          <TeamMetric
            label="Spent Amount"
            value={formatMoney(team.spentBudget)}
          />
          <TeamMetric
            label="Purchased Participants"
            value={team.playersPurchased}
          />
          <TeamMetric
            label="Retained Participants"
            value={team.retentions}
          />
          <TeamMetric label="Remaining Slots" value={remainingSlots} />
          <TeamMetric label="Current Roster" value={team.currentRosterCount} />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          Remaining Slots is projected from the current Festival allocation
          pool and Team count.
        </Typography>
      </CardContent>
    </Card>
  );
}

export function TeamPurseComparison({
  teams,
  viewerTeamId,
  totalBudget,
  formatMoney,
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Team Purse Comparison
        </Typography>
        <Stack spacing={1.5}>
          {teams.map((team) => {
            const percentage = totalBudget
              ? Math.min(
                  100,
                  (Number(team.remainingBudget || 0) / Number(totalBudget)) *
                    100
                )
              : 0;
            const isViewerTeam = team.festivalTeamId === viewerTeamId;

            return (
              <Box
                key={team.festivalTeamId}
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
                  spacing={1}
                  alignItems="center"
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>
                      {team.team?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.playersPurchased} participants bought
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <Typography fontWeight={900}>
                      {formatMoney(team.remainingBudget)}
                    </Typography>
                    {isViewerTeam && (
                      <Chip size="small" color="primary" label="Your Team" />
                    )}
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{ mt: 1, height: 6, borderRadius: 999 }}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function TeamMetric({ label, value }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {value ?? 0}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
