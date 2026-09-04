"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { analyzeVideo, type ClipData } from "@/lib/analyzeVideo";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setClip(null);
      setStatus("");
      setVideoUrl(url);
    }
  };

  const generate3D = async () => {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    setStatus("A preparar…");
    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }
      const data = await analyzeVideo(video, (pct, label) => {
        setStatus(`${label} (${pct}%)`);
      });
      setClip(data);
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
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white">
              3D
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">Andebol 3D</h1>
              <p className="text-xs text-zinc-400">Do vídeo para uma representação 3D aproximada</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
          >
            Carregar vídeo
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
        {videoUrl && (
          <div className="lg:w-2/5 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-400">Vídeo de referência</h2>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
              <video ref={videoRef} src={videoUrl} controls muted playsInline className="w-full h-full object-contain" />
            </div>
            <button
              onClick={generate3D}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
            >
              {busy ? "A gerar 3D…" : "Gerar representação 3D"}
            </button>
            {status && <p className="text-xs text-zinc-400">{status}</p>}
            <p className="text-xs text-zinc-500">
              A análise corre no teu browser. Usa um lance curto (idealmente até 15 s) e o campo visível. As posições são aproximadas (uma só câmara).
            </p>
          </div>
        )}

        <div className={`flex-1 flex flex-col gap-2 ${videoUrl ? "lg:w-3/5" : "w-full"}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              {clip ? "Representação 3D gerada do vídeo" : "Representação 3D (demo)"}
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600" /> Azul</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600" /> Vermelho</span>
            </div>
          </div>
          <div className="relative flex-1 min-h-[420px] lg:min-h-[560px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            <Scene clip={clip} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        <p>1) Carrega o vídeo · 2) Clica em Gerar representação 3D · 3) Exporta se quiseres</p>
      </footer>
    </div>
  );
}
