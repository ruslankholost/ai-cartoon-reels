import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Goo, hash, lerp, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { D2R } from "./pen-stage";
import { FPS, steamLevel, twos } from "./x09-sched";

// The effects and props of x09 "Habits of the Rich" that are drawn in code (src/x09-scenes.tsx places them): the ice cubes and the splash of the tub, the pyro columns, the alarm clock's marks and its debris, the tape, the yellow glasses,
// the banknotes and pens in the crowd's hands, the speed lines, the steam out of his ear holes. Flat shapes with the show's thin ink line. Positions are panel px (y up, origin in the middle) unless a name says frame px. Every particle is a
// closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source, so a frame always comes out the same.

// ── ice: pale blue cubes with a lighter bevel and a white highlight; 88 px a side at s = 1, middle at (x, y), turned `rot` degrees
export const ICE = { fill: "#b3e1fa", light: "#eefaff", deep: "#7cc0ec", ink: "#2b5f86" };
export function IceCube({ x, y, s = 1, rot = 0, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; order: number; op?: number }) {
  if (op <= 0.01 || s <= 0.01) return null;
  const R = 44 * s, T = (p: Pt[]) => xf(p, x, y, rot);
  return (
    <>
      <Inked pts={T(roundRect(2 * R, 2 * R, 0.3 * R))} color={ICE.fill} ink={ICE.ink} w={Math.max(1.6, 2.6 * s)} order={order} op={op} />
      <Poly pts={T(xf(roundRect(1.18 * R, 1.18 * R, 0.2 * R), -0.2 * R, 0.2 * R))} color={ICE.light} order={order + 0.6} op={0.9 * op} />
      <Poly pts={T(ribbon([[0.62 * R, -0.82 * R, 0.16 * R], [0.82 * R, -0.62 * R, 0.16 * R], [0.82 * R, 0.5 * R, 0.16 * R]]))} color={ICE.deep} order={order + 0.7} op={0.95 * op} />
      <Poly pts={T(ribbon([[-0.72 * R, 0.4 * R, 0.1 * R], [-0.72 * R, 0.66 * R, 0.1 * R], [-0.46 * R, 0.78 * R, 0.1 * R]]))} color="#ffffff" order={order + 0.8} op={op} />
      <Poly pts={T(ribbon([[0.05 * R, -0.5 * R, 0.035 * R], [0.28 * R, -0.12 * R, 0.035 * R], [0.1 * R, 0.2 * R, 0.035 * R]]))} color={ICE.ink} order={order + 0.9} op={0.4 * op} />
    </>
  );
}
/** the cubes the cannonball throws out of the tub (shot 1, shot 28): from `at` (the tub's middle, panel px) at the age `age` s since the splash, up and out and AT the lens: they grow as they come, spin, and are thrown down by gravity */
export function IceShower({ at, age, k = 1, order, seed = 1, n = 16 }: { at: [number, number]; age: number; k?: number; order: number; seed?: number; n?: number }) {
  if (age < 0 || age > 1.4) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const h = (a: number) => hash(i * a + seed * 3.3), life = 0.85 + 0.5 * h(4.1);
        if (age > life) return null;
        const vx = (h(1.7) - 0.5) * 1700 * k, vy = (560 + 900 * h(2.9)) * k, g = 2500 * k, u = age / life;
        const x = at[0] + vx * age, y = at[1] + vy * age - 0.5 * g * age * age;
        const s = k * (0.5 + 2.6 * Math.pow(u, 1.25) * (0.45 + h(5.3)));
        return <IceCube key={i} x={x} y={y} s={s} rot={(h(6.1) - 0.5) * 760 * age} order={order + i * 0.01} op={Math.min(1, age / 0.03) * (1 - smooth(0.8, 1, u))} />;
      })}
    </>
  );
}
/** shot 2: one cube flies off the stage into Ross's forehead (the hit is `age` = 0) and bounces off: before the hit it comes in fast from the upper right over `lead` s, after it it is thrown back up and out and falls. `to` is the hit point (panel px) */
export function IceHit({ to, age, k = 1, order, lead = 0.1 }: { to: [number, number]; age: number; k?: number; order: number; lead?: number }) {
  if (age < -lead || age > 0.9) return null;
  if (age < 0) { const u = (age + lead) / lead; return <IceCube x={lerp(to[0] + 620 * k, to[0], u)} y={lerp(to[1] + 360 * k, to[1], u)} s={k * lerp(1.7, 1.05, u)} rot={-300 * (1 - u)} order={order} />; }
  const x = to[0] + 330 * k * age, y = to[1] + (620 * age - 0.5 * 2600 * age * age) * k;
  return <IceCube x={x} y={y} s={k * 1.05} rot={700 * age} order={order} op={1 - smooth(0.6, 0.9, age)} />;
}

