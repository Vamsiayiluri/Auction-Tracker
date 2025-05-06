import { useState } from "react";
import { Container, Typography, Divider } from "@mui/material";
import OngoingAuctions from "./OngoingAuctions";
import PlayerBidding from "./PlayerBidding";
import BidHistory from "./TeamOwnerDashboard/BidHistory";

export default function BidderDashboard() {
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bids, setBids] = useState([]);

  const handleBid = (amount) => {
    setBids([...bids, { bidder: "You", amount }]);
  };

  return (
    <Container>
      <Typography variant="h4">Bidder Dashboard</Typography>
      <Divider sx={{ my: 2 }} />

      {!selectedAuction ? (
        <OngoingAuctions onJoinAuction={setSelectedAuction} />
      ) : (
        <>
          <PlayerBidding auction={selectedAuction} onBid={handleBid} />
          <BidHistory bids={bids} />
        </>
      )}
    </Container>
  );
}
