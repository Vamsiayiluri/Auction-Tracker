import { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Container,
  Typography,
  Box,
  FormControl,
} from "@mui/material";
import axios from "axios";
import { uid } from "uid";

import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [showTeamInput, setShowTeamInput] = useState(false);
  const [teamName, setTeamName] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "role") {
      setShowTeamInput(value === "team_owner"); // Show team input only for team owners
    }
    console.log(name, value, showTeamInput);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let updatedFormData = { ...formData };
    updatedFormData.id = uid();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.role === "team_owner" && !teamName.trim()) {
      alert("Team name is required for Team Owners!");
      return;
    }
    if (formData.role === "team_owner") {
      updatedFormData.teamName = teamName.trim();
      updatedFormData.teamId = uid();
    }
    try {
      console.log({
        updatedFormData,
      });
      const res = await api.post("/auth/register", updatedFormData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Registration failed");
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        margin: "auto",
        padding: 3,
        boxShadow: 3,
        borderRadius: 2,
      }}
    >
      <Typography variant="h5">Register</Typography>
      <TextField
        fullWidth
        margin="normal"
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        margin="normal"
        select
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
      >
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="team_owner">Team Owner</MenuItem>
        <MenuItem value="spectator">Spectator</MenuItem>
      </TextField>

      {showTeamInput && (
        <TextField
          label="Team Name"
          name="teamName"
          fullWidth
          margin="normal"
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
          }}
        />
      )}
      <TextField
        fullWidth
        margin="normal"
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
      />
      {error && <Typography color="error">{error}</Typography>}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSubmit}
      >
        Register
      </Button>
    </Box>
  );
};

export default Register;
