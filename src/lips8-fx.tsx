import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Goo, Plane, inkAt, useCanvasTexture, useImages, type Sprite } from "./sp-fx";
import { D2R, HAND_PHONE } from "./pen-stage";
import { FONT, rr, text, type G } from "./pen-ui";
import { hash, lerp } from "./lips8-sched";

// The pieces of "Cold Lips" v8 that are drawn in code (src/lips8-scenes.tsx places them): the coffee (the wall that hits Denise, the splash, the drops on the lens, the streams down her face), the cup (in her hand, on Denise's
// head), the anger marks, Denise's swim goggles, mitten hands, the bare foot, smoke, the dog's kicking leg, the bill, the tip jar's label, the phone with the giant POST button, her arm over the camera's shoulder. Flat
// shapes with the show's ink line, the colours of the painted cast. A splash on a face is streams and drips over the painted face, never a solid coat of brown (the face would read as a skin colour).
export const COFFEE = { fill: "#8b5523", ink: "#3b200c", light: "#e0a868" }; // caramel, lighter than Denise's hair so that a stream on her face never reads as a lock of it
export const SKIN = { customer: "#ffd598", todd: "#fedca3", denise: "#fee1a2" };
export const INK = { customer: "#2a1c0e", todd: "#503e23", denise: "#39200c" };
export const COAT = { fill: "#d7cdb9", ink: "#6d6352" }; // her trench, as painted
export const HAIR = { fill: "#f6cf00", ink: "#8a6a00" }; // her bob
export const TROUSER = "#3c3c42";

// ── a mitten hand (the South Park hand: a rounded palm, a thumb, two creases), its middle at (x, y), turned `rot` degrees, `s` px per unit; thumb on the right unless flipped. Panel px (y up) or a group's px
export function Mitten({ x, y, rot = 0, s = 1, skin, ink, flip = false, order, op = 1, lw = 2.2 }: { x: number; y: number; rot?: number; s?: number; skin: string; ink: string; flip?: boolean; order: number; op?: number; lw?: number }) {
  const k = flip ? -1 : 1;
  const palm = xf(xf(roundRect(62, 94, 30), 0, 8), x, y, rot, s);
  const thumb = xf(xf(ellipsePts(0, 0, 13, 28, 20), k * 36, -12, k * -42), x, y, rot, s);
  const line = (pl: number[][]) => xf(ribbon(pl), x, y, rot, s);
  return (
    <>
      <Inked pts={thumb} color={skin} ink={ink} w={lw} order={order} op={op} />
      <Inked pts={palm} color={skin} ink={ink} w={lw} order={order + 0.1} op={op} />
      <Poly pts={line([[-10, 54, 2.2], [-10, 36, 2.6]])} color={ink} order={order + 0.2} op={op * 0.6} />
      <Poly pts={line([[10, 54, 2.2], [10, 36, 2.6]])} color={ink} order={order + 0.2} op={op * 0.6} />
    </>
  );
}

// ── the cup: white, a plain brown sleeve, a lid; 150 px tall at s = 1, its middle at (x, y). `upside`: turned over (a hat), no lid. `tilt` degrees
export function Cup({ x, y, s = 1, rot = 0, upside = false, lid = true, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; upside?: boolean; lid?: boolean; order: number; op?: number }) {
  const r = rot + (upside ? 180 : 0);
  const body: Pt[] = [[-38, -75], [38, -75], [52, 75], [-52, 75]];
  const sleeve: Pt[] = [[-43, -32], [43, -32], [48, 28], [-48, 28]];
  const lidP: Pt[] = [[-58, 74], [58, 74], [54, 94], [-54, 94]];
  const T = (p: Pt[]) => xf(p, x, y, r, s);
  const lw = 2.4 * s;
  return (
    <>
      <Inked pts={T(body)} color="#f6f4ee" ink="#5d5a52" w={lw} order={order} op={op} />
      <Inked pts={T(sleeve)} color="#a8743e" ink="#5b3a17" w={lw} order={order + 0.1} op={op} />
      {lid && !upside && <Inked pts={T(lidP)} color="#e7e5df" ink="#5d5a52" w={lw} order={order + 0.2} op={op} />}
      <Poly pts={T(ribbon([[-30, -66, 5], [-34, 60, 7]]))} color="#ffffff" order={order + 0.3} op={op * 0.8} />
    </>
  );
}