// ── water: the splash of a body into the tub. A column of water that rises and falls and a crown of drops thrown up and out on parabolas, through Goo (flat shapes with a thin ink line, as src/lips8-fx.tsx PuddleSplash); a ripple ring on the ice
export const WATER = { fill: "#b7e3fb", ink: "#2c6590" };
export function WaterSplash({ at, age, k = 1, order, seed = 1 }: { at: [number, number]; age: number; k?: number; order: number; seed?: number }) {
  if (age < 0 || age > 1.2) return null;
  const sp: Sprite[] = [];
  const rise = Math.sin(Math.min(1, age / 0.5) * Math.PI * 0.5) * (1 - smooth(0.4, 1.0, age)); // the column's height, 0..1
  for (let j = 0; j < 9; j++) { const u = j / 8; sp.push({ x: at[0] + Math.sin(u * 5 + age * 9 + seed) * 14 * k * u, y: at[1] + u * 560 * k * rise, r: (118 - 70 * u) * k * (0.35 + 0.65 * rise), a: 1 }); }
  for (let i = 0; i < 34; i++) { // the crown: drops thrown out from the rim of the tub
    const side = i % 2 ? 1 : -1, ang = (0.12 + 0.62 * hash(i * 4.3 + seed)) * Math.PI, v = (520 + 900 * hash(i * 1.7 + seed)) * k;
    const x = at[0] + side * Math.cos(ang) * v * age * (0.6 + 0.5 * hash(i * 2.1)), y = at[1] + 60 * k + Math.sin(ang) * v * age - 2300 * k * age * age;
    if (y < at[1] - 30 * k) continue;
    sp.push({ x, y, r: (9 + 17 * hash(i * 6.6 + seed)) * k * (1 - 0.8 * age / 1.2), a: 1 });
  }
  const ring = age / 0.7;
  return (
    <>
      <Goo sprites={sp} order={order} fill={WATER.fill} ink={WATER.ink} ow={2.5} th={0.4} res={0.5} />
      {ring < 1 && <Poly pts={ribbon(Array.from({ length: 41 }, (_, i) => { const q = (i / 40) * Math.PI * 2; return [at[0] + Math.cos(q) * (150 + 330 * ring) * k, at[1] - 20 * k + Math.sin(q) * (28 + 66 * ring) * k, 7 * k * (1 - ring)]; }))} color="#ffffff" order={order - 0.1} op={0.85 * (1 - ring)} />}
    </>
  );
}

