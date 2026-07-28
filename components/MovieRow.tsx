"use client";

import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: any[];
}

export default function MovieRow({ title, movies }: MovieRowProps) {
  if (!movies?.length) return null;

  return (
    <div className="px-8 mb-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
