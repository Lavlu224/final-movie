"use client";

interface VideoPlayerProps {
  src: string;
  title?: string;
}

const API = 'http://localhost:8000';

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const stMatch = src.match(/streamtape\.com\/[ve]\/([a-zA-Z0-9]+)/);
  const videoSrc = stMatch ? `${API}/multisource/streamtape/play?file_id=${stMatch[1]}` : src;

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video src={videoSrc} controls playsInline autoPlay className="w-full h-full">
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
