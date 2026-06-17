import { Button, Stack } from "@mui/material";
import { NavLink } from "react-router-dom";
import {
  AUCTION_STAGE,
  shouldShowResults,
} from "../utils/auctionStages";

export default function AuctionContextNavigation({
  commandCenter,
  management,
  hub,
  arena,
  results,
  stage,
  hasResults = false,
}) {
  const stageItems = {
    [AUCTION_STAGE.SETUP]: [
      ["Overview", commandCenter],
      ["Setup", management],
    ],
    [AUCTION_STAGE.READY]: [
      ["Overview", commandCenter],
      ["Setup", management],
      shouldShowResults({ stage, resultCount: hasResults ? 1 : 0 })
        ? ["Results", results]
        : null,
    ],
    [AUCTION_STAGE.LIVE]: [
      ["Overview", commandCenter],
      ["Auction Details", hub],
      ["Live Auction", arena],
      shouldShowResults({ stage, resultCount: hasResults ? 1 : 0 })
        ? ["Results", results]
        : null,
    ],
    [AUCTION_STAGE.COMPLETED]: [
      ["Overview", commandCenter],
      ["Results", results],
      ["Auction Details", hub],
    ],
  };
  const items = (stageItems[stage] || [
    ["Overview", commandCenter],
    ["Setup", management],
    ["Auction Details", hub],
    ["Live Auction", arena],
    ["Results", results],
  ]).filter((item) => item && Boolean(item[1]));

  return (
    <Stack
      component="nav"
      aria-label="Auction context navigation"
      direction="row"
      spacing={0.5}
      useFlexGap
      flexWrap="wrap"
    >
      {items.map(([label, destination]) => (
        <Button
          key={label}
          component={NavLink}
          to={destination}
          size="small"
          color="inherit"
          sx={{
            minHeight: 38,
            "&.active": {
              bgcolor: "primary.light",
              color: "primary.dark",
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
}
