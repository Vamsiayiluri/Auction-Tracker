import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Container,
} from "@mui/material";

export default function PlayerBidding({ auction, onBid }) {
  const [bidAmount, setBidAmount] = useState("");
  const [currentBid, setCurrentBid] = useState(0);

  const placeBid = () => {
    if (parseInt(bidAmount) > currentBid) {
      setCurrentBid(parseInt(bidAmount));
      onBid(parseInt(bidAmount));
      setBidAmount("");
    }
  };

  return (
    <Container>
      <Typography variant="h6">Bidding for {auction.name}</Typography>
      <Card sx={{ my: 2 }}>
        <CardContent>
          <Typography variant="body1">Current Bid: ₹{currentBid}</Typography>
          <TextField
            label="Enter Bid Amount"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            color="primary"
            onClick={placeBid}
            sx={{ mt: 1 }}
          >
            Place Bid
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
