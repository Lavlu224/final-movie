"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Upload } from 'lucide-react';
import { getMovie, updateMovie } from '@/lib/movies';

export default function EditMovie() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', excerpt: '', poster: '', source: '', source_url: '', year: '' as string | number,
  });
  const [streamLinks, setStreamLinks] = useState<{ provider: string; url: string; file_id: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const movie = await getMovie(Number(id));
        setForm({
          title: movie.title || '',
          excerpt: movie.excerpt || '',
          poster: movie.poster || '',
          source: movie.source || '',
          source_url: movie.source_url || '',
          year: movie.year ?? '',
        });
        // Load DB links + merge transferredIds from localStorage
        const dbLinks = (movie.stream_links || []).filter((l: any) => l.provider !== 'streamtape' || l.url.startsWith('https://streamtape.com/v/'));
        // Also load any transferred IDs from localStorage
        const transferredJson = typeof window !== 'undefined' ? localStorage.getItem('transferredIds') : null;
        const transferred: Record<string, string> = transferredJson ? JSON.parse(transferredJson) : {};
        const transferredLinks = Object.values(transferred).map((linkid: string) => ({
          provider: 'streamtape',
          url: `https://streamtape.com/v/${linkid}`,
          file_id: linkid,
        }));
        // Merge: transferred links first, then DB links (avoid dupes)
        const merged = [...transferredLinks];
        for (const dl of dbLinks) {
          if (!merged.some((m: any) => m.file_id === dl.file_id)) {
            merged.push(dl);
          }
        }
        setStreamLinks(merged);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const addLink = () => setStreamLinks(prev => [...prev, { provider: 'streamtape', url: '', file_id: '' }]);

  const updateLink = (i: number, field: string, value: string) => {
    setStreamLinks(prev => prev.map((l, j) => j === i ? { ...l, [field]: value } : l));
  };

  const removeLink = (i: number) => {
    setStreamLinks(prev => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMovie(Number(id), {
        title: form.title,
        excerpt: form.excerpt,
        poster: form.poster,
        source: form.source,
        source_url: form.source_url,
        year: form.year !== '' ? Number(form.year) : null,
        stream_links: streamLinks.filter(l => l.url),
      });
      router.push('/admin/content');
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-10">
        <div className="max-w-2xl mx-auto text-center text-zinc-500 py-20">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/content" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 lg:mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> Back to Content Library
        </Link>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8 lg:mb-10">Edit Movie</h1>

        <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {/* Poster */}
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Poster</label>
              {form.poster && (
                <img src={form.poster} alt="" className="w-full aspect-[2/3] rounded-2xl object-cover bg-zinc-800 border border-zinc-700 mb-3"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/333/666?text=No+Poster'; }} />
              )}
              <input type="text" value={form.poster} onChange={e => setForm(p => ({ ...p, poster: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-zinc-700" />
            </div>

            {/* Fields */}
            <div className="sm:col-span-2 space-y-5">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-4 sm:px-5 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-zinc-700" required />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Excerpt / Overview</label>
                <textarea rows={4} value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-4 sm:px-5 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-zinc-700 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Source</label>
                  <input type="text" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-4 sm:px-5 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-zinc-700" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-4 sm:px-5 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-zinc-700" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Source URL</label>
                <input type="text" value={form.source_url} onChange={e => setForm(p => ({ ...p, source_url: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-4 sm:px-5 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-zinc-700" />
              </div>
            </div>
          </div>

          {/* Stream Links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl lg:rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Stream Links (your account)</h2>
              <button type="button" onClick={addLink}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition cursor-pointer">
                <Plus className="h-4 w-4" /> Add Link
              </button>
            </div>
            {streamLinks.length === 0 ? (
              <p className="text-sm text-zinc-500">No stream links yet. Upload from Add Content page first.</p>
            ) : (
              <div className="space-y-3">
                {streamLinks.map((link, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <select value={link.provider} onChange={e => updateLink(i, 'provider', e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-zinc-700">
                      <option value="streamtape">Streamtape</option>
                      <option value="1xbet">1xBet</option>
                      <option value="4rabet">4raBet</option>
                    </select>
                    <input type="text" placeholder="URL" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-zinc-700" />
                    <button type="button" onClick={() => removeLink(i)}
                      className="text-red-400 hover:text-red-300 cursor-pointer w-full sm:w-auto text-center py-2 sm:py-0">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Link href="/admin/content"
              className="px-6 sm:px-8 py-3.5 rounded-2xl text-sm font-medium border border-zinc-700 hover:bg-zinc-800 transition text-center">
              Cancel
            </Link>
            <button type="submit" disabled={saving}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 transition cursor-pointer">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
