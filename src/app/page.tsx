"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { analyzeVideo, type ClipData } from "@/lib/analyzeVideo";
import type { Pt } from "@/lib/homography";
import CourtOverlay from "@/components/CourtOverlay";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

function uiToVideoPixel(video: HTMLVideoElement, wrap: HTMLElement, ui: Pt): Pt {
  const rect = wrap.getBoundingClientRect();
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.min(rect.width / vw, rect.height / vh);
  const ox = (rect.width - vw * scale) / 2;
  const oy = (rect.height - vh * scale) / 2;
  return { x: (ui.x - ox) / scale, y: (ui.y - oy) / scale };
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [corners, setCorners] = useState<Pt[]>([
    { x: 38, y: 238 },
    { x: 442, y: 238 },
    { x: 346, y: 49 },
    { x: 134, y: 49 },
  ]);
  const [calibrating, setCalibrating] = useState(true);
  const [box, setBox] = useState({ w: 480, h: 270 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth || 480, h: el.clientHeight || 270 }));
    ro.observe(el);
    setBox({ w: el.clientWidth || 480, h: el.clientHeight || 270 });
    return () => ro.disconnect();
  }, [videoUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setClip(null);
      setStatus("");
      setCalibrating(true);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const generate3D = async () => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) return;
    const pts =
      corners.length === 4
        ? corners
        : [
            { x: box.w * 0.08, y: box.h * 0.88 },
            { x: box.w * 0.92, y: box.h * 0.88 },
            { x: box.w * 0.72, y: box.h * 0.18 },
            { x: box.w * 0.28, y: box.h * 0.18 },
          ];
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
        pts.map((c) => uiToVideoPixel(video, wrap, c))
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
              <p className="text-xs text-zinc-400">Alinha o campo e gera o 3D</p>
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">Carregar vídeo</button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
        {videoUrl && (
          <div className="lg:w-2/5 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-400">{calibrating ? "Arrasta o campo amarelo sobre as linhas do vídeo" : "Vídeo de referência"}</h2>
            <div ref={wrapRef} className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
              <video ref={videoRef} src={videoUrl} controls={!calibrating} muted playsInline className="w-full h-full object-contain" />
              {calibrating && box.w > 10 && <CourtOverlay width={box.w} height={box.h} onChange={setCorners} />}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setCalibrating(true); setClip(null); }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">Ajustar campo</button>
              <button onClick={generate3D} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium">{busy ? "A gerar 3D…" : "Gerar representação 3D"}</button>
            </div>
            {status && <p className="text-xs text-zinc-400">{status}</p>}
            <p className="text-xs text-zinc-500">Não precisas de clicar nos cantos. Pausa o vídeo, alinha o campo amarelo com as linhas visíveis e gera o 3D.</p>
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
