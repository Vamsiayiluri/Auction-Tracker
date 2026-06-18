import { Box, Button, Chip, Divider, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ActionCard,
  DashboardGrid,
  DashboardHero,
  DashboardSection,
  EmptyDashboardState,
} from "./DashboardPrimitives";
import {
  formatStatus,
  formatValue,
  participantName,
  sportArenaRoute,
  sportManagementRoute,
  statusColor,
} from "./dashboardHelpers";

export default function AdminProductDashboard({ data }) {
  const navigate = useNavigate();

  const festivalAttention = data.festivalStates.flatMap(
    ({ festival, current, readiness }) => {
      const items = [];
      if (current?.current?.status === "pending") {
        items.push({
          id: `festival-pending:${festival.id}`,
          eyebrow: "Waiting for Confirmation",
          title: festival.name,
          description: `${participantName(current.current)} is waiting for an admin decision.`,
          status: "urgent",
          severity: "urgent",
          route: `/auctions/festivals/${festival.id}`,
          action: "Open Live Auction",
        });
      } else if (current?.config?.auctionStatus === "paused") {
        items.push({
          id: `festival-paused:${festival.id}`,
          eyebrow: "Festival Auction Paused",
          title: festival.name,
          description: "The main Festival Auction is paused. Resume it when bidding should continue.",
          status: "paused",
          severity: "warning",
          route: `/auctions/festivals/${festival.id}`,
          action: "Open Live Auction",
        });
      } else if (readiness?.blockers?.length) {
        items.push({
          id: `festival-blocked:${festival.id}`,
          eyebrow: "Setup Incomplete",
          title: festival.name,
          description: readiness.blockers[0],
          secondary: `${readiness.blockers.length} setup issue(s)`,
          status: "blocked",
          severity: "warning",
          route: `/festivals/${festival.id}/manage`,
          action: "Fix Setup Issues",
        });
      }
      return items;
    }
  );

  const sportAttention = data.sportStates.flatMap(
    ({ tournament, current, readiness }) => {
      if (current?.current?.status === "pending") {
        return [{
          id: `sport-pending:${tournament.id}`,
          eyebrow: "Waiting for Confirmation",
          title: tournament.name,
          description: `${participantName(current.current)} is waiting for a manager decision.`,
          status: "urgent",
          severity: "urgent",
          route: sportArenaRoute(tournament.id),
          action: "Open Live Auction",
        }];
      }
      if (tournament.status === "auction_paused") {
        return [{
          id: `sport-paused:${tournament.id}`,
          eyebrow: "Sport Auction Paused",
          title: tournament.name,
          description: "The Sport Auction is paused. Resume it when bidding should continue.",
          status: "paused",
          severity: "warning",
          route: sportArenaRoute(tournament.id),
          action: "Open Live Auction",
        }];
      }
      if (
        ["draft", "setup"].includes(tournament.status) &&
        readiness?.blockers?.length
      ) {
        return [{
          id: `sport-blocked:${tournament.id}`,
          eyebrow: "Setup Incomplete",
          title: tournament.name,
          description: readiness.blockers[0],
          secondary: `${readiness.blockers.length} setup issue(s)`,
          status: "blocked",
          severity: "warning",
          route: sportManagementRoute(tournament.id),
          action: "Fix Setup Issues",
        }];
      }
      return [];
    }
  );
  const attention = [...festivalAttention, ...sportAttention];

  const liveAuctions = [
    ...data.festivalStates
      .filter(({ current }) =>
        data.activeAuctionStatuses.has(current?.config?.auctionStatus)
      )
      .map(({ festival, current }) => ({
        id: `festival-live:${festival.id}`,
        eyebrow: "Festival Auction",
        title: festival.name,
        description: `${participantName(current.current)} | Current bid ${formatValue(
          current.current?.currentBid,
          "INR"
        )}`,
        status: current.config.auctionStatus,
        route: `/auctions/festivals/${festival.id}`,
      })),
    ...data.sportStates
      .filter(({ tournament }) =>
        data.activeSportStatuses.has(tournament.status)
      )
      .map(({ tournament, current }) => ({
        id: `sport-live:${tournament.id}`,
        eyebrow: "Sport Auction",
        title: tournament.name,
        description: `${participantName(current?.current)} | Current bid ${formatValue(
          current?.current?.currentCredits,
          "credits"
        )}`,
        status: tournament.status,
        route: sportArenaRoute(tournament.id),
      })),
  ];

  const nextActions = [
    ...data.festivalStates
      .filter(
        ({ current, readiness }) =>
          readiness?.overallStatus === "READY" &&
          current?.config?.auctionStatus === "setup"
      )
      .map(({ festival }) => ({
        id: `festival-ready:${festival.id}`,
        title: festival.name,
        description: "Festival Auction preparation is ready for review and launch.",
        status: "ready",
        route: `/festivals/${festival.id}/manage`,
        action: "Review Festival",
      })),
    ...data.sportStates
      .filter(({ tournament }) => tournament.status === "ready")
      .map(({ tournament }) => ({
        id: `sport-ready:${tournament.id}`,
        title: tournament.name,
        description: "Sport Auction setup is complete and ready to launch.",
        status: "ready",
        route: `/sport-tournaments/${tournament.id}/auction-hub`,
        action: "Review & Launch",
      })),
    ...data.sportStates
      .filter(({ tournament }) => tournament.status === "auction_completed")
      .map(({ tournament }) => ({
        id: `competition-next:${tournament.id}`,
        title: tournament.name,
        description:
          "Sport team members are finalized. Competition setup is the next product phase.",
        status: "competition pending",
        route: sportManagementRoute(tournament.id),
        action: "Review Results",
      })),
  ].slice(0, 8);

  return (
    <Stack spacing={5}>
      <DashboardHero
        eyebrow="Admin Dashboard"
        title="Manage Festivals, Auctions, and Teams from one place."
        description="Live auctions, setup issues, and next actions appear first."
        actionLabel="View Active Auctions"
        onAction={() => navigate("/auctions")}
      />

      {attention.length > 0 && (
        <DashboardSection
          title="Action Required"
          description="Paused auctions, setup issues, and decisions waiting for you."
        >
          <DashboardGrid>
            {attention.slice(0, 9).map((item) => (
              <ActionCard
                key={item.id}
                {...item}
                onAction={() => navigate(item.route)}
                actionLabel={item.action}
              />
            ))}
          </DashboardGrid>
        </DashboardSection>
      )}

      {liveAuctions.length > 0 && (
        <DashboardSection
          title="Live Now"
          description="Festival and Sport Auctions currently live or paused."
          action={
            <Button onClick={() => navigate("/auctions")}>View All Auctions</Button>
          }
        >
          <DashboardGrid>
            {liveAuctions.map((item) => (
              <ActionCard
                key={item.id}
                {...item}
                status={formatStatus(item.status)}
                statusColor={statusColor(item.status)}
                severity="live"
                actionLabel="Open Live Auction"
                onAction={() => navigate(item.route)}
              />
            ))}
          </DashboardGrid>
        </DashboardSection>
      )}

      <DashboardSection
        title="Festivals"
        description="Setup progress and current stage for each Festival."
        action={<Button onClick={() => navigate("/festivals")}>All Festivals</Button>}
      >
        {data.festivalStates.length ? (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <List disablePadding>
              {data.festivalStates.map(({ festival, current, readiness }, index) => {
                const sportChildren = data.tournaments.filter(
                  ({ festivalId }) => festivalId === festival.id
                );
                const auctionStatus =
                  current?.config?.auctionStatus ||
                  readiness?.counts?.auctionStatus ||
                  "setup";
                const blockerCount = readiness?.blockers?.length || 0;
                return (
                  <Box key={festival.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        <Button
                          size="small"
                          onClick={() => navigate(`/festivals/${festival.id}/command-center`)}
                        >
                          View
                        </Button>
                      }
                      sx={{ py: 1.5 }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" fontWeight={700}>{festival.name}</Typography>
                            <Chip
                              size="small"
                              label={formatStatus(auctionStatus)}
                              color={statusColor(auctionStatus) || "default"}
                            />
                            {blockerCount > 0 && (
                              <Chip size="small" label={`${blockerCount} issue${blockerCount !== 1 ? "s" : ""}`} color="warning" />
                            )}
                          </Stack>
                        }
                        secondary={`${sportChildren.length} Sport Tournament${sportChildren.length !== 1 ? "s" : ""}`}
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          </Box>
        ) : (
          <EmptyDashboardState>No Festivals have been created.</EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Next Actions"
        description="Auctions ready to start and setup work to review."
      >
        {nextActions.length ? (
          <DashboardGrid>
            {nextActions.map((item) => (
              <ActionCard
                key={item.id}
                {...item}
                statusColor={statusColor(item.status)}
                actionLabel={item.action}
                onAction={() => navigate(item.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No auctions or setup tasks need action right now.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent Outcomes"
        description="Latest Festival and Sport Auction results."
      >
        {data.recentOutcomes.length ? (
          <DashboardGrid>
            {data.recentOutcomes.slice(0, 6).map((outcome) => (
              <ActionCard
                key={outcome.id}
                eyebrow={outcome.type}
                title={outcome.title}
                description={
                  outcome.outcome === "sold"
                    ? `${outcome.teamName || "Team"} | ${formatValue(
                        outcome.value,
                        outcome.unit
                      )}`
                    : "Marked unsold"
                }
                secondary={outcome.context}
                status={outcome.outcome}
                statusColor={outcome.outcome === "sold" ? "success" : "warning"}
                actionLabel="View Results"
                onAction={() => navigate(outcome.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No completed Auction outcomes yet.</EmptyDashboardState>
        )}
      </DashboardSection>
    </Stack>
  );
}
