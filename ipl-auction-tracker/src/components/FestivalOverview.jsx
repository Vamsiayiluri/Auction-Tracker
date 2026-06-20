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
import { LoadingStateCard } from "./ProductState";
import TeamExportButton from "./TeamExportButton";

const metrics = [
  ["sportsEnabled", "Sports Enabled"],
  ["employees", "Employees Imported"],
  ["participants", "Participants Registered"],
  ["teamsCreated", "Teams Created"],
  ["ownersAssigned", "Owners Assigned"],
  ["ownersActivated", "Owners Activated"],
  ["retentions", "Retentions"],
  ["auctionPoolSize", "Auction Pool Size"],
];

export default function FestivalOverview({
  readiness,
  festival,
  festivalId,
  auctionStatus,
  canExportTeams = false,
}) {

  if (!readiness) {
    return (
      <LoadingStateCard
        title="Loading Festival Overview"
        message="Preparing setup progress, checklist status, and next actions."
      />
    );
  }

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1.5,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            <Typography variant="h6">Setup Status</Typography>
            <TeamExportButton
              endpoint={`/v2/festivals/${festivalId}/export/excel`}
              tournamentName={festival?.name}
              allowed={
                canExportTeams &&
                auctionStatus === "completed"
              }
            />
          </Box>
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
            <Alert severity="success">All setup checks pass.</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
