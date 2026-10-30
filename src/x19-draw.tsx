import React from "react";
import * as THREE from "three";
import { Glow, Inked, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group, Sheet } from "./pen-stage";
import { hash, useImages } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { WordTag } from "./x19-props";
import { BLAST_T, type Vol } from "./x19-sched";

// The effects of x19 "Screen Time" that are drawn in code (src/x19-scenes-a.tsx and src/x19-scenes.tsx place them; the pictures that are painted, the tablet, the stroller TV, the rack, the charger, the switch, the muffin, the hands and the customers, are placed by
// src/x19-art.tsx): the content of the screens (a bouncing cartoon sun, the volume overlay with its ten bars, the huge red 1% battery, the black), the toddler's finger, the sugar jar, the dim, the blue light on the faces, the window panes' bulge, the toddler's
// trembling lip, the cups' shards, the hair that the wind blows and the rings of the blast. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin in the middle) elsewhere; the
// screen's own design px (1000 x 620 high, as wide as the screen asks, y up, origin in its middle) inside a screen. Every piece is a closed-form function of the age it is given: nothing reads a clock or a random source. The shapes that move are drawn once,
// in unit size, and placed by a group's position, turn and scale, so that no frame makes a new geometry (src/x18-draw.tsx).
const UNIT = ellipsePts(0, 0, 1, 1, 28);
const D2R = Math.PI / 180;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const SKIN = "#fed38d", SKIN_INK = "#7d4a1a";

