import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuctionPage from "./pages/AuctionPage";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import LiveAuctionPage from "./pages/LiveAuctionPage";
import SpectatorAuctionPage from "./pages/SpectatorAuctionPage";

import { connectSocket, disconnectSocket, socket } from "./webSocket/socket";
import { useEffect } from "react";

export default function AppRouter() {
  useEffect(() => {
    connectSocket();

    // return () => {
    //   disconnectSocket();
    // };
  }, []);
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/start-live-auction" element={<LiveAuctionPage />} />
          <Route path="/live-auction" element={<AuctionPage />} />
          <Route
            path="/spectator-live-auction"
            element={<SpectatorAuctionPage />}
          />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
