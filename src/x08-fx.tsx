import { Inked, Picture, Poly, ellipsePts, ribbon, xf, type Pt } from "./sp-puppet";
import { Goo, hash, lerp, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { FPS, steamLevel } from "./x08-sched";
import { RJ } from "./x08-shared";

// The effects of x08 drawn in code (src/x08-scenes.tsx places them): the steam that whistles out of his ear holes (white clouds with a thin ink line, through the Goo pass of src/sp-fx.tsx), the plugs that shoot out like corks, the column
// of steam under the rocket, the plaster that rains down, the Ross-shaped hole with its sky and its shaft of sunlight, the smoke from his hair. Positions are panel px (y up, origin in the middle) unless a name says frame px.
// Every particle is a closed-form function of the time (hashed birth times and velocities): nothing reads a clock or a random source.

/** a Goo cloud of the sprites (flat fill, thin ink line); white steam by default */
export function Cloud({ sprites, order, fill = "#f6f9fd", ink = "#7d8aa3", opacity = 1, th = 0.4, ow = 3 }: { sprites: Sprite[]; order: number; fill?: string; ink?: string; opacity?: number; th?: number; ow?: number }) {
  return <Goo sprites={sprites} order={order} fill={fill} ink={ink} opacity={opacity} th={th} ow={ow} res={0.5} blur={2} maxN={600} />;
}

// ── steam out of an ear hole: the cloud kit of src/sp-fx.tsx (particles born at the hole, thrown outward and up, lumpy clouds that grow and thin out), one batch of particles for every tenth of a second, its thickness the steam level of
// that moment (src/x08-sched.ts steamLevel), so the jets thicken through the shots. `at` is frame px (y down); the clouds are drawn through Goo as flat white shapes with a thin ink line
const BATCH = 0.1;
export function steamSprites8(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number, scale = 1): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / BATCH); b <= Math.floor(t / BATCH); b++) {
    const tb = b * BATCH, lv = steamLevel(Math.round((tb + BATCH / 2) * FPS));
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 * scale + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + BATCH, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0], at[1], at[0] + dir * 8, at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map((s) => ({ x: s.x - 540, y: 960 - s.y, r: s.r * 1.55, a: s.a }));
}
/** the two jets of the kettle: from both ear holes (frame px, y down) */
export function EarSteam({ f, left, right, k, order }: { f: number; left: [number, number]; right: [number, number]; k: number; order: number }) {
  const t = f / FPS;
  const sp = [...steamSprites8(left, -1, t, k, 1), ...steamSprites8(right, 1, t, k, 2)];
  if (!sp.length) return null;
  return <Cloud sprites={sp} order={order} />;
}

// ── the plugs shooting out of his earlobes like champagne corks: from the hole (panel px) with a throw up and out, spinning, growing toward the camera, gone off the frame; a starburst on the pop
export function Cork({ at, dir, t, t0, r, order, up = 1 }: { at: [number, number]; dir: -1 | 1; t: number; t0: number; r: number; order: number; up?: number }) {
  const a = t - t0;
  if (a < 0 || a > 0.7) return null;
  const x = at[0] + dir * 1000 * a, y = at[1] + 1500 * up * a - 3000 * a * a;
  const s = 1 + 1.1 * a, rot = dir * 900 * a;
  const disc = xf(ellipsePts(0, 0, r, r, 28), x, y, rot, s);
  const tail: [number, number] = [x - dir * 90 * Math.min(1, a / 0.1), y - 140 * up * Math.min(1, a / 0.1)];
  return (
    <>
      <Poly pts={ribbon([[tail[0], tail[1], 0.25 * r], [x, y, r * 1.5 * s]])} color="#0c1013" order={order - 0.1} op={0.3 * Math.max(0, 1 - a / 0.25)} />
      <Inked pts={disc} color="#0c1013" ink="#000000" w={2.2} order={order} />
      <Poly pts={xf(ribbon([[-0.55 * r, 0.1 * r, 0.16 * r], [-0.2 * r, 0.62 * r, 0.16 * r], [0.35 * r, 0.62 * r, 0.14 * r]]), x, y, rot, s)} color="#dfe6ec" order={order + 0.2} op={0.8} />
    </>
  );
}
export function PopBurst({ at, t, t0, R, order }: { at: [number, number]; t: number; t0: number; R: number; order: number }) {
  const a = t - t0;
  if (a < 0 || a > 0.16) return null;
  const u = a / 0.16;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2 + 0.2, r0 = R * (0.9 + 0.9 * u), r1 = R * (1.6 + 1.6 * u);
        return <Poly key={i} pts={ribbon([[at[0] + Math.cos(ang) * r0, at[1] + Math.sin(ang) * r0, R * 0.16 * (1 - u)], [at[0] + Math.cos(ang) * r1, at[1] + Math.sin(ang) * r1, R * 0.04]])} color="#fff3b8" order={order} op={1 - u} />;
      })}
      <Poly pts={ribbon(Array.from({ length: 25 }, (_, i) => { const q = (i / 24) * Math.PI * 2, rr = R * (0.8 + 1.2 * u); return [at[0] + Math.cos(q) * rr, at[1] + Math.sin(q) * rr, R * 0.18 * (1 - u)]; }))} color="#ffffff" order={order - 0.1} op={0.85 * (1 - u)} />
    </>
  );
}

