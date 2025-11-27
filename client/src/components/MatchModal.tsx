"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import Confetti from "react-confetti";
import { useState, useEffect } from "react";

interface MatchModalProps {
  movieTitle: string;
  posterUrl: string;
  onClose: () => void;
}

export default function MatchModal({ movieTitle, posterUrl, onClose }: MatchModalProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Confetti Explosion */}
      <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="relative w-full max-w-sm bg-zinc-900 rounded-3xl border border-purple-500/50 p-6 flex flex-col items-center text-center shadow-2xl shadow-purple-500/20"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X />
        </button>

        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
          It's a Date!
        </h2>
        <p className="text-zinc-300 mb-6">You both want to watch:</p>

        {/* Poster */}
        <div className="relative w-48 h-72 rounded-xl overflow-hidden shadow-lg rotate-3 border-2 border-white/10">
          <img src={posterUrl} alt={movieTitle} className="w-full h-full object-cover" />
        </div>

        <h3 className="text-xl font-bold text-white mt-6">{movieTitle}</h3>
        
        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
        >
          Keep Swiping
        </button>
      </motion.div>
    </div>
  );
}