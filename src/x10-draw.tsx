import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { hash, lerp, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { D2R } from "./pen-stage";
import { FPS, steamLevel, twos } from "./x10-sched";

// The effects and props of x10 "My Own Business" that are drawn in code (src/x10-scenes.tsx places them): the roll-up shutter and the padlock, the counter bell, the fire on the panini press, the sprinkler rain, a phone's ring marks, the moth, the
// quarter, the clock's hands, music notes, dust, the steam out of the shop and out of his ear holes. Flat shapes with the show's thin ink line. Positions are panel px (y up, origin in the middle) unless a name says frame px. Every particle is a
// closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source, so a frame always comes out the same.

// ── the roll-up shutter: grey slats with a light top edge and a dark bottom line, two guide rails at the sides; the panel's rectangle (x0, y0 top .. x1, y1 bottom, panel px) and the slat height
export const STEEL = { slat: "#9aa2aa", light: "#c9d0d6", dark: "#6a727a", ink: "#2f353b", rail: "#4a5057" };
export function Slats({ x0, y0, x1, y1, h = 34, order, rail = true }: { x0: number; y0: number; x1: number; y1: number; h?: number; order: number; rail?: boolean }) {
  const n = Math.max(1, Math.ceil((y0 - y1) / h)), out: React.ReactNode[] = [];
  out.push(<Poly key="b" pts={[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]} color={STEEL.slat} order={order} />);
  for (let i = 0; i < n; i++) {
    const ya = y0 - i * h, yb = Math.max(y1, ya - h);
    out.push(<Poly key={`l${i}`} pts={[[x0, ya], [x1, ya], [x1, ya - Math.min(h * 0.28, ya - yb)], [x0, ya - Math.min(h * 0.28, ya - yb)]]} color={STEEL.light} order={order + 0.1} />);
    out.push(<Poly key={`d${i}`} pts={[[x0, yb + Math.min(h * 0.16, ya - yb)], [x1, yb + Math.min(h * 0.16, ya - yb)], [x1, yb], [x0, yb]]} color={STEEL.dark} order={order + 0.1} />);
  }
  if (rail) out.push(<Poly key="rl" pts={[[x0, y0], [x0 + 16, y0], [x0 + 16, y1], [x0, y1]]} color={STEEL.rail} order={order + 0.2} />, <Poly key="rr" pts={[[x1 - 16, y0], [x1, y0], [x1, y1], [x1 - 16, y1]]} color={STEEL.rail} order={order + 0.2} />);
  return <>{out}</>;
}
/** the shutter's bottom rail: a dark bar with a handle, `s` scales it; its middle at (x, y) */
export function BottomRail({ x, y, w, s = 1, order }: { x: number; y: number; w: number; s?: number; order: number }) {
  return (
    <>
      <Inked pts={roundRect(w, 40 * s, 8 * s).map(([a, b]) => [a + x, b + y] as Pt)} color={STEEL.rail} ink={STEEL.ink} w={3 * s} order={order} />
      <Poly pts={[[x - w / 2 + 6, y + 9 * s], [x + w / 2 - 6, y + 9 * s], [x + w / 2 - 6, y + 14 * s], [x - w / 2 + 6, y + 14 * s]]} color="#7b838b" order={order + 0.2} />
      <Inked pts={roundRect(74 * s, 20 * s, 8 * s).map(([a, b]) => [a + x, b + y - 4 * s] as Pt)} color="#2c3136" ink="#101316" w={2.4 * s} order={order + 0.3} />
    </>
  );
}

// ── the padlock (150 x 124 px at s = 1, its middle at (x, y)): a brass body, a keyhole, a steel shackle that springs up and over when `open` goes 0..1, the key (a brass ring and a stem seen end-on) turned `turn` (0..1 = a quarter turn)
export const BRASS = { fill: "#e0b02a", light: "#f6dc78", dark: "#a97a10", ink: "#4d3606" };
export function Padlock({ x, y, s = 1, rot = 0, open = 0, turn = 0, withKey = true, order }: { x: number; y: number; s?: number; rot?: number; open?: number; turn?: number; withKey?: boolean; order: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s);
  // the shackle: a U (legs at x = -40 and 40, from y 48 up to 70, a half circle of radius 40 over them); open, it lifts and turns about its right foot
  const U: Pt[] = [[-40, 48], [-40, 70], ...Array.from({ length: 19 }, (_, i) => { const a = Math.PI * (1 - i / 18); return [40 * Math.cos(a), 70 + 40 * Math.sin(a)] as Pt; }), [40, 70], [40, 48]];
  const sh = (w: number) => xf(ribbon(U.map(([a, b]) => [a - 40, b - 48, w])), 40, 48 + 34 * open, -50 * open);
  const turnPt = (p: Pt): Pt => { const r = turn * 90 * D2R, c = Math.cos(r), sn = Math.sin(r); return [p[0] * c - (p[1] + 4) * sn, p[0] * sn + (p[1] + 4) * c - 4]; };
  return (
    <>
      <Poly pts={T(sh(17))} color={STEEL.ink} order={order} />
      <Poly pts={T(sh(10))} color="#c8d0d8" order={order + 0.1} />
      <Inked pts={T(roundRect(150, 124, 24, 8))} color={BRASS.fill} ink={BRASS.ink} w={4 * s} order={order + 0.3} />
      <Poly pts={T(roundRect(120, 24, 10, 6).map(([a, b]) => [a, b + 36] as Pt))} color={BRASS.light} order={order + 0.9} op={0.8} />
      <Poly pts={T(ellipsePts(0, -4, 17, 17, 20))} color="#2a1c06" order={order + 1} />
      <Poly pts={T([[-6, -4], [6, -4], [10, -42], [-10, -42]])} color="#2a1c06" order={order + 1} />
      {withKey && (
        <>
          <Poly pts={T(ribbon([[0, -4, 13], [64, -4, 13]]).map(turnPt))} color={BRASS.ink} order={order + 1.5} />
          <Poly pts={T(ribbon([[0, -4, 8], [64, -4, 8]]).map(turnPt))} color={BRASS.light} order={order + 1.6} />
          <Poly pts={T(ellipsePts(86, -4, 25, 25, 24).map(turnPt))} color={BRASS.ink} order={order + 1.5} />
          <Poly pts={T(ellipsePts(86, -4, 19, 19, 24).map(turnPt))} color={BRASS.fill} order={order + 1.6} />
          <Poly pts={T(ellipsePts(86, -4, 9, 9, 18).map(turnPt))} color="#4a3a1a" order={order + 1.7} />
          <Poly pts={T([[20, -10], [28, -10], [28, -24], [20, -24]].map((p) => turnPt(p as Pt)))} color={BRASS.ink} order={order + 1.5} />
          <Poly pts={T([[36, -10], [44, -10], [44, -20], [36, -20]].map((p) => turnPt(p as Pt)))} color={BRASS.ink} order={order + 1.5} />
        </>
      )}
    </>
  );
}

// ── the counter bell: a silver dome on a round base with a button on top (130 px wide at s = 1, the base's middle at (x, y)); `press` 0..1 is the slap (the dome squashes, the button goes down), `ring` shows the ding marks
export function Bell({ x, y, s = 1, press = 0, ring = 0, order }: { x: number; y: number; s?: number; press?: number; ring?: number; order: number }) {
  const sq = 1 - 0.1 * press, T = (p: Pt[]) => xf(p, x, y, 0, s, s * sq);
  const dome: Pt[] = Array.from({ length: 25 }, (_, i) => { const a = Math.PI * (i / 24); return [Math.cos(a) * 58, Math.sin(a) * 50] as Pt; });
  return (
    <>
      <Inked pts={T(ellipsePts(0, 0, 66, 14, 28))} color="#a5adb5" ink="#2d3338" w={3 * s} order={order} />
      <Inked pts={T([...dome, [-58, 0]])} color="#d9dfe5" ink="#2d3338" w={3 * s} order={order + 0.2} />
      <Poly pts={T(ribbon([[-38, 18, 7], [-30, 34, 7], [-12, 44, 6]]))} color="#ffffff" order={order + 0.4} op={0.9} />
      <Inked pts={xf(roundRect(22, 12 - 6 * press, 5, 4), x, y + (56 - 6 * press) * s * sq, 0, s)} color="#c4402a" ink="#2d3338" w={2.4 * s} order={order + 0.5} />
      {ring > 0.02 && [-1, 1].map((d) => [0, 1, 2].map((i) => <Poly key={`${d}${i}`} pts={ribbon([[x + d * (80 + 22 * i) * s, y + (30 + 16 * i) * s, 5 * s * ring], [x + d * (98 + 22 * i) * s, y + (44 + 18 * i) * s, 5 * s * ring]])} color="#2d3338" order={order + 0.6} op={0.8 * ring} />))}
    </>
  );
}

// ── fire: three tongues (red, yellow, white), sparks and a column of smoke, on the panini press (the base's middle at (x, base), `k` scale, `grow` 0..1 how big it is)
function flamePts(h: number, w: number, f: number, seed: number): Pt[] {
  const n = 16, L: Pt[] = [], R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ww = w * Math.pow(1 - u, 0.75) * (1 + 0.16 * Math.sin(u * 9 + f * 1.3 + seed)) * (u < 0.12 ? 0.55 + 3.7 * u : 1), dx = 0.14 * w * Math.sin(u * 5 + f * 0.9 + seed * 2) * u;
    L.push([-ww / 2 + dx, u * h]); R.push([ww / 2 + dx, u * h]);
  }
  return [...L, ...R.reverse()];
}
export function Flame({ x, base, k = 1, grow = 1, f, order, seed = 1 }: { x: number; base: number; k?: number; grow?: number; f: number; order: number; seed?: number }) {
  if (grow <= 0.01) return null;
  const fl = twos(f), H = 420 * k * grow * (1 + 0.06 * Math.sin(fl * 2.3 + seed)), W = 150 * k * (0.5 + 0.5 * grow);
  return (
    <>
      <Glow x={x} y={base + 90 * k} rx={300 * k} ry={360 * k} op={0.8 * grow} order={order - 1} color="rgba(255,150,40,1)" />
      {[-0.36, 0.34, 0].map((dx, i) => <Inked key={i} pts={xf(flamePts(H * (0.72 + 0.28 * (i === 2 ? 1 : 0.8)), W * (i === 2 ? 1 : 0.62), fl + i * 2, seed + i), x + dx * W, base)} color={i === 2 ? "#ff5a14" : "#ff7a1a"} ink="#6d1d00" w={3 * k} order={order + i * 0.05} />)}
      <Poly pts={xf(flamePts(H * 0.7, W * 0.62, fl + 3, seed + 1), x, base)} color="#ffb21a" order={order + 0.6} />
      <Poly pts={xf(flamePts(H * 0.42, W * 0.34, fl + 6, seed + 2), x, base)} color="#fff3c4" order={order + 0.7} />
      {Array.from({ length: 10 }, (_, i) => { const a = (f / FPS * 1.3 + hash(i * 3.7 + seed)) % 1, vx = (hash(i * 1.9 + seed) - 0.5) * 220 * k; return <Poly key={i} pts={xf(ellipsePts(0, 0, 5 * k, 5 * k, 8), x + vx * a, base + 60 * k + 520 * k * a * (0.6 + 0.8 * hash(i * 5.3)))} color="#ffd34a" order={order + 0.8} op={(1 - a) * grow} />; })}
    </>
  );
}
/** smoke over the fire: grey puffs rising and spreading from (x, y); `age` s since it started */
export function Smoke({ x, y, age, k = 1, order }: { x: number; y: number; age: number; k?: number; order: number }) {
  if (age < 0) return null;
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (age * 0.8 + hash(i * 2.3)) % 1, r = (30 + 70 * a) * k * (0.7 + 0.5 * hash(i * 4.1));
        return <Poly key={i} pts={ellipsePts(x + (hash(i * 7.7) - 0.5) * 120 * k + Math.sin(a * 6 + i) * 24 * k, y + a * 360 * k, r, r * 0.85, 18)} color="#4a4a52" order={order} op={0.5 * (1 - a) * Math.min(1, age * 3)} />;
      })}
    </>
  );
}

