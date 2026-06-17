import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tabs,
  Typography,
} from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import FestivalSetupWizard from "../components/FestivalSetupWizard";
import FestivalConfigurationStatus from "../components/FestivalConfigurationStatus";
import FestivalDetailsConfiguration from "../components/FestivalDetailsConfiguration";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import {
  FESTIVAL_OPERATION_TABS,
  getStoredSetupStep,
} from "../utils/festivalWorkspace";
import {
  AUCTION_STAGE,
  getFestivalAuctionStageFromState,
  getStageLabel,
  isSetupStage,
  isLiveStage,
  isCompletedStage,
} from "../utils/auctionStages";
import { LoadingStateCard } from "../components/ProductState";

const FestivalTeamBuilder = lazy(() => import("../components/FestivalTeamBuilder"));
const FestivalAuctionSetup = lazy(() => import("../components/FestivalAuctionSetup"));
const FestivalReadiness = lazy(() => import("../components/FestivalReadiness"));
const FestivalOverview = lazy(() => import("../components/FestivalOverview"));
const FestivalHistory = lazy(() => import("../components/FestivalHistory"));
const FestivalBidHistory = lazy(
  () => import("../components/FestivalBidHistory")
);
const FestivalTeamsDirectory = lazy(
  () => import("../components/FestivalTeamsDirectory")
);

