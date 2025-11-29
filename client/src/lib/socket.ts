import { io } from "socket.io-client";
import { supabase } from "./supabase";

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  // We will inject the token dynamically before connecting
});

export const connectSocket = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    socket.auth = { token }; // Send token to server
    if (!socket.connected) {
        socket.connect();
    }
  } else {
    console.error("🔒 Cannot connect: No Auth Session");
  }
};