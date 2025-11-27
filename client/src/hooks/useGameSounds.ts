import { useEffect, useRef } from "react";

// Pointing to your local files
const SOUND_URLS = {
  SWIPE: "/sounds/swipe.mp3", 
  MATCH: "/sounds/match.mp3", 
  POP: "/sounds/pop.mp3",   
};

export const useGameSounds = () => {
  const swipeRef = useRef<HTMLAudioElement | null>(null);
  const matchRef = useRef<HTMLAudioElement | null>(null);
  const popRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio objects once
    if (typeof window !== "undefined") {
      swipeRef.current = new Audio(SOUND_URLS.SWIPE);
      matchRef.current = new Audio(SOUND_URLS.MATCH);
      popRef.current = new Audio(SOUND_URLS.POP);
      
      // Volume settings
      swipeRef.current.volume = 0.5;
      matchRef.current.volume = 0.6;
      popRef.current.volume = 0.5;
    }
  }, []);

  const playSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch((e) => console.error("Audio block:", e));
      
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  return {
    playSwipe: () => playSound(swipeRef),
    playMatch: () => playSound(matchRef),
    playPop: () => playSound(popRef),
  };
};