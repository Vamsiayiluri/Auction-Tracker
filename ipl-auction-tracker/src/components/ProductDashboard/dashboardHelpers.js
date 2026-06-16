const statusLabels = {
  unknown: "Status unavailable",
  setup: "Setup Incomplete",
  draft: "Draft",
  ready: "Ready",
  live: "Live Auction",
  auction_live: "Live Auction",
  paused: "Auction Paused",
  auction_paused: "Auction Paused",
  pending: "Waiting for Confirmation",
  pending_finalization: "Waiting for Confirmation",
  completed: "Completed Auction",
  auction_completed: "Completed Auction",
  blocked: "Setup Incomplete",
  urgent: "Action Required",
  "competition pending": "Next Phase Pending",
};

export const formatStatus = (value) => {
  const key = String(value || "unknown").toLowerCase();
  return statusLabels[key] || String(value || "unknown").replaceAll("_", " ");
};

export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return "";
  if (unit === "credits") {
    return `${new Intl.NumberFormat("en-IN").format(Number(value))} credits`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: unit || "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const participantName = (current) =>
  current?.participant?.employee?.name ||
  current?.participant?.name ||
  "No active participant";

export const statusColor = (status) => {
  if (["live", "auction_live", "ready"].includes(status)) return "success";
  if (["paused", "auction_paused", "pending"].includes(status)) return "warning";
  if (["completed", "auction_completed"].includes(status)) return "info";
  return "default";
};

export const sportArenaRoute = (tournamentId) =>
  `/auctions/sports/${tournamentId}`;

export const sportManagementRoute = (tournamentId) =>
  `/sport-tournaments/${tournamentId}/manage`;
