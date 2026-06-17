import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import BrandLogo from "./BrandLogo";

const roleLabels = {
  admin: "Administrator",
  team_owner: "Team Owner",
  spectator: "Spectator",
};

const pageTitles = {
  "/dashboard": "Dashboard",
  "/start-live-auction": "Run Auction",
  "/live-auction": "Live Auction",
  "/spectator-live-auction": "Live Auction",
  "/festivals": "Festivals",
  "/festival-auctions": "Festival Auctions",
  "/auctions": "Auctions",
  "/employees": "Employee Directory",
  "/sport-tournaments": "Sport Tournaments",
  "/profile": "My Profile",
  "/settings": "Account Settings",
};

const pageDescriptions = {
  "/dashboard": "Manage your auctions, invitations, and next live actions.",
  "/start-live-auction": "Control player rounds, bids, timers, and outcomes.",
  "/live-auction": "Place bids, monitor squads, and follow auction history.",
  "/spectator-live-auction": "Watch bids, teams, and outcomes as they happen.",
  "/festivals": "Open a Festival overview or create a new Festival.",
  "/festival-auctions": "Open a main Festival auction as an admin, owner, or spectator.",
  "/auctions": "Find live auctions, auction details, and results.",
  "/employees": "Manage canonical employee identities and optional login links.",
  "/sport-tournaments": "Create Sport Teams, assign captains, and check setup progress.",
  "/profile": "Review your profile, role, and assignment context.",
  "/settings": "Review account preferences and future account options.",
};

const navigationByRole = {
  admin: [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: <SpaceDashboardOutlinedIcon />,
    },
    {
      label: "Festivals",
      to: "/festivals",
      icon: <EmojiEventsOutlinedIcon />,
    },
    {
      label: "Auctions",
      to: "/auctions",
      icon: <GavelRoundedIcon />,
    },
    {
      label: "Employees",
      to: "/employees",
      icon: <BadgeOutlinedIcon />,
    },
    {
      label: "Sport Tournaments",
      to: "/sport-tournaments",
      icon: <EmojiEventsOutlinedIcon />,
    },
  ],
  team_owner: [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: <SpaceDashboardOutlinedIcon />,
    },
    {
      label: "Auctions",
      to: "/auctions",
      icon: <GavelRoundedIcon />,
    },
    {
      label: "Sport Tournaments",
      to: "/sport-tournaments",
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
      label: "Auctions",
      to: "/auctions",
      icon: <GavelRoundedIcon />,
    },
  ],
};

const AppShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const festivalCommandCenterPath =
    location.pathname.startsWith("/festivals/") &&
    location.pathname.endsWith("/command-center");
  const festivalResultsPath =
    location.pathname.startsWith("/festivals/") &&
    location.pathname.endsWith("/results");
  const festivalAuctionDetailsPath =
    location.pathname.startsWith("/festivals/") &&
    location.pathname.endsWith("/auction-hub");
  const festivalManagementPath =
    location.pathname.startsWith("/festivals/") &&
    !festivalCommandCenterPath &&
    !festivalAuctionDetailsPath &&
    !festivalResultsPath;
  const festivalArenaPath = location.pathname.startsWith(
    "/auctions/festivals/"
  );
  const sportArenaPath = location.pathname.startsWith("/auctions/sports/");
  const arenaPath = festivalArenaPath || sportArenaPath;
  const sportTournamentPath = location.pathname.startsWith(
    "/sport-tournaments/"
  );
  const sportAuctionDetailsPath =
    sportTournamentPath && location.pathname.endsWith("/auction-hub");
  const sportResultsPath =
    sportTournamentPath && location.pathname.endsWith("/results");
  const sportManagementPath =
    sportTournamentPath && location.pathname.endsWith("/manage");
  const pageTitle =
    pageTitles[location.pathname] ||
    (festivalCommandCenterPath
      ? "Festival Overview"
      : festivalAuctionDetailsPath
        ? "Festival Auction Details"
      : festivalResultsPath
        ? "Festival Auction Results"
      : festivalArenaPath
        ? "Festival Live Auction"
        : sportArenaPath
          ? "Sport Live Auction"
          : festivalManagementPath
            ? "Festival Management"
            : sportAuctionDetailsPath
              ? "Sport Auction Details"
              : sportResultsPath
                ? "Sport Auction Results"
                : sportManagementPath
                  ? "Sport Tournament Setup"
              : sportTournamentPath
                ? "Sport Tournament Overview"
              : "Dashboard");
  const pageDescription =
    pageDescriptions[location.pathname] ||
    (festivalCommandCenterPath
      ? "See Festival status, setup issues, and next actions."
      : festivalAuctionDetailsPath
        ? "Review teams, spending, bids, and auction results."
      : festivalResultsPath
        ? "Review completed Festival auction outcomes."
      : festivalArenaPath
        ? "Run, join, or watch the live Festival auction."
        : sportArenaPath
          ? "Run, join, or watch the live Sport auction."
          : festivalManagementPath
            ? "Manage Festival setup, participants, Teams, and reporting."
            : sportAuctionDetailsPath
              ? "Review teams, credits, bids, player assignments, and results."
              : sportResultsPath
                ? "Review completed Sport auction outcomes."
                : sportManagementPath
                  ? "Configure Sport Teams, captains, eligibility, and budgets."
            : sportTournamentPath
              ? "See Sport Tournament status, setup issues, and next actions."
              : pageDescriptions["/dashboard"]);
  const displayName = user?.name || "Auction user";
  const navigationItems = useMemo(
    () => navigationByRole[user?.role] ?? navigationByRole.spectator,
    [user?.role]
  );
  const accountMenuOpen = Boolean(accountMenuAnchor);
  const roleLabel = roleLabels[user?.role] || user?.role || "User";

  const accountMenuItems = useMemo(() => {
    const roleSpecific =
      user?.role === "team_owner"
        ? [
            {
              label: "My Teams",
              to: "/sport-tournaments",
              icon: <EmojiEventsOutlinedIcon fontSize="small" />,
            },
          ]
        : user?.role === "spectator"
          ? [
              {
                label: "My Auctions",
                to: "/auctions",
                icon: <GavelRoundedIcon fontSize="small" />,
              },
            ]
          : [];

    return [
      {
        label: "My Profile",
        to: "/profile",
        icon: <PersonOutlineRoundedIcon fontSize="small" />,
      },
      ...roleSpecific,
      {
        label: "Account Settings",
        to: "/settings",
        icon: <SettingsOutlinedIcon fontSize="small" />,
      },
      {
        label: "Notifications",
        icon: <NotificationsNoneRoundedIcon fontSize="small" />,
        disabled: true,
      },
      {
        label: "Activity History",
        icon: <HistoryRoundedIcon fontSize="small" />,
        disabled: true,
      },
    ];
  }, [user?.role]);

  const handleLogout = () => {
    setAccountMenuAnchor(null);
    logout();
    navigate("/login", { replace: true });
  };

  const closeMobileNav = () => setMobileOpen(false);
  const openAccountMenu = (event) => setAccountMenuAnchor(event.currentTarget);
  const closeAccountMenu = () => setAccountMenuAnchor(null);
  const navigateFromAccountMenu = (to) => {
    closeAccountMenu();
    navigate(to);
  };

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
          <Tooltip title="Open account menu">
            <Button
              color="inherit"
              onClick={openAccountMenu}
              aria-label="Open account menu"
              aria-controls={accountMenuOpen ? "account-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen ? "true" : undefined}
              sx={{
                minHeight: 44,
                px: { xs: 0.75, sm: 1.25 },
                borderRadius: 999,
                color: "text.primary",
                textTransform: "none",
                gap: 1,
              }}
            >
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                {displayName}
              </Typography>
            </Button>
          </Tooltip>
          <Menu
            id="account-menu"
            anchorEl={accountMenuAnchor}
            open={accountMenuOpen}
            onClose={closeAccountMenu}
            MenuListProps={{ "aria-label": "Account menu" }}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
              mt: 1,
              "& .MuiPaper-root": {
                minWidth: 280,
                maxWidth: "calc(100vw - 24px)",
                borderRadius: 3,
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.16)",
                border: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography fontWeight={800}>{displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {roleLabel}
              </Typography>
            </Box>
            <Divider />
            {accountMenuItems.map((item) => (
              <MenuItem
                key={item.label}
                disabled={item.disabled}
                onClick={() => item.to && navigateFromAccountMenu(item.to)}
                sx={{ gap: 1.25, py: 1.1 }}
              >
                {item.icon}
                <Box>
                  <Typography variant="body2">{item.label}</Typography>
                  {item.disabled && (
                    <Typography variant="caption" color="text.secondary">
                      Coming soon
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ gap: 1.25, py: 1.1 }}>
              <LogoutRoundedIcon fontSize="small" />
              <Typography variant="body2">Sign Out</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        open={mobileOpen}
        onClose={closeMobileNav}
        aria-label="Primary navigation"
        PaperProps={{
          sx: { p: 2, width: 300 },
        }}
      >
        <BrandLogo />
        <Divider sx={{ my: 2 }} />
        <List disablePadding>{renderNavItems(true)}</List>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {!arenaPath && pageTitle === "Dashboard" && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4">{pageTitle}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {pageTitle === "Dashboard"
                ? `Welcome back, ${displayName}. ${pageDescription}`
                : pageDescription}
            </Typography>
          </Box>
        )}
        {children}
      </Container>
    </Box>
  );
};

export default AppShell;
