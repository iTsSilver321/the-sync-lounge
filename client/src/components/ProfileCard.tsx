"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, MapPin, Heart, Clock } from "lucide-react";

interface ProfileCardProps {
  profile: any;
  isOwnProfile?: boolean;
}

export default function ProfileCard({ profile, isOwnProfile = false }: ProfileCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // 3D Physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 30 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY_Tilt = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  // Data
  const aura = profile?.aura_color || "#A855F7";
  const name = profile?.display_name || "Mystery Soul";
  const bio = profile?.bio || "No bio yet...";
  const timezone = profile?.timezone;

  // --- TIMEZONE LOGIC ---
  const [localTime, setLocalTime] = useState<string>("");
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
      if (!timezone) return;
      
      const updateTime = () => {
          try {
              const now = new Date();
              const timeString = now.toLocaleTimeString("en-US", { 
                  timeZone: timezone, 
                  hour: 'numeric', 
                  minute: '2-digit' 
              });
              setLocalTime(timeString);

              const hour = parseInt(now.toLocaleTimeString("en-US", { timeZone: timezone, hour: 'numeric', hour12: false }));
              setIsNight(hour >= 23 || hour < 6);
          } catch (e) {
              setLocalTime("Unknown Time");
          }
      };

      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="[perspective:1000px] w-72 h-96 relative cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
      
      {/* TILT LAYER */}
      <motion.div
        style={{ rotateX, rotateY: rotateY_Tilt, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full h-full relative"
      >
        {/* FLIP LAYER */}
        <motion.div
            className="w-full h-full relative rounded-[2rem] transition-all duration-200"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            {/* === FRONT === */}
            <div 
                className="absolute inset-0 bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
                {/* Holographic Sheen */}
                <div 
                    className="absolute inset-0 z-20 opacity-30 pointer-events-none mix-blend-overlay"
                    style={{
                        // FIX: Changed 'background' to 'backgroundImage'
                        backgroundImage: `linear-gradient(105deg, transparent 20%, ${aura}40 40%, #ffffff80 45%, ${aura}40 50%, transparent 70%)`,
                        backgroundSize: '200% 200%',
                    }}
                />
                
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                    <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-600"><Sparkles size={48} /></div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />

                <div className="absolute bottom-0 left-0 w-full p-6 z-30">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: aura }} />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/70 shadow-black drop-shadow-md">
                            {isOwnProfile ? "You" : "Partner"}
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg leading-tight">{name}</h2>
                    <p className="text-sm text-white/80 font-medium flex items-center gap-2 mt-2">
                        <Sparkles size={12} fill={aura} className="text-transparent" /> Level {profile?.streak_count || 0}
                    </p>
                </div>
            </div>

            {/* === BACK === */}
            <div 
                className="absolute inset-0 bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl p-6 flex flex-col justify-between"
                style={{ 
                    backfaceVisibility: 'hidden', 
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    // FIX: Changed 'background' to 'backgroundImage'
                    backgroundImage: `radial-gradient(circle at top right, ${aura}20, #18181b)`
                }}
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full border-2 border-white/10 overflow-hidden mb-3">
                            {profile?.avatar_url && (
                                <img src={profile.avatar_url} className="w-full h-full object-cover opacity-50 grayscale" />
                            )}
                        </div>
                        <h3 className="font-bold text-white text-lg">{name}</h3>
                        
                        <p className="text-xs text-zinc-400 font-mono tracking-widest mt-1 flex items-center justify-center gap-2">
                            {isNight ? <Moon size={12} className="text-purple-400" /> : <Sun size={12} className="text-yellow-400" />}
                            {localTime || "Unknown Time"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-zinc-400 text-xs uppercase font-bold mb-1 flex items-center gap-2">
                                <Heart size={12} /> Vibe
                            </p>
                            <p className="text-white text-sm italic">"{bio}"</p>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                <Clock size={16} className={`mx-auto mb-1 ${isNight ? "text-purple-400" : "text-orange-400"}`} />
                                <span className="text-[10px] text-zinc-400 font-bold">{isNight ? "Sleeping?" : "Awake"}</span>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                <MapPin size={16} className="mx-auto text-blue-400 mb-1" />
                                <span className="text-[10px] text-zinc-400 font-bold">Local</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[10px] text-zinc-600">Tap to flip back</p>
                </div>
            </div>

        </motion.div>
      </motion.div>
    </div>
  );
}