// ═════════════════════════════════════════════════════ the screen: a bright kids' cartoon (a sky, two green hills, three clouds and a sun with a face that bounces on the song's beat) with the volume overlay on it; 1000 x 620 design px, y up
export const SCR = { w: 1000, h: 620 };
/** a green hill across a screen of design width `W` (a little over its edges: the screen's frame hides them), its crest a slow wave */
const hill = (W: number, y0: number, amp: number, ph: number, n = 24): Pt[] => [...Array.from({ length: n + 1 }, (_, i) => [-W / 2 - 10 + ((W + 20) * i) / n, y0 + amp * Math.sin((i / n) * Math.PI * 2 * 1.2 + ph)] as Pt), [W / 2 + 10, -320], [-W / 2 - 10, -320]];
const RAY: Pt[] = [[-17, 120], [17, 120], [0, 180]];
const SMILE: Pt[] = Array.from({ length: 15 }, (_, i) => { const a = Math.PI + (Math.PI * i) / 14; return [Math.cos(a) * 54, -6 + Math.sin(a) * 50] as Pt; });
const CLOUDS: { x: number; y: number; s: number; ph: number }[] = [{ x: -300, y: 170, s: 1, ph: 0.3 }, { x: 260, y: 215, s: 0.8, ph: 1.7 }, { x: 330, y: 60, s: 0.6, ph: 2.9 }];
function Cloud({ x, y, s, order }: { x: number; y: number; s: number; order: number }) {
  return (
    <Group x={x} y={y} sx={s} sy={s}>
      <Poly pts={ellipsePts(0, 0, 70, 32, 20)} color="#ffffff" order={order} />
      <Poly pts={ellipsePts(-46, -6, 42, 24, 20)} color="#ffffff" order={order} />
      <Poly pts={ellipsePts(50, -4, 48, 25, 20)} color="#ffffff" order={order} />
      <Poly pts={ellipsePts(0, -18, 90, 14, 20)} color="#dff2ff" order={order - 0.01} />
    </Group>
  );
}
/** the sun: a face on a disc with twelve rays that turn slowly; it bounces on the beat: `y` its height, `sq` how squashed it is (1 at the moment it lands) */
function Sun({ x, y, sq, rot, order }: { x: number; y: number; sq: number; rot: number; order: number }) {
  return (
    <Group x={x} y={y} sx={1 + 0.14 * sq} sy={1 - 0.16 * sq}>
      {Array.from({ length: 12 }, (_, i) => <Group key={i} x={0} y={0} rot={rot + i * 30}><Poly pts={RAY} color="#ffb21c" order={order} /></Group>)}
      <Inked pts={ellipsePts(0, 0, 108, 108, 40)} color="#ffd92e" ink="#d98300" w={6} order={order + 0.2} />
      <Group x={-62} y={-26} sx={26} sy={16}><Poly pts={UNIT} color="#ff9a8a" order={order + 0.8} op={0.8} /></Group>
      <Group x={62} y={-26} sx={26} sy={16}><Poly pts={UNIT} color="#ff9a8a" order={order + 0.8} op={0.8} /></Group>
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Group x={s * 38} y={24} sx={12} sy={18}><Poly pts={UNIT} color="#2a1a0a" order={order + 0.9} /></Group>
          <Group x={s * 41} y={31} sx={4.5} sy={6}><Poly pts={UNIT} color="#ffffff" order={order + 1.0} /></Group>
        </React.Fragment>
      ))}
      <Poly pts={SMILE} color="#7a1620" order={order + 0.9} />
      <Group x={0} y={-46} sx={24} sy={12}><Poly pts={UNIT} color="#ff6b7a" order={order + 1.0} /></Group>
    </Group>
  );
}
/** the overlay's numbers (screen design px, from its middle): the pill, where bar i stands (x) and how tall it is */
export const BAR = { x: (i: number) => -190 + 42 * i, h: (i: number) => 38 + 9 * i, w: 30, base: -58 };
const BAR_PTS: Pt[][] = Array.from({ length: 10 }, (_, i) => roundRect(BAR.w, BAR.h(i), 9, 4));
const OVERLAY = roundRect(760, 170, 46, 6);
/** the volume overlay: a dark pill with a speaker and ten bars that grow taller, `vol.bars` of them lit white, MAX in red when it is at the top; (0, 0) its middle in the screen's design px */
export function VolumeOverlay({ vol, order, k = 1 }: { vol: Vol; order: number; k?: number }) {
  if (!vol.show) return null;
  return (
    <Group x={0} y={-205} sx={k} sy={k}>
      <Poly pts={OVERLAY} color="#0e0f14" order={order} op={0.88} />
      <Poly pts={rect(-345, -19, -318, 19)} color="#ffffff" order={order + 0.1} />
      <Poly pts={[[-318, 19], [-282, 50], [-282, -50], [-318, -19]]} color="#ffffff" order={order + 0.1} />
      {[0, 1].map((i) => <Poly key={i} pts={ribbon(Array.from({ length: 9 }, (_, j) => { const a = ((j - 4) / 4) * 0.9; return [-268 + i * 26 + Math.cos(a) * (24 + i * 15), Math.sin(a) * (24 + i * 15), 7] as number[]; }))} color="#ffffff" order={order + 0.1} />)}
      {BAR_PTS.map((pts, i) => {
        const lit = i < vol.bars, newest = vol.bars > 0 && i === vol.bars - 1;
        return <Group key={i} x={BAR.x(i)} y={BAR.base + BAR.h(i) / 2} sx={newest ? 1.14 : 1} sy={newest ? 1.08 : 1}><Poly pts={pts} color={lit ? "#ffffff" : "#565b68"} order={order + 0.2} /></Group>;
      })}
      {vol.max && !vol.past && <WordTag text="MAX" w={165} h={68} fill="#ff3b30" ink="#ffffff" lineW={0.1} x={300} y={0} order={order + 0.4} />}
    </Group>
  );
}
/** the cartoon on the screen at time `t`: the sun bounces on the song's beat (0.5 s from the blast: it lands on every beat and squashes) and the overlay is on it when `vol` says so */
export function ScreenSun({ t, vol, order = 10, W = SCR.w }: { t: number; vol?: Vol; order?: number; W?: number }) {
  const u = ((((t - BLAST_T) / 0.5) % 1) + 1) % 1, hgt = 4 * u * (1 - u), sq = u < 0.12 ? 1 - u / 0.12 : u > 0.9 ? (u - 0.9) / 0.1 : 0, e = W / 2 + 10;
  const back = React.useMemo(() => hill(W, -165, 26, 0.6), [W]), front = React.useMemo(() => hill(W, -232, 20, 2.4), [W]);
  return (
    <>
      <Poly pts={rect(-e, 80, e, 320)} color="#4db8ff" order={order} />
      <Poly pts={rect(-e, -60, e, 80)} color="#7ccfff" order={order} />
      <Poly pts={rect(-e, -180, e, -60)} color="#a8e4ff" order={order} />
      {CLOUDS.map((c, i) => <Cloud key={i} x={c.x + 55 * Math.sin(0.55 * t + c.ph)} y={c.y} s={c.s} order={order + 0.1} />)}
      <Poly pts={back} color="#79d96a" order={order + 0.2} />
      <Poly pts={front} color="#4cbf4a" order={order + 0.3} />
      <Sun x={50 * Math.sin(1.1 * t)} y={-85 + 250 * hgt} sq={sq} rot={t * 24} order={order + 1} />
      {vol && <VolumeOverlay vol={vol} order={order + 4} />}
    </>
  );
}
/** the TV's last picture: a huge red battery with its one sliver and "1%" over it on black; the warning flashes (the sliver and the glow blink every four frames) */
export function ScreenBattery({ f, order = 10, W = SCR.w }: { f: number; order?: number; W?: number }) {
  const on = Math.floor(f / 4) % 2 === 0, e = W / 2 + 10;
  return (
    <>
      <Poly pts={rect(-e, -320, e, 320)} color="#0a0a0e" order={order} />
      <Group x={0} y={-30} sx={360 + (on ? 20 : 0)} sy={250 + (on ? 14 : 0)}><Poly pts={UNIT} color="#ff2b2b" order={order + 0.1} op={on ? 0.2 : 0.09} /></Group>
      <Group x={0} y={-45}>
        <Poly pts={roundRect(560, 300, 46, 8)} color="#ff2b2b" order={order + 0.2} />
        <Poly pts={roundRect(516, 256, 30, 8)} color="#0a0a0e" order={order + 0.3} />
        <Group x={296} y={0}><Poly pts={roundRect(44, 120, 12, 6)} color="#ff2b2b" order={order + 0.2} /></Group>
        <Group x={-232} y={0}><Poly pts={roundRect(30, 208, 10, 6)} color={on ? "#ff2b2b" : "#7a1414"} order={order + 0.4} /></Group>
      </Group>
      <WordTag text="1%" w={560} h={200} fill="#ff2b2b" ink="#5a0000" lineW={0.1} x={0} y={212} order={order + 0.6} />
    </>
  );
}
/** the dead screen: black with a faint diagonal sheen */
export function ScreenDead({ order = 10, W = SCR.w }: { order?: number; W?: number }) {
  const e = W / 2 + 10;
  return (
    <>
      <Poly pts={rect(-e, -320, e, 320)} color="#050507" order={order} />
      <Poly pts={[[-e, 320], [-180, 320], [-e, -40]]} color="#ffffff" order={order + 0.1} op={0.03} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the sugar jar the tablet leans on: a glass jar of sugar with a steel lid and a SUGAR label, (x, y) the middle of its foot (frame px), k its size
export function SugarJar({ x, y, k = 1, order }: { x: number; y: number; k?: number; order: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={k} sy={k}>
      <Inked pts={roundRect(150, 200, 28, 6).map(([a, b]) => [a, b + 100] as Pt)} color="#e3f4f8" ink="#2f4650" w={5} order={order} />
      <Poly pts={roundRect(128, 150, 20, 6).map(([a, b]) => [a, b + 86] as Pt)} color="#fbf8f0" order={order + 0.2} />
      {Array.from({ length: 14 }, (_, i) => <Group key={i} x={-48 + (i % 5) * 24 + (i % 2) * 8} y={36 + Math.floor(i / 5) * 40 + (i % 3) * 7} sx={3} sy={3}><Poly pts={UNIT} color="#e4dcc6" order={order + 0.3} /></Group>)}
      <Inked pts={roundRect(166, 40, 10, 5).map(([a, b]) => [a, b + 214] as Pt)} color="#b4bcc4" ink="#3a424a" w={4} order={order + 0.5} />
      <Poly pts={roundRect(104, 52, 8, 4).map(([a, b]) => [a, b + 100] as Pt)} color="#ffffff" order={order + 0.6} />
      <WordTag text="SUGAR" w={100} h={34} fill="#2b2b33" x={0} y={100} order={order + 0.7} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the toddler's finger: a short arm in a green sleeve (his t-shirt's) coming in from the right, a small fist and one index finger that presses; (x, y) the fingertip (frame px), the finger points left,
// `rot` degrees clockwise, `k` the size (1: the fist is 140 px across), `press` px the finger is pushed into what it touches
export function ToddlerFinger({ x, y, rot = 0, k = 1, press = 0, sleeve = "#58b34a", order }: { x: number; y: number; rot?: number; k?: number; press?: number; sleeve?: string; order: number }) {
  return (
    <Group x={PX(x) + press * k} y={PY(y)} rot={-rot} sx={k} sy={k}>
      <Inked pts={ribbon([[330, -12, 74], [900, -30, 92]])} color={SKIN} ink={SKIN_INK} w={4} order={order} />
      <Inked pts={[[300, 44], [900, 56], [940, -118], [320, -62]]} color={sleeve} ink="#1f5a18" w={4} order={order + 0.2} />
      <Inked pts={ribbon([[0, 0, 24], [70, 0, 28], [118, 0, 40]])} color={SKIN} ink={SKIN_INK} w={4} order={order + 0.3} />
      <Inked pts={ellipsePts(150, -6, 74, 60, 24)} color={SKIN} ink={SKIN_INK} w={4} order={order + 0.5} />
      <Inked pts={ellipsePts(128, 46, 36, 20, 16)} color={SKIN} ink={SKIN_INK} w={4} order={order + 0.7} />
      {[-18, 4].map((fy, i) => <Poly key={i} pts={ribbon([[172, fy - 10, 3], [136, fy - 10, 3]])} color={SKIN_INK} order={order + 0.8} op={0.7} />)}
    </Group>
  );
}
// ═════════════════════════════════════════════════════ the dim: everything drawn so far is multiplied by a blue-grey (the lights are down, the room keeps its colours and its contrast: a flat dark wash would turn it grey); `k` 0 .. 1 how far it is (1: `color`)
const hexRgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function Multiply({ color, k = 1, order, y0 }: { color: string; k?: number; order: number; y0?: number }) {
  if (k <= 0.004) return null;
  const [r, g, b] = hexRgb(color), m = (v: number) => Math.round(255 + (v - 255) * k), c = "#" + [m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
  const top = y0 ?? -600, h = 2600 - top, cy = PY(top + h / 2);   // `y0`: only the frame rows from y0 down (the counter's front, drawn over the people)
  return (
    <mesh position={[0, cy, 0]} renderOrder={order}>
      <planeGeometry args={[2600, h]} />
      <meshBasicMaterial color={c} transparent blending={THREE.MultiplyBlending} premultipliedAlpha depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════ the blue light of a screen on a face: a soft additive glow that flickers on twos; (x, y) frame px, radii in px
export function ScreenLight({ x, y, rx, ry, op, order, color = "rgba(150,205,255,1)" }: { x: number; y: number; rx: number; ry?: number; op: number; order: number; color?: string }) {
  return <Glow x={PX(x)} y={PY(y)} rx={rx} ry={ry ?? rx} op={op} order={order} color={color} />;
}

// ═════════════════════════════════════════════════════ the window panes' bulge: the pane of the seating plate (public/sp/x19-pane.png, scripts/x19-prep.py) drawn on a grid that swells toward the viewer in the middle and goes back to flat with the sound; `amp` 0 .. about 0.12
export function PaneBulge({ box, amp, order }: { box: [number, number, number, number]; amp: number; order: number }) {
  const [tex] = useImages(["sp/x19-pane.png"]);
  const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const at = (a: number, b: number): [number, number] => {
    const dome = (1 - (2 * a - 1) ** 2) * (1 - (2 * b - 1) ** 2), px = x0 + a * (x1 - x0), py = y0 + b * (y1 - y0);
    return [PX(px + (px - cx) * amp * dome), PY(py + (py - cy) * amp * dome)];
  };
  return <Sheet tex={tex} at={at} nu={16} nv={16} order={order} />;
}
/** the glare on the glass: a white band across the pane that slides with the bulge */
export function PaneGlare({ box, amp, order }: { box: [number, number, number, number]; amp: number; order: number }) {
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, s = 1 + amp * 1.2;
  return (
    <Group x={PX((x0 + x1) / 2)} y={PY((y0 + y1) / 2)} sx={s} sy={s}>
      <Poly pts={[[-w * 0.5, h * 0.5 - h * 0.08], [-w * 0.5 + w * 0.2, h * 0.5], [w * 0.5 - w * 0.4, -h * 0.5], [-w * 0.5, -h * 0.5 + h * 0.3]]} color="#ffffff" order={order} op={0.1 + 1.6 * amp} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the toddler's trembling lip: a skin patch over his painted mouth and, over it, a downturned mouth with a lower lip that shivers on twos; drawn in the children of a Flat (picture px about the anchor, y up):
// (cx, cy) the painted mouth's middle, `w` its width, `build` 0 .. 1 how far it has got toward crying (the frown deepens and the shiver grows), `f` the frame
export function TrembleLip({ cx, cy, w, skin, ink = "#5a2a10", lip = "#e8a08a", build, f, order }: { cx: number; cy: number; w: number; skin: string; ink?: string; lip?: string; build: number; f: number; order: number }) {
  const sh = (hash(Math.floor(f / 2) * 2.3 + 1.1) * 2 - 1) * (1.5 + 5 * build), sh2 = (hash(Math.floor(f / 2) * 3.7 + 5.2) * 2 - 1) * (1 + 2.5 * build), drop = 6 + 20 * build, lipH = 9 + 15 * build;
  const n = 13, U = (u: number) => cy + 4 - drop * u * u + sh2 * (1 - Math.abs(u));
  const upper = Array.from({ length: n }, (_, i) => { const u = (i / (n - 1)) * 2 - 1; return [cx + u * w * 0.5, U(u), 6.5 - 2 * Math.abs(u)] as number[]; });
  const lowerPts = Array.from({ length: n }, (_, i) => { const u = (i / (n - 1)) * 2 - 1; return [cx + u * w * 0.36, U(u * 0.72) - lipH * Math.pow(1 - u * u, 0.8) + sh * (1 - u * u), 5.5 - 2 * Math.abs(u)] as number[]; });
  const fill: Pt[] = [...upper.slice(2, n - 2).map(([a, b]) => [a, b] as Pt), ...lowerPts.slice(2, n - 2).reverse().map(([a, b]) => [a, b] as Pt)];
  return (
    <>
      <Poly pts={roundRect(w * 1.3, w * 0.9, w * 0.3, 8).map(([a, b]) => [a + cx, b + cy - 8] as Pt)} color={skin} order={order} />
      <Poly pts={fill} color={lip} order={order + 0.1} />
      <Poly pts={ribbon(lowerPts)} color={ink} order={order + 0.2} />
      <Poly pts={ribbon(upper)} color={ink} order={order + 0.3} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the cups' shards: white pieces of china with a dark edge thrown out of a point (frame px) and falling, each on its own angle, speed and spin; `age` s since the smash
const SHARD: Pt[] = [[-1, -0.7], [1.1, -0.2], [-0.2, 1]];
export function Shards({ x, y, age, n = 10, k = 1, order }: { x: number; y: number; age: number; n?: number; k?: number; order: number }) {
  if (age < 0 || age > 0.9) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const h = (q: number) => hash(i * q + 8.3), a = (-70 + (h(2.3) - 0.5) * 150) * D2R, v = (420 + 520 * h(3.7)) * k, g = 2400 * k, px = x + Math.cos(a) * v * age * (h(5.1) < 0.5 ? -1 : 1), py = y + Math.sin(a) * v * age + 0.5 * g * age * age, s = (10 + 14 * h(7.1)) * k;
        return <Group key={i} x={PX(px)} y={PY(py)} rot={(h(9.3) - 0.5) * 900 * age} sx={s} sy={s}><Inked pts={SHARD} color="#fbfbfd" ink="#3a3d46" w={0.14} order={order + i * 0.001} op={1 - clamp01((age - 0.6) / 0.3)} /></Group>;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the rings of the blast: a white ring that grows from a point (frame px) and fades; `u` 0 .. 1
const RING: Pt[] = ribbon(ellipsePts(0, 0, 1, 1, 40).map(([a, b]) => [a, b, 0.06] as number[]));
export function BlastRing({ cx, cy, r0, r1, u, order, color = "#ffffff" }: { cx: number; cy: number; r0: number; r1: number; u: number; order: number; color?: string }) {
  if (u <= 0 || u >= 1) return null;
  const r = r0 + (r1 - r0) * (1 - (1 - u) ** 2);
  return <Group x={PX(cx)} y={PY(cy)} sx={r} sy={r}><Poly pts={RING} color={color} order={order} op={0.85 * (1 - u)} /></Group>;
}

// ═════════════════════════════════════════════════════ the hair the wind blows: tufts of Ross's colour streaming off the top of his head, drawn in head px from the neck pivot (y up) so that they tilt with the head (`headAttach`); `w` the wind 0 .. 1
const HAIR = "#9d4d1c", HAIR_INK = "#5e2c0d", HAIR_LIGHT = "#c27234";
export function HairTufts({ w, f, order = 14 }: { w: number; f: number; order?: number }) {
  if (w < 0.05) return null;
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const h = (q: number) => hash(i * q + 3.9), th = (124 - i * 10.5) * D2R, ax = Math.cos(th) * 200, ay = 201 + Math.sin(th) * 196, al = (8 + 7 * (i % 3) + 6 * h(1.3)) * D2R, len = (170 + 90 * h(2.1)) * (0.35 + 0.65 * w);
        const fl = (hash(Math.floor(f / 2) * 1.9 + i * 4.1) - 0.5) * 26 * w, ph = Math.floor(f / 2) * 0.9 + i * 1.3;
        const pts = [0, 0.33, 0.66, 1].map((u, k) => [ax + Math.cos(al) * len * u, ay + Math.sin(al) * len * u + 16 * w * Math.sin(ph + u * 5.2) * u + (k === 3 ? fl : 0), (44 - 40 * u * u) * (0.65 + 0.35 * w)]);
        return (
          <React.Fragment key={i}>
            <Poly pts={ribbon(pts.map(([a, b, c]) => [a, b, c + 9]))} color={HAIR_INK} order={order} />
            <Poly pts={ribbon(pts)} color={HAIR} order={order + 0.1} />
            <Poly pts={ribbon(pts.map(([a, b, c]) => [a, b + c * 0.12, c * 0.3]))} color={HAIR_LIGHT} order={order + 0.2} op={0.8} />
          </React.Fragment>
        );
      })}
    </>
  );
}
