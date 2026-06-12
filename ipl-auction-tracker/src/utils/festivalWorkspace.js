export const FESTIVAL_SETUP_STEPS = [
  "Festival Details",
  "Setup Foundation",
  "Participants",
  "Teams",
  "Budget",
  "Owners",
  "Retentions",
  "Auction Pool",
  "Review & Launch",
];

export const FESTIVAL_OPERATION_TABS = [
  "Overview",
  "Participants",
  "Teams",
  "Owners",
  "Retentions",
  "Auction",
  "Bid History",
  "Results",
  "Audit",
];

export const getSetupCompletion = (readiness) => {
  const setupSteps = readiness?.setupSteps || {};
  return [
    Boolean(setupSteps.festivalDetails),
    Boolean(setupSteps.setupFoundation),
    Boolean(setupSteps.participants),
    Boolean(setupSteps.teams),
    Boolean(setupSteps.budget),
    Boolean(setupSteps.owners),
    Boolean(setupSteps.retentions),
    Boolean(setupSteps.auctionPool),
    Boolean(setupSteps.reviewAndLaunch),
  ];
};

export const getStoredSetupStep = (storedStep) => {
  const index = FESTIVAL_SETUP_STEPS.indexOf(storedStep);
  return index >= 0 ? index : 0;
};

export const getWorkspaceMode = (auctionStatus) =>
  auctionStatus && auctionStatus !== "setup" ? "operations" : "setup";

export const getQuickActions = (auctionStatus) => {
  if (auctionStatus === "live") return ["open", "pause"];
  if (auctionStatus === "paused") return ["resume", "open"];
  if (auctionStatus === "completed") return ["results", "history"];
  return ["start"];
};

export const getAuctionDisplayStatus = (readiness) => {
  const status = readiness?.counts?.auctionStatus || "setup";
  if (status === "setup") return readiness?.overallStatus || "NOT_READY";
  return status.toUpperCase();
};
