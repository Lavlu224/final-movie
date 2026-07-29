"use client";

import { useState, useEffect, useCallback } from 'react';
import { searchAllSites } from '@/lib/multisource';
import { createMovie } from '@/lib/movies';
import { Search, ArrowLeft, ExternalLink, Link as LinkIcon, Film, Play, Upload, RefreshCw, CheckCircle2, Library } from 'lucide-react';
import Link from 'next/link';

const BACKEND_URL = 'https://api.zenty.live';
const PROXY_URL = `${BACKEND_URL}/multisource/proxy-image?url=`;

const getPosterUrl = (url: string | null) => {
  if (!url) return 'https://placehold.co/80x112/333/666?text=N/A';
  return `${PROXY_URL}${encodeURIComponent(url)}`;
};

const sourceColors: Record<string, string> = {
  katmoviehd: "bg-red-600/20 text-red-400",
  katmovie18: "bg-purple-600/20 text-purple-400",
  moviesbaba: "bg-blue-600/20 text-blue-400",
  katdrama: "bg-green-600/20 text-green-400",
  pikahd: "bg-yellow-600/20 text-yellow-400",
  kmhd: "bg-cyan-600/20 text-cyan-400",
  unknown: "bg-zinc-800 text-zinc-400",
};

function StreamtapeTransferBtn({ fileId, onNewId }: { fileId: string; onNewId?: (oldId: string, newId: string) => void }) {
  const [transferState, setTransferState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  const pollStatus = async (fileName: string) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${BACKEND_URL}/multisource/streamtape/status`);
        const data = await res.json();
        const found = data.completed?.find((u: any) =>
          u.file_name?.toLowerCase().includes((fileName || '').toLowerCase().slice(0, 20))
        );
        if (found && found.file_id) {
          setResult((prev: any) => ({ ...prev, upload_result: { linkid: found.file_id, link: found.url } }));
          setTransferState('done');
          setPolling(false);
          onNewId?.(fileId, found.file_id);
          return;
        }
      } catch {}
    }
    setTransferState('error');
    setPolling(false);
  };

  const handleTransfer = async () => {
    setTransferState('loading');
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/multisource/streamtape/transfer?file_id=${fileId}`);
      const data = await res.json();
      setResult(data);
      if (data.success && data.upload_result?.linkid) {
        setTransferState('done');
        onNewId?.(fileId, data.upload_result.linkid);
      } else if (data.success && data.file_name) {
        setPolling(true);
        pollStatus(data.file_name);
      } else {
        setTransferState('error');
      }
    } catch {
      setTransferState('error');
      setResult({ message: 'Network error' });
    }
  };

  const newId = result?.upload_result?.linkid;

  if (transferState === 'done' && newId) {
    return (
      <div className="mt-1 flex items-center justify-center gap-1">
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
        <span className="text-[9px] font-mono text-emerald-300 truncate max-w-[80px]">{newId}</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      <button onClick={handleTransfer} disabled={transferState === 'loading' || polling}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] sm:text-[10px] font-medium transition cursor-pointer w-full justify-center
          disabled:opacity-50
          text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 hover:bg-cyan-900/30">
        <Upload className={`h-2.5 w-2.5 ${transferState === 'loading' || polling ? 'animate-bounce' : ''}`} />
        {transferState === 'loading' ? 'Uploading...' : polling ? 'Fetching ID...' : 'Transfer'}
      </button>
      {transferState === 'error' && <div className="text-[9px] text-red-400 text-center mt-0.5">Failed</div>}
    </div>
  );
}

