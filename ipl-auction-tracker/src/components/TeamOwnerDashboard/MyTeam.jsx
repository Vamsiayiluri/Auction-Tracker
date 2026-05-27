import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAuth } from "../../context/auth-context";
import api from "../../utils/api";

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
        const response = await api.get(`/teams/getTeamAndPlayers/${user.id}`);
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
  }, [user.id]);

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

      <Card variant="outlined">
        {visiblePlayers.length ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Bought For</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visiblePlayers.map((player) => (
                <TableRow key={player.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{player.name}</TableCell>
                  <TableCell>{player.role}</TableCell>
                  <TableCell align="right">
                    {formatAmount(player.soldPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
