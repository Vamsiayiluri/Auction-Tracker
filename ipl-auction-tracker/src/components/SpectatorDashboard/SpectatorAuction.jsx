import React, { useEffect, useState } from "react";
import { AppBar, Tabs, Tab, Box, Toolbar, Typography } from "@mui/material";

import { socket } from "../../webSocket/socket";
import TeamsOverview from "../AdminDashboardLayout/TeamsOverview";
import BidHistory from "../TeamOwnerDashboard/BidHistory";
import LiveAuction from "../TeamOwnerDashboard/LiveAuction";

const SpectatorAuction = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  useEffect(() => {
    socket.on("auction-started", (player) => {
      console.log("Auction started for:", player);
      // Update state with player info
    });

    return () => {
      socket.off("auction-started");
    };
  }, []);

  return (
    <>
      <AppBar
        position="static"
        sx={{ backgroundColor: "#1e1e1e", boxShadow: 3 }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab label="Live Auction" />
          <Tab label="Teams" />
          <Tab label="Bid History" />
        </Tabs>
      </AppBar>

      <Box p={3}>
        {activeTab === 0 && <LiveAuction userRole="spectator" />}

        {activeTab === 1 && <TeamsOverview />}

        {activeTab === 2 && <BidHistory />}
      </Box>
    </>
  );
};

export default SpectatorAuction;
