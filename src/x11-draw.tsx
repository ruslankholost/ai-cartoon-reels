import React from "react";
import { Glow, Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Goo, hash, smooth, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { InkPlane } from "./x10-ui";
import { FPS, steamLevel, twos } from "./x11-sched";
import type { G } from "./pen-ui";

// The effects and props of x11 "Are You Open?" that are drawn in code (src/x11-scenes.tsx places them): the door (its frame, the glass and its sheen, the sign that flips, the roller blind), the clocks, the traffic light's glow and the street streaking
// in the rear window, the marks of a face pressed on glass, the bubbles of the bath and of its boil, the steam, the bubbles in his hair, a grin that is too wide, cucumber slices, bulging eyes, the lights of the shop, the door's bell.
// Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up, origin in the middle) elsewhere, head px (from the neck pivot, y up) for what goes on a head.
// Every particle is a closed-form function of the age it is given (hashed velocities and lifetimes): nothing reads a clock or a random source.
const W = 1080, H = 1920;
export const PX = (x: number) => x - W / 2, PY = (y: number) => H / 2 - y;
/** a rectangle of frame px (x0, y0 top left .. x1, y1 bottom right) as panel points */
export const FR = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[PX(x0), PY(y0)], [PX(x1), PY(y0)], [PX(x1), PY(y1)], [PX(x0), PY(y1)]];
export const FP = (pts: [number, number][]): Pt[] => pts.map(([x, y]) => [PX(x), PY(y)] as Pt);
const INK = "#1c1008";
const D2R = Math.PI / 180;

