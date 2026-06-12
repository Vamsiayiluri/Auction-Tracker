import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
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
  LinearProgress,
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
import api from "../utils/api";

const playerRoles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];
const cricketSportId = "cricket";

const statusConfig = {
  upcoming: { label: "Upcoming", color: "default" },
  live: { label: "Live", color: "error" },
  completed: { label: "Completed", color: "success" },
  archived: { label: "Archived", color: "default" },
};

const statusFilters = ["all", "upcoming", "live", "completed", "archived"];

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const blankPlayer = {
  name: "",
  sportId: cricketSportId,
  role: "",
  basePrice: "",
};

const requiresRole = (sportId) => sportId === cricketSportId;

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
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [auctionName, setAuctionName] = useState("");
  const [selectedSportId, setSelectedSportId] = useState(cricketSportId);
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
  const [editTournament, setEditTournament] = useState(null);
  const [archiveTournament, setArchiveTournament] = useState(null);
  const [importTournament, setImportTournament] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editForm, setEditForm] = useState({
    name: "",
    sportId: cricketSportId,
    budget: "",
    teams: [],
    players: [],
  });
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
    const loadSports = async () => {
      try {
        const response = await api.get("/sports");
        setSports(response.data || []);
      } catch {
        setSports([]);
      }
    };
    loadSports();
  }, []);

  const sportName = (sportId) =>
    sports.find((sport) => sport.id === sportId)?.name || sportId || "Cricket";

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

  const visibleTournaments = useMemo(
    () =>
      statusFilter === "all"
        ? tournaments
        : tournaments.filter((tournament) => tournament.status === statusFilter),
    [statusFilter, tournaments]
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
    const tournament =
      tournamentId && tournamentId !== "edit"
        ? tournaments.find((item) => item.id === tournamentId)
        : null;
    const sportId =
      tournamentId === "edit"
        ? editForm.sportId
        : tournament?.sportId || selectedSportId || cricketSportId;
    setPlayerForm({ ...blankPlayer, sportId, role: requiresRole(sportId) ? "" : null });
    setPlayerError("");
    setPlayerDialogOpen(true);
  };

  const openEditTournament = async (tournament) => {
    setError("");
    setNotice("");

    try {
      const response = await api.get("/teams");
      setTeamsList(response.data || []);
      setEditTournament(tournament);
      setEditForm({
        name: tournament.name,
        sportId: tournament.sportId || cricketSportId,
        budget: String(tournament.budget),
        teams: tournament.teams.map((team) => team.name),
        players: tournament.players.map((player) => ({
          id: player.id,
          name: player.name,
          sportId: player.sportId || tournament.sportId || cricketSportId,
          role: player.role,
          basePrice: player.basePrice,
        })),
      });
      setFormError("");
    } catch {
      setError("Teams could not be loaded for editing.");
    }
  };

  const savePlayer = async () => {
    const name = playerForm.name.trim();
    const price = Number(playerForm.basePrice);
    const sportId = playerForm.sportId || cricketSportId;
    const role = requiresRole(sportId) ? playerForm.role : null;

    if (!name || !price || price <= 0 || (requiresRole(sportId) && !role)) {
      setPlayerError(
        requiresRole(sportId)
          ? "Enter a player name, role, and a valid base price."
          : "Enter a player name and a valid base price."
      );
      return;
    }

    const newPlayer = {
      id: uid(),
      name,
      sportId,
      role,
      basePrice: price,
      soldPrice: null,
      isSold: false,
      teamId: null,
    };

    try {
      if (playerTargetId === "edit") {
        setEditForm((current) => ({
          ...current,
          players: [...current.players, newPlayer],
        }));
      } else if (playerTargetId) {
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

  const removeEditPlayer = (playerId) => {
    setEditForm((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== playerId),
    }));
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
    if (
      requiresRole(selectedSportId) &&
      draftPlayers.some((player) => !player.role)
    ) {
      setFormError("Every cricket player needs a role.");
      return;
    }

    const id = uid();
    const payload = {
      id,
      name,
      sportId: selectedSportId,
      budget: tournamentBudget,
      teams: selectedTeams,
      players: draftPlayers.map((player) => ({
        ...player,
        sportId: selectedSportId,
        role: requiresRole(selectedSportId) ? player.role : null,
        tournamentId: id,
      })),
    };

    setBusy(true);
    setFormError("");
    try {
      await api.post("/tournament/create", payload);
      setNotice(`${name} was created successfully.`);
      setShowCreatePanel(false);
      setAuctionName("");
      setSelectedSportId(cricketSportId);
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

  const saveTournamentEdit = async () => {
    if (!editTournament) return;

    const name = editForm.name.trim();
    const tournamentBudget = Number(editForm.budget);

    if (!name || !tournamentBudget || tournamentBudget <= 0) {
      setFormError("Enter a tournament name and a valid team budget.");
      return;
    }
    if (!editForm.teams.length) {
      setFormError("Select at least one participating team.");
      return;
    }
    if (!editForm.players.length) {
      setFormError("Add at least one player before saving.");
      return;
    }
    if (
      requiresRole(editForm.sportId) &&
      editForm.players.some((player) => !player.role)
    ) {
      setFormError("Every cricket player needs a role.");
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      await api.patch(`/tournament/${editTournament.id}`, {
        name,
        sportId: editForm.sportId,
        budget: tournamentBudget,
        teams: editForm.teams,
        players: editForm.players.map((player) => ({
          ...player,
          sportId: editForm.sportId,
          role: requiresRole(editForm.sportId) ? player.role : null,
        })),
      });
      setNotice(`${name} was updated successfully.`);
      setEditTournament(null);
      await loadTournaments();
    } catch {
      setFormError("Unable to update the tournament. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmArchiveTournament = async () => {
    if (!archiveTournament) return;

    setBusy(true);
    try {
      await api.patch(`/tournament/${archiveTournament.id}/archive`);
      setNotice(`${archiveTournament.name} was archived.`);
      setArchiveTournament(null);
      await loadTournaments();
    } catch {
      setError("Unable to archive this tournament. Please try again.");
      setArchiveTournament(null);
    } finally {
      setBusy(false);
    }
  };

  const openImportDialog = (tournament) => {
    setImportTournament(tournament);
    setImportFile(null);
    setImportProgress(0);
    setImportResult(null);
    setImportError("");
  };

  const uploadPlayerCsv = async () => {
    if (!importTournament || !importFile) {
      setImportError("Select a CSV file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("tournamentId", importTournament.id);
    formData.append("csv", importFile);

    setBusy(true);
    setImportError("");
    setImportProgress(0);
    setImportResult(null);
    try {
      const response = await api.post("/players/import", formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setImportProgress(Math.round((event.loaded * 100) / event.total));
        },
      });
      setImportProgress(100);
      setImportResult(response.data);
      setNotice(
        `${response.data.imported} players imported into ${importTournament.name}.`
      );
      await loadTournaments();
    } catch (error) {
      const errors = error.response?.data?.errors;
      setImportError(
        errors?.[0]?.message || "Unable to import this CSV. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadImportTemplate = async (type) => {
    try {
      const response = await api.get(`/players/import/templates/${type}`, {
        responseType: "blob",
      });
      const href = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = href;
      link.download = `player-import-${type}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      setImportError("Unable to download the template.");
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

      <FormControl size="small" sx={{ minWidth: 180, mb: 3 }}>
        <InputLabel>Status</InputLabel>
        <Select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {statusFilters.map((status) => (
            <MenuItem key={status} value={status}>
              {status === "all" ? "All" : statusConfig[status].label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
            <FormControl fullWidth>
              <InputLabel>Sport</InputLabel>
              <Select
                label="Sport"
                value={selectedSportId}
                onChange={(event) => {
                  const sportId = event.target.value;
                  setSelectedSportId(sportId);
                  setDraftPlayers((current) =>
                    current.map((player) => ({
                      ...player,
                      sportId,
                      role: requiresRole(sportId) ? player.role || "" : null,
                    }))
                  );
                  setFormError("");
                }}
              >
                {(sports.length ? sports : [{ id: cricketSportId, name: "Cricket" }]).map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                      ({sportName(player.sportId)}
                      {player.role ? `, ${player.role}` : ""})
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
      ) : !visibleTournaments.length ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="h6">No tournaments match this filter</Typography>
          <Typography color="text.secondary">
            Choose another status to view tournaments.
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
          {visibleTournaments.map((tournament) => {
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
                  {tournament.status === "archived" && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This tournament is archived and read-only.
                    </Alert>
                  )}
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
                    {tournament.status === "upcoming" && (
                      <Button
                        variant="outlined"
                        onClick={() => openEditTournament(tournament)}
                      >
                        Edit Tournament
                      </Button>
                    )}
                    {tournament.status === "completed" && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setArchiveTournament(tournament)}
                      >
                        Archive Tournament
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => openPlayerDialog(tournament.id)}
                      disabled={tournament.status !== "upcoming"}
                    >
                      Add Player
                    </Button>
                    {tournament.status === "upcoming" && (
                      <Button
                        variant="outlined"
                        startIcon={<FileUploadRoundedIcon />}
                        onClick={() => openImportDialog(tournament)}
                      >
                        Import Players
                      </Button>
                    )}
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
              <InputLabel>Sport</InputLabel>
              <Select
                label="Sport"
                value={playerForm.sportId}
                disabled={Boolean(playerTargetId)}
                onChange={(event) =>
                  setPlayerForm((current) => {
                    const sportId = event.target.value;
                    return {
                      ...current,
                      sportId,
                      role: requiresRole(sportId) ? current.role || "" : null,
                    };
                  })
                }
              >
                {(sports.length ? sports : [{ id: cricketSportId, name: "Cricket" }]).map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {requiresRole(playerForm.sportId) && (
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={playerForm.role || ""}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                >
                  {playerRoles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
        open={Boolean(editTournament)}
        onClose={() => !busy && setEditTournament(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Tournament</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tournament name"
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Sport</InputLabel>
              <Select
                label="Sport"
                value={editForm.sportId}
                onChange={(event) => {
                  const sportId = event.target.value;
                  setEditForm((current) => ({
                    ...current,
                    sportId,
                    players: current.players.map((player) => ({
                      ...player,
                      sportId,
                      role: requiresRole(sportId) ? player.role || "" : null,
                    })),
                  }));
                }}
              >
                {(sports.length ? sports : [{ id: cricketSportId, name: "Cricket" }]).map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Budget per team"
              type="number"
              value={editForm.budget}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  budget: event.target.value,
                }))
              }
              fullWidth
            />
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={teamsList.map((team) => team.name)}
              value={editForm.teams}
              onChange={(_, values) =>
                setEditForm((current) => ({ ...current, teams: values }))
              }
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
            />
          </Stack>

          <Divider sx={{ my: 3 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">
              Player Pool ({editForm.players.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => openPlayerDialog("edit")}
            >
              Add Player
            </Button>
          </Stack>
          {editForm.players.length ? (
            <Stack spacing={1}>
              {editForm.players.map((player) => (
                <Stack
                  key={player.id}
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
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
                      ({sportName(player.sportId)}
                      {player.role ? `, ${player.role}` : ""}) -{" "}
                      {formatAmount(player.basePrice)}
                    </Typography>
                  </Typography>
                  <Button
                    color="error"
                    size="small"
                    onClick={() => removeEditPlayer(player.id)}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Add at least one player before saving.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setEditTournament(null)}
          >
            Cancel
          </Button>
          <Button variant="contained" disabled={busy} onClick={saveTournamentEdit}>
            {busy ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(archiveTournament)}
        onClose={() => !busy && setArchiveTournament(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Archive tournament?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Archiving {archiveTournament?.name} will mark it read-only. Archived
            tournaments cannot move back to another status.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setArchiveTournament(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={busy}
            onClick={confirmArchiveTournament}
          >
            {busy ? "Archiving..." : "Archive Tournament"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(importTournament)}
        onClose={() => !busy && setImportTournament(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Import players</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Typography color="text.secondary">
              {importTournament?.name} accepts {sportName(importTournament?.sportId)} players only.
            </Typography>
            {importError && <Alert severity="error">{importError}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => downloadImportTemplate("cricket")}
              >
                Cricket template
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => downloadImportTemplate("mixed")}
              >
                Mixed template
              </Button>
            </Stack>
            <Button
              component="label"
              variant="outlined"
              startIcon={<FileUploadRoundedIcon />}
            >
              {importFile ? importFile.name : "Select CSV File"}
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportResult(null);
                  setImportError("");
                  setImportProgress(0);
                }}
              />
            </Button>
            {busy && importTournament && (
              <Box>
                <LinearProgress variant="determinate" value={importProgress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Uploading {importProgress}%
                </Typography>
              </Box>
            )}
            {importResult && (
              <Alert severity={importResult.failed ? "warning" : "success"}>
                Imported {importResult.imported} players. Failed {importResult.failed} rows.
              </Alert>
            )}
            {importResult?.errors?.length > 0 && (
              <List dense disablePadding>
                {importResult.errors.map((rowError, index) => (
                  <ListItem key={`${rowError.row}-${index}`} disableGutters>
                    <ListItemText
                      primary={`Row ${rowError.row ?? "-"}: ${rowError.message}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setImportTournament(null)}
          >
            Close
          </Button>
          <Button
            variant="contained"
            disabled={busy || !importFile}
            onClick={uploadPlayerCsv}
          >
            {busy ? "Uploading..." : "Upload CSV"}
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
                    secondary={`${sportName(player.sportId)}${
                      player.role ? ` | ${player.role}` : ""
                    } | Base price: ${formatAmount(
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
