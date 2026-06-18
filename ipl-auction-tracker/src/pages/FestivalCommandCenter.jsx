import SportsRoundedIcon from "@mui/icons-material/SportsRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionCard,
  DashboardGrid,
  DashboardSection,
  EmptyDashboardState,
} from "../components/ProductDashboard/DashboardPrimitives";
import { LoadingStateCard } from "../components/ProductState";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import {
  formatStatus,
  formatValue,
  participantName,
  sportArenaRoute,
  sportManagementRoute,
  statusColor,
} from "../components/ProductDashboard/dashboardHelpers";
import useFestivalCommandCenterData from "../hooks/useFestivalCommandCenterData";
import {
  getFestivalAuctionStageFromState,
  getStageLabel,
  isCompletedStage,
  isLiveStage,
  isReadyStage,
  isSetupStage,
  shouldShowResults,
} from "../utils/auctionStages";
import {
  FESTIVAL_SETUP_STEPS,
  getSetupCompletion,
} from "../utils/festivalWorkspace";

const activeSportStatuses = new Set(["auction_live", "auction_paused"]);

const blockerCategory = (message) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("owner")) return "Missing Owners";
  if (normalized.includes("captain")) return "Missing Captains";
  if (normalized.includes("budget") || normalized.includes("credit")) {
    return "Missing Budgets";
  }
  if (normalized.includes("pool")) return "Pool Not Generated";
  return "Tournament Not Ready";
};

