"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";
import { socket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";

export default function MindMeld({ user }: { user?: any }) {
  const { playPop, playMatch } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;

  // State
  const [question, setQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [partnerStatus, setPartnerStatus] = useState("Waiting...");
  const [isRevealed, setIsRevealed] = useState(false);
  const [partnerAnswer, setPartnerAnswer] = useState("");

  // REFS (Crucial for Socket Listeners)
  const questionRef = useRef<string | null>(null);
  const myAnswerRef = useRef("");
  const isButtonLocked = useRef(false);
  const userRef = useRef(user);

  // Sync user ref
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("join_room", roomId);

    // 1. New Question
    const handleNewQuestion = (text: string) => {
      setQuestion(text);
      questionRef.current = text; // Update ref immediately
      setLoading(false);
      isButtonLocked.current = false;
      
      // Reset
      setMyAnswer("");
      myAnswerRef.current = "";
      setPartnerAnswer("");
      setIsRevealed(false);
      setPartnerStatus("Waiting...");
    };

    // 2. Partner Typing
    const handlePartnerTyping = (isTyping: boolean) => {
      // We use a functional update or ref check here if needed, but state is fine for display
      setPartnerStatus((prev) => {
          if (isRevealed) return prev; // Don't change if revealed
          return isTyping ? "Partner is typing... 💬" : "Waiting...";
      });
    };

    // 3. Partner Submitted
    const handlePartnerSubmitted = () => {
      setPartnerStatus("Partner is Ready! ✅");
    };

    // 4. Reveal (AND SAVE)
    const handleReveal = async (data: { answer: string }) => {
      playMatch();
      setIsRevealed(true);
      setPartnerAnswer(data.answer);
      
      const currentQ = questionRef.current;
      const currentA = myAnswerRef.current;
      const currentUser = userRef.current;

      if (currentQ && currentA && data.answer) {
          // Save to History
          // We use the user ID if available, otherwise null (anonymous room)
          const userIdToSave = currentUser?.id || null;

          const { error } = await supabase.from('history').insert({
            room_id: roomId,
            category: 'mind',
            user_id: userIdToSave,
            content: { 
              question: currentQ,
              answerA: currentA, 
              answerB: data.answer
            }
          });
          
          if (error) console.error("Mind save error:", error);
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
    myAnswerRef.current = val; // Sync Ref
    socket.emit("mind:typing", val.length > 0);
  };

  const handleSubmit = () => {
    if (!myAnswer) return;
    socket.emit("mind:submit", { answer: myAnswer });
    setPartnerStatus((prev) => prev.includes("Partner") ? prev : "Waiting for partner...");
  };

  const resetGame = () => {
    setQuestion(null);
    questionRef.current = null;
  };

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

  return (
    <div className="flex flex-col items-center w-full max-w-md p-6 space-y-6 text-white animate-in slide-in-from-bottom-4">
      <div className="bg-zinc-800/80 backdrop-blur p-6 rounded-2xl w-full text-center shadow-xl border border-zinc-700/50 relative">
        <button onClick={resetGame} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><RefreshCw size={16} /></button>
        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">Topic</h3>
        <p className="text-lg font-medium text-white leading-relaxed">{question}</p>
      </div>

      <div className="flex flex-col w-full space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 ml-2 font-bold tracking-wider">YOU</label>
          <input 
            type="text" 
            value={myAnswer} 
            onChange={handleTyping} 
            disabled={isRevealed} 
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50" 
            placeholder="Type your answer..." 
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 ml-2 font-bold tracking-wider">PARTNER</label>
          <div className={`w-full h-[58px] bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 flex items-center justify-between ${isRevealed ? "text-white" : "text-zinc-500 italic"}`}>
            {isRevealed ? <span>{partnerAnswer || "Same as you!"}</span> : <span className="flex items-center gap-2">{partnerStatus}</span>}
          </div>
        </div>
      </div>

      {!isRevealed ? (
        <button onClick={handleSubmit} disabled={!myAnswer} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          Lock In Answer <Send size={18} />
        </button>
      ) : (
        <button onClick={resetGame} className="w-full py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Pick New Vibe</button>
      )}
    </div>
  );
}