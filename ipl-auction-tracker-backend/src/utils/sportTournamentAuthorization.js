import {
  Employee,
  FestivalParticipant,
  FestivalTeamOwner,
  SportTeam,
  SportTeamCaptain,
  SportTournament,
} from "../models/index.js";

export const findActiveFestivalTeamOwnerForUser = async ({
  userId,
  festivalId,
  festivalTeamId,
  transaction,
}) => {
  const employee = await Employee.findOne({
    where: { userId, employmentStatus: "active" },
    transaction,
  });
  if (!employee) return null;

  const participant = await FestivalParticipant.findOne({
    where: {
      festivalId,
      employeeId: employee.id,
      status: "registered",
    },
    transaction,
  });
  if (!participant) return null;

  return FestivalTeamOwner.findOne({
    where: {
      festivalId,
      festivalTeamId,
      festivalParticipantId: participant.id,
      status: "active",
    },
    transaction,
  });
};

export const canManageFestivalTeamSports = async ({
  user,
  festivalId,
  festivalTeamId,
  transaction,
}) => {
  if (user?.role === "admin") return true;
  if (user?.role !== "team_owner") return false;

  return Boolean(
    await findActiveFestivalTeamOwnerForUser({
      userId: user.id,
      festivalId,
      festivalTeamId,
      transaction,
    })
  );
};

export const loadAuthorizedSportTournament = async ({
  sportTournamentId,
  user,
  transaction,
}) => {
  const tournament = await SportTournament.findByPk(sportTournamentId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!tournament) return { tournament: null, authorized: false };

  const authorized = await canManageFestivalTeamSports({
    user,
    festivalId: tournament.festivalId,
    festivalTeamId: tournament.festivalTeamId,
    transaction,
  });

  return { tournament, authorized };
};

export const findActiveSportCaptainForUser = async ({
  userId,
  sportTournamentId,
  transaction,
  lock = false,
}) => {
  const employee = await Employee.findOne({
    where: { userId, employmentStatus: "active" },
    transaction,
  });
  if (!employee) return null;
  const tournament = await SportTournament.findByPk(sportTournamentId, {
    transaction,
  });
  if (!tournament) return null;
  const participant = await FestivalParticipant.findOne({
    where: {
      festivalId: tournament.festivalId,
      employeeId: employee.id,
      status: "registered",
    },
    transaction,
  });
  if (!participant) return null;
  return SportTeamCaptain.findOne({
    where: {
      sportTournamentId,
      festivalParticipantId: participant.id,
      status: "active",
    },
    include: [{
      model: SportTeam,
      as: "team",
      required: true,
      where: { status: "active" },
    }],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
};
