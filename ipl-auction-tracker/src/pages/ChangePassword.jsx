import { useState } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/auth-context";
import api from "../utils/api";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await api.post("/auth/change-password", { password });
      updateUser(response.data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to change password."
      );
    } finally {
      setBusy(false);
    }
  };

  const passwordAdornment = {
    startAdornment: (
      <InputAdornment position="start">
        <LockOutlinedIcon color="action" fontSize="small" />
      </InputAdornment>
    ),
  };

  return (
    <AuthLayout
      title="Change temporary password"
      description="Choose a permanent password before accessing AuctionArena."
    >
      <Stack component="form" spacing={2.5} onSubmit={submit}>
        <Alert severity="info">
          Team Owner access remains blocked until this password is changed.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          helperText="Use at least 8 characters."
          slotProps={{ input: passwordAdornment }}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          slotProps={{ input: passwordAdornment }}
        />
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Change password"}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
