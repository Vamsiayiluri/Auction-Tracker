import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { AccessDeniedState } from "./ProductState";

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
  if (!user.mustChangePassword && location.pathname === "/change-password") {
    return <Navigate to="/dashboard" replace />;
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

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};