// ── an anger mark (four arcs bulging toward their middle, the cartoon vein), its middle at (x, y), radius r, scaled by `k` (a throb)
export function AngerMark({ x, y, r, k = 1, color, order, op = 1 }: { x: number; y: number; r: number; k?: number; color: string; order: number; op?: number }) {
  const R = r * k, w = Math.max(3, R * 0.22);
  return (
    <>
      {[45, 135, 225, 315].map((a) => {
        const ar = a * D2R, cx = x + Math.cos(ar) * R * 1.05, cy = y + Math.sin(ar) * R * 1.05;
        const pl = Array.from({ length: 9 }, (_, i) => { const b = ar + Math.PI + (-0.95 + (1.9 * i) / 8); return [cx + Math.cos(b) * R * 0.72, cy + Math.sin(b) * R * 0.72, w * (1 - 0.5 * Math.abs(i - 4) / 4)]; });
        return <Poly key={a} pts={ribbon(pl)} color={color} order={order} op={op} />;
      })}
    </>
  );
}

// ── coffee on Denise: streams from the top of her head down her face and off her chin (head px of the deniseHood rig: from the neck pivot, y up; the head's middle is at (0, 173), radius 167), a splat on her hair, drops
// falling from her chin. `wet` 0..1 how fresh it is (the streams run on for a second after the hit, then hold); `t` seconds for the falling drops
const STREAMS: { x: number; top: number; len: number; w: number }[] = [
  { x: -92, top: 292, len: 210, w: 14 }, { x: -32, top: 300, len: 78, w: 12 }, { x: 2, top: 302, len: 236, w: 13 }, { x: 50, top: 300, len: 70, w: 11 }, { x: 98, top: 286, len: 196, w: 14 },
];
export function CoffeeFace({ wet = 1, t, order }: { wet?: number; t: number; order: number }) {
  return (
    <>
      <Inked pts={xf(blobPts(12, 9), 0, 330, 0, 1, 0.5)} color={COFFEE.fill} ink={COFFEE.ink} w={2.4} order={order} op={0.95} />
      <Poly pts={xf(ellipsePts(0, 0, 40, 9, 16), -34, 346, -8)} color={COFFEE.light} order={order + 0.02} op={0.8} />
      {STREAMS.map((s, i) => {
        const L = s.len * (0.45 + 0.55 * wet), n = 10;
        const pl = Array.from({ length: n + 1 }, (_, k) => { const u = k / n; return [s.x + Math.sin(u * 5 + i) * 5, s.top - L * u, s.w * (1 - 0.35 * u)]; });
        const end = pl[n];
        const shine = pl.slice(1, n - 1).map((q) => [q[0] - q[2] * 0.22, q[1], q[2] * 0.22]);
        return (
          <React.Fragment key={i}>
            <Inked pts={ribbon(pl)} color={COFFEE.fill} ink={COFFEE.ink} w={2} order={order + 0.1} op={0.92} />
            <Inked pts={ellipsePts(end[0], end[1] - 4, s.w * 0.8, s.w * 1.0, 14)} color={COFFEE.fill} ink={COFFEE.ink} w={2} order={order + 0.12} op={0.95} />
            <Poly pts={ribbon(shine)} color={COFFEE.light} order={order + 0.14} op={0.8} />
            <Poly pts={ellipsePts(end[0] - s.w * 0.3, end[1], s.w * 0.22, s.w * 0.28, 10)} color="#fff4e4" order={order + 0.15} op={0.85} />
          </React.Fragment>
        );
      })}
      {[0, 1, 2].map((i) => { // drops off the chin, on gravity, one after another
        const a = (t * 1.3 + i / 3) % 1, y = 8 - 260 * a * a, x = -10 + 22 * i;
        return <Inked key={`d${i}`} pts={xf(dropPts(), x, y, 0, 9)} color={COFFEE.fill} ink={COFFEE.ink} w={1.8} order={order + 0.2} op={0.9 * (1 - a)} />;
      })}
    </>
  );
}
/** streaks on her hoodie and apron (body px of the deniseHood rig, y up from the neck pivot) */
export function CoffeeBody({ order }: { order: number }) {
  const S: [number, number, number, number][] = [[-120, -40, 150, 14], [-70, -60, 210, 12], [40, -50, 190, 13], [110, -30, 120, 12], [-10, -90, 120, 10]];
  return (
    <>
      {S.map(([x, top, len, w], i) => {
        const pl = Array.from({ length: 9 }, (_, k) => { const u = k / 8; return [x + Math.sin(u * 4 + i * 2) * 6, top - len * u, w * (1 - 0.4 * u)]; });
        return <Inked key={i} pts={ribbon(pl)} color={COFFEE.fill} ink={COFFEE.ink} w={2} order={order} op={0.78} />;
      })}
    </>
  );
}
/** a lumpy closed blob: `n` lumps of radius around `r` (unit size, scaled by xf) */
function blobPts(r: number, n: number): Pt[] {
  return Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * Math.PI * 2, k = 1 + 0.22 * Math.sin(a * n + 1.3) + 0.1 * Math.sin(a * (n + 3) + 0.4); return [Math.cos(a) * r * k * 10, Math.sin(a) * r * k * 10] as Pt; });
}
/** a falling drop, its round end down (unit size) */
function dropPts(): Pt[] {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 16;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
}

