import { useState } from "react";
import { Container, Typography, Divider } from "@mui/material";
import AvailableAuctions from "../AvailableAuctions";
import ManageTeam from "../ManageTeam";

export default function TeamOwnerDashboard() {
  return (
    <Container>
      <Typography variant="h4">Team Owner Dashboard</Typography>
      <Divider sx={{ my: 2 }} />

      <AvailableAuctions />
    </Container>
  );
}
