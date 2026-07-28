"use client";

import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, X, MoreVertical, Eye, Edit3, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { listMovies, deleteMovie } from '@/lib/movies';

function ActionMenu({ movie, onDelete, onBackfill }: { movie: any; onDelete: (m: any) => void; onBackfill: (m: any) => void }) {
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
          <button onClick={() => { setOpen(false); onBackfill(movie); }}
            className="flex items-center gap-3 px-5 py-3 text-sm text-cyan-400 hover:bg-zinc-800 transition w-full text-left cursor-pointer">
            <RefreshCw className="h-4 w-4" /> Backfill Streams
          </button>
          <button onClick={() => { setOpen(false); onDelete(movie); }}
            className="flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-zinc-800 transition w-full text-left cursor-pointer">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteModal({ open, title, count, onConfirm, onCancel }: {
  open: boolean; title: string; count: number; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-950 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold">Delete {count > 1 ? `${count} items` : 'movie'}</h2>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-8">
          {count > 1
            ? `Are you sure you want to delete these ${count} movies? This action cannot be undone.`
            : `Are you sure you want to delete "${title}"? This action cannot be undone.`}
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-6 py-3 rounded-2xl text-sm font-medium border border-zinc-700 hover:bg-zinc-800 transition cursor-pointer">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-6 py-3 rounded-2xl text-sm font-medium bg-red-600 hover:bg-red-700 transition cursor-pointer">
            Delete {count > 1 ? `${count} items` : 'movie'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentLibrary() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [backfilling, setBackfilling] = useState<Set<number>>(new Set());

  const handleBackfill = async (movie: any) => {
    setBackfilling(prev => new Set(prev).add(movie.id));
    try {
      await fetch(`http://localhost:8000/api/movies/backfill/${movie.id}`, { method: 'POST' });
    } catch {}
    setBackfilling(prev => { const n = new Set(prev); n.delete(movie.id); return n; });
    loadData();
  };

  const loadData = async () => {
    try {
      const m = await listMovies();
      setMovies(m);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteMovie(id);
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadData();
    } catch {}
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      try { await deleteMovie(id); } catch {}
    }
    setSelected(new Set());
    setDeleteTarget(null);
    loadData();
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(m => m.id)));
    }
  };

  const filtered = movies.filter((m: any) =>
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-10">
      <DeleteModal
        open={deleteTarget !== null}
        title={deleteTarget?.title || ''}
        count={deleteTarget?.id === 0 ? selected.size : 1}
        onConfirm={deleteTarget?.id === 0 ? handleBulkDelete : () => handleDelete(deleteTarget!.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Content Library</h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base">Manage all movies and series here.</p>
        </div>
        <Link
          href="/admin/content/add"
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-5 sm:px-6 py-3 rounded-2xl font-medium text-sm transition w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Content
        </Link>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16 text-center text-zinc-500">Loading...</div>
      ) : filtered.length === 0 && searchTerm === '' && movies.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
          <div className="text-zinc-500 text-lg">No content yet.</div>
          <div className="text-zinc-600 text-sm mt-2">Click &quot;Add Content&quot; to search or import from external sources.</div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl lg:rounded-3xl [overflow:visible]">
          {/* Mobile-friendly header showing title count */}
          <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm text-zinc-400">{filtered.length} movie{filtered.length !== 1 ? 's' : ''}</span>
            {selected.size > 0 && (
              <span className="text-xs text-red-400">{selected.size} selected</span>
            )}
          </div>
          <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 pl-11 py-3 rounded-2xl text-sm focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-zinc-400 whitespace-nowrap">{selected.size} selected</span>
                <button onClick={() => setDeleteTarget({ id: 0, title: '' })}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-medium bg-red-600 hover:bg-red-700 transition cursor-pointer whitespace-nowrap">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-sm text-zinc-400 text-left">
                <th className="px-3 sm:px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="accent-red-600 cursor-pointer"
                  />
                </th>
                <th className="px-2 sm:px-4 py-4 font-normal">Title</th>
                <th className="px-2 sm:px-4 py-4 font-normal hidden sm:table-cell">Source</th>
                <th className="px-2 sm:px-4 py-4 font-normal">Year</th>
                <th className="px-2 sm:px-4 py-4 font-normal hidden md:table-cell">Views</th>
                <th className="px-2 sm:px-4 py-4 font-normal hidden md:table-cell">Status</th>
                <th className="px-2 sm:px-4 py-4 font-normal hidden lg:table-cell">Added</th>
                <th className="px-3 sm:px-6 py-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {filtered.map((movie: any) => (
                <tr key={movie.id} className={`hover:bg-zinc-950/60 transition group ${selected.has(movie.id) ? 'bg-zinc-950/40' : ''}`}>
                  <td className="px-3 sm:px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(movie.id)}
                      onChange={() => toggleSelect(movie.id)}
                      className="accent-red-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 sm:px-4 py-4">
                    <div className="flex items-center gap-3 font-medium">
                      {movie.poster && (
                        <img src={movie.poster} alt="" className="w-7 h-10 sm:w-8 sm:h-12 rounded object-cover shrink-0" />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[250px]">{movie.title}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-4 text-zinc-400 text-xs hidden sm:table-cell">{movie.source || '-'}</td>
                  <td className="px-2 sm:px-4 py-4 text-zinc-400 whitespace-nowrap">{movie.year || '-'}</td>
                  <td className="px-2 sm:px-4 py-4 font-mono text-zinc-400 hidden md:table-cell">{movie.views || 0}</td>
                  <td className="px-2 sm:px-4 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs bg-emerald-950 text-emerald-400 border border-emerald-900">
                      {movie.status || 'active'}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-4 text-zinc-500 text-xs hidden lg:table-cell">
                    {movie.created_at ? new Date(movie.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {backfilling.has(movie.id) && (
                        <span className="text-[10px] text-cyan-400 animate-pulse">Syncing...</span>
                      )}
                      <ActionMenu movie={movie} onDelete={(m) => setDeleteTarget({ id: m.id, title: m.title })} onBackfill={handleBackfill} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && searchTerm && (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-16 text-center text-zinc-500">No content matches your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