// ── the wall of coffee (shot 1): it leaves the cup (frame px `from`) on the release, flies at her face (`to`) as a stream that fattens, and on the hit bursts into a crown of splashes that fly out and fall; Goo merges the
// discs into one liquid with an ink line. `u` 0..1 the flight, `age` seconds since the hit (< 0 before it)
export function CoffeeWall({ from, to, u, age, order }: { from: [number, number]; to: [number, number]; u: number; age: number; order: number }) {
  const sp: Sprite[] = [];
  const P = (x: number, y: number) => ({ x: x - 540, y: 960 - y });
  if (age < 0) {
    for (let i = 0; i < 44; i++) { // the sheet: from the cup to its front, widening toward the front, ragged at its edges
      const v = (i / 43) * u, x = lerp(from[0], to[0], v), y = lerp(from[1], to[1], v) - 90 * Math.sin(Math.PI * v);
      const r = 26 + 150 * v * v, j = (hash(i * 3.1) - 0.5) * r * 1.1, k = (hash(i * 5.7) - 0.5) * r * 0.6;
      sp.push({ ...P(x + j, y + k), r: r * (0.75 + 0.35 * hash(i * 1.3)), a: 0.95 });
    }
    for (let i = 0; i < 12; i++) { // droplets thrown ahead and round the front
      const v = u * (0.7 + 0.35 * hash(i * 2.9)), x = lerp(from[0], to[0], v) + (hash(i * 4.4) - 0.5) * 420, y = lerp(from[1], to[1], v) - 90 * Math.sin(Math.PI * v) + (hash(i * 6.1) - 0.5) * 300;
      sp.push({ ...P(x, y), r: 14 + 18 * hash(i * 8.8), a: 0.95 });
    }
  } else {
    for (let i = 0; i < 46; i++) { // the crown: splashes thrown out from the rim of her face, flying out and falling
      const ang = (i / 46) * Math.PI * 2 + 0.3 * hash(i * 7.7), v = 900 + 1100 * hash(i * 2.3), r = 18 + 40 * hash(i * 5.1), r0 = 165 + 40 * hash(i * 3.3);
      const x = to[0] + Math.cos(ang) * (r0 + v * age), y = to[1] + Math.sin(ang) * (r0 + v * age) + 2600 * age * age;
      sp.push({ ...P(x, y), r: r * (1 - 0.55 * Math.min(1, age / 0.35)), a: 0.95 });
    }
  }
  return <Goo sprites={sp} order={order} fill={COFFEE.fill} ink={COFFEE.ink} ow={3} th={0.4} res={0.5} />;
}
/** drops that hit the lens (frame px, screen space, over everything): they pop on in a few frames after the hit and run down slowly */
export function LensDrops({ age, order }: { age: number; order: number }) {
  if (age < 0.02) return null;
  const D: [number, number, number, number][] = [[230, 520, 70, 0.02], [820, 380, 52, 0.04], [690, 1210, 88, 0.03], [300, 1500, 60, 0.06], [960, 1040, 44, 0.05]];
  return (
    <>
      {D.map(([x, y, r, t0], i) => {
        const a = age - t0;
        if (a < 0) return null;
        const p = Math.min(1, a / 0.05), yy = y + 60 * a * a;
        const pts = xf(blobPts(r / 10, 5 + i), x - 540, 960 - yy, i * 40, p, p * 1.15);
        return (
          <React.Fragment key={i}>
            <Poly pts={pts} color={COFFEE.fill} order={order} op={0.62} />
            <Poly pts={xf(ellipsePts(0, 0, r * 0.28, r * 0.18, 16), x - 540 - r * 0.3, 960 - yy + r * 0.35, 30, p)} color="#e8c9a4" order={order + 0.1} op={0.5} />
          </React.Fragment>
        );
      })}
    </>
  );
}
/** the splash of the puddle when Todd lands in it (frame px of the impact, `age` s since it) */
export function PuddleSplash({ at, age, order, k = 1 }: { at: [number, number]; age: number; order: number; k?: number }) {
  if (age < 0 || age > 0.6) return null;
  const sp: Sprite[] = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, ang = (0.15 + 0.6 * hash(i * 4.3)) * Math.PI, v = (500 + 700 * hash(i * 1.7)) * k;
    const x = at[0] + side * Math.cos(ang) * v * age, y = at[1] - Math.sin(ang) * v * age + 2400 * age * age;
    if (y > at[1] + 30) continue;
    sp.push({ x: x - 540, y: 960 - y, r: (14 + 20 * hash(i * 6.6)) * k * (1 - age / 0.7), a: 0.95 });
  }
  return <Goo sprites={sp} order={order} fill={COFFEE.fill} ink={COFFEE.ink} ow={2.5} th={0.4} res={0.5} />;
}

