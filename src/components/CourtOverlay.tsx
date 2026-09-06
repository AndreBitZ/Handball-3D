"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyH, COURT_CORNERS, homography, type Pt } from "@/lib/homography";

type Handle = Pt & { id: number };

function preset(kind: "full" | "left" | "right", w: number, h: number): Handle[] {
  if (kind === "left") {
    return [
      { id: 0, x: w * 0.06, y: h * 0.84 },
      { id: 1, x: w * 1.45, y: h * 0.98 },
      { id: 2, x: w * 1.15, y: h * 0.1 },
      { id: 3, x: w * 0.3, y: h * 0.22 },
    ];
  }
  if (kind === "right") {
    return [
      { id: 0, x: w * -0.45, y: h * 0.98 },
      { id: 1, x: w * 0.94, y: h * 0.84 },
      { id: 2, x: w * 0.7, y: h * 0.22 },
      { id: 3, x: w * -0.15, y: h * 0.1 },
    ];
  }
  return [
    { id: 0, x: w * 0.1, y: h * 0.8 },
    { id: 1, x: w * 0.9, y: h * 0.8 },
    { id: 2, x: w * 0.7, y: h * 0.22 },
    { id: 3, x: w * 0.3, y: h * 0.22 },
  ];
}

function line(H: number[], a: Pt, b: Pt) {
  const p = applyH(H, a.x, a.y);
  const q = applyH(H, b.x, b.y);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}

function arcPts(H: number[], cx: number, cz: number, r: number, a0: number, a1: number) {
  const n = 22;
  const d: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = applyH(H, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    d.push(`${i === 0 ? "M" : "L"}${p.x},${p.y}`);
  }
  return d.join(" ");
}

function centroid(hs: Handle[]) {
  return {
    x: hs.reduce((s, h) => s + h.x, 0) / hs.length,
    y: hs.reduce((s, h) => s + h.y, 0) / hs.length,
  };
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
  const [handles, setHandles] = useState<Handle[]>(() => preset("left", width || 480, height || 270));
  const drag = useRef<null | { ids: number[]; lastX: number; lastY: number }>(null);

  const emit = (next: Handle[]) => onChange(next.map(({ x, y }) => ({ x, y })));

  useEffect(() => {
    emit(handles);
  }, []);

  const setAll = (next: Handle[]) => {
    setHandles(next);
    emit(next);
  };

  const H = useMemo(() => homography(COURT_CORNERS, handles), [handles]);

  const applyDelta = (ids: number[], dx: number, dy: number) => {
    setHandles((prev) => {
      const next = prev.map((h) => (ids.includes(h.id) ? { ...h, x: h.x + dx, y: h.y + dy } : h));
      emit(next);
      return next;
    });
  };

  const start = (ids: number[], e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const svg = (e.currentTarget as Element).closest("svg") as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    drag.current = { ids, lastX: e.clientX - r.left, lastY: e.clientY - r.top };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    applyDelta(d.ids, x - d.lastX, y - d.lastY);
    d.lastX = x;
    d.lastY = y;
  };

  const nudge = (dx: number, dy: number) => applyDelta([0, 1, 2, 3], dx, dy);

  const scaleBy = (f: number) => {
    const c = centroid(handles);
    setAll(
      handles.map((h) => ({
        ...h,
        x: c.x + (h.x - c.x) * f,
        y: c.y + (h.y - c.y) * f,
      }))
    );
  };

  const perspective = (amt: number) => {
    const c = centroid(handles);
    setAll(
      handles.map((h) => {
        if (h.id < 2) return h;
        return { ...h, x: h.x + (h.x - c.x) * amt, y: h.y + amt * 18 };
      })
    );
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

  const visibleHandle = (h: Handle) => ({
    x: Math.min(width - 14, Math.max(14, h.x)),
    y: Math.min(height - 14, Math.max(14, h.y)),
    off: h.x < 0 || h.y < 0 || h.x > width || h.y > height,
  });

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full z-10 touch-none"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onPointerMove={onMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onPointerDown={(e) => start([0, 1, 2, 3], e)}
        style={{ cursor: "move" }}
      >
        <polygon points={handles.map((h) => `${h.x},${h.y}`).join(" ")} fill="#fbbf24" fillOpacity="0.07" />
        {marks.segs.map((s, i) => (
          <line key={i} {...s} stroke="#fbbf24" strokeWidth={i < 5 ? 2.4 : 1.5} opacity="0.95" />
        ))}
        {marks.arcs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.95" />
        ))}
        {handles.map((h) => {
          const v = visibleHandle(h);
          return (
            <g key={h.id} onPointerDown={(e) => start([h.id], e)} style={{ cursor: "grab" }}>
              <circle cx={v.x} cy={v.y} r="11" fill={v.off ? "#fb7185" : "#f59e0b"} stroke="white" strokeWidth="2" />
              <text x={v.x} y={v.y + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111">
                {h.id + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-2 right-2 z-20 rounded-lg bg-black/70 p-2 text-[11px] text-zinc-100 space-y-1.5">
        <div className="flex flex-wrap gap-1">
          <button type="button" className="px-2 py-1 rounded bg-zinc-700" onClick={() => setAll(preset("left", width, height))}>
            Baliza à esquerda
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-700" onClick={() => setAll(preset("right", width, height))}>
            Baliza à direita
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-700" onClick={() => setAll(preset("full", width, height))}>
            Campo inteiro
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => nudge(-12, 0)}>
            ←
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => nudge(12, 0)}>
            →
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => nudge(0, -12)}>
            ↑
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => nudge(0, 12)}>
            ↓
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => scaleBy(1.08)}>
            +
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => scaleBy(0.92)}>
            −
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => perspective(-0.08)}>
            Persp −
          </button>
          <button type="button" className="px-2 py-1 rounded bg-zinc-800" onClick={() => perspective(0.08)}>
            Persp +
          </button>
        </div>
      </div>
    </>
  );
}
