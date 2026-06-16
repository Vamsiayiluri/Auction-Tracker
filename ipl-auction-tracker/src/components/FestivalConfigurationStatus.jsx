import { useRef, useState } from "react";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";

export default function FestivalConfigurationStatus({
  festival,
  festivalId,
  onChanged,
}) {
  const [action, setAction] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actionInFlight = useRef(false);

  const configurationState =
    festival?.configurationLockState ||
    festival?.lockState?.configurationLockState ||
    "locked";
  const expected = action === "unlock" ? "UNLOCK" : "RELOCK";

  const closeDialog = () => {
    if (busy) return;
    setAction("");
    setConfirmation("");
    setError("");
  };

  const submit = async () => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await api.post(
        `/v2/festivals/${festivalId}/configuration/${action}`,
        { confirmation }
      );
      await onChanged?.(response.data.data);
      setAction("");
      setConfirmation("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to change configuration status."
      );
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={2}
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">Configuration Status</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={
                    configurationState === "unlocked" ? (
                      <LockOpenRoundedIcon />
                    ) : (
                      <LockRoundedIcon />
                    )
                  }
                  color={
                    configurationState === "unlocked"
                      ? "warning"
                      : "default"
                  }
                  label={configurationState.toUpperCase()}
                />
                <Typography variant="body2" color="text.secondary">
                  {configurationState === "unlocked"
                    ? "Approved configuration corrections are enabled. Auction history and sold assignments remain protected."
                    : "Standard auction setup restrictions are active."}
                </Typography>
              </Stack>
            </Stack>
            <Button
              variant={
                configurationState === "unlocked"
                  ? "outlined"
                  : "contained"
              }
              color={
                configurationState === "unlocked"
                  ? "inherit"
                  : "warning"
              }
              startIcon={
                configurationState === "unlocked" ? (
                  <LockRoundedIcon />
                ) : (
                  <LockOpenRoundedIcon />
                )
              }
              onClick={() =>
                setAction(
                  configurationState === "unlocked"
                    ? "relock"
                    : "unlock"
                )
              }
            >
              {configurationState === "unlocked"
                ? "Relock Configuration"
                : "Unlock Configuration"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={Boolean(action)} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {action === "unlock"
            ? "Unlock Festival Configuration"
            : "Relock Festival Configuration"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity={action === "unlock" ? "warning" : "info"}>
              {action === "unlock"
                ? "This action is audited. It permits validated configuration corrections but never changes bids, results, sold assignments, or winning amounts."
                : "Relocking restores the standard post-auction configuration restrictions."}
            </Alert>
            <TextField
              autoFocus
              label={`Type ${expected} to confirm`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={action === "unlock" ? "warning" : "primary"}
            disabled={busy || confirmation !== expected}
            onClick={submit}
          >
            {busy
              ? "Processing..."
              : `Confirm ${action === "unlock" ? "Unlock" : "Relock"}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
