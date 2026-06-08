import { useState } from "react";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import api from "../utils/api";

const validateEmail = (email) => {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return "";
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [apiSeverity, setApiSeverity] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateEmail(email);

    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setIsSubmitting(true);
    setApiMessage("");
    setEmailError("");

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setApiSeverity("success");
      setApiMessage(
        response.data.message ||
          "If an account exists for this email, a password reset link has been sent."
      );
    } catch (error) {
      setApiSeverity("error");
      setApiMessage(
        error.response?.data?.message ||
          "Unable to request a password reset. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      description="Enter your account email and we will send a reset link."
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
        {apiMessage && <Alert severity={apiSeverity}>{apiMessage}</Alert>}
        <TextField
          fullWidth
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError("");
            setApiMessage("");
          }}
          error={Boolean(emailError)}
          helperText={emailError}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Send reset link"
          )}
        </Button>
        <Box sx={{ pt: 1, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{" "}
            <Link component={RouterLink} to="/login" fontWeight={600}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
