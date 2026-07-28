"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, Tv, Film, Clapperboard, TrendingUp, Gamepad2, Download } from 'lucide-react';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tv', label: 'TV Show', icon: Tv },
  { href: '/movies', label: 'Movie', icon: Clapperboard },
  { href: '/animation', label: 'Animation', icon: Film },
  { href: '/most-watched', label: 'Most Watched', icon: TrendingUp },
  { href: '/games', label: 'Games', icon: Gamepad2 },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-56 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-red-600">Movie</span>Flix
          </Link>
          <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                  active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <Link href="/admin" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Admin
          </Link>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition">
            <Download className="h-5 w-5" />
            Download App
          </a>
        </div>
      </aside>
    </>
  );
}
