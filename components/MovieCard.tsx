"use client";

import Link from 'next/link';

interface MovieCardProps {
  movie: any;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/watch/${movie.id}`} className="group relative min-w-[180px] md:min-w-[200px] flex-shrink-0 cursor-pointer">
      <img
        src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : (movie.poster || 'https://placehold.co/400x600/333/666?text=Movie')}
        alt={movie.title || movie.name}
        className="rounded-md object-cover w-full aspect-[2/3] group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 p-3 rounded-b-md opacity-0 group-hover:opacity-100 transition">
        <p className="text-sm font-semibold truncate">{movie.title || movie.name}</p>
        <div className="flex items-center gap-2 text-xs mt-1">
          <span className="text-green-500">{movie.vote_average?.toFixed(1)}</span>
          <span>{movie.release_date?.slice(0, 4)}</span>
        </div>
      </div>
    </Link>
  );
}