// ── Denise's swim goggles (head px of the deniseHood rig): two lenses round her eyes with a dark rim, a bridge, the strap round her head
export function Goggles({ order }: { order: number }) {
  const E: [number, number][] = [[-56.5, 208.5], [59, 208]];
  const rim = "#1d3a5c", lens = "#8ed6ff";
  return (
    <>
      <Poly pts={ribbon([[-176, 214, 30], [-118, 210, 30]])} color={rim} order={order} />
      <Poly pts={ribbon([[121, 210, 30], [178, 214, 30]])} color={rim} order={order} />
      <Poly pts={ribbon([[-6, 214, 14], [8, 214, 14]])} color={rim} order={order + 0.1} />
      {E.map(([x, y], i) => (
        <React.Fragment key={i}>
          <Inked pts={ellipsePts(x, y, 76, 82, 40)} color={lens} ink={rim} w={13} order={order + 0.2} op={0.38} />
          <Poly pts={xf(ribbon([[-26, 30, 9], [-8, 50, 9]]), x, y)} color="#ffffff" order={order + 0.3} op={0.7} />
        </React.Fragment>
      ))}
    </>
  );
}

// ── the bare foot, seen from the sole: the heel down on the counter, the toes up. (x, y) is the middle of the sole (panel px), `s` px per unit (heel to toe tips: 446 units), turned `rot`; the toes wiggle by `wig` (-1..1).
// Her trouser leg recedes from the heel to the lower right. Skin of her face, the pads a little pinker
/** a smooth closed curve through control points (Catmull-Rom, `n` points per span) */
function smoothClosed(c: Pt[], n = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < c.length; i++) {
    const p0 = c[(i - 1 + c.length) % c.length], p1 = c[i], p2 = c[(i + 1) % c.length], p3 = c[(i + 2) % c.length];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as Pt);
    }
  }
  return out;
}
// the sole, y up: the heel at the bottom (y -172), the big toe's side on the left, the ball wide (y 60-150), the inner arch pinched (y -44..24)
const SOLE: Pt[] = smoothClosed([[0, -172], [52, -152], [76, -100], [72, -20], [86, 60], [96, 120], [74, 160], [24, 176], [-38, 182], [-86, 154], [-98, 92], [-62, 24], [-52, -44], [-70, -112], [-48, -158]]);
const TOES: [number, number, number, number][] = [[-56, 214, 33, 40], [-6, 232, 22, 27], [30, 228, 19, 24], [61, 213, 16, 21], [86, 190, 13, 17]];
export function Foot({ x, y, s = 1, rot = 0, wig = 0, leg = true, order }: { x: number; y: number; s?: number; rot?: number; wig?: number; leg?: boolean; order: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, s);
  const ink = INK.customer, lw = 3.2 * s;
  return (
    <>
      {leg && <Inked pts={T(ribbon([[40, -150, 150], [150, -330, 175], [330, -620, 210]]))} color={TROUSER} ink="#18181c" w={lw} order={order} />}
      <Inked pts={T(SOLE)} color="#ffd29c" ink={ink} w={lw} order={order + 0.2} />
      <Poly pts={T(xf(ellipsePts(0, 0, 58, 34, 28), 4, 112, -6))} color="#ffb08a" order={order + 0.3} op={0.55} />
      <Poly pts={T(xf(ellipsePts(0, 0, 44, 36, 28), 0, -126))} color="#ffb08a" order={order + 0.3} op={0.55} />
      <Poly pts={T(ribbon([[-40, 40, 3], [-10, 52, 3.5], [20, 46, 3]]))} color={ink} order={order + 0.35} op={0.3} />
      {TOES.map(([tx, ty, rx, ry], i) => {
        const w = wig * (i % 2 ? 1 : -1) * 8;
        return <Inked key={i} pts={T(xf(ellipsePts(0, 0, rx, ry, 22), tx + w * 0.4, ty + Math.abs(w), -10 + i * 9))} color="#ffd29c" ink={ink} w={lw} order={order + 0.4 - i * 0.01} />;
      })}
    </>
  );
}

