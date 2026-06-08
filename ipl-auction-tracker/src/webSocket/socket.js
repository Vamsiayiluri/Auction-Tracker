import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
export const socket = io(SOCKET_URL, { autoConnect: false });

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
