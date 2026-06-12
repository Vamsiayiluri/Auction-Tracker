const participantKey = (participant) => {
  const employee = participant.employee || {};
  return [
    employee.employeeNumber || "",
    employee.name || "",
    participant.id,
  ].join("|");
};

export const participantStrengthScore = (participant) =>
  participant.sportRegistrations?.length || participant.sports?.length || 0;

export const snakeBalanceParticipants = (participants, teams) => {
  if (teams.length < 2) {
    throw new Error("At least two teams are required for auto-balance");
  }

  const orderedTeams = [...teams].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  );
  const orderedParticipants = [...participants].sort((left, right) => {
    const strengthDifference =
      participantStrengthScore(right) - participantStrengthScore(left);
    return strengthDifference || participantKey(left).localeCompare(participantKey(right));
  });
  const snake = [
    ...orderedTeams,
    ...orderedTeams.slice().reverse(),
  ];

  return orderedParticipants.map((participant, index) => ({
    participant,
    team: snake[index % snake.length],
    strengthScore: participantStrengthScore(participant),
  }));
};
