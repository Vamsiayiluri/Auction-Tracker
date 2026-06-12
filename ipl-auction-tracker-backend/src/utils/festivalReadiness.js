import {
  Employee,
  Festival,
  FestivalAuction,
  FestivalAuctionConfig,
  FestivalAuctionResult,
  FestivalAuctionPool,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalRetention,
  FestivalSport,
  FestivalTeam,
  FestivalTeamMembership,
  FestivalTeamOwner,
  User,
} from "../models/index.js";

const ownerInclude = {
  model: FestivalParticipant,
  as: "participant",
  required: false,
  include: [
    {
      model: Employee,
      as: "employee",
      required: false,
      include: [{ model: User, as: "user", required: false }],
    },
  ],
};

export const getFestivalReadiness = async (festivalId, transaction) => {
  const festival = await Festival.findByPk(festivalId, { transaction });
  if (!festival) return null;

  const [
    employees,
    participants,
    sportRegistrations,
    enabledSports,
    teams,
    owners,
    retentions,
    memberships,
    poolEntries,
    config,
  ] = await Promise.all([
    Employee.count({ where: { employmentStatus: "active" }, transaction }),
    FestivalParticipant.findAll({
      where: { festivalId, status: "registered" },
      transaction,
    }),
    FestivalParticipantSport.count({
      include: [
        {
          model: FestivalParticipant,
          as: "participant",
          required: true,
          where: { festivalId, status: "registered" },
        },
      ],
      transaction,
    }),
    FestivalSport.count({ where: { festivalId }, transaction }),
    FestivalTeam.findAll({
      where: { festivalId, status: "active" },
      order: [["name", "ASC"]],
      transaction,
    }),
    FestivalTeamOwner.findAll({
      where: { festivalId },
      include: [ownerInclude],
      transaction,
    }),
    FestivalRetention.count({ where: { festivalId }, transaction }),
    FestivalTeamMembership.findAll({
      where: { festivalId },
      attributes: ["festivalParticipantId"],
      transaction,
    }),
    FestivalAuctionPool.findAll({
      where: { festivalId },
      attributes: ["festivalParticipantId", "state"],
      transaction,
    }),
    FestivalAuctionConfig.findOne({ where: { festivalId }, transaction }),
  ]);

  const activeTeamIds = new Set(teams.map(({ id }) => id));
  const activeTeamOwners = owners.filter(({ festivalTeamId }) =>
    activeTeamIds.has(festivalTeamId)
  );
  const ownerByTeamId = new Map(
    activeTeamOwners.map((owner) => [owner.festivalTeamId, owner])
  );
  const teamsReadiness = teams.map((team) => {
    const owner = ownerByTeamId.get(team.id);
    const employee = owner?.participant?.employee;
    const user = employee?.user;
    const blockers = [];
    if (!owner) blockers.push("Owner not assigned");
    if (owner && !employee) blockers.push("Owner employee record missing");
    if (employee && !user) blockers.push("Owner user account missing");
    if (user && user.role !== "team_owner") {
      blockers.push("Owner account must use the team_owner role");
    }
    if (owner && owner.status !== "active") {
      blockers.push(`Owner status is ${owner.status}`);
    }
    return {
      festivalTeamId: team.id,
      teamName: team.name,
      ownerStatus: owner?.status || null,
      userStatus:
        owner?.userProvisioningStatus === "auto_created"
          ? "Auto Created"
          : owner?.userProvisioningStatus === "existing_user"
            ? "Existing User"
            : null,
      ready: blockers.length === 0,
      blockers,
    };
  });

  const poolSize = poolEntries.filter(({ state }) => state === "available").length;
  const unsoldPlayers = poolEntries.filter(({ state }) => state === "unsold").length;
  const blockers = [];
  if (festival.rosterFormationMode !== "auction") {
    blockers.push("Festival roster formation mode must be auction");
  }
  if (!config) blockers.push("Auction budget and owner cost are not configured");
  if (teams.length < 2) blockers.push("At least two active Festival Teams are required");
  if (!participants.length) blockers.push("No registered Festival Participants");
  if (!enabledSports) blockers.push("No Festival Sports are enabled");
  if (!sportRegistrations) blockers.push("No participant sport registrations");
  teamsReadiness.forEach((team) =>
    team.blockers.forEach((blocker) =>
      blockers.push(`${team.teamName}: ${blocker}`)
    )
  );
  if (!poolSize) blockers.push("Auction pool is empty");

  const allTeamsHaveReadyOwners =
    teams.length > 0 && teamsReadiness.every(({ ready }) => ready);

  return {
    festivalId,
    overallStatus: blockers.length ? "NOT_READY" : "READY",
    blockers,
    counts: {
      employees,
      participants: participants.length,
      sportsRegistered: sportRegistrations,
      teamsCreated: teams.length,
      ownersAssigned: activeTeamOwners.length,
      ownersActivated: activeTeamOwners.filter(({ status }) => status === "active")
        .length,
      retentions,
      auctionPoolSize: poolSize,
      unsoldPlayers,
      auctionStatus: config?.auctionStatus || "setup",
      sportsEnabled: enabledSports,
    },
    teams: teamsReadiness,
    setupSteps: {
      festivalDetails: true,
      setupFoundation: enabledSports > 0 && employees > 0,
      participants:
        participants.length > 0 && sportRegistrations > 0,
      teams: teams.length >= 2,
      budget: Boolean(config),
      owners: allTeamsHaveReadyOwners,
      retentions: true,
      auctionPool: poolSize > 0,
      reviewAndLaunch: blockers.length === 0,
    },
  };
};
