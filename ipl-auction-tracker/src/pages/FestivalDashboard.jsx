import { useEffect, useRef, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const emptyForm = {
  name: "",
  code: "",
  startDate: "",
  endDate: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  timezone: "Asia/Kolkata",
  currencyCode: "INR",
};

export default function FestivalDashboard() {
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  const loadFestivals = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/v2/festivals");
      setFestivals(response.data.data || []);
    } catch {
      setError("Unable to load festivals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFestivals();
  }, []);

  const createFestival = async () => {
    if (saveInFlight.current) return;
    if (!form.name.trim() || !form.code.trim() || !form.startDate || !form.endDate) {
      setFormError("Festival name, code, start date, and end date are required.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError("End date must be on or after the start date.");
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        registrationOpensAt: form.registrationOpensAt
          ? new Date(form.registrationOpensAt).toISOString()
          : null,
        registrationClosesAt: form.registrationClosesAt
          ? new Date(form.registrationClosesAt).toISOString()
          : null,
      };
      await api.post("/v2/festivals", payload);
      setDialogOpen(false);
      setForm(emptyForm);
      await loadFestivals();
      setNotice("Festival created.");
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.errors?.[0]?.message ||
          requestError.response?.data?.message ||
          "Unable to create festival."
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  if (loading && !festivals.length) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress size={34} />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Festivals</Typography>
          <Typography color="text.secondary">
            Configure sports, participants, and employee sport selections.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Create Festival
        </Button>
      </Stack>

      {!festivals.length ? (
        <Alert severity="info">No festivals have been created.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {festivals.map((festival) => (
            <Card variant="outlined" key={festival.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6">{festival.name}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {festival.code}
                    </Typography>
                  </Box>
                  <Chip label={festival.status.replaceAll("_", " ")} size="small" />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 3 }}>
                  <EventRoundedIcon color="action" fontSize="small" />
                  <Typography variant="body2">
                    {festival.startDate} to {festival.endDate}
                  </Typography>
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate(`/festivals/${festival.id}/command-center`)
                  }
                >
                  Open Festival
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Festival</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Festival name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <TextField
              label="Festival code"
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Start date"
                type="date"
                value={form.startDate}
                InputLabelProps={{ shrink: true }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="End date"
                type="date"
                value={form.endDate}
                InputLabelProps={{ shrink: true }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Registration opens"
                type="datetime-local"
                value={form.registrationOpensAt}
                InputLabelProps={{ shrink: true }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    registrationOpensAt: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Registration closes"
                type="datetime-local"
                value={form.registrationClosesAt}
                InputLabelProps={{ shrink: true }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    registrationClosesAt: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Timezone"
                value={form.timezone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    timezone: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Currency"
                value={form.currencyCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currencyCode: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={saving} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={saving} onClick={createFestival}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
