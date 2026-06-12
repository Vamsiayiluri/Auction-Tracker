export const TOURNAMENT_STATUSES = [
  "upcoming",
  "live",
  "completed",
  "archived",
];

const TOURNAMENT_TRANSITIONS = {
  upcoming: ["live"],
  live: ["completed"],
  completed: ["archived"],
  archived: [],
};

export const isSupportedTournamentStatus = (status) =>
  TOURNAMENT_STATUSES.includes(status);

export const isValidTournamentTransition = (currentStatus, nextStatus) =>
  isSupportedTournamentStatus(currentStatus) &&
  isSupportedTournamentStatus(nextStatus) &&
  TOURNAMENT_TRANSITIONS[currentStatus].includes(nextStatus);

export const isEditableTournamentStatus = (status) => status === "upcoming";

export const isArchivableTournamentStatus = (status) =>
  isValidTournamentTransition(status, "archived");

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

export const tournamentReadOnlyValidationError = (status) => ({
  success: false,
  message: "Validation failed",
  errors: [
    {
      path: "body.status",
      message: `Tournament cannot be edited when status is ${status}`,
    },
  ],
});
