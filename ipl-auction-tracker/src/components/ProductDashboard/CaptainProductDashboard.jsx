import { Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  ActionCard,
  DashboardGrid,
  DashboardSection,
  EmptyDashboardState,
} from "./DashboardPrimitives";
import {
  formatValue,
  formatStatus,
  participantName,
  sportArenaRoute,
  statusColor,
} from "./dashboardHelpers";

export default function CaptainProductDashboard({ data, embedded = false }) {
  const navigate = useNavigate();
  const captainStates = data.sportStates.filter(
    ({ tournament }) => tournament.permissions?.canBid
  );
  const activeAuctions = captainStates.filter(({ tournament }) =>
    data.activeSportStatuses.has(tournament.status)
  );
  const competitionReady = captainStates.filter(({ tournament }) =>
    [
      "auction_completed",
      "competition_pending",
      "competition_live",
      "competition_completed",
    ].includes(tournament.status)
  );

  return (
    <Stack spacing={embedded ? 4 : 5}>
      <DashboardSection
        title={embedded ? "Captain Responsibilities" : "My Captain Assignments"}
        description="Your Sport Team assignments and auction access."
      >
        {captainStates.length ? (
          <DashboardGrid>
            {captainStates.map(({ tournament, current, readiness }) => (
              <ActionCard
                key={tournament.id}
                eyebrow="Captain Assignment"
                title={current?.viewer?.sportTeamName || tournament.name}
                description={
                  data.activeSportStatuses.has(tournament.status)
                    ? `${tournament.name} | ${tournament.sport?.name || "Sport"}`
                    : readiness?.blockers?.[0]
                      ? `Waiting For Setup: ${readiness.blockers[0]}`
                      : "Waiting For Auction Launch"
                }
                status={formatStatus(tournament.status)}
                statusColor={statusColor(tournament.status)}
                actionLabel={
                  data.activeSportStatuses.has(tournament.status)
                    ? "Join Auction"
                    : "View Tournament Overview"
                }
                onAction={() =>
                  navigate(
                    data.activeSportStatuses.has(tournament.status)
                      ? sportArenaRoute(tournament.id)
                      : `/sport-tournaments/${tournament.id}`
                  )
                }
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            No active Captain assignments were found for this account.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Active Sport Auctions"
        description="Sport Auctions where your assigned Team can participate."
      >
        {activeAuctions.length ? (
          <DashboardGrid>
            {activeAuctions.map(({ tournament, current }) => (
              <ActionCard
                key={tournament.id}
                eyebrow="Sport Auction"
                title={tournament.name}
                description={`${participantName(current?.current)} | ${
                  current?.viewer?.sportTeamName || "Assigned Sport Team"
                }`}
                status={formatStatus(tournament.status)}
                statusColor={statusColor(tournament.status)}
                severity="live"
                actionLabel="Join Auction"
                onAction={() => navigate(sportArenaRoute(tournament.id))}
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            None of your Captain assignments has an active Sport Auction.
          </EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="My Sport Teams"
        description="Team member and credit context exposed by existing Sport Auction state."
      >
        {captainStates.length ? (
          <DashboardGrid>
            {captainStates.map(({ tournament, current }) => {
              const team = current?.teams?.find(
                ({ sportTeamId }) =>
                  sportTeamId === current?.viewer?.sportTeamId
              );
              return (
                <ActionCard
                  key={`team:${tournament.id}`}
                  eyebrow={tournament.sport?.name || "Sport Team"}
                  title={
                    current?.viewer?.sportTeamName ||
                    team?.teamName ||
                    tournament.name
                  }
                  description={
                    team
                      ? `${formatValue(
                          team.remainingCredits,
                          "credits"
                        )} remaining`
                      : "Credit summary becomes available with Auction state."
                  }
                  secondary={`${team?.roster?.length || 0} team member(s)`}
                  status={formatStatus(tournament.status)}
                  statusColor={statusColor(tournament.status)}
                  actionLabel="View Auction Details"
                  onAction={() =>
                    navigate(`/sport-tournaments/${tournament.id}/auction-hub`)
                  }
                />
              );
            })}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>No assigned Sport Teams to display.</EmptyDashboardState>
        )}
      </DashboardSection>

      <DashboardSection
        title="Upcoming Competitions"
        description="Competition setup after Sport team members are finalized."
      >
        {competitionReady.length ? (
          <DashboardGrid>
            {competitionReady.map(({ tournament }) => (
              <ActionCard
                key={`competition:${tournament.id}`}
                eyebrow="Competition Setup"
                title={tournament.name}
                description="Sport team members are finalized. Competition setup is planned for a later phase."
                status="future phase"
                actionLabel="Review Results"
                onAction={() =>
                  navigate(`/sport-tournaments/${tournament.id}/results`)
                }
              />
            ))}
          </DashboardGrid>
        ) : (
          <EmptyDashboardState>
            Upcoming competitions will appear after Sport Auction completion.
          </EmptyDashboardState>
        )}
      </DashboardSection>
    </Stack>
  );
}
