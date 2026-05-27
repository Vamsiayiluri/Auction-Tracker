import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuctionPage from "./pages/AuctionPage";

import AuthProvider from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import LiveAuctionPage from "./pages/LiveAuctionPage";
import SpectatorAuctionPage from "./pages/SpectatorAuctionPage";
import AppShell from "./components/AppShell";
import {
  DefaultRoute,
  GuestRoute,
  ProtectedRoute,
} from "./components/RouteGuards";

import { connectSocket } from "./webSocket/socket";
import { useEffect } from "react";

export default function AppRouter() {
  useEffect(() => {
    connectSocket();
  }, []);
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
