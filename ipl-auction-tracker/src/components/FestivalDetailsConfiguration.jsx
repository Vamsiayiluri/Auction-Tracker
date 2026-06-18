import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";

const toForm = (festival) => ({
  name: festival?.name || "",
  code: festival?.code || "",
  startDate: festival?.startDate || "",
  endDate: festival?.endDate || "",
});

export default function FestivalDetailsConfiguration({
  festival,
  festivalId,
  locked,
  onChanged,
}) {
  const [form, setForm] = useState(() => toForm(festival));
  const [busy, setBusy] = useState(false);
  const saveInFlight = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(toForm(festival));
  }, [festival]);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async () => {
    if (saveInFlight.current) return;
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date must be on or after the start date.");
      return;
    }
    saveInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await api.patch(`/v2/festivals/${festivalId}`, {
        ...form,
        timezone: "Asia/Kolkata",
        currencyCode: "INR",
      });
      await onChanged?.(response.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update Festival details."
      );
    } finally {
      saveInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Festival Details
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Festival Name"
              value={form.name}
              disabled={locked}
              onChange={updateField("name")}
            />
            <TextField
              fullWidth
              label="Festival Code"
              value={form.code}
              disabled={locked}
              onChange={updateField("code")}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={form.startDate}
              disabled={locked}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={updateField("startDate")}
            />
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={form.endDate}
              disabled={locked}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={updateField("endDate")}
            />
          </Stack>
          <Button
            variant="contained"
            disabled={
              locked ||
              busy ||
              !form.name ||
              !form.code ||
              !form.startDate ||
              !form.endDate
            }
            onClick={save}
            sx={{ alignSelf: "flex-start" }}
          >
            {busy ? "Saving..." : "Save Festival Details"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
