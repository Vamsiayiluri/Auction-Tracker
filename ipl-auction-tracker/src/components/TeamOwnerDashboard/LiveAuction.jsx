import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import VisualTimer from "../VisualTimer";
import { socket } from "../../webSocket/socket";
import api from "../../utils/api";
import { getNextBidAmount } from "../../utils/bidUtils";
import { useAuth } from "../../context/AuthContext";
import { uid } from "uid";

const LiveAuction = ({ userRole = "spectator" }) => {
  console.log(userRole, "userRole");
  const [timeLeft, setTimeLeft] = useState(60);
  const [highestBid, setHighestBid] = useState(null);
  const [highestBidder, setHighestBidder] = useState("");
  const [bidHistory, setBidHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [auctionCompleted, setAuctionCompleted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    socket.on("new-bid", ({ id, bidAmount, teamId, teamName, ownerId }) => {
      setHighestBid(bidAmount);
      setHighestBidder(teamName);

      setBidHistory((prev) => {
        const alreadyExists = prev.some((bid) => bid.id === id);
        if (alreadyExists) return prev;

        return [
          { id, bidAmount, teamId, ownerId, teamName, timestamp: new Date() },
          ...prev,
        ];
      });
    });
    const fetchCurrentPlayer = async () => {
      try {
        const res = await api.get("/auction/currentPlayer");

        const player = res.data.player;
        const bids = res.data.bids;

        setCurrentPlayer(player);
        setHighestBid(bids.length ? bids[0].bidAmount : player.basePrice);
        setHighestBidder(bids.length ? bids[0].teamName : "");
        if (bids.length) setBidHistory(bids);
        setTimeLeft(60);
      } catch (err) {
        console.log("No current auction:", err);
      }
    };

    fetchCurrentPlayer();
    socket.on("auction-started", (player) => {
      console.log("Auction started for:", player);
      setAuctionCompleted(false);
      setCurrentPlayer(player);
      setHighestBid(player.basePrice);
      setHighestBidder("");
      setBidHistory([]);
      setTimeLeft(60);
    });
    socket.on("auction-finalized", (data) => {
      console.log("Auction finalized:", data);
      alert(
        `${data.playerName} has been sold to ${data.soldToTeamName} for ₹${(
          data.finalPrice / 100000
        ).toFixed(2)} Lakhs`
      );
      setAuctionCompleted(true);
    });
    return () => {
      socket.off("auction-started");
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);
  useEffect(() => {
    const fetchCurrentTeam = async () => {
      try {
        console.log(user, "data");
        const res = await api.get(`/teams/getTeamByid/${user.id}`);

        setCurrentTeam(res.data.team);
        console.log(res.data);
      } catch (err) {
        console.log("No current auction:", err);
      }
    };
    fetchCurrentTeam();
  }, [user]);
  const isBidDisabled = () => {
    if (highestBidder === currentTeam.name) return true;

    return false;
  };
  const handleBid = () => {
    const amount = getNextBidAmount(highestBid);
    console.log(currentTeam, "current team");
    const newBid = {
      id: uid(),
      playerId: currentPlayer.id,
      teamId: currentTeam.id,
      ownerId: currentTeam.ownerId,
      teamName: currentTeam.name,
      bidAmount: amount,
    };
    console.log(newBid);
    socket.emit("place-bid", newBid);

    setHighestBid(amount);
    setHighestBidder(newBid.teamName);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🏏 Live Auction
      </Typography>

      {/* Player Info */}
      {currentPlayer ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">Player: {currentPlayer.name}</Typography>
            <Typography>Role: {currentPlayer.role}</Typography>
            <Typography>
              Base Price: ₹{currentPlayer.basePrice.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Waiting for auction to start...
        </Typography>
      )}

      {currentPlayer && (
        <Grid container spacing={4}>
          {/* Timer and Highest Bid Info */}
          {!auctionCompleted ? (
            <Grid item xs={12} md={auctionCompleted ? 12 : 6}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: 3,
                  backgroundColor: "#f5f5f5",
                }}
              >
                {/* Time Left Section */}
                <Box mb={2}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Time Left:
                  </Typography>
                  <Typography
                    variant="h4"
                    color={timeLeft > 10 ? "success.main" : "error.main"}
                    fontWeight="bold"
                  >
                    <VisualTimer timeLeft={timeLeft} />
                  </Typography>
                </Box>

                {/* Current Highest Bid Section */}
                <Box mb={2}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Current Highest Bid:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={highestBid ? "primary.main" : "text.secondary"}
                  >
                    ₹{highestBid ?? "0"}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    By:{" "}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={highestBid ? "primary.main" : "text.secondary"}
                  >
                    {highestBidder || "No bids yet"}
                  </Typography>
                </Box>

                {/* Next bid amount */}
                <Box mb={2}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Next bid amount:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    ₹{getNextBidAmount(highestBid)}
                  </Typography>
                </Box>

                {/* Place Bid Button */}
                {userRole === "team_owner" && (
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleBid}
                      disabled={isBidDisabled()}
                    >
                      Place Bid
                    </Button>
                  </Box>
                )}
              </Card>
            </Grid>
          ) : (
            <Box
              sx={{
                width: "80%",
                margin: "0 auto",
              }}
            >
              <Card
                sx={{
                  p: 3,
                  m: 4,
                  borderRadius: 3,
                  boxShadow: 3,
                  backgroundColor: "#fff",
                  overflowY: "auto",
                }}
              >
                <Typography
                  sx={{
                    textAlign: "center",
                    marginTop: "16px",
                  }}
                  variant="h6"
                >
                  {` ${
                    currentPlayer.name
                  } has been sold to ${highestBidder} for ₹${(
                    highestBid / 100000
                  ).toFixed(2)} Lakhs`}
                </Typography>
              </Card>
            </Box>
          )}
          {/* Bid History */}
          <Grid item xs={12} md={auctionCompleted ? 12 : 6}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: 3,
                backgroundColor: "#fff",
                maxHeight: "400px",
                overflowY: "auto",
                margin: "0 auto",
              }}
            >
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Bid History
              </Typography>

              <List dense>
                {bidHistory.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No bids yet." />
                  </ListItem>
                ) : (
                  bidHistory.map((bid, index) => (
                    <React.Fragment key={index}>
                      <ListItem alignItems="flex-start">
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
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default LiveAuction;
