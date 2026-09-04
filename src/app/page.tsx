"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white">
              3D
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">Andebol 3D</h1>
              <p className="text-xs text-zinc-400">Representação simplificada de lances</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
            >
              Carregar vídeo de referência
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
        {videoUrl && (
          <div className="lg:w-2/5 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-400">Vídeo de referência</h2>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <button
              onClick={() => {
                setVideoUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 self-start"
            >
              Remover vídeo
            </button>
          </div>
        )}

        <div className={`flex-1 flex flex-col gap-2 ${videoUrl ? "lg:w-3/5" : "w-full"}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              Representação 3D do lance (demo de contra-ataque)
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600" /> Azul
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600" /> Vermelho
              </span>
            </div>
          </div>
          <div className="relative flex-1 min-h-[420px] lg:min-h-[560px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            <Scene />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        <p>
          Protótipo simples · Campo + balizas + avatares genéricos + bola ·
          Usa o vídeo como referência para analisar o lance em 3D
        </p>
        <p className="mt-1">
          Arrasta com o rato para rodar a câmara · Scroll para zoom · Controlo de play/pausa em baixo
        </p>
      </footer>
    </div>
  );
}
