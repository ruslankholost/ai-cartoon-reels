import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Cloud } from "./x08-fx";
import { hash, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { FPS, STORM_T, clamp01, ease, steamLevel } from "./x16-sched";

// The effects and props of x16 "Hiring a Zoomer" that are drawn in code (src/x16-scenes.tsx places them): the ring light and its glow, the red flags on their sticks (a stick and a red triangle of cloth that waves, stabbed in with a thwip), the hearts
// that float up her live, the cobwebs, Kenzie's tumbler, a table top, the steam out of Ross's ear holes and the storm of flags it blows across the café. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the
// pieces that say `frame`; panel px (y up, origin in the middle) elsewhere. Every piece is a closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source. The shapes that move are
// drawn once, in unit size, and placed by a group's position, turn and scale, so that no frame makes a new geometry (the cloth of a flag has eight shapes, one for each step of its wave).
const W = 1080, H = 1920;
export const RED = "#e5242b", RED_INK = "#5e0a0f";

// ═════════════════════════════════════════════════════ the ring light: a white ring in a thin grey housing, a soft glow round it that blazes with `level` (0 off .. 1.2 the flash of the click); (x, y) its middle, `r` its outer radius,
// `w` the width of the lit band. `inner`: a glow laid over what is inside the ring (it lights a face), drawn at `order + 20` over the puppet
function Ring({ x, y, ri, ro, color, op = 1, order }: { x: number; y: number; ri: number; ro: number; color: string; op?: number; order: number }) {
  if (op <= 0.004) return null;
  return (
    <mesh position={[x, y, 0]} renderOrder={order}>
      <ringGeometry args={[ri, ro, 96]} />
      <meshBasicMaterial color={color} transparent opacity={op} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
export function RingLight({ x, y, r, w, level, order, inner = 0.2, glow = 0.55 }: { x: number; y: number; r: number; w?: number; level: number; order: number; inner?: number; glow?: number }) {
  const band = w ?? r * 0.17, lit = clamp01(level), ri = r - band;
  return (
    <>
      <Glow x={x} y={y} rx={r * 2.2} ry={r * 2.2} op={glow * level} order={order - 3} color="rgba(255,243,208,1)" />
      <Ring x={x} y={y} ri={ri - r * 0.035} ro={r + r * 0.045} color="#59606c" order={order - 1} />
      <Ring x={x} y={y} ri={ri} ro={r} color="#c3c9d4" order={order} />
      <Ring x={x} y={y} ri={ri + band * 0.1} ro={r - band * 0.1} color="#fffdf0" op={lit} order={order + 0.1} />
      {inner > 0 && <Glow x={x} y={y} rx={r * 1.15} ry={r * 1.15} op={inner * level} order={order + 20} color="rgba(255,250,232,1)" />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the red flags. A stick (a thin tapered bar with a line round it, a gold ball on the big ones) and a red pennant that waves; its base is at (x, y) (panel px), `k` scales it, `rot` degrees turns
// it about the base (0 upright), `dir` the side the cloth hangs on. `age`: seconds since it was stabbed in (the stab: it comes in along its own axis from a stick-length away in three frames, the stick shakes after it); `t` seconds for the wave
type FlagKind = { L: number; sw: number; cw: number; ch: number; at: number; col: string; ink: string; ball?: number };
export const FLAG_KINDS = {
  pick: { L: 120, sw: 4.6, cw: 62, ch: 42, at: 0.97, col: "#ecd09a", ink: "#8a6a30" },                           // a toothpick
  pencil: { L: 190, sw: 7.5, cw: 74, ch: 50, at: 0.97, col: "#f2c64a", ink: "#8a6a10" },                         // a pencil
  desk: { L: 300, sw: 9, cw: 130, ch: 88, at: 0.95, col: "#3a3d44", ink: "#0e0f12", ball: 12 },                 // a desk flag
  tiny: { L: 92, sw: 3.4, cw: 36, ch: 25, at: 0.97, col: "#ecd09a", ink: "#8a6a30" },
  pole: { L: 1000, sw: 27, cw: 330, ch: 222, at: 0.26, col: "#f3f1ea", ink: "#4a4a4a", ball: 36 },              // the full flagpole: it goes up out of the frame, its cloth is a quarter of the way up
} satisfies Record<string, FlagKind>;
export type FlagKindId = keyof typeof FLAG_KINDS;
const STEPS = 8, APPROACH = 0.1;
/** how far along its own axis a flag still is from its planting place (px at k = 1): it comes in over the 0.1 s before `age` 0 (the stab) and is there on it */
export const flagSlide = (kind: FlagKindId, age: number): number => (age >= 0 ? 0 : (FLAG_KINDS[kind] as FlagKind).L * 0.9 * Math.min(1, -age / APPROACH) ** 1.4);
/** the cloth of a flag in px (x right from the stick, y up from its top corner) at a step of the wave: a pennant whose two edges ripple towards its tip */
function clothPts(cw: number, ch: number, step: number): Pt[] {
  const n = 8, top: Pt[] = [], bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = 0.15 * u * Math.sin(Math.PI * 2 * (1.4 * u - step / STEPS));
    top.push([u * cw, (-0.5 * u + d) * ch]);
    bot.push([u * cw, (-1 + 0.5 * u + d) * ch]);
  }
  return [...top, ...bot.reverse()];
}
const stickPts = (L: number, sw: number): Pt[] => [[-sw / 2, 0], [sw / 2, 0], [sw * 0.4, L], [-sw * 0.4, L]];
export function Flag({ x, y, k = 1, rot = 0, dir = 1, age = 9, t, kind, order, seed = 0 }: { x: number; y: number; k?: number; rot?: number; dir?: 1 | -1; age?: number; t: number; kind: FlagKindId; order: number; seed?: number }) {
  if (age < -APPROACH) return null;
  const K = FLAG_KINDS[kind] as FlagKind, step = Math.floor(((t * 3.4 + seed * 0.37) % 1) * STEPS) % STEPS, a = Math.max(0, age);
  const slide = flagSlide(kind, age), wob = a > 0 ? 8 * Math.exp(-a / 0.16) * Math.cos(a * 38) * (kind === "pole" ? 0.45 : 1) : 0;
  const cx = K.sw * 0.4 * dir, top = K.L * K.at;
  return (
    <Group x={x} y={y} rot={rot + wob} sx={k} sy={k}>
      <Group x={0} y={slide}>
        <Inked pts={stickPts(K.L, K.sw)} color={K.col} ink={K.ink} w={Math.max(1.4, K.sw * 0.22)} order={order} />
        {K.ball && <Inked pts={ellipsePts(0, K.L + K.ball * 0.55, K.ball, K.ball, 20)} color="#f0bf2a" ink="#8a6410" w={Math.max(2, K.ball * 0.14)} order={order + 0.2} />}
        <Group x={cx} y={top} sx={dir} sy={1}>
          <Inked pts={clothPts(K.cw, K.ch, step)} color={RED} ink={RED_INK} w={Math.max(1.6, K.ch * 0.045)} order={order + 0.1} />
        </Group>
      </Group>
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the hearts that float up her live (frame px): each pops in at the bottom of the screen on its own lane, rises on a sway and fades. `starts` the start times (s), `lanes` x (0..1 of the frame's width)
const HEART: Pt[] = Array.from({ length: 36 }, (_, i) => { const q = (i / 36) * Math.PI * 2, s = Math.sin(q); return [(16 * s * s * s) / 17, (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) / 17 + 0.05] as Pt; });
export function Hearts({ t, items, bottom, order }: { t: number; items: { t0: number; x: number; sway: number; size: number; rise: number }[]; bottom: number; order: number }) {
  return (
    <>
      {items.map((h, i) => {
        const a = t - h.t0;
        if (a < 0 || a > 1.3) return null;
        const u = clamp01(a / 1.2), s = h.size * Math.min(1, 0.4 + a / 0.1) * (1 + 0.06 * Math.sin(a * 14)), x = h.x * W + h.sway * Math.sin(a * 7.5 + i * 1.7), y = bottom - h.rise * ease(u) * 0.85 - 40 * u, fade = a > 0.9 ? Math.max(0, 1 - (a - 0.9) / 0.3) : 1;
        return (
          <Group key={i} x={PX(x)} y={PY(y)} rot={-12 + 8 * Math.sin(a * 5 + i)} sx={s} sy={s}>
            <Inked pts={HEART} color={i % 3 === 1 ? "#ff7aa6" : "#ff3b5c"} ink="#ffffff" w={0.09} order={order} op={fade} />
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ a cobweb in the corner of the sign (frame px): `x`, `y` the corner, `R` its reach, `dir` 1 hangs it from a top left corner (the threads go right and down), -1 from a top right one. Grey threads with a
// sag, so that they read on white paper
export function Cobweb({ x, y, R, dir = 1, order, op = 0.85 }: { x: number; y: number; R: number; dir?: 1 | -1; order: number; op?: number }) {
  const spokes = [0, 22, 45, 68, 90].map((a) => (a * Math.PI) / 180), rings = [0.3, 0.52, 0.76, 1.0];
  const at = (a: number, r: number): [number, number] => [PX(x + dir * Math.cos(a) * R * r), PY(y + Math.sin(a) * R * r)];
  const line = (a: Pt, b: Pt, sag: number, w: number): Pt[] => ribbon(Array.from({ length: 7 }, (_, i) => { const u = i / 6; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), w * (0.6 + 0.4 * Math.sin(Math.PI * u))]; }));
  const col = "#7f8794";
  return (
    <>
      {spokes.map((a, i) => <Poly key={`s${i}`} pts={line(at(a, 0), at(a, 1), 4 + 4 * hash(i * 3.1 + x), 3)} color={col} order={order} op={op} />)}
      {rings.flatMap((r, j) => spokes.slice(0, -1).map((a, i) => <Poly key={`r${j}-${i}`} pts={line(at(a, r), at(spokes[i + 1], r), R * 0.07 * (0.6 + 0.8 * hash(i * 7.7 + j * 2.9 + y)), 2.4)} color={col} order={order + 0.1} op={op} />))}
      <Poly pts={line(at(0.2, 0.2), [PX(x + dir * R * 1.35), PY(y + R * 0.25)], 10, 2.4)} color={col} order={order + 0.1} op={op * 0.9} />
    </>
  );
}

// ═════════════════════════════════════════════════════ Kenzie's giant tumbler (frame px, its middle (x, y)): a tall sky-blue cup, a flat white lid, a pink straw. `tall` its height in px
export function Tumbler({ x, y, tall = 560, order, rot = 0 }: { x: number; y: number; tall?: number; order: number; rot?: number }) {
  const k = tall / 560;
  const body: Pt[] = [[-110, -250], [110, -250], [128, 250], [-128, 250]], lid: Pt[] = [[-142, 250], [142, 250], [142, 288], [-142, 288]], straw: Pt[] = [[-8, 288], [8, 288], [8, 520], [-8, 520]];
  return (
    <Group x={PX(x)} y={PY(y)} rot={rot} sx={k} sy={k}>
      <Inked pts={straw} color="#ff5fa8" ink="#7a1f4a" w={2.6} order={order} />
      <Inked pts={ribbon([[128, 170, 22], [200, 150, 22], [226, 40, 22], [212, -80, 22], [150, -120, 22]])} color="#5aaee0" ink="#1f5f86" w={3.4} order={order + 0.1} />
      <Inked pts={body} color="#6ec1f0" ink="#1f5f86" w={3.4} order={order + 0.2} />
      <Poly pts={ribbon([[-84, -226, 14], [-96, 220, 18]])} color="#bfe6fb" order={order + 0.4} op={0.9} />
      <Inked pts={lid} color="#f6f6f2" ink="#5d5a52" w={3.4} order={order + 0.5} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ a table top seen from the front (frame px): a long low slab, a darker front edge; `y` the top's near edge, `x0`..`x1` across
export function TableTop({ x0, x1, y, h = 64, order }: { x0: number; x1: number; y: number; h?: number; order: number }) {
  return (
    <>
      <Poly pts={[[PX(x0), PY(y - h)], [PX(x1), PY(y - h)], [PX(x1), PY(y)], [PX(x0), PY(y)]]} color="#b9722f" order={order} />
      <Poly pts={[[PX(x0), PY(y - h)], [PX(x1), PY(y - h)], [PX(x1), PY(y - h + 6)], [PX(x0), PY(y - h + 6)]]} color="#d8975a" order={order + 0.1} />
      <Poly pts={[[PX(x0), PY(y)], [PX(x1), PY(y)], [PX(x1), PY(y + 26)], [PX(x0), PY(y + 26)]]} color="#7e4a1a" order={order + 0.1} />
      <Poly pts={[[PX(x0), PY(y - 2)], [PX(x1), PY(y - 2)], [PX(x1), PY(y + 3)], [PX(x0), PY(y + 3)]]} color="#3e2410" order={order + 0.2} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the screen bursting where Mom's arm comes out of it (frame px, `at` the middle, `r` the hole's radius, `age` s since the burst): a ragged dark hole, white cracks running out of it over the glass,
// a few shards; drawn over the cut end of the sleeve. It pops out in two frames and holds
export function ScreenBurst({ at, r, age, order }: { at: [number, number]; r: number; age: number; order: number }) {
  if (age < 0) return null;
  const p = Math.min(1, age / 0.07), R = r * (0.6 + 0.4 * p) * (1 + 0.12 * Math.exp(-age / 0.06) * Math.cos(age * 50));
  const hole: Pt[] = Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2, q = i % 2 ? 0.62 + 0.2 * hash(i * 2.7) : 1.0 + 0.15 * hash(i * 4.1); return [PX(at[0]) + Math.cos(a) * R * q, PY(at[1]) - Math.sin(a) * R * q * 1.25] as Pt; });
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.3, r0 = R * 0.9, r1 = R * (1.6 + 1.2 * hash(i * 3.3)) * p;
        return <Poly key={i} pts={ribbon([[PX(at[0]) + Math.cos(a) * r0, PY(at[1]) - Math.sin(a) * r0, 5], [PX(at[0]) + Math.cos(a + 0.12 * (hash(i) - 0.5)) * r1, PY(at[1]) - Math.sin(a) * r1, 1.5]])} color="#ffffff" order={order} op={0.95} />;
      })}
      <Poly pts={hole} color="#150b22" order={order + 0.2} />
      <Poly pts={hole.map(([x, y]) => [PX(at[0]) + (x - PX(at[0])) * 0.78, PY(at[1]) + (y - PY(at[1])) * 0.78] as Pt)} color="#2e1a4d" order={order + 0.3} />
    </>
  );
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

// ═════════════════════════════════════════════════════ the steam storm's flags (shot 22)
/** the flags the steam blows across the café (frame px): each starts at one of the places `from` (the hair, the coffee, the tumbler, the screen, his head), flies out on its own arc with its own spin, grows as it comes at the lens (the same
 *  closed form as the envelopes of x15) and is gone off the frame; `n` of them, `size` the stick's scale at the start */
export function StormFlags({ t, from, order, n = 18, seed = 3 }: { t: number; from: [number, number][]; order: number; n?: number; seed?: number }) {
  const out: React.ReactNode[] = [];
  const kinds: FlagKindId[] = ["pencil", "pick", "desk", "pencil", "tiny", "pick"];
  for (let i = 0; i < n; i++) {
    const h = (q: number) => hash(i * q + seed * 5.3), tb = STORM_T + 0.02 + 0.28 * h(1.3), a = t - tb;
    if (a < 0 || a > 1.1) continue;
    const o = from[i % from.length], ang = (-170 + 160 * h(2.1) + (i % 2 ? 0 : 20)) * (Math.PI / 180), v = 900 + 1700 * h(3.7), rot0 = 360 * h(5.7), om = (h(6.1) - 0.5) * 2200;
    const x = o[0] + Math.cos(ang) * v * a, y = o[1] + Math.sin(ang) * v * a + 0.5 * 900 * a * a, s = 0.5 + 1.8 * Math.min(1, a / 0.7) * (0.6 + 0.6 * h(8.9));
    if (x < -420 || x > W + 420 || y < -420 || y > H + 420) continue;
    out.push(<Flag key={i} x={PX(x)} y={PY(y)} k={s * (0.8 + 0.4 * h(9.7))} rot={rot0 + om * a} dir={h(4.3) > 0.5 ? 1 : -1} t={t * 3 + i * 0.31} kind={kinds[i % kinds.length]} order={order + i * 0.01} seed={i} />);
  }
  return <>{out}</>;
}

