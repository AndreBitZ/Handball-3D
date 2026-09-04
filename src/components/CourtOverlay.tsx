"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyH, COURT_CORNERS, homography, type Pt } from "@/lib/homography";

type Handle = Pt & { id: number };

function defaultHandles(w: number, h: number): Handle[] {
  return [
    { id: 0, x: w * 0.08, y: h * 0.88 },
    { id: 1, x: w * 0.92, y: h * 0.88 },
    { id: 2, x: w * 0.72, y: h * 0.18 },
    { id: 3, x: w * 0.28, y: h * 0.18 },
  ];
}

function line(H: number[], a: Pt, b: Pt) {
  const p = applyH(H, a.x, a.y);
  const q = applyH(H, b.x, b.y);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}

function arcPts(H: number[], cx: number, cz: number, r: number, a0: number, a1: number) {
  const n = 16;
  const d: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = applyH(H, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    d.push(`${i === 0 ? "M" : "L"}${p.x},${p.y}`);
  }
  return d.join(" ");
}

export default function CourtOverlay({
  width,
  height,
  onChange,
}: {
  width: number;
  height: number;
  onChange: (imageCorners: Pt[]) => void;
}) {
  const [handles, setHandles] = useState<Handle[]>(() => defaultHandles(width || 480, height || 270));
  const drag = useRef<number | null>(null);

  useEffect(() => {
    onChange(handles.map(({ x, y }) => ({ x, y })));
  }, []);

  const H = useMemo(() => homography(COURT_CORNERS, handles), [handles]);

  const move = (e: React.PointerEvent) => {
    if (drag.current === null) return;
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setHandles((prev) => {
      const next = prev.map((h) => (h.id === drag.current ? { ...h, x, y } : h));
      onChange(next.map(({ x, y }) => ({ x, y })));
      return next;
    });
  };

  const marks = useMemo(() => {
    const L = 20;
    const W = 10;
    const segs = [
      line(H, { x: -L, y: -W }, { x: L, y: -W }),
      line(H, { x: L, y: -W }, { x: L, y: W }),
      line(H, { x: L, y: W }, { x: -L, y: W }),
      line(H, { x: -L, y: W }, { x: -L, y: -W }),
      line(H, { x: 0, y: -W }, { x: 0, y: W }),
      line(H, { x: -L + 6, y: -1.5 }, { x: -L + 6, y: 1.5 }),
      line(H, { x: L - 6, y: -1.5 }, { x: L - 6, y: 1.5 }),
      line(H, { x: -L + 7, y: -0.5 }, { x: -L + 7, y: 0.5 }),
      line(H, { x: L - 7, y: -0.5 }, { x: L - 7, y: 0.5 }),
    ];
    const arcs = [
      arcPts(H, -L, -1.5, 6, Math.PI / 2, 0),
      arcPts(H, -L, 1.5, 6, 0, -Math.PI / 2),
      arcPts(H, L, -1.5, 6, Math.PI, Math.PI / 2),
      arcPts(H, L, 1.5, 6, -Math.PI / 2, -Math.PI),
    ];
    return { segs, arcs };
  }, [H]);

  return (
    <svg className="absolute inset-0 w-full h-full z-10 touch-none" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      {marks.segs.map((s, i) => (
        <line key={i} {...s} stroke="#fbbf24" strokeWidth="1.6" opacity="0.9" />
      ))}
      {marks.arcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#fbbf24" strokeWidth="1.6" opacity="0.9" />
      ))}
      {handles.map((h) => (
        <g key={h.id}>
          <circle cx={h.x} cy={h.y} r="9" fill="#f59e0b" stroke="white" strokeWidth="2" onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = h.id; }} style={{ cursor: "grab" }} />
          <text x={h.x} y={h.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111">{h.id + 1}</text>
        </g>
      ))}
    </svg>
  );
}
