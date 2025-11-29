"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { socket, connectSocket } from "@/lib/socket"; // <--- Added connectSocket import
import { motion, LayoutGroup } from "framer-motion";
import { Loader2, CalendarHeart, BookHeart } from "lucide-react";
import { useParams } from "next/navigation";

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getMonthYear = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function Memories() {
  const params = useParams();
  const roomId = params.id as string;
  
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Ensure Secure Connection (New Logic)
    connectSocket(); 

    // 2. Fetch Initial Data
    fetchFullHistory();

    const handleRefresh = () => setTimeout(() => fetchFullHistory(), 1000);

    socket.on("movie:match_found", handleRefresh);
    socket.on("mind:reveal", handleRefresh);
    socket.on("daily:partner_submitted", handleRefresh);
    socket.on("truth:sync_challenge", handleRefresh);

    return () => {
      socket.off("movie:match_found", handleRefresh);
      socket.off("mind:reveal", handleRefresh);
      socket.off("daily:partner_submitted", handleRefresh);
      socket.off("truth:sync_challenge", handleRefresh);
    };
  }, []);

  const fetchFullHistory = async () => {
    // Fetch History (Movies, Mind, Truth/Dare)
    const { data: historyData } = await supabase
      .from('history')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    // Fetch Daily Syncs
    const { data: dailyData } = await supabase
      .from('daily_sync')
      .select('*')
      .eq('couple_id', roomId)
      .order('date', { ascending: false });

    const historyItems = (historyData || []).map((item: any) => ({
        ...item,
        type: 'history',
        date: item.created_at
    }));

    const dailyItems = (dailyData || []).map((item: any) => ({
        ...item,
        type: 'daily',
        date: item.date, 
        category: 'daily'
    }));

    const combined = [...historyItems, ...dailyItems].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const grouped = combined.reduce((acc: any, item) => {
        const month = getMonthYear(item.date);
        if (!acc[month]) acc[month] = [];
        acc[month].push(item);
        return acc;
    }, {});

    const groupedArray = Object.keys(grouped).map(key => ({
        month: key,
        items: grouped[key]
    }));

    setFeed(groupedArray);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-400" /></div>;

  return (
    <div className="w-full max-w-md h-full overflow-y-auto pb-24 px-4 pt-4 space-y-8 no-scrollbar">
      
      {feed.length === 0 && (
        <div className="text-center text-zinc-500 mt-20">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookHeart size={32} className="text-zinc-700" />
            </div>
            <p>Your shared story starts here.</p>
        </div>
      )}

      <LayoutGroup>
        {feed.map((group: any) => (
            <div key={group.month} className="space-y-4">
                <div className="sticky top-0 bg-zinc-950/90 backdrop-blur-md py-3 z-10 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{group.month}</h3>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-600">{group.items.length} Memories</span>
                </div>

                <div className="space-y-4">
                    {group.items.map((item: any, index: number) => (
                        <motion.div
                            layout
                            key={item.id || index}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="glass-panel rounded-2xl p-5 border border-white/5 overflow-hidden relative group"
                        >
                            <div className="text-[10px] text-zinc-600 mb-3 uppercase tracking-wider font-bold">
                                {formatDate(item.date)}
                            </div>

                            {/* MOVIE */}
                            {item.category === 'movie' && (
                                <div className="flex gap-4">
                                <img src={item.content.poster} alt="poster" className="w-16 h-24 object-cover rounded-lg shadow-lg bg-zinc-900" />
                                <div className="flex flex-col justify-center">
                                    <h4 className="font-bold text-lg text-white leading-tight">{item.content.title}</h4>
                                    <p className="text-green-400 text-xs font-bold tracking-wider mt-1">MATCHED</p>
                                </div>
                                </div>
                            )}

                            {/* MIND MELD */}
                            {item.category === 'mind' && (
                                <div className="space-y-4">
                                    <h4 className="text-white font-medium text-lg leading-snug">"{item.content.question}"</h4>
                                    <div className="space-y-2">
                                        <div className="bg-zinc-900/50 p-3 rounded-xl border-l-2 border-purple-500">
                                            <p className="text-[10px] text-purple-300 mb-1 uppercase font-bold tracking-wider">Answer A</p>
                                            <p className="text-sm text-zinc-300">{item.content.answerA}</p>
                                        </div>
                                        <div className="bg-zinc-900/50 p-3 rounded-xl border-l-2 border-pink-500">
                                            <p className="text-[10px] text-pink-300 mb-1 uppercase font-bold tracking-wider">Answer B</p>
                                            <p className="text-sm text-zinc-300">{item.content.answerB}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TRUTH / DARE */}
                            {(item.category === 'truth' || item.category === 'dare') && (
                                <div className="text-center py-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-3 inline-block ${item.category === 'truth' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {item.category} • {item.content.intensity}
                                    </span>
                                    <p className="text-xl font-bold text-white">"{item.content.text}"</p>
                                </div>
                            )}

                            {/* DAILY PULSE */}
                            {item.category === 'daily' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CalendarHeart size={16} className="text-orange-400" />
                                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Daily Pulse</span>
                                    </div>
                                    <h4 className="text-white font-medium text-lg leading-snug">"{item.question}"</h4>
                                    
                                    <div className="space-y-2 mt-2">
                                        {item.answer_a && (
                                            <div className="bg-zinc-900/30 p-3 rounded-xl">
                                                <p className="text-sm text-zinc-300">{item.answer_a}</p>
                                            </div>
                                        )}
                                        {item.answer_b && (
                                            <div className="bg-zinc-900/30 p-3 rounded-xl">
                                                <p className="text-sm text-zinc-300">{item.answer_b}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    ))}
                </div>
            </div>
        ))}
      </LayoutGroup>
    </div>
  );
}