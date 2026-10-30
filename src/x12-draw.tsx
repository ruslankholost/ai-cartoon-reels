import React from "react";
import { Glow, Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Goo, hash, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { InkPlane, MARKER_FONT } from "./x10-ui";
import { FPS, steamLevel } from "./x12-sched";
import type { G } from "./pen-ui";

// The effects and props of x12 "Speak to the Manager" that are drawn in code (src/x12-scenes.tsx places them): the name tag's MANAGER, the ceiling with its crack, the light that pours out of it, the rope, the cardboard halo on its wire (and its droop),
// the steam jet out of Ross's ear and the steam of the cup, the hit star of the face snapping, a full-frame wash. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin
// in the middle) elsewhere, head px (from the neck pivot, y up) for what goes on a head. Every particle is a closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source.
const W = 1080, H = 1920;
export const PX = (x: number) => x - W / 2, PY = (y: number) => H / 2 - y;
/** a rectangle of frame px (x0, y0 top left .. x1, y1 bottom right) as panel points */
export const FR = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[PX(x0), PY(y0)], [PX(x1), PY(y0)], [PX(x1), PY(y1)], [PX(x0), PY(y1)]];
export const FP = (pts: [number, number][]): Pt[] => pts.map(([x, y]) => [PX(x), PY(y)] as Pt);
const INK = "#1c1008";

// ═════════════════════════════════════════════════════ the name tag: a white card with a dark rim and MANAGER in marker capitals, fitted to the card (laid over the blank tag that is painted on the tie picture, bigger than it so that it reads)
export const TAG = { w: 240, h: 130 };
export function drawNameTag(g: G, s: { text: string; ready: boolean }) {
  g.save();
  g.beginPath(); g.roundRect(4, 4, TAG.w - 8, TAG.h - 8, 12); g.fillStyle = "#fcfbf6"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#1c1008"; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#141c4e";
  let size = 84; g.font = `400 ${size}px ${MARKER_FONT}`;
  while (g.measureText(s.text).width > TAG.w - 36 && size > 30) { size -= 2; g.font = `400 ${size}px ${MARKER_FONT}`; }
  g.fillText(s.text, TAG.w / 2, TAG.h / 2 + 5);
  g.restore();
}
/** the tag over the painted one: its middle at frame (x, y), `w` frame px wide, turned `rot` degrees */
export function NameTag({ x, y, w, rot = 0, order, ready }: { x: number; y: number; w: number; rot?: number; order: number; ready: boolean }) {
  return <InkPlane x={PX(x)} y={PY(y)} w={w} h={(w * TAG.h) / TAG.w} cw={TAG.w} ch={TAG.h} rot={rot} order={order} state={{ text: "MANAGER", ready }} draw={drawNameTag} ready={ready} />;
}

// ═════════════════════════════════════════════════════ the hit star: short spikes thrown out of the rim of a face (frame px centre, radius), fading over 0.16 s
export function Impact({ cx, cy, r, age, order }: { cx: number; cy: number; r: number; age: number; order: number }) {
  if (age < 0 || age > 0.16) return null;
  const u = age / 0.16;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.15 * hash(i * 2.3), r0 = r * (1.02 + 0.2 * u), r1 = r * (1.16 + 0.42 * u + 0.12 * hash(i * 4.1));
        return <Poly key={i} pts={ribbon([[PX(cx) + Math.cos(a) * r0, PY(cy) - Math.sin(a) * r0 * 0.9, r * 0.05 * (1 - u)], [PX(cx) + Math.cos(a) * r1, PY(cy) - Math.sin(a) * r1 * 0.9, r * 0.012]])} color="#fff6c8" order={order} op={1 - u} />;
      })}
    </>
  );
}
/** speed lines out of a yelling mouth: short strokes thrown outward from (cx, cy) for `age` s after the shout began; they shimmer on twos */
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

