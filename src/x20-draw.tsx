import React from "react";
import { Inked, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { hash } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { WordTag } from "./x20-props";
import { CHIME_T, FPS, clamp01, popP } from "./x20-sched";

// The effects and props of x20 "One Coffee" that are drawn in code (src/x20-scenes-a.tsx and src/x20-scenes.tsx place them; the pictures that are painted are placed by src/x20-scenes*.tsx from src/x20-rig.json): the cobwebs, the dust on the camper's hair and
// the strand that snaps, the light through the window, the tumbleweed, the espresso machine's stream, steam and spit, the wall socket, the plugs and the cord, the laptop's screen (OFFER ACCEPTED and the sum), the gong's frame, the mallet, the champagne bottles,
// the foam that bursts and falls and runs down Ross, and the rings of a loud sound. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin in the middle) elsewhere; the screen's
// own design px (1000 x 620 high, y up, origin in its middle) inside a screen. Every piece is a closed-form function of the age it is given: nothing reads a clock or a random source. The shapes that move are drawn once, in unit size, and placed by a group's
// position, turn and scale, so that no frame makes a new geometry where that can be helped (src/x18-draw.tsx).
const UNIT = ellipsePts(0, 0, 1, 1, 28);
const D2R = Math.PI / 180;
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
type V = [number, number];
/** a point of a quadratic curve a -> c -> b at u */
const qb = (a: V, c: V, b: V, u: number): V => { const m = 1 - u; return [m * m * a[0] + 2 * m * u * c[0] + u * u * b[0], m * m * a[1] + 2 * m * u * c[1] + u * u * b[1]]; };
/** the control point that makes the curve from a to b hang `sag` px low in the middle (frame px: y down) and `bow` px to its side */
const ctrl = (a: V, b: V, sag: number, bow: number): V => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [(a[0] + b[0]) / 2 - (dy / L) * bow * 2, (a[1] + b[1]) / 2 + (dx / L) * bow * 2 + sag * 2]; };

