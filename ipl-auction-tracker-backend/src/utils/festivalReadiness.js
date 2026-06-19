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
import {
  requestCacheGetOrSet,
  transactionScopedCacheKey,
} from "./requestPerformance.js";

const ownerInclude = {
  model: FestivalParticipant,
  as: "participant",
  attributes: ["id", "employeeId"],
  required: false,
  include: [
    {
      model: Employee,
      as: "employee",
      attributes: ["id", "userId"],
      required: false,
      include: [
        { model: User, as: "user", attributes: ["id", "role"], required: false },
      ],
    },
  ],
};

const groupedCount = (rows, key = "state") =>
  new Map(
    (rows || []).map((row) => {
      const plain =
        typeof row?.get === "function" ? row.get({ plain: true }) : row;
      return [plain[key], Number(plain.count || 0)];
    })
  );

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const safeNotReadyReadiness = (festivalId, error) => {
  console.error("[festival-readiness] calculation failed", {
    festivalId,
    error: error?.stack || error,
  });
  return {
    festivalId,
    overallStatus: "NOT_READY",
    blockers: ["Festival readiness could not be calculated"],
    counts: {
      employees: 0,
      participants: 0,
      sportsRegistered: 0,
      teamsCreated: 0,
      ownersAssigned: 0,
      ownersActivated: 0,
      retentions: 0,
      rosterMemberships: 0,
      auctionPoolSize: 0,
      unsoldPlayers: 0,
      auctionStatus: "setup",
      sportsEnabled: 0,
    },
    teams: [],
    setupSteps: {
      festivalDetails: false,
      setupFoundation: false,
      participants: false,
      teams: false,
      budget: false,
      owners: false,
      retentions: false,
      auctionPool: false,
      reviewAndLaunch: false,
    },
  };
};

const calculateFestivalReadiness = async (festivalId, transaction) => {
  const festival = await Festival.findByPk(festivalId, { transaction });
  if (!festival) return null;

  const [
    employees,
    participantCount,
    sportRegistrations,
    enabledSports,
    teams,
    owners,
    retentions,
    membershipCount,
    poolCountRows,
    config,
  ] = await Promise.all([
    Employee.count({ where: { employmentStatus: "active" }, transaction }),
    FestivalParticipant.count({
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
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
      transaction,
    }),
    FestivalTeamOwner.findAll({
      where: { festivalId },
      attributes: [
        "id",
        "festivalId",
        "festivalTeamId",
        "festivalParticipantId",
        "status",
        "userProvisioningStatus",
      ],
      include: [ownerInclude],
      transaction,
    }),
    FestivalRetention.count({ where: { festivalId }, transaction }),
    FestivalTeamMembership.count({
      where: { festivalId },
      transaction,
    }),
    FestivalAuctionPool.count({
      where: { festivalId },
      attributes: ["state"],
      group: ["state"],
      transaction,
    }),
    FestivalAuctionConfig.findOne({
      where: { festivalId },
      attributes: ["id", "festivalId", "auctionStatus"],
      transaction,
    }),
  ]);

  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeOwners = Array.isArray(owners) ? owners : [];
  const safeParticipantCount = safeNumber(participantCount);
  const safeSportRegistrations = safeNumber(sportRegistrations);
  const safeEnabledSports = safeNumber(enabledSports);
  const safeEmployees = safeNumber(employees);
  const safeRetentions = safeNumber(retentions);
  const safeMembershipCount = safeNumber(membershipCount);

  const activeTeamIds = new Set(safeTeams.map(({ id }) => id));
  const activeTeamOwners = safeOwners.filter(({ festivalTeamId }) =>
    activeTeamIds.has(festivalTeamId)
  );
  const ownerByTeamId = new Map(
    activeTeamOwners.map((owner) => [owner.festivalTeamId, owner])
  );
  const teamsReadiness = safeTeams.map((team) => {
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

  const poolCounts = groupedCount(poolCountRows);
  const poolSize = poolCounts.get("available") || 0;
  const unsoldPlayers = poolCounts.get("unsold") || 0;
  const blockers = [];
  if (festival.rosterFormationMode !== "auction") {
    blockers.push("Festival roster formation mode must be auction");
  }
  if (!config) blockers.push("Auction budget and owner cost are not configured");
  if (safeTeams.length < 2) blockers.push("At least two active Festival Teams are required");
  if (!safeParticipantCount) blockers.push("No registered Festival Participants");
  if (!safeEnabledSports) blockers.push("No Festival Sports are enabled");
  if (!safeSportRegistrations) blockers.push("No participant sport registrations");
  teamsReadiness.forEach((team) =>
    (team.blockers || []).forEach((blocker) =>
      blockers.push(`${team.teamName}: ${blocker}`)
    )
  );
  if (!poolSize) blockers.push("Auction pool is empty");

  const allTeamsHaveReadyOwners =
    safeTeams.length > 0 && teamsReadiness.every(({ ready }) => ready);

  return {
    festivalId,
    overallStatus: blockers.length ? "NOT_READY" : "READY",
    blockers,
    counts: {
      employees: safeEmployees,
      participants: safeParticipantCount,
      sportsRegistered: safeSportRegistrations,
      teamsCreated: safeTeams.length,
      ownersAssigned: activeTeamOwners.length,
      ownersActivated: activeTeamOwners.filter(({ status }) => status === "active")
        .length,
      retentions: safeRetentions,
      rosterMemberships: safeMembershipCount,
      auctionPoolSize: poolSize,
      unsoldPlayers,
      auctionStatus: config?.auctionStatus || "setup",
      sportsEnabled: safeEnabledSports,
    },
    teams: teamsReadiness,
    setupSteps: {
      festivalDetails: true,
      setupFoundation: safeEnabledSports > 0 && safeEmployees > 0,
      participants:
        safeParticipantCount > 0 && safeSportRegistrations > 0,
      teams: safeTeams.length >= 2,
      budget: Boolean(config),
      owners: allTeamsHaveReadyOwners,
      retentions: true,
      auctionPool: poolSize > 0,
      reviewAndLaunch: blockers.length === 0,
    },
  };
};

export const getFestivalReadiness = (festivalId, transaction) =>
  requestCacheGetOrSet(
    transactionScopedCacheKey("festival-readiness", festivalId, transaction),
    async () => {
      try {
        return await calculateFestivalReadiness(festivalId, transaction);
      } catch (error) {
        return safeNotReadyReadiness(festivalId, error);
      }
    }
  );