export default function FestivalCommandCenter() {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const data = useFestivalCommandCenterData(festivalId);

  const blockers = useMemo(() => {
    const festivalBlockers = (data.festivalReadiness?.blockers || []).map(
      (message) => ({
        id: `festival:${message}`,
        category: blockerCategory(message),
        title: data.festival?.name || "Festival",
        message,
        route: `/festivals/${festivalId}/manage`,
      })
    );
    const sportBlockers = data.sportTournaments.flatMap((tournament) =>
      (tournament.readiness?.blockers || []).map((message) => ({
        id: `${tournament.id}:${message}`,
        category: blockerCategory(message),
        title: tournament.name,
        message,
        route: sportManagementRoute(tournament.id),
      }))
    );
    return [...festivalBlockers, ...sportBlockers];
  }, [
    data.festival?.name,
    data.festivalReadiness?.blockers,
    data.sportTournaments,
    festivalId,
  ]);

  const liveActivity = useMemo(() => {
    const festivalStatus = data.festivalAuction?.config?.auctionStatus;
    const festivalLive = ["live", "paused"].includes(festivalStatus)
      ? [{
          id: `festival:${festivalId}`,
          eyebrow: "Festival Auction",
          title: data.festival.name,
          description: `${participantName(
            data.festivalAuction.current
          )} | Current bid ${formatValue(
            data.festivalAuction.current?.currentBid,
            "INR"
          )}`,
          status: festivalStatus,
          route: `/festivals/${festivalId}/auction-hub`,
        }]
      : [];
    const sportLive = data.sportTournaments
      .filter(({ status }) => activeSportStatuses.has(status))
      .map((tournament) => ({
        id: `sport:${tournament.id}`,
        eyebrow: "Sport Auction",
        title: tournament.name,
        description: `${participantName(
          tournament.auction?.current
        )} | Current bid ${formatValue(
          tournament.auction?.current?.currentCredits,
          "credits"
        )}`,
        status: tournament.status,
        route: `/sport-tournaments/${tournament.id}/auction-hub`,
      }));
    return [...festivalLive, ...sportLive];
  }, [
    data.festival,
    data.festivalAuction,
    data.sportTournaments,
    festivalId,
  ]);

  const recentOutcomes = useMemo(() => {
    const festivalResults = (data.festivalHistory || [])
      .filter(({ result }) => result)
      .map((round) => ({
          id: `festival:${round.id}`,
        title:
          round.participant?.employee?.name ||
          round.participant?.name ||
          "Participant",
        context: "Main Festival Auction",
        outcome: round.result.outcome,
        teamName: round.result.teamName,
        value: round.result.finalAmount,
          unit: "INR",
          date: round.result.finalizedAt || round.finalizedAt,
          route: `/festivals/${festivalId}/results`,
      }));
    const sportResults = data.sportTournaments.flatMap((tournament) =>
      (tournament.history || [])
        .filter(({ result }) => result)
        .map((round) => ({
          id: `sport:${round.id}`,
          title:
            round.participant?.employee?.name ||
            round.participant?.name ||
            "Participant",
          context: tournament.name,
          outcome: round.result.outcome,
          teamName: round.result.teamName,
          value: round.result.finalCredits,
          unit: "credits",
          date: round.result.finalizedAt || round.finalizedAt,
          route: `/sport-tournaments/${tournament.id}/results`,
        }))
    );
    return [...festivalResults, ...sportResults]
      .sort(
        (left, right) =>
          new Date(right.date || 0).getTime() -
          new Date(left.date || 0).getTime()
      )
      .slice(0, 6);
  }, [
    data.festivalHistory,
    data.sportTournaments,
    festivalId,
  ]);

  if (data.loading) {
    return (
      <LoadingStateCard
        title="Loading Festival Operations"
        message="Preparing Festival setup, Sport Tournaments, and auction status."
      />
    );
  }

  if (data.error || !data.festival) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={data.reload}>Retry</Button>}
      >
        {data.error || "Festival not found."}
      </Alert>
    );
  }

  const festivalAuctionStatus =
    data.festivalAuction?.config?.auctionStatus ||
    data.festivalReadiness?.counts?.auctionStatus ||
    "setup";
  const festivalStage = getFestivalAuctionStageFromState({
    festival: data.festival,
    auction: data.festivalAuction,
    readiness: data.festivalReadiness,
    auctionStatus: festivalAuctionStatus,
  });
  const setupStage = isSetupStage(festivalStage);
  const readyStage = isReadyStage(festivalStage);
  const liveStage = isLiveStage(festivalStage);
  const completedStage = isCompletedStage(festivalStage);
  const showResults = shouldShowResults({
    stage: festivalStage,
    resultCount: recentOutcomes.length,
  });
  const setupCompletion = getSetupCompletion(data.festivalReadiness);
  const completedSetupSteps = setupCompletion.filter(Boolean).length;
  const setupProgress = setupCompletion.length
    ? Math.round((completedSetupSteps / setupCompletion.length) * 100)
    : 0;
  const nextSetupStep =
    FESTIVAL_SETUP_STEPS[setupCompletion.findIndex((completed) => !completed)] ||
    "Review & Launch";
  const sportArenaTarget =
    data.sportTournaments.find(({ status }) =>
      activeSportStatuses.has(status)
    );

  const openSetup = () => navigate(`/festivals/${festivalId}/manage`);
  const createSportTournament = () =>
    navigate(`/sport-tournaments?festivalId=${festivalId}&create=1`);
  const openFestivalAuction = () =>
    navigate(`/auctions/festivals/${festivalId}`);

  return (
    <Stack spacing={3}>
      {data.warnings.map((warning) => (
        <Alert key={warning} severity="warning">
          {warning}
        </Alert>
      ))}

      <Card variant="outlined">
        <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            spacing={3}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                Festival Overview
              </Typography>
              <Typography variant="h4">{data.festival.name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {data.festival.code} | {data.festival.startDate} to{" "}
                {data.festival.endDate}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
              <Chip
                label={`Festival Status: ${formatStatus(data.festival.status)}`}
              />
              <Chip
                color={setupStage ? "warning" : statusColor(festivalAuctionStatus)}
                label={`Auction Status: ${
                  setupStage
                    ? getStageLabel(festivalStage)
                    : formatStatus(festivalAuctionStatus)
                }`}
              />
            </Stack>
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            <AuctionContextNavigation
              commandCenter={`/festivals/${festivalId}/command-center`}
              management={`/festivals/${festivalId}/manage`}
              hub={`/festivals/${festivalId}/auction-hub`}
              arena={`/auctions/festivals/${festivalId}`}
              results={`/festivals/${festivalId}/results`}
              stage={festivalStage}
              hasResults={showResults}
            />
          </Box>
        </CardContent>
      </Card>

      <DashboardSection
        title={setupStage ? "Setup Progress" : "Quick Actions"}
        description={
          setupStage
            ? "Complete the required setup steps before auction surfaces become primary."
            : "Actions that change or start the next Festival workflow."
        }
      >
        {setupStage ? (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h5">Continue Festival Setup</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Next required step: {nextSetupStep}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button variant="contained" onClick={openSetup}>
                      Continue Setup
                    </Button>
                    <Button variant="outlined" onClick={data.reload}>
                      Refresh Setup Check
                    </Button>
                  </Stack>
                </Stack>
                <Box>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography variant="body2">
                      {completedSetupSteps} of {setupCompletion.length} steps complete
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {setupProgress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={setupProgress}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {FESTIVAL_SETUP_STEPS.map((step, index) => (
                    <Chip
                      key={step}
                      size="small"
                      color={setupCompletion[index] ? "success" : "default"}
                      variant={setupCompletion[index] ? "filled" : "outlined"}
                      label={setupCompletion[index] ? `${step}: done` : step}
                    />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
            {readyStage && (
              <Button variant="contained" onClick={openFestivalAuction}>
                Open Auction Arena
              </Button>
            )}
            {liveStage && (
              <Button variant="contained" onClick={openFestivalAuction}>
                Open Live Auction
              </Button>
            )}
            {liveStage && (
              <Button variant="outlined" onClick={openSetup}>
                Edit Configuration
              </Button>
            )}
            {completedStage && (
              <Button
                variant="outlined"
                onClick={() => navigate(`/festivals/${festivalId}/results`)}
              >
                View Results
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<SportsRoundedIcon />}
              onClick={createSportTournament}
            >
              Create Sport Tournament
            </Button>
            {liveStage && sportArenaTarget && (
              <Button
                color="success"
                variant="outlined"
                onClick={() => navigate(sportArenaRoute(sportArenaTarget.id))}
              >
                Open Live Sport Auction
              </Button>
            )}
          </Stack>
        )}
      </DashboardSection>

      {!setupStage && liveActivity.length > 0 && (
      <DashboardSection
        title="Live Activity"
        description="Active and paused Auctions within this Festival."
      >
        <DashboardGrid>
          {liveActivity.map((activity) => (
            <ActionCard
              key={activity.id}
              {...activity}
              status={formatStatus(activity.status)}
              statusColor={statusColor(activity.status)}
              severity="live"
              actionLabel="Open"
              onAction={() => navigate(activity.route)}
            />
          ))}
        </DashboardGrid>
      </DashboardSection>
      )}

      {blockers.length > 0 && (
      <DashboardSection
        title="Setup Issues"
        description="Festival and Sport setup items that need attention."
      >
        <DashboardGrid>
          {blockers.slice(0, 12).map((blocker) => (
            <ActionCard
              key={blocker.id}
              eyebrow={blocker.category}
              title={blocker.title}
              description={blocker.message}
              status="Setup Incomplete"
              statusColor="warning"
              severity="warning"
              actionLabel="Fix Issues"
              onAction={() => navigate(blocker.route)}
            />
          ))}
        </DashboardGrid>
      </DashboardSection>
      )}

      <DashboardSection
        title={setupStage ? "Sport Tournament Setup" : "Sport Tournament Status"}
        description={
          setupStage
            ? "Sport Tournaments remain secondary while the Festival setup is incomplete."
            : "Preparation and Auction status for every child Tournament."
        }
      >
        {data.sportTournaments.length ? (
          <DashboardGrid columns={2}>
            {data.sportTournaments.map((tournament) => {
              const active = activeSportStatuses.has(tournament.status);
              const readinessScore = tournament.readiness?.readinessScore || 0;
              return (
                <Card key={tournament.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="overline" color="primary.main">
                          {tournament.festivalTeam?.name} |{" "}
                          {tournament.sport?.name}
                        </Typography>
                        <Typography variant="h6">{tournament.name}</Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={statusColor(tournament.status)}
                        label={formatStatus(tournament.status)}
                      />
                    </Stack>
                    <Stack spacing={1} sx={{ my: 2 }}>
                      <Typography variant="body2">
                            Setup progress: {readinessScore}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={readinessScore}
                        sx={{ height: 7, borderRadius: 4 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {tournament.readiness?.blockers?.[0] ||
                          (active
                            ? `${participantName(
                                tournament.auction?.current
                              )} is active.`
                            : "No setup issue reported.")}
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant={active ? "contained" : "outlined"}
                        onClick={() =>
                          navigate(
                            tournament.status === "auction_completed"
                              ? `/sport-tournaments/${tournament.id}/results`
                              : active
                                ? `/sport-tournaments/${tournament.id}/auction-hub`
                                : sportManagementRoute(tournament.id)
                          )
                        }
                      >
                        {active
                          ? "View Auction Details"
                          : tournament.status === "auction_completed"
                            ? "View Auction Results"
                            : "Manage Tournament"}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No Sport Tournaments have been created for this Festival.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      {showResults && recentOutcomes.length > 0 && (
      <DashboardSection
        title={completedStage ? "Results" : "Recent Results"}
        description="Latest Festival and Sport Auction outcomes."
      >
        <DashboardGrid>
          {recentOutcomes.map((outcome) => (
            <ActionCard
              key={outcome.id}
              eyebrow={outcome.context}
              title={outcome.title}
              description={
                outcome.outcome === "sold"
                  ? `${outcome.teamName || "Team"} | ${formatValue(
                      outcome.value,
                      outcome.unit
                    )}`
                  : "Marked unsold"
              }
              status={outcome.outcome}
              statusColor={outcome.outcome === "sold" ? "success" : "warning"}
              actionLabel="Open Results"
              onAction={() => navigate(outcome.route)}
            />
          ))}
        </DashboardGrid>
      </DashboardSection>
      )}
    </Stack>
  );
}
