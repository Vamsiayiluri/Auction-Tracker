import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Container,
} from "@mui/material";

export default function Leaderboard({ bids }) {
  return (
    <Container>
      <Typography variant="h6">Leaderboard</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Bidder</TableCell>
            <TableCell>Bid Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bids
            .sort((a, b) => b.amount - a.amount)
            .map((bid, index) => (
              <TableRow key={index}>
                <TableCell>{bid.bidder}</TableCell>
                <TableCell>₹{bid.amount}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Container>
  );
}