// ═════════════════════════════════════════════════════ cobwebs: a thread (frame px) from a to b that hangs `sag` px low in the middle, white with a thin grey edge; a web is a few threads from a to b, wider in the middle than at the ends, tied together by short cross threads
export const WEB = "#f7f7fb", WEB_INK = "#80808f";
export function Strand({ a, b, sag = 30, bow = 0, w = 4, order, op = 1, n = 14 }: { a: V; b: V; sag?: number; bow?: number; w?: number; order: number; op?: number; n?: number }) {
  const c = ctrl(a, b, sag, bow);
  const pts = Array.from({ length: n + 1 }, (_, i) => { const u = i / n, [x, y] = qb(a, c, b, u); return [PX(x), PY(y), w * (0.55 + 0.45 * Math.sin(Math.PI * u))]; });
  return (
    <>
      <Poly pts={ribbon(pts.map(([x, y, ww]) => [x, y, ww + 3.4]))} color={WEB_INK} order={order} op={op * 0.62} />
      <Poly pts={ribbon(pts)} color={WEB} order={order + 0.1} op={op} />
    </>
  );
}
export function Web({ a, b, sag = 40, n = 3, spread = 26, w = 4, links = 3, order, op = 1, seed = 1 }: { a: V; b: V; sag?: number; n?: number; spread?: number; w?: number; links?: number; order: number; op?: number; seed?: number }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const thr = Array.from({ length: n }, (_, i) => {
    const o = (i - (n - 1) / 2) * spread, s = sag * (1 + 0.18 * (hash(i * 2.1 + seed) - 0.5));
    const a2: V = [a[0] + nx * o * 0.3, a[1] + ny * o * 0.3], b2: V = [b[0] + nx * o * 0.3, b[1] + ny * o * 0.3];
    return { a: a2, b: b2, bow: o, sag: s, c: ctrl(a2, b2, s, o) };
  });
  return (
    <>
      {thr.map((t, i) => <Strand key={i} a={t.a} b={t.b} sag={t.sag} bow={t.bow} w={w} order={order + i * 0.01} op={op} />)}
      {thr.slice(1).flatMap((t, i) => Array.from({ length: links }, (_, k) => {
        const u = (k + 1) / (links + 1) + 0.05 * (hash(i * 3.3 + k + seed) - 0.5), p0 = qb(thr[i].a, thr[i].c, thr[i].b, u), p1 = qb(t.a, t.c, t.b, u);
        return <Strand key={`${i}-${k}`} a={p0} b={p1} sag={3} w={w * 0.7} order={order + 0.05} op={op} n={6} />;
      }))}
    </>
  );
}
/** a thread through the points (frame px): the web's white with its thin grey edge, thicker in the middle than at the ends */
function Thread({ pts, w, order, op = 1 }: { pts: V[]; w: number; order: number; op?: number }) {
  const line = pts.map(([x, y], i) => [PX(x), PY(y), w * (0.62 + 0.38 * Math.sin((Math.PI * i) / (pts.length - 1)))]);
  return (
    <>
      <Poly pts={ribbon(line.map(([x, y, ww]) => [x, y, ww + 3.4]))} color={WEB_INK} order={order} op={op * 0.62} />
      <Poly pts={ribbon(line)} color={WEB} order={order + 0.1} op={op} />
    </>
  );
}
/** a cartoon cobweb in a corner: radial strands run from the corner `a` out to the points `ends` (frame px), each with a little sag, and curved cross threads join neighbours at the fractions `arcs` of their length, bowed toward the corner by `pull` of the way to it; `torn` leaves the cross threads out (loose threads only) */
export function FanWeb({ a, ends, sag = 6, w = 7.5, order, op = 1, torn = false, arcs = [0.3, 0.52, 0.74, 0.92], pull = 0.2 }: { a: V; ends: V[]; sag?: number; w?: number; order: number; op?: number; torn?: boolean; arcs?: number[]; pull?: number }) {
  const at = (e: V, u: number): V => qb(a, ctrl(a, e, sag, 0), e, u);
  return (
    <>
      {ends.map((e, i) => <Strand key={i} a={a} b={e} sag={sag} w={w} order={order + i * 0.01} op={op} />)}
      {!torn && arcs.flatMap((u, k) => ends.slice(1).map((e, i) => {
        const p0 = at(ends[i], u), p1 = at(e, u), m: V = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], c: V = [m[0] + (a[0] - m[0]) * pull * 2, m[1] + (a[1] - m[1]) * pull * 2];
        return <Thread key={`${k}-${i}`} pts={Array.from({ length: 9 }, (_, j) => qb(p0, c, p1, j / 8))} w={w * 0.72} order={order + 0.2} op={op} />;
      }))}
    </>
  );
}
/** a small spider on a thread: the thread hangs from (x, y0) (frame px), the spider at its end `len` px lower bobs and sways a little (a function of the frame), a dark body and head with two white eyes and eight bent legs; `s` its size (1: the body is 34 px across) */
export function Spider({ x, y0, len, f, s = 1, order }: { x: number; y0: number; len: number; f: number; s?: number; order: number }) {
  const R = 17 * s, bx = x + 4 * s * Math.sin(f * 0.11 + 1), by = y0 + len + 8 * s * Math.sin(f * 0.17), ink = "#0b0a0d", body = "#2c2631";
  const legs = [-1, 1].flatMap((side) => [0, 1, 2, 3].map((i) => {
    const t = 1.5 - i;   // the front legs (t > 0) reach up, the back ones down
    return ribbon([[side * R * 0.7, t * R * 0.22 - R * 0.1, 3.2 * s], [side * R * (1.45 + 0.12 * i), t * R * 0.5 + R * 0.75, 3.2 * s], [side * R * (2.2 + 0.1 * i), t * R * 0.55 - R * 0.55, 2.4 * s]]);
  }));
  return (
    <>
      <Thread pts={[[x, y0], [bx, by - R * 1.4]]} w={3 * s} order={order} />
      <Group x={PX(bx)} y={PY(by)}>
        {legs.map((l, i) => <Poly key={i} pts={l} color={ink} order={order + 0.1} />)}
        <Group x={0} y={-R * 0.2} sx={R} sy={R * 1.12}><Poly pts={UNIT} color={ink} order={order + 0.2} /><Group x={0} y={0} sx={0.86} sy={0.86}><Poly pts={UNIT} color={body} order={order + 0.3} /></Group></Group>
        <Group x={0} y={R * 0.95} sx={R * 0.62} sy={R * 0.58}><Poly pts={UNIT} color={ink} order={order + 0.2} /><Group x={0} y={0} sx={0.84} sy={0.84}><Poly pts={UNIT} color={body} order={order + 0.3} /></Group></Group>
        {[-1, 1].map((q) => <Group key={q} x={q * R * 0.24} y={R * 1.02} sx={R * 0.16} sy={R * 0.19}><Poly pts={UNIT} color="#ffffff" order={order + 0.4} /></Group>)}
      </Group>
    </>
  );
}
/** the strand that snaps (shot 8): from the table's anchor `a` to the cup `b` it is stretched thinner and straighter from `f0` on and, on frame `snapF`, it lets go: both pieces whip back to their ends in seven frames (a wobble across, shrinking) */
export function SnapStrand({ a, b, f, f0, snapF, order, w = 7 }: { a: V; b: V; f: number; f0: number; snapF: number; order: number; w?: number }) {
  if (f < snapF) {
    const u = clamp01((f - f0) / (snapF - f0));
    return <Strand a={a} b={b} sag={lerp(46, 2, u)} w={lerp(w, w * 0.65, u)} order={order} />;
  }
  const age = f - snapF, k = clamp01(age / 7);
  if (k >= 1) return null;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len, wob = 16 * (1 - k) * Math.sin(age * 1.9);
  const r1 = 0.5 * (1 - k) ** 1.4, r2 = 0.36 * (1 - k) ** 1.4;   // the cup's piece and the table's piece: how much of the whole each still is
  const e1: V = [b[0] + (a[0] - b[0]) * r1 + nx * wob, b[1] + (a[1] - b[1]) * r1 + ny * wob], e2: V = [a[0] + (b[0] - a[0]) * r2 - nx * wob, a[1] + (b[1] - a[1]) * r2 - ny * wob];
  return (
    <>
      <Strand a={b} b={e1} sag={18 * (1 - k)} bow={wob * 0.6} w={w * 0.6} order={order} op={1 - k * 0.5} />
      <Strand a={a} b={e2} sag={14 * (1 - k)} bow={-wob * 0.6} w={w * 0.6} order={order} op={1 - k * 0.5} />
    </>
  );
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ═════════════════════════════════════════════════════ dust: grey-beige flecks that hang in the air over a box (frame px: its middle (cx, cy), `w` x `h`), each drifting down slowly on its own phase and fading in and out; `fall` 0 .. 1 makes them drop (the camper moves his head)
export function DustSpecks({ cx, cy, w, h, f, n = 10, order, fall = 0, size = 1, color = "#ddd6c4" }: { cx: number; cy: number; w: number; h: number; f: number; n?: number; order: number; fall?: number; size?: number; color?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const sp = 0.0035 * (0.6 + hash(i * 1.9)) * (1 + 6 * fall), ph = (((hash(i * 5.3 + 2) + f * sp) % 1) + 1) % 1, x = cx + (hash(i * 3.7 + 1) - 0.5) * w + Math.sin(f * 0.07 + i * 1.3) * 6, y = cy - h / 2 + ph * h, r = (2.6 + 3.4 * hash(i * 7.1)) * size;
        return <Group key={i} x={PX(x)} y={PY(y)} sx={r} sy={r * 0.85}><Poly pts={UNIT} color={color} order={order + i * 0.001} op={0.95 * Math.sqrt(Math.sin(Math.PI * ph))} /></Group>;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the light through the café's window on the wall (shot 2): a patch of warm light with the window's cross in it (four panes), sheared and turned; (x, y) its middle (frame px), `ang` degrees clockwise, `op` how strong
export function LightPatch({ x, y, ang, op, order, s = 1 }: { x: number; y: number; ang: number; op: number; order: number; s?: number }) {
  if (op <= 0.01) return null;
  const sh = 0.28, pane = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0 + sh * y0, y0], [x1 + sh * y0, y0], [x1 + sh * y1, y1], [x0 + sh * y1, y1]];
  const panes: Pt[][] = [pane(-174, 8, -12, 424), pane(12, 8, 174, 424), pane(-174, -424, -12, -8), pane(12, -424, 174, -8)];
  return (
    <Group x={PX(x)} y={PY(y)} rot={-ang} sx={s} sy={s}>
      {panes.map((p, i) => <Poly key={i} pts={p} color="#fff1b5" order={order} op={op} />)}
      {panes.map((p, i) => <Poly key={`g${i}`} pts={p.map(([a, b]) => [a * 1.06, b * 1.04] as Pt)} color="#ffe58a" order={order - 0.01} op={op * 0.35} />)}
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the tumbleweed: a ball of dry brown scribbles drawn once in unit size (six loose loops and a pale fill), placed by a group: (x, y) its middle (frame px), `r` its radius, `rot` degrees clockwise, (sx, sy) a squash
const LOOPS: Pt[][] = Array.from({ length: 7 }, (_, i) => {
  const h = (q: number) => hash(i * q + 4.7), k = 3 + Math.floor(4 * h(1.3)), ph = h(2.9) * 6.28, tilt = (h(3.7) - 0.5) * 1.2;
  const pl = Array.from({ length: 49 }, (_, j) => { const a = (j / 48) * Math.PI * 2, r = 0.92 - 0.18 * h(5.1) + 0.11 * Math.sin(k * a + ph) + 0.05 * Math.sin((k + 3) * a + ph * 1.7); return [Math.cos(a + tilt) * r * (1 - 0.3 * h(6.1)), Math.sin(a) * r, 0.065 + 0.03 * h(7.3)]; });
  return ribbon(pl);
});
export function Tumbleweed({ x, y, r, rot = 0, sx = 1, sy = 1, order }: { x: number; y: number; r: number; rot?: number; sx?: number; sy?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={r * sx} sy={r * sy}>
      <Poly pts={ellipsePts(0, 0, 1.0, 1.0, 28)} color="#e4c98d" order={order} op={0.5} />
      {LOOPS.map((p, i) => <Poly key={i} pts={p} color={i % 3 === 0 ? "#6f4f22" : i % 3 === 1 ? "#a07a3a" : "#c29a52"} order={order + 0.1 + i * 0.01} />)}
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the espresso machine's stream, steam and spit (shot 18): the stream is a dark coffee ribbon (a shine down its left side), a drop is a teardrop, a puff is a white flat cloud that rises, grows and thins
export const COFFEE = { fill: "#2e170a", ink: "#120904", light: "#8a5a38" };
export function CoffeeStream({ x, y0, y1, w, order, op = 1 }: { x: number; y0: number; y1: number; w: number; order: number; op?: number }) {
  if (y1 <= y0 + 1 || w <= 0.4) return null;
  return (
    <>
      <Poly pts={ribbon([[PX(x), PY(y0), w + 6], [PX(x), PY(y1), w * 0.8 + 6]])} color={COFFEE.ink} order={order} op={op} />
      <Poly pts={ribbon([[PX(x), PY(y0), w], [PX(x), PY(y1), w * 0.8]])} color={COFFEE.fill} order={order + 0.1} op={op} />
      <Poly pts={ribbon([[PX(x) - w * 0.22, PY(y0), w * 0.16], [PX(x) - w * 0.2, PY(y1), w * 0.14]])} color={COFFEE.light} order={order + 0.2} op={op * 0.9} />
    </>
  );
}
const DROP: Pt[] = (() => {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 16;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
})();
/** a teardrop (round end down, its tip up): (x, y) the middle of its round end (frame px), `s` its radius, `stretch` how long it is drawn */
export function Drop({ x, y, s, stretch = 1, fill = COFFEE.fill, ink = COFFEE.ink, order, op = 1 }: { x: number; y: number; s: number; stretch?: number; fill?: string; ink?: string; order: number; op?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={s} sy={s * stretch}>
      <Inked pts={DROP} color={fill} ink={ink} w={0.2} order={order} op={op} />
    </Group>
  );
}
/** puffs of steam: `n` white cartoon clouds (clusters of bubbles) born one after another from frame f0 to f1 at the point `at` (frame px), each living `life` frames: it rises `rise` px, wanders sideways, grows from r0 to r1 and thins out */
export function Puffs({ at, f, f0, f1, n, life = 14, rise = 150, drift = 30, r0 = 18, r1 = 52, order, seed = 1, op = 0.95 }: { at: V; f: number; f0: number; f1: number; n: number; life?: number; rise?: number; drift?: number; r0?: number; r1?: number; order: number; seed?: number; op?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const born = f0 + ((f1 - f0) * i) / Math.max(1, n - 1), age = f - born, a = age / life;
        if (age < 0 || a >= 1) return null;
        const r = r0 + (r1 - r0) * a, x = at[0] + drift * (hash(i * 2.7 + seed) - 0.5) * 2 * (0.4 + a) + 14 * Math.sin(a * 6 + i), y = at[1] - rise * a ** 0.8;
        return <Blob key={i} x={x} y={y} s={r} i={i + Math.floor(seed)} rot={hash(i * 4.3 + seed) * 360} order={order + i * 0.01} op={op * (1 - a) ** 0.8 * Math.min(1, age / 2)} fill="#f6f9fd" ink="#9aa6bb" shade="#dfe6f2" />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the wall socket (a white plate with two slots and a round hole, two screws), a plug (a black body with two steel prongs; its cord leaves the back) and a cord (a black cable through the points, frame px)
export function Outlet({ x, y, k = 1, order }: { x: number; y: number; k?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={k} sy={k}>
      <Inked pts={roundRect(190, 270, 34, 6)} color="#f4f1e6" ink="#7d7765" w={5} order={order} />
      <Poly pts={roundRect(150, 230, 26, 6)} color="#ece8d8" order={order + 0.6} />
      {[-1, 1].map((s) => <Poly key={s} pts={roundRect(18, 60, 5, 3).map(([a, b]) => [a + s * 30, b + 42] as Pt)} color="#2a2a30" order={order + 0.7} />)}
      {[-1, 1].map((s) => <Poly key={`b${s}`} pts={roundRect(18, 60, 5, 3).map(([a, b]) => [a + s * 30, b - 70] as Pt)} color="#2a2a30" order={order + 0.7} />)}
      <Poly pts={ellipsePts(0, 150, 9, 9, 12)} color="#7d7765" order={order + 0.7} />
      <Poly pts={ellipsePts(0, -150, 9, 9, 12)} color="#7d7765" order={order + 0.7} />
    </Group>
  );
}
/** a plug: (x, y) the middle of its body, `rot` degrees clockwise (0: the prongs point up, the cord leaves downward), `k` its size (1: the body is 120 px across) */
export function PlugProp({ x, y, rot = 0, k = 1, order, color = "#1d1d22" }: { x: number; y: number; rot?: number; k?: number; order: number; color?: string }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={k} sy={k}>
      {[-1, 1].map((s) => <Inked key={s} pts={roundRect(18, 62, 4, 3).map(([a, b]) => [a + s * 26, b + 104] as Pt)} color="#c4c9d0" ink="#4a4f58" w={3} order={order} />)}
      <Inked pts={roundRect(120, 138, 26, 6)} color={color} ink="#050507" w={4} order={order + 0.2} />
      <Poly pts={roundRect(96, 12, 5, 3).map(([a, b]) => [a, b + 46] as Pt)} color="#3a3a44" order={order + 0.4} />
      <Poly pts={ribbon([[0, -66, 26], [0, -120, 22]])} color={color} order={order + 0.1} />
    </Group>
  );
}
export function Cord({ pts, w = 14, order, color = "#1d1d22", op = 1 }: { pts: V[]; w?: number; order: number; color?: string; op?: number }) {
  const line = pts.map(([x, y]) => [PX(x), PY(y), w]);
  return (
    <>
      <Poly pts={ribbon(line.map(([x, y, ww]) => [x, y, ww + 6]))} color="#050507" order={order} op={op} />
      <Poly pts={ribbon(line)} color={color} order={order + 0.1} op={op} />
      <Poly pts={ribbon(line.map(([x, y, ww]) => [x - ww * 0.2, y, ww * 0.18]))} color="#5a5a66" order={order + 0.2} op={op * 0.8} />
    </>
  );
}
/** a cord that hangs from `a` to `b` (frame px) in a loop that sags `sag` px: its points */
export const cordPts = (a: V, b: V, sag: number, n = 18): V[] => { const c = ctrl(a, b, sag, 0); return Array.from({ length: n + 1 }, (_, i) => qb(a, c, b, i / n)); };
/** a flash where a plug meets a socket: a small white star, `age` s since the contact */
export function Spark({ x, y, age, r = 90, order }: { x: number; y: number; age: number; r?: number; order: number }) {
  if (age < 0 || age > 0.16) return null;
  const u = age / 0.16;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3, r0 = r * 0.25, r1 = r * (0.7 + 0.5 * (i % 2)) * (0.6 + 0.6 * u);
        return <Poly key={i} pts={ribbon([[PX(x) + Math.cos(a) * r0, PY(y) - Math.sin(a) * r0, 9 * (1 - u)], [PX(x) + Math.cos(a) * r1, PY(y) - Math.sin(a) * r1, 2]])} color="#fff3a8" order={order} op={1 - u} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the laptop: its screen (1000 x 620 design px) in a dark bezel over a pale base, seen from the front, (x, y) the middle of the screen (frame px), `k` frame px per design px; the screen's content is drawn by
// the children (a function of the order to draw from). The painted laptop has its screen as a hole and the content is drawn behind it: the same call
export function LaptopFront({ x, y, k = 1, order, children }: { x: number; y: number; k?: number; order: number; children?: (o: number) => React.ReactNode }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={k} sy={k}>
      <Inked pts={[[-540, -330], [540, -330], [640, -470], [-640, -470]]} color="#b9bfc9" ink="#4a4f5a" w={5} order={order} />
      <Poly pts={roundRect(240, 26, 12, 4).map(([a, b]) => [a, b - 408] as Pt)} color="#8f95a1" order={order + 0.2} />
      {children?.(order + 1)}
      {/* the bezel: four bars over the content's edges (the screen is a hole in it, as in the painted laptop) */}
      {[rect(-540, 310, 540, 340), rect(-540, -340, 540, -310), rect(-540, -340, -500, 340), rect(500, -340, 540, 340)].map((p, i) => <Poly key={i} pts={p} color="#272a33" order={order + 5} />)}
      <Poly pts={ribbon(roundRect(1000, 620, 8, 4).concat([roundRect(1000, 620, 8, 4)[0]]).map(([a, b]) => [a, b, 3]))} color="#0c0d11" order={order + 5.1} />
    </Group>
  );
}
/** the content of the laptop's screen in shot 21: a dark window, a green banner OFFER ACCEPTED that pops on the chime, the sum under it counting up from $0 to $40,000,000 in seven frames and flashing, confetti falling from then on */
const SUM = 40_000_000, SUM_TEXT = "$40,000,000";
const fmt = (v: number) => "$" + (Math.round(v / 1000) * 1000).toLocaleString("en-US");
export function ScreenOffer({ f, order = 10 }: { f: number; order?: number }) {
  const e = 510, k = f - Math.round(CHIME_T * FPS), pop = k >= 0 ? popP(k / FPS, 0, 0.45, 40) : 0, count = clamp01((k - 2) / 7), shown = k < 2 ? 0 : SUM * count ** 1.6, flash = k === 9 ? 0.5 : k === 10 ? 0.22 : 0;
  const CONF = ["#ff4d6d", "#ffd54a", "#4dd6ff", "#7dff7d", "#ff9a3c", "#c77dff"];
  return (
    <>
      <Poly pts={rect(-e, -320, e, 320)} color="#0c1830" order={order} />
      <Poly pts={rect(-e, 258, e, 320)} color="#17294d" order={order + 0.1} />
      {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => <Poly key={i} pts={ellipsePts(-440 + i * 38, 289, 11, 11, 14)} color={c} order={order + 0.2} />)}
      {k >= 0 && (
        <Group x={0} y={118} sx={Math.max(0.01, pop)} sy={Math.max(0.01, pop)}>
          <Inked pts={roundRect(860, 150, 44, 8)} color="#17a85a" ink="#07522b" w={7} order={order + 0.5} />
          <Poly pts={ellipsePts(-352, 0, 52, 52, 24)} color="#ffffff" order={order + 1.2} />
          <Poly pts={ribbon([[-378, -2, 15], [-358, -24, 15], [-322, 24, 15]])} color="#17a85a" order={order + 1.3} />
          <WordTag text="OFFER ACCEPTED" w={620} h={96} fill="#ffffff" ink="#07522b" lineW={0.1} x={50} y={0} order={order + 1.4} />
        </Group>
      )}
      {k >= 2 && <WordTag text={fmt(shown)} fitTo={SUM_TEXT} w={920} h={190} fill="#ffd54a" ink="#5a3a00" lineW={0.1} x={0} y={-84} sx={k >= 9 ? 1 + 0.1 * Math.exp(-(k - 9) / 2) : 1} sy={k >= 9 ? 1 + 0.1 * Math.exp(-(k - 9) / 2) : 1} order={order + 1.5} />}
      {k >= 9 && Array.from({ length: 16 }, (_, i) => {
        const a = (k - 9) / FPS, h = (q: number) => hash(i * q + 6.1), x = (h(1.3) - 0.5) * 920, y = 330 - (130 + 520 * h(2.1)) * a * 3 - 12 * Math.sin(a * 9 + i), rot = 400 * a * (h(3.3) - 0.5) * 3;
        return <Group key={i} x={x} y={y} rot={rot}><Poly pts={rect(-8, -5, 8, 5)} color={CONF[i % CONF.length]} order={order + 1.6} /></Group>;
      })}
      {flash > 0 && <Poly pts={rect(-e, -320, e, 320)} color="#ffffff" order={order + 1.9} op={flash} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the gong's stand: two posts, a crossbar, feet, two cords and the brass disc hanging on them (a boss in its middle, two rings); (x, y) the middle of the disc (frame px), `k` its size (1: the disc is 380 px across),
// `swing` px the disc is thrown sideways by the blow (it turns a little about its cords): the picture shakes
export function GongProp({ x, y, k = 1, swing = 0, order }: { x: number; y: number; k?: number; swing?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={k} sy={k}>
      <Inked pts={roundRect(34, 600, 8, 4).map(([a, b]) => [a - 250, b + 40] as Pt)} color="#8a5a2a" ink="#3a2410" w={5} order={order} />
      <Inked pts={roundRect(34, 600, 8, 4).map(([a, b]) => [a + 250, b + 40] as Pt)} color="#8a5a2a" ink="#3a2410" w={5} order={order} />
      <Inked pts={roundRect(600, 40, 10, 4).map(([a, b]) => [a, b + 340] as Pt)} color="#9a6a34" ink="#3a2410" w={5} order={order + 0.1} />
      {[-1, 1].map((s) => <Inked key={s} pts={roundRect(130, 28, 8, 4).map(([a, b]) => [a + s * 250, b - 262] as Pt)} color="#7a4a22" ink="#3a2410" w={5} order={order} />)}
      <Group x={swing} y={0} rot={-swing * 0.12}>
        {[-1, 1].map((s) => <Poly key={s} pts={ribbon([[s * 70, 340, 6], [s * 118, 150, 6]])} color="#3a2a1a" order={order + 0.2} />)}
        <Inked pts={ellipsePts(0, 0, 190, 190, 48)} color="#dca62a" ink="#5a3c08" w={7} order={order + 0.3} />
        <Poly pts={ribbon(ellipsePts(0, 0, 150, 150, 40).map(([a, b]) => [a, b, 9]))} color="#b8841a" order={order + 0.4} />
        <Poly pts={ribbon(ellipsePts(0, 0, 98, 98, 36).map(([a, b]) => [a, b, 7]))} color="#b8841a" order={order + 0.4} />
        <Inked pts={ellipsePts(0, 0, 46, 46, 24)} color="#f2cf62" ink="#7a5410" w={5} order={order + 0.5} />
        <Poly pts={ribbon([[-120, 100, 14], [-60, 150, 10]])} color="#fff0a8" order={order + 0.6} op={0.7} />
      </Group>
    </Group>
  );
}
/** the padded mallet: a wooden handle from the hands (x, y) (frame px) out to the head, turned `rot` degrees clockwise from pointing up, `len` px long */
export function Mallet({ x, y, rot = 0, len = 340, order }: { x: number; y: number; rot?: number; len?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot}>
      <Poly pts={ribbon([[0, 0, 26], [0, len, 22]])} color="#2a1a0a" order={order} />
      <Poly pts={ribbon([[0, 0, 18], [0, len, 14]])} color="#a86e36" order={order + 0.1} />
      <Inked pts={ellipsePts(0, len + 34, 54, 44, 24)} color="#d9c9aa" ink="#4a3a20" w={5} order={order + 0.2} />
    </Group>
  );
}
/** the rings of a loud sound: a ring that grows from a point (frame px) and fades; `u` 0 .. 1 */
const RING: Pt[] = ribbon(ellipsePts(0, 0, 1, 1, 40).map(([a, b]) => [a, b, 0.06] as number[]));
export function Ring({ cx, cy, r0, r1, u, order, color = "#ffffff", op = 0.85 }: { cx: number; cy: number; r0: number; r1: number; u: number; order: number; color?: string; op?: number }) {
  if (u <= 0 || u >= 1) return null;
  const r = r0 + (r1 - r0) * (1 - (1 - u) ** 2);
  return <Group x={PX(cx)} y={PY(cy)} sx={r} sy={r}><Poly pts={RING} color={color} order={order} op={op * (1 - u)} /></Group>;
}

// ═════════════════════════════════════════════════════ champagne: a bottle (green glass, a gold foil on its neck, a cream label), foam (white lumpy blobs with a pale gold edge) that bursts out of a neck, falls on whatever is under it and runs down it in streaks with a drop at
// the end. The foam is white all over (never steam, never a cork: Ross never blows up)
export const FOAM = { fill: "#ffffff", ink: "#c9bfa0", shade: "#efe9d6" };
export function BottleProp({ x, y, k = 1, rot = 0, order }: { x: number; y: number; k?: number; rot?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={k} sy={k}>
      <Inked pts={roundRect(130, 260, 40, 6).map(([a, b]) => [a, b - 100] as Pt)} color="#2f7a4a" ink="#0f3a22" w={5} order={order} />
      <Inked pts={roundRect(54, 170, 18, 6).map(([a, b]) => [a, b + 60] as Pt)} color="#2f7a4a" ink="#0f3a22" w={5} order={order} />
      <Inked pts={roundRect(66, 58, 10, 4).map(([a, b]) => [a, b + 160] as Pt)} color="#d8b02e" ink="#5a420c" w={5} order={order + 0.2} />
      <Poly pts={roundRect(104, 108, 14, 4).map(([a, b]) => [a, b - 90] as Pt)} color="#f1e7c8" order={order + 0.3} />
      <Poly pts={ribbon([[-40, -40, 12], [-40, -150, 10]])} color="#7fc89a" order={order + 0.4} op={0.7} />
    </Group>
  );
}
/** a cluster of four round bubbles (a fill with an edge round the whole, a faint shade low on each), `s` its radius (frame px), drawn in unit size and placed by a group: the foam of champagne and the puffs of steam are the same shape in other colours */
const BUBBLES: [number, number, number][][] = Array.from({ length: 4 }, (_, i) => {
  const h = (q: number) => hash(i * q + 8.1);
  return [[-0.45 + 0.12 * h(1.1), 0.1, 0.6], [0.44 - 0.12 * h(2.2), 0.16, 0.56], [0.04 + 0.3 * (h(3.3) - 0.5), -0.38, 0.64], [0.3 * (h(4.4) - 0.5), 0.46, 0.46]] as [number, number, number][];
});
export function Blob({ x, y, s, i = 0, rot = 0, sx = 1, sy = 1, order, op = 1, fill, ink, shade }: { x: number; y: number; s: number; i?: number; rot?: number; sx?: number; sy?: number; order: number; op?: number; fill: string; ink: string; shade: string }) {
  const bs = BUBBLES[i % 4];
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={s * sx} sy={s * sy}>
      {bs.map(([cx, cy, r], k) => <Group key={`o${k}`} x={cx} y={cy} sx={r * 1.14} sy={r * 1.14}><Poly pts={UNIT} color={ink} order={order} op={op} /></Group>)}
      {bs.map(([cx, cy, r], k) => <Group key={`f${k}`} x={cx} y={cy} sx={r} sy={r}><Poly pts={UNIT} color={fill} order={order + 0.1} op={op} /></Group>)}
      {bs.map(([cx, cy, r], k) => <Group key={`s${k}`} x={cx + r * 0.22} y={cy - r * 0.3} sx={r * 0.5} sy={r * 0.34}><Poly pts={UNIT} color={shade} order={order + 0.2} op={op * 0.75} /></Group>)}
    </Group>
  );
}
export const Foam = (p: { x: number; y: number; s: number; i?: number; rot?: number; sx?: number; sy?: number; order: number; op?: number }) => <Blob {...p} fill={FOAM.fill} ink={FOAM.ink} shade={FOAM.shade} />;
/** the foam that bursts out of a bottle's neck at `at` (frame px): `age` s since the pop. About `n` blobs thrown up and out, then falling; each has its own angle, speed, size and life */
export function FoamBurst({ at, age, k = 1, n = 34, order, seed = 1, spread = 70 }: { at: V; age: number; k?: number; n?: number; order: number; seed?: number; spread?: number }) {
  if (age < 0 || age > 1.2) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const h = (q: number) => hash(i * q + seed * 3.3 + 2.2), ang = (-90 + (h(2.3) - 0.5) * spread) * D2R, v = (800 + 900 * h(3.7)) * k, g = 2600 * k, life = 0.55 + 0.5 * h(4.1);
        if (age > life) return null;
        const x = at[0] + Math.cos(ang) * v * age * 0.8, y = at[1] + Math.sin(ang) * v * age + 0.5 * g * age * age, r = (12 + 24 * h(5.1)) * k * (0.5 + 0.8 * Math.min(1, age / 0.2));
        return <Foam key={i} x={x} y={y} s={r} i={i} rot={h(6.1) * 360} order={order + i * 0.01} op={1 - smooth(life * 0.6, life, age)} />;
      })}
    </>
  );
}
/** foam that falls and lands: blobs coming down from above the frame onto the targets `to` (frame px, [x, y, radius]), each landing at its own time (s after `age` 0, a spread of `over` s) with a squash; before it lands a blob is a streak falling */
export function FoamFall({ age, to, over = 0.35, order, seed = 1 }: { age: number; to: [number, number, number][]; over?: number; order: number; seed?: number }) {
  return (
    <>
      {to.map(([x, y, r], i) => {
        const h = (q: number) => hash(i * q + seed * 2.9 + 1.7), land = over * h(1.9) + 0.06, fall = 0.14;
        if (age < land - fall) return null;
        if (age < land) { const u = (age - (land - fall)) / fall, yy = -140 + (y + 140) * u * u; return <Poly key={i} pts={ribbon([[PX(x), PY(yy - 160), r * 0.7], [PX(x), PY(yy), r * 1.5]])} color={FOAM.fill} order={order + i * 0.01} op={0.92} />; }
        const a = age - land, sq = 1 + 0.35 * Math.exp(-a / 0.06) * Math.cos(a * 40), grow = Math.min(1, 0.6 + a / 0.1);
        return <Foam key={i} x={x} y={y} s={r * grow} i={i} sx={sq} sy={1 / sq} rot={(h(2.7) - 0.5) * 30} order={order + 2 + i * 0.01} />;
      })}
    </>
  );
}
/** a run of foam down a surface: a white ribbon from (x, y) down `len` px with a little sway, wider where it starts, a drop hanging at its end; `p` 0 .. 1 how far it has run */
export function FoamRun({ x, y, len, w, p, order, sway = 6 }: { x: number; y: number; len: number; w: number; p: number; order: number; sway?: number }) {
  if (p <= 0.03) return null;
  const n = 10, pl = Array.from({ length: n + 1 }, (_, i) => { const u = (i / n) * p; return [PX(x + Math.sin(u * 6) * sway), PY(y + len * u), w * (1 - 0.5 * u)]; });
  const end = pl[n];
  return (
    <>
      <Poly pts={ribbon(pl.map(([a, b, c]) => [a, b, c + 4.5]))} color={FOAM.ink} order={order} />
      <Poly pts={ribbon(pl)} color={FOAM.fill} order={order + 0.1} />
      <Poly pts={ellipsePts(end[0], end[1] - w * 0.2, w * 0.55 + 2.4, w * 0.62 + 2.4, 14)} color={FOAM.ink} order={order} />
      <Poly pts={ellipsePts(end[0], end[1] - w * 0.2, w * 0.55, w * 0.62, 14)} color={FOAM.fill} order={order + 0.1} />
    </>
  );
}
/** a drop of foam that hangs at a point (frame px) from `f0`, swelling, and lets go on frame `fall`: it falls `drop` px with gravity and is gone; before `f0` nothing */
export function FoamDrip({ x, y, f, f0, fall, s = 16, order }: { x: number; y: number; f: number; f0: number; fall: number; s?: number; order: number }) {
  if (f < f0) return null;
  if (f < fall) { const u = (f - f0) / (fall - f0); return <Drop x={x} y={y + 10 * u} s={s * (0.55 + 0.45 * u)} stretch={1 + 0.5 * u} fill={FOAM.fill} ink={FOAM.ink} order={order} />; }
  const a = (f - fall) / FPS;
  if (a > 0.45) return null;
  return <Drop x={x} y={y + 10 + 0.5 * 3000 * a * a} s={s} stretch={1.6 + 3 * a} fill={FOAM.fill} ink={FOAM.ink} order={order} op={1 - smooth(0.3, 0.45, a)} />;
}