// ── smoke off the foot: puffs born along the sole, rising and growing, merged by Goo (frame px of the sole's middle and its half width; `t` seconds since the rub started, `on` whether it is still smoking)
export function Smoke({ at, hw, t, order, k = 1, op = 0.92 }: { at: [number, number]; hw: number; t: number; order: number; k?: number; op?: number }) {
  if (t < 0) return null;
  const sp: Sprite[] = [];
  for (let i = 0; i < 40; i++) {
    const tb = i * 0.045, a = t - tb, life = 0.9 + 0.5 * hash(i * 3.3);
    if (a < 0 || a > life) continue;
    const u = a / life, x = at[0] + (hash(i * 1.9) * 2 - 1) * hw + Math.sin(a * 4 + i) * 22, y = at[1] - (260 + 160 * hash(i * 2.7)) * a;
    sp.push({ x: x - 540, y: 960 - y, r: (18 + 46 * u) * k, a: 0.9 * (1 - u) * Math.min(1, u * 8) });
  }
  return <Goo sprites={sp} order={order} fill="#d3cec6" ink="#78736b" ow={2.5} th={0.35} opacity={op} res={0.5} />;
}

// ── the dog's back leg, kicking out of the purse (px of the dog's picture, src/lips-rig.json props.dog: 529 x 522, y down; drawn in the dog's own group, so y is flipped here): a leg from the hip at the purse's rim, turned by `kick`
export function DogLeg({ kick, order }: { kick: number; order: number }) {
  const hip: Pt = [440 - 529 / 2, 522 / 2 - 480];
  const a = (-20 + 40 * kick) * D2R, L = 200;
  const knee: Pt = [hip[0] + Math.cos(a) * L * 0.55, hip[1] + Math.sin(a) * L * 0.55], foot: Pt = [hip[0] + Math.cos(a - 0.6) * L, hip[1] + Math.sin(a - 0.6) * L];
  return (
    <>
      <Inked pts={ribbon([[hip[0], hip[1], 70], [knee[0], knee[1], 52], [foot[0], foot[1], 40]])} color="#dfac66" ink="#5a3c1c" w={6} order={order} />
      <Inked pts={ellipsePts(foot[0] + 10, foot[1], 38, 26, 18)} color="#dfac66" ink="#5a3c1c" w={6} order={order + 0.1} />
    </>
  );
}

