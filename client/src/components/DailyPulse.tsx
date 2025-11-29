"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Send, Loader2, CheckCircle, Lock } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useParams } from "next/navigation"; 

// Update Props to accept partnerProfile
export default function DailyPulse({ user, partnerProfile }: { user: any, partnerProfile?: any }) {
  const { playMatch, playPop } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"loading" | "answering" | "waiting" | "complete">("loading");
  const statusRef = useRef(status); 

  const [question, setQuestion] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [partnerAnswer, setPartnerAnswer] = useState("");
  const [streak, setStreak] = useState(0);
  
  const coupleIdRef = useRef<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Identity Helpers
  const partnerName = partnerProfile?.display_name || "Partner";
  const partnerColor = partnerProfile?.aura_color || "#EC4899";

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join_room", roomId);

    fetchDaily();

    const handleNewQuestion = (text: string) => {
        setQuestion(text);
        if (statusRef.current === "loading") {
            setStatus("answering");
        }
        setLoading(false);

        if (coupleIdRef.current) {
             supabase.from('daily_sync').upsert({
                couple_id: coupleIdRef.current,
                date: today,
                question: text
            }, { onConflict: 'couple_id, date', ignoreDuplicates: true }).then();
        }
    };

    const handlePartnerSubmit = () => {
        fetchDaily();
    };

    socket.on("daily:new_question", handleNewQuestion);
    socket.on("daily:partner_submitted", handlePartnerSubmit);

    return () => { 
        socket.off("daily:new_question", handleNewQuestion);
        socket.off("daily:partner_submitted", handlePartnerSubmit);
    };
  }, []);

  const fetchDaily = async () => {
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('couple_id, streak_count').eq('id', user.id).single();
    if (!profile || !profile.couple_id) { setLoading(false); return; }
    
    coupleIdRef.current = profile.couple_id;
    setStreak(profile.streak_count || 0);

    const { data: daily } = await supabase
        .from('daily_sync')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .eq('date', today)
        .maybeSingle();

    if (!daily) {
        if (statusRef.current === "loading") {
             socket.emit("daily:generate");
        }
    } else {
        setQuestion(daily.question);
        
        const isUserA = daily.user_a === user.id;
        const isUserB = daily.user_b === user.id;
        
        const answerA = daily.answer_a;
        const answerB = daily.answer_b;
        
        const mine = isUserA ? answerA : (isUserB ? answerB : null);
        const theirs = isUserA ? answerB : answerA;

        if (answerA && answerB) {
            setStatus("complete");
            setMyAnswer(mine);
            setPartnerAnswer(theirs);
        } else if (mine) {
            setStatus("waiting");
            setMyAnswer(mine);
        } else {
            setStatus("answering");
        }
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!coupleIdRef.current) return;
    playPop();
    setLoading(true);
    
    const { data, error } = await supabase.rpc('submit_daily_answer', {
        p_couple_id: coupleIdRef.current,
        p_date: today,
        p_user_id: user.id,
        p_answer: myAnswer
    });

    if (error) {
        setLoading(false);
        return;
    }

    socket.emit("daily:submit");
    
    const isComplete = data.answer_a && data.answer_b;
    
    if (isComplete) { 
        setStatus("complete");
        playMatch();
        
        if (statusRef.current !== 'complete') {
            await supabase.from('profiles').update({ streak_count: streak + 1 }).eq('couple_id', coupleIdRef.current);
            setStreak(s => s + 1);
        }

        const amIA = data.user_a === user.id;
        setPartnerAnswer(amIA ? data.answer_b : data.answer_a);
    } else {
        setStatus("waiting");
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-full p-6 flex flex-col items-center pt-10 relative overflow-hidden">
       <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-500/20 border border-orange-500/50 px-3 py-1 rounded-full text-orange-400 text-xs font-bold">
          <Flame size={14} fill="currentColor" />
          <span>{streak} Day Streak</span>
       </div>

       <div className="w-full max-w-md mt-8">
          <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 text-center">Daily Pulse</h2>
          
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl mb-6 text-center relative">
             {loading && !question ? <Loader2 className="animate-spin mx-auto text-purple-400" /> : (
                 <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">"{question}"</p>
             )}
          </div>

          <AnimatePresence mode="wait">
            {status === "answering" && (
                <motion.div key="ans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                    <textarea 
                        value={myAnswer}
                        onChange={(e) => setMyAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full h-32 bg-zinc-900/50 border border-zinc-700 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500 transition-all resize-none"
                    />
                    <button onClick={handleSubmit} disabled={!myAnswer || loading} className="w-full py-4 bg-white text-black rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                        {loading ? "Saving..." : <>Post Daily <Send size={16} /></>}
                    </button>
                </motion.div>
            )}

            {status === "waiting" && (
                <motion.div 
                    key="wait" 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="text-center py-12"
             >
                    {/* Breathing Lock Animation */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }} 
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full blur-xl"
                        style={{ backgroundColor: partnerColor }}
                        />
                        <div className="relative w-full h-full bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center z-10 shadow-xl">
                            <Lock size={32} style={{ color: partnerColor }} />
                        </div>
                    </div>
        
                    <h3 className="text-2xl font-bold text-white mb-2">Answer Locked</h3>
                    <p className="text-zinc-400 text-sm max-w-[200px] mx-auto leading-relaxed">
                        Your answer is safe. Waiting for {partnerName} to sync up...
                    </p>
                </motion.div>
            )}

            {status === "complete" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 p-6 rounded-2xl border border-white/10">
                        <p className="text-xs text-purple-300 mb-2 font-bold">YOU</p>
                        <p className="text-white">{myAnswer}</p>
                    </div>
                    <div className="bg-zinc-800/40 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full" style={{ backgroundColor: partnerColor }} />
                        <div className="flex items-center gap-2 mb-2">
                            {partnerProfile?.avatar_url && (
                                <img src={partnerProfile.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                            )}
                            <p className="text-xs text-zinc-400 font-bold uppercase">{partnerName}</p>
                        </div>
                        <p className="text-zinc-200">{partnerAnswer}</p>
                    </div>
                    <div className="text-center py-4">
                        <span className="text-green-400 text-sm flex items-center justify-center gap-2">
                            <CheckCircle size={16} /> Daily Complete!
                        </span>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  );
}