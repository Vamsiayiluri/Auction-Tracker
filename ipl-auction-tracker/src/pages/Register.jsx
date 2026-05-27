import { useState } from "react";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { uid } from "uid";
import AuthLayout from "../components/AuthLayout";
import api from "../utils/api";

const initialFormData = {
  name: "",
  email: "",
  role: "",
  teamName: "",
  password: "",
  confirmPassword: "",
};

const roleDescriptions = {
  admin: "Create and manage auctions",
  team_owner: "Bid and build a team",
  spectator: "Watch live auctions",
};

const validateRegistration = (formData) => {
  const errors = {};
  const name = formData.name.trim();
  const email = formData.email.trim();
  const teamName = formData.teamName.trim();

  if (!name) {
    errors.name = "Full name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!formData.role) {
    errors.role = "Choose how you will use AuctionArena.";
  }

  if (formData.role === "team_owner" && !teamName) {
    errors.teamName = "Team name is required for team owners.";
  }

  if (!formData.password) {
    errors.password = "Password is required.";
  } else if (formData.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

const PasswordVisibilityButton = ({ visible, onToggle }) => (
  <InputAdornment position="end">
    <IconButton
      aria-label={visible ? "Hide password" : "Show password"}
      edge="end"
      onClick={onToggle}
    >
      {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
    </IconButton>
  </InputAdornment>
);

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "role" && value !== "team_owner" ? { teamName: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [name]: "", teamName: "" }));
    setApiError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateRegistration(formData);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      id: uid(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === "team_owner") {
      payload.teamName = formData.teamName.trim();
      payload.teamId = uid();
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      await api.post("/auth/register", payload);
      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess: "Account created successfully. Sign in to continue.",
        },
      });
    } catch (error) {
      setApiError(
        error.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      description="Choose your role and get ready for the live auction."
    >
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
        {apiError && <Alert severity="error">{apiError}</Alert>}
        <TextField
          fullWidth
          label="Full name"
          name="name"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          error={Boolean(errors.name)}
          helperText={errors.name}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineRoundedIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          fullWidth
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={Boolean(errors.email)}
          helperText={errors.email}
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
        <TextField
          fullWidth
          select
          label="Your role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          error={Boolean(errors.role)}
          helperText={errors.role || roleDescriptions[formData.role]}
        >
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="team_owner">Team Owner</MenuItem>
          <MenuItem value="spectator">Spectator</MenuItem>
        </TextField>

        {formData.role === "team_owner" && (
          <TextField
            fullWidth
            label="Team name"
            name="teamName"
            value={formData.teamName}
            onChange={handleChange}
            error={Boolean(errors.teamName)}
            helperText={errors.teamName || "Example: Bengaluru Blasters"}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <GroupsOutlinedIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        <TextField
          fullWidth
          label="Password"
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
                  visible={showPassword}
                  onToggle={() => setShowPassword((visible) => !visible)}
                />
              ),
            },
          }}
        />
        <TextField
          fullWidth
          label="Confirm password"
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
            "Create account"
          )}
        </Button>
        <Box sx={{ pt: 1, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{" "}
            <Link component={RouterLink} to="/login" fontWeight={600}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
};

export default Register;