// ── the sprinkler rain: slanted pale-blue streaks falling through the whole frame (fast, different lengths), a mist over everything, and fan-shaped sprays from the nozzles at the top; `age` s since the sprinklers burst on
export function Rain({ age, k = 1, order, heads = [] }: { age: number; k?: number; order: number; heads?: number[] }) {
  if (age < 0) return null;
  const on = Math.min(1, age / 0.12), t = age, N = 130;
  return (
    <>
      <Poly pts={[[-1200, 1200], [1200, 1200], [1200, -1200], [-1200, -1200]]} color="#7aa6d4" order={order - 2} op={0.2 * on} />
      {heads.map((hx, hi) => <Poly key={`h${hi}`} pts={[[hx, 920], [hx - 150 * on, 520], [hx + 150 * on, 520]]} color="#d9efff" order={order - 1} op={0.4 * on} />)}
      {heads.map((hx, hi) => <Inked key={`n${hi}`} pts={xf(roundRect(54, 28, 8, 5), hx, 940)} color="#8c9399" ink="#2f353b" w={2.4} order={order - 0.5} />)}
      {Array.from({ length: N }, (_, i) => {
        const sp = (1800 + 1500 * hash(i * 1.3 + 2)) * k, len = (70 + 120 * hash(i * 2.9 + 1)) * k, cyc = (2400 * k + len) / sp, ph = (t / cyc + hash(i * 5.7)) % 1;
        const x = -620 + 1240 * hash(i * 3.1) + 70 * ph * k, y = 1000 * k * 1.0 + 40 - ph * (2400 * k + len);
        return <Poly key={i} pts={ribbon([[x, y, 3.2 * k], [x - 18 * k, y - len, 1.6 * k]])} color={i % 5 === 0 ? "#ffffff" : "#d6edff"} order={order + (i % 3) * 0.01} op={(0.55 + 0.4 * hash(i * 8.3)) * on} />;
      })}
    </>
  );
}

