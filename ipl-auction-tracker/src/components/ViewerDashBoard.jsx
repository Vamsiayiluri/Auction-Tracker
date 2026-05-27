import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import AvailableAuctions from "./AvailableAuctions";

const ViewerDashboard = () => {
  return (
    <Box>
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            bgcolor: "secondary.main",
            borderRadius: "999px",
            content: '""',
            height: 180,
            opacity: 0.12,
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
                <VisibilityRoundedIcon color="secondary" />
                <Typography variant="overline" color="secondary.dark">
                  Spectator mode
                </Typography>
              </Stack>
              <Typography variant="h5">
                Watch every bid, sale, and squad update without placing bids.
              </Typography>
              <Typography color="text.secondary">
                Follow live auctions, inspect teams, and browse bid history as
                results unfold.
              </Typography>
            </Stack>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<VisibilityRoundedIcon />}
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
};

export default ViewerDashboard;
