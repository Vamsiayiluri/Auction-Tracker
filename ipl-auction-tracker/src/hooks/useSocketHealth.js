import { useEffect, useState } from "react";
import { getSocketHealth, socket } from "../webSocket/socket";

export default function useSocketHealth() {
  const [health, setHealth] = useState(getSocketHealth);

  useEffect(() => {
    const update = () => setHealth(getSocketHealth());
    socket.on("connect", update);
    socket.on("disconnect", update);
    socket.io.on("reconnect_attempt", update);
    socket.io.on("reconnect_failed", update);
    socket.io.on("reconnect", update);
    socket.io.on("error", update);
    socket.on("connect_error", update);
    return () => {
      socket.off("connect", update);
      socket.off("disconnect", update);
      socket.io.off("reconnect_attempt", update);
      socket.io.off("reconnect_failed", update);
      socket.io.off("reconnect", update);
      socket.io.off("error", update);
      socket.off("connect_error", update);
    };
  }, []);

  return health;
}