// ── a phone's ring marks: short bent dashes round the phone, flickering on twos; (x, y) the phone's middle, `s` a scale
export function Buzz({ x, y, s = 1, f, order, op = 1 }: { x: number; y: number; s?: number; f: number; order: number; op?: number }) {
  const ph = (twos(f) / 2) % 2;
  return (
    <>
      {[-1, 1].map((d) => [0, 1, 2].map((i) => <Poly key={`${d}${i}`} pts={ribbon([[x + d * (70 + 24 * i + 7 * ph) * s, y + (30 - 28 * i) * s, 6 * s], [x + d * (88 + 24 * i + 7 * ph) * s, y + (44 - 28 * i) * s, 6 * s]])} color="#1b1b20" order={order} op={0.85 * op} />))}
    </>
  );
}

// ── the moth: a small dark body, two grey-brown wings that flap (the wing's width goes 1 -> 0.2 and back, on twos), two antennae; `age` s since it left the till; (x0, y0) where it starts
export function mothPos(age: number, x0: number, y0: number, k = 1): [number, number] {
  const a = Math.max(0, age);
  return [x0 + (Math.sin(a * 5.2) * 120 + 70 * a) * k * Math.min(1, a * 2), y0 + (260 * a - 30 * Math.sin(a * 9)) * k];
}
export function Moth({ x, y, s = 1, f, rot = 0, order }: { x: number; y: number; s?: number; f: number; rot?: number; order: number }) {
  const fl = twos(f) % 4 < 2 ? 1 : 0.22, T = (p: Pt[]) => xf(p, x, y, rot, s);
  return (
    <>
      {[-1, 1].map((d) => <Inked key={d} pts={T(xf(ellipsePts(0, 0, 40, 26, 18), d * 34 * fl, 6, d * 14 * (1 - fl), fl, 1))} color="#b49a78" ink="#4a3a22" w={2.6} order={order} />)}
      <Inked pts={T(ellipsePts(0, 0, 9, 24, 14))} color="#5a4630" ink="#2a2014" w={2.2} order={order + 0.2} />
      <Poly pts={T(ribbon([[-3, 20, 2], [-20, 46, 1.6]]))} color="#2a2014" order={order + 0.1} /><Poly pts={T(ribbon([[3, 20, 2], [20, 46, 1.6]]))} color="#2a2014" order={order + 0.1} />
    </>
  );
}

