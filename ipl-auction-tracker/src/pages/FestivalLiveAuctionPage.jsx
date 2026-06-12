import { lazy, Suspense, useState } from "react";
import {
  Box,
  Card,
  CircularProgress,
  Tab,
  Tabs,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";

const MainFestivalAuction = lazy(
  () => import("../components/MainFestivalAuction")
);
const FestivalViewerOverview = lazy(
  () => import("../components/FestivalViewerOverview")
);
const FestivalTeamsDirectory = lazy(
  () => import("../components/FestivalTeamsDirectory")
);
const FestivalHistory = lazy(() => import("../components/FestivalHistory"));
const FestivalBidHistory = lazy(
  () => import("../components/FestivalBidHistory")
);

const ownerTabs = ["Overview", "My Team", "Auction", "Bid History"];
const spectatorTabs = [
  "Overview",
  "Live Auction",
  "Teams",
  "Results",
  "History",
];

export default function FestivalLiveAuctionPage() {
  const { festivalId } = useParams();
  const { user } = useAuth();
  const tabs = user?.role === "team_owner" ? ownerTabs : spectatorTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={`${user?.role || "viewer"} Festival workspace navigation`}
        >
          {tabs.map((tab) => (
            <Tab key={tab} value={tab} label={tab} />
          ))}
        </Tabs>
      </Card>

      <Suspense
        fallback={
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        }
      >
        {activeTab === "Overview" && (
          <FestivalViewerOverview
            festivalId={festivalId}
            ownerView={user?.role === "team_owner"}
          />
        )}
        {activeTab === "My Team" && (
          <FestivalTeamsDirectory festivalId={festivalId} ownerTeamOnly />
        )}
        {["Auction", "Live Auction"].includes(activeTab) && (
          <MainFestivalAuction festivalId={festivalId} showHistory={false} />
        )}
        {activeTab === "Teams" && (
          <FestivalTeamsDirectory festivalId={festivalId} />
        )}
        {activeTab === "Results" && (
          <FestivalHistory
            festivalId={festivalId}
            sections={["Auction Results"]}
          />
        )}
        {activeTab === "Bid History" && (
          <FestivalBidHistory festivalId={festivalId} ownerView />
        )}
        {activeTab === "History" && (
          <FestivalBidHistory
            festivalId={festivalId}
          />
        )}
      </Suspense>
    </Box>
  );
}
