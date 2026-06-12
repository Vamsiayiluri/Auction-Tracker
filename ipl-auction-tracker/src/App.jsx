import {
  BrowserRouter as Router,
  Routes,
  Route,
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
import FestivalAuctionDirectory from "./pages/FestivalAuctionDirectory";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import AppShell from "./components/AppShell";
import {
  DefaultRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/RouteGuards";

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
            path="/festivals/:festivalId/live-auction"
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
            path="/festival-auctions"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "team_owner", "spectator"]}
              >
                <AppShell>
                  <FestivalAuctionDirectory />
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