// ── pyro: a column of fire shot up from the stage (the two columns at the sides of the stage fire together). `age` s since it fired, `f` the frame (the flicker), `base` the foot of the column, `k` scale. Three tongues (red, yellow, white), sparks
function flamePts(h: number, w: number, f: number, seed: number): Pt[] {
  const n = 16, L: Pt[] = [], R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ww = w * Math.pow(1 - u, 0.75) * (1 + 0.16 * Math.sin(u * 9 + f * 1.3 + seed)) * (u < 0.12 ? 0.55 + 3.7 * u : 1), dx = 0.14 * w * Math.sin(u * 5 + f * 0.9 + seed * 2) * u;
    L.push([-ww / 2 + dx, u * h]); R.push([ww / 2 + dx, u * h]);
  }
  return [...L, ...R.reverse()];
}
export function Pyro({ x, base, age, f, k = 1, order, seed = 1 }: { x: number; base: number; age: number; f: number; k?: number; order: number; seed?: number }) {
  if (age < 0 || age > 1.3) return null;
  const grow = smooth(0, 0.07, age), die = 1 - smooth(0.45, 1.05, age), H = 1150 * k * grow * (0.35 + 0.65 * die) * (1 + 0.05 * Math.sin(twos(f) * 2.3)), W = 190 * k * (0.5 + 0.5 * die), fl = twos(f);
  return (
    <>
      <Glow x={x} y={base + 120 * k} rx={420 * k} ry={520 * k} op={0.9 * die} order={order - 1} color="rgba(255,150,40,1)" />
      <Inked pts={xf(flamePts(H, W, fl, seed), x, base)} color="#ff5a14" ink="#6d1d00" w={3.2 * k} order={order} />
      <Poly pts={xf(flamePts(H * 0.82, W * 0.66, fl + 3, seed + 1), x, base)} color="#ffb21a" order={order + 0.6} />
      <Poly pts={xf(flamePts(H * 0.55, W * 0.36, fl + 6, seed + 2), x, base)} color="#fff3c4" order={order + 0.7} />
      {Array.from({ length: 18 }, (_, i) => {
        const a = age - 0.04 * hash(i * 3.1);
        if (a < 0 || a > 0.9) return null;
        const vx = (hash(i * 1.3 + seed) - 0.5) * 900 * k, vy = (700 + 800 * hash(i * 2.7 + seed)) * k;
        return <Poly key={i} pts={xf(ellipsePts(0, 0, 7 * k, 7 * k, 8), x + vx * a, base + 40 * k + vy * a - 0.5 * 1800 * k * a * a)} color="#ffd34a" order={order + 0.8} op={1 - smooth(0.4, 0.9, a)} />;
      })}
    </>
  );
}

// ── the alarm clock: marks and hands for its blank face (4:00), the ring marks beside its bells while it rings, and the debris of the smash
export function ClockFace({ x, y, r, rot = 0, order }: { x: number; y: number; r: number; rot?: number; order: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot), ink = "#1b1b20";
  const dir = (hours: number): [number, number] => [Math.sin((hours / 12) * Math.PI * 2), Math.cos((hours / 12) * Math.PI * 2)];
  const hand = (hrs: number, len: number, w: number): Pt[] => { const [dx, dy] = dir(hrs); return ribbon([[-dx * 0.14 * r, -dy * 0.14 * r, w * 0.7], [dx * 0.1 * r, dy * 0.1 * r, w], [dx * len * r, dy * len * r, w * 0.4]]); };
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => { const [dx, dy] = dir(i), big = i % 3 === 0; return <Poly key={i} pts={T(ribbon([[dx * (big ? 0.76 : 0.82) * r, dy * (big ? 0.76 : 0.82) * r, big ? 0.075 * r : 0.045 * r], [dx * 0.93 * r, dy * 0.93 * r, big ? 0.075 * r : 0.045 * r]]))} color={ink} order={order} />; })}
      <Poly pts={T(hand(4, 0.5, 0.1 * r))} color={ink} order={order + 0.1} />
      <Poly pts={T(hand(0, 0.74, 0.07 * r))} color={ink} order={order + 0.1} />
      <Poly pts={T(ellipsePts(0, 0, 0.075 * r, 0.075 * r, 16))} color="#c8202b" order={order + 0.2} />
    </>
  );
}
/** the ring marks: short bent dashes on both sides of the two bells, flickering on twos; `x, y` the middle of the bells, `s` a scale (the clock's width / 100) */
export function RingMarks({ x, y, s = 1, f, order }: { x: number; y: number; s?: number; f: number; order: number }) {
  const ph = (twos(f) / 2) % 2;
  return (
    <>
      {[-1, 1].map((d) => [0, 1, 2].map((i) => <Poly key={`${d}${i}`} pts={ribbon([[x + d * (74 + 20 * i + 6 * ph) * s, y + (26 - 26 * i + 0) * s, 6 * s], [x + d * (90 + 20 * i + 6 * ph) * s, y + (40 - 26 * i) * s, 6 * s]])} color="#1b1b20" order={order} op={0.85} />))}
    </>
  );
}
/** the smashed clock's pieces thrown out of `at`: two springs, two bell halves, gears and the hammer, on parabolas with spin, gone after 1.3 s */
export function ClockDebris({ at, age, k = 1, order }: { at: [number, number]; age: number; k?: number; order: number }) {
  if (age < 0 || age > 1.4) return null;
  const parts = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <>
      {parts.map((i) => {
        const h = (a: number) => hash(i * a + 41.3), vx = (h(1.3) - 0.5) * 1500 * k, vy = (500 + 800 * h(2.1)) * k, x = at[0] + vx * age, y = at[1] + vy * age - 0.5 * 2700 * k * age * age, rot = (h(3.7) - 0.5) * 1500 * age, op = 1 - smooth(0.7, 1.4, age);
        if (y < at[1] - 400 * k) return null;
        if (i < 2) { // a spring: a zigzag coil
          const coil = ribbon(Array.from({ length: 13 }, (_, j) => [(j % 2 ? 1 : -1) * 20 * k, -50 * k + j * 8.4 * k, 4.2 * k]));
          return <Poly key={i} pts={xf(coil, x, y, rot)} color="#8f969f" order={order + i * 0.01} op={op} />;
        }
        if (i < 4) return <Inked key={i} pts={xf(ellipsePts(0, 0, 44 * k, 30 * k, 18).filter(([, b]) => b >= -4 * k), x, y, rot)} color="#c9ced6" ink="#4b5059" w={2.6 * k} order={order + i * 0.01} op={op} />;
        if (i < 7) return <Inked key={i} pts={xf(ellipsePts(0, 0, 17 * k, 17 * k, 10), x, y, rot)} color="#a7adb7" ink="#4b5059" w={2.2 * k} order={order + i * 0.01} op={op} />;
        return <Inked key={i} pts={xf(roundRect(60 * k, 12 * k, 5 * k), x, y, rot)} color="#8f969f" ink="#4b5059" w={2 * k} order={order + i * 0.01} op={op} />;
      })}
    </>
  );
}

