import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "Preferences",
    description: "Personal defaults for how you use AuctionArena.",
    planned: true,
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences.",
    planned: true,
  },
  {
    title: "Display Options",
    description: "Theme, density, and accessibility display preferences.",
    planned: true,
  },
  {
    title: "Account Security",
    description: "Password, sessions, and account protection options.",
    planned: false,
    actions: [
      {
        label: "Change Password",
        description: "Update your account password.",
        route: "/change-password",
      },
    ],
  },
];

export default function AccountSettingsPage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={800}>Account Settings</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage password and review upcoming account options.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Stack>

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
              <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: section.actions?.length ? 2 : 0 }}>
                <Box>
                  <Typography variant="h6" fontWeight={900}>
                    {section.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    {section.description}
                  </Typography>
                </Box>
                {section.planned && <Chip label="Planned" size="small" />}
              </Stack>
              {section.actions?.map((action) => (
                <CardActionArea
                  key={action.label}
                  onClick={() => navigate(action.route)}
                  sx={{ borderRadius: 2, p: 1.5, mt: 1 }}
                >
                  <Typography variant="body2" fontWeight={700}>{action.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{action.description}</Typography>
                </CardActionArea>
              ))}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
