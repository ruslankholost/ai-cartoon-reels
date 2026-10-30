import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { hash, lerp, smooth, steamSprites, type SteamCfg } from "./sp-fx";
import { COFFEE } from "./lips8-fx";
import { InkPlane, MARKER_FONT } from "./x10-ui";
import { CHUCK_DRIPS, DRIPS_ROSS, FPS, SPLAT2_T, SPLAT_T, steamLevel } from "./x13-sched";
import type { G } from "./pen-ui";

// The effects and props of x13 "Cheaper" that are drawn in code (src/x13-scenes.tsx places them): the coffee (stains, streams and drops on a face, the spray of a spit-take at the camera, the drops on the lens), the register's customer display (its
// digits are a dot-matrix on the painted screen), Chuck's phone with his profile, the strike on the shop's sign and CHUCK'S, the coins and bills that fly out of the drawer, the hit star, speed lines, the ear steam. Flat shapes with the show's thin
// ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin in the middle) elsewhere, head px (from the neck pivot, y up) for what goes on a head. Every particle is a closed-form function of the age it
// is given (hashed velocities and lifetimes): nothing reads a clock or a random source.
const W = 1080, H = 1920;
export const PX = (x: number) => x - W / 2, PY = (y: number) => H / 2 - y;
/** a rectangle of frame px (x0, y0 top left .. x1, y1 bottom right) as panel points */
export const FR = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[PX(x0), PY(y0)], [PX(x1), PY(y0)], [PX(x1), PY(y1)], [PX(x0), PY(y1)]];
export const FP = (pts: [number, number][]): Pt[] => pts.map(([x, y]) => [PX(x), PY(y)] as Pt);
const INK = "#1c1008";
export { COFFEE };

// ═════════════════════════════════════════════════════ the coffee on a face
export type FaceGeo = { cx: number; cy: number; r: number; eyes: { x: number; y: number; rx: number; ry: number }[]; mouth: { x: number; y: number; w: number } };
/** a lumpy closed blob of `n` lumps and radius around 1 (unit size, scaled by xf), turned by `ph`; `amp` how lumpy */
function blob(n: number, ph: number, amp = 0.2): Pt[] {
  return Array.from({ length: 56 }, (_, i) => { const a = (i / 56) * Math.PI * 2, k = 1 + amp * Math.sin(a * n + ph) + amp * 0.5 * Math.sin(a * (n + 3) + ph * 1.7); return [Math.cos(a) * k, Math.sin(a) * k] as Pt; });
}
/** a falling drop, its round end down (unit radius, its tip 2.2 up) */
function dropPts(): Pt[] {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 16;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
}
const DROP = dropPts();
/** one run of coffee down the face: a ribbon that follows the curve (x0, y0) -> (x1, y1) with a little wobble, wide where it starts and thin at its end, a drop (tip up) hanging at its end, a pale shine along it; `p` 0..1 how far it has run */
function Stream({ x0, y0, x1, y1, w, p, order, seed, k }: { x0: number; y0: number; x1: number; y1: number; w: number; p: number; order: number; seed: number; k: number }) {
  if (p <= 0.03) return null;
  const n = 12, pl = Array.from({ length: n + 1 }, (_, i) => { const u = (i / n) * p; return [lerp(x0, x1, u) + Math.sin(u * 6 + seed) * w * 0.3, lerp(y0, y1, u), w * (1 - 0.7 * u)]; });
  const end = pl[n], rr = w * 0.62, shine = pl.slice(1, n - 1).map((q) => [q[0] - q[2] * 0.2, q[1], q[2] * 0.2]);
  return (
    <>
      <Inked pts={ribbon(pl)} color={COFFEE.fill} ink={COFFEE.ink} w={1.8 * k} order={order + 0.1} op={0.94} />
      <Inked pts={xf(DROP, end[0], end[1] - 1.5 * rr, 0, rr, rr * 1.1)} color={COFFEE.fill} ink={COFFEE.ink} w={1.8 * k} order={order + 0.12} op={0.96} />
      <Poly pts={ribbon(shine)} color={COFFEE.light} order={order + 0.14} op={0.75} />
    </>
  );
}
/** coffee on a face (head px of its rig): splats on the hair or scalp and the forehead, runs that go down the forehead (to the brows) and the cheeks (clear of the eyes), the drops that leave the chin on gravity (their times are DRIPS_ROSS /
 *  CHUCK_DRIPS: the drip sound's frames), a burst of drops thrown off in the first third of a second. `wet` 0..1 how much (it thins out: shorter runs, smaller splats); `t` seconds */