// ── the bill: a plain green note with a $ in a circle and 20 in the corners (no real design), w x h at s = 1, its middle at (x, y)
export function Bill({ x, y, s = 1, rot = 0, order }: { x: number; y: number; s?: number; rot?: number; order: number }) {
  const tex = useCanvasTexture(440, 200, (g) => {
    g.fillStyle = "#9fcf8f"; g.fillRect(0, 0, 440, 200);
    g.strokeStyle = "#2f6b33"; g.lineWidth = 10; g.strokeRect(5, 5, 430, 190);
    g.lineWidth = 4; g.strokeRect(22, 22, 396, 156);
    g.beginPath(); g.ellipse(220, 100, 60, 60, 0, 0, Math.PI * 2); g.fillStyle = "#c9e8bd"; g.fill(); g.stroke();
    g.fillStyle = "#2f6b33"; g.font = "900 84px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 220, 104);
    g.font = "900 40px Arial, Helvetica, sans-serif"; g.fillText("20", 58, 52); g.fillText("20", 382, 150);
  }, []);
  return <Plane tex={tex} x={x} y={y} w={220 * s} h={100 * s} rot={rot} order={order} />;
}

// ── the tip jar of "Tip?" (public/sp/tip-jar.png: 519 x 943, its label's box [90, 337, 430, 611]) with DENISE / TIPS on the label and her few coins and a bill, its middle at (x, y), k px per picture px
export function TipJar({ x, y, k, rot = 0, order }: { x: number; y: number; k: number; rot?: number; order: number }) {
  const J = { w: 519, h: 943, label: [90, 337, 430, 611] };
  const lw = J.label[2] - J.label[0], lh = J.label[3] - J.label[1];
  const tex = useCanvasTexture(lw * 2, lh * 2, (g) => {
    g.clearRect(0, 0, lw * 2, lh * 2);
    g.fillStyle = "#1b2a3a"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `900 ${Math.round(lh * 0.5)}px Arial, Helvetica, sans-serif`; g.fillText("DENISE", lw, lh * 0.66);
    g.font = `900 ${Math.round(lh * 0.42)}px Arial, Helvetica, sans-serif`; g.fillText("TIPS", lw, lh * 1.42);
  }, []);
  const lx = (J.label[0] + J.label[2]) / 2 - J.w / 2, ly = J.h / 2 - (J.label[1] + J.label[3]) / 2;
  return (
    <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[k, k, 1]}>
      <Picture file="sp/tip-jar.png" w={J.w} h={J.h} order={order} alpha />
      <Plane tex={tex} x={lx} y={ly} w={lw * 0.94} h={lh * 0.9} order={order + 0.5} />
    </group>
  );
}

