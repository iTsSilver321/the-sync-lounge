import { io } from "socket.io-client";

// If we are in production, use the Environment Variable. 
// If we are local, use localhost:3001.
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

console.log("Attempting to connect socket to:", URL);

export const socket = io(URL, {
  autoConnect: false, // We connect manually in the useEffect
});