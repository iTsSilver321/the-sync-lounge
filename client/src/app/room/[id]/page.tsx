"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SwipeGame from "@/components/SwipeGame";
import MindMeld from "@/components/MindMeld";
import SharedCanvas from "@/components/SharedCanvas";
import Memories from "@/components/Memories";
import TruthDare from "@/components/TruthDare";
import DailyPulse from "@/components/DailyPulse";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Film, Brain, Palette, BookHeart, Zap, CalendarHeart, LogOut, Loader2, Heart } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import { socket, connectSocket } from "@/lib/socket";

const TABS = [
  { id: "movies", icon: Film, label: "Cinema" },
  { id: "daily", icon: CalendarHeart, label: "Daily" },
  { id: "truth", icon: Zap, label: "Play" },
  { id: "canvas", icon: Palette, label: "Draw" },
  { id: "mind", icon: Brain, label: "Mind" },
  { id: "memories", icon: BookHeart, label: "Memory" },
];

export default function GameRoom() {
  const { playMatch } = useGameSounds(); 
  const params = useParams();
  const roomId = params.id as string;
  const [activeTab, setActiveTab] = useState("movies");
  const [user, setUser] = useState<any>(null);
  
  // Heartbeat Controls
  const heartControls = useAnimation();

  // Get current label
  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || "The Lounge";

  useEffect(() => {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
    };
    getUser();

    // --- HEARTBEAT LISTENER ---
    connectSocket(); 
    
    const handleHeartbeat = async () => {
        playMatch();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
        await heartControls.start({ 
            scale: [1, 1.5, 1], 
            color: ["#ffffff", "#ec4899", "#ffffff"],
            transition: { duration: 0.4 } 
        });
    };

    socket.on("heart:beat", handleHeartbeat);

    return () => {
        socket.off("heart:beat", handleHeartbeat);
    };
  }, []);

  const sendHeartbeat = () => {
      socket.emit("heart:beat");
      heartControls.start({ scale: [1, 0.8, 1.2, 1], transition: { duration: 0.3 } });
  };

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-pink-900/20 rounded-full blur-[100px]" />
      </div>

      {/* 1. CINEMATIC HEADER */}
      <header className="p-6 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/50">
                <span className="font-bold text-white text-xs">Us</span>
            </div>
            <div>
                {/* DYNAMIC TITLE */}
                <motion.h1 
                    key={activeTabLabel}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-bold text-white leading-none uppercase tracking-wide"
                >
                    {activeTabLabel}
                </motion.h1>
                <div className="flex items-center gap-1 opacity-50 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">{roomId}</span>
                </div>
            </div>
        </div>
        
        <Link href="/" className="w-10 h-10 glass-panel rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
             <LogOut size={16} />
        </Link>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md mx-auto z-10 px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex flex-col items-center justify-center"
            >
                {activeTab === "movies" && <SwipeGame />}
                {activeTab === "daily" && user && <DailyPulse user={user} />}
                {activeTab === "truth" && user && <TruthDare user={user} />}
                {activeTab === "canvas" && <SharedCanvas />}
                {activeTab === "mind" && user && <MindMeld user={user} />}
                {activeTab === "memories" && <Memories />}
                {!user && activeTab !== "movies" && activeTab !== "canvas" && activeTab !== "memories" && (
                    <div className="text-zinc-500 flex gap-2 items-center"><Loader2 className="animate-spin" size={16}/> Syncing Profile...</div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. HEARTBEAT BUTTON */}
      <div className="fixed bottom-24 right-6 z-50">
          <motion.button
            animate={heartControls}
            onClick={sendHeartbeat}
            className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 border border-white/20 active:scale-90 transition-transform"
          >
              <Heart fill="white" size={24} className="text-white" />
          </motion.button>
      </div>

      {/* 4. FLOATING DOCK NAVIGATION */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[400px] z-50">
        <div className="glass-panel rounded-2xl p-2 flex justify-between items-end shadow-2xl shadow-black/50 backdrop-blur-xl border-white/10">
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative flex-1 flex flex-col items-center justify-center py-2 gap-1.5 group"
                    >
                        {isActive && (
                            <>
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-white/10 rounded-xl -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 0.4 }}
                                    className="absolute inset-0 bg-purple-500/30 rounded-xl blur-lg -z-20"
                                />
                            </>
                        )}
                        <span className={`relative z-10 transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                            <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </span>
                        <span className={`text-[9px] font-medium tracking-wide uppercase transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
      </div>
    </main>
  );
}