// ═════════════════════════════════════════════════════ the ceiling (frame px): a band of plaster along the top of the frame over the wall, its moulding, and the crack that runs through it
export const CEIL_Y = 150;
export function Ceiling({ order }: { order: number }) {
  return (
    <>
      <Poly pts={FR(0, 0, W, CEIL_Y)} color="#f7f2e5" order={order} />
      <Poly pts={FR(0, CEIL_Y, W, CEIL_Y + 18)} color="#7a6a48" order={order + 0.1} op={0.5} />
      <Poly pts={FR(0, CEIL_Y + 18, W, CEIL_Y + 40)} color="#7a6a48" order={order + 0.1} op={0.22} />
      <Poly pts={FR(0, CEIL_Y - 7, W, CEIL_Y + 3)} color="#5c4d32" order={order + 0.2} />
    </>
  );
}
/** a jagged line from (x0, y0) to (x1, y1) in `n` steps with hashed sideways jumps of up to `amp` px (frame px points) */
function zig(x0: number, y0: number, x1: number, y1: number, n: number, amp: number, seed: number): [number, number][] {
  const out: [number, number][] = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const u = i / n, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1, j = (hash(i * 3.7 + seed) * 2 - 1) * amp;
    out.push([x0 + (x1 - x0) * u + (nx / L) * j, y0 + (y1 - y0) * u + (ny / L) * j]);
  }
  out.push([x1, y1]);
  return out;
}
/** the crack in the ceiling: `len` 0..1 how far it has run along the band from the middle (and the little branches down the wall), `open` 0..1 the hole that it opens in the middle, a jagged edge of plaster round the light */
export function CeilingCrack({ len, open, order }: { len: number; open: number; order: number }) {
  if (len <= 0.01) return null;
  const cx = W / 2, cy = CEIL_Y * 0.52, reach = 470 * len, out: React.ReactNode[] = [];
  [-1, 1].forEach((d) => {
    const pts = zig(cx, cy, cx + d * reach, cy + d * 10, 14, 17, d * 5.3 + 1);
    out.push(<Poly key={`c${d}`} pts={ribbon(pts.map(([x, y], i) => [PX(x), PY(y), 8 - 4.5 * (i / pts.length)]))} color={INK} order={order} />);
    [[0.3, 62], [0.55, 96], [0.8, 70]].forEach(([u, dn], k) => {
      if (len < (u as number) + 0.08) return;
      const bx = cx + d * reach * (u as number), by = cy + d * 10 * (u as number), bl = Math.min(1, (len - (u as number)) / 0.25);
      const bp = zig(bx, by, bx + d * 26, by + (dn as number) * bl + (CEIL_Y - cy), 5, 8, k * 7 + d);
      out.push(<Poly key={`b${d}${k}`} pts={ribbon(bp.map(([x, y], i) => [PX(x), PY(y), 5.4 - 3 * (i / bp.length)]))} color={INK} order={order} op={0.9} />);
    });
  });
  if (open > 0.02) {
    const hw = 34 + 175 * open, n = 18, top: [number, number][] = [], bot: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * 2 - 1, x = cx + u * hw, jag = (hash(i * 4.9 + 2) * 2 - 1) * 12;
      top.push([x, -4]); bot.push([x, CEIL_Y * (0.5 + 0.5 * (1 - Math.abs(u) ** 1.6)) + jag]);
    }
    const edge = [...top, ...bot.reverse()];
    out.push(<Poly key="rim" pts={FP(edge.map(([x, y]) => [cx + (x - cx) * 1.08, y + (y > 0 ? 9 : 0)] as [number, number]))} color="#b9ab86" order={order + 0.1} />);
    out.push(<Poly key="ink" pts={FP(edge.map(([x, y]) => [cx + (x - cx) * 1.03, y + (y > 0 ? 4 : 0)] as [number, number]))} color={INK} order={order + 0.15} />);
    out.push(<Poly key="hole" pts={FP(edge)} color="#fffdf0" order={order + 0.2} />);
  }
  return <>{out}</>;
}
/** the light that pours out of the hole: a wide soft cone down to the floor (frame px: the hole's middle `cx` and half width `hw`, the row `floor` where it ends), motes of dust drifting in it */
export function LightShaft({ cx, hw, open, floor, f, order, top = CEIL_Y * 0.55 }: { cx: number; hw: number; open: number; floor: number; f: number; order: number; top?: number }) {
  if (open <= 0.02) return null;
  const t = f / FPS, w1 = hw * 2.4 + 120;
  return (
    <>
      <Glow x={PX(cx)} y={PY(top + 10)} rx={520} ry={330} op={0.95 * open} order={order} color="rgba(255,244,190,1)" />
      <Poly pts={FP([[cx - hw, top], [cx + hw, top], [cx + w1 / 2 + hw, floor], [cx - w1 / 2 - hw, floor]])} color="#fff2b0" order={order + 0.1} op={0.34 * open} />
      <Poly pts={FP([[cx - hw * 0.55, top], [cx + hw * 0.55, top], [cx + w1 / 3 + hw * 0.4, floor], [cx - w1 / 3 - hw * 0.4, floor]])} color="#ffffff" order={order + 0.2} op={0.2 * open} />
      {Array.from({ length: 26 }, (_, i) => {
        const h = (q: number) => hash(i * q + 2.2), u = (h(1.3) + t * 0.07 * (0.6 + h(2.9))) % 1, y = top + (floor - top) * u, half = hw + (w1 / 2) * u, x = cx + (h(3.7) * 2 - 1) * half * 0.9 + 12 * Math.sin(t * 1.6 + i);
        return <Poly key={i} pts={ellipsePts(PX(x), PY(y), 3 + 3.5 * h(5.1), 3 + 3.5 * h(5.1), 8)} color="#fffbe0" order={order + 0.3} op={0.85 * open * smooth(0, 0.15, u) * (1 - smooth(0.8, 1, u))} />;
      })}
    </>
  );
}
/** a full-frame colour wash: the lightning flash */
export const Wash = ({ color, op, order }: { color: string; op: number; order: number }) => <Poly pts={FR(-40, -40, W + 40, H + 40)} color={color} order={order} op={op} />;