// ═════════════════════════════════════════════════════ the door: its frame round a pane of glass (frame px)
export const GLASS = { x0: 70, y0: 150, x1: 1010, y1: 1560 };
/** the door's wood round the glass: seen from the street (dark, the handle on the right) or from inside (lighter, the handle on the left); the bottom panel is solid */
export function DoorFrame({ side, order }: { side: "street" | "inside"; order: number }) {
  const g = GLASS, wood = side === "street" ? "#5a4028" : "#8c6238", light = side === "street" ? "#7c5c3a" : "#b4824a", dark = side === "street" ? "#46301c" : "#6e4a28";
  const hx = side === "street" ? 1030 : 28;
  return (
    <>
      <Poly pts={FR(0, 0, g.x0, H)} color={wood} order={order} />
      <Poly pts={FR(g.x1, 0, W, H)} color={wood} order={order} />
      <Poly pts={FR(g.x0, 0, g.x1, g.y0)} color={wood} order={order} />
      <Poly pts={FR(0, g.y1, W, H)} color={wood} order={order} />
      <Poly pts={FR(g.x0 - 18, g.y0 - 18, g.x0, g.y1 + 18)} color={light} order={order + 0.1} />
      <Poly pts={FR(g.x1, g.y0 - 18, g.x1 + 18, g.y1 + 18)} color={light} order={order + 0.1} />
      <Poly pts={FR(g.x0 - 18, g.y0 - 18, g.x1 + 18, g.y0)} color={light} order={order + 0.1} />
      <Poly pts={FR(g.x0 - 18, g.y1, g.x1 + 18, g.y1 + 18)} color={light} order={order + 0.1} />
      <Poly pts={FR(g.x0 - 4, g.y0 - 4, g.x0 + 3, g.y1 + 4)} color={INK} order={order + 0.2} />
      <Poly pts={FR(g.x1 - 3, g.y0 - 4, g.x1 + 4, g.y1 + 4)} color={INK} order={order + 0.2} />
      <Poly pts={FR(g.x0 - 4, g.y0 - 4, g.x1 + 4, g.y0 + 3)} color={INK} order={order + 0.2} />
      <Poly pts={FR(g.x0 - 4, g.y1 - 3, g.x1 + 4, g.y1 + 4)} color={INK} order={order + 0.2} />
      <Inked pts={FR(150, g.y1 + 70, 930, 1800)} color={dark} ink={INK} w={4} order={order + 0.1} />
      <Inked pts={FR(40, 1830, 1040, 1900)} color="#c9a227" ink="#4d3606" w={4} order={order + 0.3} />
      <Inked pts={FR(hx, 760, hx + 26, 1180)} color="#d8b43a" ink="#4d3606" w={3.5} order={order + 0.4} />
      <Inked pts={FR(hx - (side === "street" ? 8 : -8), 790, hx + 28, 812)} color="#b8921e" ink="#4d3606" w={3} order={order + 0.35} />
      <Inked pts={FR(hx - (side === "street" ? 8 : -8), 1130, hx + 28, 1152)} color="#b8921e" ink="#4d3606" w={3} order={order + 0.35} />
    </>
  );
}
/** the sheen on the glass: two slanted bands of light and a faint cool wash over the whole pane */
export function GlassSheen({ order, op = 1 }: { order: number; op?: number }) {
  const g = GLASS;
  return (
    <>
      <Poly pts={FR(g.x0, g.y0, g.x1, g.y1)} color="#cfe6f4" order={order} op={0.07 * op} />
      <Poly pts={FP([[500, g.y0], [640, g.y0], [340, g.y1], [200, g.y1]])} color="#ffffff" order={order + 0.1} op={0.17 * op} />
      <Poly pts={FP([[690, g.y0], [740, g.y0], [440, g.y1], [390, g.y1]])} color="#ffffff" order={order + 0.1} op={0.13 * op} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the sign that hangs on the glass: a card on a string from a suction cup, green OPEN on one side, red CLOSED on the other
export const CARD = { w: 320, h: 180 };
export function drawCard(g: G, s: { word: string }) {
  const open = s.word === "OPEN";
  g.save();
  g.beginPath(); g.roundRect(3, 3, CARD.w - 6, CARD.h - 6, 18); g.fillStyle = open ? "#2e9e4f" : "#c8202b"; g.fill();
  g.lineWidth = 8; g.strokeStyle = "#ffffff"; g.stroke();
  g.beginPath(); g.roundRect(3, 3, CARD.w - 6, CARD.h - 6, 18); g.lineWidth = 3; g.strokeStyle = "#1c1008"; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff";
  g.font = `900 ${open ? 90 : 66}px Arial, Helvetica, sans-serif`;
  g.fillText(s.word, CARD.w / 2, CARD.h / 2 + 4);
  g.restore();
}
/** the sign: its suction cup at frame (x, y), the string, the card turning about it (`turn` 0..1 = a half turn: the width goes with |cos|), swinging `swing` degrees about the cup */
export function SignCard({ x, y, turn, word, swing = 0, order, ready = true }: { x: number; y: number; turn: number; word: "OPEN" | "CLOSED"; swing?: number; order: number; ready?: boolean }) {
  const L = 70, wd = Math.max(0.035, Math.abs(Math.cos(Math.PI * turn))), a = swing * D2R, d = L + CARD.h / 2;
  const cx = PX(x) + d * Math.sin(a), cy = PY(y) - d * Math.cos(a);
  return (
    <>
      <Poly pts={xf(ribbon([[0, 0, 3.4], [0, -L - 6, 3.4]]), PX(x), PY(y), swing)} color="#2a2018" order={order} />
      <Inked pts={ellipsePts(PX(x), PY(y), 17, 17, 20)} color="#dfe6ea" ink="#4a5057" w={3} order={order + 0.1} />
      <InkPlane x={cx} y={cy} w={CARD.w * wd} h={CARD.h} cw={CARD.w} ch={CARD.h} rot={swing} order={order + 0.3} state={{ word }} draw={drawCard} ready={ready} />
    </>
  );
}

// ═════════════════════════════════════════════════════ clocks
/** a wall clock's face is blank in the plate: twelve ticks, an hour hand and a minute hand at `hour` and `minute`; r the face's radius, (x, y) its middle (panel px) */
export function ClockHands({ x, y, r, hour, minute, order, shake = 0 }: { x: number; y: number; r: number; hour: number; minute: number; order: number; shake?: number }) {
  const ink = "#1b1b20", dir = (deg: number): [number, number] => [Math.sin(deg * D2R), Math.cos(deg * D2R)];
  const hand = (deg: number, len: number, w: number): Pt[] => { const [dx, dy] = dir(deg); return ribbon([[-dx * 0.14 * r, -dy * 0.14 * r, w * 0.7], [dx * 0.1 * r, dy * 0.1 * r, w], [dx * len * r, dy * len * r, w * 0.4]]); };
  const X = x + shake;
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => { const [dx, dy] = dir(i * 30), big = i % 3 === 0; return <Poly key={i} pts={xf(ribbon([[dx * (big ? 0.76 : 0.82) * r, dy * (big ? 0.76 : 0.82) * r, big ? 0.075 * r : 0.045 * r], [dx * 0.93 * r, dy * 0.93 * r, big ? 0.075 * r : 0.045 * r]]), X, y)} color={ink} order={order} />; })}
      <Poly pts={xf(hand(((hour % 12) + minute / 60) * 30, 0.5, 0.1 * r), X, y)} color={ink} order={order + 0.1} />
      <Poly pts={xf(hand(minute * 6, 0.76, 0.07 * r), X, y)} color={ink} order={order + 0.1} />
      <Poly pts={xf(ellipsePts(0, 0, 0.075 * r, 0.075 * r, 16), X, y)} color="#c8202b" order={order + 0.2} />
    </>
  );
}
// seven segments: a, b, c, d, e, f, g
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
export const LED = { w: 340, h: 190 };
/** the digits of a clock's screen (340 x 190 units): `digits` like "11:48", seven-segment, with `sub` ("PM") small under the right end */
export function drawLed(g: G, s: { digits: string; sub: string; color: string; dim: string }) {
  const n = s.digits.replace(":", "").length, hh = 104, dw = hh * 0.52, gap = 12, colonW = 22, total = n * dw + (n - 1) * gap + (s.digits.includes(":") ? colonW + gap : 0), t = hh * 0.13;
  let x = (LED.w - total) / 2; const y0 = 20;
  g.save(); g.shadowColor = s.color; g.shadowBlur = 14;
  const seg = (k: string, x0: number, on: boolean) => {
    g.fillStyle = on ? s.color : s.dim;
    const h2 = hh / 2, v = { a: [x0 + t * 0.6, y0, dw - t * 1.2, t], b: [x0 + dw - t, y0 + t * 0.6, t, h2 - t * 1.2], c: [x0 + dw - t, y0 + h2 + t * 0.6, t, h2 - t * 1.2], d: [x0 + t * 0.6, y0 + hh - t, dw - t * 1.2, t], e: [x0, y0 + h2 + t * 0.6, t, h2 - t * 1.2], f: [x0, y0 + t * 0.6, t, h2 - t * 1.2], g: [x0 + t * 0.6, y0 + h2 - t / 2, dw - t * 1.2, t] }[k]!;
    g.beginPath(); g.roundRect(v[0], v[1], v[2], v[3], 3); g.fill();
  };
  for (const ch of s.digits) {
    if (ch === ":") { g.fillStyle = s.color; g.beginPath(); g.arc(x + colonW / 2, y0 + hh * 0.3, 6.5, 0, 7); g.arc(x + colonW / 2, y0 + hh * 0.7, 6.5, 0, 7); g.fill(); x += colonW + gap; continue; }
    g.shadowBlur = 0; for (const k of "abcdefg") seg(k, x, false); g.shadowBlur = 14;
    for (const k of SEG[ch]) seg(k, x, true);
    x += dw + gap;
  }
  g.shadowBlur = 8; g.fillStyle = s.color; g.font = "900 40px Arial, Helvetica, sans-serif"; g.textAlign = "right"; g.textBaseline = "alphabetic";
  g.fillText(s.sub, (LED.w + total) / 2, y0 + hh + 46);
  g.restore();
}
/** a clock's screen: `digits` and `sub` (AM / PM) on a blank dark screen of w x h panel px with its middle at (x, y) */
export function LedClock({ x, y, w, h, digits, sub, color = "#7dffb0", dim = "#10241a", order, rot = 0 }: { x: number; y: number; w: number; h: number; digits: string; sub: string; color?: string; dim?: string; order: number; rot?: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={LED.w} ch={LED.h} order={order} rot={rot} state={{ digits, sub, color, dim }} draw={drawLed} />;
}

// ═════════════════════════════════════════════════════ the venetian blind (frame px): 31 cream slats, each a band with a dark line on its top edge, a light line under it and a soft shadow under its bottom edge; a wooden head rail at the top, a wooden rail
// and a pull cord with a ring at the bottom
/** `fall` 0..1: how far down the bottom rail is (the slats are spread evenly from the top of the glass to the rail, so they are a tight stack while it is high and open up as it falls); `bump` 0..1.4: a face presses into the slats from behind, round
 *  the ellipse `c` (frame px centre) `r` (radii): the slats above its middle bend up and the ones below bend down round it, the slats there are thicker (they are closer) and a pale dome with a shadow on its far side sits over it; `sway` the cord's swing in degrees */
export function Venetian({ fall, bump = 0, c = [540, 720], r = [470, 400], sway = 0, order }: { fall: number; bump?: number; c?: [number, number]; r?: [number, number]; sway?: number; order: number }) {
  const g = GLASS, N = 31, K = 24, yb = g.y0 + (g.y1 - g.y0) * fall + 6, pitch = (yb - g.y0) / N, hS = Math.max(46, pitch + 5);
  const xs = Array.from({ length: K + 1 }, (_, k) => g.x0 + ((g.x1 - g.x0) * k) / K);
  const disp = (x: number, y: number) => { const sx = (x - c[0]) / r[0], sy = (y - c[1]) / r[1], w = Math.exp(-1.15 * (sx * sx + sy * sy)); return { dy: bump * 98 * w * Math.tanh(2.4 * sy), w }; };
  const edge = (y: number, off: number): Pt[] => xs.map((x) => { const d = disp(x, y); return [PX(x), PY(y + d.dy + off * d.w * bump)] as Pt; });
  const band = (y0: number, y1: number, o0 = 0, o1 = 0): Pt[] => [...edge(y0, o0), ...edge(y1, o1).reverse()];
  const slats = Array.from({ length: N }, (_, i) => g.y0 + i * pitch);
  return (
    <>
      <Inked pts={FR(g.x0 - 18, g.y0 - 40, g.x1 + 18, g.y0 + 6)} color="#8a7a54" ink={INK} w={3.4} order={order} />
      {slats.map((y, i) => <Poly key={`b${i}`} pts={band(y, y + hS, -7, 7)} color="#efe6cc" order={order + 0.1 + i * 0.002} />)}
      {slats.map((y, i) => <Poly key={`s${i}`} pts={band(y + hS - 2, y + hS + 11, 7, 7)} color="#4a3c20" order={order + 0.5} op={0.3} />)}
      {slats.map((y, i) => <Poly key={`h${i}`} pts={band(y + 3, y + 8, -7, -7)} color="#fffbea" order={order + 0.55} op={0.6} />)}
      {slats.map((y, i) => <Poly key={`t${i}`} pts={band(y, y + 2.6, -7, -7)} color="#8f7f55" order={order + 0.6} />)}
      {bump > 0.02 && (
        <>
          <Poly pts={xf(ellipsePts(0, 0, r[0] * 0.93, r[1] * 0.9, 40), PX(c[0] + 26), PY(c[1] - 34))} color="#3a2c14" order={order + 0.7} op={0.1 * Math.min(1, bump)} />
          <Poly pts={xf(ellipsePts(0, 0, r[0] * 0.9, r[1] * 0.86, 40), PX(c[0] - 14), PY(c[1] + 12))} color="#ffe9c4" order={order + 0.75} op={0.24 * Math.min(1, bump)} />
        </>
      )}
      <Inked pts={FR(g.x0 - 8, yb - 8, g.x1 + 8, yb + 30)} color="#8a6a3a" ink={INK} w={4} order={order + 0.8} />
      <Poly pts={xf(ribbon([[0, 0, 5], [0, -150, 5]]), PX(g.x1 - 90), PY(yb + 30), sway)} color="#6a5230" order={order + 0.8} />
      <Inked pts={xf(ellipsePts(0, 0, 19, 19, 20), PX(g.x1 - 90) + 150 * Math.sin(sway * D2R), PY(yb + 30) - 150 * Math.cos(sway * D2R))} color="#c9a227" ink="#4d3606" w={3.5} order={order + 0.85} />
    </>
  );
}

// ═════════════════════════════════════════════════════ a face pressed on glass: the patch it leaves, the breath, the star of the hit (frame px)
/** the pressed patch and the two palms: pale, a little pink, on the glass; k 0..1 how strong (the hit is 1, it relaxes to about 0.55) */
export function PressPatch({ cx, cy, rx, ry, palms, k, order }: { cx: number; cy: number; rx: number; ry: number; palms: [number, number, number][]; k: number; order: number }) {
  return (
    <>
      <Poly pts={xf(ellipsePts(0, 0, rx * 1.06, ry * 1.06, 40), PX(cx), PY(cy))} color="#fbeee6" order={order} op={0.2 * k} />
      {palms.map(([px, py, r], i) => <Poly key={i} pts={xf(ellipsePts(0, 0, r, r * 1.25, 28), PX(px), PY(py))} color="#fbeee6" order={order} op={0.2 * k} />)}
    </>
  );
}
/** the breath on the glass in front of the mouth: a soft white glow that swells with the voice */
export const Fog = ({ x, y, rx, ry, op, order }: { x: number; y: number; rx: number; ry: number; op: number; order: number }) => <Glow x={PX(x)} y={PY(y)} rx={rx} ry={ry} op={op} order={order} color="rgba(255,255,255,1)" />;
/** the star of the hit: short spikes thrown out of the rim of the face (frame px centre, radius), fading over 0.16 s */
export function Impact({ cx, cy, r, age, order }: { cx: number; cy: number; r: number; age: number; order: number }) {
  if (age < 0 || age > 0.16) return null;
  const u = age / 0.16;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.15 * hash(i * 2.3), r0 = r * (1.02 + 0.2 * u), r1 = r * (1.16 + 0.42 * u + 0.12 * hash(i * 4.1));
        return <Poly key={i} pts={ribbon([[PX(cx) + Math.cos(a) * r0, PY(cy) - Math.sin(a) * r0 * 0.9, r * 0.05 * (1 - u)], [PX(cx) + Math.cos(a) * r1, PY(cy) - Math.sin(a) * r1 * 0.9, r * 0.012]])} color="#fff6c8" order={order} op={1 - u} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the street streaking past the rear window of the car (frame px rectangle): lights stretched into lines out of the middle
export function Streaks({ rect, speed, age, order }: { rect: [number, number, number, number]; speed: number; age: number; order: number }) {
  if (speed < 0.02) return null;
  const [x0, y0, x1, y1] = rect, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + 20;
  return (
    <>
      {Array.from({ length: 48 }, (_, i) => {
        const h = (q: number) => hash(i * q + 5.5), a = (h(1.3) - 0.5) * 2.9 + Math.PI / 2 * (i % 2 ? 1 : -1) * 0, ang = i % 2 ? Math.PI * (0.02 + 0.45 * h(1.3)) : Math.PI * (0.98 - 0.45 * h(1.3));
        const dx = Math.cos(ang), dy = -Math.sin(ang) * (h(2.9) < 0.5 ? 1 : -1) * 0.6;
        const tx = dx > 0 ? (x1 - cx) / dx : (x0 - cx) / dx, ty = dy > 0 ? (y1 - cy) / dy : dy < 0 ? (y0 - cy) / dy : 1e9, tmax = Math.min(tx, ty);
        const ph = (age * (1.4 + 2.4 * h(3.1)) * speed + h(4.7)) % 1, r1 = tmax * ph * ph, len = Math.min(r1, tmax * (0.2 + 0.7 * speed) * (0.5 + 0.5 * h(6.1)));
        const col = h(7.3) < 0.18 ? "#ff7a64" : h(7.3) < 0.55 ? "#ffe9a0" : "#ffffff";
        void a;
        return <Poly key={i} pts={ribbon([[PX(cx + dx * (r1 - len)), PY(cy + dy * (r1 - len)), 2 + 8 * ph], [PX(cx + dx * r1), PY(cy + dy * r1), 3 + 12 * ph]])} color={col} order={order} op={Math.min(1, speed * 1.4) * (0.35 + 0.65 * ph)} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the bath: bubbles that rise out of the foam, foam that climbs over the rim, steam as clouds that merge
/** `n` round bubbles with a thin ink line and a highlight rise out of the foam line `yFoam` (frame px) between x0 and x1; `k` 0..1 how violent (rate and height); `age` s since it started to boil */
export function Boil({ x0, x1, yFoam, rise, age, k, order }: { x0: number; x1: number; yFoam: number; rise: number; age: number; k: number; order: number }) {
  if (age < 0 || k <= 0.01) return null;
  return (
    <>
      {Array.from({ length: 38 }, (_, i) => {
        const h = (q: number) => hash(i * q + 2.7), per = 0.55 + 0.7 * h(1.9), ph = (age / per + h(3.3)) % 1, r = (12 + 26 * h(5.1)) * (0.5 + 0.9 * ph) * (0.7 + 0.3 * k);
        const x = x0 + (x1 - x0) * h(7.7) + 14 * Math.sin(age * (3 + 4 * h(9.1)) + i), y = yFoam - rise * (0.35 + 0.65 * h(11.3)) * k * ph;
        return (
          <React.Fragment key={i}>
            <Inked pts={ellipsePts(PX(x), PY(y), r, r, 18)} color="#f4fbff" ink="#8fa6b4" w={2.6} order={order + (i % 5) * 0.02} op={Math.min(1, 4 * (1 - ph)) * 0.95} />
            <Poly pts={ribbon([[PX(x) - r * 0.45, PY(y) - r * 0.2, r * 0.16], [PX(x) - r * 0.2, PY(y) - r * 0.5, r * 0.16]])} color="#ffffff" order={order + 0.5} op={Math.min(1, 4 * (1 - ph))} />
          </React.Fragment>
        );
      })}
    </>
  );
}
/** foam that climbs over the rim of the tub on both sides and trembles (frame px: the rim's two ends and its height) */
export function FoamOver({ xL, xR, yRim, age, k, order }: { xL: number; xR: number; yRim: number; age: number; k: number; order: number }) {
  if (age < 0 || k <= 0.01) return null;
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => {
        const side = i % 2 ? 1 : -1, h = (q: number) => hash(i * q + 8.1), grow = smooth(0, 0.5, age) * k, t = twos(Math.round(age * FPS));
        const x = (side < 0 ? xL : xR) + side * (6 + 36 * h(2.1)) - side * 70 * h(3.7), y = yRim + 20 * h(4.3) + 150 * h(5.9) * grow, r = (26 + 30 * h(6.7)) * (0.5 + 0.5 * grow) * (1 + 0.1 * Math.sin(t * 1.7 + i));
        return <Inked key={i} pts={ellipsePts(PX(x), PY(y), r, r * 0.9, 18)} color="#fbfeff" ink="#9bb0be" w={2.6} order={order + (i % 4) * 0.02} />;
      })}
    </>
  );
}
/** steam over the tub as clouds that merge: born along a line (frame px x0..x1 at y), thrown up (Goo); the thickness follows `lv` (0 none .. 2.8) */
export function TubSteam({ x0, x1, y, t, tStart, lv, k, order }: { x0: number; x1: number; y: number; t: number; tStart: number; lv: number; k: number; order: number }) {
  if (t < tStart || lv <= 0.01) return null;
  const sp: Sprite[] = [];
  for (let b = Math.floor((t - 1.6 - tStart) / 0.1); b <= Math.floor((t - tStart) / 0.1); b++) {
    const tb = tStart + b * 0.1;
    if (b < 0) continue;
    const n = Math.floor(lv * 1.5 * k + hash(b * 3.1)); if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 5 + 3, emitters: [{ seg: [x0, y, x1, y, 4], n, r: [30 * k, 120 * k], rise: [260 * k, 560 * k], life: [0.9, 1.6], strength: 0.95, drift: 120 * k, lobes: 4 }] };
    sp.push(...steamSprites(cfg, t));
  }
  if (!sp.length) return null;
  return <Goo sprites={sp.map((s) => ({ x: s.x - 540, y: 960 - s.y, r: s.r * 1.55, a: s.a }))} order={order} fill="#f6f9fd" ink="#7d8aa3" opacity={1} th={0.4} ow={3} res={0.5} blur={2} maxN={700} />;
}
/** steam out of his ear holes: the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment (src/x11-sched.ts steamLevel). `at` is panel px (y up) */
export function earSteam(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1, lv = steamLevel(Math.round((tb + 0.05) * FPS));
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0] + 540, 960 - at[1], at[0] + 540 + dir * 8, 960 - at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map((s) => ({ x: s.x - 540, y: 960 - s.y, r: s.r * 1.55, a: s.a }));
}
/** one thin wisp of steam curling out of one ear hole (panel px, y up), `age` s since it began, `k` a scale: a thin white thread that wavers as it rises and thins out */
export function Wisp({ at, age, k, order }: { at: [number, number]; age: number; k: number; order: number }) {
  if (age <= 0) return null;
  const n = 24, len = Math.min(1, age / 0.7), pts: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * len, y = at[1] + u * 250 * k, x = at[0] + (46 * Math.sin(u * 9 - age * 2.6) * (0.2 + u) + 20 * u) * k;
    pts.push([x, y, (7 + 15 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * k * (1 - 0.5 * u)]);
  }
  return <Inked pts={ribbon(pts)} color="#f6f9fd" ink="#7d8aa3" w={2.6} order={order} op={Math.min(1, age * 3) * 0.96} />;
}

// ═════════════════════════════════════════════════════ what is on Ross's head (head px from the neck pivot, y up)
/** the eyes bulging out of his head: a bigger white eye with a thick ink line over each eye, a small pupil with a shiver, red veins; `k` 0..1.4 */
export function BulgeEyes({ eyes, pupils, k, f, order }: { eyes: { c: [number, number]; rx: number; ry: number }[]; pupils: { c: [number, number]; r: number }[]; k: number; f: number; order: number }) {
  const sh = twos(f) % 4 < 2 ? 1 : -1;
  return (
    <>
      {eyes.map((e, i) => {
        const s = 1 + 0.26 * k, rx = (e.rx + 3) * s, ry = (e.ry + 3) * s, p = pupils[i];
        return (
          <React.Fragment key={i}>
            <Inked pts={ellipsePts(e.c[0], e.c[1], rx, ry, 36)} color="#fffdf6" ink="#121518" w={5.5} order={order} />
            {[-1, 1, 0].map((d) => <Poly key={d} pts={ribbon([[e.c[0] + d * rx * 0.55, e.c[1] + ry * 0.92, 3], [e.c[0] + d * rx * 0.4, e.c[1] + ry * 0.4, 2.6], [e.c[0] + d * rx * 0.34, e.c[1] + ry * 0.1, 2]])} color="#d8402e" order={order + 0.6} op={Math.min(1, k * 1.2) * 0.8} />)}
            <Poly pts={ellipsePts(e.c[0] + 3 * sh * (i ? -1 : 1), e.c[1] + 2, Math.max(4, p.r * 0.85), Math.max(4, p.r * 0.85), 18)} color="#060708" order={order + 0.7} />
          </React.Fragment>
        );
      })}
    </>
  );
}
/** a cucumber slice on each closed eye (head px centres `c`, radius r); `slide` 0..1 the one at index `which` slides down his cheek and drops off, fading as it goes into the foam */
export function Cucumbers({ centers, r, slide = 0, which = 0, f, order }: { centers: [number, number][]; r: number; slide?: number; which?: number; f: number; order: number }) {
  return (
    <>
      {centers.map((c, i) => {
        const sl = i === which ? slide : 0, x = c[0] + (i === which ? 26 * sl : 0), y = c[1] - 330 * sl * sl - 10 * sl, rot = (i ? -8 : 7) + (i === which ? -70 * sl : 0), op = 1 - smooth(0.55, 0.95, sl), wob = 1 + 0.01 * Math.sin(twos(f) * 0.9 + i);
        return (
          <React.Fragment key={i}>
            <Inked pts={xf(ellipsePts(0, 0, r * wob, r * 0.94, 30), x, y, rot)} color="#5a9a3c" ink="#24421a" w={3.4} order={order} op={op} />
            <Poly pts={xf(ellipsePts(0, 0, r * 0.84, r * 0.78, 30), x, y, rot)} color="#cfe9a6" order={order + 0.6} op={op} />
            <Poly pts={xf(ellipsePts(0, 0, r * 0.42, r * 0.38, 20), x, y, rot)} color="#e6f4c4" order={order + 0.7} op={op} />
            {Array.from({ length: 9 }, (_, k2) => { const a = (k2 / 9) * Math.PI * 2; return <Poly key={k2} pts={xf(ellipsePts(0, 0, r * 0.07, r * 0.045, 8), x + Math.cos(a) * r * 0.46 * 1, y + Math.sin(a) * r * 0.42, rot + (a * 180) / Math.PI)} color="#f4f6e0" order={order + 0.8} op={op} />; })}
          </React.Fragment>
        );
      })}
    </>
  );
}
/** soap bubbles left in his hair (head px): round, white, a thin blue-grey line, a highlight */
export function HairBubbles({ f, order }: { f: number; order: number }) {
  const B: [number, number, number][] = [[-95, 402, 34], [-28, 428, 41], [42, 430, 30], [102, 396, 37], [-142, 346, 25], [150, 352, 28], [8, 366, 22], [-60, 376, 18]];
  return (
    <>
      {B.map(([x, y, r], i) => {
        const wob = 1 + 0.025 * Math.sin(twos(f) * 0.5 + i * 1.7);
        return (
          <React.Fragment key={i}>
            <Inked pts={ellipsePts(x, y + 1.5 * Math.sin(twos(f) * 0.3 + i), r * wob, r * wob, 22)} color="#f7fcff" ink="#8fa6b4" w={2.6} order={order} />
            <Poly pts={ribbon([[x - r * 0.5, y + r * 0.2, r * 0.17], [x - r * 0.28, y + r * 0.55, r * 0.17]])} color="#ffffff" order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}
/** a grin that is far too wide (head px; (cx, cy) its middle, w its width, `open` 0..1 how far the jaw drops): a dark mouth, a row of white teeth in a thick ink line */
export function Grin({ cx, cy, w, open, order }: { cx: number; cy: number; w: number; open: number; order: number }) {
  const n = 28, hw = w / 2, drop = 34 + 62 * open;
  const top: Pt[] = Array.from({ length: n + 1 }, (_, i) => { const u = (i / n) * 2 - 1; return [cx + u * hw, cy + 26 * u * u - 6] as Pt; });
  const bot: Pt[] = Array.from({ length: n + 1 }, (_, i) => { const u = (i / n) * 2 - 1; return [cx + u * hw, cy + 26 * u * u - 6 - drop * Math.pow(1 - u * u, 0.7)] as Pt; });
  const mouth: Pt[] = [...top, ...bot.reverse()];
  const teethH = 30, teeth: Pt[] = [...top, ...top.map(([x, y]) => [x, y - teethH * (1 - Math.pow(Math.abs((x - cx) / hw), 3) * 0.8)] as Pt).reverse()];
  return (
    <>
      <Poly pts={mouth} color="#2b0e0e" order={order} />
      <Poly pts={teeth} color="#fbf8ee" order={order + 0.1} />
      {Array.from({ length: 11 }, (_, i) => { const u = -0.9 + (i / 10) * 1.8, x = cx + u * hw, y = cy + 26 * u * u - 6; return <Poly key={i} pts={ribbon([[x, y, 2.4], [x, y - teethH * (1 - Math.pow(Math.abs(u), 3) * 0.8), 2.4]])} color="#8a8478" order={order + 0.2} />; })}
      {open > 0.25 && <Poly pts={xf(ellipsePts(0, 0, hw * 0.34, 14 + 12 * open, 20), cx, cy - 6 - drop * 0.78)} color="#d4636f" order={order + 0.15} />}
      <Poly pts={ribbon(top.map(([x, y]) => [x, y, 5]))} color="#121518" order={order + 0.3} />
      <Poly pts={ribbon(bot.map(([x, y]) => [x, y, 5]))} color="#121518" order={order + 0.3} />
    </>
  );
}
/** the snore: three Zs rising from his mouth, the last biggest (panel px start, `age` s since the breath began) */
export function Zzz({ x, y, age, k = 1, order }: { x: number; y: number; age: number; k?: number; order: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => {
        const a = (age - i * 0.28) / 1.1; if (a < 0 || a > 1) return null;
        const s = (22 + 22 * i) * k * (0.6 + 0.5 * a), px = x + (40 * i + 70 * a) * k, py = y + (60 + 150 * a + 40 * i) * k;
        return <Poly key={i} pts={xf(ribbon([[-1, 1, 0.34], [1, 1, 0.34], [-1, -1, 0.34], [1, -1, 0.34]].map(([a1, b1, c1]) => [a1 * s, b1 * s, c1 * s])), px, py, -8 + 8 * i)} color="#e8eeff" order={order} op={1 - smooth(0.6, 1, a)} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the shop at 4 AM: the lit window (frame px rectangle), rows of ceiling lights, the wall clock inside it, the light on the sidewalk
export function LitWindow({ rect, rows, order }: { rect: [number, number, number, number]; rows: number; order: number }) {
  const [x0, y0, x1, y1] = rect, w = x1 - x0, h = y1 - y0;
  return (
    <>
      <Poly pts={FR(x0, y0, x1, y1)} color="#ffe9a8" order={order} op={0.28 * rows} />
      {[0, 1, 2].map((r) => rows > r && (
        <React.Fragment key={r}>
          {[0.2, 0.5, 0.8].map((u) => (
            <React.Fragment key={u}>
              <Glow x={PX(x0 + w * u)} y={PY(y0 + h * (0.12 + 0.16 * r))} rx={w * 0.2} ry={h * 0.07} op={0.7} order={order + 0.3} color="rgba(255,240,170,1)" />
              <Inked pts={xf(roundRect(w * 0.2, 16, 6), PX(x0 + w * u), PY(y0 + h * (0.12 + 0.16 * r)))} color="#fffbe0" ink="#8a7a30" w={2.4} order={order + 0.4} />
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════ the door's bell (frame px): a brass dome on a spring bracket that swings and shows ring marks
export function DoorBell({ x, y, age, order }: { x: number; y: number; age: number; order: number }) {
  const ring = age >= 0 ? Math.exp(-age / 0.28) : 0, sw = ring * 26 * Math.sin(Math.max(0, age) * 34);
  return (
    <>
      <Inked pts={FR(x - 60, y - 26, x + 60, y)} color="#8a6a3a" ink={INK} w={3.4} order={order} />
      <Poly pts={xf(ribbon([[0, 0, 5], [0, -26, 5]]), PX(x), PY(y))} color="#4a3a22" order={order + 0.1} />
      <Inked pts={xf(Array.from({ length: 21 }, (_, i) => { const q = Math.PI * (i / 20); return [Math.cos(q) * 44, Math.sin(q) * 40 - 66] as Pt; }), PX(x), PY(y + 26), sw)} color="#e0b02a" ink="#4d3606" w={3.4} order={order + 0.2} />
      {ring > 0.05 && [-1, 1].map((d) => [0, 1].map((i) => <Poly key={`${d}${i}`} pts={ribbon([[PX(x) + d * (62 + 20 * i), PY(y + 36 + 14 * i), 5 * ring], [PX(x) + d * (84 + 20 * i), PY(y + 52 + 16 * i), 5 * ring]])} color="#2d3338" order={order + 0.3} op={0.8 * ring} />))}
    </>
  );
}

// ═════════════════════════════════════════════════════ the shower curtain pulled aside by Chuck: yellow, bunched at the top (his fist), spread at the bottom, folds as thin lines (frame px)
export function CurtainBunch({ fx, fy, wBottom, yBottom, order }: { fx: number; fy: number; wBottom: number; yBottom: number; order: number }) {
  const folds = 7;
  const top: [number, number][] = [[fx - 46, fy], [fx + 46, fy]], bot: [number, number][] = [[fx + wBottom * 0.52, yBottom], [fx - wBottom * 0.48, yBottom]];
  return (
    <>
      <Inked pts={FP([...top, ...bot])} color="#fbf070" ink={INK} w={4} order={order} />
      {Array.from({ length: folds }, (_, i) => { const u = (i + 0.5) / folds; return <Poly key={i} pts={ribbon([[PX(fx - 40 + 80 * u), PY(fy + 8), 3.4], [PX(fx - wBottom * 0.48 + wBottom * 1.0 * u), PY(yBottom - 6), 5]])} color="#d8b820" order={order + 0.1} op={0.7} />; })}
      {Array.from({ length: 4 }, (_, i) => <Inked key={i} pts={ellipsePts(PX(fx - 30 + 20 * i), PY(fy - 2), 11, 11, 14)} color="#dfe6ea" ink="#4a5057" w={2.6} order={order + 0.2} />)}
    </>
  );
}

/** a full-frame colour wash (frame): the light of the traffic light, the flash */
export const Wash = ({ color, op, order }: { color: string; op: number; order: number }) => <Poly pts={FR(-40, -40, W + 40, H + 40)} color={color} order={order} op={op} />;
/** a picture sprite (a file) stretched to a frame rectangle: x0, y0 top left, w, h (frame px), over `order` */
export const Pic = ({ file, x0, y0, w, h, order, alpha = true, op = 1, tint }: { file: string; x0: number; y0: number; w: number; h: number; order: number; alpha?: boolean; op?: number; tint?: string }) => <Picture file={file} w={w} h={h} x={PX(x0 + w / 2)} y={PY(y0 + h / 2)} order={order} alpha={alpha} op={op} tint={tint} />;
export { hash, smooth };

/** a drop of sweat flying off a temple (head px: it starts at (x, y), `age` s since it left, repeats every 0.55 s through the caller's age): a pale blue drop with a point on top */
export function Sweat({ x, y, age, k = 1, order }: { x: number; y: number; age: number; k?: number; order: number }) {
  const a = (age % 0.55) / 0.55;
  if (age < 0) return null;
  const px = x + 70 * a * k, py = y + (50 * a - 190 * a * a) * k, s = k * (1 - 0.3 * a);
  const drop: Pt[] = [[0, 26], [-9, 8], [-14, -4], [-9, -17], [0, -22], [9, -17], [14, -4], [9, 8]];
  return <Inked pts={xf(drop, px, py, 18 * a, s)} color="#a8dcf8" ink="#2c6a9a" w={2.4} order={order} op={1 - smooth(0.7, 1, a)} />;
}
