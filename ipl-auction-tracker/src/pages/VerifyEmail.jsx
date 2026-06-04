import { useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout";
import api from "../utils/api";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        setStatus("success");
        setMessage(response.data.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Verification failed. The token may be invalid or expired."
        );
      }
    };
    verify();
  }, [token]);

  return (
    <AuthLayout
      title="Email Verification"
      description="Verifying your account registration..."
    >
      <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
        {status === "loading" && (
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={50} />
            <Typography variant="body1" color="text.secondary">
              Please wait while we verify your email address...
            </Typography>
          </Stack>
        )}

        {status === "success" && (
          <Stack alignItems="center" spacing={2} sx={{ width: "100%" }}>
            <CheckCircleOutlineRoundedIcon color="success" sx={{ fontSize: 60 }} />
            <Alert severity="success" sx={{ width: "100%" }}>
              {message}
            </Alert>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
            >
              Sign In
            </Button>
          </Stack>
        )}

        {status === "error" && (
          <Stack alignItems="center" spacing={2} sx={{ width: "100%" }}>
            <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 60 }} />
            <Alert severity="error" sx={{ width: "100%" }}>
              {message}
            </Alert>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
            >
              Back to Sign In
            </Button>
          </Stack>
        )}
      </Stack>
    </AuthLayout>
  );
}
