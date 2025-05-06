import { Container, Typography, Button, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";

import { Navigate, useNavigate } from "react-router-dom";
import AdminDashboard from "../components/AdminDashboard";
import ViewerDashboard from "../components/ViewerDashBoard";
import { useEffect } from "react";
import TeamOwnerDashboard from "../components/TeamOwnerDashboard/TeamOwnerDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  console.log(user);
  useEffect(() => {
    if (!user) <Navigate to="/login" />;
  }, [user]);

  // let user = "Admin";

  return (
    user && (
      <Box>
        {user.role === "admin" && <AdminDashboard />}
        {user.role === "team_owner" && <TeamOwnerDashboard />}
        {user.role === "spectator" && <ViewerDashboard />}
      </Box>
    )
  );
}
