import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { AccessDeniedState, ProductStateCard } from "./ProductState";

export const GuestRoute = ({ children }) => {
  const { user } = useAuth();

  return user ? <Navigate to="/dashboard" replace /> : children;
};

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <AccessDeniedState
        onAction={() => navigate("/dashboard", { replace: true })}
      />
    );
  }

  return children;
};

export const DefaultRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProductStateCard
      eyebrow="404 Not Found"
      title="This page does not exist"
      message="The URL you entered doesn't match any page in AuctionArena. Check the address or return to your dashboard."
      actionLabel="Go to Dashboard"
      onAction={() => navigate("/dashboard", { replace: true })}
    />
  );
};
