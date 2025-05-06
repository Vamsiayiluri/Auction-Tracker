import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Container,
  Paper,
  AppBar,
} from "@mui/material";

// import LiveAuction from "./LiveAuction";
import AuctionLive from "./AuctionLive";
import TeamsOverview from "./TeamsOverview";
import BidHistory from "../TeamOwnerDashboard/BidHistory";

const AdminDashboardLayout = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_, newIndex) => {
    setTabIndex(newIndex);
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{ backgroundColor: "#1e1e1e", boxShadow: 3 }}
      >
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          centered
          textColor="inherit"
          indicatorColor="secondary"
          sx={{ backgroundColor: "#1e1e1e" }}
        >
          <Tab label="Live Auction" />
          <Tab label="Teams" />
          <Tab label="Bid History" />
        </Tabs>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {tabIndex === 0 && <AuctionLive />}
        {tabIndex === 1 && <TeamsOverview />}
        {tabIndex === 2 && <BidHistory />}
      </Box>
    </>
  );
};

export default AdminDashboardLayout;
