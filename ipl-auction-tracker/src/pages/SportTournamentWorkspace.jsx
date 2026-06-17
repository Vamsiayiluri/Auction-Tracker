import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import {
  getSportAuctionStageFromState,
  isReadyStage,
  isLiveStage,
  isCompletedStage,
} from "../utils/auctionStages";
import { ProductStateCard, LoadingStateCard } from "../components/ProductState";

const sections = [
  "Overview",
  "Teams",
  "Captains",
  "Eligibility",
  "Budgets",
  "Pool",
  "Readiness",
  "Settings",
];

const participantLabel = (participant) => {
  const employee = participant?.employee;
  return employee
    ? `${employee.name}${employee.employeeNumber ? ` (${employee.employeeNumber})` : ""}`
    : "";
};

export default function SportTournamentWorkspace() {
  const { sportTournamentId } = useParams();
  const navigate = useNavigate();
  const mutationInFlight = useRef(false);
  const [activeSection, setActiveSection] = useState("Overview");
  const [tournament, setTournament] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [teamEdits, setTeamEdits] = useState({});
  const [budgetEdits, setBudgetEdits] = useState({});
  const [totalCredits, setTotalCredits] = useState("");
  const [auctionState, setAuctionState] = useState(null);
  const [auctionConfig, setAuctionConfig] = useState({
    timerDurationSeconds: 20,
    incrementPercentage: 20,
    reauctionEnabled: true,
  });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        tournamentResponse,
        eligibilityResponse,
        readinessResponse,
        budgetResponse,
        poolResponse,
        auctionResponse,
      ] =
        await Promise.all([
          api.get(`/v2/sport-tournaments/${sportTournamentId}`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/eligibility`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/readiness`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/budgets`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/pool`),
          api.get(`/v2/sport-tournaments/${sportTournamentId}/auction/current`),
        ]);
      const nextTournament = tournamentResponse.data.data;
      setTournament(nextTournament);
      setEligibility(eligibilityResponse.data.data);
      setReadiness(readinessResponse.data.data);
      setBudgets(budgetResponse.data.data);
      setPool(poolResponse.data.data);
      setAuctionState(auctionResponse.data.data);
      if (auctionResponse.data.data?.config) {
        setAuctionConfig({
          timerDurationSeconds:
            auctionResponse.data.data.config.timerDurationSeconds,
          incrementPercentage:
            auctionResponse.data.data.config.incrementPercentage,
          reauctionEnabled:
            auctionResponse.data.data.config.reauctionEnabled,
        });
      }
      setSettings({
        name: nextTournament.name,
        code: nextTournament.code,
        division: nextTournament.division,
        participantGenderRule: nextTournament.participantGenderRule,
        teamCount: nextTournament.teamCount,
      });
      setTeamEdits(
        Object.fromEntries(
          (nextTournament.teams || []).map((team) => [
            team.id,
            { name: team.name, code: team.code },
          ])
        )
      );
      setBudgetEdits(
        Object.fromEntries(
          (budgetResponse.data.data?.teams || []).map((team) => [
            team.sportTeamId,
            {
              allocatedCredits: team.allocatedCredits,
              adjustmentCredits: team.adjustmentCredits,
              status: team.status === "missing" ? "active" : team.status,
            },
          ])
        )
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load Sport Tournament workspace."
      );
    } finally {
      setLoading(false);
    }
  }, [sportTournamentId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const mutate = async (action, successMessage) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setSaving(true);
    setError("");
    try {
      await action();
      await loadWorkspace();
      setNotice(successMessage);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.errors?.[0]?.message ||
          "Unable to save changes."
      );
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  };

  const eligibleCaptainOptions = useMemo(
    () => eligibility?.included || [],
    [eligibility]
  );
  const canManage = Boolean(tournament?.permissions?.canManage);
  const canEditSetup =
    canManage && ["draft", "setup", "ready"].includes(tournament?.status);
  const sportStage = getSportAuctionStageFromState({
    tournament,
    readiness,
    auction: auctionState,
  });
  const hasResults =
    Number(auctionState?.counts?.sold ?? 0) > 0 ||
    Number(auctionState?.counts?.unsold ?? 0) > 0;
  const headerCta = isCompletedStage(sportStage)
    ? { label: "View Results", route: `/sport-tournaments/${sportTournamentId}/results` }
    : isLiveStage(sportStage)
      ? { label: "Open Live Auction", route: `/auctions/sports/${sportTournamentId}` }
      : isReadyStage(sportStage)
        ? { label: "Review & Launch", route: `/sport-tournaments/${sportTournamentId}/auction-hub` }
        : { label: "Check Setup Status", route: `/sport-tournaments/${sportTournamentId}` };

  if (loading && !tournament) {
    return (
      <LoadingStateCard
        title="Loading Sport Tournament Setup"
        message="Preparing teams, captains, budgets, and pool data."
      />
    );
  }
  if (!tournament) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={loadWorkspace}>Retry</Button>}
      >
        {error}
      </Alert>
    );
  }
  if (!canManage) {
    if (isCompletedStage(sportStage)) {
      return (
        <ProductStateCard
          eyebrow="Sport Tournament"
          title="Auction Completed"
          message="The Sport auction has concluded. View final team purchases and results."
          actionLabel="View Results"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}/results`)}
          secondaryActionLabel="View Auction Details"
          onSecondaryAction={() => navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)}
        />
      );
    }
    if (isLiveStage(sportStage)) {
      return (
        <ProductStateCard
          eyebrow="Sport Tournament"
          title="Auction is Live"
          message="The Sport auction is currently active. View live bidding in the Auction Details hub."
          actionLabel="Open Auction Details"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}/auction-hub`)}
        />
      );
    }
    if (isReadyStage(sportStage)) {
      return (
        <ProductStateCard
          eyebrow="Sport Tournament"
          title="Auction Ready — Launching Soon"
          message="The Sport Tournament is configured and ready. The organiser will launch bidding shortly."
          actionLabel="Return to Tournament Overview"
          onAction={() => navigate(`/sport-tournaments/${sportTournamentId}`)}
        />
      );
    }
    return (
      <ProductStateCard
        eyebrow="Sport Tournament"
        title="Tournament Setup in Progress"
        message="Team configuration, captain assignments, budgets, and pool setup are managed by the tournament organiser."
        actionLabel="Return to Tournament Overview"
        onAction={() => navigate(`/sport-tournaments/${sportTournamentId}`)}
      />
    );
  }

  const saveSettings = () =>
    mutate(
      () =>
        api.patch(`/v2/sport-tournaments/${sportTournamentId}`, {
          ...settings,
          teamCount: Number(settings.teamCount),
        }),
      "Tournament settings updated."
    );

  const saveTeam = (teamId) =>
    mutate(
      () =>
        api.patch(
          `/v2/sport-tournaments/${sportTournamentId}/teams/${teamId}`,
          teamEdits[teamId]
        ),
      "Sport Team updated."
    );

  const assignCaptain = (teamId, participant) =>
    mutate(
      () =>
        participant
          ? api.post(
              `/v2/sport-tournaments/${sportTournamentId}/teams/${teamId}/captain`,
              { festivalParticipantId: participant.festivalParticipantId }
            )
          : api.delete(
              `/v2/sport-tournaments/${sportTournamentId}/teams/${teamId}/captain`
            ),
      participant ? "Captain assigned." : "Captain removed."
    );

  const distributeBudgets = () =>
    mutate(
      () =>
        api.post(
          `/v2/sport-tournaments/${sportTournamentId}/budgets/equal-distribution`,
          { totalCredits: Number(totalCredits) }
        ),
      "Team credits distributed equally."
    );

  const saveBudgets = () =>
    mutate(
      () =>
        api.put(`/v2/sport-tournaments/${sportTournamentId}/budgets`, {
          budgets: Object.entries(budgetEdits).map(
            ([sportTeamId, budget]) => ({
              sportTeamId,
              allocatedCredits: Number(budget.allocatedCredits),
              adjustmentCredits: Number(budget.adjustmentCredits),
              status: budget.status,
            })
          ),
        }),
      "Team budgets updated."
    );

  const generatePool = () =>
    mutate(
      () =>
        api.post(
          `/v2/sport-tournaments/${sportTournamentId}/pool/generate`
        ),
      pool?.generated ? "Auction Pool regenerated." : "Auction Pool generated."
    );

  const saveAuctionConfig = () =>
    mutate(
      () =>
        api.patch(
          `/v2/sport-tournaments/${sportTournamentId}/auction/config`,
          {
            timerDurationSeconds: Number(auctionConfig.timerDurationSeconds),
            incrementPercentage: Number(auctionConfig.incrementPercentage),
            reauctionEnabled: auctionConfig.reauctionEnabled,
          }
        ),
      "Sport Auction configuration updated."
    );

  return (
    <Stack spacing={3} sx={{ width: "100%", minWidth: 0, overflow: "visible" }}>
      {error && (
        <Alert
          severity="error"
          action={<Button onClick={loadWorkspace}>Retry</Button>}
        >
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {canManage && !canEditSetup && (
        <Alert severity="info">
          Tournament setup is locked while the Auction is active or completed.
          Open the Live Auction page for bidding controls. Use Auction Details for history and results.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={1.5}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight={800}>
                  {tournament.name}
                </Typography>
                <Chip size="small" label={String(tournament.status).replaceAll("_", " ")} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={readiness?.ready ? "Ready" : `${readiness?.blockers?.length || 0} setup issue(s)`}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Configure teams, captains, budgets, eligibility, and the player pool.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate(headerCta.route)}
            >
              {headerCta.label}
            </Button>
          </Stack>
          <Box sx={{ mt: 1.25 }}>
            <AuctionContextNavigation
              commandCenter={`/sport-tournaments/${sportTournamentId}`}
              management={`/sport-tournaments/${sportTournamentId}/manage`}
              hub={`/sport-tournaments/${sportTournamentId}/auction-hub`}
              arena={`/auctions/sports/${sportTournamentId}`}
              results={`/sport-tournaments/${sportTournamentId}/results`}
              stage={sportStage}
              hasResults={hasResults}
            />
          </Box>
        </CardContent>
      </Card>

      <Box
        component="nav"
        aria-label="Sport Tournament workspace sections"
        sx={{
          width: "100%",
          minWidth: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tabs
          value={activeSection}
          onChange={(_, value) => setActiveSection(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ width: "100%", minWidth: 0 }}
        >
          {sections.map((section) => (
            <Tab
              key={section}
              value={section}
              label={section === "Readiness" ? "Setup Check" : section}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        component="section"
        aria-label={`${activeSection} section`}
        sx={{ width: "100%", minWidth: 0, overflow: "visible" }}
      >

      {activeSection === "Overview" && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`${readiness?.counts?.configuredTeams ?? 0} teams configured`} />
              <Chip label={`${readiness?.counts?.captainsAssigned ?? 0} captains assigned`} />
              <Chip label={`${readiness?.counts?.eligibleParticipants ?? 0} eligible employees`} />
              <Chip label={`${readiness?.counts?.availableParticipantPool ?? 0} in pool`} />
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              Use the setup sections above to finish required items. Auction status, bid history, and results are available in Auction Details.
            </Typography>
          </CardContent>
        </Card>
      )}

      {activeSection === "Teams" && (
        <Stack spacing={2}>
          {(tournament.teams || []).map((team) => (
            <Card variant="outlined" key={team.id}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  alignItems={{ md: "center" }}
                  spacing={2}
                >
                  <GroupsRoundedIcon color="primary" />
                  <TextField
                    label="Team name"
                    value={teamEdits[team.id]?.name || ""}
                    onChange={(event) =>
                      setTeamEdits((current) => ({
                        ...current,
                        [team.id]: {
                          ...current[team.id],
                          name: event.target.value,
                        },
                      }))
                    }
                    fullWidth
                    disabled={!canEditSetup || saving}
                  />
                  <TextField
                    label="Code"
                    value={teamEdits[team.id]?.code || ""}
                    onChange={(event) =>
                      setTeamEdits((current) => ({
                        ...current,
                        [team.id]: {
                          ...current[team.id],
                          code: event.target.value,
                        },
                      }))
                    }
                    sx={{ minWidth: 150 }}
                    disabled={!canEditSetup || saving}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<EditRoundedIcon />}
                    disabled={!canEditSetup || saving}
                    onClick={() => saveTeam(team.id)}
                  >
                    Save
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {activeSection === "Captains" && (
        <Stack spacing={2}>
          <Alert severity="info">
            Festival Team Owners remain eligible Employees and may be assigned
            as Captains when they satisfy Sport and gender rules.
          </Alert>
          {(tournament.teams || []).map((team) => {
            const currentParticipantId =
              team.captain?.festivalParticipantId || null;
            const value =
              eligibleCaptainOptions.find(
                ({ festivalParticipantId }) =>
                  festivalParticipantId === currentParticipantId
              ) || null;
            return (
              <Card variant="outlined" key={team.id}>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    alignItems={{ md: "center" }}
                    spacing={2}
                  >
                    <Box sx={{ minWidth: 220 }}>
                      <Typography variant="h6">{team.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {team.captain
                          ? participantLabel(team.captain.participant)
                          : "Captain not assigned"}
                      </Typography>
                    </Box>
                    <Autocomplete
                      value={value}
                      options={eligibleCaptainOptions}
                      getOptionLabel={participantLabel}
                      isOptionEqualToValue={(option, selected) =>
                        option.festivalParticipantId ===
                        selected.festivalParticipantId
                      }
                      getOptionDisabled={(option) =>
                        option.assignedCaptain &&
                        option.festivalParticipantId !== currentParticipantId
                      }
                      onChange={(_, participant) =>
                        assignCaptain(team.id, participant)
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Select eligible Captain" />
                      )}
                      sx={{ flex: 1 }}
                      disabled={!canEditSetup || saving}
                    />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {activeSection === "Budgets" && (
        <Stack spacing={3}>
          {!canManage && (
            <Alert severity="info">
              Budget configuration is read-only for this account.
            </Alert>
          )}
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Equal Credit Distribution</Typography>
                <Typography color="text.secondary">
                  Credits are independent from the Festival budget and have no
                  financial value.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Total Tournament Credits"
                    type="number"
                    value={totalCredits}
                    onChange={(event) => setTotalCredits(event.target.value)}
                    inputProps={{ min: 1 }}
                    fullWidth
                    disabled={!canEditSetup || saving}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AccountBalanceWalletRoundedIcon />}
                    disabled={!canEditSetup || saving || !Number(totalCredits)}
                    onClick={distributeBudgets}
                  >
                    Auto Distribute
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {[
              ["Allocated", budgets?.totalAllocatedCredits || 0],
              ["Adjustments", budgets?.totalAdjustmentCredits || 0],
              ["Effective Total", budgets?.totalEffectiveCredits || 0],
            ].map(([label, value]) => (
              <Card variant="outlined" key={label}>
                <CardContent>
                  <Typography color="text.secondary">{label}</Typography>
                  <Typography variant="h4">{value}</Typography>
                  <Typography variant="caption">credits</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Stack spacing={2}>
            {(budgets?.teams || []).map((team) => (
              <Card variant="outlined" key={team.sportTeamId}>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ md: "center" }}
                  >
                    <Box sx={{ minWidth: 220 }}>
                      <Typography variant="h6">{team.teamName}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Effective:{" "}
                        {Number(
                          budgetEdits[team.sportTeamId]?.allocatedCredits || 0
                        ) +
                          Number(
                            budgetEdits[team.sportTeamId]?.adjustmentCredits || 0
                          )}{" "}
                        credits
                      </Typography>
                    </Box>
                    <TextField
                      label="Allocated Credits"
                      type="number"
                      value={
                        budgetEdits[team.sportTeamId]?.allocatedCredits ?? 0
                      }
                      onChange={(event) =>
                        setBudgetEdits((current) => ({
                          ...current,
                          [team.sportTeamId]: {
                            ...current[team.sportTeamId],
                            allocatedCredits: event.target.value,
                          },
                        }))
                      }
                      disabled={!canEditSetup || saving}
                      fullWidth
                    />
                    <TextField
                      label="Adjustment Credits"
                      type="number"
                      value={
                        budgetEdits[team.sportTeamId]?.adjustmentCredits ?? 0
                      }
                      onChange={(event) =>
                        setBudgetEdits((current) => ({
                          ...current,
                          [team.sportTeamId]: {
                            ...current[team.sportTeamId],
                            adjustmentCredits: event.target.value,
                          },
                        }))
                      }
                      disabled={!canEditSetup || saving}
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
          <Button
            variant="contained"
            disabled={!canEditSetup || saving}
            onClick={saveBudgets}
            sx={{ alignSelf: "flex-start" }}
          >
            Save Manual Overrides
          </Button>
        </Stack>
      )}

      {activeSection === "Eligibility" && (
        <Stack spacing={3}>
          <Alert severity="info">
            Eligibility is derived from Festival Team membership, active
            Employee status, Sport registration, and the Tournament gender rule.
          </Alert>
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Included Employees
            </Typography>
            <Stack spacing={1}>
              {(eligibility?.included || []).map((participant) => (
                <Card variant="outlined" key={participant.festivalParticipantId}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>{participantLabel(participant)}</Typography>
                      <Chip
                        size="small"
                        color="success"
                        label={participant.assignedCaptain ? "Captain" : "Eligible"}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!eligibility?.included?.length && (
                <Alert severity="info">
                  No Employees currently meet the Tournament eligibility rules.
                </Alert>
              )}
            </Stack>
          </Box>
          <Divider />
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Excluded Employees
            </Typography>
            <Stack spacing={1}>
              {(eligibility?.excluded || []).map((participant) => (
                <Card variant="outlined" key={participant.festivalParticipantId}>
                  <CardContent>
                    <Typography>{participantLabel(participant)}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                      {participant.reasons.map((reason) => (
                        <Chip key={reason} size="small" label={reason.replaceAll("_", " ")} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!eligibility?.excluded?.length && (
                <Alert severity="info">
                  No Employees are currently excluded by eligibility rules.
                </Alert>
              )}
            </Stack>
          </Box>
        </Stack>
      )}

      {activeSection === "Pool" && (
        <Stack spacing={3}>
          {!canManage && (
            <Alert severity="info">
              Pool generation is read-only for this account.
            </Alert>
          )}
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h6">Sport Auction Pool Snapshot</Typography>
                  <Typography color="text.secondary">
                    Generated from current eligibility minus Captains and
                    existing Sport Team members.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<RefreshRoundedIcon />}
                  disabled={!canEditSetup || saving}
                  onClick={generatePool}
                >
                  {pool?.generated ? "Regenerate Pool" : "Generate Pool"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {[
              ["Available", pool?.counts.available || 0],
              ["Eligible Before Exclusions", eligibility?.eligibleCount || 0],
              [
                "Excluded",
                (eligibility?.excluded?.length || 0) +
                  (eligibility?.poolExcluded?.length || 0),
              ],
            ].map(([label, value]) => (
              <Card variant="outlined" key={label}>
                <CardContent>
                  <Typography color="text.secondary">{label}</Typography>
                  <Typography variant="h4">{value}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Pool Participants
            </Typography>
            <Stack spacing={1}>
              {(pool?.entries || []).map((entry) => (
                <Card variant="outlined" key={entry.id}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>
                        {participantLabel(entry.participant)}
                      </Typography>
                      <Chip size="small" color="success" label={entry.state} />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!pool?.entries?.length && (
                <Alert severity="info">The Pool has not been generated.</Alert>
              )}
            </Stack>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Exclusion Reasons
            </Typography>
            <Stack spacing={1}>
              {[
                ...(eligibility?.excluded || []),
                ...(eligibility?.poolExcluded || []),
              ].map((participant) => (
                <Card
                  variant="outlined"
                  key={`pool-excluded-${participant.festivalParticipantId}`}
                >
                  <CardContent>
                    <Typography>{participantLabel(participant)}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                      {[
                        ...(participant.reasons || []),
                        ...(participant.poolExclusionReasons || []),
                      ].map((reason) => (
                        <Chip
                          key={reason}
                          size="small"
                          label={reason.replaceAll("_", " ")}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      {activeSection === "Readiness" && (
        <Stack spacing={2}>
          <Alert
            severity={readiness?.readinessStatus === "READY" ? "success" : "warning"}
          >
            Setup progress: {readiness?.readinessScore || 0}%. Status:{" "}
            {readiness?.readinessStatus}.
          </Alert>
          {(readiness?.blockers || []).map((blocker) => (
            <Card variant="outlined" key={blocker}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PersonRoundedIcon color="warning" />
                  <Typography>{blocker}</Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {readiness?.readinessStatus === "READY" && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleRoundedIcon color="success" />
              <Typography>
                Team and Captain foundation is ready. Auction functionality is
                configured and ready to launch.
              </Typography>
            </Stack>
          )}
        </Stack>
      )}

      {activeSection === "Settings" && settings && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Sport Auction Settings</Typography>
                <Typography color="text.secondary">
                  Configure round timing and bid progression before launch.
                  Live bidding remains on the Live Auction page.
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Round timer (seconds)"
                    type="number"
                    value={auctionConfig.timerDurationSeconds}
                    inputProps={{ min: 5, max: 300 }}
                    onChange={(event) =>
                      setAuctionConfig((current) => ({
                        ...current,
                        timerDurationSeconds: event.target.value,
                      }))
                    }
                    disabled={
                      !canEditSetup ||
                      saving ||
                      Boolean(auctionState?.config?.startedAt)
                    }
                    fullWidth
                  />
                  <TextField
                    label="Bid increment percentage"
                    type="number"
                    value={auctionConfig.incrementPercentage}
                    inputProps={{ min: 1, max: 100 }}
                    onChange={(event) =>
                      setAuctionConfig((current) => ({
                        ...current,
                        incrementPercentage: event.target.value,
                      }))
                    }
                    disabled={
                      !canEditSetup ||
                      saving ||
                      Boolean(auctionState?.config?.startedAt)
                    }
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Re-auction</InputLabel>
                    <Select
                      label="Re-auction"
                      value={
                        auctionConfig.reauctionEnabled ? "enabled" : "disabled"
                      }
                      onChange={(event) =>
                        setAuctionConfig((current) => ({
                          ...current,
                          reauctionEnabled: event.target.value === "enabled",
                        }))
                      }
                      disabled={
                        !canEditSetup ||
                        saving ||
                        Boolean(auctionState?.config?.startedAt)
                      }
                    >
                      <MenuItem value="enabled">Enabled</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <Button
                  variant="contained"
                  disabled={
                    !canEditSetup ||
                    saving ||
                    Boolean(auctionState?.config?.startedAt)
                  }
                  onClick={saveAuctionConfig}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Save Auction Settings
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Tournament Settings</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Tournament name"
                  value={settings.name}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, name: event.target.value }))
                  }
                  fullWidth
                  disabled={!canEditSetup}
                />
                <TextField
                  label="Code"
                  value={settings.code}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, code: event.target.value }))
                  }
                  fullWidth
                  disabled={!canEditSetup}
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Division</InputLabel>
                  <Select
                    label="Division"
                    value={settings.division}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        division: event.target.value,
                      }))
                    }
                    disabled={!canEditSetup}
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
                    value={settings.participantGenderRule}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        participantGenderRule: event.target.value,
                      }))
                    }
                    disabled={!canEditSetup}
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
                  value={settings.teamCount}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      teamCount: event.target.value,
                    }))
                  }
                  fullWidth
                  disabled={!canEditSetup}
                />
              </Stack>
              <Button
                variant="contained"
                onClick={saveSettings}
                disabled={!canEditSetup || saving}
                sx={{ alignSelf: "flex-start" }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
      </Box>
    </Stack>
  );
}
