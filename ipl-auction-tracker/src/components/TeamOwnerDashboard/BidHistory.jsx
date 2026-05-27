import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";

const formatAmount = (amount) =>
  amount
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(amount))
    : "-";

const BidHistory = ({ tournamentId: providedTournamentId }) => {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const tournamentId = providedTournamentId ?? searchParams.get("id");

  useEffect(() => {
    let active = true;

    const getData = async () => {
      if (!tournamentId) {
        if (active) {
          setError("Select a tournament to view its bid history.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get(`/players/playerBids/${tournamentId}`);
        if (active) setPlayers(response.data || []);
      } catch (requestError) {
        if (!active) return;
        if (requestError.response?.status === 404) {
          setPlayers([]);
          return;
        }
        setError("Unable to load auction history.");
      } finally {
        if (active) setLoading(false);
      }
    };

    getData();

    return () => {
      active = false;
    };
  }, [tournamentId]);

  const auctionedPlayers = useMemo(
    () => players.filter((player) => player.auctionId),
    [players]
  );

  const filteredPlayers = useMemo(
    () =>
      auctionedPlayers.filter((player) => {
        if (filter === "Sold") return player.isSold;
        if (filter === "Unsold") return !player.isSold;
        return true;
      }),
    [auctionedPlayers, filter]
  );

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5">Bid History</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Review player outcomes and every bid submitted for this tournament.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!error && (
        <>
          <Select
            size="small"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            sx={{ mb: 2.5, minWidth: 180 }}
          >
            <MenuItem value="All">All Players</MenuItem>
            <MenuItem value="Sold">Sold</MenuItem>
            <MenuItem value="Unsold">Unsold</MenuItem>
          </Select>

          <Card variant="outlined">
            {filteredPlayers.length ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Final Price</TableCell>
                    <TableCell>Winning Team</TableCell>
                    <TableCell align="right">Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{player.name}</TableCell>
                      <TableCell>{player.role}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={player.isSold ? "success" : "default"}
                          label={player.isSold ? "Sold" : "Unsold"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatAmount(player.soldPrice)}
                      </TableCell>
                      <TableCell>
                        {player.isSold ? player.bids[0]?.teamName || "-" : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <Button onClick={() => setSelectedPlayer(player)}>
                          View Bids
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography variant="h6">No player results yet</Typography>
                <Typography color="text.secondary">
                  Completed player bidding rounds will appear here.
                </Typography>
              </Box>
            )}
          </Card>
        </>
      )}

      <Dialog
        open={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Bid History - {selectedPlayer?.name}</DialogTitle>
        <DialogContent dividers>
          {selectedPlayer?.bids.length ? (
            <List disablePadding>
              {selectedPlayer.bids.map((bid) => (
                <ListItem key={bid.id} disableGutters divider>
                  <ListItemText
                    primary={bid.teamName}
                    secondary={formatAmount(bid.bidAmount)}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No bids were placed.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BidHistory;
