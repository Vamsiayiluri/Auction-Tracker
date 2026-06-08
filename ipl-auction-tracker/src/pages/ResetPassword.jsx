import { useState } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import api from "../utils/api";

const validatePasswordForm = ({ password, confirmPassword }) => {
  const errors = {};
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

const PasswordVisibilityButton = ({ visible, onToggle, label }) => (
  <InputAdornment position="end">
    <IconButton
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      edge="end"
      onClick={onToggle}
    >
      {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
    </IconButton>
  </InputAdornment>
);

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [apiSeverity, setApiSeverity] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validatePasswordForm(formData);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setApiMessage("");

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password: formData.password,
      });
      setApiSeverity("success");
      setApiMessage(
        response.data.message ||
          "Password reset successful. You can now log in."
      );
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setApiSeverity("error");
      setApiMessage(
        error.response?.data?.message ||
          "Unable to reset your password. Please request a new reset link."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose new password"
      description="Create a new password for your AuctionArena account."
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
        {apiMessage && <Alert severity={apiSeverity}>{apiMessage}</Alert>}
        <TextField
          fullWidth
          label="New password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={Boolean(errors.password)}
          helperText={errors.password || "Use at least 8 characters."}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <PasswordVisibilityButton
                  label="password"
                  visible={showPassword}
                  onToggle={() => setShowPassword((visible) => !visible)}
                />
              ),
            },
          }}
        />
        <TextField
          fullWidth
          label="Confirm new password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <PasswordVisibilityButton
                  label="confirmation password"
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((visible) => !visible)
                  }
                />
              ),
            },
          }}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Reset password"
          )}
        </Button>
        <Box sx={{ pt: 1, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Need a new link?{" "}
            <Link component={RouterLink} to="/forgot-password" fontWeight={600}>
              Request password reset
            </Link>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
