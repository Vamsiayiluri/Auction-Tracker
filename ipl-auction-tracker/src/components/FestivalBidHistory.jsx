import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../utils/api";

const formatMoney = (value) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
      }).format(Number(value));

export default function FestivalBidHistory({
  festivalId,
  ownerView = false,
}) {
  const [auctions, setAuctions] = useState([]);
  const [ownerTeamId, setOwnerTeamId] = useState(null);
  const [filter, setFilter] = useState(ownerView ? "Own Bids" : "All");
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/v2/festivals/${festivalId}/auction/history`),
      ownerView
        ? api.get(`/v2/festivals/${festivalId}/auction/current`)
        : null,
    ])
      .then(([historyResponse, currentResponse]) => {
        if (!active) return;
        setAuctions(historyResponse.data.data || []);
        setOwnerTeamId(
          currentResponse?.data?.data?.viewer?.festivalTeamId || null
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load Festival bid history."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [festivalId, ownerView]);

  const auctionedPlayers = useMemo(
    () =>
      auctions.filter((auction) => {
        if (!ownerView) return true;
        const ownBid = auction.bids?.some(
          ({ festivalTeamId }) => festivalTeamId === ownerTeamId
        );
        const won = auction.result?.festivalTeamId === ownerTeamId;
        if (filter === "Won Bids") return won;
        if (filter === "Lost Bids") return ownBid && !won;
        return ownBid;
      }),
    [auctions, filter, ownerTeamId, ownerView]
  );

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Bid History
        </Typography>
        <Typography color="text.secondary">
          {ownerView
            ? "Review your bids and separate won and lost participant rounds."
            : "Review auctioned participants and open the complete bid sequence."}
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {ownerView && (
        <FormControl size="small" sx={{ width: { xs: "100%", sm: 220 } }}>
          <InputLabel>Bid Outcome</InputLabel>
          <Select
            label="Bid Outcome"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <MenuItem value="Own Bids">Own Bids</MenuItem>
            <MenuItem value="Won Bids">Won Bids</MenuItem>
            <MenuItem value="Lost Bids">Lost Bids</MenuItem>
          </Select>
        </FormControl>
      )}

      <Card variant="outlined">
        {auctionedPlayers.length ? (
          <TableContainer>
            <Table sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Auctioned Player</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Sold Price</TableCell>
                  <TableCell>Sold Team</TableCell>
                  <TableCell align="right">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auctionedPlayers.map((auction) => (
                  <TableRow key={auction.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {auction.participant?.employee?.name || "Participant"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={
                          auction.result?.outcome === "sold"
                            ? "success"
                            : "default"
                        }
                        label={auction.result?.outcome || auction.status}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(auction.result?.finalAmount)}
                    </TableCell>
                    <TableCell>
                      {auction.result?.teamName || "-"}
                    </TableCell>
                    <TableCell align="right">
                      <Button onClick={() => setSelectedAuction(auction)}>
                        View Bids
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6">No auctioned players found</Typography>
            <Typography color="text.secondary">
              Completed and active participant rounds will appear here.
            </Typography>
          </Box>
        )}
      </Card>

      <Dialog
        open={Boolean(selectedAuction)}
        onClose={() => setSelectedAuction(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Bid History - {selectedAuction?.participant?.employee?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip
              label={`Base Price ${formatMoney(selectedAuction?.basePrice)}`}
            />
            <Chip
              label={`Sold Price ${formatMoney(
                selectedAuction?.result?.finalAmount
              )}`}
            />
            <Chip
              label={`Sold Team ${
                selectedAuction?.result?.teamName || "-"
              }`}
            />
          </Stack>
          {selectedAuction?.bids?.length ? (
            <List disablePadding>
              {selectedAuction.bids.map((bid) => (
                <ListItem key={bid.id} disableGutters divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700}>
                          {bid.bidNumber}. {bid.teamName}
                        </Typography>
                        {ownerView &&
                          bid.festivalTeamId === ownerTeamId && (
                            <Chip size="small" color="primary" label="Your Bid" />
                          )}
                      </Stack>
                    }
                    secondary={new Date(bid.placedAt).toLocaleString()}
                  />
                  <Typography fontWeight={800}>
                    {formatMoney(bid.amount)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No bids were placed. Base price:{" "}
              {formatMoney(selectedAuction?.basePrice)}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