export function CoffeeFace13({ geo, wet, t, who, order }: { geo: FaceGeo; wet: number; t: number; f: number; who: "ross" | "chuck"; order: number }) {
  const { cx, cy, r } = geo, k = r / 170, hit = who === "ross" ? SPLAT_T : SPLAT2_T, age = t - hit, run = Math.min(1, Math.max(0, age / 0.9)) * (0.5 + 0.5 * wet);
  const eyeTop = Math.max(...geo.eyes.map((e) => e.y + e.ry)), yBrow = eyeTop + 0.2 * r, sz = 0.65 + 0.35 * wet, w = 0.085 * r;
  const drips = who === "ross" ? DRIPS_ROSS : CHUCK_DRIPS, chinY = cy - 0.99 * r;
  // splats: x, y (of the radius from the head's middle), size across, size up, lumps
  const splats: [number, number, number, number, number][] = [[-0.2, 0.9, 0.3, 0.1, 3], [0.34, 0.74, 0.17, 0.085, 4], [-0.86, 0.12, 0.11, 0.09, 5], [0.84, 0.2, 0.1, 0.09, 6], [0.5, -0.45, 0.07, 0.06, 7]];
  return (
    <>
      {splats.map(([sx, sy, a, b, n], i) => <Inked key={i} pts={xf(blob(n, i * 1.9, 0.1), cx + sx * r, cy + sy * r, i * 20, a * r * sz, b * r * sz)} color={COFFEE.fill} ink={COFFEE.ink} w={2.2 * k} order={order + i * 0.02} op={0.95} />)}
      <Poly pts={xf(ellipsePts(0, 0, 0.12 * r * sz, 0.03 * r, 16), cx - 0.26 * r, cy + 0.93 * r, -8)} color={COFFEE.light} order={order + 0.09} op={0.75} />
      <Stream x0={cx - 0.44 * r} y0={cy + 0.82 * r} x1={cx - 0.5 * r} y1={yBrow} w={w * 0.95} p={run} order={order} seed={1} k={k} />
      <Stream x0={cx + 0.04 * r} y0={cy + 0.86 * r} x1={cx + 0.03 * r} y1={yBrow + 0.12 * r} w={w} p={run * 0.9} order={order} seed={2} k={k} />
      <Stream x0={cx + 0.36 * r} y0={cy + 0.7 * r} x1={cx + 0.5 * r} y1={yBrow + 0.02 * r} w={w * 0.85} p={run * 0.8} order={order} seed={3} k={k} />
      <Stream x0={cx - 0.84 * r} y0={cy + 0.06 * r} x1={cx - 0.76 * r} y1={cy - 0.32 * r} w={w * 0.8} p={run * 0.9} order={order} seed={4} k={k} />
      <Stream x0={cx + 0.83 * r} y0={cy + 0.14 * r} x1={cx + 0.74 * r} y1={cy - 0.3 * r} w={w * 0.75} p={run * 0.8} order={order} seed={5} k={k} />
      {drips.map((td, i) => {
        const hang = (t - (td - 0.22)) / 0.22, a = t - td, x = cx + (hash(i * 3.7 + 2) - 0.5) * 0.34 * r;
        if (hang < 0 || a > 0.5) return null;
        if (a < 0) return <Inked key={i} pts={xf(DROP, x, chinY - 0.03 * r - 0.1 * r * hang, 0, 0.03 * r + 0.03 * r * hang, 0.03 * r + 0.04 * r * hang)} color={COFFEE.fill} ink={COFFEE.ink} w={1.8 * k} order={order + 0.2} op={0.95} />;
        const y = chinY - 0.04 * r - 0.5 * 2900 * k * a * a;
        return <Inked key={i} pts={xf(DROP, x, y, 0, 0.06 * r, 0.07 * r * (1 + 3 * a))} color={COFFEE.fill} ink={COFFEE.ink} w={1.8 * k} order={order + 0.2} op={0.95 * (1 - smooth(0.3, 0.5, a))} />;
      })}
      {Array.from({ length: 7 }, (_, i) => <Poly key={`f${i}`} pts={ellipsePts(cx + (hash(i * 5.1 + 1) - 0.5) * 1.5 * r, cy + (hash(i * 7.3 + 2) - 0.45) * 1.3 * r, (0.014 + 0.022 * hash(i * 2.9)) * r, (0.014 + 0.022 * hash(i * 2.9)) * r, 8)} color={COFFEE.fill} order={order + 0.05} op={0.9 * sz} />)}
      {age >= 0 && age < 0.4 && Array.from({ length: 16 }, (_, i) => {
        const ang = (i / 16) * Math.PI * 2 + 0.3 * hash(i * 4.1), v = (500 + 700 * hash(i * 2.3)) * k, d0 = (0.75 + 0.15 * hash(i * 1.1)) * r;
        const x = cx + Math.cos(ang) * (d0 + v * age), y = cy + Math.sin(ang) * (d0 + v * age) * 0.9 - 0.5 * 3000 * k * age * age, rr = (0.04 + 0.05 * hash(i * 6.2)) * r * (1 - 0.6 * (age / 0.4));
        return <Inked key={`s${i}`} pts={ellipsePts(x, y, rr, rr, 10)} color={COFFEE.fill} ink={COFFEE.ink} w={1.8 * k} order={order + 0.3} op={0.95 * (1 - smooth(0.2, 0.4, age))} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the spit-take at the camera (frame px)
/** a flying drop: a round head of unit radius, the tail coming to a point `L` radii behind it (the drop moves toward +x) */
function streakPts(L: number): Pt[] {
  const th = Math.acos(-1 / Math.max(L, 1.2)), n = 9;
  return [[-L, 0], ...Array.from({ length: n + 1 }, (_, i) => { const a = th - (2 * th * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
}
/** an irregular splat of about unit size: a round middle with fingers of different lengths flung out of it, a different one for every `seed` */
function splatPts(seed: number, n = 6): Pt[] {
  const arms = Array.from({ length: n }, (_, j) => ({ a: ((j + 0.7 * hash(seed + j * 3.1)) / n) * Math.PI * 2, l: 0.22 + 0.45 * hash(seed * 1.7 + j * 5.3), s: 0.17 + 0.15 * hash(seed + j * 7.9) }));
  return Array.from({ length: 128 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    let r = 0.8 + 0.07 * Math.sin(a * 3 + seed) + 0.04 * Math.sin(a * 5 + seed * 2.3);
    for (const m of arms) { let d = Math.abs(a - m.a); d = Math.min(d, Math.PI * 2 - d); r += m.l * Math.exp(-((d / m.s) ** 2)); }
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  });
}
/** a gob of coffee on the glass: the irregular splat with a pale shine and a few drops thrown off around it; `g` its size now (1 full), `sy` how far it has run (stretch down) */
function Gob({ x, y, R, g, run, seed, order, w = 3.2 }: { x: number; y: number; R: number; g: number; run: number; seed: number; order: number; w?: number }) {
  if (g <= 0.02) return null;
  const X = x - W / 2, Y = H / 2 - y, sx = 1 - 0.18 * run, sy = 1 + 0.5 * run, rot = seed * 37;
  return (
    <>
      <Inked pts={xf(splatPts(seed), X, Y, rot, R * g * sx, R * g * sy)} color={COFFEE.fill} ink={COFFEE.ink} w={w} order={order} op={1} />
      <Poly pts={xf(ellipsePts(0, 0, R * 0.3 * g, R * 0.17 * g, 16), X - R * 0.28 * g, Y + R * 0.3 * g, 28)} color={COFFEE.light} order={order + 0.7} op={0.75} />
      {[0, 1, 2, 3, 4].map((j) => {
        const a = (j / 5) * Math.PI * 2 + hash(seed + j) * 1.2, d = R * (1.28 + 0.6 * hash(seed * 2.3 + j * 4.1)) * g, rr = R * (0.06 + 0.07 * hash(seed + j * 9.1)) * g;
        return <Inked key={j} pts={ellipsePts(X + Math.cos(a) * d * sx, Y + Math.sin(a) * d * sy, rr, rr, 12)} color={COFFEE.fill} ink={COFFEE.ink} w={w * 0.6} order={order + 0.1} op={1} />;
      })}
    </>
  );
}
/** the spray out of a mouth at frame point `at`, straight at the lens: `age` s since the spit. A fan of about ninety small drops thrown out of the mouth in every direction but down, each a streak along its path (a round head, the tail pointing back at
 *  the mouth), faster and bigger as it comes toward the glass, bent down by gravity at the end, each one gone by 0.31 s; and four gobs that hit the glass at the start (`GOBS`): they pop on, hang a moment, run down and thin away. No drop is soft, nothing
 *  is merged: the most of the frame it covers is about a quarter. The drops that stay on the glass a moment longer are `LensSplat`'s */
const GOBS: [number, number, number, number][] = [[-240, -330, 150, 0.05], [330, -210, 125, 0.07], [-40, -820, 140, 0.09], [300, -760, 105, 0.11]];   // x, y from the mouth, radius, the age it hits the glass
export function Spray({ at, age, order, k = 1 }: { at: [number, number]; age: number; order: number; k?: number }) {
  if (age < 0 || age > 0.32) return null;
  const N = 80, drops: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const h = (q: number) => hash(i * q + 3.7), born = 0.1 * h(1.9) * h(2.3), a = age - born, life = Math.min(0.16 + 0.1 * h(6.1), 0.31 - born);   // (every drop is gone by 0.31 s)
    if (a < 0.004 || a > life) continue;
    const ang = ((-45 + 270 * ((i * 0.61803 + 0.13) % 1) + 14 * (h(5.3) - 0.5)) * Math.PI) / 180, v = (1200 + 3600 * h(3.1) ** 2) * k;
    const pos = (aa: number): [number, number] => { const d = v * aa * (1 + 2.2 * aa); return [at[0] + Math.cos(ang) * d, at[1] - Math.sin(ang) * d + 0.5 * 2400 * k * aa * aa]; };
    const [x1, y1] = pos(a), [x0, y0] = pos(Math.max(0, a - 0.03));
    const r = (10 + 14 * h(4.3)) * k * (i % 9 === 0 ? 1.7 : 1) * (1 + 4.2 * a) * (1 - 0.85 * smooth(life * 0.7, life, a)), tail = Math.min(4.2 * r, Math.hypot(x1 - x0, y1 - y0) * 1.1 + 1.5 * r);
    drops.push(<Inked key={i} pts={xf(streakPts(tail / r), x1 - W / 2, H / 2 - y1, (Math.atan2(-(y1 - y0), x1 - x0) * 180) / Math.PI, r, r)} color={COFFEE.fill} ink={COFFEE.ink} w={2.4} order={order} op={1} />);
  }
  return (
    <>
      {drops}
      {GOBS.map(([dx, dy, R, t0], i) => {
        const a = age - t0, p = Math.min(1, Math.max(0, a / 0.05)), g = (1 - (1 - p) ** 3) * (1 + 0.1 * Math.sin(p * Math.PI)) * (1 - smooth(0.09, 0.2, a)), run = smooth(0.06, 0.2, a);
        return <Gob key={i} x={at[0] + dx * k + 30 * run * (i % 2 ? 1 : -1)} y={at[1] + dy * k + 190 * run * run} R={R * k} g={g} run={run} seed={i + 2} order={order + 1} />;
      })}
    </>
  );
}
/** the drops that stay on the glass a moment after the spray: they pop on in the few frames after the first gobs, run down and shrink away, each gone 0.18 s after it landed (the last by 0.32 s after the spit: the face is clean by then); x, y, radius, the age it lands */
const LENS: [number, number, number, number][] = [
  [200, 560, 62, 0.1], [850, 900, 50, 0.11], [560, 1250, 70, 0.12], [160, 1450, 44, 0.12], [960, 1150, 40, 0.13], [430, 360, 46, 0.13], [740, 1560, 52, 0.14], [120, 960, 38, 0.14],
];
export function LensSplat({ age, order }: { age: number; order: number }) {
  if (age < 0.1 || age > 0.33) return null;
  return (
    <>
      {LENS.map(([x, y, r, t0], i) => {
        const a = age - t0;
        if (a < 0 || a > 0.18) return null;
        const g = Math.min(1.1, a / 0.03) * (1 - smooth(0.1, 0.18, a)), run = smooth(0, 0.18, a);
        return <Gob key={i} x={x} y={y + 260 * a * a + 90 * a} R={r} g={g} run={run} seed={i + 9} order={order} w={2.6} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the hit star and the speed lines (frame px)
/** the hit star: short spikes thrown out of the rim of a face (frame px centre, radius), fading over 0.16 s */
export function Impact({ cx, cy, r, age, order, color = "#fff6c8" }: { cx: number; cy: number; r: number; age: number; order: number; color?: string }) {
  if (age < 0 || age > 0.16) return null;
  const u = age / 0.16;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.15 * hash(i * 2.3), r0 = r * (1.02 + 0.2 * u), r1 = r * (1.16 + 0.42 * u + 0.12 * hash(i * 4.1));
        return <Poly key={i} pts={ribbon([[PX(cx) + Math.cos(a) * r0, PY(cy) - Math.sin(a) * r0 * 0.9, r * 0.05 * (1 - u)], [PX(cx) + Math.cos(a) * r1, PY(cy) - Math.sin(a) * r1 * 0.9, r * 0.012]])} color={color} order={order} op={1 - u} />;
      })}
    </>
  );
}
/** speed lines out of a yelling mouth: short strokes thrown outward from (cx, cy); they shimmer on twos */
export function ShoutLines({ cx, cy, r0, r1, f, order, n = 16 }: { cx: number; cy: number; r0: number; r1: number; f: number; order: number; n?: number }) {
  const tw = Math.floor(f / 2);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const h = (q: number) => hash(i * q + tw * 0.37 + 1.9), a = (i / n) * Math.PI * 2 + 0.2 * h(2.3), s0 = r0 + (r1 - r0) * 0.15 * h(3.1), s1 = r0 + (r1 - r0) * (0.55 + 0.45 * h(5.7));
        return <Poly key={i} pts={ribbon([[PX(cx) + Math.cos(a) * s0, PY(cy) - Math.sin(a) * s0, 2], [PX(cx) + Math.cos(a) * s1, PY(cy) - Math.sin(a) * s1, 8 + 5 * h(7.1)]])} color="#ffffff" order={order} op={0.9} />;
      })}
    </>
  );
}
/** a full-frame colour wash: the flash */
export const Wash = ({ color, op, order }: { color: string; op: number; order: number }) => <Poly pts={FR(-40, -40, W + 40, H + 40)} color={color} order={order} op={op} />;

// ═════════════════════════════════════════════════════ the customer display: its digits are a dot-matrix drawn on the painted dark-green screen (a canvas laid on the screen's box)
// 5 x 7 dots per glyph (one dot of gap between glyphs); the lit dots are lime, the unlit ones a faint grid, so that it reads as an LCD panel
const GLYPH: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"], "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"], "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"], "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"], "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"], ".": ["00", "00", "00", "00", "00", "11", "11"], "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"], "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"], "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
};
const textCols = (s: string) => s.split("").reduce((n, c, i) => n + GLYPH[c][0].length + (i ? 1 : 0), 0);
/** the lit dots of `text` laid out from (x0, y0) with dot pitch (px, py) and a dot of (dw, dh): `lit` colour (drawn with a glow) or, with `lit` null, the unlit grid */
function dots(g: G, text: string, x0: number, y0: number, px: number, py: number, dw: number, dh: number, lit: string | null, unlit: string) {
  let cx = x0;
  for (const c of text) {
    const gl = GLYPH[c];
    for (let row = 0; row < 7; row++) for (let col = 0; col < gl[0].length; col++) {
      const on = gl[row][col] === "1";
      if (lit && !on) continue;
      g.fillStyle = on ? lit! : unlit;
      g.beginPath(); g.roundRect(cx + col * px, y0 + row * py, dw, dh, Math.min(dw, dh) * 0.28); g.fill();
    }
    cx += (gl[0].length + 1) * px;
  }
}
export type DisplayState = { w: number; h: number; text: string; flash: number };
/** the screen of the display (w x h design units): a small TOTAL at the top left, the price big and centred, a thin rule under the label; the dots flash white for a moment on a new price */
export function drawDisplayScreen(g: G, s: DisplayState) {
  const { w, h, text, flash } = s;
  g.save();
  // the price: as wide as the screen allows (at most 0.9 of it), the dots 1.3 times taller than wide
  const cols = textCols(text), px = Math.min(w * 0.86 / cols, 42), py = px * 1.32, dw = px * 0.8, dh = py * 0.8, tw = cols * px, th = 7 * py, x0 = (w - tw) / 2 + px * 0.1, y0 = h * 0.57 - th / 2;
  const lime = flash > 0.5 ? "#ffffff" : "#a9ff7c", dim = "rgba(120,255,110,0.09)";
  dots(g, text, x0, y0, px, py, dw, dh, null, dim);
  g.shadowColor = "#7dff5a"; g.shadowBlur = 16 + 22 * flash;
  dots(g, text, x0, y0, px, py, dw, dh, lime, dim);
  g.shadowBlur = 0;
  const lp = px * 0.36;   // the label
  dots(g, "TOTAL", w * 0.07, h * 0.08, lp, lp * 1.3, lp * 0.78, lp * 1.3 * 0.78, "rgba(150,235,120,0.8)", dim);
  g.fillStyle = "rgba(150,235,120,0.35)"; g.fillRect(w * 0.07, h * 0.08 + 9.5 * lp * 1.3, w * 0.86, Math.max(2, h * 0.008));
  g.restore();
}
