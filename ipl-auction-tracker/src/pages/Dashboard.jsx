import { Alert, Box, Button } from "@mui/material";
import { useAuth } from "../context/auth-context";
import AdminProductDashboard from "../components/ProductDashboard/AdminProductDashboard";
import CaptainProductDashboard from "../components/ProductDashboard/CaptainProductDashboard";
import OwnerProductDashboard from "../components/ProductDashboard/OwnerProductDashboard";
import SpectatorProductDashboard from "../components/ProductDashboard/SpectatorProductDashboard";
import useProductDashboardData from "../components/ProductDashboard/useProductDashboardData";
import { LoadingStateCard } from "../components/ProductState";

export default function Dashboard() {
  const { user } = useAuth();
  const data = useProductDashboardData(user);
  const hasCaptainAssignments = data.sportStates.some(
    ({ tournament }) => tournament.permissions?.canBid
  );

  if (data.loading) {
    return (
      <LoadingStateCard
        title="Loading Dashboard"
        message="Fetching your Festivals, Sport Tournaments, and recent auction activity."
      />
    );
  }

  return (
    <Box>
      {data.error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button onClick={data.reload}>Retry</Button>}
        >
          {data.error}
        </Alert>
      )}
      {data.warnings.map((warning) => (
        <Alert
          key={warning}
          severity="warning"
          sx={{ mb: 2 }}
          action={<Button onClick={data.reload}>Retry</Button>}
        >
          {warning}
        </Alert>
      ))}
      {user.role === "admin" && <AdminProductDashboard data={data} />}
      {user.role === "team_owner" && <OwnerProductDashboard data={data} />}
      {user.role === "spectator" &&
        (hasCaptainAssignments ? (
          <CaptainProductDashboard data={data} />
        ) : (
          <SpectatorProductDashboard data={data} />
        ))}
      {!["admin", "team_owner", "spectator"].includes(user.role) && (
        <Alert severity="warning">
          Your account role is not configured for a dashboard yet. Please
          contact the auction administrator.
        </Alert>
      )}
    </Box>
  );
}
