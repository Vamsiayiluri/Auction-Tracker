import { useState } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import AuctionLive from "./AuctionLive";
import TeamsOverview from "./TeamsOverview";
import BidHistory from "../TeamOwnerDashboard/BidHistory";

const AdminDashboardLayout = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_, newIndex) => {
    setTabIndex(newIndex);
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ px: { xs: 1, sm: 2 } }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Live Auction" />
          <Tab label="Teams" />
          <Tab label="Bid History" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {tabIndex === 0 && <AuctionLive />}
        {tabIndex === 1 && <TeamsOverview />}
        {tabIndex === 2 && <BidHistory />}
      </Box>
    </Box>
  );
};

export default AdminDashboardLayout;