// ═════════════════════════════════════════════════════ the rope (frame px): a polyline of tan strands with an ink line round it and a twist mark every 26 px
export function RopeLine({ pts, w = 22, order, op = 1 }: { pts: [number, number][]; w?: number; order: number; op?: number }) {
  if (pts.length < 2) return null;
  const P = pts.map(([x, y]) => [PX(x), PY(y)] as [number, number]);
  const cum: number[] = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const marks: React.ReactNode[] = [];
  for (let s = 13, k = 0; s < cum[cum.length - 1]; s += 26, k++) {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const L = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / L, x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, y = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u;
    const tx = (P[i][0] - P[i - 1][0]) / L, ty = (P[i][1] - P[i - 1][1]) / L, nx = -ty, ny = tx;
    marks.push(<Poly key={k} pts={ribbon([[x - nx * w * 0.46 - tx * w * 0.32, y - ny * w * 0.46 - ty * w * 0.32, 3.2], [x + nx * w * 0.46 + tx * w * 0.32, y + ny * w * 0.46 + ty * w * 0.32, 3.2]])} color="#7a5524" order={order + 0.2} op={0.85 * op} />);
  }
  return (
    <>
      <Poly pts={ribbon(P.map(([x, y]) => [x, y, w + 7]))} color={INK} order={order} op={op} />
      <Poly pts={ribbon(P.map(([x, y]) => [x, y, w]))} color="#cba064" order={order + 0.1} op={op} />
      <Poly pts={ribbon(P.map(([x, y]) => [x - 3, y + 1, w * 0.28]))} color="#e6c88c" order={order + 0.15} op={0.8 * op} />
      {marks}
    </>
  );
}
/** a rope from (x0, y0) to (x1, y1) that sags sideways by `slack` px in the middle and swings (frame px points for RopeLine) */
export function ropePath(x0: number, y0: number, x1: number, y1: number, slack: number, seed = 0, n = 18): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [x0 + (x1 - x0) * u + slack * Math.sin(Math.PI * u) * Math.cos(u * 5 + seed), y0 + (y1 - y0) * u] as [number, number]; });
}

