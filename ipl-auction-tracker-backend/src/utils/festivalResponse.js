import { toEmployeeResponse } from "./employeeResponse.js";

const toPlain = (record) =>
  typeof record?.get === "function" ? record.get({ plain: true }) : record;

export const toFestivalResponse = (festival) => {
  const plain = toPlain(festival);

  return {
    id: plain.id,
    name: plain.name,
    code: plain.code,
    startDate: plain.startDate,
    endDate: plain.endDate,
    registrationOpensAt: plain.registrationOpensAt,
    registrationClosesAt: plain.registrationClosesAt,
    status: plain.status,
    teamAssignmentStatus: plain.teamAssignmentStatus,
    rosterFormationMode: plain.rosterFormationMode,
    timezone: plain.timezone,
    currencyCode: plain.currencyCode,
    configurationLockState: plain.configurationLockState || "locked",
    createdByUserId: plain.createdByUserId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toFestivalSportResponse = (festivalSport) => {
  const plain = toPlain(festivalSport);

  return {
    id: plain.id,
    festivalId: plain.festivalId,
    sportId: plain.sportId,
    status: plain.status,
    config: plain.configJson,
    sport: plain.sport
      ? {
          id: plain.sport.id,
          code: plain.sport.code,
          name: plain.sport.name,
          isActive: plain.sport.isActive,
        }
      : undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toFestivalParticipantResponse = (participant) => {
  const plain = toPlain(participant);

  return {
    id: plain.id,
    festivalId: plain.festivalId,
    employeeId: plain.employeeId,
    status: plain.status,
    registeredAt: plain.registeredAt,
    employee: plain.employee
      ? toEmployeeResponse(plain.employee)
      : undefined,
    sports: plain.sportRegistrations
      ? plain.sportRegistrations.map(toFestivalParticipantSportResponse)
      : undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toFestivalTeamResponse = (festivalTeam) => {
  const plain = toPlain(festivalTeam);

  return {
    id: plain.id,
    festivalId: plain.festivalId,
    name: plain.name,
    code: plain.code,
    color: plain.color,
    logoUrl: plain.logoUrl,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toFestivalParticipantSportResponse = (registration) => {
  const plain = toPlain(registration);

  return {
    id: plain.id,
    festivalParticipantId: plain.festivalParticipantId,
    sportId: plain.sportId,
    sport: plain.sport
      ? {
          id: plain.sport.id,
          code: plain.sport.code,
          name: plain.sport.name,
          isActive: plain.sport.isActive,
        }
      : undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toFestivalTeamMembershipResponse = (membership) => {
  const plain = toPlain(membership);
  const participant = plain.participant;
  const sportRegistrations = participant?.sportRegistrations || [];

  return {
    id: plain.id,
    festivalId: plain.festivalId,
    festivalParticipantId: plain.festivalParticipantId,
    festivalTeamId: plain.festivalTeamId,
    assignmentMethod: plain.assignmentMethod,
    rosterSource: plain.rosterSource,
    assignedBy: plain.assignedBy,
    assignedAt: plain.assignedAt,
    strengthScore: sportRegistrations.length,
    participant: participant
      ? {
          ...toFestivalParticipantResponse(participant),
          strengthScore: sportRegistrations.length,
        }
      : undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};