// ── the quarter: a silver coin (radius r at s = 1) with a rim, a ring and "25" in code; a shine that flashes across it
export function Quarter({ x, y, r = 24, rot = 0, shine = 0, order }: { x: number; y: number; r?: number; rot?: number; shine?: number; order: number }) {
  return (
    <>
      <Inked pts={ellipsePts(x, y, r, r, 28)} color="#cfd5db" ink="#3a4047" w={Math.max(2, r * 0.1)} order={order} />
      <Poly pts={ribbon(Array.from({ length: 29 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return [x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78, r * 0.07]; }))} color="#8a9299" order={order + 0.1} />
      <Poly pts={xf(roundRect(r * 0.62, r * 0.2, r * 0.05, 3), x, y, rot)} color="#8a9299" order={order + 0.2} />
      {shine > 0.02 && <Poly pts={xf(ribbon([[-r * 0.5, -r * 0.5, r * 0.18], [r * 0.5, r * 0.5, r * 0.18]]), x, y + (shine - 0.5) * 0, 0)} color="#ffffff" order={order + 0.3} op={0.85 * shine} />}
    </>
  );
}

// ── the wall clock's hands (the clock's face is blank in the plate): twelve ticks, an hour hand and a minute hand at `hour` and `minute`; r the face's radius, (x, y) its middle
export function ClockHands({ x, y, r, hour, minute, order }: { x: number; y: number; r: number; hour: number; minute: number; order: number }) {
  const ink = "#1b1b20", dir = (deg: number): [number, number] => [Math.sin(deg * D2R), Math.cos(deg * D2R)];
  const hand = (deg: number, len: number, w: number): Pt[] => { const [dx, dy] = dir(deg); return ribbon([[-dx * 0.14 * r, -dy * 0.14 * r, w * 0.7], [dx * 0.1 * r, dy * 0.1 * r, w], [dx * len * r, dy * len * r, w * 0.4]]); };
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => { const [dx, dy] = dir(i * 30), big = i % 3 === 0; return <Poly key={i} pts={xf(ribbon([[dx * (big ? 0.76 : 0.82) * r, dy * (big ? 0.76 : 0.82) * r, big ? 0.075 * r : 0.045 * r], [dx * 0.93 * r, dy * 0.93 * r, big ? 0.075 * r : 0.045 * r]]), x, y)} color={ink} order={order} />; })}
      <Poly pts={xf(hand(((hour % 12) + minute / 60) * 30, 0.5, 0.1 * r), x, y)} color={ink} order={order + 0.1} />
      <Poly pts={xf(hand(minute * 6, 0.76, 0.07 * r), x, y)} color={ink} order={order + 0.1} />
      <Poly pts={xf(ellipsePts(0, 0, 0.075 * r, 0.075 * r, 16), x, y)} color="#c8202b" order={order + 0.2} />
    </>
  );
}

