"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { Star } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds"; // Import the sound hook

interface MovieCardProps {
  title: string;
  posterUrl: string;
  onSwipe: (direction: "left" | "right") => void;
}

export default function MovieCard({ title, posterUrl, onSwipe }: MovieCardProps) {
  // 1. Initialize the sound hook
  const { playSwipe } = useGameSounds();

  // 2. Physics for dragging
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Visual cues (The "YES" / "NOPE" stamps)
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -100], [0, 1]);

  // 3. Play sound IMMEDIATELY when the user grabs the card
  const handleDragStart = () => {
    playSwipe();
  };

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe threshold (distance or speed)
    if (offset > 100 || velocity > 500) {
      onSwipe("right");
    } else if (offset < -100 || velocity < -500) {
      onSwipe("left");
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={handleDragStart} // <--- Sound triggers here
      onDragEnd={handleDragEnd}
      className="absolute h-[65vh] w-[85vw] max-w-sm rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing touch-none border border-white/10 bg-zinc-900"
    >
      {/* Background Poster Image */}
      <img 
        src={posterUrl} 
        alt={title} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      
      {/* Dark Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

      {/* Card Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-md leading-tight">{title}</h2>
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
           <Star size={16} fill="currentColor" />
           <span className="text-white text-sm font-medium">94% Match</span>
        </div>
      </div>

      {/* SWIPE STAMPS (The "Juice") */}
      <motion.div 
        style={{ opacity: likeOpacity }} 
        className="absolute top-8 left-8 border-4 border-green-400 rounded-lg px-4 py-2 rotate-[-15deg]"
      >
        <span className="text-green-400 font-bold text-2xl uppercase tracking-widest">YES</span>
      </motion.div>

      <motion.div 
        style={{ opacity: nopeOpacity }} 
        className="absolute top-8 right-8 border-4 border-red-500 rounded-lg px-4 py-2 rotate-[15deg]"
      >
        <span className="text-red-500 font-bold text-2xl uppercase tracking-widest">NOPE</span>
      </motion.div>

    </motion.div>
  );
}