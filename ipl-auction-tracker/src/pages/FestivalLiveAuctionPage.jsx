import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { LoadingStateCard } from "../components/ProductState";
import RouteBoundary from "../components/RouteBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const MainFestivalAuction = lazyWithRetry(
  () => import("../components/MainFestivalAuction"),
  "MainFestivalAuction"
);

export default function FestivalLiveAuctionPage() {
  const { festivalId } = useParams();

  return (
    <Suspense
      fallback={
        <LoadingStateCard
          title="Loading Festival Auction"
          message="Preparing the live auction workspace."
        />
      }
    >
      <RouteBoundary name="Festival Live Auction Workspace">
        <MainFestivalAuction festivalId={festivalId} />
      </RouteBoundary>
    </Suspense>
  );
}
