import { io } from "socket.io-client";

// Use the environment variable if available (Production), otherwise fallback to localhost (Development)
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

console.log("🔌 Socket connecting to:", URL);

export const socket = io(URL, {
  autoConnect: false, // We manually connect in components
  transports: ['websocket', 'polling'], // Fallback to polling if websocket fails (important for some networks)
  withCredentials: true,
});