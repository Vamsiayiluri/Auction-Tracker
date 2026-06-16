import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SportsRoundedIcon from "@mui/icons-material/SportsRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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

const activeSportStatuses = new Set(["auction_live", "auction_paused"]);
const competitionReadyStatuses = new Set([
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
]);

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
            data.festival.currencyCode || "INR"
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
          unit: data.festival?.currencyCode || "INR",
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
    data.festival?.currencyCode,
    data.festivalHistory,
    data.sportTournaments,
    festivalId,
  ]);

  if (data.loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress size={36} />
        <Typography color="text.secondary">
          Loading Festival operations...
        </Typography>
      </Stack>
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
  const sportArenaTarget =
    data.sportTournaments.find(({ status }) =>
      activeSportStatuses.has(status)
    ) ||
    data.sportTournaments.find(({ status }) => status === "ready") ||
    data.sportTournaments.find(
      ({ status }) => status === "auction_completed"
    );

  const openResults = () => navigate(`/festivals/${festivalId}/results`);

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
                {data.festival.endDate} | {data.festival.timezone}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
              <Chip
                label={`Festival: ${formatStatus(data.festival.status)}`}
              />
              <Chip
                color={statusColor(festivalAuctionStatus)}
                label={`Auction: ${formatStatus(festivalAuctionStatus)}`}
              />
              <Chip
                color={
                  data.festivalReadiness?.overallStatus === "READY"
                    ? "success"
                    : "warning"
                }
                label={`Setup: ${formatStatus(
                  data.festivalReadiness?.overallStatus || "unknown"
                )}`}
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
            />
          </Box>
        </CardContent>
      </Card>

      <DashboardSection
        title="Quick Actions"
        description="Move directly to the correct operational surface."
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            onClick={() => navigate(`/festivals/${festivalId}/auction-hub`)}
          >
            View Auction Details
          </Button>
          <Button
            variant="outlined"
            startIcon={<GavelRoundedIcon />}
            onClick={() => navigate(`/auctions/festivals/${festivalId}`)}
          >
            Open Live Festival Auction
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupsRoundedIcon />}
            onClick={() => navigate(`/festivals/${festivalId}/manage`)}
          >
            Festival Management
          </Button>
          <Button
            variant="outlined"
            startIcon={<SportsRoundedIcon />}
            onClick={() =>
              navigate(`/sport-tournaments?festivalId=${festivalId}&create=1`)
            }
          >
            Create Sport Tournament
          </Button>
          <Button
            color="success"
            variant="outlined"
            disabled={!sportArenaTarget}
            onClick={() =>
              sportArenaTarget &&
              navigate(sportArenaRoute(sportArenaTarget.id))
            }
          >
            Open Live Sport Auction
          </Button>
          <Button variant="outlined" onClick={openResults}>
            View Results
          </Button>
        </Stack>
      </DashboardSection>

      <DashboardSection
        title="Live Activity"
        description="Active and paused Auctions within this Festival."
      >
        {liveActivity.length ? (
          <DashboardGrid>
            {liveActivity.map((activity) => (
              <ActionCard
                key={activity.id}
                {...activity}
                status={formatStatus(activity.status)}
                statusColor={statusColor(activity.status)}
                severity="live"
                actionLabel={
                  activity.eyebrow === "Festival Auction"
                    ? "View Festival Auction Details"
                    : "View Sport Auction Details"
                }
                onAction={() => navigate(activity.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No Festival or Sport Auction is live right now.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Setup Issues"
        description="Festival and Sport setup items that need attention."
      >
        {blockers.length ? (
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
        ) : (
          <Alert
            severity="success"
            icon={<CheckCircleOutlineRoundedIcon />}
          >
                No Festival or Sport Tournament setup issues were found.
          </Alert>
        )}
      </DashboardSection>

      <DashboardSection
        title="Festival Auction Status"
        description="Main Festival Auction status and setup progress."
      >
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={3}
            >
              <Box>
                <Typography variant="h5">Main Festival Auction</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {participantName(data.festivalAuction?.current)}
                </Typography>
                {data.festivalAuction?.current && (
                  <Typography sx={{ mt: 1 }}>
                    Current bid:{" "}
                    {formatValue(
                      data.festivalAuction.current.currentBid,
                      data.festival.currencyCode || "INR"
                    )}
                  </Typography>
                )}
              </Box>
              <Stack alignItems={{ md: "flex-end" }} spacing={1.5}>
                <Chip
                  color={statusColor(festivalAuctionStatus)}
                  label={formatStatus(festivalAuctionStatus)}
                />
                <Typography variant="body2" color="text.secondary">
                      {data.festivalReadiness?.blockers?.length || 0} setup issue(s)
                </Typography>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => navigate(`/festivals/${festivalId}/auction-hub`)}
                    >
                      View Auction Details
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </DashboardSection>

      <DashboardSection
        title="Sport Tournament Status"
        description="Preparation, Auction, and future Competition handoff for every child Tournament."
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
                                    : tournament.status === "ready"
                                      ? sportArenaRoute(tournament.id)
                                      : sportManagementRoute(tournament.id)
                          )
                        }
                      >
                        {active
                              ? "View Auction Details"
                          : tournament.status === "ready"
                            ? "Open Live Sport Auction"
                          : tournament.status === "auction_completed"
                            ? "View Auction Results"
                            : "Manage Tournament"}
                      </Button>
                          <Button
                            color="inherit"
                            onClick={() =>
                              navigate(
                                `/sport-tournaments/${tournament.id}/manage`
                              )
                            }
                          >
                        Management
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

      <DashboardSection
        title="Competition Setup"
            description="Future competition setup after Sport team rosters are complete."
      >
        {data.sportTournaments.length ? (
          <DashboardGrid>
            {data.sportTournaments.map((tournament) => {
              const ready = competitionReadyStatuses.has(tournament.status);
              return (
                <ActionCard
                  key={`competition:${tournament.id}`}
                    eyebrow="Competition Setup"
                  title={tournament.name}
                  description={
                    ready
                          ? "Sport Auction rosters are complete. Competition setup is the next phase."
                          : "Complete Sport Auction rosters before Competition setup."
                  }
                  status={ready ? "ready for future phase" : "not ready"}
                  statusColor={ready ? "success" : "default"}
                  actionLabel="Review Sport Tournament"
                  onAction={() =>
                    navigate(sportManagementRoute(tournament.id))
                  }
                />
              );
            })}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            Create a Sport Tournament before evaluating Competition readiness.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent Results"
        description="Latest Festival and Sport Auction outcomes."
      >
        {recentOutcomes.length ? (
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
                actionLabel="View Results"
                onAction={() =>
                  outcome.unit === "credits"
                    ? navigate(outcome.route)
                    : openResults()
                }
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No completed Auction results are available yet.
          </EmptyDashboardState>
        )}
      </DashboardSection>
    </Stack>
  );
}
