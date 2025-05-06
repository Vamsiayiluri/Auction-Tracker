import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

const mockTeamPlayers = [
  { id: 1, name: "Jasprit Bumrah", role: "Bowler", price: 450000 },
  { id: 2, name: "Hardik Pandya", role: "All-Rounder", price: 600000 },
  { id: 3, name: "Shreyas Iyer", role: "Batsman", price: 300000 },
];

const MyTeam = () => {
  const [team, setTeam] = useState([]);
  const [players, setPlayers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    // In real app, fetch players using teamId
    const fetchCurrentTeam = async () => {
      try {
        console.log(user, "data");
        const res = await api.get(`/teams/getTeamAndPlayers/${user.id}`);
        setTeam(res.data.team);
        setPlayers(res.data.players);

        console.log(res.data);
      } catch (err) {
        console.log("No current auction:", err);
      }
    };
    fetchCurrentTeam();
  }, [user]);

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    let sortedPlayers = [...players];

    if (value === "role") {
      sortedPlayers.sort((a, b) => a.role.localeCompare(b.role));
    } else if (value === "price") {
      sortedPlayers.sort((a, b) => b.price - a.price);
    } else {
      sortedPlayers = mockTeamPlayers;
    }

    setPlayers(sortedPlayers);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🧢 My Team
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography>Total Budget: ₹{team.totalAmount}</Typography>
          <Typography>Total Spent: ₹{team.amountSpent}</Typography>
          <Typography>
            Remaining: ₹{team.totalAmount - team.amountSpent}
          </Typography>
        </CardContent>
      </Card>

      {/* <FormControl sx={{ mb: 2, minWidth: 200 }}>
        <InputLabel>Sort By</InputLabel>
        <Select value={sortBy} onChange={handleSortChange} label="Sort By">
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="role">Role</MenuItem>
          <MenuItem value="price">Price (High to Low)</MenuItem>
        </Select>
      </FormControl> */}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Player Name</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.length &&
            players?.map((player) => (
              <TableRow key={player.id}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.role}</TableCell>
                <TableCell>₹{player.soldPrice}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default MyTeam;
