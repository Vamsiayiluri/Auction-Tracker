import { useEffect, useState } from "react";
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
  timezone: festival?.timezone || "",
  currencyCode: festival?.currencyCode || "",
});

export default function FestivalDetailsConfiguration({
  festival,
  festivalId,
  locked,
  onChanged,
}) {
  const [form, setForm] = useState(() => toForm(festival));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(toForm(festival));
  }, [festival]);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await api.patch(`/v2/festivals/${festivalId}`, {
        ...form,
        currencyCode: form.currencyCode || null,
      });
      await onChanged?.(response.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update Festival details."
      );
    } finally {
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
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Timezone"
              value={form.timezone}
              disabled={locked}
              onChange={updateField("timezone")}
            />
            <TextField
              fullWidth
              label="Currency Code"
              value={form.currencyCode}
              disabled={locked}
              inputProps={{ maxLength: 3 }}
              onChange={updateField("currencyCode")}
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
              !form.endDate ||
              !form.timezone
            }
            onClick={save}
            sx={{ alignSelf: "flex-start" }}
          >
            Save Festival Details
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
