import { useEffect, useState } from "react";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Box,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Stack,
  Paper,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { uid } from "uid";
import { useAuth } from "../context/AuthContext";

const roles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

export default function AuctionManagement() {
  const [auctions, setAuctions] = useState([]);
  const [showAuction, setShowAuction] = useState(false);
  const [auctionName, setAuctionName] = useState("");
  const [budget, setBudget] = useState("");
  const [teamsList, setTeamsList] = useState("");

  const { user } = useAuth();
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [playerRole, setPlayerRole] = useState("");
  const [playerBasePrice, setPlayerBasePrice] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [openTeamsDialog, setOpenTeamsDialog] = useState(false);

  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const viewPlayers = (players) => {
    setSelectedPlayers(players);
    setModalOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const handleAddPlayer = () => {
    console.log({ playerName, playerRole, playerBasePrice });
    addPlayer();
    // You can call addPlayer() function here
    handleClose(); // Close the dialog after adding the player
  };

  const navigate = useNavigate();

  useEffect(() => {
    const getTournaments = async () => {
      try {
        const res = await api.get("/tournament");
        let tournaments = res.data;

        // Extract all tournamentIds
        const tournamentIds = tournaments.map((tournament) => tournament.id);

        // Fetch players and teams for each tournament
        const playerRequests = tournamentIds.map((tournamentId) =>
          api.get(`/players?tournamentId=${tournamentId}`)
        );
        const teamRequests = tournamentIds.map((tournamentId) =>
          api.get(`/teams?tournamentId=${tournamentId}`)
        );

        // Wait for all requests to complete
        const [playersResponses, teamsResponses] = await Promise.all([
          Promise.all(playerRequests),
          Promise.all(teamRequests),
        ]);

        // Convert responses into usable data
        const playersData = playersResponses.map((res) => res.data);
        const teamsData = teamsResponses.map((res) => res.data);

        // Merge players and teams into tournaments
        const updatedTournaments = tournaments.map((tournament, index) => ({
          ...tournament,
          players: playersData[index] || [], // Attach players
          teams: teamsData[index] || [], // Attach teams
        }));

        // Update state
        console.log(updatedTournaments);
        setAuctions(updatedTournaments);

        console.log(
          "Updated Tournaments with Players & Teams:",
          updatedTournaments
        );
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      }
    };

    getTournaments();
  }, []);

  const createAuction = async () => {
    const auctionId = uid();

    const updatedPlayers = players.map((player) => ({
      ...player,
      tournamentId: auctionId,
    }));

    const newAuction = {
      id: auctionId,
      name: auctionName,
      budget: budget,
      createdBy: user.id,
      teams: selectedTeams,
      players: updatedPlayers, // Use the updated players array
    };

    const res = await api.post("/tournament/create", newAuction);
    console.log(newAuction);
    const teamObjects = newAuction.teams.map((name) => ({ name }));
    const updatedAuction = { ...newAuction, teams: teamObjects };
    console.log(updatedAuction);
    setAuctions([...auctions, updatedAuction]);

    console.log([...auctions, newAuction], "auction data");
    setAuctionName("");
    setSelectedTeams([]);
  };
  const createNewAuction = async () => {
    const res = await api.get("/teams");
    console.log(res.data);
    setTeamsList(res.data);
    setShowAuction(!showAuction);
  };
  const addPlayerByAuctionId = (auctionId) => {
    console.log("check", auctionId);
    setSelectedAuctionId(auctionId);
    setOpen(true);
  };
  const addPlayer = async () => {
    if (!playerName || !playerRole || !playerBasePrice) {
      alert("Please fill all player details.");
      return;
    }

    const newPlayer = {
      id: uid(),
      name: playerName,
      role: playerRole,
      basePrice: playerBasePrice,
      soldPrice: null,
      isSold: false,
      teamId: null,
    };

    if (selectedAuctionId) {
      // Update auctions state by adding the player to the correct auction
      try {
        newPlayer.tournamentId = selectedAuctionId;
        await api.post("/players", newPlayer);

        setAuctions((prevAuctions) =>
          prevAuctions.map((auction) =>
            auction.id === selectedAuctionId
              ? { ...auction, players: [...(auction.players || []), newPlayer] }
              : auction
          )
        );
      } catch (e) {
        console.log(e);
      }
    } else {
      setPlayers([...players, newPlayer]);
    }

    // Clear input fields
    setPlayerName("");
    setPlayerRole("");
    setPlayerBasePrice("");
  };

  const startAuction = async (id) => {
    await api.patch(`/tournament/${id}/status`, { status: "live" });
    navigate(`/start-live-auction?id=${id}`);
  };

  return (
    <Container>
      {/* Active Auctions List */}
      <Typography variant="h6">Active Auctions</Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Name</strong>
            </TableCell>
            <TableCell>
              <strong>Budget</strong>
            </TableCell>
            <TableCell>
              <strong>Teams</strong>
            </TableCell>
            <TableCell>
              <strong>Players</strong>
            </TableCell>
            <TableCell>
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {auctions.map((auction) => (
            <TableRow key={auction.id} hover>
              <TableCell>
                <Typography fontWeight="500">{auction.name}</Typography>
              </TableCell>

              <TableCell>
                <Chip
                  label={`₹${auction.budget}`}
                  color="success"
                  variant="outlined"
                />
              </TableCell>

              <TableCell>
                {auction?.teams?.length > 3 ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      {auction.teams
                        .slice(0, 2)
                        .map((team) => team.name)
                        .join(", ")}{" "}
                      +{auction.teams.length - 2} more
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setOpenTeamsDialog(true)}
                    >
                      View All
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body2">
                    {auction.teams.map((team) => team.name).join(", ")}
                  </Typography>
                )}
              </TableCell>

              <TableCell>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    🏏 <strong>Batsmen</strong>:{" "}
                    {
                      auction?.players?.filter((p) => p.role === "Batsman")
                        .length
                    }
                  </Typography>
                  <Typography variant="body2">
                    ⚾ <strong>Bowlers</strong>:{" "}
                    {
                      auction?.players?.filter((p) => p.role === "Bowler")
                        .length
                    }
                  </Typography>
                  <Typography variant="body2">
                    🔄 <strong>All-rounders</strong>:{" "}
                    {
                      auction?.players?.filter((p) => p.role === "All-rounder")
                        .length
                    }
                  </Typography>
                  <Typography variant="body2">
                    🧤 <strong>Wicketkeepers</strong>:{" "}
                    {
                      auction?.players?.filter((p) => p.role === "Wicketkeeper")
                        .length
                    }
                  </Typography>
                </Stack>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => viewPlayers(auction.players)}
                  sx={{ mt: 1 }}
                >
                  View Players
                </Button>
              </TableCell>

              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => startAuction(auction.id)}
                  >
                    Start
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => addPlayerByAuctionId(auction.id)}
                  >
                    Add Player
                  </Button>
                </Stack>
              </TableCell>

              {/* Teams Dialog */}
              <Dialog
                open={openTeamsDialog}
                onClose={() => setOpenTeamsDialog(false)}
                fullWidth
                maxWidth="sm"
              >
                <DialogTitle>All Teams</DialogTitle>
                <DialogContent dividers>
                  <List>
                    {auction.teams.map((team) => (
                      <ListItem key={team.id}>{team.name}</ListItem>
                    ))}
                  </List>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                      onClick={() => setOpenTeamsDialog(false)}
                      variant="contained"
                      color="primary"
                    >
                      Close
                    </Button>
                  </Box>
                </DialogContent>
              </Dialog>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <>
        <Box mb={2}>
          <Button variant="contained" color="error" onClick={createNewAuction}>
            Create New Auction
          </Button>
        </Box>

        {showAuction && (
          <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              New Auction Details
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Auction Name"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                fullWidth
              />

              <TextField
                label="Budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                fullWidth
              />

              <Autocomplete
                multiple
                options={teamsList?.map((team) => team?.name)}
                value={selectedTeams}
                onChange={(event, newValue) => setSelectedTeams(newValue)}
                disableCloseOnSelect
                getOptionLabel={(option) => option}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                    {option}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Teams"
                    placeholder="Teams"
                  />
                )}
              />

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={() => setOpen(true)}>
                  Add Player
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={createAuction}
                >
                  Create Auction
                </Button>
              </Stack>
            </Stack>

            {/* Players List */}
            {players.length > 0 && (
              <Box mt={4}>
                <Typography variant="h6" gutterBottom>
                  Players List
                </Typography>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Role</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Base Price</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id} hover>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>{player.role}</TableCell>
                        <TableCell>₹{player.basePrice}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        )}
      </>

      {/* Dialog for player details */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Player</DialogTitle>
        <DialogContent>
          <TextField
            label="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={playerRole}
              onChange={(e) => setPlayerRole(e.target.value)}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Base Price"
            type="number"
            value={playerBasePrice}
            onChange={(e) => setPlayerBasePrice(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddPlayer} color="primary">
            Add Player
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Players in Auction</DialogTitle>
        <DialogContent>
          <List>
            {selectedPlayers.map((player) => (
              <ListItem key={player.id}>
                <ListItemText
                  primary={`${player.name} (${player.role})`}
                  secondary={`Base Price: ₹${player.basePrice} `}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <Button onClick={() => setModalOpen(false)} color="primary">
          Close
        </Button>
      </Dialog>
    </Container>
  );
}
