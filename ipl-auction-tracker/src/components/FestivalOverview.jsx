import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";

const metrics = [
  ["sportsEnabled", "Sports Enabled"],
  ["employees", "Employees Imported"],
  ["participants", "Participants Registered"],
  ["teamsCreated", "Teams Created"],
  ["ownersAssigned", "Owners Assigned"],
  ["ownersActivated", "Owners Activated"],
  ["retentions", "Retentions"],
  ["auctionPoolSize", "Auction Pool Size"],
  ["unsoldPlayers", "Unsold Players"],
  ["auctionStatus", "Auction Status"],
];

export default function FestivalOverview({ readiness }) {
  if (!readiness) return <Alert severity="info">Loading Festival overview.</Alert>;

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" },
          gap: 2,
          mb: 2,
        }}
      >
        {metrics.map(([key, label]) => (
          <Card key={key} variant="outlined">
            <CardContent>
              <Typography variant="h5">{String(readiness.counts?.[key] ?? 0).replaceAll("_", " ")}</Typography>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Readiness</Typography>
          <Chip
            color={readiness.overallStatus === "READY" ? "success" : "error"}
            label={readiness.overallStatus.replaceAll("_", " ")}
            sx={{ mb: 2 }}
          />
          {readiness.blockers?.length ? (
            <Alert severity="warning">
              <List dense disablePadding>
                {readiness.blockers.map((blocker) => (
                  <ListItem key={blocker} disableGutters>
                    <ListItemText primary={blocker} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          ) : (
            <Alert severity="success">All server readiness checks pass.</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
