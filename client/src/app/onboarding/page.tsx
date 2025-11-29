"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Copy, Loader2, ArrowRight, Users, Sparkles, AlertCircle } from "lucide-react";

export default function Onboarding() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [generatedCode, setGeneratedCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const waitingCoupleId = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/");
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', user.id)
        .single();
        
      if (profile?.couple_id) {
          router.push(`/room/${profile.couple_id}`);
      }
    };
    init();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "create" && waitingCoupleId.current) {
        interval = setInterval(async () => {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('couple_id', waitingCoupleId.current);

            if (count && count >= 2) {
                router.push(`/room/${waitingCoupleId.current}`);
            }
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [mode]);


  const createCouple = async () => {
    setLoading(true); setErrorMsg(null);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: couple, error: createError } = await supabase.from('couples').insert({ code }).select().single();
    if (createError) { setErrorMsg(createError.message); setLoading(false); return; }

    const { error: updateError } = await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', user.id);
    if (updateError) { setErrorMsg(updateError.message); setLoading(false); return; }

    waitingCoupleId.current = couple.id;
    setGeneratedCode(code);
    setMode("create");
    setLoading(false);
  };

  const joinCouple = async () => {
    setLoading(true); setErrorMsg(null);
    const { data: couple, error: findError } = await supabase.from('couples').select('id').eq('code', inputCode.toUpperCase()).single();
    if (findError || !couple) { setErrorMsg("Invalid or Expired Code"); setLoading(false); return; }

    const { error: updateError } = await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', user.id);
    if (updateError) { setErrorMsg(updateError.message); setLoading(false); return; }

    router.push(`/room/${couple.id}`);
  };

  // Animations
  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] p-6 relative overflow-hidden selection:bg-purple-500/30">
      
      <div className="absolute top-[-20%] left-[-20%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50vw] h-[50vw] bg-pink-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-pink-500 blur-xl opacity-20 rounded-full" />
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl rotate-3 flex items-center justify-center shadow-2xl border border-white/10 relative z-10">
              <Heart fill="white" className="text-white w-10 h-10 drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Connect Partner</h1>
          <p className="text-zinc-400 mt-2 text-sm">Link your accounts to sync forever.</p>
        </motion.div>

        <div className="glass-panel p-1 rounded-3xl border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden">
          <div className="p-6 md:p-8">
            
            {/* Error Banner */}
            <AnimatePresence>
                {errorMsg && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginBottom: 20 }} 
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2"
                    >
                        <AlertCircle size={16} /> {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              
              {/* MODE: SELECT */}
              {mode === "select" && (
                <motion.div key="select" variants={slideUp} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <button 
                    onClick={createCouple} 
                    disabled={loading}
                    className="group w-full p-5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-white/5 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02]"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Sparkles size={24} className="text-purple-300" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-white">I am the first one</h3>
                      <p className="text-xs text-zinc-400">I'll create a room & invite my partner</p>
                    </div>
                    <ArrowRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-white/5 flex-1" />
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">OR</span>
                    <div className="h-px bg-white/5 flex-1" />
                  </div>

                  <button 
                    onClick={() => setMode("join")} 
                    className="group w-full p-5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 transition-all hover:border-zinc-700"
                  >
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                      <Users size={24} className="text-zinc-400" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-zinc-200">I have a code</h3>
                      <p className="text-xs text-zinc-500">My partner already sent me one</p>
                    </div>
                  </button>
                </motion.div>
              )}

              {/* MODE: CREATE (WAITING) */}
              {mode === "create" && (
                <motion.div key="create" variants={slideUp} initial="hidden" animate="visible" exit="exit" className="text-center space-y-6">
                   <div>
                      <p className="text-zinc-400 text-sm uppercase tracking-widest mb-4">Share this code</p>
                      <div 
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                        className="bg-zinc-950 border-2 border-dashed border-purple-500/30 rounded-2xl p-6 relative cursor-pointer hover:border-purple-500/60 transition-colors group"
                      >
                        <span className="text-5xl font-mono font-black tracking-[0.2em] text-white drop-shadow-lg">
                            {generatedCode}
                        </span>
                        <div className="absolute top-3 right-3 text-zinc-600 group-hover:text-white transition-colors">
                           <Copy size={16} />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2">Tap to copy</p>
                      </div>
                   </div>

                   <div className="flex flex-col items-center gap-3 py-4 bg-white/5 rounded-xl">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                      <p className="text-sm text-zinc-300">Waiting for partner to join...</p>
                   </div>
                </motion.div>
              )}

              {/* MODE: JOIN */}
              {mode === "join" && (
                <motion.div key="join" variants={slideUp} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                   <div className="text-center">
                      <p className="text-zinc-400 text-sm mb-4">Enter the code from your partner</p>
                      <input 
                        type="text" 
                        autoFocus
                        maxLength={6}
                        value={inputCode}
                        onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setErrorMsg(null); }}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-purple-500 rounded-2xl p-6 text-center text-4xl font-mono font-bold text-white tracking-[0.2em] outline-none transition-all placeholder:text-zinc-800"
                        placeholder="------"
                      />
                   </div>

                   <button 
                      onClick={joinCouple}
                      disabled={loading || inputCode.length < 6}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                      {loading ? <Loader2 className="animate-spin" /> : "Connect Hearts"}
                   </button>
                   
                   <button onClick={() => setMode("select")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 mt-2">
                      Cancel
                   </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}