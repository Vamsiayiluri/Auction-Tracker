import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!navigator.onLine) {
      error.isOffline = true;
      error.friendlyMessage =
        "You appear to be offline. Check your connection and try again.";
    } else if (error.code === "ECONNABORTED") {
      error.isTimeout = true;
      error.friendlyMessage = "The request timed out. Please try again.";
    } else if (error.response?.status >= 500) {
      error.isServerUnavailable = true;
      error.friendlyMessage =
        "The server is temporarily unavailable. Please try again.";
    } else if (error.response?.status === 401) {
      error.isAuthenticationFailure = true;
      error.friendlyMessage = "Your session has expired. Please sign in again.";
    }
    return Promise.reject(error);
  }
);

export default api;