function StreamLinkFetcher({ link }: { link: string }) {
  const [streams, setStreams] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchLinks = async () => {
    if (fetched) return;
    setLoading(true);
    setFetched(true);
    try {
      const res = await fetch(`${BACKEND_URL}/multisource/fetch-url?url=${encodeURIComponent(link)}`);
      const data = await res.json();
      const items: any[] = [];
      if (data.stream_data) {
        for (const [_, sd] of Object.entries(data.stream_data) as any) {
          if (sd.streamtape) items.push({ type: "Streamtape", id: sd.streamtape, url: `https://streamtape.com/e/${sd.streamtape}` });
          else if (sd._1xbet) items.push({ type: "1xBet", id: "", url: sd._1xbet });
          else if (sd._4rabet) items.push({ type: "4raBet", id: "", url: sd._4rabet });
        }
      }
      setStreams(items);
    } catch {
      setStreams([]);
    }
    setLoading(false);
  };

  return (
    <div>
      {!fetched && (
          <button onClick={fetchLinks} disabled={loading}
            className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-medium transition mt-1.5 sm:mt-2">
          <Play className="h-4 w-4" />
          {loading ? 'Loading...' : 'Show Stream Links'}
        </button>
      )}
      {streams && streams.length > 0 && (
        <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
          {streams.map((s: any, i: number) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 bg-zinc-950 border border-zinc-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:border-cyan-800 transition group">
              <Play className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
              <span className="font-medium text-cyan-400 uppercase text-[10px] sm:text-xs shrink-0">{s.type}</span>
              <span className="text-xs text-zinc-500 break-all min-w-0">{s.url}</span>
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-600 group-hover:text-cyan-400 shrink-0" />
            </a>
          ))}
        </div>
      )}
      {streams && streams.length === 0 && <p className="text-[10px] sm:text-xs text-zinc-500 mt-1.5 sm:mt-2">No stream links found.</p>}
    </div>
  );
}

