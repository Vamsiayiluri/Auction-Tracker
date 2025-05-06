import { Container, Typography, Divider } from "@mui/material";
import UserManagement from "./UserManagement";
import AuctionManagement from "./AuctionManagement";

export default function AdminDashboard() {
  return (
    <Container>
      {/* <Typography variant="h4">Admin Dashboard</Typography>
      <Divider sx={{ my: 2 }} />
      <UserManagement />
      <Divider sx={{ my: 2 }} /> */}
      <AuctionManagement />
    </Container>
  );
}
