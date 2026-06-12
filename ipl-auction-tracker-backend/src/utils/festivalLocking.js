import { Festival, FestivalAuctionConfig } from "../models/index.js";

export const LOCKED_AUCTION_STATUSES = ["live", "paused", "completed"];

export const getFestivalLockState = async (festivalId, transaction) => {
  const [festival, config] = await Promise.all([
    Festival.findByPk(festivalId, {
      attributes: ["configurationLockState"],
      transaction,
    }),
    FestivalAuctionConfig.findOne({
      where: { festivalId },
      attributes: ["auctionStatus"],
      transaction,
    }),
  ]);
  const auctionStatus = config?.auctionStatus || "setup";
  const configurationLockState =
    festival?.configurationLockState || "locked";
  const lifecycleLocked = LOCKED_AUCTION_STATUSES.includes(auctionStatus);
  return {
    locked:
      lifecycleLocked && configurationLockState !== "unlocked",
    lifecycleLocked,
    configurationLockState,
    overrideActive:
      lifecycleLocked && configurationLockState === "unlocked",
    auctionStatus,
  };
};

export const requireFestivalConfigurationOpen = async ({
  festivalId,
  res,
  transaction,
  section = "Festival configuration",
  allowWhenUnlocked = true,
}) => {
  const lockState = await getFestivalLockState(festivalId, transaction);
  if (
    !lockState.lifecycleLocked ||
    (allowWhenUnlocked &&
      lockState.configurationLockState === "unlocked")
  ) {
    return lockState;
  }
  res.status(423).json({
    success: false,
    code: "FESTIVAL_LOCKED",
    message:
      allowWhenUnlocked
        ? `${section} is locked after the Main Festival Auction starts`
        : `${section} cannot be changed after the Main Festival Auction starts`,
    lockState,
  });
  return null;
};
