import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
export const socket = io(SOCKET_URL, { autoConnect: false });

const socketHealth = {
  status: socket.connected ? "connected" : "disconnected",
  reason: "",
  reconnectAttempt: 0,
  lastError: "",
  updatedAt: new Date().toISOString(),
};

const updateHealth = (next) => {
  Object.assign(socketHealth, next, {
    updatedAt: new Date().toISOString(),
  });
};

socket.on("connect", () =>
  updateHealth({
    status: "connected",
    reason: "",
    reconnectAttempt: 0,
    lastError: "",
  })
);
socket.on("disconnect", (reason) =>
  updateHealth({ status: "disconnected", reason })
);
socket.on("connect_error", (error) =>
  updateHealth({
    status: "disconnected",
    lastError: error?.message || "Socket connection failed",
  })
);
socket.io.on("reconnect_attempt", (attempt) =>
  updateHealth({ status: "reconnecting", reconnectAttempt: attempt })
);
socket.io.on("reconnect_failed", () =>
  updateHealth({ status: "disconnected", reason: "reconnect_failed" })
);
socket.io.on("reconnect", () =>
  updateHealth({
    status: "connected",
    reason: "",
    reconnectAttempt: 0,
    lastError: "",
  })
);

export const getSocketHealth = () => ({ ...socketHealth });

export const connectSocket = (token = localStorage.getItem("token")) => {
  if (!token || token === "undefined") return;

  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
  socket.auth = {};
};
