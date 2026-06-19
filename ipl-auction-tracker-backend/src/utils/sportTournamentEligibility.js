import {
  Employee,
  FestivalParticipant,
  FestivalParticipantSport,
  FestivalTeamMembership,
  SportTeamCaptain,
  SportTeamMembership,
  SportTournament,
} from "../models/index.js";
import { toEmployeeResponse } from "./employeeResponse.js";
import {
  requestCacheGetOrSet,
  transactionScopedCacheKey,
} from "./requestPerformance.js";

export const SPORT_ELIGIBILITY_REASONS = {
  NOT_ON_PARENT_FESTIVAL_TEAM: "NOT_ON_PARENT_FESTIVAL_TEAM",
  PARTICIPANT_WITHDRAWN: "PARTICIPANT_WITHDRAWN",
  EMPLOYEE_INACTIVE: "EMPLOYEE_INACTIVE",
  SPORT_NOT_REGISTERED: "SPORT_NOT_REGISTERED",
  GENDER_RULE_MISMATCH: "GENDER_RULE_MISMATCH",
  CAPTAIN_ASSIGNED: "CAPTAIN_ASSIGNED",
  ALREADY_ASSIGNED: "ALREADY_ASSIGNED",
};

const participantInclude = [
  {
    model: Employee,
    as: "employee",
    required: false,
    attributes: [
      "id",
      "employeeNumber",
      "name",
      "email",
      "department",
      "gender",
      "employmentStatus",
      "source",
      "identityStatus",
      "userId",
      "createdAt",
      "updatedAt",
    ],
  },
  {
    model: FestivalParticipantSport,
    as: "sportRegistrations",
    required: false,
    attributes: ["id", "festivalParticipantId", "sportId"],
  },
  {
    model: FestivalTeamMembership,
    as: "teamMembership",
    required: false,
    attributes: ["id", "festivalId", "festivalTeamId", "festivalParticipantId"],
  },
];

export const evaluateSportTournamentParticipant = ({
  tournament,
  participant,
  captainParticipantIds = new Set(),
  sportTeamMemberParticipantIds = new Set(),
}) => {
  const reasons = [];
  const employee = participant.employee;
  const membership = participant.teamMembership;
  const registeredSportIds = new Set(
    (participant.sportRegistrations || []).map(({ sportId }) => sportId)
  );

  if (participant.status !== "registered") {
    reasons.push(SPORT_ELIGIBILITY_REASONS.PARTICIPANT_WITHDRAWN);
  }
  if (!employee || employee.employmentStatus !== "active") {
    reasons.push(SPORT_ELIGIBILITY_REASONS.EMPLOYEE_INACTIVE);
  }
  if (
    !membership ||
    membership.festivalTeamId !== tournament.festivalTeamId
  ) {
    reasons.push(SPORT_ELIGIBILITY_REASONS.NOT_ON_PARENT_FESTIVAL_TEAM);
  }
  if (!registeredSportIds.has(tournament.sportId)) {
    reasons.push(SPORT_ELIGIBILITY_REASONS.SPORT_NOT_REGISTERED);
  }
  if (
    employee &&
    tournament.participantGenderRule !== "any" &&
    employee.gender !== tournament.participantGenderRule
  ) {
    reasons.push(SPORT_ELIGIBILITY_REASONS.GENDER_RULE_MISMATCH);
  }

  const eligible = reasons.length === 0;
  const assignedCaptain = captainParticipantIds.has(participant.id);
  const assignedSportTeamMember = sportTeamMemberParticipantIds.has(
    participant.id
  );
  const poolExclusionReasons = [];
  if (assignedCaptain) {
    poolExclusionReasons.push(SPORT_ELIGIBILITY_REASONS.CAPTAIN_ASSIGNED);
  } else if (assignedSportTeamMember) {
    poolExclusionReasons.push(SPORT_ELIGIBILITY_REASONS.ALREADY_ASSIGNED);
  }

  return {
    festivalParticipantId: participant.id,
    eligible,
    availableForCaptainAssignment: eligible && !assignedCaptain,
    availableParticipantPool:
      eligible && !assignedCaptain && !assignedSportTeamMember,
    assignedCaptain,
    assignedSportTeamMember,
    reasons,
    poolExclusionReasons,
    employee: employee ? toEmployeeResponse(employee) : null,
  };
};

export const getSportTournamentEligibility = async (
  sportTournamentId,
  transaction
) => {
  const cacheKey = transactionScopedCacheKey(
    "sport-tournament-eligibility",
    sportTournamentId,
    transaction
  );
  return requestCacheGetOrSet(cacheKey, async () => {
    const tournament = await SportTournament.findByPk(sportTournamentId, {
      attributes: [
        "id",
        "festivalId",
        "festivalTeamId",
        "sportId",
        "participantGenderRule",
      ],
      transaction,
    });
    if (!tournament) return null;

    const [participants, captains, memberships] = await Promise.all([
      FestivalParticipant.findAll({
        where: { festivalId: tournament.festivalId },
        attributes: ["id", "festivalId", "employeeId", "status"],
        include: participantInclude,
        order: [[{ model: Employee, as: "employee" }, "name", "ASC"]],
        transaction,
      }),
      SportTeamCaptain.findAll({
        where: { sportTournamentId, status: "active" },
        attributes: ["festivalParticipantId"],
        transaction,
      }),
      SportTeamMembership.findAll({
        where: { sportTournamentId },
        attributes: ["festivalParticipantId"],
        transaction,
      }),
    ]);

    const captainParticipantIds = new Set(
      captains.map(({ festivalParticipantId }) => festivalParticipantId)
    );
    const sportTeamMemberParticipantIds = new Set(
      memberships.map(({ festivalParticipantId }) => festivalParticipantId)
    );
    const evaluated = participants.map((participant) =>
      evaluateSportTournamentParticipant({
        tournament,
        participant,
        captainParticipantIds,
        sportTeamMemberParticipantIds,
      })
    );

    return {
      sportTournamentId,
      totalParticipants: evaluated.length,
      eligibleCount: evaluated.filter(({ eligible }) => eligible).length,
      availablePoolCount: evaluated.filter(
        ({ availableParticipantPool }) => availableParticipantPool
      ).length,
      included: evaluated.filter(({ eligible }) => eligible),
      excluded: evaluated.filter(({ eligible }) => !eligible),
      poolExcluded: evaluated.filter(
        ({ eligible, availableParticipantPool }) =>
          eligible && !availableParticipantPool
      ),
    };
  });
};
