import { lazy, Suspense } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import AuctionContextNavigation from "../components/AuctionContextNavigation";
import { LoadingStateCard } from "../components/ProductState";

const FestivalHistory = lazy(() => import("../components/FestivalHistory"));

export default function FestivalAuctionResultsPage() {
  const { festivalId } = useParams();

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Typography variant="h5" fontWeight={800}>Festival Auction Results</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Final assignments and completed auction outcomes.
          </Typography>
          <Box sx={{ mt: 1.25 }}>
            <AuctionContextNavigation
              hub={`/festivals/${festivalId}/auction-hub`}
              arena={`/auctions/festivals/${festivalId}`}
              results={`/festivals/${festivalId}/results`}
            />
          </Box>
        </CardContent>
      </Card>
      <Suspense
        fallback={
          <LoadingStateCard
            title="Loading Results"
            message="Preparing completed auction outcomes and team purchases."
          />
        }
      >
        <FestivalHistory
          festivalId={festivalId}
          sections={["Auction Results"]}
        />
      </Suspense>
    </Stack>
  );
}
