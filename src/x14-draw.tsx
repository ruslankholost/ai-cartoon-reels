import React from "react";
import { Glow, Inked, Poly, ribbon, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Cup } from "./lips8-fx";
import { Cloud } from "./x08-fx";
import { hash, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { STAR_R } from "./x14-star";
import { FPS, popP, steamLevel } from "./x14-sched";

// The effects and props of x14 "Four Stars" that are drawn in code (src/x14-scenes.tsx places them): the confetti, the dizzy stars, the golden star in the ring box with its glow and sparkles, the two paper cups that jump on the slam,
// the speed streaks of the dive, the steam out of Ross's ear holes. The review card on the phone is src/x14-props.tsx's. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px
// (y up, origin in the middle) elsewhere, head px (from the neck pivot, y up) for what goes on a head. Every piece is a closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source.
// The shapes that move are drawn once, in unit size, and placed by a group's position, turn and scale, so that no frame makes a new geometry.
const W = 1080, H = 1920;

/** the star of the episode (src/x14-star.ts: @remotion/shapes' five-point star with rounded tips, tips 1 from the middle, y up) and the pale shine laid on it (the same star, half the size, up and to the left) */
export const STAR5 = STAR_R, STAR5_INNER = STAR_R.map(([x, y]) => [x * 0.5 - 0.1, y * 0.5 + 0.12] as Pt);
export const GLINT: Pt[] = [[0, 1], [0.2, 0.2], [1, 0], [0.2, -0.2], [0, -1], [-0.2, -0.2], [-1, 0], [-0.2, 0.2]];   // a four-point glint
const UNIT_RECT: Pt[] = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];

