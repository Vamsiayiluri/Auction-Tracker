import { useCallback, useEffect, useState } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import { LoadingStateCard, ProductStateCard } from "../components/ProductState";
import TeamExportButton from "../components/TeamExportButton";
import RouteBoundary from "../components/RouteBoundary";
import FestivalHistory from "../components/FestivalHistory";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";
import {
  getFestivalAuctionStage,
  isCompletedStage,
  isSetupStage,
} from "../utils/auctionStages";

export default function FestivalAuctionResultsPage() {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [auctionStatus, setAuctionStatus] = useState(null);
  const [festivalStatus, setFestivalStatus] = useState(null);
  const [festivalName, setFestivalName] = useState("");
  const [viewerCanExport, setViewerCanExport] = useState(false);
  const [stageLoading, setStageLoading] = useState(true);

  const loadStage = useCallback(async () => {
    try {
      const [auctionRes, festivalRes] = await Promise.allSettled([
        api.get(`/v2/festivals/${festivalId}/auction/current`),
        api.get(`/v2/festivals/${festivalId}`),
      ]);
      if (auctionRes.status === "fulfilled") {
        const auctionData = auctionRes.value.data.data;
        setAuctionStatus(auctionData?.config?.auctionStatus || "setup");
        setViewerCanExport(Boolean(auctionData?.viewer?.isOwner));
      }
      if (festivalRes.status === "fulfilled") {
        const festival = festivalRes.value.data.data;
        setFestivalStatus(festival?.status);
        setFestivalName(festival?.name || "");
      }
    } catch {
      // non-blocking — fall through and show results
    } finally {
      setStageLoading(false);
    }
  }, [festivalId]);

  useEffect(() => {
    loadStage();
  }, [loadStage]);

  const festivalStage = getFestivalAuctionStage({
    auctionStatus: auctionStatus || "setup",
    festivalStatus,
  });

  if (stageLoading) {
    return (
      <LoadingStateCard
        title="Loading Results"
        message="Preparing completed auction outcomes and team purchases."
      />
    );
  }

  if (isSetupStage(festivalStage)) {
    return (
      <ProductStateCard
        eyebrow="Festival Auction"
        title="No Results Yet"
        message="The Festival auction has not launched yet. Results and team purchases will appear here once the auction begins and participants are finalised."
        actionLabel="Browse Auctions"
        onAction={() => navigate("/auctions")}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Festival Auction Results</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Final assignments and completed auction outcomes.
              </Typography>
            </Box>
            <TeamExportButton
              endpoint={`/v2/festivals/${festivalId}/export/excel`}
              tournamentName={festivalName}
              allowed={
                (user?.role === "admin" || viewerCanExport) &&
                isCompletedStage(festivalStage)
              }
            />
          </Stack>
          <Box sx={{ mt: 1.25 }}>
            <AuctionContextNavigation
              hub={`/festivals/${festivalId}/auction-hub`}
              arena={`/auctions/festivals/${festivalId}`}
              results={`/festivals/${festivalId}/results`}
              stage={festivalStage}
              hasResults
            />
          </Box>
        </CardContent>
      </Card>
      <RouteBoundary name="Festival Results History">
        <FestivalHistory
          festivalId={festivalId}
          sections={["Auction Results"]}
        />
      </RouteBoundary>
    </Stack>
  );
}
