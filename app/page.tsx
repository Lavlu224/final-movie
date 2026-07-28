"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import PublicNavbar from '@/components/PublicNavbar';
import { Play } from 'lucide-react';

const API = 'http://localhost:8000/api';

function MovieCard({ movie }: { movie: any }) {
  return (
    <Link href={`/details/${movie.id}`} className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px]">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-800">
        <img
          src={movie.poster || 'https://placehold.co/300x450/333/666?text=No+Poster'}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/333/666?text=No+Poster'; }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
      <h3 className="mt-2 text-sm font-medium truncate text-zinc-300 group-hover:text-white transition">{movie.title}</h3>
      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
        {movie.year && <span>{movie.year}</span>}
        {movie.source && <span className="truncate">{movie.source}</span>}
      </div>
    </Link>
  );
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/movies?limit=30`);
        if (res.ok) setLibrary(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const featured = library[Math.floor(Math.random() * library.length)];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <PublicNavbar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="md:ml-56 pt-16">
        {/* Featured */}
        {featured && (
          <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[320px] sm:min-h-[400px]">
            <img
              src={featured.poster || 'https://placehold.co/1280x720/1a1a1a/666?text=MovieFlix'}
              alt={featured.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 md:p-12 max-w-3xl">
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-2 sm:mb-3">{featured.title}</h1>
              <p className="text-zinc-400 text-sm md:text-base line-clamp-2 mb-4 sm:mb-6">{featured.excerpt}</p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Link href={`/details/${featured.id}`}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-medium text-sm transition">
                  <Play className="h-5 w-5 fill-white" /> Watch Now
                </Link>
                {featured.year && <span className="text-sm text-zinc-500">{featured.year}</span>}
                {featured.source && <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">{featured.source}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 lg:space-y-10">
          {loading ? (
            <div className="text-center py-20 text-zinc-500">Loading...</div>
          ) : library.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-lg">No movies available yet.</p>
              <p className="text-zinc-600 text-sm mt-2">Check back later for new content.</p>
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">All Movies</h2>
                  <span className="text-sm text-zinc-500">{library.length} titles</span>
                </div>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {library.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </section>

              {library.length > 6 && (
                <section>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4 sm:mb-5">Recently Added</h2>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {library.slice(0, 10).map((movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800 px-4 sm:px-8 py-6 sm:py-8 text-center text-sm text-zinc-600">
          <p>MovieFlix &mdash; Watch movies free online</p>
        </footer>
      </div>
    </div>
  );
}
