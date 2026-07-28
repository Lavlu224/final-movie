"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import PublicNavbar from '@/components/PublicNavbar';
import { Play, Star, ChevronRight } from 'lucide-react';
import { getMovie } from '@/lib/movies';

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try { setMovie(await getMovie(Number(id))); } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <PublicNavbar onMenuToggle={() => setSidebarOpen(true)} />
        <div className="md:ml-56 pt-16 flex items-center justify-center h-screen">
          <div className="text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <PublicNavbar onMenuToggle={() => setSidebarOpen(true)} />
        <div className="md:ml-56 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-zinc-500 text-lg">Movie not found</p>
            <Link href="/" className="text-red-500 text-sm mt-2 inline-block">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  const truncateDesc = (text: string, max = 180) => {
    if (text.length <= max) return text;
    return descExpanded ? text : text.slice(0, max) + '...';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <PublicNavbar onMenuToggle={() => setSidebarOpen(true)} />

      <div className="md:ml-56 pt-16">
        {/* Breadcrumb */}
        <div className="px-4 sm:px-6 pt-6 pb-2 flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/" className="hover:text-white">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-400">Details</span>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
              {/* Left - Poster */}
              <div className="sm:col-span-1 max-w-[250px] sm:max-w-none mx-auto sm:mx-0">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-800">
                  <img
                    src={movie.poster || 'https://placehold.co/400x600/333/666?text=No+Poster'}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/333/666?text=No+Poster'; }}
                  />
                </div>
              </div>

              {/* Right - Details */}
              <div className="sm:col-span-2 space-y-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  {movie.title} <span className="text-sm sm:text-base font-normal text-zinc-500">[Hindi]</span>
                </h1>

                {/* Meta row */}
                <div className="flex items-center gap-2 sm:gap-3 text-sm text-zinc-400 flex-wrap">
                  {movie.year && <span>{movie.year}</span>}
                  <span className="px-2 py-0.5 rounded text-xs border border-zinc-700 text-zinc-300">U/A 16+</span>
                  {movie.runtime && <span>{movie.runtime}</span>}
                  {movie.country && <span>{movie.country}</span>}
                  {(movie.genres || []).map((g: string, i: number) => (
                    <span key={i} className="px-2 sm:px-3 py-0.5 rounded-full bg-zinc-800 text-xs">{g}</span>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {truncateDesc(movie.excerpt || 'No description available.')}
                    {(movie.excerpt?.length || 0) > 180 && (
                      <button onClick={() => setDescExpanded(!descExpanded)}
                        className="text-red-500 hover:text-red-400 ml-1 inline cursor-pointer">
                        {descExpanded ? 'Less' : 'More'}
                      </button>
                    )}
                  </p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="text-lg font-semibold">{movie.vote_average?.toFixed(1) || '-'}</span>
                  <span className="text-zinc-500 text-sm">/10</span>
                  <span className="text-zinc-500 text-sm ml-2">{movie.vote_count || movie.views || 0} people rated</span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button onClick={() => router.push(`/watch/${id}`)}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-6 sm:px-8 py-3 rounded-2xl font-medium text-sm transition cursor-pointer">
                    <Play className="h-5 w-5 fill-white" /> Watch Online
                  </button>
                  <button className="flex items-center justify-center gap-2 border border-zinc-700 hover:bg-zinc-800 px-6 sm:px-8 py-3 rounded-2xl font-medium text-sm transition cursor-pointer">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                    Watch in App
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Footer Disclaimer */}
        <footer className="border-t border-zinc-800 px-4 sm:px-8 py-6 text-center text-xs text-zinc-600 leading-relaxed">
          <p>Disclaimer: All videos and pictures on MovieFlix are from the Internet, and their copyrights belong to the original creators. We only provide webpage services and do not store, record, or upload any content.</p>
          <p className="mt-2">MovieFlix &mdash; Watch movies free online</p>
        </footer>
      </div>
    </div>
  );
}
