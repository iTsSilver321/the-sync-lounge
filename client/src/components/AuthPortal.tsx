"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, User, LogIn, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthPortal() {
  const router = useRouter();
  const [view, setView] = useState<"menu" | "login" | "register" | "guest">("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestCode, setGuestCode] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else {
        // Check if user has a couple_id
        const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', data.user.id).single();
        if (profile?.couple_id) {
             router.push(`/room/${profile.couple_id}`); // Go to persistent room
        } else {
             router.push('/onboarding'); // Go to "Link Partner" screen
        }
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email for the confirmation link!");
    setLoading(false);
  };

  const handleGuest = () => {
     if (!guestCode) {
        // Create random room
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        router.push(`/room/${code}`);
     } else {
        router.push(`/room/${guestCode.toUpperCase()}`);
     }
  };

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />

        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 mb-2">
                UsTime
            </h1>
            <p className="text-zinc-400 text-sm">Your Digital Sanctuary</p>
        </div>

        <AnimatePresence mode="wait">
            {/* 1. MAIN MENU */}
            {view === "menu" && (
                <motion.div 
                    key="menu"
                    variants={variants} initial="hidden" animate="visible" exit="exit"
                    className="space-y-4"
                >
                    <button onClick={() => setView("login")} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-3 font-medium transition-all hover:scale-[1.02]">
                        <LogIn size={20} /> Login to Account
                    </button>
                    <button onClick={() => setView("register")} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02]">
                        <Heart size={20} fill="currentColor" /> Create Couple Account
                    </button>
                    <div className="relative flex items-center justify-center py-2">
                        <div className="h-px bg-zinc-800 w-full"></div>
                        <span className="absolute bg-black/50 px-2 text-xs text-zinc-500 uppercase">Quick Play</span>
                    </div>
                    <button onClick={() => setView("guest")} className="w-full py-3 text-zinc-400 hover:text-white text-sm">
                        Enter as Guest
                    </button>
                </motion.div>
            )}

            {/* 2. LOGIN / REGISTER FORM */}
            {(view === "login" || view === "register") && (
                <motion.div 
                    key="auth"
                    variants={variants} initial="hidden" animate="visible" exit="exit"
                    className="space-y-4"
                >
                    <input 
                        type="email" placeholder="Email" 
                        className="w-full bg-black/30 border border-zinc-700 p-4 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                    />
                    <input 
                        type="password" placeholder="Password" 
                        className="w-full bg-black/30 border border-zinc-700 p-4 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    <button 
                        onClick={view === "login" ? handleLogin : handleSignUp}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        {loading ? <Sparkles className="animate-spin" /> : (view === "login" ? "Enter Lounge" : "Start Journey")}
                    </button>

                    <button onClick={() => setView("menu")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300">
                        ← Back
                    </button>
                </motion.div>
            )}

            {/* 3. GUEST MODE */}
            {view === "guest" && (
                <motion.div 
                    key="guest"
                    variants={variants} initial="hidden" animate="visible" exit="exit"
                    className="space-y-4"
                >
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-xs text-center">
                        ⚠️ Guest memories are lost when you close the tab.
                    </div>
                    <input 
                        type="text" placeholder="Room Code (Optional)" 
                        className="w-full bg-black/30 border border-zinc-700 p-4 rounded-xl text-white text-center uppercase tracking-widest"
                        value={guestCode} onChange={(e) => setGuestCode(e.target.value)}
                    />
                    <button 
                        onClick={handleGuest}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
                    >
                        {guestCode ? "Join Room" : "Create Instant Room"}
                    </button>
                    <button onClick={() => setView("menu")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300">
                        ← Back
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}