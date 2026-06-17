import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { LoadingStateCard } from "../components/ProductState";

const MainFestivalAuction = lazy(
  () => import("../components/MainFestivalAuction")
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
      <MainFestivalAuction festivalId={festivalId} />
    </Suspense>
  );
}
