import { Button, Stack } from "@mui/material";
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
  statusColor,
} from "./dashboardHelpers";

export default function SpectatorProductDashboard({ data }) {
  const navigate = useNavigate();
  const live = [
    ...data.festivalStates
      .filter(({ current }) =>
        data.activeAuctionStatuses.has(current?.config?.auctionStatus)
      )
      .map(({ festival, current }) => ({
        id: `festival:${festival.id}`,
        eyebrow: "Festival Auction",
        title: festival.name,
        description: `${participantName(current.current)} | ${formatValue(
          current.current?.currentBid,
          festival.currencyCode || "INR"
        )}`,
        status: current.config.auctionStatus,
        route: `/festivals/${festival.id}/auction-hub`,
      })),
    ...data.sportStates
      .filter(({ tournament }) =>
        data.activeSportStatuses.has(tournament.status)
      )
      .map(({ tournament, current }) => ({
        id: `sport:${tournament.id}`,
        eyebrow: "Sport Auction",
        title: tournament.name,
        description: `${participantName(current?.current)} | ${formatValue(
          current?.current?.currentCredits,
          "credits"
        )}`,
        status: tournament.status,
        route: `/sport-tournaments/${tournament.id}/auction-hub`,
      })),
  ];

  const upcoming = [
    ...data.festivalStates
      .filter(
        ({ current }) =>
          !data.activeAuctionStatuses.has(current?.config?.auctionStatus) &&
          current?.config?.auctionStatus !== "completed"
      )
      .map(({ festival, current }) => ({
        id: `festival-upcoming:${festival.id}`,
        eyebrow: "Festival Auction",
        title: festival.name,
        description: "The Main Festival Auction is not live yet.",
        status: current?.config?.auctionStatus || festival.status,
        route: `/festivals/${festival.id}/auction-hub`,
      })),
    ...data.sportStates
      .filter(({ tournament }) => tournament.status === "ready")
      .map(({ tournament }) => ({
        id: `sport-upcoming:${tournament.id}`,
        eyebrow: "Sport Auction",
        title: tournament.name,
        description: "Auction preparation is ready, but bidding has not started.",
        status: "ready",
        route: `/sport-tournaments/${tournament.id}/auction-hub`,
      })),
  ];

  return (
    <Stack spacing={5}>
      <DashboardHero
        eyebrow="Spectator Dashboard"
        title={live.length ? `${live.length} Auction(s) live now` : "Follow the Festival journey"}
        description="Live events and recent outcomes are prioritized before general Festival browsing."
        actionLabel="Watch Auctions"
        onAction={() => navigate("/auctions")}
      />

      <DashboardSection
        title="Live Now"
        description="Festival and Sport Auctions available to watch."
      >
        {live.length ? (
          <DashboardGrid>
            {live.map((item) => (
              <ActionCard
                key={item.id}
                {...item}
                status={formatStatus(item.status)}
                statusColor={statusColor(item.status)}
                severity="live"
                actionLabel="Open Auction Hub"
                onAction={() => navigate(item.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No Auctions are live right now.</EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Upcoming"
        description="Ready or not-yet-live Auction experiences."
        action={<Button onClick={() => navigate("/auctions")}>Browse Auctions</Button>}
      >
        {upcoming.length ? (
          <DashboardGrid>
            {upcoming.slice(0, 6).map((item) => (
              <ActionCard
                key={item.id}
                {...item}
                status={formatStatus(item.status)}
                statusColor={statusColor(item.status)}
                actionLabel="View Details"
                onAction={() => navigate(item.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No upcoming Auctions are visible.</EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent Results"
        description="Latest completed Festival and Sport Auction outcomes."
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
                actionLabel="View Auction"
                onAction={() => navigate(outcome.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No recent Auction results yet.</EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Festival Explorer"
        description="Browse Festivals as the parent context for Auctions and Sport Tournaments."
      >
        {data.festivals.length ? (
          <DashboardGrid>
            {data.festivals.map((festival) => (
              <ActionCard
                key={festival.id}
                eyebrow="Festival"
                title={festival.name}
                description={`${festival.startDate} to ${festival.endDate}`}
                status={formatStatus(festival.status)}
                statusColor={statusColor(festival.status)}
                actionLabel="Explore Auctions"
                onAction={() =>
                  navigate(`/festivals/${festival.id}/auction-hub`)
                }
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No Festivals are available.</EmptyDashboardState>
        )}
      </DashboardSection>
    </Stack>
  );
}
