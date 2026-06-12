import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import BrandLogo from "./BrandLogo";

const roleLabels = {
  admin: "Admin",
  team_owner: "Team Owner",
  spectator: "Spectator",
};

const pageTitles = {
  "/dashboard": "Dashboard",
  "/start-live-auction": "Run Auction",
  "/live-auction": "Live Auction",
  "/spectator-live-auction": "Live Auction",
  "/festivals": "Sports Festivals",
  "/festival-auctions": "Festival Auctions",
  "/employees": "Employee Directory",
};

const pageDescriptions = {
  "/dashboard": "Manage your auctions, invitations, and next live actions.",
  "/start-live-auction": "Control player rounds, bids, timers, and outcomes.",
  "/live-auction": "Place bids, monitor squads, and follow auction history.",
  "/spectator-live-auction": "Watch bids, teams, and outcomes as they happen.",
  "/festivals": "Manage festival sports, participants, and registrations.",
  "/festival-auctions": "Open a Main Festival Auction as an admin, owner, or spectator.",
  "/employees": "Manage canonical employee identities and optional login links.",
};

const navigationByRole = {
  admin: [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: <SpaceDashboardOutlinedIcon />,
    },
    { label: "Run Auction", to: "/start-live-auction", icon: <GavelRoundedIcon /> },
    {
      label: "Sports Festivals",
      to: "/festivals",
      icon: <EmojiEventsOutlinedIcon />,
    },
    {
      label: "Festival Auctions",
      to: "/festival-auctions",
      icon: <GavelRoundedIcon />,
    },
    {
      label: "Employees",
      to: "/employees",
      icon: <BadgeOutlinedIcon />,
    },
  ],
  team_owner: [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: <SpaceDashboardOutlinedIcon />,
    },
    { label: "Live Auction", to: "/live-auction", icon: <GavelRoundedIcon /> },
    {
      label: "Festival Auctions",
      to: "/festival-auctions",
      icon: <EmojiEventsOutlinedIcon />,
    },
  ],
  spectator: [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: <SpaceDashboardOutlinedIcon />,
    },
    {
      label: "Watch Auction",
      to: "/spectator-live-auction",
      icon: <VisibilityRoundedIcon />,
    },
    {
      label: "Festival Auctions",
      to: "/festival-auctions",
      icon: <EmojiEventsOutlinedIcon />,
    },
  ],
};

const AppShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const festivalPath = location.pathname.startsWith("/festivals/");
  const pageTitle =
    pageTitles[location.pathname] || (festivalPath ? "Festival Workspace" : "Dashboard");
  const pageDescription =
    pageDescriptions[location.pathname] ||
    (festivalPath
      ? "Manage festival sports, participants, and registrations."
      : pageDescriptions["/dashboard"]);
  const displayName = user?.name || "Auction user";
  const navigationItems = useMemo(
    () => navigationByRole[user?.role] ?? navigationByRole.spectator,
    [user?.role]
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const closeMobileNav = () => setMobileOpen(false);

  const renderNavItems = (mobile = false) =>
    navigationItems.map((item) =>
      mobile ? (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          onClick={closeMobileNav}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            "&.active": {
              bgcolor: "primary.light",
              color: "primary.dark",
              "& .MuiListItemIcon-root": { color: "primary.dark" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ) : (
        <Button
          key={item.to}
          component={NavLink}
          to={item.to}
          startIcon={item.icon}
          color="inherit"
          sx={{
            minHeight: 42,
            color: "text.secondary",
            "&.active": {
              bgcolor: "primary.light",
              color: "primary.dark",
            },
          }}
        >
          {item.label}
        </Button>
      )
    );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar sx={{ minHeight: { xs: 68, sm: 76 }, gap: 3 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
            aria-label="Open navigation"
          >
            <MenuRoundedIcon />
          </IconButton>
          <BrandLogo compact />
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: "none", md: "flex" }, ml: 3 }}
          >
            {renderNavItems()}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Chip
            label={roleLabels[user?.role] || user?.role}
            size="small"
            sx={{
              display: { xs: "none", sm: "flex" },
              bgcolor: "primary.light",
              color: "primary.dark",
              fontWeight: 600,
            }}
          />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.1}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {roleLabels[user?.role] || user?.role}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              minHeight: 42,
              px: { xs: 1.25, sm: 2 },
              color: "text.secondary",
              borderColor: "divider",
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Logout
            </Box>
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        open={mobileOpen}
        onClose={closeMobileNav}
        PaperProps={{
          sx: { p: 2, width: 300 },
        }}
      >
        <BrandLogo />
        <Divider sx={{ my: 2 }} />
        <List disablePadding>{renderNavItems(true)}</List>
        <Divider sx={{ my: 2 }} />
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          onClick={handleLogout}
          startIcon={<LogoutRoundedIcon />}
          sx={{ justifyContent: "flex-start" }}
        >
          Logout
        </Button>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4">{pageTitle}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {pageTitle === "Dashboard"
              ? `Welcome back, ${displayName}. ${pageDescription}`
              : pageDescription}
          </Typography>
        </Box>
        {children}
      </Container>
    </Box>
  );
};

export default AppShell;
