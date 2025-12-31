import { io } from "socket.io-client";
import server from "./environment";
let socket = null;
export function connectSocket(token) {
  if (socket) return socket;
  socket = io({server}, { auth: { token } });
  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }
