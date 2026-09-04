"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { analyzeVideo, type ClipData } from "@/lib/analyzeVideo";
import type { Pt } from "@/lib/homography";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

const CORNER_LABELS = [
  "1. Canto esquerdo mais perto de ti",
  "2. Canto direito mais perto de ti",
  "3. Canto direito mais longe",
  "4. Canto esquerdo mais longe",
];

function clickToVideoPixel(video: HTMLVideoElement, e: React.MouseEvent) {
  const rect = video.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.min(rect.width / vw, rect.height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (rect.width - dw) / 2;
  const oy = (rect.height - dh) / 2;
  return { x: (x - ox) / scale, y: (y - oy) / scale, uiX: x, uiY: y };
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [corners, setCorners] = useState<(Pt & { uiX: number; uiY: number })[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setClip(null);
      setStatus("");
      setCorners([]);
      setCalibrating(true);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const onVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!calibrating || !videoRef.current || corners.length >= 4) return;
    setCorners((prev) => [...prev, clickToVideoPixel(videoRef.current!, e)]);
  };

  const generate3D = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (corners.length !== 4) {
      setStatus("Marca primeiro os 4 cantos do campo no vídeo.");
      setCalibrating(true);
      return;
    }
    setBusy(true);
    setStatus("A preparar…");
    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }
      const data = await analyzeVideo(
        video,
        (pct, label) => setStatus(`${label} (${pct}%)`),
        corners.map(({ x, y }) => ({ x, y }))
      );
      setClip(data);
      setCalibrating(false);
      setStatus(`3D gerado · ${data.frames.length} instantes · ${data.duration.toFixed(1)}s`);
    } catch (err) {
      console.error(err);
      setStatus("Falha na análise. Tenta Chrome no computador e um clip curto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white">3D</div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">Andebol 3D</h1>
              <p className="text-xs text-zinc-400">Calibra o campo e gera o 3D</p>
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition">Carregar vídeo</button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
        {videoUrl && (
          <div className="lg:w-2/5 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-400">
              {calibrating && corners.length < 4 ? CORNER_LABELS[corners.length] : "Vídeo de referência"}
            </h2>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
              <video ref={videoRef} src={videoUrl} controls={!calibrating || corners.length >= 4} muted playsInline onClick={onVideoClick} className={`w-full h-full object-contain ${calibrating && corners.length < 4 ? "cursor-crosshair" : ""}`} />
              {corners.map((c, i) => (
                <div key={i} className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-amber-400 border-2 border-white text-[10px] font-bold text-black flex items-center justify-center pointer-events-none" style={{ left: c.uiX, top: c.uiY }}>{i + 1}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setCorners([]); setCalibrating(true); setClip(null); }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">Remarcar cantos</button>
              <button onClick={generate3D} disabled={busy || corners.length !== 4} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium">{busy ? "A gerar 3D…" : "Gerar representação 3D"}</button>
            </div>
            {status && <p className="text-xs text-zinc-400">{status}</p>}
            <p className="text-xs text-zinc-500">Pausa o vídeo num frame em que se vejam os 4 cantos do campo. Clica-os nesta ordem: perto-esquerda, perto-direita, longe-direita, longe-esquerda.</p>
          </div>
        )}
        <div className={`flex-1 flex flex-col gap-2 ${videoUrl ? "lg:w-3/5" : "w-full"}`}>
          <h2 className="text-sm font-medium text-zinc-400">{clip ? "Representação 3D gerada do vídeo" : "Representação 3D (demo)"}</h2>
          <div className="relative flex-1 min-h-[420px] lg:min-h-[560px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            <Scene clip={clip} />
          </div>
        </div>
      </main>
    </div>
  );
}
