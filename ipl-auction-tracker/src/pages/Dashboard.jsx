import { Alert, Box } from "@mui/material";
import { useAuth } from "../context/auth-context";
import AdminDashboard from "../components/AdminDashboard";
import ViewerDashboard from "../components/ViewerDashBoard";
import TeamOwnerDashboard from "../components/TeamOwnerDashboard/TeamOwnerDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Box>
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "team_owner" && <TeamOwnerDashboard />}
      {user.role === "spectator" && <ViewerDashboard />}
      {!["admin", "team_owner", "spectator"].includes(user.role) && (
        <Alert severity="warning">
          Your account role is not configured for a dashboard yet. Please
          contact the auction administrator.
        </Alert>
      )}
    </Box>
  );
}
