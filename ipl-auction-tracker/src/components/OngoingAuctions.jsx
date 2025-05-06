import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Typography,
  Container,
} from "@mui/material";

export default function OngoingAuctions({ onJoinAuction }) {
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    // Simulated API call (Replace this when backend is ready)
    setAuctions([
      { id: 1, name: "IPL 2025 Auction", status: "Live" },
      { id: 2, name: "T20 World Cup Auction", status: "Upcoming" },
    ]);
  }, []);

  return (
    <Container>
      <Typography variant="h6">Ongoing Auctions</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {auctions.map((auction) => (
            <TableRow key={auction.id}>
              <TableCell>{auction.name}</TableCell>
              <TableCell>{auction.status}</TableCell>
              <TableCell>
                {auction.status === "Live" ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onJoinAuction(auction)}
                  >
                    Join Auction
                  </Button>
                ) : (
                  "Not Started"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
