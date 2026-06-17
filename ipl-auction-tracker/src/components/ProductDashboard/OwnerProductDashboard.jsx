import { Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ActionCard,
  DashboardGrid,
  DashboardHero,
  DashboardSection,
  EmptyDashboardState,
} from "./DashboardPrimitives";
import CaptainProductDashboard from "./CaptainProductDashboard";
import {
  formatValue,
  formatStatus,
  participantName,
  sportManagementRoute,
  statusColor,
} from "./dashboardHelpers";

export default function OwnerProductDashboard({ data }) {
  const navigate = useNavigate();
  const ownerFestivalStates = data.festivalStates.filter(
    ({ current }) => current?.viewer?.isOwner
  );
  const managedSportStates = data.sportStates.filter(
    ({ tournament }) => tournament.permissions?.canManage
  );
  const captainStates = data.sportStates.filter(
    ({ tournament }) => tournament.permissions?.canBid
  );

  const primaryFestival = ownerFestivalStates.find(({ current }) =>
    data.activeAuctionStatuses.has(current?.config?.auctionStatus)
  );
  const primarySport = managedSportStates.find(({ tournament }) =>
    data.activeSportStatuses.has(tournament.status)
  );
  const primaryAction = primaryFestival
    ? {
        title: `Join ${primaryFestival.festival.name}`,
        description: `${participantName(primaryFestival.current.current)} is currently active in the Main Festival Auction.`,
        label: "Join Festival Auction",
        route: `/auctions/festivals/${primaryFestival.festival.id}`,
      }
    : ownerFestivalStates.some(
        ({ current }) => current?.config?.auctionStatus === "setup"
      )
      ? {
          title: "Waiting For Festival Setup",
          description:
            "The Festival Administrator is still preparing the Festival. You will be able to participate once setup is complete.",
          label: "View Auction Details",
          route: `/festivals/${
            ownerFestivalStates.find(
              ({ current }) => current?.config?.auctionStatus === "setup"
            )?.festival.id
          }/auction-hub`,
        }
    : primarySport
      ? {
          title: `Manage ${primarySport.tournament.name}`,
          description: "A Sport Auction you manage is currently active.",
          label: "View Sport Auction Details",
          route: `/sport-tournaments/${primarySport.tournament.id}/auction-hub`,
        }
      : {
          title: "Review my auctions",
          description:
            "No assigned auction is live. Review upcoming auctions and setup status.",
          label: "View Active Auctions",
          route: "/auctions",
        };

  const whatIsNext = managedSportStates
    .filter(({ tournament }) =>
      ["draft", "setup", "ready", "auction_completed"].includes(
        tournament.status
      )
    )
    .map(({ tournament, readiness }) => ({
      id: tournament.id,
      title: tournament.name,
      description:
        tournament.status === "ready"
            ? "Sport Auction setup is complete."
          : tournament.status === "auction_completed"
            ? "Review final Sport team members before competition setup."
            : readiness?.blockers?.[0] || "Continue Sport Tournament setup.",
      status: tournament.status,
      route:
        tournament.status === "ready"
          ? `/sport-tournaments/${tournament.id}/auction-hub`
          : sportManagementRoute(tournament.id),
      action:
        tournament.status === "ready"
          ? "Review & Launch"
          : tournament.status === "auction_completed"
            ? "Review Results"
            : "Continue Setup",
    }));

  return (
    <Stack spacing={5}>
      <DashboardHero
        eyebrow="Primary Action"
        title={primaryAction.title}
        description={primaryAction.description}
        actionLabel={primaryAction.label}
        onAction={() => navigate(primaryAction.route)}
      />

      <DashboardSection
        title="My Festival Team"
        description="Assigned Festival Team, purse, and team member context."
      >
        {data.ownerContexts.length ? (
          <DashboardGrid>
            {data.ownerContexts.map((context) => {
              const festivalState = ownerFestivalStates.find(
                ({ festival }) => festival.id === context.festivalId
              );
              const budget = festivalState?.current?.teamSummaries?.find(
                ({ festivalTeamId }) =>
                  festivalTeamId === context.festivalTeamId
              );
              const team = festivalState?.current?.teams?.find(
                ({ id }) => id === context.festivalTeamId
              );
              return (
                <ActionCard
                  key={context.festivalTeamId}
                  eyebrow={context.festivalName}
                  title={context.festivalTeamName}
                  description={
                    budget
                      ? `${formatValue(
                          budget.remainingBudget,
                          festivalState?.festival?.currencyCode || "INR"
                        )} purse remaining`
                      : "Festival Team assignment is active."
                  }
                  secondary={`${team?.members?.length || 0} team member(s)`}
                  status={formatStatus(
                    festivalState?.current?.config?.auctionStatus || "setup"
                  )}
                  statusColor={statusColor(
                    festivalState?.current?.config?.auctionStatus
                  )}
                  actionLabel="View Auction Details"
                  onAction={() =>
                    navigate(`/festivals/${context.festivalId}/auction-hub`)
                  }
                />
              );
            })}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No active Festival Team Owner assignment was found.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Sport Tournaments I Manage"
        description="Assignment-authorized Sport Tournament work."
      >
        {managedSportStates.length ? (
          <DashboardGrid>
            {managedSportStates.map(({ tournament, current, readiness }) => (
              <ActionCard
                key={tournament.id}
                eyebrow={`${tournament.festivalTeam?.name || "Festival Team"} | ${
                  tournament.sport?.name || "Sport"
                }`}
                title={tournament.name}
                description={
                  data.activeSportStatuses.has(tournament.status)
                    ? `${participantName(current?.current)} is currently active.`
                    : readiness?.blockers?.[0] ||
                      "Tournament management is available."
                }
                secondary={
                  readiness
                    ? `${readiness.readinessScore}% ready`
                    : undefined
                }
                status={formatStatus(tournament.status)}
                statusColor={statusColor(tournament.status)}
                actionLabel={
                  data.activeSportStatuses.has(tournament.status)
                    ? "View Auction Details"
                    : "Manage Tournament"
                }
                onAction={() =>
                  navigate(
                    data.activeSportStatuses.has(tournament.status)
                      ? `/sport-tournaments/${tournament.id}/auction-hub`
                      : sportManagementRoute(tournament.id)
                  )
                }
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No Sport Tournaments are currently assigned for management.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="What Is Next"
        description="Upcoming auctions, setup issues, and result review."
      >
        {whatIsNext.length ? (
          <DashboardGrid>
            {whatIsNext.map((item) => (
              <ActionCard
                key={item.id}
                title={item.title}
                description={item.description}
                status={formatStatus(item.status)}
                statusColor={statusColor(item.status)}
                actionLabel={item.action}
                onAction={() => navigate(item.route)}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No pending Owner actions were found.</EmptyDashboardState>
        )}
      </DashboardSection>

      {captainStates.length > 0 && (
        <CaptainProductDashboard data={data} embedded />
      )}
    </Stack>
  );
}
