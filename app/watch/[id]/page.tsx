"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import VideoPlayer from '@/components/VideoPlayer';
import { Play, List, Film } from 'lucide-react';
import { getMovie } from '@/lib/movies';

export default function WatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeUrl, setActiveUrl] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const m = await getMovie(Number(id));
        // Merge transferred IDs from localStorage into stream_links
        const transferredJson = typeof window !== 'undefined' ? localStorage.getItem('transferredIds') : null;
        const transferred: Record<string, string> = transferredJson ? JSON.parse(transferredJson) : {};
        const transferredLinks = Object.values(transferred).map((linkid: string) => ({
          provider: 'streamtape',
          url: `https://streamtape.com/e/${linkid}`,
          file_id: linkid,
          _uploaded: true,
        }));
        const existingUrls = new Set((m.stream_links || []).map((l: any) => l.url));
        const mergedLinks = [...transferredLinks.filter((l: any) => !existingUrls.has(l.url)), ...(m.stream_links || [])];
        m.stream_links = mergedLinks;
        setMovie(m);
        if (mergedLinks[0]?.url) setActiveUrl(mergedLinks[0].url);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const allStreams = movie?.stream_links || [];
  const currentUrl = activeUrl || allStreams[0]?.url || '';
  const hasMultiple = allStreams.length > 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <PublicNavbar />
        <div className="pt-16 flex items-center justify-center h-screen">
          <div className="text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <PublicNavbar />
        <div className="pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-zinc-500 text-lg">Movie not found</p>
            <Link href="/" className="text-red-500 text-sm mt-2 inline-block">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PublicNavbar />

      <div className="pt-14">
        {/* Player + Episode Sidebar */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Video Player */}
            <div className="flex-1 min-w-0">
              {currentUrl ? (
                <>
                  <div className="w-full max-w-8xl aspect-video bg-black rounded-2xl overflow-hidden">
                    <VideoPlayer src={currentUrl} title={movie.title} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-400 uppercase">Streamtape</span>
                    <span className="font-mono">{allStreams.find((s: any) => s.url === currentUrl)?.file_id || '—'}</span>
                    {allStreams.find((s: any) => s.url === currentUrl)?._uploaded && (
                      <span className="text-emerald-500 text-[9px] uppercase font-semibold">Uploaded</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full aspect-video bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                  <div className="text-center">
                    <Film className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">No stream available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Episode Sidebar */}
            {hasMultiple && (
              <div className="w-full lg:w-72 xl:w-80 shrink-0">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
                    <List className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs font-medium">Episodes</span>
                    <span className="text-[10px] text-zinc-500 ml-auto">{allStreams.length}</span>
                  </div>
                  <div className="overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-250px)] p-2">
                    <div className="grid grid-cols-5 gap-1">
                      {allStreams.map((s: any, i: number) => {
                        const epUrl = s.url;
                        const isActive = activeUrl === epUrl;
                        return (
                          <button key={i} onClick={() => { if (epUrl) setActiveUrl(epUrl); }}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition cursor-pointer ${
                              isActive
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                            }`}>
                            <span>{i + 1}</span>
                            <span className={`text-[7px] font-mono mt-0.5 truncate max-w-full px-0.5 ${isActive ? 'text-red-200' : 'text-zinc-600'}`}>{s.file_id?.substring(0, 6)}</span>
                            {s._uploaded && <span className={`text-[6px] uppercase ${isActive ? 'text-red-300' : 'text-emerald-600'}`}>UP</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
