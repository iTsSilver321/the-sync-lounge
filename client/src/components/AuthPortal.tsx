"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, LogIn, Heart, Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthPortal() {
  const router = useRouter();
  const [view, setView] = useState<"menu" | "login" | "register" | "guest">("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestCode, setGuestCode] = useState("");
  
  // Custom Error/Success State
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const clearMessage = () => setMessage(null);

  const handleLogin = async () => {
    setLoading(true);
    clearMessage();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        setMessage({ type: 'error', text: error.message });
    } else {
        const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', data.user.id).single();
        router.push(profile?.couple_id ? `/room/${profile.couple_id}` : '/onboarding');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    clearMessage();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
        setMessage({ type: 'error', text: error.message });
    } else {
        setMessage({ type: 'success', text: "Confirmation email sent! Check your inbox." });
    }
    setLoading(false);
  };

  const handleGuest = () => {
     const code = guestCode ? guestCode.toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase();
     router.push(`/room/${code}`);
  };

  const variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-[2rem] relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-[80px]" />
        
        <div className="text-center mb-10 relative z-10">
            <h1 className="text-5xl font-bold tracking-tighter text-white mb-2 drop-shadow-lg">
                UsTime
            </h1>
            <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">Digital Sanctuary for Two</p>
        </div>

        <div className="min-h-[300px] relative z-10">
        <AnimatePresence mode="wait">
            {/* MENU */}
            {view === "menu" && (
                <motion.div key="menu" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                    <button onClick={() => { setView("login"); clearMessage(); }} className="w-full group relative overflow-hidden p-4 rounded-2xl glass-input hover:bg-white/5 transition-all btn-bounce flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors"><LogIn size={18} className="text-zinc-300" /></div>
                        <div className="text-left"><p className="font-bold text-white">Sign In</p><p className="text-xs text-zinc-500">Continue your journey</p></div>
                        <ArrowRight className="ml-auto text-zinc-600 group-hover:text-white transition-colors" size={16} />
                    </button>

                    <button onClick={() => { setView("register"); clearMessage(); }} className="w-full group p-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/20 hover:border-purple-500/40 transition-all btn-bounce flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center"><Heart size={18} className="text-purple-300" /></div>
                        <div className="text-left"><p className="font-bold text-white">New Couple</p><p className="text-xs text-purple-300/70">Create a shared space</p></div>
                    </button>

                    <div className="pt-4 flex justify-center">
                        <button onClick={() => { setView("guest"); clearMessage(); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                            Just passing through? <span className="underline decoration-zinc-700">Guest Mode</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* LOGIN / REGISTER */}
            {(view === "login" || view === "register") && (
                <motion.div key="auth" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                    
                    {/* Inline Notification */}
                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: "auto" }} 
                                exit={{ opacity: 0, height: 0 }}
                                className={`rounded-xl p-3 flex items-start gap-3 text-xs ${message.type === 'error' ? 'bg-red-500/10 text-red-200 border border-red-500/20' : 'bg-green-500/10 text-green-200 border border-green-500/20'}`}
                            >
                                {message.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
                                <span>{message.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input type="email" placeholder="hello@you.com" className="w-full glass-input p-4 pl-12 rounded-xl text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input type="password" placeholder="••••••••" className="w-full glass-input p-4 pl-12 rounded-xl text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    
                    <button onClick={view === "login" ? handleLogin : handleSignUp} disabled={loading} className="w-full py-4 mt-2 bg-white text-black rounded-xl font-bold btn-bounce shadow-lg shadow-white/10 disabled:opacity-50 flex justify-center items-center gap-2">
                        {loading ? <Sparkles size={18} className="animate-spin" /> : (view === "login" ? "Unlock Space" : "Begin Together")}
                    </button>
                    <button onClick={() => setView("menu")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-2">Cancel</button>
                </motion.div>
            )}

            {/* GUEST */}
            {view === "guest" && (
                <motion.div key="guest" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10"><KeyRound size={24} className="text-zinc-400" /></div>
                    <div className="relative">
                        <input type="text" placeholder="ROOM CODE (OPTIONAL)" maxLength={6} className="w-full glass-input p-4 rounded-xl text-center font-mono tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:font-sans" value={guestCode} onChange={(e) => setGuestCode(e.target.value)} />
                    </div>
                    <button onClick={handleGuest} className="w-full py-4 bg-white text-black rounded-xl font-bold btn-bounce">{guestCode ? "Join Room" : "Create Instant Room"}</button>
                    <button onClick={() => setView("menu")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    </div>
  );
}