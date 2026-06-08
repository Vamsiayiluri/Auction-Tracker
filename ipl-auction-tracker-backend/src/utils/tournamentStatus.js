export const TOURNAMENT_STATUSES = ["upcoming", "live", "completed"];

const TOURNAMENT_TRANSITIONS = {
  upcoming: ["live"],
  live: ["completed"],
  completed: [],
};

export const isSupportedTournamentStatus = (status) =>
  TOURNAMENT_STATUSES.includes(status);

export const isValidTournamentTransition = (currentStatus, nextStatus) =>
  isSupportedTournamentStatus(currentStatus) &&
  isSupportedTournamentStatus(nextStatus) &&
  TOURNAMENT_TRANSITIONS[currentStatus].includes(nextStatus);

export const tournamentTransitionValidationError = (
  currentStatus,
  nextStatus
) => ({
  success: false,
  message: "Validation failed",
  errors: [
    {
      path: "body.status",
      message: `Invalid tournament status transition from ${currentStatus} to ${nextStatus}`,
    },
  ],
});
