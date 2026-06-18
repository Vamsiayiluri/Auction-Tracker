import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAuth } from "../../context/auth-context";
import api from "../../utils/api";
import { avatarColor, nameInitials, sourceChipProps } from "../AuctionHubPrimitives";

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const SummaryCard = ({ label, value, color = "text.primary" }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" color={color} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const MyTeam = ({ tournamentId }) => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    let active = true;

    const fetchCurrentTeam = async () => {
      try {
        const query = tournamentId ? `?tournamentId=${tournamentId}` : "";
        const response = await api.get(`/teams/getTeamAndPlayers/${user.id}${query}`);
        if (active) {
          setTeam(response.data.team);
          setPlayers(response.data.players || []);
        }
      } catch {
        if (active) setError("Unable to load your team details.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCurrentTeam();

    return () => {
      active = false;
    };
  }, [tournamentId, user.id]);

  const visiblePlayers = useMemo(() => {
    const tournamentPlayers = tournamentId
      ? players.filter((player) => player.tournamentId === tournamentId)
      : players;

    const filtered =
      roleFilter === "all"
        ? tournamentPlayers
        : tournamentPlayers.filter((player) => player.role === roleFilter);

    return [...filtered].sort((first, second) => {
      if (sortBy === "price") {
        return Number(second.soldPrice || 0) - Number(first.soldPrice || 0);
      }
      return String(first[sortBy] || "").localeCompare(
        String(second[sortBy] || "")
      );
    });
  }, [players, roleFilter, sortBy, tournamentId]);

  const hasRoles = players.some((player) => Boolean(player.role));

  useEffect(() => {
    if (!hasRoles && roleFilter !== "all") {
      setRoleFilter("all");
    }
  }, [hasRoles, roleFilter]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  const amountLeft =
    team?.amountLeft ?? Number(team?.totalAmount || 0) - Number(team?.amountSpent || 0);

  return (
    <Box>
      <Typography variant="h5">{team?.name || "My Team"}</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {tournamentId
          ? "Your purchased players for this selected tournament."
          : "Your purchased players and remaining auction purse."}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 4,
        }}
      >
        <SummaryCard label="Total budget" value={formatAmount(team?.totalAmount)} />
        <SummaryCard
          label="Amount spent"
          value={formatAmount(team?.amountSpent)}
          color="primary.main"
        />
        <SummaryCard
          label="Remaining purse"
          value={formatAmount(amountLeft)}
          color="success.main"
        />
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Squad ({visiblePlayers.length})</Typography>
        <Stack direction="row" spacing={1.5}>
          {hasRoles && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <MenuItem value="all">All roles</MenuItem>
                <MenuItem value="Batsman">Batsman</MenuItem>
                <MenuItem value="Bowler">Bowler</MenuItem>
                <MenuItem value="All-rounder">All-rounder</MenuItem>
                <MenuItem value="Wicketkeeper">Wicketkeeper</MenuItem>
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(event) => setSortBy(event.target.value)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="role">Role</MenuItem>
              <MenuItem value="price">Price</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Budget progress bar */}
      <Box sx={{ mb: 3 }}>
        {(() => {
          const total = Number(team?.totalAmount || 0);
          const spent = Number(team?.amountSpent || 0);
          const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
          return (
            <>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Budget used</Typography>
                <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={pct > 85 ? "error" : pct > 60 ? "warning" : "primary"}
                sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover" }}
              />
            </>
          );
        })()}
      </Box>

      <Card variant="outlined">
        {visiblePlayers.length ? (
          <Stack spacing={0} sx={{ p: 1 }}>
            {visiblePlayers.map((player) => {
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
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: bg, flexShrink: 0 }}>
                      {nameInitials(player.name || "")}
                    </Avatar>
                  </Tooltip>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{player.name}</Typography>
                    {player.role && (
                      <Chip size="small" label={player.role} variant="outlined" sx={{ height: 18, fontSize: 10, mt: 0.25 }} />
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
                    {formatAmount(player.soldPrice)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6">No players found</Typography>
            <Typography color="text.secondary">
              Purchased players will appear here after a winning bid.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default MyTeam;
