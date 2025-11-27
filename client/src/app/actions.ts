"use server";

export async function fetchMovies(page = 1) {
  const apiKey = process.env.TMDB_ACCESS_TOKEN;
  if (!apiKey) {
    throw new Error("Missing TMDB_ACCESS_TOKEN in .env.local");
  }

  const url = `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc`;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 3600 }, // Cache data for 1 hour
    });

    if (!res.ok) throw new Error("Failed to fetch movies");

    const data = await res.json();
    
    // Transform the messy API data into our clean format
    return data.results.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://placehold.co/500x750?text=No+Poster", // Fallback
      overview: movie.overview,
      rating: Math.round(movie.vote_average * 10) + "%", // "78%"
    }));
  } catch (error) {
    console.error("TMDB Error:", error);
    return [];
  }
}