// ── a music note (a filled head, a stem and a flag; 60 px tall at s = 1), turned `rot`
export function Note({ x, y, s = 1, rot = 0, color = "#ffffff", ink = "#1c1c22", order, op = 1 }: { x: number; y: number; s?: number; rot?: number; color?: string; ink?: string; order: number; op?: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s);
  return (
    <>
      <Poly pts={T(ribbon([[10, 4, 9], [10, 56, 9]]))} color={ink} order={order} op={op} />
      <Poly pts={T(ribbon([[10, 56, 9], [28, 46, 8], [30, 28, 7]]))} color={ink} order={order} op={op} />
      <Poly pts={T(xf(ellipsePts(0, 0, 17, 12, 18), 0, 0, 22))} color={ink} order={order} op={op} />
      <Poly pts={T(ribbon([[10, 6, 5], [10, 54, 5]]))} color={color} order={order + 0.1} op={op} />
      <Poly pts={T(ribbon([[10, 54, 4], [26, 45, 4], [28, 30, 3]]))} color={color} order={order + 0.1} op={op} />
      <Poly pts={T(xf(ellipsePts(0, 0, 13, 8.5, 18), 0, 0, 22))} color={color} order={order + 0.1} op={op} />
    </>
  );
}

/** a four-point glint: the shine on his dollar-sign eyes when they land (shot 3); r = the tip's distance from the middle, rot in degrees */
export function Glint({ x, y, r, rot = 0, color = "#f4fff4", ink = "#0a6a2a", order, op = 1 }: { x: number; y: number; r: number; rot?: number; color?: string; ink?: string; order: number; op?: number }) {
  const star = (R: number): Pt[] => Array.from({ length: 8 }, (_, k) => { const a = (rot + 45 * k) * D2R, q = k % 2 ? R * 0.34 : R; return [x + q * Math.cos(a), y + q * Math.sin(a)] as Pt; });
  return (
    <>
      <Poly pts={star(r * 1.24)} color={ink} order={order} op={op} />
      <Poly pts={star(r)} color={color} order={order + 0.1} op={op} />
    </>
  );
}

