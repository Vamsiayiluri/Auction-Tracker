import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export const GuestRoute = ({ children }) => {
  const { user } = useAuth();

  return user ? <Navigate to="/dashboard" replace /> : children;
};

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const DefaultRoute = () => {
  const { user } = useAuth();

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};
