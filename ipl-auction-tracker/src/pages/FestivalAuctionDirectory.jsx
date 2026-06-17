import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { LoadingStateCard } from "../components/ProductState";
import { useAuth } from "../context/auth-context";
import {
  AUCTION_STAGE,
  getFestivalAuctionStageFromState,
  getStageLabel,
} from "../utils/auctionStages";

const getFestivalActions = (festival, stage) => {
  if (stage === AUCTION_STAGE.SETUP) {
    return {
      primaryLabel: "Continue Setup",
      primaryRoute: `/festivals/${festival.id}/manage`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/festivals/${festival.id}/auction-hub`,
    };
  }
  if (stage === AUCTION_STAGE.READY) {
    return {
      primaryLabel: "View Auction Details",
      primaryRoute: `/festivals/${festival.id}/auction-hub`,
      secondaryLabel: "Open Live Auction",
      secondaryRoute: `/auctions/festivals/${festival.id}`,
    };
  }
  if (stage === AUCTION_STAGE.LIVE) {
    return {
      primaryLabel: "Open Live Auction",
      primaryRoute: `/auctions/festivals/${festival.id}`,
      secondaryLabel: "View Auction Details",
      secondaryRoute: `/festivals/${festival.id}/auction-hub`,
    };
  }
  return {
    primaryLabel: "View Results",
    primaryRoute: `/festivals/${festival.id}/results`,
    secondaryLabel: "View Auction Details",
    secondaryRoute: `/festivals/${festival.id}/auction-hub`,
  };
};

export default function FestivalAuctionDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [festivals, setFestivals] = useState([]);
  const [festivalStageData, setFestivalStageData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/v2/festivals")
      .then(async (response) => {
        const nextFestivals = response.data.data || [];
        const stageResults = await Promise.allSettled(
          nextFestivals.map(async (festival) => {
            const [currentResult, readinessResult] = await Promise.allSettled([
              api.get(`/v2/festivals/${festival.id}/auction/current`),
              user?.role === "admin"
                ? api.get(`/v2/festivals/${festival.id}/auction/readiness`)
                : Promise.resolve({ data: { data: null } }),
            ]);
            return {
              festivalId: festival.id,
              auction:
                currentResult.status === "fulfilled"
                  ? currentResult.value.data.data
                  : null,
              readiness:
                readinessResult.status === "fulfilled"
                  ? readinessResult.value.data.data
                  : null,
            };
          })
        );
        if (!active) return;
        setFestivals(nextFestivals);
        setFestivalStageData(
          Object.fromEntries(
            stageResults
              .filter(({ status }) => status === "fulfilled")
              .map(({ value }) => [value.festivalId, value])
          )
        );
      })
      .catch(() => {
        if (active) setError("Unable to load festival auctions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  if (loading) {
    return (
      <LoadingStateCard
        title="Loading Festival Auctions"
        message="Finding setup, ready, live, and completed Festival auctions."
      />
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {festivals.map((festival) => {
        const stageData = festivalStageData[festival.id] || {};
        const stage = getFestivalAuctionStageFromState({
          festival,
          auction: stageData.auction,
          readiness: stageData.readiness,
        });
        const actions = getFestivalActions(festival, stage);
        return (
          <Card key={festival.id} variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                spacing={2}
              >
                <div>
                  <Typography variant="h6">{festival.name}</Typography>
                  <Typography color="text.secondary">
                    {festival.code} | {festival.startDate} to {festival.endDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getStageLabel(stage)}
                  </Typography>
                </div>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() => navigate(actions.primaryRoute)}
                  >
                    {actions.primaryLabel}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(actions.secondaryRoute)}
                  >
                    {actions.secondaryLabel}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
      {!festivals.length && !error && (
        <Typography color="text.secondary">
          No festivals are currently available.
        </Typography>
      )}
    </Stack>
  );
}
