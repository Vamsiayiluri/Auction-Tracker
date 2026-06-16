import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";

export function OwnerLifecycleControls({
  status,
  current,
  busy,
  activeAction,
  onRun,
  onConfirm,
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Auction Lifecycle
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="contained"
            disabled={busy || status !== "ready"}
            onClick={() => onRun("/start", {}, "Auction launched.", "launch")}
          >
            {activeAction === "launch" ? "Launching..." : "Start Auction"}
          </Button>
          <Button
            variant="outlined"
            disabled={busy || status !== "auction_live"}
            onClick={() => onRun("/pause", {}, "Auction paused.", "pause")}
          >
            {activeAction === "pause" ? "Pausing..." : "Pause Auction"}
          </Button>
          <Button
            variant="outlined"
            disabled={busy || status !== "auction_paused"}
            onClick={() => onRun("/resume", {}, "Auction resumed.", "resume")}
          >
            {activeAction === "resume" ? "Resuming..." : "Resume Auction"}
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={
              busy ||
              Boolean(current) ||
              !["auction_live", "auction_paused"].includes(status)
            }
            onClick={() =>
              onConfirm(
                "Complete Sport Auction?",
                "This ends all auction activity. Existing allocations and results remain available.",
                () => onRun("/complete", {}, "Auction completed.", "complete")
              )
            }
          >
            {activeAction === "complete"
              ? "Completing..."
              : "Complete Auction"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CaptainBidControl({
  current,
  disabledReason,
  activeAction,
  onBid,
}) {
  return (
    <Box
      sx={{
        position: { xs: "sticky", md: "static" },
        bottom: { xs: 8, md: "auto" },
        zIndex: 3,
        bgcolor: "background.paper",
        borderRadius: 2,
        p: 1,
        boxShadow: { xs: 4, md: 0 },
      }}
    >
      <Button
        fullWidth
        size="large"
        variant="contained"
        disabled={Boolean(disabledReason)}
        onClick={onBid}
        sx={{ minHeight: 58, fontSize: { xs: "1rem", sm: "1.1rem" } }}
      >
        {activeAction === "bid"
          ? "Placing Bid..."
          : `Place Bid ${Number(current?.nextCredits || 0).toLocaleString(
              "en-IN"
            )} Credits`}
      </Button>
      {disabledReason && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 1 }}
        >
          {disabledReason}
        </Typography>
      )}
    </Box>
  );
}

export function PendingFinalizationControls({
  current,
  busy,
  activeAction,
  formatCredits,
  onRun,
  onConfirm,
}) {
  return (
    <Card variant="outlined" sx={{ mt: 1, borderColor: "warning.main" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Pending Finalization
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Extend the round or finalize the server-authoritative outcome.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            disabled={busy || !current.adminActions.extend}
            onClick={() => onRun("/extend", {}, "Round extended.", "extend")}
          >
            {activeAction === "extend" ? "Extending..." : "Extend"}
          </Button>
          <Button
            color="success"
            variant="contained"
            disabled={busy || !current.adminActions.sell}
            onClick={() =>
              onConfirm(
                "Sell participant?",
                `${current.participant?.employee?.name} will join ${current.leadingTeam} for ${formatCredits(current.currentCredits)} credits.`,
                () =>
                  onRun(
                    `/participants/${current.festivalParticipantId}/sell`,
                    {},
                    "Participant sold.",
                    "sell"
                  )
              )
            }
          >
            {activeAction === "sell" ? "Selling..." : "Sell"}
          </Button>
          <Button
            color="warning"
            variant="outlined"
            disabled={busy || !current.adminActions.unsold}
            onClick={() =>
              onConfirm(
                "Mark participant unsold?",
                `${current.participant?.employee?.name} will move to the unsold queue.`,
                () =>
                  onRun(
                    `/participants/${current.festivalParticipantId}/unsold`,
                    {},
                    "Participant marked unsold.",
                    "unsold"
                  )
              )
            }
          >
            {activeAction === "unsold" ? "Updating..." : "Unsold"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
