import React from "react";

// Kit for "Nobody Picks Up", 1930s rubber-hose look (the look approved in styleflat.tsx "rubberhose"): sepia/cream, bold black
// shapes, pie-cut eyes, white gloves, noodle arms. Plain SVG; everything is a function of the frame number (no Math.random).
export type Pt = [number, number];
export const C = { ink: "#14100c", cream: "#f2e7c6", white: "#fbf5e3", tan: "#d8c490", mid: "#b39968", dark: "#6a5230", deep: "#3a2c1a" };

export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const rnd = (i: number, k = 0) => hash(i * 13.37 + k * 91.7 + k * k * 3.1);
export const f1 = (n: number) => Math.round(n * 10) / 10;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => 1 - (1 - clamp(t)) ** 3;
export const easeIO = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };
// a pop: 0 before t0, overshoots to ~1.25 and settles at 1
export const popAt = (t: number, t0: number, dur = 0.22) => { const u = (t - t0) / dur; if (u <= 0) return 0; if (u >= 1) return 1; return 1 + 0.28 * Math.sin(u * Math.PI) * (1 - u) * 2.2 - (1 - ease(u * 1.6)) * 0.0; };
// the beat of the 1930s: everything breathes at 120 bpm (15 frames)
export const beat = (f: number, seed = 0) => Math.abs(Math.sin(((f + seed * 4) * Math.PI) / 15));
export const bob = (f: number, seed = 0, amp = 6) => -beat(f, seed) * amp;

export const lin = (pts: Pt[]) => "M" + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L") + "Z";
export function smooth(pts: Pt[], close = true): string {
  const n = pts.length;
  const g = (i: number) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + (close ? "Z" : "");
}
// a closed polygon whose edges bulge outward as round lobes (foam)
export function bumpy(pts: Pt[], amp: number, seed = 0): string {
  const n = pts.length;
  let cx = 0, cy = 0;
  pts.forEach((p) => { cx += p[0] / n; cy += p[1] / n; });
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    const k = amp * (0.8 + 0.5 * rnd(i, seed)) * 1.33 * Math.min(1, len / 60);
    d += `C${f1(a[0] + nx * k)} ${f1(a[1] + ny * k)} ${f1(b[0] + nx * k)} ${f1(b[1] + ny * k)} ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + "Z";
}
export const ellp = (cx: number, cy: number, rx: number, ry: number, n = 14, jit = 0, seed = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 1 + (rnd(i, seed) - 0.5) * 2 * jit;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as Pt;
  });
export const ell = (cx: number, cy: number, rx: number, ry: number) => `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`;
export const rrect = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
export const star5 = (x: number, y: number, r: number) => {
  const p: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r * 0.45 : r; p.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); }
  return lin(p);
};
export const spark = (x: number, y: number, r: number) => lin([[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]]);

// ── drawing bits ──
export const Bk = ({ d, fill, sw = 12, stroke = C.ink, ...rest }: { d: string; fill: string; sw?: number; stroke?: string } & React.SVGProps<SVGPathElement>) => (
  <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" {...rest} />
);

// a noodle arm: an S-curve from the shoulder `a` to the hand `b`; `bend` bows it, `wave` is the sway on the beat
export function hosePath(a: Pt, b: Pt, bend = 50, wave = 0): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, k = bend + wave;
  const c1: Pt = [a[0] + dx * 0.3 + nx * k, a[1] + dy * 0.3 + ny * k];
  const c2: Pt = [a[0] + dx * 0.7 - nx * k * 0.75, a[1] + dy * 0.7 - ny * k * 0.75];
  return `M${f1(a[0])} ${f1(a[1])}C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(b[0])} ${f1(b[1])}`;
}
export const Hose = ({ a, b, bend = 50, wave = 0, w = 30, color = C.ink }: { a: Pt; b: Pt; bend?: number; wave?: number; w?: number; color?: string }) => (
  <path d={hosePath(a, b, bend, wave)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
);
// a white glove: wrist at the bottom (0,40), fingers up. pose: mitt | fist | point | open
export function Glove({ x, y, rot = 0, s = 1, pose = "mitt" }: { x: number; y: number; rot?: number; s?: number; pose?: "mitt" | "fist" | "point" | "open" }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})`}>
      <Bk d="M-34 36 l68 0 l10 26 l-88 0z" fill={C.white} sw={9} />
      <Bk d={ell(0, 0, 46, 40)} fill={C.white} sw={11} />
      {pose === "fist" && [-26, -9, 8, 25].map((fx, i) => <Bk key={i} d={ell(fx, -30, 11, 15)} fill={C.white} sw={8} />)}
      {pose === "mitt" && [-24, -4, 16].map((fx, i) => <Bk key={i} d={ell(fx, -33, 12, 17)} fill={C.white} sw={8} />)}
      {pose === "open" && [-30, -12, 6, 24].map((fx, i) => <Bk key={i} d={ell(fx + (i - 1.5) * 4, -46 + Math.abs(i - 1.5) * 8, 10, 24)} fill={C.white} sw={8} />)}
      {pose === "point" && <><Bk d={ell(-4, -52, 11, 30)} fill={C.white} sw={8} />{[8, 26].map((fx, i) => <Bk key={i} d={ell(fx, -22, 10, 14)} fill={C.white} sw={7} />)}</>}
      <Bk d={ell(-44, 6, 17, 13)} fill={C.white} sw={8} />
      <path d="M-18 -14 l0 24 M2 -14 l0 24 M22 -14 l0 24" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" />
    </g>
  );
}

