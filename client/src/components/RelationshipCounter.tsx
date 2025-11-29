"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Clock, Heart, Edit2, X, Calendar, Save, Sparkles } from "lucide-react";

interface RelationshipCounterProps {
  coupleId: string;
  initialDate: string | null;
}

export default function RelationshipCounter({ coupleId, initialDate }: RelationshipCounterProps) {
  const [startDate, setStartDate] = useState<Date | null>(initialDate ? new Date(initialDate) : null);
  const [viewMode, setViewMode] = useState<"days" | "detailed" | "hours">("days");
  const [isEditing, setIsEditing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [newDateVal, setNewDateVal] = useState("");

  // Update "Now" every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync prop changes
  useEffect(() => {
      if (initialDate) setStartDate(new Date(initialDate));
  }, [initialDate]);

  const saveDate = async () => {
    if (!newDateVal) return;
    
    const { error } = await supabase.rpc('set_relationship_start', {
        p_couple_id: coupleId,
        p_date: new Date(newDateVal).toISOString()
    });

    if (error) {
        alert("Failed to save: " + error.message);
    } else {
        setStartDate(new Date(newDateVal));
        setIsEditing(false);
    }
  };

  // --- MATH HELPERS ---
  const getTime = () => {
      if (!startDate) return { label: "Tap to set date", value: "Start Journey" };
      
      const diff = now.getTime() - startDate.getTime();
      
      if (viewMode === "hours") {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          return { label: "Hours of Us", value: hours.toLocaleString() };
      }
      
      if (viewMode === "detailed") {
          const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
          const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24));
          return { label: "Time Together", value: `${years}y ${days}d` };
      }

      // Default: Days
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return { label: "Days Together", value: days.toLocaleString() };
  };

  const { label, value } = getTime();

  const toggleMode = () => {
      if (viewMode === "days") setViewMode("detailed");
      else if (viewMode === "detailed") setViewMode("hours");
      else setViewMode("days");
  };

  return (
    <>
      {/* --- THE COUNTER TRIGGER --- */}
      <button 
        onClick={() => startDate ? toggleMode() : setIsEditing(true)}
        className="flex flex-col items-center justify-center group relative px-4 py-1"
      >
        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">
            {startDate ? (
                <>
                    <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" />
                    <span>{label}</span>
                </>
            ) : (
                <span className="text-purple-400 flex items-center gap-1"><Sparkles size={10} /> Begin Journey</span>
            )}
        </div>
        
        <div className="flex items-center gap-2">
            <motion.div 
                key={viewMode}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white font-mono text-xl font-bold leading-none tracking-tight group-hover:text-purple-300 transition-colors"
            >
                {value}
            </motion.div>
            
            {/* Tiny Edit Icon that appears on hover/active */}
            {startDate && (
                <div 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all absolute -right-4"
                >
                    <Edit2 size={10} />
                </div>
            )}
        </div>
      </button>

      {/* --- THE "PREMIUM" EDIT MODAL --- */}
      <AnimatePresence>
        {isEditing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                >
                    {/* Header with Gradient */}
                    <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-purple-300">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg leading-none">Anniversary</h3>
                                <p className="text-zinc-400 text-xs mt-1">When did it all begin?</p>
                            </div>
                        </div>
                        <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Date Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Select Date</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500/50 rounded-xl p-4 text-white color-scheme-dark outline-none transition-all text-lg font-medium shadow-inner"
                                    onChange={(e) => setNewDateVal(e.target.value)}
                                    defaultValue={startDate ? startDate.toISOString().split('T')[0] : ''}
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <button 
                            onClick={saveDate}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            <Save size={18} />
                            Update Date
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </>
  );
}