// ═════════════════════════════════════════════════════ the golden star in the ring box: a glow, the star (ink line, a pale shine), sparkles that twinkle round it; it pops up out of the box on `age` s (frame px)
export const GOLD = { fill: "#ffcf2e", ink: "#8a5a00", shine: "#fff1a6" };
export function GoldStar({ x, y, r, age, order, rock = 0 }: { x: number; y: number; r: number; age: number; order: number; rock?: number }) {
  if (age < 0) return null;
  const p = Math.max(0.0001, popP(age, 0, 0.42, 40)), R = r * p, X = PX(x), Y = PY(y - 6 * Math.min(1, age / 0.2));
  return (
    <>
      <Glow x={X} y={Y} rx={R * 3.4} ry={R * 3.4} op={0.7} order={order - 2} color="rgba(255,205,70,1)" />
      <Glow x={X} y={Y} rx={R * 1.9} ry={R * 1.9} op={0.95} order={order - 1} color="rgba(255,238,160,1)" />
      <Group x={X} y={Y} rot={rock} sx={R} sy={R}>
        <Inked pts={STAR5} color={GOLD.fill} ink={GOLD.ink} w={0.09} order={order} />
        <Poly pts={STAR5_INNER} color={GOLD.shine} order={order + 1} op={0.85} />
      </Group>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.5, d = R * (1.5 + 0.55 * hash(i * 3.7 + 1)), tw = Math.max(0, Math.sin(Math.PI * 2 * (age * 2.2 + hash(i * 5.3)))) ** 2, s = R * (0.2 + 0.28 * hash(i * 2.1)) * tw;
        if (s < 1) return null;
        return (
          <Group key={i} x={X + Math.cos(a) * d} y={Y + Math.sin(a) * d * 0.9} rot={20 * i} sx={s} sy={s}>
            <Poly pts={GLINT} color="#ffffff" order={order + 2} />
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the confetti (frame px): a burst out of the popper at `origin` on `t0`, then the steady fall of the rest of the reel. Each piece is a thin rectangle that flutters (its width goes to a quarter and
// back as it turns), thrown up and out with a drag, then falling at its own speed; a piece that leaves the bottom comes in again at the top, in a new lane
const CONFETTI = ["#ff3b5c", "#ffcf1a", "#2fb5ff", "#46d36a", "#ff8a1f", "#b45cff", "#ff6fb5"];
export function Confetti({ t, t0, origin, order, n = 130, split, avoid }: { t: number; t0: number; origin: [number, number]; order: number; n?: number; split?: number; avoid?: [number, number, number, number] }) {   // `split`: the order of the two thirds of the pieces that go behind the people, and of any piece over `avoid` (a box of frame px): shot 19, where the phone stays clear
  const a0 = t - t0;
  if (a0 < 0) return null;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const h = (q: number) => hash(i * q + 5.3), a = a0 - 0.05 * h(1.7);
    if (a < 0) continue;
    const ang = (-168 + 156 * h(2.9)) * (Math.PI / 180), v0 = 650 + 1300 * h(3.3), kd = 3.2 + 2 * h(4.1), vt = 360 + 420 * h(5.9), sway = 28 + 50 * h(6.3), ph = 6.28 * h(7.1);
    const burst = (1 - Math.exp(-kd * a)) / kd;
    let x = origin[0] + Math.cos(ang) * v0 * burst + sway * Math.sin(a * (2 + 2 * h(8.3)) + ph), y = origin[1] + Math.sin(ang) * v0 * burst + vt * a;
    if (y > H + 60) { const k = Math.floor((y + 60) / (H + 120)); y = ((y + 60) % (H + 120)) - 60; x = 540 + (hash(i * 9.7 + k * 3.1) - 0.5) * 1280 + sway * Math.sin(a * 2.5 + ph); }
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
    const behind = split !== undefined && (i % 3 !== 0 || (avoid !== undefined && x > avoid[0] && x < avoid[2] && y > avoid[1] && y < avoid[3]));
    const long = i % 9 === 0, w = long ? 9 : 16 + 16 * h(6.7), hgt = long ? 70 + 40 * h(8.9) : w * (0.5 + 0.3 * h(8.1)), om = (2 + 7 * h(9.1)) * (h(9.5) > 0.5 ? 1 : -1);
    const fl = 0.22 + 0.78 * Math.abs(Math.cos(om * 1.3 * a + ph));
    out.push(
      <Group key={i} x={PX(x)} y={PY(y)} rot={((om * a * 180) / Math.PI + 360 * h(9.2)) % 360} sx={w * fl} sy={hgt}>
        <Poly pts={UNIT_RECT} color={CONFETTI[i % CONFETTI.length]} order={(behind ? (split as number) : order) + (i % 5) * 0.01} />
      </Group>,
    );
  }
  return <>{out}</>;
}

// ═════════════════════════════════════════════════════ the dizzy stars round a head (head px: `cx`, `cy` the middle of the ring, `rx` and `ry` its radii, `size` the star's radius); five small gold stars on a flat ellipse, the ones at the back smaller
// and drawn first. They turn on `t` s
export function DizzyStars({ t, cx, cy, rx, ry, size, order, n = 5 }: { t: number; cx: number; cy: number; rx: number; ry: number; size: number; order: number; n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = t * 5.6 + (i * Math.PI * 2) / n, front = Math.sin(a) > 0, s = size * (front ? 1.12 : 0.8);
        return (
          <Group key={i} x={cx + Math.cos(a) * rx} y={cy + Math.sin(a) * ry} rot={(t * 220 + i * 40) % 360} sx={s} sy={s}>
            <Inked pts={STAR5} color={GOLD.fill} ink={GOLD.ink} w={0.13} order={order + (front ? 1 : 0)} />
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the two paper cups on the counter that jump when the phone lands: `at` the middle of the cup's base on the counter's top (frame px), `w` its width, `age` s since the slam. Up on a spring, a squash when it lands
export function JumpCup({ at, w, age, order, up = 70 }: { at: [number, number]; w: number; age: number; order: number; up?: number }) {
  const k = w / 104, a = Math.max(0, age), hop = age < 0 ? 0 : up * Math.abs(Math.sin(a * 11)) * Math.exp(-a / 0.3), land = age < 0 ? 0 : Math.max(0, Math.exp(-a / 0.12) * Math.cos(a * 40)) * (hop < 6 ? 1 : 0);
  return <Cup x={PX(at[0])} y={PY(at[1] - 75 * k - hop)} s={k * (1 - 0.06 * land)} order={order} />;
}

// ═════════════════════════════════════════════════════ pale streaks behind something that flies to the right (frame px): `x` its middle, `y` the row, `reach` how far the streaks run back from it; a few long thin tapering strokes on different rows
export function Streaks({ x, y, reach, spread, order, op = 0.85, seed = 1 }: { x: number; y: number; reach: number; spread: number; order: number; op?: number; seed?: number }) {
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const h = (q: number) => hash(i * q + seed * 3.1), len = reach * (0.45 + 0.55 * h(1.3)), yy = y + (h(2.7) - 0.5) * spread, x1 = x - reach * 0.12 * h(3.9);
        return <Poly key={i} pts={ribbon([[PX(x1 - len), PY(yy), 1], [PX(x1 - len * 0.4), PY(yy), 9 + 6 * h(4.1)], [PX(x1), PY(yy), 3]])} color="#ffffff" order={order} op={op * (0.5 + 0.5 * h(5.3))} />;
      })}
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
export function EarPlumes({ left, right, t, k, order }: { left: [number, number]; right: [number, number]; t: number; k: number; order: number }) {
  const sp = [...plumeSprites(left, -1, t, k, 1), ...plumeSprites(right, 1, t, k, 2)];
  return sp.length ? <Cloud sprites={sp} order={order} /> : null;
}
export { smooth };