export default function AddContentPage() {
  const renderStreamDataCards = (item: any) => {
    if (!item.stream_data) return null;
    const seenIds = new Set<string>();
    const allCards: any[] = [];
    for (const [linkUrl, data] of Object.entries(item.stream_data) as any) {
      if (data._kmhd_file || data._kmhd_play) continue;
      if (data.streamtape && !seenIds.has(data.streamtape)) { seenIds.add(data.streamtape); allCards.push({ type: 'Streamtape', id: data.streamtape, url: `https://streamtape.com/e/${data.streamtape}`, linkUrl }); }
      if (data._1xbet && !seenIds.has(data._1xbet)) { seenIds.add(data._1xbet); allCards.push({ type: '1xBet', id: data._1xbet, url: data._1xbet, linkUrl }); }
      if (data._4rabet && !seenIds.has(data._4rabet)) { seenIds.add(data._4rabet); allCards.push({ type: '4raBet', id: data._4rabet, url: data._4rabet, linkUrl }); }
    }
    if (allCards.length === 0) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-2 sm:mb-3">
        {allCards.map((s, si) => {
          const tid = s.type === 'Streamtape' ? transferredIds[s.id] : null;
          return (
            <div key={`${s.linkUrl}-${si}`}
              className={`rounded-lg px-2.5 py-2 text-center border transition ${
                tid
                  ? 'bg-emerald-950/30 border-emerald-700/50'
                  : 'bg-zinc-950 border-zinc-800/60 hover:border-cyan-800/40'
              }`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${
                tid ? 'text-emerald-400' : s.type === '1xBet' ? 'text-green-400' : s.type === '4raBet' ? 'text-orange-400' : 'text-cyan-400'
              }`}>{s.type}</div>
              {tid ? (
                <div className="mt-1">
                  <span className="text-[10px] font-mono text-emerald-300 truncate block max-w-full">{tid}</span>
                  <a href={`https://streamtape.com/e/${tid}`} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition">
                    Play
                  </a>
                </div>
              ) : (
                <div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300 truncate max-w-full transition">
                    {s.id.substring(0, 12)}...
                  </a>
                  {s.type === 'Streamtape' && (
                    <StreamtapeTransferBtn fileId={s.id} onNewId={handleNewId} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'url'>('search');
  const [transferredIds, setTransferredIdsState] = useState<Record<string, string>>({});
  const [loadingLinks, setLoadingLinks] = useState<Record<number, boolean>>({});
  const [streamLinks, setStreamLinks] = useState<Record<number, any[]>>({});
  const [episodesData, setEpisodesData] = useState<Record<number, any[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<number>>(new Set());
  const [transferringAll, setTransferringAll] = useState<Set<number>>(new Set());
  const [customEpisodes, setCustomEpisodes] = useState<Record<number, { title: string; streamtape_id: string }[]>>({});
  const [showAddEpisode, setShowAddEpisode] = useState<Record<number, boolean>>({});

  const fetchEpisodes = async (index: number, force = false) => {
    const item = results[index];
    if (!item?.link) return;
    if (!force && episodesData[index]) return;
    setLoadingEpisodes(prev => new Set(prev).add(index));
    try {
      const res = await fetch(`${BACKEND_URL}/multisource/fetch-episodes?url=${encodeURIComponent(item.link)}`);
      const data = await res.json();
      let eps = data.episodes || [];
      // Merge episodes from stream_data if any are missing
      const seenIds = new Set(eps.flatMap((e: any) => e.streams?.map((s: any) => s.id) || []));
      if (item.stream_data) {
        for (const [_, sd] of Object.entries(item.stream_data) as any) {
          if (sd.streamtape && !seenIds.has(sd.streamtape)) {
            const epName = sd.name || sd._episode || '';
            const epNum = String(epName).match(/\d+/)?.[0] || String(Object.keys(item.stream_data).length - eps.length);
            const title = epNum ? `Episode ${epNum.padStart(2, '0')}` : `Episode ${eps.length + 1}`;
            eps.push({ title, streams: [{ type: 'streamtape', id: sd.streamtape, url: `https://streamtape.com/e/${sd.streamtape}` }], url: item.link });
            seenIds.add(sd.streamtape);
          }
        }
      }
      // Sort episodes numerically
      eps.sort((a: any, b: any) => {
        const na = parseInt(a.title.match(/\d+/)?.[0] || '0');
        const nb = parseInt(b.title.match(/\d+/)?.[0] || '0');
        return na - nb;
      });
      if (eps.length > 0) setEpisodesData(prev => ({ ...prev, [index]: eps }));
    } catch {}
    setLoadingEpisodes(prev => { const n = new Set(prev); n.delete(index); return n; });
  };

  const handleTransferAll = async (index: number, title: string) => {
    let eps = episodesData[index];
    if (!eps || eps.length === 0) {
      const item = results[index];
      if (!item?.link) return;
      try {
        const res = await fetch(`${BACKEND_URL}/multisource/fetch-episodes?url=${encodeURIComponent(item.link)}`);
        const data = await res.json();
        let fetched = data.episodes || [];
        // Merge from stream_data
        const seenIds = new Set(fetched.flatMap((e: any) => e.streams?.map((s: any) => s.id) || []));
        if (item.stream_data) {
          for (const [_, sd] of Object.entries(item.stream_data) as any) {
            if (sd.streamtape && !seenIds.has(sd.streamtape)) {
              const epName = sd.name || sd._episode || '';
              const epNum = String(epName).match(/\d+/)?.[0] || String(Object.keys(item.stream_data).length - fetched.length);
              fetched.push({ title: epNum ? `Episode ${epNum.padStart(2, '0')}` : `Episode ${fetched.length + 1}`, streams: [{ type: 'streamtape', id: sd.streamtape, url: `https://streamtape.com/e/${sd.streamtape}` }], url: item.link });
              seenIds.add(sd.streamtape);
            }
          }
        }
        // Sort episodes numerically
        fetched.sort((a: any, b: any) => {
          const na = parseInt(a.title.match(/\d+/)?.[0] || '0');
          const nb = parseInt(b.title.match(/\d+/)?.[0] || '0');
          return na - nb;
        });
        if (fetched.length > 0) {
          setEpisodesData(prev => ({ ...prev, [index]: fetched }));
          eps = fetched;
        }
      } catch {}
      if (!eps || eps.length === 0) return;
    }
    setTransferringAll(prev => new Set(prev).add(index));

    // Create a folder first
    let folderId = '';
    try {
      const folderRes = await fetch(`${BACKEND_URL}/multisource/streamtape/create-folder?name=${encodeURIComponent(title)}`);
      const folderData = await folderRes.json();
      if (folderData.success && folderData.folder_id) {
        folderId = folderData.folder_id;
      }
    } catch {}

    // Start all transfers (with folder_id) and collect file names for polling
    const transfers: { fileId: string; fileName: string }[] = [];
    for (const ep of eps) {
      for (const st of (ep.streams || [])) {
        if (st.type?.toLowerCase() === 'streamtape' && st.id) {
          try {
            const url = `${BACKEND_URL}/multisource/streamtape/transfer?file_id=${st.id}${folderId ? `&folder_id=${folderId}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.upload_result?.linkid) {
              setTransferredIds(prev => ({ ...prev, [st.id]: data.upload_result.linkid }));
            } else if (data.success && data.file_name) {
              transfers.push({ fileId: st.id, fileName: data.file_name });
            }
          } catch {}
        }
      }
    }
    // Also transfer custom episodes
    const customEps = customEpisodes[index] || [];
    for (const ep of customEps) {
      if (ep.streamtape_id) {
        try {
          const url = `${BACKEND_URL}/multisource/streamtape/transfer?file_id=${ep.streamtape_id}${folderId ? `&folder_id=${folderId}` : ''}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.upload_result?.linkid) {
            setTransferredIds(prev => ({ ...prev, [ep.streamtape_id]: data.upload_result.linkid }));
          } else if (data.success && data.file_name) {
            transfers.push({ fileId: ep.streamtape_id, fileName: data.file_name });
          }
        } catch {}
      }
    }

    // Poll for remaining transfers
    if (transfers.length > 0) {
      let attempts = 0;
      const maxAttempts = 36;
      const poll = async () => {
        while (attempts < maxAttempts && transfers.length > 0) {
          await new Promise(r => setTimeout(r, 5000));
          attempts++;
          try {
            const res = await fetch(`${BACKEND_URL}/multisource/streamtape/status`);
            const data = await res.json();
            for (let t = transfers.length - 1; t >= 0; t--) {
              const tr = transfers[t];
              const found = data.completed?.find((u: any) =>
                u.file_name?.toLowerCase().includes(tr.fileName.toLowerCase().slice(0, 20))
              );
              if (found && found.file_id) {
                setTransferredIds(prev => ({ ...prev, [tr.fileId]: found.file_id }));
                transfers.splice(t, 1);
              }
            }
          } catch {}
        }
      };
      await poll();
    }

    setTransferringAll(prev => { const n = new Set(prev); n.delete(index); return n; });
  };

  // Load transferred IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('transferredIds');
      if (saved) setTransferredIdsState(JSON.parse(saved));
    } catch {}
  }, []);

  // Auto-fetch episodes for TV show results
  useEffect(() => {
    results.forEach((item, i) => {
      const hasEp = item.stream_data && Object.values(item.stream_data).some((v: any) => v._episode);
      if ((item.is_tv || hasEp) && item.link && !episodesData[i] && !loadingEpisodes.has(i)) {
        fetchEpisodes(i, false);
      }
    });
  }, [results]);

  // Persist to localStorage on change
  const setTransferredIds = useCallback((fn: (prev: Record<string, string>) => Record<string, string>) => {
    setTransferredIdsState(prev => {
      const next = fn(prev);
      try { localStorage.setItem('transferredIds', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isUrl = (v: string) => v.startsWith('http://') || v.startsWith('https://');

  const handleNewId = (oldId: string, newId: string) => {
    setTransferredIds(prev => ({ ...prev, [oldId]: newId }));
  };

  const addCustomEpisode = (index: number) => {
    setShowAddEpisode(prev => ({ ...prev, [index]: true }));
  };

  const saveCustomEpisode = (index: number) => {
    const title = (document.getElementById(`ep-title-${index}`) as HTMLInputElement)?.value?.trim();
    const id = (document.getElementById(`ep-id-${index}`) as HTMLInputElement)?.value?.trim();
    if (!title || !id) return;
    setCustomEpisodes(prev => ({
      ...prev,
      [index]: [...(prev[index] || []), { title, streamtape_id: id }],
    }));
    setShowAddEpisode(prev => ({ ...prev, [index]: false }));
  };

  const removeCustomEpisode = (index: number, epIndex: number) => {
    setCustomEpisodes(prev => ({
      ...prev,
      [index]: prev[index].filter((_, i) => i !== epIndex),
    }));
  };

  const handleRewrite = (index: number) => {
    const item = results[index];
    const newTitle = item.title ? item.title.replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80) : item.title;
    const newExcerpt = item.excerpt ? item.excerpt.replace(/\s+/g, ' ').trim().slice(0, 180) : item.excerpt;
    setResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], title: newTitle, excerpt: newExcerpt };
      return next;
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);

    if (isUrl(query)) {
      const res = await fetch(`${BACKEND_URL}/multisource/fetch-url?url=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.error ? [] : [data]);
    } else {
      const data = await searchAllSites(query);
      setResults(data.results || []);
    }

    setLoading(false);
  };

  const fetchStreamLinks = async (item: any, index: number) => {
    setLoadingLinks(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/multisource/stream-links?url=${encodeURIComponent(item.link)}`);
      const data = await res.json();
      setStreamLinks(prev => ({ ...prev, [index]: data.links || [] }));
    } catch {
      setStreamLinks(prev => ({ ...prev, [index]: [] }));
    }
    setLoadingLinks(prev => ({ ...prev, [index]: false }));
  };

  const [importing, setImporting] = useState<Set<number>>(new Set());
  const [importModal, setImportModal] = useState<{ show: boolean; success: boolean; message: string; index?: number }>({ show: false, success: false, message: '' });

  const handleImport = async (index: number) => {
    const item = results[index];
    if (!item) return;
    setImporting(prev => new Set(prev).add(index));
    try {
      const yearMatch = item.title?.match(/\((\d{4})\)/);
      // Build stream_links from scraped data
      const sl: { provider: string; url: string; file_id?: string }[] = [];
      const seenUrls = new Set<string>();
      // from item.streams (kmhd direct)
      if (item.streams) {
        for (const s of item.streams) {
          if (s.url && !seenUrls.has(s.url)) {
            seenUrls.add(s.url);
            sl.push({ provider: s.type || 'streamtape', url: s.url, file_id: s.id || '' });
          }
        }
      }
      // from item.stream_data (WordPress)
      if (item.stream_data) {
        for (const [_, data] of Object.entries(item.stream_data) as any) {
          if (data.streamtape) {
            const u = `https://streamtape.com/e/${data.streamtape}`;
            if (!seenUrls.has(u)) { seenUrls.add(u); sl.push({ provider: 'streamtape', url: u, file_id: data.streamtape }); }
          }
          if (data._1xbet && !seenUrls.has(data._1xbet)) { seenUrls.add(data._1xbet); sl.push({ provider: '1xbet', url: data._1xbet }); }
          if (data._4rabet && !seenUrls.has(data._4rabet)) { seenUrls.add(data._4rabet); sl.push({ provider: '4rabet', url: data._4rabet }); }
        }
      }
      await createMovie({
        title: item.title || '',
        excerpt: item.excerpt || '',
        poster: item.poster || item.image || '',
        source: item.source || '',
        source_url: item.link || item.url || '',
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        stream_links: sl,
      });
      setImportModal({ show: true, success: true, message: 'Movie imported successfully!', index });
    } catch (e: any) {
      setImportModal({ show: true, success: false, message: 'Import failed: ' + (e.message || 'Unknown error'), index });
    }
    setImporting(prev => { const n = new Set(prev); n.delete(index); return n; });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 lg:mb-8">
        <Link href="/admin/content" className="text-zinc-400 hover:text-white mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Add Content</h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base">Search by name or paste URL to import from external sources</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 mb-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setMode('search')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl text-sm font-medium transition ${mode === 'search' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            <Search className="h-4 w-4" /> Search by Name
          </button>
          <button onClick={() => setMode('url')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl text-sm font-medium transition ${mode === 'url' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            <LinkIcon className="h-4 w-4" /> Import by URL
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            {mode === 'search' ? <Search className="absolute left-5 top-4 h-5 w-5 text-zinc-500" /> : <LinkIcon className="absolute left-5 top-4 h-5 w-5 text-zinc-500" />}
            <input
              type="text"
              placeholder={mode === 'search' ? "Type movie name (e.g., inception)..." : "Paste full movie URL..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-zinc-950 border border-zinc-800 pl-12 pr-4 py-4 rounded-2xl text-base focus:outline-none focus:border-red-600 transition"
            />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/60 px-6 sm:px-10 py-4 rounded-2xl font-medium transition flex items-center justify-center gap-2 w-full sm:w-auto">
            {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Fetching...' : mode === 'search' ? 'Search All' : 'Fetch'}
          </button>
        </div>

        {mode === 'search' && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="text-xs text-zinc-500 mr-2">Sources:</span>
            {["katmoviehd", "katmovie18", "moviesbaba", "katdrama", "pikahd"].map(s => (
              <span key={s} className={`px-3 py-1 rounded-full text-xs ${sourceColors[s]}`}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-10 w-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">{mode === 'search' ? 'Searching across 5 sources...' : 'Fetching page metadata...'}</p>
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500">{results.length} result{results.length > 1 ? 's' : ''} found</p>
          {results.map((item, i) => (
            <div key={`${item.source}-${item.id}-${i}`} className="bg-zinc-900 border border-zinc-800 rounded-2xl lg:rounded-3xl p-3 sm:p-5 lg:p-6 hover:border-zinc-700 transition overflow-hidden">
              <div className="flex flex-wrap items-start gap-2 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight flex-1 min-w-0 truncate">{item.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleRewrite(i)}
                    className="text-[10px] sm:text-[11px] flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg transition cursor-pointer font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700">
                    Rewrite
                  </button>
                  {item.is_tv && <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap bg-yellow-600/20 text-yellow-400">TV</span>}
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${sourceColors[item.source] || "bg-zinc-800 text-zinc-400"}`}>{item.source}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Poster */}
                <div className="max-w-[140px] sm:max-w-none mx-auto sm:mx-0">
                  <label className="block text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mb-1.5 sm:mb-2">Poster</label>
                  <img src={getPosterUrl(item.poster)} alt={item.title}
                    className="w-full aspect-[2/3] rounded-xl sm:rounded-2xl object-cover bg-zinc-800 border border-zinc-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/333/666?text=No+Poster' }} />
                </div>

                {/* Fields */}
                <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2">
                    <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider sm:shrink-0 sm:min-w-[100px]">Movie Name</span>
                    <span className="text-xs sm:text-sm text-white">{item.title}</span>
                  </div>
                  {[
                    { key: 'imdb_rating', label: 'IMDB Rating' },
                    { key: 'director', label: 'Director' },
                    { key: 'star_cast', label: 'Star Cast' },
                    { key: 'resolution', label: 'Resolution' },
                    { key: 'genre', label: 'Genre' },
                    { key: 'language', label: 'Language' },
                  ].map(({ key, label }) => {
                    const val = item.extra?.[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2">
                        <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider sm:shrink-0 sm:min-w-[100px]">{label}</span>
                        <span className="text-xs sm:text-sm text-zinc-300 break-words">{val}</span>
                      </div>
                    );
                  })}

                  {/* Stream Links */}
                  <div className="pt-1 sm:pt-2">
                    <label className="block text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mb-1.5 sm:mb-2">Streaming Links</label>
                    
                    {/* Direct streams (from kmhd fetch) */}
                    {item.streams && item.streams.length > 0 && (
                      <div className="space-y-1 sm:space-y-1.5 mb-2 sm:mb-3">
                        {item.streams.map((s: any, si: number) => {
                          const newId = transferredIds[s.id];
                          const isTransferred = !!(s.type === 'streamtape' || s.type === 'streamtape.com') && newId;
                          return (
                          <div key={si}>
                            {isTransferred ? (
                              <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-950/30 border border-emerald-700/50 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm">
                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                                <span className="font-medium text-emerald-400 uppercase text-[10px] sm:text-xs shrink-0">Streamtape</span>
                                <span className="text-xs text-emerald-300 break-all min-w-0 max-w-[120px] sm:max-w-[200px]">{newId}</span>
                                <a href={`https://streamtape.com/e/${newId}`} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] sm:text-xs flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition shrink-0">
                                  <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Play
                                </a>
                              </div>
                            ) : (
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 sm:gap-2 bg-cyan-950/30 border border-cyan-800/40 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-cyan-900/30 transition group">
                              <Film className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 shrink-0" />
                              <span className="font-medium text-cyan-400 uppercase text-[10px] sm:text-xs shrink-0">{s.type}</span>
                              <span className="text-zinc-400 text-xs break-all min-w-0">ID: {s.id}</span>
                              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-600 group-hover:text-cyan-400 shrink-0" />
                            </a>
                            )}
                            {!isTransferred && (s.type === 'streamtape' || s.type === 'streamtape.com') && s.id && (
                              <StreamtapeTransferBtn fileId={s.id} onNewId={handleNewId} />
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Stream data from WordPress post (auto-fetched) - card grid */}
                    {renderStreamDataCards(item)}

                    {/* Manual fetch button for search results or when auto-fetch didn't run */}
                    {!item.streams && (!item.stream_data || Object.keys(item.stream_data).length === 0) && item.source !== 'kmhd' && (
                      <StreamLinkFetcher link={item.link} />
                    )}
                  </div>

                  <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border-t border-zinc-800">
                    <button onClick={() => handleImport(i)} disabled={importing.has(i)}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer">
                      <Library className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {importing.has(i) ? 'Importing...' : 'Import to Library'}
                    </button>
                    {(item.is_tv || (item.stream_data && Object.values(item.stream_data).some((v: any) => v._episode))) && (
                      <button onClick={() => handleTransferAll(i, results[i]?.title || 'TV Show')}
                        disabled={transferringAll.has(i)}
                        className="flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 bg-cyan-950/30 text-cyan-400 border border-cyan-800/40 hover:bg-cyan-900/30">
                        <Upload className={`h-3.5 w-3.5 ${transferringAll.has(i) ? 'animate-bounce' : ''}`} />
                        {transferringAll.has(i) ? 'Transferring...' : 'Transfer All'}
                      </button>
                    )}
                  </div>

                  {/* Episodes section */}
                  {loadingEpisodes.has(i) && !episodesData[i] && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800">
                      <div className="text-[10px] sm:text-xs text-zinc-500 animate-pulse">Loading episodes...</div>
                    </div>
                  )}
                  {episodesData[i] && episodesData[i].length > 0 && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <label className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">
                          Episodes ({episodesData[i].length + (customEpisodes[i]?.length || 0)})
                          <button onClick={() => fetchEpisodes(i, true)} disabled={loadingEpisodes.has(i)}
                            className="ml-2 text-[10px] text-zinc-600 hover:text-zinc-400 underline underline-offset-2 disabled:opacity-50 cursor-pointer">
                            {loadingEpisodes.has(i) ? '...' : 'Refresh'}
                          </button>
                        </label>
                        <button onClick={() => addCustomEpisode(i)}
                          className="text-[10px] sm:text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700">
                          + Add Episode
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        {/* Add episode form */}
                        {showAddEpisode[i] && (
                          <div className="bg-zinc-950 border border-cyan-800/40 rounded-lg px-2.5 py-2 text-center">
                            <input id={`ep-title-${i}`} type="text" placeholder="E.g. E01"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 mb-1.5 focus:outline-none focus:border-cyan-700"
                              onKeyDown={(e) => e.key === 'Enter' && saveCustomEpisode(i)} />
                            <input id={`ep-id-${i}`} type="text" placeholder="Streamtape ID"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 mb-1.5 focus:outline-none focus:border-cyan-700 font-mono"
                              onKeyDown={(e) => e.key === 'Enter' && saveCustomEpisode(i)} />
                            <div className="flex gap-1">
                              <button onClick={() => saveCustomEpisode(i)}
                                className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition cursor-pointer">
                                Save
                              </button>
                              <button onClick={() => setShowAddEpisode(prev => ({ ...prev, [i]: false }))}
                                className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition cursor-pointer">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Custom episodes */}
                        {(customEpisodes[i] || []).map((ep, ei) => {
                          const tid = transferredIds[ep.streamtape_id];
                          return (
                            <div key={`custom-${ei}`} className="bg-zinc-950 border border-zinc-800/60 rounded-lg px-2.5 py-2 text-center group hover:border-cyan-800/40 transition relative">
                              <button onClick={() => removeCustomEpisode(i, ei)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] leading-none hover:bg-red-700 transition cursor-pointer hidden group-hover:block z-10">
                                ×
                              </button>
                              <div className="text-[10px] sm:text-xs font-medium text-zinc-400 truncate">{ep.title}</div>
                              {tid ? (
                                <div className="mt-1">
                                  <span className="text-[9px] font-mono text-emerald-300 block truncate">{tid}</span>
                                  <a href={`https://streamtape.com/e/${tid}`} target="_blank"
                                    className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition">
                                    Play
                                  </a>
                                </div>
                              ) : (
                                <StreamtapeTransferBtn fileId={ep.streamtape_id} onNewId={handleNewId} />
                              )}
                            </div>
                          );
                        })}
                        {/* Auto-fetched episodes */}
                        {episodesData[i].map((ep: any, ei: number) => (
                          <div key={ei} className="bg-zinc-950 border border-zinc-800/60 rounded-lg px-2.5 py-2 text-center group hover:border-cyan-800/40 transition">
                            <div className="text-[10px] sm:text-xs font-medium text-zinc-400 truncate">{ep.title}</div>
                            {ep.streams?.map((st: any, si: number) => (
                              st.type?.toLowerCase() === 'streamtape' ? (
                                <StreamtapeTransferBtn key={si} fileId={st.id} onNewId={handleNewId} />
                              ) : (
                                <a key={si} href={st.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition
                                    bg-cyan-950/30 text-cyan-400 border border-cyan-800/40 hover:bg-cyan-900/30">
                                  {st.type}
                                </a>
                              )
                            ))}
                            {(!ep.streams || ep.streams.length === 0) && (
                              <div className="mt-1.5 text-[9px] sm:text-[10px] text-zinc-600">No links</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : query && !loading ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try a different name or check the URL</p>
        </div>
      ) : null}

      {/* Import Modal */}
      {importModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${importModal.success ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {importModal.success ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                ) : (
                  <div className="text-red-400 text-2xl font-bold">!</div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">{importModal.success ? 'Success' : 'Error'}</h3>
              <p className="text-sm text-zinc-400 mb-6">{importModal.message}</p>
              <button onClick={() => setImportModal({ show: false, success: false, message: '' })}
                className={`w-full py-3 rounded-2xl text-sm font-medium transition cursor-pointer ${
                  importModal.success
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}>
                {importModal.success ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
