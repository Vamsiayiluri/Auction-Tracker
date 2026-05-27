import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SportsCricketRoundedIcon from "@mui/icons-material/SportsCricketRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { uid } from "uid";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";

const playerRoles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

const statusConfig = {
  upcoming: { label: "Upcoming", color: "default" },
  live: { label: "Live", color: "error" },
  completed: { label: "Completed", color: "success" },
};

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const blankPlayer = {
  name: "",
  role: "",
  basePrice: "",
};

const StatCard = ({ icon, label, value }) => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            bgcolor: "primary.light",
            color: "primary.main",
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export default function AuctionManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [auctionName, setAuctionName] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [draftPlayers, setDraftPlayers] = useState([]);
  const [formError, setFormError] = useState("");
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [playerTargetId, setPlayerTargetId] = useState(null);
  const [playerForm, setPlayerForm] = useState(blankPlayer);
  const [playerError, setPlayerError] = useState("");
  const [detailsTournament, setDetailsTournament] = useState(null);
  const [startTournament, setStartTournament] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadTournaments = async () => {
    setLoading(true);
    setError("");

    try {
      const tournamentResponse = await api.get("/tournament");
      const enriched = await Promise.all(
        tournamentResponse.data.map(async (tournament) => {
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
      setTournaments(enriched);
    } catch {
      setError("Unable to load tournaments. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const summary = useMemo(
    () => ({
      total: tournaments.length,
      live: tournaments.filter((tournament) => tournament.status === "live")
        .length,
      teams: new Set(
        tournaments.flatMap((tournament) =>
          tournament.teams.map((team) => team.id || team.name)
        )
      ).size,
      players: tournaments.reduce(
        (count, tournament) => count + tournament.players.length,
        0
      ),
    }),
    [tournaments]
  );

  const openCreatePanel = async () => {
    setError("");
    setNotice("");

    try {
      const response = await api.get("/teams");
      setTeamsList(response.data || []);
      setShowCreatePanel(true);
    } catch {
      setError("Teams could not be loaded. A tournament needs registered teams.");
    }
  };

  const openPlayerDialog = (tournamentId = null) => {
    setPlayerTargetId(tournamentId);
    setPlayerForm(blankPlayer);
    setPlayerError("");
    setPlayerDialogOpen(true);
  };

  const savePlayer = async () => {
    const name = playerForm.name.trim();
    const price = Number(playerForm.basePrice);

    if (!name || !playerForm.role || !price || price <= 0) {
      setPlayerError("Enter a player name, role, and a valid base price.");
      return;
    }

    const newPlayer = {
      id: uid(),
      name,
      role: playerForm.role,
      basePrice: price,
      soldPrice: null,
      isSold: false,
      teamId: null,
    };

    try {
      if (playerTargetId) {
        await api.post("/players", {
          ...newPlayer,
          tournamentId: playerTargetId,
        });
        setTournaments((current) =>
          current.map((tournament) =>
            tournament.id === playerTargetId
              ? { ...tournament, players: [...tournament.players, newPlayer] }
              : tournament
          )
        );
        setNotice(`${name} was added to the tournament.`);
      } else {
        setDraftPlayers((current) => [...current, newPlayer]);
      }
      setPlayerDialogOpen(false);
    } catch {
      setPlayerError("Unable to add this player. Please try again.");
    }
  };

  const createTournament = async () => {
    const name = auctionName.trim();
    const tournamentBudget = Number(budget);

    if (!name || !tournamentBudget || tournamentBudget <= 0) {
      setFormError("Enter a tournament name and a valid team budget.");
      return;
    }
    if (!selectedTeams.length) {
      setFormError("Select at least one participating team.");
      return;
    }
    if (!draftPlayers.length) {
      setFormError("Add at least one player before creating a tournament.");
      return;
    }

    const id = uid();
    const payload = {
      id,
      name,
      budget: tournamentBudget,
      createdBy: user.id,
      teams: selectedTeams,
      players: draftPlayers.map((player) => ({ ...player, tournamentId: id })),
    };

    setBusy(true);
    setFormError("");
    try {
      await api.post("/tournament/create", payload);
      setNotice(`${name} was created successfully.`);
      setShowCreatePanel(false);
      setAuctionName("");
      setBudget("");
      setSelectedTeams([]);
      setDraftPlayers([]);
      await loadTournaments();
    } catch {
      setFormError("Unable to create the tournament. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmStartTournament = async () => {
    if (!startTournament) return;

    setBusy(true);
    try {
      await api.patch(`/tournament/${startTournament.id}/status`, {
        status: "live",
      });
      navigate(`/start-live-auction?id=${startTournament.id}`);
    } catch {
      setError("Unable to start this auction. Please try again.");
      setStartTournament(null);
    } finally {
      setBusy(false);
    }
  };

  const openTournamentControl = (tournament) => {
    navigate(`/start-live-auction?id=${tournament.id}`);
  };

  if (loading && !tournaments.length) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress size={34} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading tournament workspace...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          icon={<SportsCricketRoundedIcon />}
          label="Tournaments"
          value={summary.total}
        />
        <StatCard
          icon={<PlayArrowRoundedIcon />}
          label="Live auctions"
          value={summary.live}
        />
        <StatCard
          icon={<GroupsOutlinedIcon />}
          label="Participating teams"
          value={summary.teams}
        />
        <StatCard
          icon={<PaymentsOutlinedIcon />}
          label="Registered players"
          value={summary.players}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Tournaments</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Prepare player pools and start auctions when teams are ready.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreatePanel}
        >
          Create Tournament
        </Button>
      </Stack>

      {showCreatePanel && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, mb: 4 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h6">New tournament</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure the budget, invited teams, and initial player pool.
              </Typography>
            </Box>
            <Button color="inherit" onClick={() => setShowCreatePanel(false)}>
              Cancel
            </Button>
          </Stack>

          {formError && <Alert severity="error" sx={{ mb: 2.5 }}>{formError}</Alert>}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Tournament name"
              value={auctionName}
              onChange={(event) => {
                setAuctionName(event.target.value);
                setFormError("");
              }}
              fullWidth
            />
            <TextField
              label="Budget per team"
              type="number"
              value={budget}
              onChange={(event) => {
                setBudget(event.target.value);
                setFormError("");
              }}
              fullWidth
            />
          </Box>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={teamsList.map((team) => team.name)}
            value={selectedTeams}
            onChange={(_, values) => {
              setSelectedTeams(values);
              setFormError("");
            }}
            getOptionLabel={(option) => option}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox sx={{ mr: 1 }} checked={selected} />
                {option}
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Participating teams" />
            )}
            sx={{ mt: 2 }}
          />

          <Divider sx={{ my: 3 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">Players ({draftPlayers.length})</Typography>
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => openPlayerDialog()}
            >
              Add Player
            </Button>
          </Stack>
          {draftPlayers.length ? (
            <Stack spacing={1}>
              {draftPlayers.map((player) => (
                <Stack
                  key={player.id}
                  direction="row"
                  justifyContent="space-between"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Typography fontWeight={500}>
                    {player.name}{" "}
                    <Typography component="span" color="text.secondary">
                      ({player.role})
                    </Typography>
                  </Typography>
                  <Typography>{formatAmount(player.basePrice)}</Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ py: 1 }}>
              Add players to create the initial auction pool.
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={createTournament}
            disabled={busy}
            sx={{ mt: 3 }}
          >
            {busy ? "Creating..." : "Create Tournament"}
          </Button>
        </Paper>
      )}

      {!tournaments.length ? (
        <Paper variant="outlined" sx={{ py: 8, textAlign: "center" }}>
          <SportsCricketRoundedIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 1.5 }}
          />
          <Typography variant="h6">No tournaments created yet</Typography>
          <Typography color="text.secondary">
            Create your first tournament to start inviting teams and players.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2.5,
          }}
        >
          {tournaments.map((tournament) => {
            const status =
              statusConfig[tournament.status] || statusConfig.upcoming;
            const canStart =
              tournament.status === "upcoming" &&
              tournament.players.length > 0 &&
              tournament.teams.length > 0;

            return (
              <Card variant="outlined" key={tournament.id}>
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h6">{tournament.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Budget: {formatAmount(tournament.budget)}
                      </Typography>
                    </Box>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      variant={tournament.status === "live" ? "filled" : "outlined"}
                    />
                  </Stack>
                  <Stack direction="row" spacing={3} sx={{ mt: 3, mb: 3 }}>
                    <Typography variant="body2">
                      <strong>{tournament.teams.length}</strong> Teams
                    </Typography>
                    <Typography variant="body2">
                      <strong>{tournament.players.length}</strong> Players
                    </Typography>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowRoundedIcon />}
                      disabled={!canStart}
                      onClick={() => setStartTournament(tournament)}
                    >
                      Start Auction
                    </Button>
                    {tournament.status === "live" && (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={() => openTournamentControl(tournament)}
                      >
                        Resume Auction
                      </Button>
                    )}
                    {tournament.status === "completed" && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => openTournamentControl(tournament)}
                      >
                        View Auction Details
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => openPlayerDialog(tournament.id)}
                      disabled={tournament.status === "completed"}
                    >
                      Add Player
                    </Button>
                    <Button
                      color="inherit"
                      onClick={() => setDetailsTournament(tournament)}
                    >
                      Details
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog
        open={playerDialogOpen}
        onClose={() => setPlayerDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {playerTargetId ? "Add player to tournament" : "Add player"}
        </DialogTitle>
        <DialogContent>
          {playerError && <Alert severity="error" sx={{ mb: 2 }}>{playerError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Player name"
              value={playerForm.name}
              onChange={(event) =>
                setPlayerForm((current) => ({ ...current, name: event.target.value }))
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={playerForm.role}
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {playerRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Base price"
              type="number"
              value={playerForm.basePrice}
              onChange={(event) =>
                setPlayerForm((current) => ({
                  ...current,
                  basePrice: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPlayerDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={savePlayer}>
            Add Player
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(detailsTournament)}
        onClose={() => setDetailsTournament(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{detailsTournament?.name}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Participating Teams
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {detailsTournament?.teams.map((team) => team.name).join(", ") ||
              "No teams selected."}
          </Typography>
          <Typography variant="subtitle2">Players</Typography>
          <List disablePadding>
            {detailsTournament?.players.length ? (
              detailsTournament.players.map((player) => (
                <ListItem key={player.id} disableGutters>
                  <ListItemText
                    primary={player.name}
                    secondary={`${player.role} | Base price: ${formatAmount(
                      player.basePrice
                    )}`}
                  />
                </ListItem>
              ))
            ) : (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                No players added.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsTournament(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(startTournament)}
        onClose={() => !busy && setStartTournament(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start live auction?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Starting {startTournament?.name} will make the auction visible to
            invited team owners and spectators.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setStartTournament(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={confirmStartTournament}
          >
            {busy ? "Starting..." : "Start Auction"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
