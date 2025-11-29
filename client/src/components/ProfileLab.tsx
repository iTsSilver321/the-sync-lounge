"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Save, Loader2, User, Heart, Palette, MapPin } from "lucide-react";
import ProfileCard from "./ProfileCard"; 

const AURAS = [
  { color: "#A855F7", name: "Mystic" }, // Purple
  { color: "#EC4899", name: "Passion" }, // Pink
  { color: "#3B82F6", name: "Calm" },   // Blue
  { color: "#22C55E", name: "Growth" }, // Green
  { color: "#F97316", name: "Energy" }, // Orange
  { color: "#EAB308", name: "Joy" },    // Yellow
];

interface ProfileLabProps {
  user: any;
  initialProfile: any;
  onClose: () => void;
}

export default function ProfileLab({ user, initialProfile, onClose }: ProfileLabProps) {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || "");
  const [aura, setAura] = useState(initialProfile?.aura_color || "#A855F7");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || "");
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [timezone, setTimezone] = useState(initialProfile?.timezone || "");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect timezone if missing
  useEffect(() => {
      if (!initialProfile?.timezone) {
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(detected);
      }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLoading(true);
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      alert("Error: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const updates = {
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      aura_color: aura,
      bio: bio,
      timezone: timezone,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) alert(error.message);
    else onClose();
    setLoading(false);
  };

  const liveProfile = {
      ...initialProfile,
      display_name: displayName || "Your Name",
      bio: bio || "Your Vibe...",
      aura_color: aura,
      avatar_url: avatarUrl,
      timezone: timezone,
      streak_count: initialProfile?.streak_count || 0
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-zinc-900/50 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        
        {/* === LEFT: LIVE PREVIEW === */}
        <div className="relative flex-1 bg-gradient-to-br from-black/50 to-zinc-900/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
            <div className="absolute top-4 left-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-1 rounded">Live Preview</span>
            </div>
            
            <div className="scale-75 md:scale-100 origin-center">
                {/* IMPORTANT: If you still see the error after this file update, 
                   please ensure ProfileCard.tsx is also using 'backgroundImage' 
                   instead of 'background'. 
                */}
                <ProfileCard profile={liveProfile} isOwnProfile={true} />
            </div>

            <p className="text-zinc-500 text-xs mt-6 animate-pulse">
                Click the card to flip it
            </p>
        </div>

        {/* === RIGHT: EDITING CONTROLS === */}
        <div className="flex-1 p-8 bg-zinc-950 overflow-y-auto max-h-[80vh] md:max-h-none">
            {/* Header with Aura Gradient - FIXED HERE */}
            <div 
                className="h-24 w-full rounded-2xl mb-8 relative overflow-hidden flex items-center px-6 transition-colors duration-700"
                style={{ backgroundImage: `linear-gradient(to bottom right, ${aura}40, #18181b)` }} 
            >
                <h2 className="text-2xl font-bold text-white relative z-10">Edit Profile</h2>
                <div className="absolute top-0 right-0 p-4">
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                
                {/* 1. PHOTO */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Camera size={14} /> Avatar Photo
                    </label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-white/10 overflow-hidden shrink-0">
                            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : null}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex-1"
                        >
                            {loading ? "Uploading..." : "Upload New Photo"}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>
                </div>

                {/* 2. NAME */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} /> Display Name
                    </label>
                    <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="What should we call you?"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-white/20 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none transition-all"
                    />
                </div>

                {/* 3. BIO */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Heart size={14} /> Vibe / Bio
                    </label>
                    <input 
                        type="text" 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="e.g. Night Owl 🦉"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-white/20 rounded-xl p-4 text-white placeholder:text-zinc-700 outline-none transition-all"
                    />
                </div>

                {/* 4. AURA */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Palette size={14} /> Soul Color
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                        {AURAS.map((item) => (
                            <button
                                key={item.color}
                                onClick={() => setAura(item.color)}
                                className={`aspect-square rounded-xl transition-all border-2 ${aura === item.color ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"}`}
                                style={{ backgroundColor: item.color }}
                                title={item.name}
                            />
                        ))}
                    </div>
                </div>

                {/* 5. TIMEZONE (Read Only) */}
                <div className="pt-2 flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-widest">
                    <MapPin size={12} />
                    <span>Location detected: {timezone || "Unknown"}</span>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        style={{ backgroundColor: aura, boxShadow: `0 0 20px ${aura}30` }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Identity</>}
                    </button>
                </div>

            </div>
        </div>

      </motion.div>
    </div>
  );
}