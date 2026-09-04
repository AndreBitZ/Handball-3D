import { applyH, homography, COURT_CORNERS, type Pt } from "./homography";

export type Team = "blue" | "red";

export type ClipFrame = {
  t: number;
  players: { x: number; z: number; team: Team; gk: boolean }[];
  ball: [number, number, number];
};

export type ClipData = {
  duration: number;
  frames: ClipFrame[];
};

type Det = {
  x: number;
  z: number;
  hue: number;
  isBall: boolean;
};

const COURT_L = 40;
const COURT_W = 20;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function sampleHue(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  const x = Math.max(0, Math.floor(bx + bw * 0.25));
  const y = Math.max(0, Math.floor(by + bh * 0.2));
  const w = Math.max(2, Math.floor(bw * 0.5));
  const h = Math.max(2, Math.floor(bh * 0.45));
  const img = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < img.length; i += 16) {
    r += img[i]; g += img[i + 1]; b += img[i + 2]; n++;
  }
  if (!n) return 0;
  r /= n; g /= n; b /= n;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 8) return -1;
  if (max === r) return ((g - b) / d) % 6;
  if (max === g) return (b - r) / d + 2;
  return (r - g) / d + 4;
}

function toCourt(px: number, py: number, H: number[] | null, vw: number, vh: number) {
  if (H) {
    const p = applyH(H, px, py);
    return { x: clamp(p.x, -19.8, 19.8), z: clamp(p.y, -9.8, 9.8) };
  }
  return {
    x: clamp((px / vw - 0.5) * COURT_L, -19.5, 19.5),
    z: clamp((py / vh - 0.5) * COURT_W, -9.5, 9.5),
  };
}

export async function analyzeVideo(
  video: HTMLVideoElement,
  onProgress?: (pct: number, label: string) => void,
  corners?: Pt[]
): Promise<ClipData> {
  onProgress?.(2, "A carregar modelo de deteção…");
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();
  const coco = await import("@tensorflow-models/coco-ssd");
  const model = await coco.load({ base: "lite_mobilenet_v2" });

  const duration = Math.min(video.duration || 6, 20);
  const fps = duration <= 8 ? 4 : 3;
  const steps = Math.max(8, Math.floor(duration * fps));
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 360;
  const H = corners && corners.length === 4 ? homography(corners, COURT_CORNERS) : null;

  const canvas = document.createElement("canvas");
  const maxW = 640;
  const scale = Math.min(1, maxW / vw);
  canvas.width = Math.max(160, Math.floor(vw * scale));
  canvas.height = Math.max(90, Math.floor(vh * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponível");

  const raw: Det[][] = [];
  for (let i = 0; i < steps; i++) {
    const time = (i / (steps - 1)) * duration;
    video.currentTime = time;
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const preds = await model.detect(canvas, 20);
    const frame: Det[] = [];
    for (const p of preds) {
      if (p.score < 0.35) continue;
      const [bx, by, bw, bh] = p.bbox;
      const px = (bx + bw / 2) / scale;
      const py = (by + bh * 0.95) / scale;
      const pos = toCourt(px, py, H, vw, vh);
      if (H && (Math.abs(pos.x) > 21 || Math.abs(pos.z) > 11)) continue;
      if (p.class === "sports ball") frame.push({ ...pos, hue: -2, isBall: true });
      else if (p.class === "person") frame.push({ ...pos, hue: sampleHue(ctx, bx, by, bw, bh), isBall: false });
    }
    raw.push(frame);
    onProgress?.(Math.round(((i + 1) / steps) * 90), `A analisar frame ${i + 1}/${steps}`);
  }

  const hues = raw.flat().filter((d) => !d.isBall && d.hue >= 0).map((d) => d.hue);
  let split = 3;
  if (hues.length) {
    hues.sort((a, b) => a - b);
    split = hues[Math.floor(hues.length / 2)];
  }

  const frames: ClipFrame[] = raw.map((dets, i) => {
    const people = dets.filter((d) => !d.isBall);
    const ballDet = dets.find((d) => d.isBall);
    const players = people.slice(0, 14).map((d) => {
      const team: Team = d.hue >= 0 && d.hue < split ? "blue" : "red";
      return { x: d.x, z: d.z, team, gk: false };
    });
    const markGk = (team: Team, goalX: number) => {
      const list = players.filter((p) => p.team === team);
      if (!list.length) return;
      list.sort((a, b) => Math.abs(a.x - goalX) - Math.abs(b.x - goalX));
      list[0].gk = true;
    };
    markGk("blue", -20);
    markGk("red", 20);
    const ball: [number, number, number] = ballDet
      ? [ballDet.x, 0.18, ballDet.z]
      : players[0]
        ? [players[0].x + 0.4, 0.18, players[0].z]
        : [0, 0.18, 0];
    return { t: i / Math.max(1, steps - 1), players, ball };
  });

  onProgress?.(100, "Concluído");
  return { duration, frames };
}

export function sampleClip(clip: ClipData, t01: number): ClipFrame {
  if (!clip.frames.length) return { t: t01, players: [], ball: [0, 0.18, 0] };
  if (clip.frames.length === 1) return clip.frames[0];
  const u = clamp(t01, 0, 1);
  let i = 0;
  while (i < clip.frames.length - 1 && clip.frames[i + 1].t < u) i++;
  const a = clip.frames[i];
  const b = clip.frames[Math.min(i + 1, clip.frames.length - 1)];
  const span = b.t - a.t || 1;
  const f = clamp((u - a.t) / span, 0, 1);
  const n = Math.max(a.players.length, b.players.length);
  const players = [];
  for (let k = 0; k < n; k++) {
    const pa = a.players[Math.min(k, a.players.length - 1)];
    const pb = b.players[Math.min(k, b.players.length - 1)];
    if (!pa && !pb) continue;
    const p1 = pa || pb;
    const p2 = pb || pa;
    players.push({ x: p1.x + (p2.x - p1.x) * f, z: p1.z + (p2.z - p1.z) * f, team: p2.team, gk: p2.gk });
  }
  return {
    t: u,
    players,
    ball: [a.ball[0] + (b.ball[0] - a.ball[0]) * f, a.ball[1] + (b.ball[1] - a.ball[1]) * f, a.ball[2] + (b.ball[2] - a.ball[2]) * f],
  };
}
