"use client";

import AuthPortal from "@/components/AuthPortal";
import { motion } from "framer-motion";
import { Film, Brain, Palette, Gamepad2, Heart } from "lucide-react";

export default function Home() {
  
  // Floating Orbs Configuration (Features)
  const orbs = [
      { icon: Film, color: "bg-red-500", x: -140, y: -80, delay: 0 },
      { icon: Brain, color: "bg-purple-500", x: 140, y: -40, delay: 1 },
      { icon: Palette, color: "bg-pink-500", x: -120, y: 120, delay: 2 },
      { icon: Gamepad2, color: "bg-blue-500", x: 130, y: 100, delay: 1.5 },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      
      {/* 1. ANIMATED BACKGROUND (Aurora) */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[70vw] h-[70vw] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[70vw] h-[70vw] bg-pink-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
          
          {/* Subtle Stars */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      </div>

      {/* 2. THE ORBIT (Floating Features) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
          {orbs.map((orb, i) => (
              <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{ 
                      x: [0, orb.x, 0], 
                      y: [0, orb.y, 0],
                      opacity: [0, 1, 0]
                  }}
                  transition={{ 
                      duration: 10 + i * 2, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: orb.delay 
                  }}
                  className={`absolute w-12 h-12 rounded-2xl ${orb.color}/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg`}
              >
                  <orb.icon size={20} className="text-white/70" />
              </motion.div>
          ))}
      </div>

      {/* 3. CENTER STAGE */}
      <div className="z-10 w-full max-w-md relative">
        <AuthPortal />
        
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
        >
            <p className="text-zinc-600 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                <Heart size={10} className="text-red-900 fill-red-900" />
                Made for Long Distance
            </p>
        </motion.div>
      </div>
    </main>
  );
}