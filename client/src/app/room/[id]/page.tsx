"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import SwipeGame from "@/components/SwipeGame";
import MindMeld from "@/components/MindMeld";
import SharedCanvas from "@/components/SharedCanvas";
import Memories from "@/components/Memories";
import TruthDare from "@/components/TruthDare";
import DailyPulse from "@/components/DailyPulse";
import ProfileLab from "@/components/ProfileLab";
import ProfileCard from "@/components/ProfileCard";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Film, Brain, Palette, BookHeart, Zap, CalendarHeart, LogOut, Loader2, Heart, User, Settings } from "lucide-react";
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
  const router = useRouter(); // Initialize Router
  const roomId = params.id as string;
  
  // State
  const [activeTab, setActiveTab] = useState("movies");
  const [user, setUser] = useState<any>(null);
  
  // Profile State
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [showProfileLab, setShowProfileLab] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  
  // Animation Controls
  const heartControls = useAnimation();
  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || "The Lounge";

  // --- INITIALIZATION & SYNC ---
  useEffect(() => {
    const init = async () => {
        const { data: userData } = await supabase.auth.getUser();
        if(!userData.user) return;
        setUser(userData.user);

        // 1. Fetch Initial Profiles
        fetchProfiles(userData.user.id);

        // 2. Realtime Profile Updates (Sync Aura/Avatar instantly)
        const channel = supabase
            .channel('room-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `couple_id=eq.${roomId}` }, 
                () => fetchProfiles(userData.user.id)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };
    
    init();
    
    // 3. Secure Socket Connection
    connectSocket(); 
    
    // 4. Heartbeat Listener
    const handleHeartbeat = async () => {
        playMatch(); // Heartbeat sound
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([50, 100, 50]);
        await heartControls.start({ scale: [1, 1.5, 1], color: ["#ffffff", "#ec4899", "#ffffff"], transition: { duration: 0.4 } });
    };

    socket.on("heart:beat", handleHeartbeat);
    return () => { socket.off("heart:beat", handleHeartbeat); };
  }, []);

  const fetchProfiles = async (myUserId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('couple_id', roomId);
      if (data) {
          setMyProfile(data.find((p: any) => p.id === myUserId));
          setPartnerProfile(data.find((p: any) => p.id !== myUserId));
      }
  };

  const sendHeartbeat = () => {
      socket.emit("heart:beat");
      heartControls.start({ scale: [1, 0.8, 1.2, 1], transition: { duration: 0.3 } });
  };

  // --- NEW LOGOUT HANDLER ---
  const handleLogout = async () => {
      // 1. Disconnect Socket
      if (socket.connected) socket.disconnect();
      
      // 2. Clear Session
      await supabase.auth.signOut();
      
      // 3. Go Home
      router.push("/");
  };

  // Determine Theme Color based on My Aura (Default Purple)
  const themeColor = myProfile?.aura_color || "#A855F7";

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white relative overflow-hidden">
      
      {/* Dynamic Background Ambience (Uses Aura) */}
      <div className="fixed inset-0 pointer-events-none transition-colors duration-1000">
          <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20" style={{ backgroundColor: themeColor }} />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-pink-900/20 rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-3">
            
            {/* DOUBLE BUBBLE AVATAR (Click to View Card) */}
            <div className="relative w-12 h-10 cursor-pointer" onClick={() => setViewingProfile(partnerProfile || myProfile)}>
                {/* Partner (Behind) */}
                <div className="absolute right-0 top-0 w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-800 overflow-hidden shadow-lg">
                    {partnerProfile?.avatar_url ? (
                        <img src={partnerProfile.avatar_url} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full bg-zinc-700" />}
                </div>
                {/* Me (Front) */}
                <div className="absolute left-0 bottom-0 w-9 h-9 rounded-full border-2 border-zinc-950 bg-zinc-800 overflow-hidden shadow-xl z-10 transition-transform hover:scale-110">
                    {myProfile?.avatar_url ? (
                        <img src={myProfile.avatar_url} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full bg-zinc-600 flex items-center justify-center"><User size={14} /></div>}
                </div>
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
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                    <span className="text-[10px] font-mono uppercase tracking-widest">
                        {myProfile?.display_name && partnerProfile?.display_name ? "Connected" : "Setup Required"}
                    </span>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={() => setShowProfileLab(true)} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <Settings size={16} />
            </button>
            {/* CHANGED: Replaced Link with Button */}
            <button onClick={handleLogout} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <LogOut size={16} />
            </button>
        </div>
      </header>

      {/* CONTENT AREA */}
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
                
                {activeTab === "daily" && user && (
                    <DailyPulse user={user} partnerProfile={partnerProfile} /> 
                )}
                
                {activeTab === "truth" && user && (
                    <TruthDare user={user} partnerProfile={partnerProfile} /> 
                )}
                
                {activeTab === "canvas" && (
                    <SharedCanvas partnerProfile={partnerProfile} /> 
                )}
                
                {activeTab === "mind" && user && (
                    <MindMeld user={user} partnerProfile={partnerProfile} /> 
                )}
                
                {activeTab === "memories" && <Memories />}
                
                {/* Fallback Loading */}
                {!user && activeTab !== "movies" && activeTab !== "canvas" && activeTab !== "memories" && (
                    <div className="text-zinc-500 flex gap-2 items-center"><Loader2 className="animate-spin" size={16}/> Syncing Profile...</div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>

      {/* HEARTBEAT (Using Gradient of Both Auras) */}
      <div className="fixed bottom-24 right-6 z-50">
          <motion.button
            animate={heartControls}
            onClick={sendHeartbeat}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border border-white/20 active:scale-90 transition-transform"
            style={{ 
                background: `linear-gradient(135deg, ${themeColor}, ${partnerProfile?.aura_color || "#EC4899"})`,
                boxShadow: `0 10px 30px -10px ${themeColor}80`
            }}
          >
              <Heart fill="white" size={24} className="text-white" />
          </motion.button>
      </div>

      {/* DOCK */}
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
                                />
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 0.4 }}
                                    className="absolute inset-0 rounded-xl blur-lg -z-20"
                                    style={{ backgroundColor: themeColor, opacity: 0.3 }}
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

      {/* === MODALS === */}
      
      {/* 1. Profile Editor (Lab) */}
      <AnimatePresence>
        {showProfileLab && myProfile && (
            <ProfileLab 
                user={user} 
                initialProfile={myProfile} 
                onClose={() => setShowProfileLab(false)} 
            />
        )}
      </AnimatePresence>

      {/* 2. Profile Card (Viewer) */}
      <AnimatePresence>
        {viewingProfile && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setViewingProfile(null)}>
                <div onClick={(e) => e.stopPropagation()}>
                    <ProfileCard 
                        profile={viewingProfile} 
                        isOwnProfile={viewingProfile.id === user?.id} 
                    />
                    
                    {/* If it's my profile, show Edit button below card */}
                    {viewingProfile.id === user?.id && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => { setViewingProfile(null); setShowProfileLab(true); }}
                            className="mt-6 w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Settings size={16} /> Edit Profile
                        </motion.button>
                    )}
                </div>
            </div>
        )}
      </AnimatePresence>

    </main>
  );
}