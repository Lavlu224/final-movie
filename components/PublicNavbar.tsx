"use client";

import Link from 'next/link';
import { Search, Menu, Globe } from 'lucide-react';
import { useState } from 'react';

interface PublicNavbarProps {
  onMenuToggle?: () => void;
}

export default function PublicNavbar({ onMenuToggle }: PublicNavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/50">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => onMenuToggle?.()} className="md:hidden text-zinc-400 hover:text-white cursor-pointer">
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" className="text-xl font-bold tracking-tight whitespace-nowrap">
            <span className="text-red-600">Movie</span>Flix
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/" className="text-white font-medium">Home</Link>
          <Link href="/tv" className="text-zinc-400 hover:text-white transition">TV Shows</Link>
          <Link href="/movies" className="text-zinc-400 hover:text-white transition">Movies</Link>
          <Link href="/most-watched" className="text-zinc-400 hover:text-white transition">Most Watched</Link>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setSearchOpen(!searchOpen)} className="text-zinc-400 hover:text-white transition cursor-pointer">
            <Search className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition cursor-pointer">
            <Globe className="h-4 w-4" /> EN
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="px-4 pb-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search movies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 pl-11 py-3 rounded-2xl text-sm focus:outline-none focus:border-zinc-700"
              autoFocus
            />
          </div>
        </div>
      )}
    </nav>
  );
}
