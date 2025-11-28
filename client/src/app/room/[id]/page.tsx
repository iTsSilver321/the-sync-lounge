"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SwipeGame from "@/components/SwipeGame";
import MindMeld from "@/components/MindMeld";
import SharedCanvas from "@/components/SharedCanvas";
import { Film, Brain, Palette, BookHeart, Zap, CalendarHeart, User } from "lucide-react";
import Memories from "@/components/Memories";
import TruthDare from "@/components/TruthDare";
import DailyPulse from "@/components/DailyPulse";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function GameRoom() {
  const params = useParams();
  const roomId = params.id as string;

  const [activeTab, setActiveTab] = useState<"movies" | "mind" | "canvas" | "memories" | "truth" | "daily">("movies");
  const [user, setUser] = useState<any>(null);

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
      <header className="p-6 text-center z-10 relative">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          UsTime
        </h1>
        <div className="mt-2 inline-block px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
          <span className="text-xs text-zinc-400 tracking-widest font-mono">ROOM: {roomId}</span>
        </div>
        
        {/* Profile Link */}
        <Link href="/profile" className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
             <User size={20} className="text-zinc-400" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md mx-auto overflow-hidden">
        
        <div className={`w-full h-full ${activeTab === "movies" ? "flex" : "hidden"}`}>
            <SwipeGame />
        </div>
        
        <div className={`w-full h-full ${activeTab === "mind" ? "flex" : "hidden"}`}>
            {/* FIX: Conditionally render to ensure user exists before mounting */}
            {user ? <MindMeld user={user} /> : <div className="flex items-center justify-center h-full text-zinc-500">Loading User...</div>}
        </div>

        <div className={`w-full h-full ${activeTab === "truth" ? "flex" : "hidden"}`}>
             {/* FIX: Conditionally render */}
             {user ? <TruthDare user={user} /> : <div className="flex items-center justify-center h-full text-zinc-500">Loading User...</div>}
        </div>

        <div className={`w-full h-full ${activeTab === "canvas" ? "flex" : "hidden"}`}>
            <SharedCanvas />
        </div>
        
        <div className={`w-full h-full ${activeTab === "memories" ? "flex" : "hidden"}`}>
            <Memories />
        </div>
        
        <div className={`w-full h-full ${activeTab === "daily" ? "flex" : "hidden"}`}>
             {user ? <DailyPulse user={user} /> : <div className="flex items-center justify-center h-full text-zinc-500">Loading Daily...</div>}
        </div>

      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 p-4 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around items-center z-50 pb-8 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab("movies")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "movies" ? "text-purple-400" : "text-zinc-600"}`}>
          <Film size={20} /><span className="text-[9px] uppercase">Movies</span>
        </button>
        <button onClick={() => setActiveTab("daily")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "daily" ? "text-purple-400" : "text-zinc-600"}`}>
          <CalendarHeart size={20} /><span className="text-[9px] uppercase">Daily</span>
        </button>
        <button onClick={() => setActiveTab("truth")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "truth" ? "text-purple-400" : "text-zinc-600"}`}>
          <Zap size={20} /><span className="text-[9px] uppercase">Play</span>
        </button>
        <button onClick={() => setActiveTab("canvas")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "canvas" ? "text-purple-400" : "text-zinc-600"}`}>
          <Palette size={20} /><span className="text-[9px] uppercase">Canvas</span>
        </button>
        <button onClick={() => setActiveTab("memories")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "memories" ? "text-purple-400" : "text-zinc-600"}`}>
          <BookHeart size={20} /><span className="text-[9px] uppercase">Memory</span>
        </button>
        <button onClick={() => setActiveTab("mind")} className={`flex flex-col items-center gap-1 min-w-[50px] ${activeTab === "mind" ? "text-purple-400" : "text-zinc-600"}`}>
          <Brain size={20} /><span className="text-[9px] uppercase">Mind</span>
        </button>
      </nav>
    </main>
  );
}