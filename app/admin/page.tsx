"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Film, Users, Play, Clock, MoreVertical, Eye, Edit3, Trash2 } from 'lucide-react';
import { listMovies, getMovieStats, deleteMovie } from '@/lib/movies';

function ActionMenu({ movie, onDelete }: { movie: any; onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-zinc-400 hover:text-white">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
          <Link href={`/details/${movie.id}`}
            className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition">
            <Eye className="h-4 w-4" /> View
          </Link>
          <Link href={`/admin/content/edit/${movie.id}`}
            className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <button onClick={() => { setOpen(false); onDelete(movie.id); }}
            className="flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-zinc-800 transition w-full text-left cursor-pointer">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [movies, setMovies] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_movies: 0, active_movies: 0, total_views: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const admin = localStorage.getItem('isAdmin');
    if (!admin) router.push('/login');
    else setIsAdmin(true);
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [m, s] = await Promise.all([listMovies(), getMovieStats()]);
      setMovies(m);
      setStats(s);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this movie?')) return;
    try {
      await deleteMovie(id);
      loadData();
    } catch {}
  };

  if (!mounted) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const filtered = movies.filter((m: any) => m.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const isEmpty = !loading && stats.total_movies === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 lg:mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter">Dashboard</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Welcome back, Admin</p>
        </div>
        <Link href="/admin/content/add"
          className="flex items-center justify-center gap-2 bg-white text-black px-5 sm:px-6 py-3 rounded-2xl font-medium text-sm hover:bg-zinc-200 transition w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add New Content
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <Film className="h-20 w-20 text-zinc-800 mb-6" />
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">No content yet</h2>
          <p className="text-zinc-500 max-w-md mb-10 px-4">Click &quot;Add Content&quot; to search or import from external sources.</p>
          <Link href="/admin/content/add"
            className="inline-flex items-center gap-2 bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-medium hover:bg-zinc-200 transition">
            <Plus className="h-5 w-5" /> Add Content
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Total Movies", value: stats.total_movies.toLocaleString(), icon: Film, change: "Imported from WordPress" },
              { label: "Active Movies", value: stats.active_movies.toLocaleString(), icon: Users, change: "Currently live" },
              { label: "Total Views", value: stats.total_views.toLocaleString(), icon: Play, change: "All time" },
              { label: "Database", value: "PostgreSQL", icon: Clock, change: "Local server", small: true },
            ].map((stat, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition">
                <div className="flex justify-between items-start mb-8">
                  <stat.icon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className={stat.small ? "text-xl font-semibold tracking-tight mb-1" : "text-5xl font-semibold tracking-tighter mb-1"}>{stat.value || "0"}</div>
                  <div className="text-sm text-zinc-400">{stat.label}</div>
                </div>
                <div className="text-xs text-zinc-500 mt-6">{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Content Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl lg:rounded-3xl [overflow:visible]">
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800">
              <div className="hidden sm:block">
                <div className="font-semibold text-xl lg:text-2xl tracking-tight">Content Library</div>
                <div className="text-sm text-zinc-400 mt-1">Manage all movies and series</div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 lg:w-72 bg-zinc-950 border border-zinc-800 pl-11 py-3 rounded-2xl text-sm focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-16 text-center text-zinc-500">Loading...</div>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-sm text-zinc-400">
                    <th className="text-left px-3 sm:px-4 lg:px-8 py-4 lg:py-5 font-normal">Title</th>
                    <th className="text-left px-2 sm:px-4 py-4 lg:py-5 font-normal hidden sm:table-cell">Source</th>
                    <th className="text-left px-2 sm:px-4 py-4 lg:py-5 font-normal">Year</th>
                    <th className="text-left px-2 sm:px-4 py-4 lg:py-5 font-normal hidden md:table-cell">Views</th>
                    <th className="text-left px-2 sm:px-4 py-4 lg:py-5 font-normal hidden md:table-cell">Status</th>
                    <th className="text-left px-2 sm:px-4 py-4 lg:py-5 font-normal hidden lg:table-cell">Added</th>
                    <th className="text-right px-3 sm:px-4 lg:px-8 py-4 lg:py-5 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {filtered.length > 0 ? (
                    filtered.map((movie: any) => (
                      <tr key={movie.id} className="hover:bg-zinc-950/60 transition group">
                        <td className="px-3 sm:px-4 lg:px-8 py-4 lg:py-5">
                          <div className="flex items-center gap-3">
                            {movie.poster && (
                              <img src={movie.poster} alt="" className="w-7 h-10 sm:w-8 sm:h-12 rounded object-cover shrink-0" />
                            )}
                            <span className="truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[250px]">{movie.title}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-4 lg:py-5 text-zinc-400 text-xs hidden sm:table-cell">{movie.source || '-'}</td>
                        <td className="px-2 sm:px-4 py-4 lg:py-5 text-zinc-400 whitespace-nowrap">{movie.year || '-'}</td>
                        <td className="px-2 sm:px-4 py-4 lg:py-5 font-mono text-zinc-400 hidden md:table-cell">{movie.views || 0}</td>
                        <td className="px-2 sm:px-4 py-4 lg:py-5 hidden md:table-cell">
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs bg-emerald-950 text-emerald-400 border border-emerald-900">
                            {movie.status || 'active'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-4 lg:py-5 text-zinc-500 text-xs hidden lg:table-cell">
                          {movie.created_at ? new Date(movie.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 sm:px-4 lg:px-8 py-4 lg:py-5 text-right">
                          <ActionMenu movie={movie} onDelete={handleDelete} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-8 py-16 text-center text-zinc-500">{searchTerm ? 'No content matches your search.' : 'No content yet. Import movies from the Add Content page.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
