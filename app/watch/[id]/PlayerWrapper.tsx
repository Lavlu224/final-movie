"use client";

import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-zinc-900 flex items-center justify-center text-zinc-500">
      Loading player...
    </div>
  ),
});

export default function PlayerWrapper({ src, title }: { src: string; title: string }) {
  return <VideoPlayer src={src} title={title} />;
}