// ═════════════════════════════════════════════════════ the cardboard halo on its wire (head px: x right, y up from the neck pivot). A ring of gold cardboard (an ink line, its edge in a darker gold, corrugation ticks) tilted a little,
// held over his hair by a thin black wire that rises from the top of his head; `dx`, `dy` its place relative to its resting place, `rot` degrees, `droop` 0..1 how far it has given way (the wire sags)
export const HALO = { y: 566, rx: 116, ry: 27, w: 27, headTop: 432 };
export function HaloOnWire({ dx, dy, rot, droop, order }: { dx: number; dy: number; rot: number; droop: number; order: number }) {
  const cx = dx, cy = HALO.y + dy, ring = (rx: number, ry: number, n = 56): number[][] => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2 + Math.PI / 2; return [Math.cos(a) * rx, Math.sin(a) * ry, HALO.w]; });
  const T = (p: Pt[], ox = 0, oy = 0): Pt[] => xf(p, cx + ox, cy + oy, rot);
  // the wire: from a small clip on his hair to the halo's lower rim, an S that sags with the droop
  const x0 = -6, y0 = HALO.headTop - 4, rimX = cx - 18 * Math.sin((rot * Math.PI) / 180), rimY = cy - HALO.ry - 4, wire: number[][] = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; wire.push([x0 + (rimX - x0) * u + (9 + 24 * droop) * Math.sin(u * Math.PI * 2) * (1 - 0.3 * u), y0 + (rimY - y0) * u - 14 * droop * Math.sin(u * Math.PI), 3.6 - 0.9 * u]); }
  const outer = ribbon(ring(HALO.rx, HALO.ry).map(([x, y]) => [x, y, HALO.w + 7]));
  const band = ribbon(ring(HALO.rx, HALO.ry));
  return (
    <>
      <Poly pts={ribbon(wire)} color="#26262c" order={order} />
      <Poly pts={xf(ellipsePts(0, 0, 11, 6, 14), x0, y0)} color="#5a5a64" order={order + 0.05} />
      <Poly pts={T(outer.map(([x, y]) => [x, y - 9] as Pt))} color="#4a3206" order={order + 0.1} />
      <Poly pts={T(band.map(([x, y]) => [x, y - 9] as Pt))} color="#b68a14" order={order + 0.2} />
      <Poly pts={T(outer)} color="#4a3206" order={order + 0.3} />
      <Poly pts={T(band)} color="#f4c93a" order={order + 0.4} />
      <Poly pts={T(ribbon(ring(HALO.rx, HALO.ry, 56).slice(30, 52).map(([x, y]) => [x, y + 1, 7])))} color="#fff0a0" order={order + 0.45} op={0.85} />
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + 0.1, ci = Math.cos(a), si = Math.sin(a);
        return <Poly key={i} pts={T(ribbon([[ci * (HALO.rx - 9), si * (HALO.ry - 7), 2], [ci * (HALO.rx + 9), si * (HALO.ry + 7), 2]]))} color="#a67c10" order={order + 0.5} op={0.7} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ steam. The cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second
const cloud = (s: Sprite) => ({ x: s.x - W / 2, y: H / 2 - s.y, r: s.r * 1.55, a: s.a });
/** the jet out of his ear hole (frame px `at`, y down), thrown sideways (`dir` -1 left, 1 right) over `dist` px at the speed of a kettle, thick as the steam level of the moment (src/x12-sched.ts steamLevel); `k` a scale */
export function jetSprites(at: [number, number], dir: -1 | 1, dist: number, t: number, k: number, seed: number, lvk = 1): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.2) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1, lv = steamLevel(Math.round((tb + 0.05) * FPS)) * lvk;
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 3.2 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0], at[1], at[0] + dir * 6, at[1] - 4, 5], n, r: [(16 + 4 * lv) * k, (52 + 14 * lv) * k], rise: [10, 80], life: [0.5, 0.95], strength: 0.95, drift: dist * 2.2, burst: 1.9, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map(cloud);
}
/** an ordinary kettle plume out of an ear hole: thrown out and up (the far ear of the two-shot) */
export function plumeSprites(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number, lvk = 1): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1, lv = steamLevel(Math.round((tb + 0.05) * FPS)) * lvk;
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0], at[1], at[0] + dir * 8, at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map(cloud);
}
/** the steam over a warm cup: lazy wisps rising off its lid (frame px `at`, the middle of the lid), `level` 0..1 how much */
export function cupSprites(at: [number, number], level: number, t: number, k: number, seed = 5): Sprite[] {
  const out: Sprite[] = [];
  if (level <= 0.02) return out;
  for (let b = Math.floor((t - 2.0) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1;
    if (tb < 0) continue;
    const n = Math.floor(level * 1.3 + hash(b * 2.9 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 5 + seed, emitters: [{ seg: [at[0] - 22 * k, at[1], at[0] + 22 * k, at[1], 4], n, r: [9 * k, 30 * k], rise: [120 * k, 230 * k], life: [1.0, 1.7], strength: 0.9, drift: 26 * k, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map(cloud);
}
/** a cloud of sprites (flat white with a thin ink line), the look of src/x08-fx.tsx Cloud */
export function SteamCloud({ sprites, order }: { sprites: Sprite[]; order: number }) {
  if (!sprites.length) return null;
  return <Goo sprites={sprites} order={order} fill="#f6f9fd" ink="#7d8aa3" opacity={1} th={0.4} ow={3} res={0.5} blur={2} maxN={760} />;
}
/** a little steam off a lid in front of a face (frame px `at` the middle of the lid; `t` s; `k` a scale; `level` 0..1 how warm): `n` thin white threads with a thin ink line, each grows upward, sways and thins out over `life` s, then starts again from a new sway; they
 *  are offset from one another in time, so there is always one rising. Lumpy clouds (SteamCloud) read as white lumps on a face; a thread does not hide the eyes */
export function SteamWisps({ at, t, k, level, order, n = 2, life = 0.9 }: { at: [number, number]; t: number; k: number; level: number; order: number; n?: number; life?: number }) {
  if (level <= 0.02) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const c = t / life + i / n, cyc = Math.floor(c), a = c - cyc, age = a * life, sd = hash(cyc * 7.3 + i * 3.1 + 1.7), len = Math.min(1, a / 0.55);
        const x0 = PX(at[0]) + (i - (n - 1) / 2) * 34 * k, y0 = PY(at[1]) + 4 * k, pts: number[][] = [];
        for (let j = 0; j <= 20; j++) {
          const u = (j / 20) * len;
          pts.push([x0 + (40 * Math.sin(u * 8 + sd * 6.28 - age * 3) * (0.15 + u) + 22 * u * (sd - 0.5) * 2) * k, y0 + u * 270 * k, (6 + 15 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * k * (1 - 0.45 * u)]);
        }
        const fade = Math.min(1, age * 5) * (1 - smooth(0.55, 1, a)) * level, tip = pts[pts.length - 1], mid = pts[Math.floor(pts.length * 0.55)];
        return (
          <React.Fragment key={i}>
            {len > 0.3 && <Glow x={mid[0]} y={mid[1]} rx={46 * k} ry={46 * k} op={0.5 * fade} order={order - 0.1} color="rgba(255,255,255,1)" />}
            {len > 0.6 && <Glow x={tip[0]} y={tip[1]} rx={62 * k} ry={58 * k} op={0.42 * fade} order={order - 0.1} color="rgba(255,255,255,1)" />}
            <Inked pts={ribbon(pts)} color="#fbfdff" ink="#6f7f9c" w={3} order={order} op={fade} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/** a rounded paper tab for debugging and small signs: kept out of the shots */
export const Tab = ({ x, y, w, h, color, order }: { x: number; y: number; w: number; h: number; color: string; order: number }) => <Inked pts={xf(roundRect(w, h, 6), PX(x), PY(y))} color={color} ink={INK} w={3} order={order} />;
export { hash, smooth, FR as frameRect };
/** a picture sprite (a file) stretched to a frame rectangle: x0, y0 top left, w, h (frame px), over `order` */
export const Pic = ({ file, x0, y0, w, h, order, alpha = true, op = 1, tint, rot = 0 }: { file: string; x0: number; y0: number; w: number; h: number; order: number; alpha?: boolean; op?: number; tint?: string; rot?: number }) => <Picture file={file} w={w} h={h} x={PX(x0 + w / 2)} y={PY(y0 + h / 2)} order={order} alpha={alpha} op={op} tint={tint} rot={rot} />;
