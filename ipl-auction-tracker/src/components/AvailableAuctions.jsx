import { useEffect, useMemo, useState } from "react";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import SportsCricketRoundedIcon from "@mui/icons-material/SportsCricketRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";

const statusStyles = {
  upcoming: { label: "Upcoming", color: "default", icon: <AccessTimeRoundedIcon /> },
  live: { label: "Live", color: "error", icon: <PlayCircleOutlineRoundedIcon /> },
  completed: { label: "Completed", color: "success" },
};

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

export default function AvailableAuctions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;

    const getTournaments = async () => {
      try {
        const tournamentResponse = await api.get("/tournament");
        const tournaments = tournamentResponse.data;

        const enrichedTournaments = await Promise.all(
          tournaments.map(async (tournament) => {
            const [playersResponse, teamsResponse] = await Promise.all([
              api.get(`/players?tournamentId=${tournament.id}`),
              api.get(`/teams?tournamentId=${tournament.id}`),
            ]);

            return {
              ...tournament,
              players: playersResponse.data || [],
              teams: teamsResponse.data || [],
            };
          })
        );

        let visibleTournaments = enrichedTournaments;

        if (user.role === "team_owner") {
          const teamResponse = await api.get(`/teams/getTeamByid/${user.id}`);
          const ownerTeam = teamResponse.data.team;
          visibleTournaments = ownerTeam
            ? enrichedTournaments.filter((tournament) =>
                tournament.teams.some(
                  (team) =>
                    team.id === ownerTeam.id || team.name === ownerTeam.name
                )
              )
            : [];
        } else if (user.role === "spectator") {
          visibleTournaments = enrichedTournaments.filter(
            (tournament) => tournament.status !== "upcoming"
          );
        }

        if (active) setAuctions(visibleTournaments);
      } catch {
        if (active) {
          setError("Unable to load auctions right now. Please try again later.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    getTournaments();

    return () => {
      active = false;
    };
  }, [user.id, user.role]);

  const filteredAuctions = useMemo(
    () =>
      filter === "all"
        ? auctions
        : auctions.filter((auction) => auction.status === filter),
    [auctions, filter]
  );

  const openAuction = (id) => {
    navigate(
      user.role === "team_owner"
        ? `/live-auction?id=${id}`
        : `/spectator-live-auction?id=${id}`
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading auctions...
        </Typography>
      </Box>
    );
  }

  return (
    <Box id="available-auctions">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">
            {user.role === "team_owner" ? "Your Auctions" : "Auction Centre"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {user.role === "team_owner"
              ? "Join auctions your team has been invited to."
              : "Watch live auctions and completed outcomes."}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_, value) => value && setFilter(value)}
          aria-label="auction status filter"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="live">Live</ToggleButton>
          <ToggleButton value="completed">Completed</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {!error && filteredAuctions.length === 0 && (
        <Card variant="outlined">
          <CardContent sx={{ py: 7, textAlign: "center" }}>
            <SportsCricketRoundedIcon
              sx={{ fontSize: 44, color: "text.secondary", mb: 1.5 }}
            />
            <Typography variant="h6">No auctions to display</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {user.role === "team_owner"
                ? "Your team does not have an auction invitation in this category yet."
                : "There are no live or completed auctions in this category yet."}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2.5,
        }}
      >
        {filteredAuctions.map((auction) => {
          const status = statusStyles[auction.status] || statusStyles.upcoming;

          return (
            <Card
              key={auction.id}
              variant="outlined"
              sx={{
                display: "flex",
                flexDirection: "column",
                transition: "box-shadow 160ms ease, transform 160ms ease",
                "&:hover": {
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardContent sx={{ p: 3, flex: 1 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                >
                  <Typography variant="h6">{auction.name}</Typography>
                  <Chip
                    size="small"
                    icon={status.icon}
                    label={status.label}
                    color={status.color}
                    variant={auction.status === "live" ? "filled" : "outlined"}
                  />
                </Stack>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                  Team budget: {formatAmount(auction.budget)}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <GroupsOutlinedIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {auction.teams.length} Teams
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <SportsCricketRoundedIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {auction.players.length} Players
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
              <Box sx={{ px: 3, pb: 3 }}>
                {auction.status === "live" || auction.status === "completed" ? (
                  <Button
                    variant={auction.status === "live" ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => openAuction(auction.id)}
                  >
                    {auction.status === "live"
                      ? user.role === "team_owner"
                        ? "Join Live Auction"
                        : "Watch Live"
                      : "View Auction Details"}
                  </Button>
                ) : (
                  <Button variant="outlined" fullWidth disabled>
                    Not Started Yet
                  </Button>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
