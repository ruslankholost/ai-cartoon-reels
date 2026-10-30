import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Picture, Poly, ribbon, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Cup } from "./lips8-fx";
import { Cloud } from "./x08-fx";
import { hash, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { FPS, LETTER_T, STEAMB_T, clamp01, ease, steamLevel, type Stage } from "./x15-sched";

// The effects and props of x15 "Bleep Fee" that are drawn in code (src/x15-scenes.tsx places them): the pixel mosaics, the steam that curls into letters, the envelopes that fly out of the mail slot and pile up, the paper of the receipt
// that unrolls, the two paper cups that jump on the slam, the steam out of Ross's ear holes. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin in the middle)
// elsewhere, head px (from the neck pivot, y up) for what goes on a head. Every piece is a closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source. The shapes that move are
// drawn once, in unit size, and placed by a group's position, turn and scale, so that no frame makes a new geometry (the mosaic is the one thing that is rebuilt: it is one mesh of vertex-coloured squares, thrown away when the next one replaces it).
const W = 1080, H = 1920;

// ═════════════════════════════════════════════════════ the pixel mosaic: a grid of flat squares over a mouth, half a face, a face, a whole head or a word. Seeded, shimmering on every second frame, one mesh
export type MosaicShape = { cx: number; cy: number; a: number; b: number; ellipse: boolean; cell: number; cutY?: number };
export type MosaicLook = { kind: Stage; mouth: [number, number]; eyes: [number, number, number, number][]; top: number };   // the head's mouth (head px), the two eyes (x, y, rx, ry) and the row above which his hair is
export type MosaicCell = { x: number; y: number; w: number; h: number; c: string };
const PURPLE = ["#b0468a", "#a43f80", "#bd4f95", "#9a3877", "#c65ea0", "#8a3069"];
const PLUM = ["#4d1b3f", "#3a1230", "#5d2249"];
const MOUTH = ["#2b0e0e", "#3d1226", "#4d1b3f"];
const TEETH = ["#f3dcea", "#e9c5db"];
const HAIR = ["#9b4d28", "#7d3a1b", "#b0602f", "#8a4422"];
const STEAM = ["#f6f9fd", "#e1e8f1", "#c3cfdf", "#a7b6cb", "#f6f9fd"];
const pick = (p: string[], h: number) => p[Math.min(p.length - 1, Math.floor(h * p.length))];
/** the squares of a mosaic on frame `ph` (the shimmer's step): the same cells, a quarter of them re-drawn every step. The colours are his purple face's tones; over the mouth the middle is dark with a row of pale teeth, over a face the eyes are pale squares with a dark one
 *  for the pupil and a plum band for the brows, over a whole head the top is hair-coloured, over the steam word the squares are white and grey */
export function mosaicCells(sh: MosaicShape, look: MosaicLook, seed: number, ph: number): MosaicCell[] {
  const out: MosaicCell[] = [], c = sh.cell, nx = Math.ceil(sh.a / c) + 1, ny = Math.ceil(sh.b / c) + 1;
  for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
    const x = sh.cx + i * c, y = sh.cy + j * c, u = (i * c) / sh.a, v = (j * c) / sh.b;
    if (sh.ellipse ? u * u + v * v > 1.04 : Math.abs(i * c) > sh.a - c * 0.4 || Math.abs(j * c) > sh.b - c * 0.4) continue;
    if (sh.cutY !== undefined && y > sh.cutY) continue;
    const h0 = hash(i * 7.13 + j * 3.77 + seed * 1.31), live = hash(i * 1.7 + j * 2.3 + ph * 9.1 + seed) < 0.25, h = live ? hash(i * 5.9 + j * 4.1 + ph * 3.3 + seed * 2.7) : h0, r = Math.hypot(u, v);
    let col: string;
    if (look.kind === "word") col = pick(STEAM, h);
    else if (look.kind === "mouth") col = r < 0.62 ? (j === -Math.round(sh.b / c) + 1 || (j === -ny + 1 && h < 0.5) ? pick(TEETH, h) : pick(MOUTH, h)) : pick(PURPLE, h);
    else {
      col = pick(PURPLE, h);
      for (const [ex, ey, rx, ry] of look.eyes) {
        const dx = (x - ex) / rx, dy = (y - ey) / ry;
        if (dx * dx + dy * dy < 1) col = Math.abs(x - ex) < c * 0.5 && Math.abs(y - ey) < c * 0.5 ? "#2b1722" : pick(TEETH, h);
        else if (Math.abs(x - ex) < rx * 1.1 && y > ey + ry * 0.95 && y < ey + ry * 1.5 && h < 0.8) col = pick(PLUM, h);
      }
      if (Math.abs(x - look.mouth[0]) < 62 && y < look.mouth[1] + 12 && y > look.mouth[1] - 66 && h < 0.7) col = pick(MOUTH, h);
      if (look.kind === "head" && y > look.top && h < 0.85) col = pick(HAIR, h);
    }
    out.push({ x, y, w: c, h: c, c: col });
  }
  return out;
}
const COLS = new Map<string, THREE.Color>();
const colOf = (s: string) => { let k = COLS.get(s); if (!k) { k = new THREE.Color(s); COLS.set(s, k); } return k; };
/** the cells as one mesh of vertex-coloured squares (head px or panel px: wherever the group it sits in is) */
export function MosaicMesh({ cells, order, op = 1 }: { cells: MosaicCell[]; order: number; op?: number }) {
  const key = cells.length + ":" + cells.map((q) => `${q.x | 0},${q.y | 0},${q.c}`).join(";");
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(cells.length * 18), col = new Float32Array(cells.length * 18);
    cells.forEach((q, n) => {
      const x0 = q.x - q.w / 2, x1 = q.x + q.w / 2, y0 = q.y - q.h / 2, y1 = q.y + q.h / 2, k = colOf(q.c);
      pos.set([x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0], n * 18);
      for (let v = 0; v < 6; v++) col.set([k.r, k.g, k.b], n * 18 + v * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (!cells.length || op <= 0.004) return null;
  return (
    <mesh geometry={geo} renderOrder={order} frustumCulled={false}>
      <meshBasicMaterial vertexColors transparent opacity={op} side={THREE.DoubleSide} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
/** the mosaic snapping on: a little over its size on the first frame, settling in three */
export const mosaicPop = (age: number): number => (age < 0 ? 0 : 1 + 0.13 * Math.exp(-age / 0.05) * Math.cos(age * 50));

// ═════════════════════════════════════════════════════ the two paper cups on the counter that jump when the phone lands (src/x14-draw.tsx JumpCup): `at` the middle of the cup's base on the counter's top (frame px), `w` its width, `age` s since the slam
export function JumpCup({ at, w, age, order, up = 70 }: { at: [number, number]; w: number; age: number; order: number; up?: number }) {
  const k = w / 104, a = Math.max(0, age), hop = age < 0 ? 0 : up * Math.abs(Math.sin(a * 11)) * Math.exp(-a / 0.3), land = age < 0 ? 0 : Math.max(0, Math.exp(-a / 0.12) * Math.cos(a * 40)) * (hop < 6 ? 1 : 0);
  return <Cup x={PX(at[0])} y={PY(at[1] - 75 * k - hop)} s={k * (1 - 0.06 * land)} order={order} />;
}

// ═════════════════════════════════════════════════════ the steam out of an ear hole: an ordinary kettle plume thrown out and up (the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment)
const cloud = (s: Sprite) => ({ x: s.x - W / 2, y: H / 2 - s.y, r: s.r * 1.55, a: s.a });
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
export function EarPlumes({ left, right, t, k, order, lvk = 1 }: { left: [number, number]; right: [number, number]; t: number; k: number; order: number; lvk?: number }) {
  const sp = [...plumeSprites(left, -1, t, k, 1, lvk), ...plumeSprites(right, 1, t, k, 2, lvk)];
  return sp.length ? <Cloud sprites={sp} order={order} /> : null;
}

// ═════════════════════════════════════════════════════ the steam that curls into letters (shot 26): each letter is a few strokes (unit size, x right, y up); a puff of steam leaves the ear for every point along a stroke and
// flies to its place on the letter on a curl, one letter after the other (the first four frames of each letter's age); the puffs are the Goo cloud kit's metaballs, so that they merge into thick white strokes with a thin ink line
const STROKES: Record<string, Pt[][]> = {
  F: [[[0, 0], [0, 1]], [[0, 1], [0.86, 1]], [[0, 0.52], [0.68, 0.52]]],
  U: [[[0, 1], [0, 0.34], [0.08, 0.14], [0.26, 0.03], [0.5, 0], [0.74, 0.03], [0.92, 0.14], [1, 0.34], [1, 1]]],
  C: [Array.from({ length: 15 }, (_, i) => { const a = ((40 + (280 * i) / 14) * Math.PI) / 180; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)] as Pt; })],
  K: [[[0, 0], [0, 1]], [[0, 0.42], [0.95, 1]], [[0.32, 0.6], [1, 0]]],
};
function sample(pl: Pt[], d: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pl.length; i++) {
    const a = pl[i], b = pl[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / d));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
/** where the word sits (frame px): the middle of its row, the height and the width of a letter, the gap; `ears` the frame points the puffs leave from (left ear, right ear) */
export type WordPlace = { cx: number; cy: number; lw: number; lh: number; gap: number; ears: [[number, number], [number, number]] };
export function wordBox(p: WordPlace): [number, number, number, number] {   // x0, y0, x1, y1 of the whole word (frame px)
  const w = 4 * p.lw + 3 * p.gap;
  return [p.cx - w / 2, p.cy - p.lh / 2, p.cx + w / 2, p.cy + p.lh / 2];
}
export function steamLetterSprites(f: number, p: WordPlace, word = "FUCK"): Sprite[] {
  const t = f / FPS, out: Sprite[] = [], w = 4 * p.lw + 3 * p.gap, k = p.lh / 150;
  [...word].forEach((ch, li) => {
    const age = t - LETTER_T[li];
    if (age < 0) return;
    const left = li < 2, ear = p.ears[left ? 0 : 1], x0 = p.cx - w / 2 + li * (p.lw + p.gap);
    let n = 0;
    STROKES[ch].forEach((pl, si) => sample(pl, 0.13).forEach(([ux, uy], pi) => {
      const j = n++, born = 0.0022 * j * (1 + 0.35 * si), a = age - Math.min(born, 0.045), fly = clamp01(a / 0.07);
      if (a < 0) return;
      const tx = x0 + ux * p.lw, ty = p.cy + p.lh / 2 - uy * p.lh, e = ease(fly), wob = 1 - fly, wig = 3.2 * Math.sin(age * 11 + j * 1.7) * (1 - 0.5 * wob);
      const cx = ear[0] + (tx - ear[0]) * e + (left ? -1 : 1) * 70 * Math.sin(Math.PI * fly) * (0.6 + 0.4 * hash(j * 2.3)), cy = ear[1] + (ty - ear[1]) * e - 90 * Math.sin(Math.PI * fly);
      const r = (21 + 5 * hash(j * 3.1) + 2.5 * Math.sin(age * 9 + j)) * k * (0.55 + 0.45 * e), alpha = smooth(0, 0.05, a) * (steamLevel(f) > 0 ? 1 : 0.8);
      out.push({ x: cx + wig - W / 2, y: H / 2 - (cy + 1.2 * Math.cos(age * 8 + pi)), r: r * 1.55, a: Math.min(1, alpha) });
    }));
  });
  return out;
}
export function SteamLetters({ f, place, order }: { f: number; place: WordPlace; order: number }) {
  const sp = steamLetterSprites(f, place);
  if (!sp.length || f / FPS >= STEAMB_T + 1) return null;
  return <Cloud sprites={sp} order={order} th={0.42} />;
}

// ═════════════════════════════════════════════════════ the envelopes (the painted one, public/sp/x15-envelope.png): thrown out of a point (frame px) like water out of a hose, one every 1/rate s from `t0`, each on its own arc with its own spin,
// growing as it comes at the lens. With `land` they come down on a mound (centre x, half width, the floor's row, the mound's height at time t) and lie where they landed, so that the heap rises as they pile on; without it they fall on past the
// frame's bottom (the painted pile of shot 10 hides them: they are drawn behind it)
export type EnvImg = { file: string; w: number; h: number };
export type Mound = { x: number; halfW: number; floor: number; hMax: (t: number) => number };
export function Envelopes({ img, from, fromW = 0, t, t0, rate, n, land, order, k = 0.17, seed = 1, spread = 1, flyers = 0 }: { img: EnvImg; from: [number, number]; fromW?: number; t: number; t0: number; rate: number; n: number; land?: Mound; order: number; k?: number; seed?: number; spread?: number; flyers?: number }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const h = (q: number) => hash(i * q + seed * 5.3), tb = t0 + i / rate, a = t - tb;
    if (a < 0) continue;
    const flyer = !land || h(12.1) < flyers, g = 2800, rot0 = 360 * h(5.7), om = (h(6.1) - 0.5) * 1100, x0 = from[0] + (h(11.3) - 0.5) * 2 * fromW;
    let vy = -(240 + 620 * h(4.1)), vx = (h(1.9) - 0.5) * 1700 * spread, tl = Infinity;
    if (land && !flyer) {   // a lander is fired at a place on the heap and gets there in 0.3-0.45 s
      const xl = land.x + (h(1.9) - 0.5) * 2 * land.halfW * spread, shape = 1 - ((xl - land.x) / land.halfW) ** 2, ly = land.floor - land.hMax(tb) * shape - 18 * h(7.3);
      tl = 0.3 + 0.15 * h(8.3); vx = (xl - x0) / tl; vy = (ly - from[1] - 0.5 * g * tl * tl) / tl;
    }
    const ac = Math.min(a, tl), landed = a >= tl, x = x0 + vx * ac, y = from[1] + vy * ac + 0.5 * g * ac * ac;
    if (!landed && (y > H + 260 || x < -260 || x > W + 260)) continue;
    const s = k * (flyer ? 0.4 + 2.3 * Math.min(1, ac / 0.6) : 0.4 + 1.1 * Math.min(1, ac / 0.45)) * (0.85 + 0.3 * h(9.7)), rot = rot0 + om * ac * (landed ? 0.1 : 1);
    out.push(
      <Group key={i} x={PX(x)} y={PY(y)} rot={rot} sx={s} sy={s}>
        <Picture file={img.file} w={img.w} h={img.h} order={order + i * 0.001} alpha />
      </Group>,
    );
  }
  return <>{out}</>;
}

// ═════════════════════════════════════════════════════ the strip of the receipt: a ribbon of white paper along a path (frame px), drawn out of its start on `p` (0 .. 1), with a thin ink line and rows of grey bars for the printing
export function Strip({ path, p, w, order, ink = "#3a3a3a" }: { path: (u: number) => [number, number]; p: number; w: number; order: number; ink?: string }) {
  if (p <= 0.003) return null;
  const n = 40, pl: number[][] = [], marks: React.ReactNode[] = [];
  for (let i = 0; i <= n; i++) { const [x, y] = path((i / n) * p); pl.push([PX(x), PY(y), w * (0.8 + 0.2 * Math.min(1, (i / n) * p * 6))]); }
  for (let i = 1; i < n; i += 2) {
    const a = pl[i], b = pl[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, hw = a[2] * (0.16 + 0.2 * hash(i * 1.9));
    marks.push(<Poly key={i} pts={ribbon([[a[0] - nx * hw, a[1] - ny * hw, 5], [a[0] + nx * hw, a[1] + ny * hw, 5]])} color="#8d939c" order={order + 0.2} />);
  }
  return (
    <>
      <Poly pts={ribbon(pl.map(([x, y, ww]) => [x, y, ww + 7]))} color={ink} order={order} />
      <Poly pts={ribbon(pl)} color="#fbfbf7" order={order + 0.1} />
      {marks}
    </>
  );
}
