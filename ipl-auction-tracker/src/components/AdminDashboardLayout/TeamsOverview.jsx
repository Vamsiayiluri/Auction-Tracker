import { useEffect, useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/bidUtils";
import { avatarColor, nameInitials, sourceChipProps } from "../AuctionHubPrimitives";

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

                <AccordionDetails sx={{ pt: 0 }}>
                  <Card variant="outlined">
                    <CardContent>
                      {/* Budget bar */}
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Budget used</Typography>
                          <Typography variant="caption" fontWeight={700}>
                            {total > 0 ? Math.round((spent / total) * 100) : 0}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0}
                          color={total > 0 && spent / total > 0.85 ? "error" : spent / total > 0.6 ? "warning" : "primary"}
                          sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover" }}
                        />
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Spent: {formatCurrency(spent)}</Typography>
                          <Typography variant="caption" color={remaining > 0 ? "success.main" : "error.main"} fontWeight={700}>
                            Left: {formatCurrency(remaining)}
                          </Typography>
                        </Stack>
                      </Box>
                      {/* Player list */}
                      {players.length > 0 ? (
                        <Stack spacing={0}>
                          {players.map((player) => {
                            const bg = avatarColor(player.name || "");
                            const { label: srcLabel, color: srcColor } = sourceChipProps("");
                            return (
                              <Stack
                                key={player.id}
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                                sx={{
                                  py: 1,
                                  px: 0.5,
                                  borderBottom: 1,
                                  borderColor: "divider",
                                  "&:last-child": { borderBottom: 0 },
                                  borderRadius: 1,
                                  transition: "background 0.15s",
                                  "&:hover": { bgcolor: "action.hover" },
                                }}
                              >
                                <Tooltip title={player.name} placement="left">
                                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: bg, flexShrink: 0 }}>
                                    {nameInitials(player.name || "")}
                                  </Avatar>
                                </Tooltip>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={700} noWrap>{player.name}</Typography>
                                  {player.role && (
                                    <Chip size="small" label={player.role} variant="outlined" sx={{ height: 16, fontSize: 10, mt: 0.25 }} />
                                  )}
                                </Box>
                                <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
                                  {formatCurrency(player.soldPrice)}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          This team has not bought any players yet.
                        </Alert>
                      )}
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
