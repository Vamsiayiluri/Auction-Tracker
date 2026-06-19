import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
  useParams,
} from "react-router-dom";

import AuthProvider from "./context/AuthContext";
import AppShell from "./components/AppShell";
import {
  DefaultRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/RouteGuards";

const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage"));
const AuctionDirectory = lazy(() => import("./pages/AuctionDirectory"));
const AuctionPage = lazy(() => import("./pages/AuctionPage"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmployeeDirectory = lazy(() => import("./pages/EmployeeDirectory"));
const FestivalAuctionHub = lazy(() => import("./pages/FestivalAuctionHub"));
const FestivalAuctionResultsPage = lazy(() => import("./pages/FestivalAuctionResultsPage"));
const FestivalCommandCenter = lazy(() => import("./pages/FestivalCommandCenter"));
const FestivalDashboard = lazy(() => import("./pages/FestivalDashboard"));
const FestivalDetail = lazy(() => import("./pages/FestivalDetail"));
const FestivalLiveAuctionPage = lazy(() => import("./pages/FestivalLiveAuctionPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LiveAuctionPage = lazy(() => import("./pages/LiveAuctionPage"));
const Login = lazy(() => import("./pages/Login"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SpectatorAuctionPage = lazy(() => import("./pages/SpectatorAuctionPage"));
const SportAuctionArena = lazy(() => import("./pages/SportAuctionArena"));
const SportAuctionHub = lazy(() => import("./pages/SportAuctionHub"));
const SportAuctionResultsPage = lazy(() => import("./pages/SportAuctionResultsPage"));
const SportTournamentCommandCenter = lazy(() => import("./pages/SportTournamentCommandCenter"));
const SportTournamentDirectory = lazy(() => import("./pages/SportTournamentDirectory"));
const SportTournamentWorkspace = lazy(() => import("./pages/SportTournamentWorkspace"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

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

export default function AppRouter() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppShell>
                  <AccountSettingsPage />
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
                <FestivalRootRedirect />
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
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
