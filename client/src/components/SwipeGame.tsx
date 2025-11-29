"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import MovieCard from "./MovieCard";
import MatchModal from "./MatchModal";
import { useParams } from "next/navigation";
import { fetchMovies } from "@/app/actions"; 
import { Loader2 } from "lucide-react"; 
import { useGameSounds } from "@/hooks/useGameSounds";
import { socket } from "@/lib/socket"; 
import { supabase } from "@/lib/supabase";

interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: string;
  overview: string;
}

export default function SwipeGame() {
  const { playSwipe, playMatch } = useGameSounds();
  const params = useParams();
  const roomId = params.id as string;
  
  const [cards, setCards] = useState<Movie[]>([]);
  const [match, setMatch] = useState<{ title: string; poster: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Start as NULL
  const [page, setPage] = useState<number | null>(null);
  
  const isFetching = useRef(false);
  const movieCache = useRef<Map<number, Movie>>(new Map());

  // 1. CALCULATE PAGE & SETUP SOCKET
  useEffect(() => {
    // --- THE MATH TRICK ---
    // Turn the Room ID (e.g. "A7X2") into a number (e.g. 14)
    // This ensures both users get the same "random" page instantly.
    const seed = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const calculatedPage = (seed % 20) + 1; // Result is always 1-20
    
    console.log(`Room ${roomId} maps to Page ${calculatedPage}`);
    setPage(calculatedPage);

    // Socket Connection
    if (!socket.connected) socket.connect();
    socket.emit("join_room", roomId);

    const handleMatch = async (data: any) => {
      playMatch();
      const matchedMovie = movieCache.current.get(data.movieId);
      
      if (matchedMovie) {
        setMatch({ title: matchedMovie.title, poster: matchedMovie.poster });
        
        // Save to DB
        try {
            await supabase.from('history').insert({
                room_id: roomId,
                category: 'movie',
                content: { title: matchedMovie.title, poster: matchedMovie.poster }
            });
        } catch (err) {}
      } else {
        setMatch({ title: "It's a Match!", poster: "https://placehold.co/600x400?text=Match+Found!" });
      }
    };

    socket.on("movie:match_found", handleMatch);

    return () => {
      socket.off("movie:match_found", handleMatch);
    };
  }, []); // Run ONCE

  // 2. FETCH MOVIES
  useEffect(() => {
    // Only fetch if we have a page number
    if (page !== null) {
      loadNewMovies(page);
    }
  }, [page]); 

  const loadNewMovies = async (pageToFetch: number) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      console.log("Fetching TMDB Page:", pageToFetch);
      const newMovies = await fetchMovies(pageToFetch);
      
      setCards((prev) => {
        const existingIds = new Set(prev.map((card) => card.id));
        const uniqueNewMovies = newMovies.filter((movie: Movie) => !existingIds.has(movie.id));
        uniqueNewMovies.forEach((m: Movie) => movieCache.current.set(m.id, m));
        return [...prev, ...uniqueNewMovies];
      });
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const handleSwipe = (id: number, direction: "left" | "right") => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    if (socket) socket.emit("movie:swipe", { movieId: id, direction });

    // Infinite Scroll
    if (cards.length < 3 && !isFetching.current && page !== null) {
      setPage(prev => (prev ? prev + 1 : prev));
    }
  };

  // LOADING STATE
  if ((loading && cards.length === 0) || page === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-purple-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-zinc-400 animate-pulse">Syncing Cinema...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <AnimatePresence>
        {match && (
          <MatchModal 
            movieTitle={match.title} 
            posterUrl={match.poster} 
            onClose={() => setMatch(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cards.map((card) => (
          <MovieCard
            key={card.id}
            title={card.title}
            posterUrl={card.poster}
            onSwipe={(dir) => handleSwipe(card.id, dir)}
          />
        )).reverse()} 
      </AnimatePresence>
      
      {cards.length === 0 && !loading && (
        <div className="glass-panel p-8 rounded-3xl text-center max-w-xs animate-in zoom-in duration-300">
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🎬</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">That's a Wrap!</h3>
            <p className="text-zinc-400 text-sm mb-6">You've seen all the movies for this session.</p>
            <button 
                onClick={() => window.location.reload()} 
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
            >
                Load More Movies
            </button>
        </div>
      )}
    </div>
  );
}