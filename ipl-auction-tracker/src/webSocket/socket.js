import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
export const socket = io(SOCKET_URL, { autoConnect: false });

export const connectSocket = () => {
  console.log("tryyyyyyyyyyyyyyyyyyy 222222222");
  if (!socket.connected) {
    socket.connect();
    console.log("success 111");
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
