import { useEffect, useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/bidUtils";

const TeamsOverview = ({ tournamentId: providedTournamentId }) => {
  const [searchParams] = useSearchParams();
  const tournamentId = providedTournamentId ?? searchParams.get("id");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError("");

      try {
        if (tournamentId) {
          const [teamsResponse, playersResponse] = await Promise.all([
            api.get(`/teams?tournamentId=${tournamentId}`),
            api.get(`/players?tournamentId=${tournamentId}`),
          ]);
          const players = playersResponse.data || [];
          const teamsWithPlayers = (teamsResponse.data || []).map((team) => ({
            ...team,
            players: players.filter((player) => player.teamId === team.id),
          }));
          setTeams(teamsWithPlayers);
        } else {
          const res = await api.get("/teams/getAllteamsAndPlayers");
          setTeams(res.data?.teams ?? []);
        }
      } catch (fetchError) {
        if (fetchError.response?.status === 404) {
          setTeams([]);
          return;
        }

        setError(
          fetchError.response?.data?.message ||
            "Could not load team overview right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [tournamentId]);

  const totals = useMemo(
    () =>
      teams.reduce(
        (acc, team) => {
          acc.players += team.players?.length ?? 0;
          acc.budget += Number(team.totalAmount) || 0;
          acc.spent += Number(team.amountSpent) || 0;
          return acc;
        },
        { players: 0, budget: 0, spent: 0 }
      ),
    [teams]
  );

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", md: "center" } }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Teams overview
          </Typography>
          <Typography color="text.secondary">
            {tournamentId
              ? "Track squads and purse usage for this tournament."
              : "Track squad strength, purse usage, and bought players in one view."}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <Chip label={`${teams.length} teams`} color="primary" />
          <Chip label={`${totals.players} players`} variant="outlined" />
          <Chip label={`${formatCurrency(totals.spent)} spent`} />
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {!error && teams.length === 0 ? (
        <Alert severity="info">
          No teams are available yet. Once teams are created, their squads will
          appear here.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {teams.map((team) => {
            const spent = Number(team.amountSpent) || 0;
            const total = Number(team.totalAmount) || 0;
            const remaining = Math.max(total - spent, 0);
            const players = team.players ?? [];

            return (
              <Accordion key={team.id} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                      alignItems: { xs: "flex-start", sm: "center" },
                      flex: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          alignItems: "center",
                          bgcolor: "primary.50",
                          borderRadius: 2,
                          color: "primary.main",
                          display: "flex",
                          height: 44,
                          justifyContent: "center",
                          width: 44,
                        }}
                      >
                        <GroupsRoundedIcon />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                          {team.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {players.length} players bought
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: "wrap", gap: 1 }}
                    >
                      <Chip label={`Budget ${formatCurrency(total)}`} />
                      <Chip
                        label={`Left ${formatCurrency(remaining)}`}
                        color={remaining > 0 ? "success" : "warning"}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        divider={<Divider flexItem orientation="vertical" />}
                      >
                        <Box sx={{ minWidth: 180 }}>
                          <Typography variant="body2" color="text.secondary">
                            Amount spent
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {formatCurrency(spent)}
                          </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          {players.length > 0 ? (
                            <List dense disablePadding>
                              {players.map((player) => (
                                <ListItem
                                  key={player.id}
                                  disableGutters
                                  secondaryAction={
                                    <Chip
                                      size="small"
                                      label={formatCurrency(player.soldPrice)}
                                    />
                                  }
                                >
                                  <ListItemText
                                    primary={player.name}
                                    secondary={player.role || undefined}
                                    primaryTypographyProps={{ fontWeight: 700 }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Alert severity="info" variant="outlined">
                              This team has not bought any players yet.
                            </Alert>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default TeamsOverview;
