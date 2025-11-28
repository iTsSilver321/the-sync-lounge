"use client";

import { useState, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame, Snowflake, PartyPopper } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useParams } from "next/navigation";

export default function TruthDare() {
  const { playPop, playMatch } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  const [challenge, setChallenge] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<"truth" | "dare" | null>(null);
  const [intensity, setIntensity] = useState<"Chill" | "Party" | "Wild">("Chill");
  const [loading, setLoading] = useState(false);

  const isButtonLocked = useRef(false);
  const iRequestedIt = useRef(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join_room", roomId);

    socket.on("truth:new_challenge", async (data) => {
      setLoading(false);
      setCurrentType(data.type.toLowerCase());
      setChallenge(data.text);
      playMatch();
      isButtonLocked.current = false;

      // SAVE LOGIC: Only save if I requested it (prevent double save)
      if (iRequestedIt.current) {
          await supabase.from('history').insert({
              room_id: roomId,
              category: data.type.toLowerCase(),
              // No user_id needed
              content: { 
                  text: data.text, 
                  intensity: intensity 
              }
          });
          iRequestedIt.current = false;
      }
    });

    return () => {
      socket.off("truth:new_challenge");
    };
  }, [intensity, roomId]);

  const handleGenerate = (type: "truth" | "dare") => {
    if (isButtonLocked.current) return;
    isButtonLocked.current = true;
    iRequestedIt.current = true;
    
    playPop();
    setLoading(true);
    setChallenge(null); 
    
    socket.emit("truth:generate", { type, intensity });

    setTimeout(() => {
        if (loading) setLoading(false);
        isButtonLocked.current = false;
        iRequestedIt.current = false;
    }, 6000); 
  };

  const levels = [
    { id: "Chill", icon: <Snowflake size={16} />, color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
    { id: "Party", icon: <PartyPopper size={16} />, color: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
    { id: "Wild", icon: <Flame size={16} />, color: "bg-red-500/20 text-red-400 border-red-500/50" },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-md p-6 h-full justify-start pt-10">
      <div className="flex gap-2 mb-8 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
        {levels.map((level) => (
          <button key={level.id} onClick={() => { if (!isButtonLocked.current) { setIntensity(level.id as any); playPop(); } }} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${intensity === level.id ? level.color + " border" : "text-zinc-500 hover:text-zinc-300"}`}>
            {level.icon} {level.id}
          </button>
        ))}
      </div>

      <div className="relative w-full aspect-[4/3] mb-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 bg-zinc-800 rounded-3xl border border-zinc-700 flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-purple-400 animate-spin" />
              <p className="text-zinc-400 mt-4 text-sm animate-pulse">Consulting the AI...</p>
            </motion.div>
          ) : challenge ? (
            <motion.div key="result" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className={`absolute inset-0 rounded-3xl border-2 flex flex-col items-center justify-center p-8 text-center shadow-2xl ${currentType === "truth" ? "bg-blue-950/50 border-blue-500/50 shadow-blue-900/20" : "bg-red-950/50 border-red-500/50 shadow-red-900/20"}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${currentType === "truth" ? "text-blue-400" : "text-red-400"}`}>{currentType}</h3>
              <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">"{challenge}"</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-700 flex items-center justify-center"><p className="text-zinc-500 text-sm">Select a card below to start</p></motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <button onClick={() => handleGenerate("truth")} disabled={loading || isButtonLocked.current} className="h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 flex flex-col items-center justify-center gap-2 shadow-lg shadow-blue-900/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"><span className="text-4xl">🤔</span><span className="text-xl font-black text-white tracking-widest">TRUTH</span></button>
        <button onClick={() => handleGenerate("dare")} disabled={loading || isButtonLocked.current} className="h-32 rounded-3xl bg-gradient-to-br from-red-600 to-orange-500 flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-900/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"><span className="text-4xl">🔥</span><span className="text-xl font-black text-white tracking-widest">DARE</span></button>
      </div>
    </div>
  );
}