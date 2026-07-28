"use client";
import { Play, Info } from 'lucide-react';

interface HeroProps {
  movie: any;
}

export default function Hero({ movie }: HeroProps) {
  if (!movie) return <div className="h-[85vh] bg-zinc-900" />;

  return (
    <div className="relative h-[85vh] w-full">
      <img
        src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 p-12 max-w-2xl">
        <h1 className="text-6xl font-bold mb-4">{movie.title}</h1>
        <p className="text-lg mb-8 line-clamp-3">{movie.overview}</p>
        <div className="flex gap-4">
          <a href={`/watch/${movie.id}`} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-white/90">
            <Play className="h-5 w-5" /> Play
          </a>
          <button className="flex items-center gap-2 bg-zinc-700/80 px-6 py-3 rounded font-semibold hover:bg-zinc-700">
            <Info className="h-5 w-5" /> More Info
          </button>
        </div>
      </div>
    </div>
  );
}
