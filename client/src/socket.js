import { io } from "socket.io-client";

let socket = null;
export function connectSocket(token) {
  if (socket) return socket;
  socket = io("http://localhost:5000", { auth: { token } });
  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }
