"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SwipeGame from "@/components/SwipeGame";
import MindMeld from "@/components/MindMeld";
import SharedCanvas from "@/components/SharedCanvas";
import { Film, Brain, Palette, BookHeart, Zap, CalendarHeart } from "lucide-react";
import Memories from "@/components/Memories";
import TruthDare from "@/components/TruthDare";
import DailyPulse from "@/components/DailyPulse"; // Import the new component
import { supabase } from "@/lib/supabase"; // Import supabase

export default function GameRoom() {
  const params = useParams();
  const roomId = params.id as string;

  const [activeTab, setActiveTab] = useState<"movies" | "mind" | "canvas" | "memories" | "truth" | "daily">("movies");
  const [user, setUser] = useState<any>(null);

  // Fetch the logged-in user when the page loads
  useEffect(() => {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
    };
    getUser();
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white">
      
      {/* Header */}
      <header className="p-6 text-center z-10">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          UsTime
        </h1>
        <div className="mt-2 inline-block px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
          <span className="text-xs text-zinc-400 tracking-widest font-mono">ROOM: {roomId}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md mx-auto overflow-hidden">
        <div className={`w-full h-full ${activeTab === "movies" ? "flex" : "hidden"}`}><SwipeGame /></div>
        <div className={`w-full h-full ${activeTab === "mind" ? "flex" : "hidden"}`}><MindMeld /></div>
        <div className={`w-full h-full ${activeTab === "canvas" ? "flex" : "hidden"}`}><SharedCanvas /></div>
        <div className={`w-full h-full ${activeTab === "truth" ? "flex" : "hidden"}`}><TruthDare /></div>
        <div className={`w-full h-full ${activeTab === "memories" ? "flex" : "hidden"}`}><Memories /></div>
        
        {/* DAILY TAB - Only show if user is loaded */}
        <div className={`w-full h-full ${activeTab === "daily" ? "flex" : "hidden"}`}>
            {user && <DailyPulse user={user} />}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 p-4 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around items-center z-50 pb-8 overflow-x-auto">
        
        <button onClick={() => setActiveTab("movies")} className={`flex flex-col items-center gap-1 ${activeTab === "movies" ? "text-purple-400" : "text-zinc-600"}`}>
          <Film size={20} /><span className="text-[9px] uppercase">Movies</span>
        </button>
        
        <button onClick={() => setActiveTab("daily")} className={`flex flex-col items-center gap-1 ${activeTab === "daily" ? "text-purple-400" : "text-zinc-600"}`}>
          <CalendarHeart size={20} /><span className="text-[9px] uppercase">Daily</span>
        </button>

        <button onClick={() => setActiveTab("truth")} className={`flex flex-col items-center gap-1 ${activeTab === "truth" ? "text-purple-400" : "text-zinc-600"}`}>
          <Zap size={20} /><span className="text-[9px] uppercase">Play</span>
        </button>

        <button onClick={() => setActiveTab("canvas")} className={`flex flex-col items-center gap-1 ${activeTab === "canvas" ? "text-purple-400" : "text-zinc-600"}`}>
          <Palette size={20} /><span className="text-[9px] uppercase">Canvas</span>
        </button>

        <button onClick={() => setActiveTab("memories")} className={`flex flex-col items-center gap-1 ${activeTab === "memories" ? "text-purple-400" : "text-zinc-600"}`}>
          <BookHeart size={20} /><span className="text-[9px] uppercase">Memory</span>
        </button>
        
        {/* Mind Meld moved to 'Play' or kept separate? Keeping it separate for now as per request */}
        <button onClick={() => setActiveTab("mind")} className={`flex flex-col items-center gap-1 ${activeTab === "mind" ? "text-purple-400" : "text-zinc-600"}`}>
          <Brain size={20} /><span className="text-[9px] uppercase">Mind</span>
        </button>

      </nav>
    </main>
  );
}