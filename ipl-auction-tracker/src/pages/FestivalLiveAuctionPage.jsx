import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";

const MainFestivalAuction = lazy(
  () => import("../components/MainFestivalAuction")
);

export default function FestivalLiveAuctionPage() {
  const { festivalId } = useParams();

  return (
    <Suspense
      fallback={
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MainFestivalAuction festivalId={festivalId} />
    </Suspense>
  );
}
