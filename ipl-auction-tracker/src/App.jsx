import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
  useParams,
} from "react-router-dom";

import AuthProvider from "./context/AuthContext";
import AppShell from "./components/AppShell";
import RouteBoundary from "./components/RouteBoundary";
import {
  DefaultRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/RouteGuards";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import AuctionPage from "./pages/AuctionPage";
import AuctionDirectory from "./pages/AuctionDirectory";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import FestivalAuctionHub from "./pages/FestivalAuctionHub";
import FestivalAuctionResultsPage from "./pages/FestivalAuctionResultsPage";
import FestivalCommandCenter from "./pages/FestivalCommandCenter";
import FestivalDashboard from "./pages/FestivalDashboard";
import FestivalDetail from "./pages/FestivalDetail";
import FestivalLiveAuctionPage from "./pages/FestivalLiveAuctionPage";
import ForgotPassword from "./pages/ForgotPassword";
import LiveAuctionPage from "./pages/LiveAuctionPage";
import Login from "./pages/Login";
import ProfilePage from "./pages/ProfilePage";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import SpectatorAuctionPage from "./pages/SpectatorAuctionPage";
import SportAuctionHub from "./pages/SportAuctionHub";
import SportAuctionArena from "./pages/SportAuctionArena";
import SportAuctionResultsPage from "./pages/SportAuctionResultsPage";
import SportTournamentCommandCenter from "./pages/SportTournamentCommandCenter";
import SportTournamentDirectory from "./pages/SportTournamentDirectory";
import SportTournamentWorkspace from "./pages/SportTournamentWorkspace";
import VerifyEmail from "./pages/VerifyEmail";

const FestivalAuctionCompatibilityRedirect = () => {
  const { festivalId } = useParams();
  return <Navigate to={`/auctions/festivals/${festivalId}`} replace />;
};

const FestivalRootRedirect = () => {
  const { festivalId } = useParams();
  return <Navigate to={`/festivals/${festivalId}/command-center`} replace />;
};

const SportAuctionCompatibilityRedirect = () => {
  const { sportTournamentId } = useParams();
  return <Navigate to={`/auctions/sports/${sportTournamentId}`} replace />;
};

const page = (name, children) => (
  <RouteBoundary name={name}>{children}</RouteBoundary>
);

export default function AppRouter() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                {page("Login", <Login />)}
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                {page("Register", <Register />)}
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                {page("Forgot Password", <ForgotPassword />)}
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <GuestRoute>
                {page("Reset Password", <ResetPassword />)}
              </GuestRoute>
            }
          />
          <Route
            path="/verify-email/:token"
            element={page("Verify Email", <VerifyEmail />)}
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                {page("Change Password", <ChangePassword />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  {page("Dashboard", <Dashboard />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  {page("Profile", <ProfilePage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppShell>
                  {page("Settings", <AccountSettingsPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-live-auction"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  {page("Live Auction", <LiveAuctionPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  {page("Festivals", <FestivalDashboard />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                {page("Festival Redirect", <FestivalRootRedirect />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/command-center"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  {page("Festival Command Center", <FestivalCommandCenter />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/manage"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  {page("Festival Management", <FestivalDetail />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/live-auction"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                {page("Festival Auction Redirect", <FestivalAuctionCompatibilityRedirect />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/festival-auctions"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                {page("Festival Auctions Redirect", <Navigate to="/auctions?type=festival" replace />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <AppShell>
                  {page("Auctions", <AuctionDirectory />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/auction-hub"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <AppShell>
                  {page("Festival Auction Hub", <FestivalAuctionHub />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/festivals/:festivalId"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <AppShell>
                  {page("Festival Live Auction", <FestivalLiveAuctionPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/results"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <AppShell>
                  {page("Festival Results", <FestivalAuctionResultsPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:id/auction-hub"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Auction Hub", <SportAuctionHub />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:id/results"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Results", <SportAuctionResultsPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/sports/:sportTournamentId"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Live Auction", <SportAuctionArena />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  {page("Employees", <EmployeeDirectory />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Tournaments", <SportTournamentDirectory />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId/auction"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                {page("Sport Auction Redirect", <SportAuctionCompatibilityRedirect />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Command Center", <SportTournamentCommandCenter />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId/manage"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  {page("Sport Workspace", <SportTournamentWorkspace />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-auction"
            element={
              <ProtectedRoute allowedRoles={["team_owner"]}>
                <AppShell>
                  {page("Team Owner Auction", <AuctionPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/spectator-live-auction"
            element={
              <ProtectedRoute allowedRoles={["spectator"]}>
                <AppShell>
                  {page("Spectator Auction", <SpectatorAuctionPage />)}
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={page("Not Found", <DefaultRoute />)} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
