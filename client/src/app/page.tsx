"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds"; // Import hook

export default function Lobby() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  
  // We grab the playPop function just to trigger the audio engine
  const { playPop } = useGameSounds(); 

  const unlockAudioEngine = () => {
    // This plays a sound (or silence) to tell the browser "User is interacting!"
    playPop(); 
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudioEngine(); // <--- UNLOCK HERE
    if (roomCode.trim()) {
      router.push(`/room/${roomCode}`);
    }
  };

  const createRoom = () => {
    unlockAudioEngine(); // <--- UNLOCK HERE
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    router.push(`/room/${randomCode}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        
        {/* Hero Section */}
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-purple-500/10 rounded-full animate-pulse">
              <Sparkles className="w-12 h-12 text-purple-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            UsTime
          </h1>
          <p className="text-zinc-400">Your digital living room.</p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <button 
            onClick={createRoom}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg shadow-purple-900/20 hover:scale-[1.02] transition-transform"
          >
            Create New Room
          </button>

          <div className="relative flex items-center justify-center">
            <div className="h-px bg-zinc-800 w-full"></div>
            <span className="absolute bg-zinc-950 px-2 text-xs text-zinc-500 uppercase">Or join existing</span>
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Room Code" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-white focus:ring-2 focus:ring-purple-500 outline-none uppercase tracking-widest"
            />
            <button 
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl transition-colors"
            >
              <ArrowRight />
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}