// ── the tape: a strip of grey duct tape, `w` x `h` px, middle (x, y), turned `rot`; `pop` > 1 is the slap's squash (it lands big and settles in 0.1 s), `bulge` 0..1 pushes it out with the muffled voice. Torn zigzag ends, a pale stripe, wrinkles
export function Tape({ x, y, w = 270, h = 74, rot = 0, pop = 1, bulge = 0, order, op = 1 }: { x: number; y: number; w?: number; h?: number; rot?: number; pop?: number; bulge?: number; order: number; op?: number }) {
  const sx = pop, sy = pop * (1 + 0.14 * bulge);
  const zig = (xx: number, dir: number) => Array.from({ length: 7 }, (_, i) => [xx + (i % 2 ? 0 : dir * 7), -h / 2 + (h * i) / 6] as Pt); // a torn end: 7 points up the end, every other one pulled in 7 px
  const T = (p: Pt[]) => xf(p, x, y, rot, sx, sy);
  return (
    <>
      <Inked pts={T([...zig(-w / 2, 1), ...zig(w / 2, -1).reverse()])} color="#c3c8d0" ink="#4f5560" w={2.6} order={order} op={op} />
      <Poly pts={T(ribbon([[-w / 2 + 14, h * 0.26, h * 0.2], [w / 2 - 14, h * 0.26, h * 0.2]]))} color="#f3f5f8" order={order + 0.6} op={0.8 * op} />
      {[-0.28, 0.05, 0.31].map((u, i) => <Poly key={i} pts={T(ribbon([[u * w, -h * 0.34, 2.2], [u * w + 6, 0, 2.6], [u * w - 4, h * 0.34, 2.2]]))} color="#4f5560" order={order + 0.7} op={0.45 * op} />)}
    </>
  );
}
/** the tape ripped off (shot 7): from the slapped place it peels up from the left end, turns away on its right end and flies up, `a` 0..1 */
export function TapeRip({ x, y, w = 270, h = 74, rot = 0, a, order }: { x: number; y: number; w?: number; h?: number; rot?: number; a: number; order: number }) {
  if (a <= 0 || a >= 1) return null;
  const px = x + w / 2, ang = -95 * Math.pow(a, 0.8), lift = 120 * a, dxx = 220 * a * a, ca = Math.cos(ang * D2R), sa = Math.sin(ang * D2R);
  const cx = px + (x - px) * ca + dxx, cy = y + (x - px) * sa + lift;
  return <Tape x={cx} y={cy} w={w} h={h} rot={rot + ang} order={order} op={1 - smooth(0.55, 1, a)} />;
}

