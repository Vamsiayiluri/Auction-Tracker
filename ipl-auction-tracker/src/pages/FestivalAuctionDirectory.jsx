import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function FestivalAuctionDirectory() {
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/v2/festivals")
      .then((response) => {
        if (active) setFestivals(response.data.data || []);
      })
      .catch(() => {
        if (active) setError("Unable to load festival auctions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress size={34} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {festivals.map((festival) => (
        <Card key={festival.id} variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={2}
            >
              <div>
                <Typography variant="h6">{festival.name}</Typography>
                <Typography color="text.secondary">
                  {festival.code} | {festival.startDate} to {festival.endDate}
                </Typography>
              </div>
              <Button
                variant="contained"
                onClick={() =>
                  navigate(`/festivals/${festival.id}/live-auction`)
                }
              >
                Open Main Auction
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}
      {!festivals.length && !error && (
        <Typography color="text.secondary">
          No festivals are currently available.
        </Typography>
      )}
    </Stack>
  );
}
