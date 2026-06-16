import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";

const emptyForm = {
  contextKey: "",
  festivalSportId: "",
  name: "",
  code: "",
  division: "men",
  participantGenderRule: "male",
  teamCount: 3,
};

export default function SportTournamentDirectory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const saveInFlight = useRef(false);
  const [tournaments, setTournaments] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const canCreate = user?.role === "admin" || user?.role === "team_owner";

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tournamentResponse, contextResponse] = await Promise.all([
        api.get("/v2/sport-tournaments"),
        api.get("/v2/sport-tournaments/owner-contexts"),
      ]);
      setTournaments(tournamentResponse.data.data || []);
      setContexts(contextResponse.data.data || []);
    } catch {
      setError("Unable to load Sport Tournaments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (
      !canCreate ||
      searchParams.get("create") !== "1" ||
      !contexts.length
    ) {
      return;
    }
    const festivalId = searchParams.get("festivalId");
    const context =
      contexts.find((item) => item.festivalId === festivalId) || contexts[0];
    setForm((current) => ({
      ...current,
      contextKey: `${context.festivalId}:${context.festivalTeamId}`,
      festivalSportId: "",
    }));
    setDialogOpen(true);
  }, [canCreate, contexts, searchParams]);

  const selectedContext = useMemo(
    () =>
      contexts.find(
        ({ festivalId, festivalTeamId }) =>
          `${festivalId}:${festivalTeamId}` === form.contextKey
      ),
    [contexts, form.contextKey]
  );

  const createTournament = async () => {
    if (saveInFlight.current) return;
    if (
      !selectedContext ||
      !form.festivalSportId ||
      !form.name.trim() ||
      !form.code.trim()
    ) {
      setFormError("Festival Team, Sport, name, and code are required.");
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setFormError("");
    try {
      const response = await api.post(
        `/v2/festivals/${selectedContext.festivalId}/teams/${selectedContext.festivalTeamId}/sport-tournaments`,
        {
          festivalSportId: form.festivalSportId,
          name: form.name,
          code: form.code,
          division: form.division,
          participantGenderRule: form.participantGenderRule,
          teamCount: Number(form.teamCount),
        }
      );
      setDialogOpen(false);
      setForm(emptyForm);
      await loadData();
      navigate(`/sport-tournaments/${response.data.data.id}/manage`);
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.message ||
          requestError.response?.data?.errors?.[0]?.message ||
          "Unable to create Sport Tournament."
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <CircularProgress size={36} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={loadData}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5">Sport Tournaments</Typography>
          <Typography color="text.secondary">
            {canCreate
              ? "Build internal Sport Teams and assign eligible Employee Captains."
              : "Follow active and completed Sport Auctions in real time."}
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            disabled={!contexts.length}
            onClick={() => setDialogOpen(true)}
          >
            Create Sport Tournament
          </Button>
        )}
      </Stack>

      {canCreate && !contexts.length && (
        <Alert severity="info">
          No active Festival Team Owner assignment is available for Sport
          Tournament creation.
        </Alert>
      )}

      {!tournaments.length ? (
        <Alert severity="info">No Sport Tournaments have been created.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {tournaments.map((tournament) => (
            <Card key={tournament.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6">{tournament.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tournament.festivalTeam?.name} | {tournament.sport?.name}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={
                      tournament.status === "auction_live"
                        ? "success"
                        : tournament.status === "auction_paused"
                          ? "warning"
                          : tournament.status === "auction_completed"
                            ? "info"
                            : tournament.status === "ready"
                              ? "success"
                              : "default"
                    }
                    label={tournament.status.replaceAll("_", " ")}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 3 }}>
                  <GroupsRoundedIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {tournament.teamCount} Teams | {tournament.division}
                  </Typography>
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      [
                        "ready",
                        "auction_live",
                        "auction_paused",
                        "auction_completed",
                      ].includes(tournament.status)
                        ? `/auctions/sports/${tournament.id}`
                        : `/sport-tournaments/${tournament.id}/manage`
                    )
                  }
                >
                  {[
                    "ready",
                    "auction_live",
                    "auction_paused",
                    "auction_completed",
                  ].includes(tournament.status)
                    ? "Open Auction"
                    : "Open Workspace"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Sport Tournament</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl fullWidth>
              <InputLabel>Festival Team</InputLabel>
              <Select
                label="Festival Team"
                value={form.contextKey}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contextKey: event.target.value,
                    festivalSportId: "",
                  }))
                }
              >
                {contexts.map((context) => (
                  <MenuItem
                    key={`${context.festivalId}:${context.festivalTeamId}`}
                    value={`${context.festivalId}:${context.festivalTeamId}`}
                  >
                    {context.festivalName} | {context.festivalTeamName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={!selectedContext}>
              <InputLabel>Sport</InputLabel>
              <Select
                label="Sport"
                value={form.festivalSportId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    festivalSportId: event.target.value,
                  }))
                }
              >
                {(selectedContext?.sports || []).map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Tournament name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Code"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Division</InputLabel>
                <Select
                  label="Division"
                  value={form.division}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      division: event.target.value,
                    }))
                  }
                >
                  {["men", "women", "mixed", "open"].map((division) => (
                    <MenuItem key={division} value={division}>
                      {division}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Gender rule</InputLabel>
                <Select
                  label="Gender rule"
                  value={form.participantGenderRule}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      participantGenderRule: event.target.value,
                    }))
                  }
                >
                  {["male", "female", "any"].map((rule) => (
                    <MenuItem key={rule} value={rule}>
                      {rule}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Number of Teams"
                type="number"
                inputProps={{ min: 2, max: 26 }}
                value={form.teamCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    teamCount: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={saving} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={saving} onClick={createTournament}>
            {saving ? "Creating..." : "Create and Generate Teams"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
