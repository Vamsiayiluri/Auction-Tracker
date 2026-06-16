import { toEmployeeResponse } from "./employeeResponse.js";

const toPlain = (record) =>
  typeof record?.get === "function" ? record.get({ plain: true }) : record;

export const toSportCaptainResponse = (captain) => {
  if (!captain) return null;
  const plain = toPlain(captain);
  return {
    id: plain.id,
    sportTournamentId: plain.sportTournamentId,
    sportTeamId: plain.sportTeamId,
    festivalParticipantId: plain.festivalParticipantId,
    status: plain.status,
    assignedAt: plain.assignedAt,
    participant: plain.participant
      ? {
          id: plain.participant.id,
          employee: plain.participant.employee
            ? toEmployeeResponse(plain.participant.employee)
            : null,
        }
      : undefined,
  };
};

export const toSportTeamResponse = (team) => {
  const plain = toPlain(team);
  return {
    id: plain.id,
    sportTournamentId: plain.sportTournamentId,
    festivalId: plain.festivalId,
    festivalTeamId: plain.festivalTeamId,
    name: plain.name,
    code: plain.code,
    color: plain.color,
    logoUrl: plain.logoUrl,
    status: plain.status,
    captain: toSportCaptainResponse(plain.captainAssignment),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const toSportTournamentResponse = (tournament) => {
  const plain = toPlain(tournament);
  return {
    id: plain.id,
    festivalId: plain.festivalId,
    festivalTeamId: plain.festivalTeamId,
    festivalSportId: plain.festivalSportId,
    sportId: plain.sportId,
    name: plain.name,
    code: plain.code,
    division: plain.division,
    participantGenderRule: plain.participantGenderRule,
    status: plain.status,
    teamCount: plain.teamCount,
    festival: plain.festival
      ? { id: plain.festival.id, name: plain.festival.name, code: plain.festival.code }
      : undefined,
    festivalTeam: plain.festivalTeam
      ? {
          id: plain.festivalTeam.id,
          name: plain.festivalTeam.name,
          code: plain.festivalTeam.code,
        }
      : undefined,
    sport: plain.sport
      ? { id: plain.sport.id, code: plain.sport.code, name: plain.sport.name }
      : undefined,
    teams: plain.teams?.map(toSportTeamResponse),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};
