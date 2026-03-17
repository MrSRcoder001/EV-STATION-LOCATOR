import { io } from "socket.io-client";
import server from "./environment";
let socket = null;
export function connectSocket(token, user) {
  if (socket) return socket;
  socket = io(server, { auth: { token } });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    if (user && user._id) {
      socket.emit("auth:join", { userId: user._id, role: user.role });
    }
  });

  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }
