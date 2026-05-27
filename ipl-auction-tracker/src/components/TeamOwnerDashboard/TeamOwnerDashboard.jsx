import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import AvailableAuctions from "../AvailableAuctions";

export default function TeamOwnerDashboard() {
  return (
    <Box>
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            bgcolor: "primary.light",
            borderRadius: "999px",
            content: '""',
            height: 180,
            opacity: 0.55,
            position: "absolute",
            right: -70,
            top: -80,
            width: 180,
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative", zIndex: 1 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={1.25} sx={{ maxWidth: 680 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GroupsRoundedIcon color="primary" />
                <Typography variant="overline" color="primary.main">
                  Team owner workspace
                </Typography>
              </Stack>
              <Typography variant="h5">
                Prepare your squad strategy before the auction goes live.
              </Typography>
              <Typography color="text.secondary">
                Join invited live auctions, review your bought players, compare
                other squads, and track your bidding history from one place.
              </Typography>
            </Stack>
            <Button
              variant="contained"
              startIcon={<GavelRoundedIcon />}
              component="a"
              href="#available-auctions"
            >
              Select Auction
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <AvailableAuctions />
    </Box>
  );
}
