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
  const [page, setPage] = useState(1);
  
  const isFetching = useRef(false);
  
  // Cache to store movie details for the match screen
  const movieCache = useRef<Map<number, Movie>>(new Map());

  // Initial Data Fetch
  useEffect(() => {
    loadNewMovies();
  }, []);

  const loadNewMovies = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const newMovies = await fetchMovies(page);
      
      setCards((prev) => {
        const existingIds = new Set(prev.map((card) => card.id));
        
        // Explicitly type 'movie' here
        const uniqueNewMovies = newMovies.filter((movie: Movie) => !existingIds.has(movie.id));
        
        // FIX: Explicitly type 'm' here to solve your error
        uniqueNewMovies.forEach((m: Movie) => movieCache.current.set(m.id, m));

        return [...prev, ...uniqueNewMovies];
      });

      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to load movies:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  // Socket Connection
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join_room", roomId);

    socket.on("movie:match_found", (data) => {
      playMatch();
      const matchedMovie = movieCache.current.get(data.movieId);
      
      if (matchedMovie) {
        setMatch({ 
          title: matchedMovie.title, 
          poster: matchedMovie.poster 
        });
      } else {
        setMatch({ 
          title: "It's a Match!", 
          poster: "https://placehold.co/600x400?text=Match+Found!" 
        });
      }
    });

    return () => {
      socket.off("movie:match_found");
    };
  }, []);

  const handleSwipe = (id: number, direction: "left" | "right") => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    
    if (socket) {
      socket.emit("movie:swipe", { movieId: id, direction });
    }

    if (cards.length < 3 && !isFetching.current) {
      loadNewMovies();
    }
  };

  if (loading && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-purple-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-zinc-400 animate-pulse">Loading Cinema...</p>
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
        <div className="text-center p-8 glass-panel rounded-3xl animate-in fade-in">
             <h3 className="text-2xl font-bold mb-2">That's a Wrap! 🎬</h3>
             <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-medium">
                Refresh
             </button>
        </div>
      )}
    </div>
  );
}