import { useParams } from "react-router-dom";
import MainFestivalAuction from "../components/MainFestivalAuction";
import RouteBoundary from "../components/RouteBoundary";

export default function FestivalLiveAuctionPage() {
  const { festivalId } = useParams();

  return (
    <RouteBoundary name="Festival Live Auction Workspace">
      <MainFestivalAuction festivalId={festivalId} />
    </RouteBoundary>
  );
}
