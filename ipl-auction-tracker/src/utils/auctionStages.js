export const AUCTION_STAGE = {
  SETUP: "setup",
  READY: "ready",
  LIVE: "live",
  COMPLETED: "completed",
};

const setupStatuses = new Set([
  "draft",
  "setup",
  "not_configured",
  "not_ready",
  "setup_incomplete",
]);

const readyStatuses = new Set(["ready", "ready_to_launch"]);
const liveStatuses = new Set([
  "live",
  "paused",
  "auction_live",
  "auction_paused",
]);
const completedStatuses = new Set(["completed", "auction_completed"]);

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

export const getFestivalAuctionStage = ({
  auctionStatus,
  readinessStatus,
  festivalStatus,
} = {}) => {
  const normalizedAuctionStatus = normalizeStatus(auctionStatus);
  const normalizedFestivalStatus = normalizeStatus(festivalStatus);
  const normalizedReadinessStatus = normalizeStatus(readinessStatus);

  if (
    completedStatuses.has(normalizedAuctionStatus) ||
    completedStatuses.has(normalizedFestivalStatus)
  ) {
    return AUCTION_STAGE.COMPLETED;
  }

  if (liveStatuses.has(normalizedAuctionStatus)) {
    return AUCTION_STAGE.LIVE;
  }

  if (
    readyStatuses.has(normalizedFestivalStatus) ||
    (normalizedAuctionStatus === "setup" &&
      normalizedReadinessStatus === "ready") ||
    normalizedReadinessStatus === "ready"
  ) {
    return AUCTION_STAGE.READY;
  }

  if (
    setupStatuses.has(normalizedAuctionStatus) ||
    setupStatuses.has(normalizedFestivalStatus)
  ) {
    return AUCTION_STAGE.SETUP;
  }

  return AUCTION_STAGE.SETUP;
};

export const getFestivalAuctionStageFromState = ({
  festival,
  auction,
  readiness,
  auctionStatus,
  readinessStatus,
  festivalStatus,
} = {}) =>
  getFestivalAuctionStage({
    auctionStatus:
      auctionStatus ||
      auction?.config?.auctionStatus ||
      readiness?.counts?.auctionStatus ||
      festival?.auctionStatus,
    readinessStatus:
      readinessStatus ||
      readiness?.overallStatus ||
      festival?.readinessStatus ||
      festival?.overallStatus,
    festivalStatus: festivalStatus || festival?.status,
  });

export const getSportAuctionStage = ({ status, readinessReady } = {}) => {
  const normalizedStatus = normalizeStatus(status);

  if (completedStatuses.has(normalizedStatus)) {
    return AUCTION_STAGE.COMPLETED;
  }

  if (
    liveStatuses.has(normalizedStatus) ||
    normalizedStatus === "pending_finalization"
  ) {
    return AUCTION_STAGE.LIVE;
  }

  if (readyStatuses.has(normalizedStatus) || readinessReady) {
    return AUCTION_STAGE.READY;
  }

  return AUCTION_STAGE.SETUP;
};

export const isSetupStage = (stage) => stage === AUCTION_STAGE.SETUP;
export const isReadyStage = (stage) => stage === AUCTION_STAGE.READY;
export const isLiveStage = (stage) => stage === AUCTION_STAGE.LIVE;
export const isCompletedStage = (stage) => stage === AUCTION_STAGE.COMPLETED;

export const hasStartedStage = (stage) =>
  stage === AUCTION_STAGE.LIVE || stage === AUCTION_STAGE.COMPLETED;

export const shouldShowResults = ({ stage, resultCount = 0 } = {}) =>
  stage === AUCTION_STAGE.COMPLETED || Number(resultCount) > 0;

export const shouldShowInAuctionDirectory = (stage) =>
  stage === AUCTION_STAGE.SETUP ||
  stage === AUCTION_STAGE.READY ||
  stage === AUCTION_STAGE.LIVE ||
  stage === AUCTION_STAGE.COMPLETED;

export const getStageLabel = (stage) => {
  if (stage === AUCTION_STAGE.READY) return "Ready to Launch";
  if (stage === AUCTION_STAGE.LIVE) return "Live Auction";
  if (stage === AUCTION_STAGE.COMPLETED) return "Completed";
  return "Setup Incomplete";
};
