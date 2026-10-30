import React from "react";
import { Inked, Panel, Picture, Poly, Puppet, ellipsePts, ribbon, xf, type Char as PChar, type Pt, type Rig } from "./sp-puppet";
import { Plane, inkAt, useImages } from "./sp-fx";
import { H, W, focusOn } from "./pen-stage";
import { CUSTOMER, DOG, RIG_FIXED } from "./lips-layout";
import tipRig from "./tip-rig.json" with { type: "json" };
import { FPS, cupAt, deniseVeinAt, dogAt, holdPush, poseAt, purpleAt, twitchAt, veinBeat, type Char, type LPose } from "./lips8-sched";
import { AngerMark, CoffeeFace, Cup, Goggles, DogLeg } from "./lips8-fx";

// What the scenes of "Cold Lips" v8 (src/lips8-scenes.tsx) share: a puppet with this episode's acting (src/lips8-sched.ts poseAt) and the repaired pictures of v2 (src/lips-layout.ts RIG_FIXED), what it wears on its head
// in this episode (her purple face and its anger mark; Denise's coffee, the cup on her head, her goggles, her vein, her twitching lid), the dog with its kicking leg, the shot's canvas. Everything is a function of the frame.
export { W, H };
export const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;

/** what a puppet wears on its head in this episode, in head px (from the neck pivot, y up), drawn inside the head's group so it tilts and dips with it; `order` is the puppet's */
function HeadWear({ c, f, order, goggles }: { c: Char; f: number; order: number; goggles?: boolean }) {
  if (c === "customer") {
    const k = purpleAt(f);
    if (k <= 0.01) return null;
    const L = CUSTOMER_HEAD;
    return (
      <>
        <Picture file="sp/lips8-customer-head-purple.png" w={L.w} h={L.h} x={L.x + L.w / 2 - CUSTOMER.pivot[0]} y={CUSTOMER.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={k} />
        {k > 0.5 && <AngerMark x={92} y={250} r={30} k={veinBeat(f)} color="#5e0a30" order={order + 14.8} op={Math.min(1, (k - 0.5) * 4)} />}
      </>
    );
  }
  if (c === "deniseHood") {
    const cup = cupAt(f), v = deniseVeinAt(f), tw = twitchAt(f), t = f / FPS;
    const wet = Math.min(1, Math.max(0, (t - 0.1) / 0.8)); // the streams run for 0.8 s after the hit, then hold
    const soaked = t >= 0.1 && !goggles;
    return (
      <>
        {soaked && <CoffeeFace wet={wet} t={t} order={order + 14.2} />}
        {goggles && <Goggles order={order + 14.3} />}
        {tw > 0 && <TwitchLid c={tw} order={order + 12.6} />}
        {v > 0 && <AngerMark x={96} y={302} r={30} k={0.75 + 0.35 * v} color="#8a2a10" order={order + 14.8} />}
        {cup.on && !cup.fly && <Cup x={-6 + 4 * cup.rattle} y={418 + 900 * cup.drop} s={1.1} rot={3 * cup.rattle} upside order={order + 14.6} />}
        {cup.on && cup.fly > 0 && cup.fly < 0.5 && <Cup x={-6 + 260 * cup.fly} y={418 + 3200 * cup.fly - 2000 * cup.fly * cup.fly} s={1.1} rot={180 + 900 * cup.fly} upside order={order + 14.6} />}
      </>
    );
  }
  return null;
}
const CUSTOMER_HEAD = (CUSTOMER as unknown as { layers: { head: { x: number; y: number; w: number; h: number } } }).layers.head;
/** Denise's left eye (the screen's right): its lid jumps down by `c` (a fraction of the eye) for a frame or two; the eye outline of the rig grown 3 px, cut where the lid ends, in her skin, with a lash line */
const DEN = tipRig.deniseHood as unknown as { pivot: [number, number]; face: string; ink: string; eyes: { cx: number; cy: number; rx: number; ry: number }[] };
function TwitchLid({ c, order }: { c: number; order: number }) {
  const e = DEN.eyes[1], cx = e.cx - DEN.pivot[0], cy = DEN.pivot[1] - e.cy, rx = e.rx + 3, ry = e.ry + 3;
  const yc = cy + ry - 2 * ry * c; // where the lid ends
  const hw = rx * Math.sqrt(Math.max(0, 1 - ((yc - cy) / ry) ** 2));
  const edge: Pt[] = Array.from({ length: 13 }, (_, i) => [cx - hw + (2 * hw * i) / 12, yc] as Pt);
  return (
    <>
      <Poly pts={ellipsePts(cx, (yc + cy + ry) / 2, Math.max(hw, rx * 0.7), (cy + ry - yc) / 2 + 2, 32)} color={DEN.face} order={order} />
      <Poly pts={ribbon(edge.map((p) => [p[0], p[1], 3.4]))} color={DEN.ink} order={order + 0.1} />
    </>
  );
}

/** a puppet of this episode, placed by its neck pivot (frame px) at scale E, with its pose of this frame and its head wear */
export const L8Actor = ({ c, f, nx, ny, E, order = 40, flip, tint, goggles, pose }: { c: Char; f: number; nx: number; ny: number; E: number; order?: number; flip?: boolean; tint?: string; goggles?: boolean; pose?: (p: LPose) => LPose }) => {
  const p0 = poseAt(c, f), p = pose ? pose(p0) : p0;
  const rig0 = (RIG_FIXED as Record<string, Rig>)[c], k = c === "customer" ? purpleAt(f) : 0;
  const rig = k > 0.01 && rig0 ? ({ ...rig0, face: mixHex((rig0 as unknown as { face: string }).face, PURPLE_FACE, k) } as Rig) : rig0; // her lids go purple with her face
  return <Puppet char={c as PChar} pose={p} x={FX(nx)} y={FY(ny)} scale={E} order={order} flip={flip} tint={tint} headAttach={<HeadWear c={c} f={f} order={order} goggles={goggles} />} rig={rig} />;
};
/** the colour of her purple face (scripts/lips8-art.py PURPLE on the skin's own lightness) and a mix of two "#rrggbb" colours */
const PURPLE_FACE = "#b0468a";
const mixHex = (a: string, b: string, k: number) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), ch = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };
/** a shot: its canvas, the shot's push on a frame point, the scene inside (every scene that loads pictures is made by this: see src/lips-shared.tsx shot) */
export const shot8 = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Inner f={f} /></Panel>
);
/** the dog in her purse (src/lips-shared.tsx Dog) with this episode's faces and its kicking leg */
const D2R = Math.PI / 180;
export function Dog8({ nx, ny, E, p, f, order }: { nx: number; ny: number; E: number; p: LPose; f: number; order: number }) {
  const [neutral, sour, gasp] = useImages([DOG.files.neutral, DOG.files.sour, DOG.files.gasp]);
  const d = dogAt(f);
  const pu = CUSTOMER.purse[p.body ?? "stand"], k = (0.75 * pu.w) / (DOG.paws[1] - DOG.paws[0]);
  const ax = pu.x - CUSTOMER.pivot[0], ay = CUSTOMER.pivot[1] - pu.y;
  const tex = d.face === "gasp" ? gasp : d.face === "sour" ? sour : neutral;
  return (
    <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * E, 0]} scale={[E, E, 1]}>
      <group position={[ax + d.dx, ay + d.up, 0]} rotation={[0, 0, d.rot * D2R]} scale={[k * d.sx, k, 1]}>
        <group position={[DOG.w / 2 - DOG.anchor[0], DOG.anchor[1] - DOG.h / 2, 0]}>
          {d.kick !== 0 && <DogLeg kick={d.kick} order={order - 0.5} />}
          <Plane tex={tex} x={0} y={0} w={DOG.w} h={DOG.h} order={order} />
        </group>
      </group>
    </group>
  );
}
/** a sweat drop (src/lips-scenes.tsx Sweat's shape): a teardrop of pale blue with the ink line */
export const DROP: Pt[] = (() => {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 20;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
})();
/** sweat flung off Todd's head: drops launched at times `ts` (s), on gravity, gone in 0.55 s; (hx, hy) the middle of his head in frame px */
export function Sweat({ hx, hy, E, f, ts }: { hx: number; hy: number; E: number; f: number; ts: number[] }) {
  return (
    <>
      {ts.map((t0, i) => {
        const a = f / FPS - t0;
        if (a < 0 || a > 0.55) return null;
        const side = i % 2 ? 1 : -1, ang = ((i % 4 < 2 ? 58 : 24) * Math.PI) / 180, v = i % 4 < 2 ? 540 : 620;
        const vx = side * v * Math.sin(ang), vy = v * Math.cos(ang);
        const x = side * (i % 4 < 2 ? 100 : 118) + vx * a, y = (i % 4 < 2 ? 175 : 140) + vy * a - 750 * a * a;
        const rot = (Math.atan2(vx, vy - 1500 * a) * 180) / Math.PI;
        return <Inked key={i} pts={xf(DROP, FX(hx + x * E), FY(hy - y * E), 180 - rot, 10 * E)} color="#a9ddff" ink="#2d6c9c" w={inkAt(E) * 1.1} order={220} op={a > 0.4 ? 1 - (a - 0.4) / 0.15 : 1} />;
      })}
    </>
  );
}