// ── the exhaust of the rocket (shot 17): clouds born at his feet while he climbs (the feet's frame place at every moment comes from `feet`), thrown down and out, so the trail he leaves is a billowing column that opens up at the couch
export function Exhaust({ f, t0, t1, feet, k, order }: { f: number; t0: number; t1: number; feet: (t: number) => [number, number]; k: number; order: number }) {
  const t = f / FPS, B = 0.04, sp: Sprite[] = [];
  for (let b = Math.floor((t - 1.3 - t0) / B); b <= Math.floor((t - t0) / B); b++) {
    const tb = t0 + b * B;
    if (b < 0 || tb > t1) continue;
    const at = feet(tb);
    const cfg: SteamCfg = { t0: tb, t1: tb + B, stop: 1e9, seed: b * 11 + 5, emitters: [{ seg: [at[0] - 26 * k, at[1], at[0] + 26 * k, at[1] + 10 * k, 12 * k], n: 5, r: [40 * k, 130 * k], rise: [-300 * k, -700 * k], life: [0.6, 1.2], strength: 0.95, drift: 380 * k, burst: 1.8, lobes: 4 }] };
    sp.push(...steamSprites(cfg, t));
  }
  if (!sp.length) return null;
  return <Cloud sprites={sp.map((q) => ({ x: q.x - 540, y: 960 - q.y, r: q.r * 1.55, a: q.a }))} order={order} />;
}

// ── plaster raining down (shot 17): lumps and strips of ceiling thrown out of the hole on `t0`, turning, falling on gravity onto the couch and the floor (`land`: panel y of where they stop), a dust cloud hanging round the hole
const PIECES = 38;
function piece(i: number): { pts: Pt[]; fill: string } {
  const n = 5 + (i % 3), s = 26 + 54 * hash(i * 1.9 + 4.4);
  const pts: Pt[] = Array.from({ length: n }, (_, j) => { const a = (j / n) * Math.PI * 2 + 0.5 * hash(i * 3.3 + j), r = s * (0.55 + 0.45 * hash(i * 5.1 + j * 2.7)); return [Math.cos(a) * r * (1 + 0.5 * (i % 2)), Math.sin(a) * r] as Pt; });
  return { pts, fill: i % 5 === 0 ? "#b98c52" : i % 3 === 0 ? "#cdc4b1" : i % 2 ? "#eadfc6" : "#f6f1e6" };
}
export function PlasterRain({ f, t0, origin, spread, land, k, order }: { f: number; t0: number; origin: [number, number]; spread: number; land: number; k: number; order: number }) {
  const t = f / FPS - t0;
  if (t < 0) return null;
  return (
    <>
      {Array.from({ length: PIECES }, (_, i) => {
        const h = (q: number) => hash(i * q + 9.1), born = h(2.2) * 0.35, a = t - born;
        if (a < 0) return null;
        const x0 = origin[0] + (h(3.7) - 0.5) * spread, vx = (h(5.3) - 0.5) * 760 * k, vy = (60 + 420 * h(7.9)) * k, g = 3600 * k;
        const yl = land + (h(9.7) - 0.5) * 90 * k - 40 * k;
        const tl = (vy + Math.sqrt(vy * vy + 2 * g * (origin[1] - yl))) / g; // when it reaches the floor
        const ac = Math.min(a, tl), landed = a >= tl;
        const x = x0 + vx * ac, y = Math.max(yl, origin[1] + vy * ac - 0.5 * g * ac * ac);
        const bounce = landed ? Math.max(0, 0.33 * vy * (a - tl) * Math.exp(-(a - tl) / 0.1) - 0.5 * g * (a - tl) * (a - tl) * 0.2) : 0;
        const rot = (h(11.1) - 0.5) * 900 * ac * (landed ? 1 : 1);
        const p = piece(i), sc = k * (0.8 + 0.4 * h(13.3));
        return <Inked key={i} pts={xf(p.pts, x, y + bounce, rot, sc)} color={p.fill} ink="#5f5238" w={2.4} order={order + (i % 7) * 0.01} />;
      })}
    </>
  );
}
export function Dust({ f, t0, at, k, order }: { f: number; t0: number; at: [number, number]; k: number; order: number }) {
  const t = f / FPS - t0;
  if (t < 0 || t > 1.6) return null;
  const sp: Sprite[] = Array.from({ length: 18 }, (_, i) => {
    const h = (q: number) => hash(i * q + 1.7), u = Math.min(1, t / 1.4);
    return { x: at[0] + (h(2.1) - 0.5) * 420 * k * (0.4 + u), y: at[1] - (h(3.3) * 220 * u + 40) * k, r: (50 + 70 * h(4.9)) * (0.5 + 0.9 * u) * k, a: 0.8 * (1 - u) * smooth(0, 0.08, u) };
  });
  return <Cloud sprites={sp} order={order} fill="#e8dcc2" ink="#9b8a68" opacity={0.92} />;
}

