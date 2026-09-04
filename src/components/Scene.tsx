"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import Court from "./Court";
import Player from "./Player";
import Ball from "./Ball";

const DURATION = 6;

const initialBlue = [
  { pos: [-16, 0, 0] as [number, number, number], gk: true },
  { pos: [-8, 0, -6] as [number, number, number], gk: false },
  { pos: [-8, 0, 6] as [number, number, number], gk: false },
  { pos: [-3, 0, -3] as [number, number, number], gk: false },
  { pos: [-3, 0, 3] as [number, number, number], gk: false },
  { pos: [2, 0, 0] as [number, number, number], gk: false },
  { pos: [5, 0, -5] as [number, number, number], gk: false },
];

const initialRed = [
  { pos: [16, 0, 0] as [number, number, number], gk: true },
  { pos: [10, 0, -5] as [number, number, number], gk: false },
  { pos: [10, 0, 5] as [number, number, number], gk: false },
  { pos: [6, 0, -2] as [number, number, number], gk: false },
  { pos: [6, 0, 2] as [number, number, number], gk: false },
  { pos: [3, 0, 0] as [number, number, number], gk: false },
  { pos: [1, 0, 4] as [number, number, number], gk: false },
];

function interpolate(t: number) {
  const blue = initialBlue.map((p, i) => {
    let x = p.pos[0];
    let z = p.pos[2];
    if (i === 5) {
      x = -3 + t * 18;
      z = 0 + Math.sin(t * Math.PI) * 2;
    } else if (i > 0 && i < 6) {
      x = p.pos[0] + t * 10;
    }
    return { pos: [x, 0, z] as [number, number, number], gk: p.gk };
  });

  const red = initialRed.map((p, i) => {
    let x = p.pos[0];
    let z = p.pos[2];
    if (i > 0) {
      x = p.pos[0] - t * 4;
    }
    return { pos: [x, 0, z] as [number, number, number], gk: p.gk };
  });

  const ballX = -2 + t * 19;
  const ballY = 0.15 + Math.sin(t * Math.PI * 2) * 0.4;
  const ballZ = Math.sin(t * Math.PI) * 1.5;

  return { blue, red, ball: [ballX, ballY, ballZ] as [number, number, number] };
}

function pickMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export default function Scene() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const requestRef = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const loopOnce = useRef(false);

  useEffect(() => {
    if (!playing) return;

    const animate = (time: number) => {
      if (startTime.current === null) startTime.current = time;
      const elapsed = (time - startTime.current) / 1000;
      if (loopOnce.current) {
        const t = Math.min(elapsed / DURATION, 1);
        setProgress(t);
        if (t >= 1) {
          setPlaying(false);
          loopOnce.current = false;
          return;
        }
      } else {
        setProgress((elapsed % DURATION) / DURATION);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [playing]);

  const exportVideo = async () => {
    const canvas = canvasEl.current;
    if (!canvas || typeof MediaRecorder === "undefined") {
      alert("Este browser não permite gravar o canvas.");
      return;
    }

    const mimeType = pickMimeType();
    if (!mimeType) {
      alert("O browser não suporta gravação de vídeo a partir do canvas.");
      return;
    }

    setExporting(true);
    loopOnce.current = true;
    startTime.current = null;
    setProgress(0);
    setPlaying(true);

    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `andebol-3d-lance.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      stream.getTracks().forEach((t) => t.stop());
      setExporting(false);
    };

    recorder.start();
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, DURATION * 1000 + 250);
  };

  const { blue, red, ball } = interpolate(progress);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        className="rounded-xl"
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          canvasEl.current = gl.domElement;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 22, 28]} fov={45} />
        <OrbitControls
          enablePan={true}
          minDistance={8}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
        />

        <ambientLight intensity={0.55} />
        <directionalLight
          position={[15, 25, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Environment preset="city" />

        <Court />

        {blue.map((p, i) => (
          <Player
            key={`blue-${i}`}
            position={p.pos}
            color="#2563eb"
            isGoalkeeper={p.gk}
            number={i + 1}
          />
        ))}

        {red.map((p, i) => (
          <Player
            key={`red-${i}`}
            position={p.pos}
            color="#dc2626"
            isGoalkeeper={p.gk}
            number={i + 1}
          />
        ))}

        <Ball position={ball} />

        <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={50} blur={2} />
      </Canvas>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur px-4 py-3 rounded-full text-sm flex-wrap justify-center">
        <button
          onClick={() => setPlaying(!playing)}
          disabled={exporting}
          className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
        >
          {playing ? "Pausar" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          disabled={exporting}
          onChange={(e) => {
            setPlaying(false);
            setProgress(parseFloat(e.target.value));
          }}
          className="w-36 accent-blue-500"
        />
        <span className="text-zinc-300 w-12 text-right">{(progress * DURATION).toFixed(1)}s</span>
        <button
          onClick={exportVideo}
          disabled={exporting}
          className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 transition disabled:opacity-60"
        >
          {exporting ? "A gravar…" : "Exportar vídeo"}
        </button>
      </div>
    </div>
  );
}
