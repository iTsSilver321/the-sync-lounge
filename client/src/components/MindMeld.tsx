"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, RefreshCw, Loader2, Fingerprint } from "lucide-react";
import { useParams } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";
import { connectSocket, socket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function MindMeld({ user }: { user?: any }) {
  const { playPop, playMatch } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  // State Machine: 'input' -> 'waiting' -> 'syncing' (Animation) -> 'revealed'
  const [gamePhase, setGamePhase] = useState<"input" | "waiting" | "syncing" | "revealed">("input");
  
  const [question, setQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [partnerStatus, setPartnerStatus] = useState("Waiting...");
  const [partnerAnswer, setPartnerAnswer] = useState("");

  // REFS
  const questionRef = useRef<string | null>(null);
  const myAnswerRef = useRef("");
  const isButtonLocked = useRef(false);
  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    connectSocket();
    socket.emit("join_room", roomId);

    const handleNewQuestion = (text: string) => {
      setQuestion(text);
      questionRef.current = text;
      setLoading(false);
      isButtonLocked.current = false;
      
      // Reset Round
      setMyAnswer("");
      myAnswerRef.current = "";
      setPartnerAnswer("");
      setGamePhase("input");
      setPartnerStatus("Waiting...");
    };

    const handlePartnerTyping = (isTyping: boolean) => {
      setPartnerStatus((prev) => {
          if (gamePhase === "revealed") return prev; 
          return isTyping ? "Partner is typing... 💬" : "Waiting...";
      });
    };

    const handlePartnerSubmitted = () => {
      setPartnerStatus("Partner is Ready! ✅");
    };

    const handleReveal = async (data: { answer: string }) => {
      setPartnerAnswer(data.answer);
      setGamePhase("syncing"); // Trigger the "Psychic" Animation phase
      
      const currentQ = questionRef.current;
      const currentA = myAnswerRef.current;
      const currentUser = userRef.current;

      if (currentQ && currentA && data.answer) {
          const userIdToSave = currentUser?.id || null;
          await supabase.from('history').insert({
            room_id: roomId,
            category: 'mind',
            user_id: userIdToSave,
            content: { 
              question: currentQ,
              answerA: currentA, 
              answerB: data.answer
            }
          });
      }
    };

    socket.on("mind:new_question", handleNewQuestion);
    socket.on("mind:partner_typing", handlePartnerTyping);
    socket.on("mind:partner_submitted", handlePartnerSubmitted);
    socket.on("mind:reveal", handleReveal);

    return () => {
        socket.off("mind:new_question", handleNewQuestion);
        socket.off("mind:partner_typing", handlePartnerTyping);
        socket.off("mind:partner_submitted", handlePartnerSubmitted);
        socket.off("mind:reveal", handleReveal);
    };
  }, []);

  const generateQuestion = (vibe: string) => {
    if (isButtonLocked.current) return;
    isButtonLocked.current = true;
    playPop();
    setLoading(true);
    socket.emit("mind:generate_question", vibe);

    setTimeout(() => {
        if (loading) setLoading(false);
        isButtonLocked.current = false;
    }, 5000);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMyAnswer(val);
    myAnswerRef.current = val;
    socket.emit("mind:typing", val.length > 0);
  };

  const handleSubmit = () => {
    if (!myAnswer) return;
    socket.emit("mind:submit", { answer: myAnswer });
    setGamePhase("waiting");
    setPartnerStatus((prev) => prev.includes("Partner") ? prev : "Waiting for partner...");
  };

  const triggerReveal = () => {
    playMatch();
    setGamePhase("revealed");
  };

  const resetGame = () => {
    setQuestion(null);
    questionRef.current = null;
    setGamePhase("input");
  };

  // 1. SELECTION SCREEN
  if (!question) {
    return (
      <div className="w-full max-w-md p-6 flex flex-col items-center animate-in fade-in zoom-in">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
          Select a Vibe
        </h2>
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Loader2 className="animate-spin" />
            <p>Consulting the AI Oracles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 w-full">
            {['Deep 🌌', 'Funny 😂', 'Spicy 🌶️', 'Future 🔮'].map((vibe) => (
              <button
                key={vibe}
                onClick={() => generateQuestion(vibe.split(' ')[0])}
                disabled={isButtonLocked.current}
                className="p-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl text-xl font-medium transition-all hover:scale-105 active:scale-95 flex items-center justify-between group disabled:opacity-50"
              >
                {vibe}
                <Sparkles className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. PSYCHIC REVEAL ANIMATION (The "Juice")
  if (gamePhase === "syncing") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[60vh] relative" onClick={triggerReveal}>
         <div className="absolute inset-0 flex items-center justify-center">
            {/* Left Orb (You) */}
            <motion.div 
              initial={{ x: -150, opacity: 0, scale: 0.5 }}
              animate={{ x: -20, opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, type: "spring" }}
              className="w-24 h-24 rounded-full bg-purple-500 blur-xl absolute mix-blend-screen"
            />
            {/* Right Orb (Partner) */}
            <motion.div 
              initial={{ x: 150, opacity: 0, scale: 0.5 }}
              animate={{ x: 20, opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-pink-500 blur-xl absolute mix-blend-screen"
            />
         </div>
         
         <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, repeat: Infinity, repeatType: "reverse", duration: 1 }}
            className="z-10 bg-white text-black px-8 py-4 rounded-full font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-2"
         >
            <Fingerprint /> TAP TO SYNC
         </motion.button>
      </div>
    );
  }

  // 3. MAIN GAME UI (Input or Result)
  return (
    <div className="flex flex-col items-center w-full max-w-md p-6 space-y-6 text-white animate-in slide-in-from-bottom-4">
      <div className="bg-zinc-800/80 backdrop-blur p-6 rounded-2xl w-full text-center shadow-xl border border-zinc-700/50 relative">
        <button onClick={resetGame} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><RefreshCw size={16} /></button>
        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">Topic</h3>
        <p className="text-lg font-medium text-white leading-relaxed">{question}</p>
      </div>

      <div className="flex flex-col w-full space-y-4">
        {/* YOU */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 ml-2 font-bold tracking-wider">YOU</label>
          <input 
            type="text" 
            value={myAnswer} 
            onChange={handleTyping} 
            disabled={gamePhase !== "input"} 
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50" 
            placeholder="Type your answer..." 
          />
        </div>

        {/* PARTNER */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 ml-2 font-bold tracking-wider">PARTNER</label>
          <motion.div 
            layout
            className={`w-full min-h-[58px] bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-4 flex items-center justify-between ${gamePhase === "revealed" ? "text-white bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30" : "text-zinc-500 italic"}`}
          >
            {gamePhase === "revealed" ? (
                <motion.span initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}>
                    {partnerAnswer}
                </motion.span>
            ) : (
                <span className="flex items-center gap-2 text-sm">{partnerStatus}</span>
            )}
          </motion.div>
        </div>
      </div>

      {gamePhase === "input" && (
        <button onClick={handleSubmit} disabled={!myAnswer} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          Lock In Answer <Send size={18} />
        </button>
      )}

      {gamePhase === "waiting" && (
         <div className="text-zinc-500 text-sm animate-pulse flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Waiting for partner to sync...
         </div>
      )}

      {gamePhase === "revealed" && (
        <button onClick={resetGame} className="w-full py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Pick New Vibe</button>
      )}
    </div>
  );
}