// ── dust where something heavy lands (shot 4): beige puffs thrown out along the floor, round and flat, thinning out
export function Dust({ at, age, k = 1, order }: { at: [number, number]; age: number; k?: number; order: number }) {
  if (age < 0 || age > 0.9) return null;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const side = i % 2 ? 1 : -1, a = age / 0.9, h = (v: number) => hash(i * v + 3.1), r = (34 + 60 * h(1.7)) * k * (0.5 + a);
        return <Inked key={i} pts={ellipsePts(at[0] + side * (40 + 360 * h(2.3)) * a * k, at[1] + (30 + 160 * h(4.7)) * a * k, r, r * 0.8, 16)} color="#e8dcc4" ink="#9a8a68" w={2.4 * k} order={order + i * 0.01} op={0.9 * (1 - smooth(0.45, 1, a))} />;
      })}
    </>
  );
}

// ── steam from the kettle's note (shot 26): white flat puffs curling out of the shop's door and window and drifting up; `age` s since the corks
export function ShopSteam({ at, age, k = 1, order }: { at: [number, number]; age: number; k?: number; order: number }) {
  if (age < 0) return null;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (age * 0.9 + hash(i * 2.9)) % 1, r = (22 + 50 * a) * k;
        return <Inked key={i} pts={ellipsePts(at[0] + Math.sin(a * 5 + i) * 40 * k + (i % 3 - 1) * 24 * k, at[1] + a * 380 * k, r, r * 0.9, 16)} color="#f6f9fd" ink="#8a96ab" w={2.4 * k} order={order} op={0.95 * (1 - a) * Math.min(1, age * 4)} />;
      })}
    </>
  );
}

// ── steam out of his ear holes: the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment (src/x10-sched.ts steamLevel). `at` is panel px (y up)
const BATCH = 0.1;
export function earSteam(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / BATCH); b <= Math.floor(t / BATCH); b++) {
    const tb = b * BATCH, lv = steamLevel(Math.round((tb + BATCH / 2) * FPS));
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + BATCH, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0] + 540, 960 - at[1], at[0] + 540 + dir * 8, 960 - at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map((s) => ({ x: s.x - 540, y: 960 - s.y, r: s.r * 1.55, a: s.a }));
}
export { lerp };
