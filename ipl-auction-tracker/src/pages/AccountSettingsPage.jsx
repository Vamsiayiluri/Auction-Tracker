import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

const sections = [
  {
    title: "Preferences",
    description: "Personal defaults for how you use AuctionArena.",
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences.",
  },
  {
    title: "Display Options",
    description: "Theme, density, and accessibility display preferences.",
  },
  {
    title: "Account Security",
    description: "Password, sessions, and account protection options.",
  },
];

export default function AccountSettingsPage() {
  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Account settings are prepared for future preferences. No account,
        password, notification, or security changes are available in this phase.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        {sections.map((section) => (
          <Card key={section.title} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={900}>
                    {section.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    {section.description}
                  </Typography>
                </Box>
                <Chip label="Coming Soon" size="small" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