// ── her hand with the phone (public/sp/lips-handphone.png, the review insert's hand), the screen toward the camera: one star, TOO HOT, and a giant red POST button. Drawn as a texture; `glow` 0..1 makes the button pulse
const PH = { w: 300, h: 715 };
function drawPost(g: G, glow: number) {
  g.fillStyle = "#f6f7f9"; g.fillRect(0, 0, PH.w, PH.h);
  text(g, "Write a review", 150, 70, 26, "#1b2430", { weight: 800 });
  for (let i = 0; i < 5; i++) {
    g.save(); g.translate(46 + i * 52, 150);
    g.beginPath();
    for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + (j * Math.PI) / 5, r = j % 2 ? 10 : 23; g[j ? "lineTo" : "moveTo"](r * Math.cos(a), r * Math.sin(a)); }
    g.closePath(); if (i === 0) { g.fillStyle = "#f5b50a"; g.fill(); }
    g.lineWidth = 2.6; g.strokeStyle = i === 0 ? "#b27d00" : "#b4bcc7"; g.stroke(); g.restore();
  }
  rr(g, 18, 210, 264, 150, 12); g.fillStyle = "#fbfbfc"; g.fill(); g.strokeStyle = "#cfd5dc"; g.lineWidth = 2; g.stroke();
  text(g, "TOO HOT!!!", 150, 296, 44, "#101418", { weight: 900 });
  const r0 = 26 + 10 * glow;
  rr(g, 18, 420 - r0 * 0.2, 264, 230 + r0 * 0.4, 40); g.fillStyle = glow > 0.5 ? "#ff2a2a" : "#e3121b"; g.fill();
  text(g, "POST", 150, 572, 96, "#ffffff", { weight: 900 });
}
export function PostPhone({ x, y, k, rot = 0, glow = 0, order }: { x: number; y: number; k: number; rot?: number; glow?: number; order: number }) {
  const [pic, hand] = useImages(["sp/lips-handphone.png", "sp/lips-handphone-hand.png"]), P = HAND_PHONE, K = 2;
  const key = Math.round(glow * 4);
  const tex = useCanvasTexture(P.w * K, P.h * K, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
    const ui = document.createElement("canvas"); ui.width = P.w * K; ui.height = P.h * K;
    const u = ui.getContext("2d")!, x0 = -P.sw / 2, y0 = -P.sh / 2;
    u.save(); u.scale(K, K); u.translate(P.cx, P.cy); u.rotate(P.rot * D2R);
    u.beginPath(); u.roundRect(x0, y0, P.sw, P.sh, P.r); u.clip();
    u.fillStyle = "#ffffff"; u.fillRect(x0, y0, P.sw, P.sh);
    u.save(); u.translate(x0, y0 + P.top); u.scale(P.sw / PH.w, (P.sh - P.top) / PH.h); drawPost(u, key / 4); u.restore();
    u.fillStyle = "#08090b"; u.beginPath(); u.roundRect(-46, y0 - 1, 92, 23, [0, 0, 11, 11]); u.fill();
    u.restore();
    g.drawImage(ui, 0, 0);
    g.drawImage(hand.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
  }, [pic, hand, key]);
  return <Plane tex={tex} x={x} y={y} w={P.w * k} h={P.h * k} rot={rot} order={order} />;
}