// pie-cut eye: a black oval with a white wedge cut out of it. look = dx,dy in -1..1; lid 0..1 covers the top (heavy lids); blink 0..1
export function PieEye({ x, y, r = 30, dx = 0, dy = 0, blink = 0, lid = 0, lidFill = C.cream, wedge = 0 }: { x: number; y: number; r?: number; dx?: number; dy?: number; blink?: number; lid?: number; lidFill?: string; wedge?: number }) {
  const rx = r * 0.64, ry = r;
  const ox = dx * r * 0.32, oy = dy * r * 0.26;
  const pt = (deg: number): Pt => [ox + Math.cos((deg * Math.PI) / 180) * rx, oy + Math.sin((deg * Math.PI) / 180) * ry];
  const a1 = pt(-72 + wedge), a2 = pt(-8 + wedge);
  const y0 = oy - ry + 2 * ry * lid;
  const chord = rx * Math.sqrt(Math.max(0, 1 - (clamp(y0 / ry, -1, 1)) ** 2));
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(1 ${f1(1 - 0.92 * blink)})`}>
      <ellipse cx={ox} cy={oy} rx={rx} ry={ry} fill={C.ink} />
      <path d={`M${f1(ox + 2)} ${f1(oy - 2)}L${f1(a1[0])} ${f1(a1[1])}L${f1(a2[0])} ${f1(a2[1])}Z`} fill={C.white} />
      {lid > 0.02 && <path d={`M${f1(ox - chord - 6)} ${f1(y0)}A${f1(rx + 6)} ${f1(ry + 6)} 0 0 1 ${f1(ox + chord + 6)} ${f1(y0)}Z`} fill={lidFill} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />}
    </g>
  );
}
export const Brow = ({ x, y, w = 70, rot = 0, th = 13, curve = 8 }: { x: number; y: number; w?: number; rot?: number; th?: number; curve?: number }) => (
  <path d={`M${-w / 2} 0Q0 ${-curve} ${w / 2} 0`} transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`} fill="none" stroke={C.ink} strokeWidth={th} strokeLinecap="round" />
);
// mouth: open 0..1. closed, it is a line (mood: -1 frown .. 1 smile); open, a black shape with a tongue and an optional bar of teeth
export function Mouth({ x, y, w = 150, open = 0, mood = 0, teeth = 0, tongue = true, wob = 0 }: { x: number; y: number; w?: number; open?: number; mood?: number; teeth?: number; tongue?: boolean; wob?: number }) {
  if (open < 0.07) return <path d={`M${f1(x - w / 2)} ${f1(y)}Q${f1(x)} ${f1(y + mood * w * 0.28)} ${f1(x + w / 2)} ${f1(y)}`} fill="none" stroke={C.ink} strokeWidth={10} strokeLinecap="round" />;
  const hw = (w / 2) * (0.62 + 0.38 * Math.min(1, open * 1.3)), h = w * 0.62 * open;
  const top = y - h * 0.18 + (mood > 0 ? -2 : 0);
  const cs = -mood * h * 0.32;
  const d = smooth([[x - hw, top + h * 0.1 + cs], [x - hw * 0.55, top - h * 0.05 + wob], [x, top - h * 0.1], [x + hw * 0.55, top - h * 0.05 - wob], [x + hw, top + h * 0.1 + cs], [x + hw * 0.72, top + h * 0.75], [x, top + h * 1.12], [x - hw * 0.72, top + h * 0.75]]);
  const id = `mc${Math.round(x)}_${Math.round(y)}`;
  return (
    <g>
      <clipPath id={id}><path d={d} /></clipPath>
      <path d={d} fill={C.ink} />
      <g clipPath={`url(#${id})`}>
        {tongue && open > 0.22 && <ellipse cx={x} cy={top + h * 1.05} rx={hw * 0.55} ry={h * 0.36} fill={C.mid} stroke={C.ink} strokeWidth={4} />}
        {teeth > 0 && <rect x={x - hw * 0.85} y={top - h * 0.12} width={hw * 1.7} height={Math.min(h * 0.4, 40) * teeth + 6} rx={6} fill={C.white} stroke={C.ink} strokeWidth={4} />}
      </g>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={11} strokeLinejoin="round" />
    </g>
  );
}
// white foam blob with a drip (len 0 = just a clump)
export function Drip({ x, y, r = 24, len = 0, seed = 0 }: { x: number; y: number; r?: number; len?: number; seed?: number }) {
  return (
    <g>
      {len > 0 && <Bk d={`M${x - r * 0.38} ${y}Q${x - r * 0.3} ${y + len * 0.7} ${x} ${y + len}Q${x + r * 0.3} ${y + len * 0.7} ${x + r * 0.38} ${y}Z`} fill={C.white} sw={7} />}
      {len > 0 && <Bk d={ell(x, y + len, r * 0.3, r * 0.4)} fill={C.white} sw={6} />}
      <Bk d={bumpy(ellp(x, y, r, r * 0.8, 7, 0.1, seed), r * 0.35, seed)} fill={C.white} sw={8} />
    </g>
  );
}