// ── a tall glass of something yellow: 76 x 150 px at s = 1, middle (x, y); `level` 0..1 of the liquid; a pale foam top; turned `rot` (tipped over for the chug)
export const PEE = { fill: "#ffd92e", ink: "#9a7a00", foam: "#fff2a0" };
export function YellowGlass({ x, y, s = 1, rot = 0, level = 0.8, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; level?: number; order: number; op?: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s), top = 75, bot = -75, wt = 38, wb = 29, ly = bot + (top - bot - 8) * level;
  const w = (yy: number) => lerp(wb, wt, (yy - bot) / (top - bot));
  return (
    <>
      <Inked pts={T([[-wb, bot], [wb, bot], [wt, top], [-wt, top]])} color="#e8f6ff" ink="#56707f" w={2.6} order={order} op={0.45 * op} />
      {level > 0.02 && <Poly pts={T([[-w(bot + 5) + 3, bot + 5], [w(bot + 5) - 3, bot + 5], [w(ly) - 3, ly], [-w(ly) + 3, ly]])} color={PEE.fill} order={order + 0.6} op={op} />}
      {level > 0.02 && <Poly pts={T(ellipsePts(0, ly, w(ly) - 3, 7, 18))} color={PEE.foam} order={order + 0.65} op={op} />}
      <Poly pts={T(ribbon([[-wt + 9, top - 14, 5], [-wb + 9, bot + 12, 5]]))} color="#ffffff" order={order + 0.7} op={0.75 * op} />
      <Poly pts={T(ribbon([[-wb, bot, 3], [wb, bot, 3], [wt, top, 3], [-wt, top, 3], [-wb, bot, 3]]))} color="#56707f" order={order + 0.8} op={0.8 * op} />
    </>
  );
}

// ── cash and pens (the hands of the crowd): a banknote 124 x 58 px at s = 1, green, a border, an oval portrait, a "$"; a fan of `n` of them from the held end; a ballpoint pen 150 px long
export function Banknote({ x, y, s = 1, rot = 0, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; order: number; op?: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s);
  return (
    <>
      <Inked pts={T(roundRect(124, 58, 5))} color="#8bd481" ink="#2d6a2a" w={2.4} order={order} op={op} />
      <Poly pts={T(ribbon([[-54, -22, 2.2], [54, -22, 2.2], [54, 22, 2.2], [-54, 22, 2.2], [-54, -22, 2.2]]))} color="#2d6a2a" order={order + 0.6} op={0.55 * op} />
      <Poly pts={T(ellipsePts(0, 0, 17, 21, 20))} color="#c9efc2" order={order + 0.65} op={op} />
      <Poly pts={T(ribbon([[6, 12, 5], [-4, 11, 5], [-8, 4, 5], [-2, -1, 5], [4, -6, 5], [0, -13, 5], [-9, -12, 5]]))} color="#2d6a2a" order={order + 0.7} op={0.9 * op} />
      <Poly pts={T(ribbon([[-1, 17, 3], [-1, -17, 3]]))} color="#2d6a2a" order={order + 0.7} op={0.9 * op} />
    </>
  );
}
/** `n` banknotes fanned from the point they are held at (x, y), the fan opening upward, turned `rot` */
export function CashFan({ x, y, s = 1, rot = 0, n = 3, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; n?: number; order: number; op?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => { const a = (i - (n - 1) / 2) * 22 + rot, r = (a + 90) * D2R; return <Banknote key={i} x={x + Math.cos(r) * 62 * s} y={y + Math.sin(r) * 62 * s} s={s} rot={a + 90} order={order + i * 0.3} op={op} />; })}
    </>
  );
}
export function Pen({ x, y, s = 1, rot = 0, color = "#2a62d9", order, op = 1 }: { x: number; y: number; s?: number; rot?: number; color?: string; order: number; op?: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s);
  return (
    <>
      <Inked pts={T(roundRect(16, 118, 7))} color={color} ink="#14224a" w={2.4} order={order} op={op} />
      <Inked pts={T([[-8, -59], [8, -59], [2, -86], [-2, -86]])} color="#e7e9ee" ink="#14224a" w={2} order={order + 0.1} op={op} />
      <Inked pts={T(xf(roundRect(9, 24, 4), 0, 70))} color="#d9dde6" ink="#14224a" w={2} order={order + 0.2} op={op} />
      <Poly pts={T(ribbon([[11, 52, 4], [11, -30, 4]]))} color="#c9ced8" order={order + 0.8} op={op} />
      <Poly pts={T(ribbon([[-3, 50, 3], [-3, -44, 3]]))} color="#ffffff" order={order + 0.9} op={0.6 * op} />
    </>
  );
}

