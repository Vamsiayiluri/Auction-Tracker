import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";

const mockPlayers = [
  {
    id: 1,
    name: "Virat Kohli",
    role: "Batsman",
    status: "Sold",
    finalPrice: 800000,
    winningTeam: "RCB",
    bidHistory: [
      { bidder: "MI", amount: 500000 },
      { bidder: "CSK", amount: 700000 },
      { bidder: "RCB", amount: 800000 },
    ],
  },
  {
    id: 2,
    name: "MS Dhoni",
    role: "Wicket Keeper",
    status: "Unsold",
    finalPrice: 0,
    winningTeam: null,
    bidHistory: [],
  },
];

const BidHistory = () => {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("All");
  const [openModal, setOpenModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [teams, setTeams] = useState();
  useEffect(() => {
    const getData = async () => {
      try {
        const pRes = await api.get(`/players/playerBids/${id}`);

        setPlayers(pRes.data);
        console.log(pRes.data, "data");
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    getData();
    // setPlayers(mockPlayers);
  }, []);

  const handleOpenModal = (player) => {
    setSelectedPlayer(player);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setSelectedPlayer(null);
    setOpenModal(false);
  };

  const filteredPlayers = players.filter((player) => {
    if (filter === "All") return true;
    else if (filter === "Sold") return player.isSold;
    else if (filter === "Unsold") return !player.isSold;
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        📋 Bid History
      </Typography>

      <Select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="All">All Players</MenuItem>
        <MenuItem value="Sold">Sold</MenuItem>
        <MenuItem value="Unsold">Unsold</MenuItem>
      </Select>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Player Name</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Final Price</TableCell>
            <TableCell>Winning Team</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPlayers
            .filter((player) => player.auctionId)
            .map((player) => (
              <TableRow key={player.id}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.role}</TableCell>
                <TableCell>{player.isSold ? "Sold" : "Unsold"}</TableCell>
                <TableCell>
                  ₹{player.soldPrice ? player.soldPrice : "—"}
                </TableCell>
                <TableCell>
                  {player.bids.length ? player.bids[0].teamName : "—"}
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleOpenModal(player)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bid History - {selectedPlayer?.name}</DialogTitle>
        <DialogContent>
          {selectedPlayer?.bids.length ? (
            <List>
              {selectedPlayer.bids.map((bid, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`₹${bid.bidAmount.toLocaleString()} - ${
                      bid.teamName
                    }`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No bids placed.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BidHistory;