// ── global film look, over the whole picture: grain, vignette, flicker, scratches and dust ──
export const BIG = { x: -100, y: -100, width: 1300, height: 2100 } as const;
export function FilmFx({ f, flash = 0 }: { f: number; flash?: number }) {
  const flick = 0.05 + 0.1 * rnd(f, 21) + (rnd(f, 22) > 0.88 ? 0.1 : 0);
  const scratches = Array.from({ length: 3 }, (_, k) => ({ x: rnd(f, 30 + k) * 1080, y0: rnd(f, 33 + k) * 900, l: 200 + rnd(f, 36 + k) * 900, on: rnd(f, 39 + k) > 0.4, lt: rnd(f, 42 + k) > 0.5 }));
  const dust = Array.from({ length: 14 }, (_, k) => ({ x: rnd(f, 50 + k) * 1080, y: rnd(f, 70 + k) * 1920, r: 1.5 + rnd(f, 90 + k) * 3.5, lt: rnd(f, 110 + k) > 0.45 }));
  return (
    <>
      <defs>
        <filter id="grain" filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves={1} seed={Math.floor(f / 2) + 1} />
          <feColorMatrix type="matrix" values="1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  0 0 0 0 1" />
        </filter>
        <radialGradient id="vig" cx="50%" cy="48%" r="72%"><stop offset="0.5" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.7} /></radialGradient>
      </defs>
      <rect width={1080} height={1920} filter="url(#grain)" style={{ mixBlendMode: "overlay" }} opacity={0.3} />
      <rect width={1080} height={1920} fill="url(#vig)" />
      <rect width={1080} height={1920} fill={rnd(f, 23) > 0.5 ? "#000" : "#fff"} opacity={flick * 0.45} />
      {scratches.filter((s) => s.on).map((s, i) => <line key={i} x1={s.x} y1={s.y0} x2={s.x + (rnd(f, 45 + i) - 0.5) * 14} y2={s.y0 + s.l} stroke={s.lt ? "#f6ecd0" : "#1a140c"} strokeWidth={1.6} opacity={0.3} />)}
      {dust.map((d, i) => <ellipse key={i} cx={d.x} cy={d.y} rx={d.r} ry={d.r * (0.6 + rnd(f, 130 + i))} fill={d.lt ? "#f6ecd0" : "#1a140c"} opacity={0.65} />)}
      {flash > 0 && <rect width={1080} height={1920} fill="#fbf5e3" opacity={flash} />}
    </>
  );
}
// the wobble of hand-inked lines (a new seed every 2 frames), applied to the whole scene
export function Boil({ f, id = "boil", scale = 5 }: { f: number; id?: string; scale?: number }) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(f / 2) + 7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

import { loadFont as loadBevan } from "@remotion/google-fonts/Bevan";
// the period face for lettering (captions, signs, phone screens): a fat slab serif
export const { fontFamily: BEVAN } = loadBevan();
