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
import axios from "axios";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function AvailableAuctions() {
  const [auctions, setAuctions] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const getTournaments = async () => {
      try {
        const res = await api.get("/tournament");
        let tournaments = res.data;

        const tournamentIds = tournaments.map((tournament) => tournament.id);
        console.log(tournaments, "data");
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
    setAuctions([]);
  }, []);
  const onJoinAuction = async (id) => {
    console.log(user);
    debugger;
    if (user.role === "team_owner") {
      navigate(`/live-auction?id=${id}`);
    } else {
      navigate(`/spectator-live-auction?id=${id}`);
    }
  };

  return (
    <Container>
      <Typography variant="h6">Available Auctions</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>

            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {auctions.map((auction) => (
            <TableRow key={auction.id}>
              <TableCell>{auction.name}</TableCell>

              <TableCell>
                {auction.status === "live" && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onJoinAuction(auction.id)}
                  >
                    Join Auction
                  </Button>
                )}
                {auction.status === "upcoming" && (
                  <Button variant="contained" color="primary" disabled>
                    Not Yet Started
                  </Button>
                )}
                {auction.status === "completed" && (
                  <Button variant="contained" color="secondary" disabled>
                    Auction Ended
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
