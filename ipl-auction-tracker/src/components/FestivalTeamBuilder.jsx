import { useCallback, useEffect, useRef, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";

const emptyTeam = {
  name: "",
  code: "",
  color: "#1976D2",
  logoUrl: "",
};

export default function FestivalTeamBuilder({
  festivalId,
  participantRevision,
  rosterFormationMode,
  operationRevision = 0,
  onTeamsChanged,
  locked = false,
}) {
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [assignmentStatus, setAssignmentStatus] = useState("draft");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState(emptyTeam);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const actionInFlight = useRef(false);

  const loadTeamBuilder = useCallback(async () => {
    void participantRevision;
    void operationRevision;
    setError("");
    try {
      const [teamsResponse, assignmentsResponse] = await Promise.all([
        api.get(`/v2/festivals/${festivalId}/teams`),
        api.get(`/v2/festivals/${festivalId}/team-assignments`),
      ]);
      setTeams(teamsResponse.data.data || []);
      setAssignments(assignmentsResponse.data.data || []);
      setUnassigned(assignmentsResponse.data.unassigned || []);
      setAssignmentStatus(
        assignmentsResponse.data.meta?.assignmentStatus ||
          teamsResponse.data.meta?.assignmentStatus ||
          "draft"
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load festival team assignments."
      );
    } finally {
      setLoading(false);
    }
  }, [festivalId, participantRevision, operationRevision]);

  useEffect(() => {
    loadTeamBuilder();
  }, [loadTeamBuilder]);

  const openCreate = () => {
    setEditingTeam(null);
    setForm(emptyTeam);
    setDialogOpen(true);
  };

  const openEdit = (team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      code: team.code,
      color: team.color || "#1976D2",
      logoUrl: team.logoUrl || "",
    });
    setDialogOpen(true);
  };

  const beginAction = (action) => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setBusy(true);
    setActiveAction(action);
    setError("");
    return true;
  };

  const endAction = () => {
    actionInFlight.current = false;
    setBusy(false);
    setActiveAction("");
  };

  const saveTeam = async () => {
    if (!beginAction("save-team")) return;
    try {
      const payload = {
        name: form.name,
        code: form.code,
        color: form.color || null,
        logoUrl: form.logoUrl || null,
      };
      if (editingTeam) {
        await api.patch(
          `/v2/festivals/${festivalId}/teams/${editingTeam.id}`,
          payload
        );
      } else {
        await api.post(`/v2/festivals/${festivalId}/teams`, payload);
      }
      setDialogOpen(false);
      setNotice(editingTeam ? "Festival team updated." : "Festival team created.");
      await loadTeamBuilder();
      await onTeamsChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save festival team."
      );
    } finally {
      endAction();
    }
  };

  const deleteTeam = async (team) => {
    if (!beginAction(`delete-team:${team.id}`)) return;
    try {
      await api.delete(`/v2/festivals/${festivalId}/teams/${team.id}`);
      setNotice(`${team.name} deleted.`);
      await loadTeamBuilder();
      await onTeamsChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to delete festival team."
      );
    } finally {
      endAction();
    }
  };

  const moveParticipant = async (participantId, teamId) => {
    if (!teamId || !beginAction(`move:${participantId}`)) return;
    try {
      await api.post(`/v2/festivals/${festivalId}/team-assignments`, {
        participantId,
        teamId,
      });
      setNotice("Participant assignment updated.");
      await loadTeamBuilder();
      await onTeamsChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update participant assignment."
      );
    } finally {
      endAction();
    }
  };

  const autoBalance = async () => {
    if (!beginAction("auto-balance")) return;
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/team-assignments/auto-balance`,
        {}
      );
      setNotice(`Auto-balanced ${response.data.assigned} participants.`);
      await loadTeamBuilder();
      await onTeamsChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to auto-balance participants."
      );
    } finally {
      endAction();
    }
  };

  const lockAssignments = async () => {
    if (!beginAction("lock-assignments")) return;
    try {
      await api.patch(
        `/v2/festivals/${festivalId}/team-assignments/lock`,
        {}
      );
      setNotice("Festival team assignments locked.");
      await loadTeamBuilder();
      await onTeamsChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to lock festival team assignments."
      );
    } finally {
      endAction();
    }
  };

  const activeTeams = teams.filter(({ status }) => status === "active");
  const assignmentsByTeam = new Map(
    teams.map((team) => [
      team.id,
      assignments.filter(
        (assignment) => assignment.festivalTeamId === team.id
      ),
    ])
  );
  const assignmentsLocked = assignmentStatus === "locked";
  const manualMode = rosterFormationMode === "manual";
  const teamConfigurationLocked =
    locked ||
    (manualMode
      ? assignmentsLocked || assignmentStatus !== "draft"
      : false);
  const normalizedSearch = search.trim().toLowerCase();
  const matchesParticipant = (participant) =>
    !normalizedSearch ||
    [
      participant?.employee?.name,
      participant?.employee?.employeeNumber,
      participant?.employee?.email,
    ].some((field) =>
      String(field || "").toLowerCase().includes(normalizedSearch)
    );
  const visibleAssignmentsByTeam = new Map(
    teams.map((team) => [
      team.id,
      (assignmentsByTeam.get(team.id) || []).filter((membership) =>
        matchesParticipant(membership.participant)
      ),
    ])
  );
  const visibleUnassigned = unassigned.filter(matchesParticipant);

  if (loading) {
    return (
      <Card id="festival-teams" variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress size={30} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="festival-teams" variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Festival Teams</Typography>
            <Typography color="text.secondary">
              {manualMode
                ? "Manual roster formation is active. Assign participants directly or use deterministic auto-balance."
                : "Auction roster formation is active. Team definitions are managed here; roster membership comes from owners, retentions, and auction sales."}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Chip
              label={`Assignments: ${assignmentStatus}`}
              color={assignmentsLocked ? "success" : "default"}
            />
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              disabled={busy || teamConfigurationLocked}
              onClick={openCreate}
            >
              Create Team
            </Button>
            {manualMode && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeRoundedIcon />}
                  disabled={busy || locked || activeTeams.length < 2}
                  onClick={autoBalance}
                >
                  {activeAction === "auto-balance"
                    ? "Balancing..."
                    : "Auto Balance"}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<LockRoundedIcon />}
                  disabled={
                    busy ||
                    locked ||
                    assignments.length === 0 ||
                    unassigned.length > 0
                  }
                  onClick={lockAssignments}
                >
                  {activeAction === "lock-assignments"
                    ? "Locking..."
                    : "Lock Assignments"}
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setNotice("")}
          >
            {notice}
          </Alert>
        )}
        {manualMode && unassigned.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {unassigned.length} registered participant
            {unassigned.length === 1 ? " is" : "s are"} not assigned.
          </Alert>
        )}
        <TextField
          fullWidth
          size="small"
          label="Search by employee name, number, or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 2 }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {teams.map((team) => (
            <Card key={team.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box>
                    <Typography variant="subtitle1">{team.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.code}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      startIcon={<EditRoundedIcon />}
                      disabled={busy || teamConfigurationLocked}
                      onClick={() => openEdit(team)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      disabled={busy || teamConfigurationLocked}
                      onClick={() => deleteTeam(team)}
                    >
                      {activeAction === `delete-team:${team.id}`
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    label={`Participants: ${team.participantCount || 0}`}
                  />
                  <Chip
                    size="small"
                    label={`Strength: ${team.strengthScore || 0}`}
                  />
                  <Chip size="small" label={team.status} />
                </Stack>

                <TableContainer sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Sports</TableCell>
                        {manualMode && <TableCell>Move</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(visibleAssignmentsByTeam.get(team.id) || []).map(
                        (membership) => (
                          <TableRow key={membership.id}>
                            <TableCell>
                              {membership.participant?.employee?.name}
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                {membership.participant?.employee
                                  ?.employeeNumber || "Needs review"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                useFlexGap
                                flexWrap="wrap"
                              >
                                {(membership.participant?.sports || []).map(
                                  (registration) => (
                                    <Chip
                                      key={registration.id}
                                      size="small"
                                      label={
                                        registration.sport?.name ||
                                        registration.sportId
                                      }
                                    />
                                  )
                                )}
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`Count: ${membership.strengthScore}`}
                                />
                              </Stack>
                            </TableCell>
                            {manualMode && (
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                  <InputLabel>Team</InputLabel>
                                  <Select
                                    label="Team"
                                    value={membership.festivalTeamId}
                                    disabled={busy || locked}
                                    onChange={(event) =>
                                      moveParticipant(
                                        membership.festivalParticipantId,
                                        event.target.value
                                      )
                                    }
                                  >
                                    {activeTeams.map((option) => (
                                      <MenuItem key={option.id} value={option.id}>
                                        {option.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      )}
                      {!visibleAssignmentsByTeam.get(team.id)?.length && (
                        <TableRow>
                          <TableCell colSpan={manualMode ? 3 : 2} align="center">
                            {normalizedSearch
                              ? "No roster members match this search."
                              : "No participants assigned to this team."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))}
        </Box>

        {manualMode && unassigned.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Unassigned Participants
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Selected Sports</TableCell>
                    <TableCell>Sport Count</TableCell>
                    <TableCell>Assign Team</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleUnassigned.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        {participant.employee?.name}
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {participant.employee?.employeeNumber ||
                            "Needs review"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(participant.sports || [])
                          .map(
                            (registration) =>
                              registration.sport?.name || registration.sportId
                          )
                          .join(", ") || "None"}
                      </TableCell>
                      <TableCell>{participant.strengthScore}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel>Festival Team</InputLabel>
                          <Select
                            label="Festival Team"
                            value=""
                            disabled={busy || locked}
                            onChange={(event) =>
                              moveParticipant(participant.id, event.target.value)
                            }
                          >
                            {activeTeams.map((team) => (
                              <MenuItem key={team.id} value={team.id}>
                                {team.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!visibleUnassigned.length && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No unassigned participants match this search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>

      <Dialog
        open={dialogOpen}
        onClose={() => !busy && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingTeam ? "Edit Festival Team" : "Create Festival Team"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Team name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <TextField
              label="Team code"
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
            <TextField
              label="Team color"
              type="color"
              value={form.color}
              onChange={(event) =>
                setForm((current) => ({ ...current, color: event.target.value }))
              }
            />
            <TextField
              label="Logo URL (optional)"
              value={form.logoUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  logoUrl: event.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !form.name.trim() || !form.code.trim()}
            onClick={saveTeam}
          >
            {activeAction === "save-team" ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
