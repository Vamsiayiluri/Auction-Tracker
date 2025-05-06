import { Container, Typography, Divider } from "@mui/material";
import AvailableAuctions from "./AvailableAuctions";

const ViewerDashboard = () => {
  return (
    <Container>
      <Typography variant="h4">Spectator Dashboard</Typography>
      <Divider sx={{ my: 2 }} />

      <AvailableAuctions />
    </Container>
  );
};

export default ViewerDashboard;
