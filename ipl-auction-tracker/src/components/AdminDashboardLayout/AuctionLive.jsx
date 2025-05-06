import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Divider,
  Stack,
  Grid2,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";
import { socket } from "../../webSocket/socket";
import { uid } from "uid";

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [players, setPlayers] = useState([]);
  const [tournamenet, setTournament] = useState();
  const [teams, setTeams] = useState();

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [auctionStarted, setAuctionStarted] = useState(false);
  const [highestBid, setHighestBid] = useState(0);
  const [auctionHistory, setAuctionHistory] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [highestBidder, setHighestBidder] = useState("");
  const [bidHistory, setBidHistory] = useState([]);
  const [stage, setStage] = useState("playerSelection");

  const roles = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

  useEffect(() => {
    socket.on("new-bid", ({ id, bidAmount, teamId, teamName, ownerId }) => {
      setHighestBid(bidAmount);
      setHighestBidder(teamName);
      console.log(id, "id");
      setBidHistory((prev) => {
        const alreadyExists = prev.some((bid) => bid.id === id);
        if (alreadyExists) return prev;

        return [
          { id, bidAmount, teamId, ownerId, teamName, timestamp: new Date() },
          ...prev,
        ];
      });
    });

    const getData = async () => {
      try {
        const [tRes, pRes, teamRes] = await Promise.all([
          api.get(`/tournament/${id}`),
          api.get(`/players?tournamentId=${id}`),
          api.get(`/teams?tournamentId=${id}`),
        ]);
        setTournament(tRes.data);
        setPlayers(pRes.data);
        setTeams(teamRes);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const fetchCurrentPlayer = async () => {
      try {
        const res = await api.get("/auction/currentPlayer");
        console.log(res.data, "res.data");
        const player = res.data.player;
        const bids = res.data.bids;

        setCurrentPlayer(player);
        setHighestBid(bids.length ? bids[0].bidAmount : player.basePrice);
        if (bids.length) {
          setHighestBidder(bids[0].teamName);
          setBidHistory(bids);
        }
        console.log(player, "check");
        if (player.id) setStage("auctionControl");
      } catch (err) {
        console.log("No current auction:", err);
      }
    };

    getData();
    fetchCurrentPlayer();
    return () => socket.off("new-bid");
  }, []);

  const filteredPlayers = players?.filter(
    (player) => player.role === selectedRole
  );

  const startAuction = async (player) => {
    player.auctionId = uid();
    await api.post(`/auction/start/${player.id}`, player);
    setCurrentPlayer(player);
    setAuctionStarted(true);
    setHighestBid(player.basePrice);
    setStage("auctionControl");
  };

  const finalizeAuction = async (player) => {
    await api.post(`/auction/stop/${player.id}`, player);
    if (!currentPlayer) return;
    setAuctionHistory([
      ...auctionHistory,
      { ...currentPlayer, soldPrice: highestBid, teamName: highestBidder },
    ]);
    setCurrentPlayer(null);
    setAuctionStarted(false);
    setHighestBid(0);
    setStage("auctionHistory");
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "0 auto",
        mx: "auto",
      }}
    >
      {stage === "playerSelection" && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Player for Auction
          </Typography>

          <Stack spacing={3} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Select Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setSelectedPlayer(null);
                }}
              >
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedRole}>
              <InputLabel>Select Player</InputLabel>
              <Select
                value={selectedPlayer?.id || ""}
                onChange={(e) => {
                  const player = players.find((p) => p.id === e.target.value);
                  setSelectedPlayer(player);
                }}
              >
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => (
                    <MenuItem key={player.id} value={player.id}>
                      {player.name} (₹{player.basePrice})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No players available</MenuItem>
                )}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="large"
              onClick={() => startAuction(selectedPlayer)}
              disabled={!selectedPlayer || auctionStarted}
            >
              Start Auction
            </Button>
          </Stack>
        </Card>
      )}

      {stage === "auctionControl" && (
        <Grid2 container spacing={2} xs={12}>
          <Card xs={6} sx={{ p: 3, m: 4 }}>
            <Typography variant="h6" gutterBottom>
              Auction In Progress
            </Typography>
            {currentPlayer ? (
              <>
                <Typography variant="subtitle1">
                  Player: <strong>{currentPlayer.name}</strong>
                </Typography>
                <Typography color="text.secondary">
                  Role: {currentPlayer.role}
                </Typography>
                <Typography sx={{ mt: 2 }}>
                  Base Price: ₹{currentPlayer.basePrice}
                </Typography>
                <Typography sx={{ mt: 1 }} fontWeight={600}>
                  Highest Bid:{" "}
                  {highestBid === currentPlayer.basePrice
                    ? "--"
                    : `₹${highestBid} by ${highestBidder}`}
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ mt: 3 }}
                  onClick={() => finalizeAuction(currentPlayer)}
                >
                  Finalize Auction
                </Button>
              </>
            ) : (
              <Typography>No active player in auction.</Typography>
            )}
          </Card>

          <Card xs={6} sx={{ p: 3, mt: 3, backgroundColor: "#f9f9f9" }}>
            <Typography variant="h6" gutterBottom>
              Bid History
            </Typography>
            <List dense>
              {bidHistory.length === 0 ? (
                <Typography>No bids yet.</Typography>
              ) : (
                bidHistory.map((bid, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={`₹${bid.bidAmount} by ${bid.teamName}`}
                      />
                    </ListItem>
                    {index < bidHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Card>
        </Grid2>
      )}

      {stage === "auctionHistory" && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Auction History
          </Typography>
          <List>
            {auctionHistory.length === 0 ? (
              <Typography>No players sold yet.</Typography>
            ) : (
              auctionHistory.map((item, index) => (
                <ListItem key={index} divider>
                  {console.log(item)}
                  <ListItemText
                    primary={`${item.name} - ₹${item.soldPrice}-to ${item.teamName}`}
                  />
                </ListItem>
              ))
            )}
          </List>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => setStage("playerSelection")}
          >
            Back to Player Selection
          </Button>
        </Card>
      )}
    </Box>
  );
};

export default AdminDashboard;
