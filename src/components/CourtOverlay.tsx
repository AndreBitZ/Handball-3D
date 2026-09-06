"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyH, COURT_CORNERS, homography, type Pt } from "@/lib/homography";

type Handle = Pt & { id: number };

function defaultHandles(w: number, h: number): Handle[] {
  return [
    { id: 0, x: w * 0.12, y: h * 0.78 },
    { id: 1, x: w * 0.88, y: h * 0.78 },
    { id: 2, x: w * 0.68, y: h * 0.28 },
    { id: 3, x: w * 0.32, y: h * 0.28 },
  ];
}

function line(H: number[], a: Pt, b: Pt) {
  const p = applyH(H, a.x, a.y);
  const q = applyH(H, b.x, b.y);
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
}

function arcPts(H: number[], cx: number, cz: number, r: number, a0: number, a1: number) {
  const n = 20;
  const d: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = applyH(H, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    d.push(`${i === 0 ? "M" : "L"}${p.x},${p.y}`);
  }
  return d.join(" ");
}

function mid(a: Handle, b: Handle) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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
  const drag = useRef<null | { kind: "corner" | "edge" | "body"; ids: number[]; lastX: number; lastY: number }>(null);

  useEffect(() => {
    onChange(handles.map(({ x, y }) => ({ x, y })));
  }, []);

  const H = useMemo(() => homography(COURT_CORNERS, handles), [handles]);

  const applyDelta = (ids: number[], dx: number, dy: number) => {
    setHandles((prev) => {
      const next = prev.map((h) => (ids.includes(h.id) ? { ...h, x: h.x + dx, y: h.y + dy } : h));
      onChange(next.map(({ x, y }) => ({ x, y })));
      return next;
    });
  };

  const pointerPos = (e: React.PointerEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pointerPos(e);
    const dx = p.x - d.lastX;
    const dy = p.y - d.lastY;
    d.lastX = p.x;
    d.lastY = p.y;
    applyDelta(d.ids, dx, dy);
  };

  const stop = () => {
    drag.current = null;
  };

  const start = (kind: "corner" | "edge" | "body", ids: number[], e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const svg = e.currentTarget.closest("svg") as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    drag.current = { kind, ids, lastX: e.clientX - r.left, lastY: e.clientY - r.top };
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
      line(H, { x: -L + 9, y: -1.5 }, { x: -L + 9, y: 1.5 }),
      line(H, { x: L - 9, y: -1.5 }, { x: L - 9, y: 1.5 }),
    ];
    const arcs = [
      arcPts(H, -L, -1.5, 6, Math.PI / 2, 0),
      arcPts(H, -L, 1.5, 6, 0, -Math.PI / 2),
      arcPts(H, L, -1.5, 6, Math.PI, Math.PI / 2),
      arcPts(H, L, 1.5, 6, -Math.PI / 2, -Math.PI),
    ];
    return { segs, arcs };
  }, [H]);

  const edges = [
    { ids: [0, 1], a: handles[0], b: handles[1] },
    { ids: [1, 2], a: handles[1], b: handles[2] },
    { ids: [2, 3], a: handles[2], b: handles[3] },
    { ids: [3, 0], a: handles[3], b: handles[0] },
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full z-10 touch-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerDown={(e) => start("body", [0, 1, 2, 3], e)}
      style={{ cursor: "move" }}
    >
      <polygon
        points={handles.map((h) => `${h.x},${h.y}`).join(" ")}
        fill="#fbbf24"
        fillOpacity="0.08"
      />
      {marks.segs.map((s, i) => (
        <line key={i} {...s} stroke="#fbbf24" strokeWidth={i < 5 ? 2.2 : 1.4} opacity="0.95" />
      ))}
      {marks.arcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#fbbf24" strokeWidth="1.6" opacity="0.9" />
      ))}
      {edges.map((ed, i) => {
        const m = mid(ed.a, ed.b);
        return (
          <g key={`e${i}`} onPointerDown={(e) => start("edge", ed.ids, e)} style={{ cursor: "grab" }}>
            <line x1={ed.a.x} y1={ed.a.y} x2={ed.b.x} y2={ed.b.y} stroke="transparent" strokeWidth="18" />
            <circle cx={m.x} cy={m.y} r="7" fill="#fde68a" stroke="#111" strokeWidth="1.5" />
          </g>
        );
      })}
      {handles.map((h) => (
        <g key={h.id} onPointerDown={(e) => start("corner", [h.id], e)} style={{ cursor: "grab" }}>
          <circle cx={h.x} cy={h.y} r="10" fill="#f59e0b" stroke="white" strokeWidth="2" />
          <text x={h.x} y={h.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111">
            {h.id + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
