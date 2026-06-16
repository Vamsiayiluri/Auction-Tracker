import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import AuctionPage from "./pages/AuctionPage";

import AuthProvider from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import LiveAuctionPage from "./pages/LiveAuctionPage";
import SpectatorAuctionPage from "./pages/SpectatorAuctionPage";
import FestivalDashboard from "./pages/FestivalDashboard";
import FestivalDetail from "./pages/FestivalDetail";
import FestivalLiveAuctionPage from "./pages/FestivalLiveAuctionPage";
import FestivalAuctionResultsPage from "./pages/FestivalAuctionResultsPage";
import FestivalAuctionHub from "./pages/FestivalAuctionHub";
import FestivalCommandCenter from "./pages/FestivalCommandCenter";
import AuctionDirectory from "./pages/AuctionDirectory";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import SportTournamentDirectory from "./pages/SportTournamentDirectory";
import SportTournamentWorkspace from "./pages/SportTournamentWorkspace";
import SportTournamentCommandCenter from "./pages/SportTournamentCommandCenter";
import SportAuctionArena from "./pages/SportAuctionArena";
import SportAuctionHub from "./pages/SportAuctionHub";
import SportAuctionResultsPage from "./pages/SportAuctionResultsPage";
import AppShell from "./components/AppShell";
import {
  DefaultRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/RouteGuards";

const FestivalAuctionCompatibilityRedirect = () => {
  const { festivalId } = useParams();
  return <Navigate to={`/auctions/festivals/${festivalId}`} replace />;
};

const SportAuctionCompatibilityRedirect = () => {
  const { sportTournamentId } = useParams();
  return <Navigate to={`/auctions/sports/${sportTournamentId}`} replace />;
};

export default function AppRouter() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/verify-email/:token"
            element={
              <VerifyEmail />
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-live-auction"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <LiveAuctionPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <FestivalDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <FestivalDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/command-center"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <FestivalCommandCenter />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/festivals/:festivalId/manage"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <FestivalDetail />
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
                <FestivalAuctionCompatibilityRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/festival-auctions"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <Navigate to="/auctions?type=festival" replace />
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
                  <AuctionDirectory />
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
                  <FestivalAuctionHub />
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
                  <FestivalLiveAuctionPage />
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
                  <FestivalAuctionResultsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:id/auction-hub"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportAuctionHub />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:id/results"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportAuctionResultsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/sports/:sportTournamentId"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportAuctionArena />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <EmployeeDirectory />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportTournamentDirectory />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId/auction"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <SportAuctionCompatibilityRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportTournamentCommandCenter />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sport-tournaments/:sportTournamentId/manage"
            element={
              <ProtectedRoute allowedRoles={["admin", "team_owner", "spectator"]}>
                <AppShell>
                  <SportTournamentWorkspace />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-auction"
            element={
              <ProtectedRoute allowedRoles={["team_owner"]}>
                <AppShell>
                  <AuctionPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/spectator-live-auction"
            element={
              <ProtectedRoute allowedRoles={["spectator"]}>
                <AppShell>
                  <SpectatorAuctionPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<DefaultRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
