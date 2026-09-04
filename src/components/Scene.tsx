"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import Court from "./Court";
import Player from "./Player";
import Ball from "./Ball";

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

export default function Scene() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const requestRef = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;

    const animate = (time: number) => {
      if (startTime.current === null) startTime.current = time;
      const elapsed = (time - startTime.current) / 1000;
      const duration = 6;
      const t = (elapsed % duration) / duration;
      setProgress(t);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [playing]);

  const { blue, red, ball } = interpolate(progress);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows className="rounded-xl">
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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur px-5 py-3 rounded-full text-sm">
        <button
          onClick={() => setPlaying(!playing)}
          className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          {playing ? "Pausar" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            setPlaying(false);
            setProgress(parseFloat(e.target.value));
          }}
          className="w-40 accent-blue-500"
        />
        <span className="text-zinc-300 w-12 text-right">{(progress * 6).toFixed(1)}s</span>
      </div>
    </div>
  );
}