// ── her arm over the camera's shoulder (shots 1 and 31): the back of her bob and her shoulder in the lower right corner, the sleeve and the hand reaching toward Denise, the cup in it. `swing` 0 = cocked back (the hand by
// her shoulder), 1 = whipped forward (the hand at `target`, frame px). The cup tips forward as she throws; `cup` = whether there is coffee in it (the wind-up) or it is empty (after the release)
export function OverShoulder({ swing, target, full, order }: { swing: number; target: [number, number]; full: boolean; order: number }) {
  const F = (x: number, y: number): [number, number] => [x - 540, 960 - y];
  const sh: [number, number] = [1060, 1900], back: [number, number] = [840, 1420];
  const hx = lerp(back[0], target[0], swing), hy = lerp(back[1], target[1], swing) - 140 * Math.sin(Math.PI * swing);
  const el: [number, number] = [lerp(sh[0], hx, 0.5) + 90 * (1 - swing), lerp(sh[1], hy, 0.5) + 40];
  const width = (a: number) => 280 - 90 * a;
  const sleeve = ribbon([[...F(sh[0], sh[1]), width(0)], [...F(el[0], el[1]), width(0.5)], [...F(hx + 30, hy + 60), width(1)]]);
  const tilt = -20 + 75 * swing; // the cup tips toward Denise (its mouth up and to the left) as the arm comes forward
  const cx = hx - 10, cy = hy - 170;
  return (
    <>
      <Inked pts={xf(ellipsePts(0, 0, 300, 260, 48), ...F(1140, 1900))} color={COAT.fill} ink={COAT.ink} w={5} order={order} />
      <Inked pts={xf(roundRect(420, 760, 190), ...F(1110, 1400), -8)} color={HAIR.fill} ink={HAIR.ink} w={5} order={order + 0.5} />
      {[0, 1, 2, 3].map((i) => <Poly key={i} pts={xf(ribbon([[0, 300, 6], [6, -320, 6]]), ...F(950 + i * 40, 1440), -8)} color={HAIR.ink} order={order + 0.6} op={0.35} />)}
      <Inked pts={xf(roundRect(190, 92, 40), ...F(1000, 1090), -14)} color="#111114" ink="#000000" w={4} order={order + 0.7} />
      <Poly pts={xf(ribbon([[-90, 10, 12], [-150, -10, 10]]), ...F(1000, 1090), -14)} color="#111114" order={order + 0.7} />
      <Poly pts={xf(ribbon([[-50, 22, 8], [10, 30, 8]]), ...F(1000, 1090), -14)} color="#ffffff" order={order + 0.75} op={0.35} />
      <Inked pts={sleeve} color={COAT.fill} ink={COAT.ink} w={5} order={order + 1} />
      <Cup x={F(cx, cy)[0]} y={F(cx, cy)[1]} s={2.1} rot={tilt} order={order + 1.5} lid={false} />
      {full && <Poly pts={xf(ellipsePts(0, 0, 52, 16, 20), ...F(cx - 160 * Math.sin(tilt * D2R), cy - 158 * Math.cos(tilt * D2R)), tilt, 2.1)} color={COFFEE.fill} order={order + 1.6} />}
      <Mitten x={F(hx, hy)[0]} y={F(hx, hy)[1]} rot={-20 + 30 * swing} s={3.0} skin={SKIN.customer} ink={INK.customer} order={order + 2} lw={5} />
    </>
  );
}

// ── the hair dryer's hot air onto Todd's raised hand (shot 27): thin translucent white strokes from the nozzle's end (frame px) to the hand
export function AirTo({ from, to, t, order }: { from: [number, number]; to: [number, number]; t: number; order: number }) {
  const F = (x: number, y: number) => [x - 540, 960 - y];
  return (
    <>
      {[-24, -8, 8, 24].map((off, i) => {
        const pts: number[][] = [], n = 12, ph = t * 22 + i * 1.9;
        for (let k = 0; k <= n; k++) {
          const u = k / n, wob = Math.sin(u * 8 + ph) * (2 + 6 * u);
          const [x, y] = F(lerp(from[0], to[0], u), lerp(from[1], to[1], u) + off * (0.4 + u) + wob);
          pts.push([x, y, 1.6 + 3.4 * Math.sin(Math.PI * Math.min(1, u * 1.2))]);
        }
        return <Poly key={i} pts={ribbon(pts)} color="#ffffff" order={order + i} op={0.7} />;
      })}
    </>
  );
}
export { inkAt };
