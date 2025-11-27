"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import SwipeGame from "@/components/SwipeGame";
import MindMeld from "@/components/MindMeld";
import SharedCanvas from "@/components/SharedCanvas";
import { Film, Brain, Palette } from "lucide-react";
import Memories from "@/components/Memories";
import { BookHeart } from "lucide-react";

export default function GameRoom() {
  // 1. Get the Room ID from the URL
  const params = useParams();
  const roomId = params.id as string;

  // 2. State for the navigation tabs
  const [activeTab, setActiveTab] = useState<"movies" | "mind" | "canvas" | "memories">("movies");

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white">
      
      {/* Header showing the Room Code */}
      <header className="p-6 text-center z-10">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          UsTime
        </h1>
        <div className="mt-2 inline-block px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
          <span className="text-xs text-zinc-400 tracking-widest font-mono">ROOM: {roomId}</span>
        </div>
      </header>

      {/* Main Content Area */}
      {/* We use 'hidden' instead of conditional rendering to keep the game state alive */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md mx-auto overflow-hidden">
        
        {/* Movies Tab */}
        <div className={`w-full h-full ${activeTab === "movies" ? "flex" : "hidden"}`}>
          <SwipeGame />
        </div>

        {/* Mind Meld Tab */}
        <div className={`w-full h-full ${activeTab === "mind" ? "flex" : "hidden"}`}>
          <MindMeld />
        </div>

        {/* Canvas Tab */}
        <div className={`w-full h-full ${activeTab === "canvas" ? "flex" : "hidden"}`}>
          <SharedCanvas />
        </div>

        {/* Memories Tab */}
        <div className={`w-full h-full ${activeTab === "memories" ? "flex" : "hidden"}`}>
          <Memories />
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      {/* "left-1/2 -translate-x-1/2" centers the fixed bar on mobile */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 p-4 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around items-center z-50 pb-8">
        
        <button 
          onClick={() => setActiveTab("movies")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "movies" ? "text-purple-400" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <Film size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Movies</span>
        </button>

        <button 
          onClick={() => setActiveTab("mind")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "mind" ? "text-purple-400" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <Brain size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Mind Meld</span>
        </button>

        <button 
          onClick={() => setActiveTab("canvas")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "canvas" ? "text-purple-400" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <Palette size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Canvas</span>
        </button>

        <button 
          onClick={() => setActiveTab("memories")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "memories" ? "text-purple-400" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <BookHeart size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Memories</span>
        </button>
      </nav>
    </main>
  );
}