export default function FestivalDetail() {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [festival, setFestival] = useState(null);
  const [catalogSports, setCatalogSports] = useState([]);
  const [festivalSports, setFestivalSports] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSportIds, setSelectedSportIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [selectionParticipant, setSelectionParticipant] = useState(null);
  const [selectedSports, setSelectedSports] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const importInFlight = useRef(false);
  const actionInFlight = useRef(false);
  const [activeAction, setActiveAction] = useState("");
  const [rosterRevision, setRosterRevision] = useState(0);
  const [readiness, setReadiness] = useState(null);
  const [sportDialogOpen, setSportDialogOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantSportFilter, setParticipantSportFilter] = useState("");
  const [participantStatusFilter, setParticipantStatusFilter] = useState("");
  const [auctionStatus, setAuctionStatus] = useState("setup");
  const [activeStep, setActiveStep] = useState(() =>
    getStoredSetupStep(
      localStorage.getItem(`festival-setup-step-v2:${festivalId}`)
    )
  );
  const [activeTab, setActiveTab] = useState(() => {
    const requestedSection = searchParams.get("section");
    if (FESTIVAL_OPERATION_TABS.includes(requestedSection)) {
      return requestedSection;
    }
    const storedTab = localStorage.getItem(
      `festival-workspace-tab:${festivalId}`
    );
    return FESTIVAL_OPERATION_TABS.includes(storedTab)
      ? storedTab
      : "Overview";
  });
  const [adminWorkspaceMode, setAdminWorkspaceMode] = useState("auto");
  const festivalStage = getFestivalAuctionStageFromState({
    festival,
    readiness,
    auctionStatus,
  });
  const setupStage = isSetupStage(festivalStage);
  const configurationView =
    adminWorkspaceMode === "configuration" ||
    (adminWorkspaceMode === "auto" && setupStage);
  const operationsView = !configurationView;
  const visibleOperationTabs = useMemo(
    () =>
      setupStage
        ? FESTIVAL_OPERATION_TABS.filter(
            (tab) =>
              !["Auction Preparation", "Bid History", "Results"].includes(tab)
          )
        : FESTIVAL_OPERATION_TABS,
    [setupStage]
  );

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const festivalResponse = await api.get(`/v2/festivals/${festivalId}`);
      setFestival(festivalResponse.data.data);
    } catch {
      setError("Unable to load the festival workspace.");
    } finally {
      setLoading(false);
    }
  }, [festivalId]);

  const loadRegistrationData = useCallback(async () => {
    const needsCatalog = configurationView && activeStep === 1;
    const needsSports =
      (configurationView && [1, 2].includes(activeStep)) ||
      (operationsView && activeTab === "Participants");
    const needsParticipants =
      (configurationView && [1, 2, 3].includes(activeStep)) ||
      (operationsView && activeTab === "Participants");
    const [catalogResponse, sportsResponse, participantResponse] =
      await Promise.all([
        needsCatalog ? api.get("/sports") : null,
        needsSports ? api.get(`/v2/festivals/${festivalId}/sports`) : null,
        needsParticipants
          ? api.get(`/v2/festivals/${festivalId}/participants`)
          : null,
      ]);
    if (catalogResponse) setCatalogSports(catalogResponse.data || []);
    if (sportsResponse) setFestivalSports(sportsResponse.data.data || []);
    if (participantResponse) {
      setParticipants(participantResponse.data.data || []);
    }
  }, [
    activeStep,
    activeTab,
    configurationView,
    festivalId,
    operationsView,
  ]);

  const refreshReadiness = useCallback(async () => {
    const response = await api.get(
      `/v2/festivals/${festivalId}/auction/readiness`
    );
    const nextReadiness = response.data.data;
    setReadiness(nextReadiness);
    setAuctionStatus(nextReadiness.counts?.auctionStatus || "setup");
    return nextReadiness;
  }, [festivalId]);

  const invalidateFestivalSetup = useCallback(async () => {
    setRosterRevision((current) => current + 1);
    const results = await Promise.allSettled([
      loadWorkspace(),
      loadRegistrationData(),
      refreshReadiness(),
    ]);
    if (results.some(({ status }) => status === "rejected")) {
      setError(
        "Setup was saved, but the latest Festival status could not be refreshed. Use Refresh Progress to retry."
      );
    }
  }, [loadRegistrationData, loadWorkspace, refreshReadiness]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    refreshReadiness().catch(() => {
      setError("Unable to load the latest Festival setup status.");
    });
  }, [refreshReadiness]);

  useEffect(() => {
    loadRegistrationData().catch(() => {
      setError("Unable to load the active Festival section.");
    });
  }, [loadRegistrationData]);

  useEffect(() => {
    localStorage.setItem(`festival-workspace-tab:${festivalId}`, activeTab);
  }, [activeTab, festivalId]);

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (FESTIVAL_OPERATION_TABS.includes(requestedSection)) {
      setAdminWorkspaceMode("operations");
      setActiveTab(requestedSection);
    }
  }, [searchParams]);

  useEffect(() => {
    if (operationsView && !visibleOperationTabs.includes(activeTab)) {
      setActiveTab("Overview");
    }
  }, [activeTab, operationsView, visibleOperationTabs]);

  const enabledSportIds = useMemo(
    () => new Set(festivalSports.map((item) => item.sportId)),
    [festivalSports]
  );

  const availableSports = catalogSports.filter(
    (sport) => !enabledSportIds.has(sport.id)
  );

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

  const addSports = async () => {
    if (!selectedSportIds.length || !beginAction("add-sports")) return;
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/sports/bulk`,
        {
          sportIds: selectedSportIds,
        }
      );
      setSelectedSportIds([]);
      setNotice(
        `Enabled ${response.data.added} sports; ${response.data.alreadyEnabled} already enabled.`
      );
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to add selected sports."
      );
    } finally {
      endAction();
    }
  };

  const toggleSportSelection = (sportId) => {
    setSelectedSportIds((current) =>
      current.includes(sportId)
        ? current.filter((id) => id !== sportId)
        : [...current, sportId]
    );
  };

  const toggleAllAvailableSports = () => {
    setSelectedSportIds((current) =>
      current.length === availableSports.length
        ? []
        : availableSports.map(({ id }) => id)
    );
  };

  const addSelectedParticipants = async () => {
    if (!selectedEmployees.length || !beginAction("add-participants")) return;
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/participants/bulk`,
        {
          employeeIds: selectedEmployees.map(({ id }) => id),
        }
      );
      setSelectedEmployees([]);
      setEmployeeSearch("");
      setEmployeeOptions([]);
      setNotice(
        `Added ${response.data.added}; reactivated ${response.data.reactivated}; ignored ${response.data.duplicatesIgnored}.`
      );
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to add participants."
      );
    } finally {
      endAction();
    }
  };

  const addAllEmployees = async () => {
    if (!beginAction("add-all-employees")) return;
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/participants/add-all`
      );
      setNotice(
        `Added ${response.data.added}; reactivated ${response.data.reactivated}; ignored ${response.data.duplicatesIgnored}.`
      );
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to add all employees to the festival."
      );
    } finally {
      endAction();
    }
  };

  const removeSelectedParticipants = async () => {
    if (
      !selectedParticipantIds.length ||
      !beginAction("remove-participants")
    ) {
      return;
    }
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/participants/bulk-remove`,
        {
          participantIds: selectedParticipantIds,
        }
      );
      setSelectedParticipantIds([]);
      setNotice(
        `Removed ${response.data.removed}; already removed ${response.data.alreadyRemoved}.`
      );
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to remove selected participants."
      );
    } finally {
      endAction();
    }
  };

  const selectAllVisibleEmployees = () => {
    setSelectedEmployees((current) => {
      const byId = new Map(current.map((employee) => [employee.id, employee]));
      employeeOptions.forEach((employee) => byId.set(employee.id, employee));
      return [...byId.values()];
    });
  };

  useEffect(() => {
    if (!configurationView || activeStep !== 1) {
      setEmployeeOptions([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setError("");
      try {
        const response = await api.get("/v2/employees", {
          params: {
            page: 1,
            pageSize: 100,
            search: employeeSearch || undefined,
            employmentStatus: "active",
          },
        });
        const registeredEmployeeIds = new Set(
          participants
            .filter(({ status }) => status === "registered")
            .map(({ employeeId }) => employeeId)
        );
        setEmployeeOptions(
          (response.data.data || []).filter(
            (employee) => !registeredEmployeeIds.has(employee.id)
          )
        );
      } catch {
        setError("Unable to search employees.");
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activeStep, configurationView, employeeSearch, participants]);

  const toggleParticipantSelection = (participantId) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId]
    );
  };

  const toggleAllParticipants = () => {
    const removableIds = participants
      .filter(({ status }) => status === "registered")
      .map(({ id }) => id);
    setSelectedParticipantIds((current) =>
      current.length === removableIds.length ? [] : removableIds
    );
  };

  const openSportSelection = (participant) => {
    setSelectionParticipant(participant);
    setSelectedSports([]);
    setSportDialogOpen(true);
  };

  const saveSportSelection = async () => {
    if (
      (!selectionParticipant && !selectedParticipantIds.length) ||
      !selectedSports.length
    ) {
      return;
    }
    if (!beginAction("save-sports")) return;
    try {
      if (selectionParticipant) {
        await api.post(`/v2/festivals/${festivalId}/participant-sports/bulk`, {
          participantId: selectionParticipant.id,
          sports: selectedSports,
        });
      } else {
        await api.put(`/v2/festivals/${festivalId}/participant-sports/bulk`, {
          participantIds: selectedParticipantIds,
          sportIds: selectedSports,
        });
      }
      setSelectionParticipant(null);
      setSportDialogOpen(false);
      setSelectedSports([]);
      setNotice("Sport registrations added.");
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.errors?.[0]?.message ||
          requestError.response?.data?.message ||
          "Unable to register sports."
      );
    } finally {
      endAction();
    }
  };

  const uploadImport = async () => {
    if (!importFile || importInFlight.current) return;
    importInFlight.current = true;
    const formData = new FormData();
    formData.append("csv", importFile);
    setBusy(true);
    setImportProgress(0);
    setImportResult(null);
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/participants/import`,
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) {
              setImportProgress(Math.round((event.loaded * 100) / event.total));
            }
          },
        }
      );
      setImportResult(response.data);
      setImportProgress(100);
      await invalidateFestivalSetup();
      if (!response.data.failed) {
        setImportOpen(false);
        setImportFile(null);
        setNotice(
          `Festival import complete. Processed ${response.data.processed}; succeeded ${response.data.succeeded}.`
        );
      }
    } catch (requestError) {
      setImportResult({
        processed: 0,
        succeeded: 0,
        failed: 1,
        errors:
          requestError.response?.data?.errors || [
            { row: null, message: "Unable to import CSV." },
          ],
      });
    } finally {
      importInFlight.current = false;
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get(
        `/v2/festivals/${festivalId}/participants/import/template`,
        { responseType: "blob" }
      );
      const href = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = href;
      link.download = "festival-employees-and-sports.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      setError("Unable to download the import template.");
    }
  };

  const updateRosterFormationMode = async (rosterFormationMode) => {
    if (!beginAction("roster-mode")) return;
    try {
      const response = await api.patch(
        `/v2/festivals/${festivalId}/roster-formation-mode`,
        { rosterFormationMode }
      );
      setFestival(response.data.data);
      setNotice(
        `Team building mode changed to ${rosterFormationMode}.`
      );
      await invalidateFestivalSetup();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to change roster formation mode."
      );
    } finally {
      endAction();
    }
  };

  if (loading && !festival) {
    return (
      <LoadingStateCard
        title="Loading Festival Setup"
        message="Preparing Festival details, setup progress, participants, and teams."
      />
    );
  }

  const locked = Boolean(festival?.lockState?.locked);
  const lifecycleLocked = Boolean(festival?.lockState?.lifecycleLocked);
  const visibleParticipants = participants.filter((participant) => {
    const value = participantSearch.trim().toLowerCase();
    const matchesSearch =
      !value ||
      [
      participant.employee?.employeeNumber,
      participant.employee?.name,
      participant.employee?.department,
      participant.employee?.gender,
      participant.status,
      ].some((field) => String(field || "").toLowerCase().includes(value));
    const matchesSport =
      !participantSportFilter ||
      (participant.sports || []).some(
        ({ sportId }) => sportId === participantSportFilter
      );
    const matchesStatus =
      !participantStatusFilter ||
      participant.status === participantStatusFilter;
    return matchesSearch && matchesSport && matchesStatus;
  });

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={1.5}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight={800}>
                  {festival?.name || "Festival Management"}
                </Typography>
                <Chip size="small" label={festival?.status || "setup"} />
                <Chip
                  size="small"
                  color={setupStage ? "warning" : "default"}
                  variant={setupStage ? "filled" : "outlined"}
                  label={getStageLabel(festivalStage)}
                />
                {!setupStage && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Auction: ${String(auctionStatus).replaceAll("_", " ")}`}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {setupStage
                  ? "Complete setup before auction details, live bidding, and results become primary."
                  : "Review setup, auction details, and Festival operations."}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() =>
                navigate(
                  setupStage
                    ? `/festivals/${festivalId}/manage`
                    : `/festivals/${festivalId}/auction-hub`
                )
              }
            >
              {setupStage ? "Continue Setup" : "View Auction Details"}
            </Button>
          </Stack>
          <Box sx={{ mt: 1.25 }}>
            <AuctionContextNavigation
              commandCenter={`/festivals/${festivalId}/command-center`}
              management={`/festivals/${festivalId}/manage`}
              hub={`/festivals/${festivalId}/auction-hub`}
              arena={`/auctions/festivals/${festivalId}`}
              results={`/festivals/${festivalId}/results`}
              stage={festivalStage}
            />
          </Box>
        </CardContent>
      </Card>

      {isLiveStage(festivalStage) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Festival configuration is locked while the auction is active. Structural changes are disabled — use Auction Details to monitor bidding.
        </Alert>
      )}
      {isCompletedStage(festivalStage) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This Festival auction is complete. Setup sections are read-only. Review results and team compositions in Auction Details.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={configurationView ? "configuration" : "operations"}
          onChange={(event, value) => setAdminWorkspaceMode(value)}
          variant="fullWidth"
          aria-label="Admin Festival workspace mode"
        >
          <Tab value="operations" label="Setup Sections" />
          <Tab
            value="configuration"
            label="Edit Festival Configuration"
          />
        </Tabs>
      </Card>

      {configurationView && (
        <FestivalConfigurationStatus
          festival={festival}
          festivalId={festivalId}
          onChanged={async (nextFestival) => {
            setFestival(nextFestival);
            await invalidateFestivalSetup();
          }}
        />
      )}

      {operationsView && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Festival setup navigation"
          >
            {visibleOperationTabs.map((tab) => (
              <Tab key={tab} value={tab} label={tab} />
            ))}
          </Tabs>
        </Card>
      )}

      {configurationView && (
        <FestivalSetupWizard
          festivalId={festivalId}
          readiness={readiness}
          locked={locked}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          onRefresh={invalidateFestivalSetup}
        />
      )}

      <Suspense
        fallback={
          <LoadingStateCard
            title="Loading Setup Section"
            message="Preparing the selected Festival setup section."
          />
        }
      >

      {operationsView && activeTab === "Overview" && (
        <FestivalOverview readiness={readiness} />
      )}

      {configurationView && activeStep === 0 && (
      <>
      <FestivalDetailsConfiguration
        festival={festival}
        festivalId={festivalId}
        locked={locked}
        onChanged={async (nextFestival) => {
          setFestival(nextFestival);
          setNotice("Festival details updated.");
          await invalidateFestivalSetup();
        }}
      />
      {locked && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Festival setup is locked because the Main Auction is{" "}
          {festival.lockState.auctionStatus}. Auction operations and history
          remain available.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Team Building Mode</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Auction mode forms teams through owners, retentions, and the Main
            Festival Auction. Manual mode uses assignment and auto-balance
            tools without auction setup.
          </Typography>
          <RadioGroup
            row
            value={festival?.rosterFormationMode || "auction"}
            onChange={(event) =>
              updateRosterFormationMode(event.target.value)
            }
          >
            <FormControlLabel
              value="auction"
              control={<Radio />}
              label="Auction Mode"
              disabled={busy || lifecycleLocked}
            />
            <FormControlLabel
              value="manual"
              control={<Radio />}
              label="Manual Mode"
              disabled={busy || lifecycleLocked}
            />
          </RadioGroup>
        </CardContent>
      </Card>
      </>
      )}

      {configurationView && activeStep === 1 && (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" },
          gap: 3,
          mb: 3,
        }}
      >
        <Card id="festival-sports" variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Manage Sports</Typography>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Checkbox
                  checked={
                    availableSports.length > 0 &&
                    selectedSportIds.length === availableSports.length
                  }
                  indeterminate={
                    selectedSportIds.length > 0 &&
                    selectedSportIds.length < availableSports.length
                  }
                  disabled={lifecycleLocked || !availableSports.length}
                  onChange={toggleAllAvailableSports}
                />
                <Typography>Select all available sports</Typography>
              </Stack>
              <Box
                sx={{
                  maxHeight: 240,
                  overflowY: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {availableSports.map((sport) => (
                  <Stack
                    key={sport.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <Checkbox
                      checked={selectedSportIds.includes(sport.id)}
                      disabled={lifecycleLocked}
                      onChange={() => toggleSportSelection(sport.id)}
                    />
                    <Typography>{sport.name}</Typography>
                  </Stack>
                ))}
                {!availableSports.length && (
                  <Typography color="text.secondary" sx={{ p: 1 }}>
                    All active sports are already enabled.
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Selected Sports: {selectedSportIds.length}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                disabled={!selectedSportIds.length || busy || lifecycleLocked}
                onClick={addSports}
              >
                {activeAction === "add-sports"
                  ? "Adding Sports..."
                  : "Add Selected Sports"}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
              {festivalSports.map((festivalSport) => (
                <Chip
                  key={festivalSport.id}
                  label={festivalSport.sport?.name || festivalSport.sportId}
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card id="festival-employees" variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Manage Participants</Typography>
            <Stack spacing={1}>
              <Autocomplete
                multiple
                filterOptions={(options) => options}
                options={employeeOptions}
                value={selectedEmployees}
                inputValue={employeeSearch}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(employee) =>
                  `${employee.employeeNumber || "Needs review"} - ${employee.name}`
                }
                onInputChange={(event, value) => setEmployeeSearch(value)}
                onChange={(event, value) => setSelectedEmployees(value)}
                disabled={locked}
                disableCloseOnSelect
                renderOption={(props, employee, { selected }) => (
                  <li {...props} key={employee.id}>
                    <Checkbox checked={selected} sx={{ mr: 1 }} />
                    {employee.employeeNumber || "Needs review"} -{" "}
                    {employee.name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search employees"
                    placeholder="Employee number, name, email, or department"
                  />
                )}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  disabled={!employeeOptions.length || locked}
                  onClick={selectAllVisibleEmployees}
                >
                  Select All Results
                </Button>
                <Button
                  variant="outlined"
                  disabled={!selectedEmployees.length || locked}
                  onClick={() => setSelectedEmployees([])}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outlined"
                  disabled={busy || locked}
                  onClick={addAllEmployees}
                >
                  {activeAction === "add-all-employees"
                    ? "Adding Employees..."
                    : "Add All Employees To Festival"}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Selected Employees: {selectedEmployees.length}
              </Typography>
              <Button
                variant="contained"
                disabled={!selectedEmployees.length || busy || locked}
                onClick={addSelectedParticipants}
              >
                {activeAction === "add-participants"
                  ? "Adding Participants..."
                  : "Add Selected Participants"}
              </Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={downloadTemplate}
              >
                Download Excel CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileUploadRoundedIcon />}
                onClick={() => {
                  setImportOpen(true);
                  setImportFile(null);
                  setImportResult(null);
                  setImportProgress(0);
                }}
              >
                Import Excel CSV
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
      )}

      {configurationView && activeStep === 3 && (
      <FestivalTeamBuilder
        festivalId={festivalId}
        rosterFormationMode={festival?.rosterFormationMode || "auction"}
        participantRevision={participants
          .map(
            (participant) =>
              `${participant.id}:${participant.status}:${(participant.sports || [])
                .map(({ sportId }) => sportId)
                .sort()
                .join(",")}`
          )
          .join("|")
          .concat(`:${rosterRevision}`)}
        operationRevision={rosterRevision}
        locked={locked}
        onTeamsChanged={invalidateFestivalSetup}
      />
      )}

      {operationsView && activeTab === "Teams" && (
        <FestivalTeamsDirectory festivalId={festivalId} />
      )}

      {festival?.rosterFormationMode === "auction" && configurationView && (
        <>
          {activeStep === 8 && <FestivalReadiness
            festivalId={festivalId}
            revision={rosterRevision}
            onLoaded={setReadiness}
          />}
          {[4, 5, 6, 7].includes(activeStep) && <FestivalAuctionSetup
            festivalId={festivalId}
            onRosterChanged={invalidateFestivalSetup}
            operationRevision={rosterRevision}
            locked={locked}
            section={
              activeStep === 4
                ? "budget"
                : activeStep === 5
                  ? "owners"
                  : activeStep === 6
                    ? "retentions"
                    : "pool"
            }
          />}
        </>
      )}

      {operationsView &&
        ["Owners", "Retentions"].includes(activeTab) && (
          <FestivalAuctionSetup
            festivalId={festivalId}
            onRosterChanged={invalidateFestivalSetup}
            operationRevision={rosterRevision}
            locked={locked}
            section={activeTab.toLowerCase()}
          />
        )}

      {operationsView && !setupStage && activeTab === "Auction Preparation" && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="h6">Auction Preparation</Typography>
                  <Typography color="text.secondary">
                    Review server readiness here. Budget, Owner, Retention, and
                    Pool configuration remain in Edit Festival Configuration.
                    Live bidding happens only on the Live Auction page.
                  </Typography>
                </Box>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignSelf={{ md: "center" }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setAdminWorkspaceMode("configuration");
                      setActiveStep(4);
                    }}
                  >
                    Edit Budget
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setAdminWorkspaceMode("configuration");
                      setActiveStep(7);
                    }}
                  >
                    Manage Pool
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() =>
                      navigate(`/auctions/festivals/${festivalId}`)
                    }
                  >
                    Open Live Auction
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          <FestivalReadiness
            festivalId={festivalId}
            revision={rosterRevision}
            onLoaded={setReadiness}
          />
        </Stack>
      )}

      {operationsView && !setupStage && activeTab === "Bid History" && (
        <FestivalBidHistory festivalId={festivalId} />
      )}

      {operationsView && !setupStage && activeTab === "Results" && (
        <FestivalHistory
          festivalId={festivalId}
          sections={["Auction Results"]}
        />
      )}

      {operationsView && activeTab === "Audit" && (
        <FestivalHistory festivalId={festivalId} sections={["Audit Log"]} />
      )}

      {((configurationView && activeStep === 2) ||
        (operationsView && activeTab === "Participants")) && (
      <Card id="festival-participants" variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Participant Sport Registrations
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Search participants"
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sport</InputLabel>
              <Select
                label="Sport"
                value={participantSportFilter}
                onChange={(event) => setParticipantSportFilter(event.target.value)}
              >
                <MenuItem value="">All Sports</MenuItem>
                {festivalSports.map((item) => (
                  <MenuItem key={item.sportId} value={item.sportId}>
                    {item.sport?.name || item.sportId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={participantStatusFilter}
                onChange={(event) =>
                  setParticipantStatusFilter(event.target.value)
                }
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="registered">Registered</MenuItem>
                <MenuItem value="withdrawn">Withdrawn</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={toggleAllParticipants}>
              {selectedParticipantIds.length ? "Clear Participant Selection" : "Select All Participants"}
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={!selectedParticipantIds.length || busy}
              onClick={removeSelectedParticipants}
            >
              {activeAction === "remove-participants"
                ? "Removing Participants..."
                : `Remove Selected Participants (${selectedParticipantIds.length})`}
            </Button>
            <Button
              variant="contained"
              disabled={!selectedParticipantIds.length || busy || locked}
              onClick={() => {
                setSelectionParticipant(null);
                setSelectedSports([]);
                setSportDialogOpen(true);
              }}
            >
              Bulk Assign Sports ({selectedParticipantIds.length})
            </Button>
          </Stack>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        participants.some(({ status }) => status === "registered") &&
                        selectedParticipantIds.length ===
                          participants.filter(({ status }) => status === "registered").length
                      }
                      onChange={toggleAllParticipants}
                    />
                  </TableCell>
                  <TableCell>Participant</TableCell>
                  <TableCell>Employee Number</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Selected Sports</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        disabled={
                          participant.status !== "registered" || locked
                        }
                        checked={selectedParticipantIds.includes(participant.id)}
                        onChange={() => toggleParticipantSelection(participant.id)}
                      />
                    </TableCell>
                    <TableCell>{participant.employee?.name}</TableCell>
                    <TableCell>
                      {participant.employee?.employeeNumber || "Needs review"}
                    </TableCell>
                    <TableCell>
                      {participant.employee?.email || "-"}
                    </TableCell>
                    <TableCell>
                      {participant.employee?.department || "-"}
                    </TableCell>
                    <TableCell>
                      {participant.employee?.gender === "female"
                        ? "Female"
                        : "Male"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {(participant.sports || []).map((registration) => (
                          <Chip
                            size="small"
                            key={registration.id}
                            label={registration.sport?.name || registration.sportId}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={participant.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        disabled={participant.status !== "registered"}
                        onClick={() => openSportSelection(participant)}
                      >
                        Select Sports
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!visibleParticipants.length && (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No Participants Added Yet. Import Employees or Add Participants to continue.
            </Typography>
          )}
        </CardContent>
      </Card>
      )}
      </Suspense>

      <Dialog
        open={sportDialogOpen}
        onClose={() => {
          if (!busy) {
            setSelectionParticipant(null);
            setSportDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectionParticipant
            ? `Select Sports - ${selectionParticipant.employee?.name}`
            : `Bulk Assign Sports - ${selectedParticipantIds.length} participants`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {festivalSports.map((festivalSport) => {
              const alreadyRegistered = (selectionParticipant?.sports || []).some(
                (registration) => registration.sportId === festivalSport.sportId
              );
              return (
                <Stack
                  key={festivalSport.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Checkbox
                    checked={
                      alreadyRegistered ||
                      selectedSports.includes(festivalSport.sportId)
                    }
                    disabled={alreadyRegistered}
                    onChange={(event) =>
                      setSelectedSports((current) =>
                        event.target.checked
                          ? [...current, festivalSport.sportId]
                          : current.filter((id) => id !== festivalSport.sportId)
                      )
                    }
                  />
                  <Typography>
                    {festivalSport.sport?.name || festivalSport.sportId}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => {
              setSelectionParticipant(null);
              setSportDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !selectedSports.length}
            onClick={saveSportSelection}
          >
            {activeAction === "save-sports"
              ? "Saving Sports..."
              : "Add Selected Sports"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => !busy && setImportOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Import Employee Sport Selections</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Export Microsoft Forms responses as CSV using the template.
              EmployeeNumber is the identity key. Employees must already exist
              in the Employee Directory with Gender. This import updates
              employee details, festival participation, and selected sports.
            </Alert>
            <Button component="label" variant="outlined">
              {importFile ? importFile.name : "Select CSV File"}
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportResult(null);
                }}
              />
            </Button>
            {busy && (
              <LinearProgress
                variant={importProgress >= 100 ? "indeterminate" : "determinate"}
                value={importProgress}
              />
            )}
            {importResult && (
              <Alert severity={importResult.failed ? "warning" : "success"}>
                Processed {importResult.processed ?? 0}. Succeeded{" "}
                {importResult.succeeded ?? importResult.imported ?? 0}. Failed{" "}
                {importResult.failed}.
              </Alert>
            )}
            {importResult && (
              <Typography variant="body2" color="text.secondary">
                Employees created: {importResult.employeesCreated ?? 0}; updated:{" "}
                {importResult.employeesUpdated ?? 0}; participants created:{" "}
                {importResult.participantsCreated ?? 0}; sports added:{" "}
                {importResult.sportRegistrationsAdded ?? 0}; sports removed:{" "}
                {importResult.sportRegistrationsRemoved ?? 0}.
              </Typography>
            )}
            {importResult?.errors?.length > 0 && (
              <List dense>
                {importResult.errors.map((item, index) => (
                  <ListItem key={`${item.row}-${index}`} disableGutters>
                    <ListItemText
                      primary={`Row ${item.row ?? "-"}: ${item.message}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setImportOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            disabled={busy || !importFile}
            onClick={uploadImport}
          >
            {busy ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
