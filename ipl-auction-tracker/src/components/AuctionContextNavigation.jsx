import { Button, Stack } from "@mui/material";
import { NavLink } from "react-router-dom";

export default function AuctionContextNavigation({
  commandCenter,
  management,
  hub,
  arena,
  results,
}) {
  const items = [
    ["Overview", commandCenter],
    ["Setup", management],
    ["Auction Details", hub],
    ["Live Auction", arena],
    ["Results", results],
  ].filter(([, destination]) => Boolean(destination));

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
