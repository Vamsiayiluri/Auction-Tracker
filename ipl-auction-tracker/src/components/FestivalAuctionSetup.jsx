import { useCallback, useEffect, useMemo, useState } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function FestivalAuctionSetup({
  festivalId,
  onRosterChanged,
  operationRevision = 0,
  locked = false,
  section = "all",
}) {
  const [teams, setTeams] = useState([]);
  const [owners, setOwners] = useState({});
  const [retentions, setRetentions] = useState([]);
  const [pool, setPool] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [config, setConfig] = useState(null);
  const [budgetReadOnly, setBudgetReadOnly] = useState(false);
  const [configForm, setConfigForm] = useState({
    totalBudget: "",
    ownerCost: "",
    incrementPercentage: 20,
  });
  const [ownerSelections, setOwnerSelections] = useState({});
  const [retentionForm, setRetentionForm] = useState({
    teamId: "",
    participantIds: [],
    amount: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [poolSearch, setPoolSearch] = useState("");
  const [poolSport, setPoolSport] = useState("");
  const [retentionSearch, setRetentionSearch] = useState("");
  const [retentionTeam, setRetentionTeam] = useState("");

  const loadSetup = useCallback(async () => {
    void operationRevision;
    setError("");
    try {
      const [teamsResponse, retentionsResponse, poolResponse] =
        await Promise.all([
          api.get(`/v2/festivals/${festivalId}/teams`),
          api.get(`/v2/festivals/${festivalId}/retentions`),
          api.get(`/v2/festivals/${festivalId}/auction-pool`),
        ]);
      const loadedTeams = teamsResponse.data.data || [];
      const ownerEntries = await Promise.all(
        loadedTeams.map(async (team) => {
          const response = await api.get(
            `/v2/festivals/${festivalId}/teams/${team.id}/owner`
          );
          return [team.id, response.data.data];
        })
      );
      const loadedConfig =
        retentionsResponse.data.config || poolResponse.data.config || null;

      setTeams(loadedTeams);
      setOwners(Object.fromEntries(ownerEntries));
      setRetentions(retentionsResponse.data.data || []);
      setPool(poolResponse.data.data || []);
      setBudgets(
        retentionsResponse.data.budgets || poolResponse.data.budgets || []
      );
      setConfig(loadedConfig);
      setBudgetReadOnly(
        Boolean(
          retentionsResponse.data.budgetReadOnly ||
            poolResponse.data.budgetReadOnly
        )
      );
      if (loadedConfig) {
        setConfigForm({
          totalBudget: String(loadedConfig.totalBudget),
          ownerCost: String(loadedConfig.ownerCost),
          incrementPercentage: loadedConfig.incrementPercentage || 20,
        });
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load main auction setup."
      );
    }
  }, [festivalId, operationRevision]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  const allocatedParticipantIds = useMemo(
    () =>
      new Set([
        ...Object.values(owners)
          .filter(Boolean)
          .map(({ festivalParticipantId }) => festivalParticipantId),
        ...retentions.map(
          ({ festivalParticipantId }) => festivalParticipantId
        ),
      ]),
    [owners, retentions]
  );

  const availableParticipants = pool.filter(
    (participant) => !allocatedParticipantIds.has(participant.id)
  );
  const filteredRetentions = retentions.filter((retention) => {
    const matchesTeam =
      !retentionTeam || retention.festivalTeamId === retentionTeam;
    const value = retentionSearch.trim().toLowerCase();
    const matchesSearch =
      !value ||
      [
        retention.participant?.employee?.employeeNumber,
        retention.participant?.employee?.name,
        retention.team?.name,
      ].some((field) => String(field || "").toLowerCase().includes(value));
    return matchesTeam && matchesSearch;
  });
  const poolSports = Array.from(
    new Map(
      pool.flatMap((participant) =>
        (participant.sports || []).map((registration) => [
          registration.sportId,
          registration.sport?.name || registration.sportId,
        ])
      )
    )
  );
  const filteredPool = pool.filter((participant) => {
    const value = poolSearch.trim().toLowerCase();
    const matchesSearch =
      !value ||
      [
        participant.employee?.employeeNumber,
        participant.employee?.name,
        participant.employee?.department,
      ].some((field) => String(field || "").toLowerCase().includes(value));
    const matchesSport =
      !poolSport ||
      (participant.sports || []).some(
        (registration) => registration.sportId === poolSport
      );
    return matchesSearch && matchesSport;
  });

  const saveConfig = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await api.patch(
        `/v2/festivals/${festivalId}/auction-config`,
        {
          totalBudget: Number(configForm.totalBudget),
          ownerCost: Number(configForm.ownerCost),
          incrementPercentage: Number(configForm.incrementPercentage),
        }
      );
      setConfig(response.data.data);
      setBudgets(response.data.budgets || []);
      setNotice("Main auction budget configuration saved.");
      await loadSetup();
      await onRosterChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save auction configuration."
      );
    } finally {
      setBusy(false);
    }
  };

  const assignOwner = async (teamId) => {
    const participantId = ownerSelections[teamId];
    if (!participantId) return;
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/v2/festivals/${festivalId}/teams/${teamId}/owner`,
        { participantId }
      );
      setOwnerSelections((current) => ({ ...current, [teamId]: "" }));
      setNotice(
        "Team owner assigned. The user account was created or linked and credentials were emailed."
      );
      await loadSetup();
      await onRosterChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to assign team owner."
      );
      if (requestError.response?.data?.data) {
        await loadSetup();
        await onRosterChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const resendOwnerCredentials = async (teamId) => {
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/v2/festivals/${festivalId}/teams/${teamId}/owner/credentials`
      );
      setNotice("Team Owner credentials emailed.");
      await loadSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to resend Team Owner credentials."
      );
    } finally {
      setBusy(false);
    }
  };

  const createRetention = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/v2/festivals/${festivalId}/retentions/bulk`, {
        assignments: retentionForm.participantIds.map((participantId) => ({
          teamId: retentionForm.teamId,
          participantId,
          amount: Number(retentionForm.amount),
        })),
      });
      setRetentionForm({ teamId: "", participantIds: [], amount: "" });
      setNotice("Selected participants retained and removed from the pool.");
      await loadSetup();
      await onRosterChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to create retention."
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteRetention = async (retentionId) => {
    setBusy(true);
    setError("");
    try {
      await api.delete(
        `/v2/festivals/${festivalId}/retentions/${retentionId}`
      );
      setNotice("Retention removed and purse restored.");
      await loadSetup();
      await onRosterChanged?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to remove retention."
      );
    } finally {
      setBusy(false);
    }
  };

  const setupLocked = locked;
  const showBudget = ["all", "budget"].includes(section);
  const showOwners = ["all", "owners"].includes(section);
  const showRetentions = ["all", "retentions"].includes(section);
  const showPool = ["all", "pool"].includes(section);

  return (
    <Card id="festival-auction-setup" variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6">Main Festival Auction Setup</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Configure team purses, mandatory owner retention, optional retentions,
          and the eligible participant pool before the live auction starts.
        </Typography>

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

        {showBudget && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Auction Configuration
            </Typography>
            {budgetReadOnly && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Budget configuration is read-only because sold auction results
                exist.
              </Alert>
            )}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              sx={{ mb: 3 }}
            >
          <TextField
            label="Budget per Festival Team"
            type="number"
            value={configForm.totalBudget}
            disabled={busy || setupLocked || budgetReadOnly}
            onChange={(event) =>
              setConfigForm((current) => ({
                ...current,
                totalBudget: event.target.value,
              }))
            }
          />
          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel>Bid Increment Percentage</InputLabel>
            <Select
              label="Bid Increment Percentage"
              value={configForm.incrementPercentage}
              disabled={busy || setupLocked || budgetReadOnly}
              onChange={(event) =>
                setConfigForm((current) => ({
                  ...current,
                  incrementPercentage: event.target.value,
                }))
              }
            >
              <MenuItem value={20}>20%</MenuItem>
              <MenuItem value={25}>25%</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Owner Cost"
            type="number"
            value={configForm.ownerCost}
            disabled={
              busy ||
              setupLocked ||
              budgetReadOnly ||
              Object.values(owners).some(Boolean)
            }
            onChange={(event) =>
              setConfigForm((current) => ({
                ...current,
                ownerCost: event.target.value,
              }))
            }
          />
          <Button
            variant="contained"
            disabled={
              busy ||
              setupLocked ||
              budgetReadOnly ||
              !Number(configForm.totalBudget) ||
              !Number(configForm.ownerCost)
            }
            onClick={saveConfig}
          >
            Save Configuration
          </Button>
          {config && <Chip label={`Auction: ${config.status}`} />}
            </Stack>
          </>
        )}

        {showOwners && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Team Owners And Budgets
            </Typography>
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
          {teams.map((team) => {
            const owner = owners[team.id];
            const budget = budgets.find(
              ({ festivalTeamId }) => festivalTeamId === team.id
            );
            return (
              <Card key={team.id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1">{team.name}</Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Total: ${formatMoney(budget?.totalBudget)}`}
                    />
                    <Chip
                      size="small"
                      label={`Spent: ${formatMoney(budget?.spentBudget)}`}
                    />
                    <Chip
                      size="small"
                      color="success"
                      label={`Remaining: ${formatMoney(
                        budget?.remainingBudget
                      )}`}
                    />
                  </Stack>
                  {owner && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Owner: {owner.participant?.employee?.name} (
                      {owner.participant?.employee?.employeeNumber})
                      <br />
                      Mandatory cost: {formatMoney(owner.ownerCost)}
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ mt: 1 }}
                      >
                        <Chip
                          size="small"
                          label={`User Status: ${
                            owner.userStatus || "Existing User"
                          }`}
                        />
                        <Chip
                          size="small"
                          color="success"
                          label="Active"
                        />
                      </Stack>
                      <Button
                        size="small"
                        sx={{ mt: 1 }}
                        disabled={busy}
                        onClick={() => resendOwnerCredentials(team.id)}
                      >
                        Resend Credentials
                      </Button>
                    </Alert>
                  )}
                  {(!owner || !setupLocked) && (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ mt: 2 }}
                    >
                      <FormControl fullWidth size="small">
                        <InputLabel>Employee</InputLabel>
                        <Select
                          label="Employee"
                          value={ownerSelections[team.id] || ""}
                          disabled={busy || !config || setupLocked}
                          onChange={(event) =>
                            setOwnerSelections((current) => ({
                              ...current,
                              [team.id]: event.target.value,
                            }))
                          }
                        >
                          {availableParticipants.map((participant) => (
                            <MenuItem key={participant.id} value={participant.id}>
                              {participant.employee?.employeeNumber} -{" "}
                              {participant.employee?.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        disabled={
                          busy ||
                          !config ||
                          setupLocked ||
                          !ownerSelections[team.id]
                        }
                        onClick={() => assignOwner(team.id)}
                      >
                        {owner ? "Change Owner" : "Assign Owner"}
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
            </Box>
          </>
        )}

        {showRetentions && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Retentions
            </Typography>
            <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel>Festival Team</InputLabel>
            <Select
              label="Festival Team"
              value={retentionForm.teamId}
              disabled={busy || !config || setupLocked}
              onChange={(event) =>
                setRetentionForm((current) => ({
                  ...current,
                  teamId: event.target.value,
                }))
              }
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel>Participant</InputLabel>
            <Select
              multiple
              label="Participant"
              value={retentionForm.participantIds}
              disabled={busy || !config || setupLocked}
              onChange={(event) =>
                setRetentionForm((current) => ({
                  ...current,
                  participantIds: event.target.value,
                }))
              }
            >
              {availableParticipants.map((participant) => (
                <MenuItem key={participant.id} value={participant.id}>
                  {participant.employee?.employeeNumber} -{" "}
                  {participant.employee?.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Retention Amount"
            type="number"
            value={retentionForm.amount}
            disabled={busy || !config || setupLocked}
            onChange={(event) =>
              setRetentionForm((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
          />
          <Button
            variant="contained"
            disabled={
              busy ||
              !config ||
              setupLocked ||
              !retentionForm.teamId ||
              !retentionForm.participantIds.length ||
              !Number(retentionForm.amount)
            }
            onClick={createRetention}
          >
            Retain Selected ({retentionForm.participantIds.length})
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="Search retentions"
            value={retentionSearch}
            onChange={(event) => setRetentionSearch(event.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter Team</InputLabel>
            <Select
              label="Filter Team"
              value={retentionTeam}
              onChange={(event) => setRetentionTeam(event.target.value)}
            >
              <MenuItem value="">All Teams</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Participant</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRetentions.map((retention) => (
                <TableRow key={retention.id}>
                  <TableCell>
                    {retention.participant?.employee?.employeeNumber} -{" "}
                    {retention.participant?.employee?.name}
                  </TableCell>
                  <TableCell>{retention.team?.name}</TableCell>
                  <TableCell>{formatMoney(retention.amount)}</TableCell>
                  <TableCell align="right">
                    <Button
                      color="error"
                      size="small"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      disabled={busy || setupLocked}
                      onClick={() => deleteRetention(retention.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </TableContainer>
          </>
        )}

        {showPool && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Auction Pool ({pool.length})
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="Search auction pool"
            value={poolSearch}
            onChange={(event) => setPoolSearch(event.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter Sport</InputLabel>
            <Select
              label="Filter Sport"
              value={poolSport}
              onChange={(event) => setPoolSport(event.target.value)}
            >
              <MenuItem value="">All Sports</MenuItem>
              {poolSports.map(([sportId, name]) => (
                <MenuItem key={sportId} value={sportId}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee Number</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Registered Sports</TableCell>
                <TableCell>Sport Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPool.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>
                    {participant.employee?.employeeNumber || "Needs review"}
                  </TableCell>
                  <TableCell>{participant.employee?.name}</TableCell>
                  <TableCell>{participant.employee?.department || "-"}</TableCell>
                  <TableCell>
                    {(participant.sports || [])
                      .map(
                        (registration) =>
                          registration.sport?.name || registration.sportId
                      )
                      .join(", ") || "None"}
                  </TableCell>
                  <TableCell>{participant.sportCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