// ── speed lines: pale streaks radiating from (cx, cy) between the radii r0 and r1, redrawn on every second frame (the scribbling blur of shot 19)
export function SpeedLines({ cx, cy, f, r0, r1, n = 26, w = 22, order, op = 0.9, color = "#ffffff" }: { cx: number; cy: number; f: number; r0: number; r1: number; n?: number; w?: number; order: number; op?: number; color?: string }) {
  const fl = twos(f);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (hash(i * 3.1 + fl) - 0.5) * 0.18, a0 = r0 + (r1 - r0) * 0.25 * hash(i * 1.9 + fl), a1 = r1 - (r1 - r0) * 0.3 * hash(i * 5.7 + fl), ww = w * (0.5 + hash(i * 7.7 + fl));
        const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
        return <Poly key={i} pts={[[cx + c * a0 + nx * ww * 0.05, cy + s * a0 + ny * ww * 0.05], [cx + c * a1 + nx * ww, cy + s * a1 + ny * ww], [cx + c * a1 - nx * ww, cy + s * a1 - ny * ww], [cx + c * a0 - nx * ww * 0.05, cy + s * a0 - ny * ww * 0.05]]} color={color} order={order} op={op * (0.55 + 0.45 * hash(i * 2.3 + fl))} />;
      })}
    </>
  );
}

// ── steam out of the ear holes: the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment (src/x09-sched.ts steamLevel). `at` is panel px (y up)
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

// ── a glass tipped to drink (shot 8): the rim's middle at (x, y), the glass turned `rot` degrees counter-clockwise (0: upright, rim up; ~140: base up and to the right, rim at the mouth), `s` scale. The liquid stays level with the world:
// it is the glass's outline cut at a horizontal line that sinks as `fill` (0..1 of the glass's height in its present turn) falls, with a foam stripe on the line
function clipBelow(poly: Pt[], yl: number): Pt[] {
  const out: Pt[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], pin = p[1] <= yl, qin = q[1] <= yl;
    if (pin) out.push(p);
    if (pin !== qin) { const u = (yl - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * u, yl]); }
  });
  return out;
}
export function TippedGlass({ x, y, s = 1, rot = 0, fill = 0.8, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; fill?: number; order: number; op?: number }) {
  const R = rot * D2R, c = Math.cos(R), sn = Math.sin(R), T = (p: Pt): Pt => [x + (p[0] * c - p[1] * sn) * s, y + (p[0] * sn + p[1] * c) * s];
  const body: Pt[] = ([[-38, 0], [38, 0], [29, -150], [-29, -150]] as Pt[]).map(T);
  const ys = body.map((p) => p[1]), ymin = Math.min(...ys), ymax = Math.max(...ys), yl = ymin + (ymax - ymin) * fill;
  const liq = fill > 0.01 ? clipBelow(body, yl) : [];
  const xs = liq.map((p) => p[0]);
  return (
    <>
      <Inked pts={body} color="#e8f6ff" ink="#56707f" w={2.6 * s} order={order} op={0.45 * op} />
      {liq.length > 2 && <Poly pts={liq} color={PEE.fill} order={order + 0.6} op={op} />}
      {liq.length > 2 && <Poly pts={ribbon([[Math.min(...xs) + 3 * s, yl, 4 * s], [Math.max(...xs) - 3 * s, yl, 4 * s]])} color={PEE.foam} order={order + 0.65} op={op} />}
      <Poly pts={ribbon([[body[0][0] * 0.7 + body[3][0] * 0.3, body[0][1] * 0.7 + body[3][1] * 0.3, 3 * s], [body[0][0] * 0.25 + body[3][0] * 0.75, body[0][1] * 0.25 + body[3][1] * 0.75, 3 * s]])} color="#ffffff" order={order + 0.7} op={0.7 * op} />
      <Poly pts={ribbon([body[0], body[3], body[2], body[1], body[0]].map((p) => [p[0], p[1], 1.6 * s]))} color="#56707f" order={order + 0.8} op={0.8 * op} />
    </>
  );
}
