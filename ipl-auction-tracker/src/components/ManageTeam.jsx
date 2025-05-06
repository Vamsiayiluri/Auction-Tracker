import { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Typography,
  Container,
} from "@mui/material";

export default function ManageTeam({ team }) {
  const [players, setPlayers] = useState(team?.players || []);
  const [newPlayer, setNewPlayer] = useState("");

  const addPlayer = () => {
    if (newPlayer.trim()) {
      setPlayers([...players, newPlayer]);
      setNewPlayer("");
    }
  };

  return (
    <Container>
      <Typography variant="h6">
        Manage Team - {team?.name || "No Team Selected"}
      </Typography>

      <TextField
        label="Player Name"
        value={newPlayer}
        onChange={(e) => setNewPlayer(e.target.value)}
        fullWidth
      />
      <Button variant="contained" color="primary" onClick={addPlayer}>
        Add Player
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Player Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((player, index) => (
            <TableRow key={index}>
              <TableCell>{player}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
