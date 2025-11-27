"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket"; // Import socket
import { motion } from "framer-motion";
import { Film, Brain, Calendar, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function Memories() {
  const params = useParams();
  const roomId = params.id as string;
  
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Fetch
    fetchHistory();

    // 2. REAL-TIME LISTENERS
    // When a match happens anywhere in the app, refresh this list!
    const handleRefresh = () => {
      console.log("New memory detected! Refreshing list...");
      // Add a small delay to ensure DB write finished
      setTimeout(() => fetchHistory(), 500);
    };

    socket.on("movie:match_found", handleRefresh);
    socket.on("mind:reveal", handleRefresh);

    return () => {
      socket.off("movie:match_found", handleRefresh);
      socket.off("mind:reveal", handleRefresh);
    };
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMemories(data);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-400" /></div>;

  return (
    <div className="w-full max-w-md h-full overflow-y-auto pb-24 px-4 pt-4 space-y-4">
      
      {memories.length === 0 && (
        <div className="text-center text-zinc-500 mt-10">
            <p>No memories yet.</p>
            <p className="text-sm">Matches will appear here instantly.</p>
        </div>
      )}

      {memories.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-panel rounded-2xl p-4 border border-white/5 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3 opacity-50 text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1">
                {item.category === 'movie' ? <Film size={12} /> : <Brain size={12} />}
                {item.category}
            </span>
            <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* MOVIE CARD STYLE */}
          {item.category === 'movie' && (
            <div className="flex gap-4">
               <img 
                 src={item.content.poster} 
                 alt="poster" 
                 className="w-16 h-24 object-cover rounded-lg shadow-lg"
               />
               <div className="flex flex-col justify-center">
                 <h4 className="font-bold text-lg text-white">{item.content.title}</h4>
                 <p className="text-green-400 text-xs font-bold tracking-wider">IT'S A DATE!</p>
               </div>
            </div>
          )}

          {/* MIND MELD STYLE */}
          {item.category === 'mind' && (
            <div className="space-y-3">
              <h4 className="text-purple-300 font-medium italic">"{item.content.question}"</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/50 p-2 rounded-lg text-xs text-zinc-300 border-l-2 border-purple-500">
                    {item.content.answerA}
                </div>
                <div className="bg-zinc-800/50 p-2 rounded-lg text-xs text-zinc-300 border-l-2 border-pink-500">
                    {item.content.answerB}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      ))}
    </div>
  );
}