// ── the Ross-shaped hole in the ceiling and the roof (the morning, and from the crash on; `night` darkens the sky and the plaster for shot 17): the flying Ross's silhouette from his raised hands to his belly (public/sp/x08-fly-sil.png) fills the ceiling's band from the top of the frame down to
// the ceiling's edge (the wall below cuts the rest off), rimmed with broken plaster and the wood of the rafters, the sky in it, a few cracks running out of it. `cx` the hole's middle, `top` and `bottom` the rows (panel px) it spans, `w` its width
export function CeilingHole({ cx, top, bottom, w, order, pop = 1, night = false }: { cx: number; top: number; bottom: number; w: number; order: number; pop?: number; night?: boolean }) {
  const S = RJ.ross.flySil as unknown as { file: string; sky: string; w: number; h: number }, h = top - bottom, hp = h * pop, wp = w * pop;
  const at = (kx: number, ky: number) => ({ w: wp * kx, h: hp * ky, x: cx, y: bottom + (hp * ky) / 2 });
  const rim = at(1.5, 1.1), wood = at(1.24, 1.05), sky = at(1, 1);
  const crack = (a: number, len: number, side: number): Pt[] => { const pts: number[][] = [[0, 0, 3.4]]; for (let i = 1; i <= 5; i++) pts.push([side * len * (i / 5) + 9 * Math.sin(i * 2.7 + a), -len * 0.22 * i + 10 * Math.cos(i * 1.9 + a), 3.4 * (1 - i / 7)]); return ribbon(pts); };
  return (
    <>
      <Picture file={S.file} w={rim.w} h={rim.h} x={rim.x} y={rim.y} order={order} alpha tint={night ? "#bab4ac" : "#efe2c0"} />
      <Picture file={S.file} w={wood.w} h={wood.h} x={wood.x} y={wood.y} order={order + 0.1} alpha tint={night ? "#533b22" : "#6b4a26"} />
      <Picture file={S.sky} w={sky.w} h={sky.h} x={sky.x} y={sky.y} order={order + 0.2} alpha tint={night ? "#1a2350" : "#ffffff"} />
      {[[-1, 0.8, 60, 110], [1, 1.6, 70, 130], [-1, 2.4, 90, 150], [1, 3.1, 50, 90]].map(([side, a, len, dy], i) => (
        <Poly key={i} pts={xf(crack(a, (len * wp) / 150, side), cx + side * (w * 0.78) * pop, bottom + dy * pop * (h / 400) + 30, 0, 1)} color="#6a5a3c" order={order + 0.05} op={0.8} />
      ))}
    </>
  );
}
export function SunShaft({ cx, top, floor, wTop, wBottom, f, order }: { cx: number; top: number; floor: number; wTop: number; wBottom: number; f: number; order: number }) {
  const t = f / FPS;
  return (
    <>
      <Poly pts={[[cx - wTop / 2, top], [cx + wTop / 2, top], [cx + wBottom / 2, floor], [cx - wBottom / 2, floor]]} color="#fff3b0" order={order} op={0.34} />
      <Poly pts={[[cx - wTop / 3, top], [cx + wTop / 3, top], [cx + wBottom / 3, floor], [cx - wBottom / 3, floor]]} color="#ffffff" order={order + 0.1} op={0.22} />
      {Array.from({ length: 22 }, (_, i) => { const h = (q: number) => hash(i * q + 2.2), u = (h(1.3) + t * 0.05 * (0.6 + h(2.9))) % 1, x = cx + (h(3.7) - 0.5) * lerp(wTop, wBottom, u) * 0.9, y = lerp(top, floor, u); return <Poly key={i} pts={ellipsePts(x, y, 3 + 3 * h(5.1), 3 + 3 * h(5.1), 8)} color="#fffbe0" order={order + 0.2} op={0.8 * smooth(0, 0.15, u) * (1 - smooth(0.8, 1, u))} />; })}
    </>
  );
}

// ── thin smoke from his singed hair (the morning): grey puffs rising straight up from the hair at `at`, wavering
export function HairSmoke({ f, at, k, order }: { f: number; at: [number, number]; k: number; order: number }) { // at: panel px
  const t = f / FPS;
  const sp: Sprite[] = [];
  for (let i = Math.floor((t - 2.2) * 9); i <= Math.floor(t * 9); i++) {
    if (i < 0) continue;
    const h = (q: number) => hash(i * q + 8.8), tb = i / 9, a = t - tb, u = a / 2.2;
    if (u < 0 || u > 1) continue;
    const x = at[0] + (h(2.2) - 0.5) * 70 * k + Math.sin(a * 3.1 + i) * 30 * k * u, y = at[1] + (190 * a) * k;
    sp.push({ x, y, r: (12 + 34 * u) * k, a: 0.9 * (1 - u) * smooth(0, 0.12, u) });
  }
  if (!sp.length) return null;
  return <Cloud sprites={sp} order={order} fill="#bdb8b0" ink="#5e5a54" opacity={0.92} th={0.35} ow={2.6} />;
}
