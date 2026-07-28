"use client";
import Link from 'next/link';
import { Search, Bell, User } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [search, setSearch] = useState('');
  return (
    <nav className="fixed top-0 z-50 w-full bg-black/80 backdrop-blur-lg">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-3xl font-bold text-red-600">NETFLIX</Link>
          <div className="hidden md:flex gap-6 text-sm">
            <Link href="/">Home</Link>
            <Link href="/tv">TV Shows</Link>
            <Link href="/movies">Movies</Link>
            <Link href="/admin" className="text-red-500 hover:text-red-400">Admin</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search movies..."
              className="bg-zinc-800 pl-10 py-2 rounded text-sm focus:outline-none w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          </div>
          <Bell className="h-5 w-5" />
          <User className="h-8 w-8 rounded bg-zinc-700 p-1" />
        </div>
      </div>
    </nav>
  );
}
