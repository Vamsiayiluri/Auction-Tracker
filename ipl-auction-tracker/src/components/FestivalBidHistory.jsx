import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { socket } from "../webSocket/socket";
import { shouldApplyAuctionSnapshot } from "../utils/auctionSynchronization";

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
  const [ownerTeamName, setOwnerTeamName] = useState("");
  const [filter, setFilter] = useState(
    ownerView ? "My Bid Activity" : "All"
  );
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRevision = useRef(0);

  const loadHistory = useCallback((showLoading = true) => {
    let active = true;
    if (showLoading === true) setLoading(true);
    setError("");
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
        const viewerTeamId =
          currentResponse?.data?.data?.viewer?.festivalTeamId || null;
        setOwnerTeamName(
          currentResponse?.data?.data?.teamSummaries?.find(
            ({ festivalTeamId }) => festivalTeamId === viewerTeamId
          )?.team?.name || ""
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

  useEffect(() => {
    const applySnapshot = (payload) => {
      if (
        payload?.scopeType !== "festival" ||
        payload.scopeId !== festivalId ||
        !shouldApplyAuctionSnapshot(lastRevision.current, payload)
      ) {
        return;
      }
      lastRevision.current = payload.revision;
      setAuctions(payload.history || []);
      setOwnerTeamName((currentName) => {
        if (!ownerTeamId) return currentName;
        return (
          payload.state?.teamSummaries?.find(
            ({ festivalTeamId }) => festivalTeamId === ownerTeamId
          )?.team?.name || currentName
        );
      });
      setLoading(false);
    };
    const joinRoom = () =>
      socket.emit("join-festival-auction", { festivalId });
    const cancelLoad = loadHistory();
    socket.on("auction-state", applySnapshot);
    socket.on("connect", joinRoom);
    if (socket.connected) joinRoom();
    return () => {
      cancelLoad?.();
      socket.emit("leave-festival-auction", { festivalId });
      socket.off("auction-state", applySnapshot);
      socket.off("connect", joinRoom);
    };
  }, [festivalId, loadHistory, ownerTeamId]);

  const auctionedPlayers = useMemo(
    () =>
      auctions.filter((auction) => {
        if (!ownerView) return true;
        const ownBid = auction.bids?.some(
          ({ festivalTeamId }) => festivalTeamId === ownerTeamId
        );
        const won = auction.result?.festivalTeamId === ownerTeamId;
        if (filter === "Won Participants") return won;
        if (filter === "Outbid Participants") return ownBid && !won;
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
        {ownerView && ownerTeamName && (
          <Chip color="primary" label={`Team: ${ownerTeamName}`} sx={{ my: 1 }} />
        )}
        <Typography color="text.secondary">
          {ownerView
            ? "Review participants your Team bid on, won, or was outbid on."
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
            <MenuItem value="My Bid Activity">My Bid Activity</MenuItem>
            <MenuItem value="Won Participants">Won Participants</MenuItem>
            <MenuItem value="Outbid Participants">
              Outbid Participants
            </MenuItem>
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
