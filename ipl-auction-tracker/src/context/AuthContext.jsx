import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { connectSocket, disconnectSocket } from "../webSocket/socket";

const getStoredUser = () => {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!token || token === "undefined" || !storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const login = (userData, token) => {
    if (!token || !userData) return;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    if (!userData.mustChangePassword) {
      connectSocket(token);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    setUser(null);
  };

  const updateUser = (userData) => {
    if (!userData) return;
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [user]);

  const value = useMemo(
    () => ({ user, login, logout, updateUser }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
