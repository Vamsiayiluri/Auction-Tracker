import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import BrandLogo from "./BrandLogo";

const benefits = [
  {
    icon: <SensorsRoundedIcon />,
    title: "Live bidding",
    description: "Follow every bid in real time.",
  },
  {
    icon: <GavelRoundedIcon />,
    title: "Auction control",
    description: "Run player auctions with confidence.",
  },
  {
    icon: <GroupsRoundedIcon />,
    title: "Build your squad",
    description: "Track teams, budgets, and wins.",
  },
];

const AuthLayout = ({ children, title, description }) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "minmax(360px, 46%) 1fr" },
    }}
  >
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: { md: 5, lg: 7 },
        color: "common.white",
        background:
          "radial-gradient(circle at 75% 12%, rgba(245,158,11,0.22), transparent 26%), linear-gradient(145deg, #0F172A 5%, #142B61 56%, #1D4ED8 120%)",
      }}
    >
      <BrandLogo inverse />
      <Box sx={{ maxWidth: 475 }}>
        <Typography variant="h3" sx={{ mb: 2, color: "common.white" }}>
          Build the winning team, one bid at a time.
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.72)", mb: 5 }}>
          A live auction workspace for administrators, team owners, and
          spectators.
        </Typography>
        <Stack spacing={2}>
          {benefits.map(({ icon, title: benefitTitle, description: copy }) => (
            <Stack key={benefitTitle} direction="row" spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  color: "secondary.main",
                  bgcolor: "rgba(255,255,255,0.1)",
                }}
              >
                {icon}
              </Box>
              <Box>
                <Typography fontWeight={600}>{benefitTitle}</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.68)" }}
                >
                  {copy}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
        Bid. Build. Win.
      </Typography>
    </Box>

    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ display: { md: "none" }, mb: 4 }}>
        <BrandLogo />
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 20px 56px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Typography variant="h4" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {description}
        </Typography>
        {children}
      </Paper>
    </Container>
  </Box>
);

export default AuthLayout;
