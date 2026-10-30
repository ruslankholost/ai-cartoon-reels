import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useLoader, useThree } from "@react-three/fiber";
import { staticFile } from "remotion";
import rigJson from "./sp-rig.json";
import rig2 from "./nv3-rig.json";
import rig3 from "./tip-rig.json";
import rig4 from "./because-rig.json";
import rig5 from "./pen-rig.json";
import rig6 from "./lips-rig.json";
import { pupilAt } from "./sp-eyes";

// South Park style paper puppets in three.js. The pictures come from Qwen (out/sp-cast2); scripts/sp-prep.py cuts each one into
// transparent parts (body, head, and for Gary the hand+phone) with pivots and face measurements in src/sp-rig.json. Here every part is a
// textured plane (MeshBasicMaterial, sRGB, no mipmaps, alpha-tested) and the face is drawn in code on top of the head part: a mouth from a
// small set of shapes, eyelids for blinks, Denise's brows. Nothing in here reads a clock: the pose comes in as props from the frame.
type Pt = [number, number];
export type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
export type Rig = { pivot: [number, number]; layers: Record<string, Layer>; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW?: number; brows?: number[][][]; browColour?: string; face: string; outline: string; ink: string; white: string; pupilInk: string };
type Rigs = { denise: Rig; gary: Rig; marco: Rig; agency: Rig; rick: Rig; wife: Rig; deniseRobe: Rig; deniseHood: Rig; kyle: Rig; kyleJ: Rig; attendant: Rig; lineA: Rig; lineB: Rig; lineC: Rig; lineD: Rig; cashier: Rig; rhonda: Rig; denisePen: Rig; rhondaPen: Rig; brandon: Rig; clerk: Rig; hostess: Rig; guest1: Rig; guest2: Rig; guest3: Rig; customer: Rig; todd: Rig };
const { src: _s3, props: _p3, scenes: _c3, ...cast3 } = rig3 as unknown as Record<string, unknown>; // "Tip?": the puppets of src/tip-rig.json (its props and sets are read by src/tip-scenes.tsx)
const { src: _s4, props: _p4, scenes: _c4, ...cast4 } = rig4 as unknown as Record<string, unknown>; // "Because": the puppets of src/because-rig.json (its props and plates are read by src/because-scenes.tsx)
const { src: _s5, props: _p5, scenes: _c5, ...cast5 } = rig5 as unknown as Record<string, unknown>; // "I'm Just Not a Sales Person": the puppets of src/pen-rig.json (its props and plates are read by the episode's own code, src/Pen.tsx)
const { src: _s6, props: _p6, scenes: _c6, side: _d6, ...cast6 } = rig6 as unknown as Record<string, unknown>; // "Cold Lips": the customer and Todd of src/lips-rig.json (its props, the dog, the side view of the kiss and the cafe-back plate are read by the episode's own code, src/lips-layout.ts)
const RIG = { ...(rigJson as object), ...(rig2 as object), ...cast3, ...cast4, ...cast5, ...cast6 } as unknown as Rigs;
export const SCENES = (rig2 as unknown as { scenes: Record<string, any> }).scenes; // numbers of the scene pictures (px of the 768x1344 pictures)
export type Char = keyof Rigs;
export type MouthShape = "closed" | "small" | "mid" | "wide" | "o" | "pucker";
export type Mood = "neutral" | "angry" | "defeated" | "smug" | "furious" | "impatient" | "resigned" | "flat" | "pitchy" | "polite" | "hiss" | "tight";
const D2R = Math.PI / 180;

// ── polygons (y up, px of the 768x1344 source picture) ──
export const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 48): Pt[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry] as Pt);
export function roundRect(w: number, h: number, r: number, n = 8): Pt[] {
  const out: Pt[] = [];
  const c: Pt[] = [[w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r], [w / 2 - r, -h / 2 + r]];
  c.forEach((p, k) => { for (let i = 0; i <= n; i++) { const a = (k + i / n) * (Math.PI / 2); out.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]); } });
  return out;
}
export const xf = (pts: Pt[], x: number, y: number, deg = 0, sx = 1, sy = sx): Pt[] => {
  const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R);
  return pts.map(([a, b]) => [x + (a * sx) * c - (b * sy) * s, y + (a * sx) * s + (b * sy) * c]);
};
const area = (p: Pt[]) => p.reduce((s, q, i) => s + (q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1]), 0) / 2;
// every vertex pushed out d along its corner's bisector: the outline of a filled shape
export function grow(pts: Pt[], d: number): Pt[] {
  const p = area(pts) < 0 ? [...pts].reverse() : pts;
  const n = p.length;
  return p.map((q, i) => {
    const a = p[(i + n - 1) % n], b = p[(i + 1) % n];
    let d1x = q[0] - a[0], d1y = q[1] - a[1], d2x = b[0] - q[0], d2y = b[1] - q[1];
    const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
    d1x /= l1; d1y /= l1; d2x /= l2; d2y /= l2;
    const k = 1 + (d1y * d2y + d1x * d2x);
    const s = d / Math.max(k, 0.3);
    return [q[0] + (d1y + d2y) * s, q[1] - (d1x + d2x) * s] as Pt;
  });
}
// a band along a polyline; every point is [x, y, width]
export function ribbon(pl: number[][]): Pt[] {
  const L: Pt[] = [], R: Pt[] = [];
  pl.forEach((q, i) => {
    const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    L.push([q[0] - dy * q[2] / 2, q[1] + dx * q[2] / 2]);
    R.push([q[0] + dy * q[2] / 2, q[1] - dx * q[2] / 2]);
  });
  return [...L, ...R.reverse()];
}

export type { Pt };
// a soft round glow (a radial gradient on a canvas, added to what is behind it): the light of a phone screen
const GLOW = new Map<string, THREE.CanvasTexture>();
function glowTex(color: string): THREE.CanvasTexture {
  let t = GLOW.get(color);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, color); r.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.45)")); r.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    GLOW.set(color, t);
  }
  return t;
}
export function Glow({ x, y, rx, ry, op = 1, order, color = "rgba(160,225,255,1)" }: { x: number; y: number; rx: number; ry?: number; op?: number; order: number; color?: string }) {
  if (op <= 0.005) return null;
  return (
    <mesh position={[x, y, 0]} renderOrder={order}>
      <planeGeometry args={[rx * 2, (ry ?? rx) * 2]} />
      <meshBasicMaterial map={glowTex(color)} transparent opacity={op} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
const GEO = new Map<string, THREE.ShapeGeometry>();
function geoOf(pts: Pt[]): THREE.ShapeGeometry {
  const key = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  let g = GEO.get(key);
  if (!g) { g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))); GEO.set(key, g); }
  return g;
}
// every mesh is transparent and ignores depth: they are drawn in renderOrder, the painter's way
export function Poly({ pts, color, order, op = 1 }: { pts: Pt[]; color: string; order: number; op?: number }) {
  return (
    <mesh geometry={geoOf(pts)} renderOrder={order}>
      <meshBasicMaterial color={color} transparent opacity={op} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
// a filled shape with a line around it: the outline copy first, then the fill
export function Inked({ pts, color, ink, w = 1.7, order, op = 1 }: { pts: Pt[]; color: string; ink: string; w?: number; order: number; op?: number }) {
  return (
    <>
      <Poly pts={grow(pts, w)} color={ink} order={order} op={op} />
      <Poly pts={pts} color={color} order={order + 0.5} op={op} />
    </>
  );
}

// ── textures: sRGB colour, no mipmaps (sprites), straight alpha with bled edge colours (see sp-prep.py)
function useTex(file: string): THREE.Texture {
  const t = useLoader(THREE.TextureLoader, staticFile(file));
  useMemo(() => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
  }, [t]);
  return t;
}
export function Picture({ file, w, h, x = 0, y = 0, order = 0, alpha = false, tint = "#ffffff", op = 1, rot = 0 }: { file: string; w: number; h: number; x?: number; y?: number; order?: number; alpha?: boolean; tint?: string; op?: number; rot?: number }) {
  const tex = useTex(file);
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, rot * D2R]} renderOrder={order}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={tint} transparent={alpha || op < 1} opacity={op} alphaTest={alpha ? 0.02 : 0} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
function Sprite({ file, L, pivot, order, tint = "#ffffff" }: { file: string; L: Layer; pivot: [number, number]; order: number; tint?: string }) {
  const tex = useTex(file);
  return (
    <mesh position={[L.x + L.w / 2 - pivot[0], pivot[1] - (L.y + L.h / 2), 0]} renderOrder={order}>
      <planeGeometry args={[L.w, L.h]} />
      <meshBasicMaterial map={tex} color={tint} transparent alphaTest={0.02} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
/** a colour "#rrggbb" multiplied by a tint "#rrggbb": what a dim, warm light does to a painted colour (the code-drawn parts of a face follow the painted head's tint) */
const mulHex = (c: string, t: string) => { const a = parseInt(c.slice(1), 16), b = parseInt(t.slice(1), 16), ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };

// ── the mouth: South Park shapes. The top edge sits on the lip line (y 0); the jaw drops below it. Dark inside, a pink tongue only on the wide
// shapes. Open shapes are flat-topped rounded rectangles and ovals, never a bowl with upturned corners. The mood picks the set: neutral;
// angry and furious (a wide shout whose top edge is arched, so the corners are pulled down); defeated, resigned and flat (small, corners down or
// level); smug and pitchy (a smirk when closed); polite (a slight smile when closed); impatient (a little down); hiss (clenched teeth); tight (a fake smile: a wide closed line with its
// ends well up, and a clenched-teeth slit with its corners up when it talks).
// Sizes are fractions of the character's nominal mouth width.
const MOUTH_DARK = "#2b0e0e", TONGUE = "#d4636f", TEETH = "#f3f0e6";
type Open = { w: number; h: number; drop: number; tongue?: boolean; teeth?: boolean };
type Size = "small" | "mid" | "wide" | "o";
const OPEN: Record<Mood, Record<Size, Open>> = {
  neutral: { small: { w: 0.52, h: 0.19, drop: 0 }, mid: { w: 0.7, h: 0.33, drop: 0 }, wide: { w: 0.88, h: 0.5, drop: 0, tongue: true }, o: { w: 0.34, h: 0.46, drop: 0 } },
  angry: { small: { w: 0.7, h: 0.3, drop: 0.08 }, mid: { w: 0.84, h: 0.42, drop: 0.11 }, wide: { w: 1.0, h: 0.62, drop: 0.15, tongue: true }, o: { w: 0.84, h: 0.42, drop: 0.11 } },
  defeated: { small: { w: 0.42, h: 0.15, drop: 0.05 }, mid: { w: 0.52, h: 0.24, drop: 0.07 }, wide: { w: 0.52, h: 0.24, drop: 0.07 }, o: { w: 0.26, h: 0.32, drop: 0 } },
  smug: { small: { w: 0.5, h: 0.17, drop: 0 }, mid: { w: 0.66, h: 0.28, drop: 0 }, wide: { w: 0.66, h: 0.28, drop: 0 }, o: { w: 0.3, h: 0.4, drop: 0 } },
  furious: { small: { w: 0.8, h: 0.36, drop: 0.1 }, mid: { w: 0.96, h: 0.5, drop: 0.14 }, wide: { w: 1.1, h: 0.74, drop: 0.2, tongue: true }, o: { w: 0.96, h: 0.5, drop: 0.14 } },
  impatient: { small: { w: 0.58, h: 0.2, drop: 0.03 }, mid: { w: 0.74, h: 0.33, drop: 0.05 }, wide: { w: 0.9, h: 0.46, drop: 0.07, tongue: true }, o: { w: 0.38, h: 0.4, drop: 0 } },
  resigned: { small: { w: 0.44, h: 0.16, drop: 0.05 }, mid: { w: 0.54, h: 0.24, drop: 0.07 }, wide: { w: 0.54, h: 0.24, drop: 0.07 }, o: { w: 0.28, h: 0.34, drop: 0 } },
  flat: { small: { w: 0.46, h: 0.14, drop: 0 }, mid: { w: 0.56, h: 0.21, drop: 0 }, wide: { w: 0.56, h: 0.21, drop: 0 }, o: { w: 0.3, h: 0.3, drop: 0 } },
  pitchy: { small: { w: 0.62, h: 0.24, drop: 0 }, mid: { w: 0.86, h: 0.42, drop: 0 }, wide: { w: 1.0, h: 0.6, drop: 0, tongue: true }, o: { w: 0.4, h: 0.5, drop: 0 } },
  polite: { small: { w: 0.5, h: 0.18, drop: 0 }, mid: { w: 0.64, h: 0.28, drop: 0 }, wide: { w: 0.64, h: 0.28, drop: 0 }, o: { w: 0.32, h: 0.38, drop: 0 } },
  hiss: { small: { w: 0.56, h: 0.15, drop: 0.05, teeth: true }, mid: { w: 0.68, h: 0.21, drop: 0.07, teeth: true }, wide: { w: 0.72, h: 0.27, drop: 0.08, teeth: true }, o: { w: 0.5, h: 0.25, drop: 0.05, teeth: true } },
  tight: { small: { w: 0.66, h: 0.14, drop: -0.08, teeth: true }, mid: { w: 0.76, h: 0.19, drop: -0.09, teeth: true }, wide: { w: 0.82, h: 0.25, drop: -0.1, teeth: true }, o: { w: 0.5, h: 0.26, drop: -0.05, teeth: true } },
};
// a rounded rectangle hanging from y 0: small top corners, bigger bottom corners
function rrect4(w: number, h: number, rt: number, rb: number, n = 7): Pt[] {
  const out: Pt[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(w / 2 - rt, -rt, rt, Math.PI / 2, 0);
  arc(w / 2 - rb, -h + rb, rb, 0, -Math.PI / 2);
  arc(-w / 2 + rb, -h + rb, rb, -Math.PI / 2, -Math.PI);
  arc(-w / 2 + rt, -rt, rt, Math.PI, Math.PI / 2);
  for (let i = 1; i < 12; i++) out.push([-w / 2 + rt + ((w - 2 * rt) * i) / 12, 0]); // the top edge gets points of its own, so it can be arched
  return out;
}
// the closed mouth: half width, and the curve (y = c * w * u^2: below 0 a frown, above 0 a smile); a smirk curls only the right end up
const CLOSED: Record<Mood, { hw: number; c: number; smirk?: boolean }> = {
  neutral: { hw: 0.46, c: 0 }, angry: { hw: 0.46, c: -0.09 }, defeated: { hw: 0.3, c: -0.085 }, smug: { hw: 0.44, c: 0, smirk: true },
  furious: { hw: 0.5, c: -0.13 }, impatient: { hw: 0.46, c: -0.04 }, resigned: { hw: 0.36, c: -0.065 }, flat: { hw: 0.36, c: 0 },
  pitchy: { hw: 0.44, c: 0, smirk: true }, polite: { hw: 0.44, c: 0.05 }, hiss: { hw: 0.4, c: -0.05 }, tight: { hw: 0.5, c: 0.26 },
};
function closedLine(mood: Mood, w: number): Pt[] {
  const C = CLOSED[mood];
  const pl: number[][] = [];
  for (let i = 0; i < 9; i++) {
    const u = (i / 8) * 2 - 1;
    const th = 0.058 * w * (1 - 0.65 * Math.abs(u) ** 3);
    const y = C.smirk ? (u > 0.15 ? 0.1 * w * ((u - 0.15) / 0.85) ** 2 : 0) : C.c * w * u * u;
    pl.push([u * C.hw * w, y, th]);
  }
  return ribbon(pl);
}
// a pucker (Todd warming his lips, "Cold Lips"): pursed lips pushed forward, a rounded blob in the pink of the open mouths with a dark outline and a small slit in the middle; nobody else uses it
function puckerPts(w: number): { dark: Pt[]; tongue: Pt[]; slit: Pt[] } {
  const cy = -0.2 * w;
  return { dark: ellipsePts(0, cy, 0.4 * w, 0.31 * w, 40), tongue: ellipsePts(0, cy, 0.34 * w, 0.25 * w, 36), slit: ribbon([[-0.13 * w, cy, 0.04 * w], [0, cy - 0.012 * w, 0.065 * w], [0.13 * w, cy, 0.04 * w]]) };
}
function mouthPts(shape: MouthShape, mood: Mood, w: number): { dark: Pt[]; tongue?: Pt[]; teeth?: Pt[]; teethLine?: Pt[]; slit?: Pt[] } {
  if (shape === "closed") return { dark: closedLine(mood, w) };
  if (shape === "pucker") return puckerPts(w);
  const o = OPEN[mood][shape];
  const ow = o.w * w, oh = o.h * w;
  if (shape === "o" && mood !== "angry" && !o.teeth) return { dark: ellipsePts(0, -oh / 2, ow / 2, oh / 2, 40) };
  const bend = ([x, y]: Pt) => [x, y - o.drop * w * (2 * x / ow) ** 2 * ((y + oh) / oh)] as Pt; // the top edge arched: corners down
  const dark = rrect4(ow, oh, 0.08 * oh, 0.42 * oh).map(bend);
  const teeth = o.teeth ? rrect4(ow * 0.9, oh * 0.62, 0.05 * oh, 0.05 * oh).map(([x, y]) => bend([x, y - 0.1 * oh])) : undefined;
  const teethLine = o.teeth ? ribbon([[-0.43 * ow, -0.41 * oh, 1.3], [0, -0.41 * oh, 1.3], [0.43 * ow, -0.41 * oh, 1.3]]) : undefined;
  return { dark, tongue: o.tongue ? ellipsePts(0, -oh + 0.1 * w, 0.2 * w, 0.07 * w, 28) : undefined, teeth, teethLine };
}

// ── an eyelid: skin colour over the top c (0..1) of the eye (its outline grown past the drawn line, from the rig), a lash line along its lower
// edge; shut = the whole outline and a curved line. Points are relative to the eye's centre, y up.
function clipAbove(poly: Pt[], yc: number): { pts: Pt[]; xs: number[] } {
  const pts: Pt[] = [], xs: number[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const ina = a[1] >= yc, inb = b[1] >= yc;
    if (ina) pts.push(a);
    if (ina !== inb) { const x = a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]); pts.push([x, yc]); xs.push(x); }
  });
  return { pts, xs };
}
function lidPts(e: Eye, c: number, lw: number): { skin: Pt[][]; line: Pt[] } {
  const poly: Pt[] = e.lid.map(([x, y]) => [x - e.cx, e.cy - y]);
  const top = Math.max(...poly.map((p) => p[1])), bot = Math.min(...poly.map((p) => p[1]));
  if (c >= 0.95) {
    const hw = 0.78 * e.rx;
    return { skin: [poly], line: ribbon(Array.from({ length: 13 }, (_, i) => { const x = -hw + (2 * hw * i) / 12; return [x, -0.1 * e.ry - 0.16 * e.ry * (1 - (x / hw) ** 2), lw * 1.1]; })) };
  }
  const yc = top - (top - bot) * c;
  const { pts, xs } = clipAbove(poly, yc);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), hw = (x1 - x0) / 2, xm = (x0 + x1) / 2;
  const edge = Array.from({ length: 13 }, (_, i) => { const x = x0 + (2 * hw * i) / 12; return [x, yc - 0.16 * hw * (1 - ((x - xm) / hw) ** 2)] as Pt; });
  return { skin: [pts, edge], line: ribbon(edge.map((p) => [p[0], p[1], lw])) };
}

// Denise's brows from the measured polyline. angry 0..1 turns the inner ends down, thickens and lowers them; sad 0..1 raises the inner ends
// (worried); lift 0..1 raises them as a whole (the eyes widen).
function browPts(brow: number[][], side: -1 | 1, angry: number, sad: number, lift: number, pivot: [number, number], asym = 0): Pt[] {
  const pl = brow.map((q) => [q[0] - pivot[0], pivot[1] - q[1], q[2]]);
  const cx = (pl[0][0] + pl[pl.length - 1][0]) / 2, cy = (pl[0][1] + pl[pl.length - 1][1]) / 2;
  const th = side * (angry * 22 - sad * 16) * D2R;
  const dy = -angry * 9 + sad * 4 + lift * 10 + (side === -1 ? 1 : -1) * asym * 7; // asym > 0 raises the left brow (smug)
  const c = Math.cos(th), s = Math.sin(th);
  return ribbon(pl.map((q) => [cx + (q[0] - cx) * c - (q[1] - cy) * s, cy + dy + (q[0] - cx) * s + (q[1] - cy) * c, q[2] * (1 + 0.6 * angry)]));
}

// Denise's phone in a mitten hand at her ear, a forearm rising from below the frame: flat shapes with a line round them. `p` moves the hand
// with the phone away from the ear (dx, dy in px, rot in degrees about the hand): the forearm bends at a fixed elbow at her side.
export type PhonePose = { dx: number; dy: number; rot: number };
function PhoneHand({ face, ink, side, order, p }: { face: string; ink: string; side: -1 | 1; order: number; p: PhonePose }) {
  const k = side;
  const [hx, hy] = [k * 176, 118];
  const c = Math.cos(p.rot * D2R), sn = Math.sin(p.rot * D2R);
  const T2 = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [hx + p.dx + (x - hx) * c - (y - hy) * sn, hy + p.dy + (x - hx) * sn + (y - hy) * c] as Pt);
  const phone = T2(xf(roundRect(60, 118, 12), k * 168, 166, -k * 11));
  const rim = T2(xf(roundRect(52, 110, 9), k * 168, 166, -k * 11));
  const cam = T2(xf(roundRect(22, 22, 6), k * 168 - k * 13, 166 + 38, -k * 11));
  const lens1 = T2(xf(ellipsePts(0, 0, 4.2, 4.2, 14), k * 168 - k * 13, 166 + 44, -k * 11)), lens2 = T2(xf(ellipsePts(0, 0, 4.2, 4.2, 14), k * 168 - k * 13, 166 + 32, -k * 11));
  // the arm of the approved call test, slid as it is with the hand (its lower end stays below the panel, so nothing ends in view)
  const arm = [[k * 172 + p.dx, 100 + p.dy, 40], [k * 190 + p.dx, 20 + p.dy, 43], [k * 214 + p.dx, -130 + p.dy, 50]];
  const hand = T2(xf(roundRect(54, 62, 22), k * 176, 118, -k * 8));
  const fingers = [0, 1, 2].map((i) => T2(xf(ellipsePts(0, 0, 15, 10.5, 24), k * 176 - k * 27, 138 - i * 19, -k * 8)));
  return (
    <>
      <Inked pts={ribbon(arm)} color={face} ink={ink} order={order} />
      <Inked pts={phone} color="#222226" ink="#0c0c0e" w={2} order={order + 2} />
      <Poly pts={rim} color="#34343a" order={order + 3.2} />
      <Inked pts={cam} color="#16161a" ink="#0c0c0e" w={1.4} order={order + 3.4} />
      <Poly pts={lens1} color="#3d4a58" order={order + 3.8} />
      <Poly pts={lens2} color="#3d4a58" order={order + 3.8} />
      <Inked pts={hand} color={face} ink={ink} order={order + 4} />
      {fingers.map((f, i) => <Inked key={i} pts={f} color={face} ink={ink} w={2} order={order + 5 + i * 0.1} />)}
    </>
  );
}

// `body`: the name of one of the rig's body pictures (a character with several poses shares one head: "Tip?"'s Denise, the attendant)
// `hdx`: the head slid sideways on its neck, puppet px (a head that leans into a hair dryer's stream, "Cold Lips"); not set by any other episode
// `mdy`: the mouth moved up its face, puppet px (the same shot: the pucker meets the dryer's nozzle); not set by any other episode
export type PuppetPose = { body?: string; tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry?: number; sad?: number; lift?: number; asym?: number; pupil?: number; gaze?: [number, number]; dx?: number; hdx?: number; mdy?: number };
const MOUTH_W: Partial<Record<Char, number>> = { denise: 64, gary: 100 }; // the open mouth's width (the others: 0.44 of their face radius, from the rig)

// A character at (x, y) with its neck pivot, scaled by `scale`. The head part tilts about the neck and dips; the face is drawn in code on it.
// `phone`: Denise's phone and hand (null: she holds none).
// `flip`: the body picture mirrored about the neck (the head is not): a raised arm on the other side, for a character who stands on the other side of a screen
// `headAttach`: whatever is worn on the head (a hat, a headset: "Because"), drawn inside the head's group so it tilts and dips with it; its coordinates are puppet px from the neck pivot, y up
// `tint`: a colour that the whole puppet is multiplied by (the painted parts and the code-drawn face parts alike): a dim room's light, "#ffffff" (the default) leaves it as painted
// `rig`: the rig to use instead of RIG[char] (the same numbers with some of the pictures swapped for repaired ones, "Cold Lips"); not set by any other episode
export function Puppet({ char, pose, x, y, scale, order = 10, visible = true, phone = { dx: 0, dy: 0, rot: 0 }, flip = false, headAttach, tint, rig }: { char: Char; pose: PuppetPose; x: number; y: number; scale: number; order?: number; visible?: boolean; phone?: PhonePose | null; flip?: boolean; headAttach?: React.ReactNode; tint?: string; rig?: Rig }) {
  const tc = (c: string) => (tint ? mulHex(c, tint) : c);
  const R = rig ?? RIG[char];
  const [px, py] = R.pivot;
  const loc = (X: number, Y: number): Pt => [X - px, py - Y];
  const m = R.mouth;
  const mc = loc(m.cx, m.cy - (pose.mdy ?? 0));
  const MW = MOUTH_W[char] ?? R.mouthW ?? 80;
  const mp = mouthPts(pose.mouth, pose.mood, MW);
  const lashW = char === "gary" ? 4.6 : 3.2; // Gary's lid line is black and heavy
  const lashInk = char === "gary" ? "#0e0e0e" : R.ink;
  const gz = pose.gaze ?? [0, 0];
  const eyesMoved = Math.abs(gz[0]) > 0.001 || Math.abs(gz[1]) > 0.001 || (pose.pupil ?? 1) < 0.99;
  return (
    <group visible={visible} position={[x + (pose.dx ?? 0), y + pose.breath * scale, 0]} scale={[scale, scale, 1]}>
      <group scale={[flip ? -1 : 1, 1, 1]}>
        {R.bodies
          ? Object.entries(R.bodies).map(([k, L]) => <group key={k} visible={pose.body ? k === pose.body : L.file === R.layers.body.file}><Sprite file={L.file} L={L} pivot={R.pivot} order={order} tint={tint} /></group>) // all poses are loaded, one is shown
          : <Sprite file={R.layers.body.file} L={R.layers.body} pivot={R.pivot} order={order} tint={tint} />}
      </group>
      <group position={[pose.hdx ?? 0, pose.bob, 0]} rotation={[0, 0, pose.tilt * D2R]}>
        <Sprite file={R.layers.head.file} L={R.layers.head} pivot={R.pivot} order={order + 10} tint={tint} />
        {eyesMoved && R.pupils.map((q, i) => {
          // pupils that look somewhere or shrink: the drawn one is covered with eye white and a dot goes on top, kept inside the eye (src/sp-eyes.ts)
          const c0 = loc(q[0], q[1]), c1 = loc(...pupilAt(R.eyes[i], [q[0], q[1]], q[2], gz, 6));
          const pr = q[2] * (pose.pupil ?? 1);
          return (
            <group key={i}>
              <group position={[c0[0], c0[1], 0]}><Poly pts={ellipsePts(0, 0, q[2] + 2.6, q[2] + 2.6, 24)} color={tc(R.white)} order={order + 11} /></group>
              <group position={[c1[0], c1[1], 0]}><Poly pts={ellipsePts(0, 0, pr, pr, 24)} color={tc(R.pupilInk)} order={order + 11.5} /></group>
            </group>
          );
        })}
        {pose.lid > 0.01 && R.eyes.map((e, i) => {
          const lp = lidPts(e, pose.lid, lashW);
          const c = loc(e.cx, e.cy);
          return (
            <group key={i} position={[c[0], c[1], 0]}>
              {lp.skin.map((pts, k) => <Poly key={k} pts={pts} color={tc(R.face)} order={order + 12} />)}
              <Poly pts={lp.line} color={tc(lashInk)} order={order + 12.5} />
            </group>
          );
        })}
        {R.brows && R.brows.map((b, i) => <Poly key={i} pts={browPts(b, i === 0 ? -1 : 1, pose.angry ?? 0, pose.sad ?? 0, pose.lift ?? 0, R.pivot, pose.asym ?? 0)} color={tc(R.browColour ?? R.ink)} order={order + 14} />)}
        <group position={[mc[0], mc[1], 0]}>
          <Poly pts={mp.dark} color={tc(MOUTH_DARK)} order={order + 13} />
          {mp.teeth && <Poly pts={mp.teeth} color={tc(TEETH)} order={order + 13.3} />}
          {mp.teethLine && <Poly pts={mp.teethLine} color={tc(MOUTH_DARK)} order={order + 13.4} />}
          {mp.tongue && <Poly pts={mp.tongue} color={tc(TONGUE)} order={order + 13.5} />}
          {mp.slit && <Poly pts={mp.slit} color={tc(MOUTH_DARK)} order={order + 13.6} />}
        </group>
        {headAttach}
      </group>
      {R.layers.hand && <Sprite file={R.layers.hand.file} L={R.layers.hand} pivot={R.pivot} order={order + 20} tint={tint} />}
      {char === "denise" && phone && <PhoneHand face={R.face} ink={R.ink} side={1} order={order + 20} p={phone} />}
    </group>
  );
}

// ── one panel of the split screen: an orthographic canvas of its own (world units = px of the panel at zoom 1, origin in the middle).
// The camera zooms about a focus point, so the face stays where it is while the shot pushes in.
function Cam({ zoom, fx, fy }: { zoom: number; fx: number; fy: number }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  useLayoutEffect(() => {
    camera.position.set(fx * (1 - 1 / zoom), fy * (1 - 1 / zoom), 100);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}
export function Panel({ w, h, zoom = 1, focus = [0, 0], children }: { w: number; h: number; zoom?: number; focus?: [number, number]; children?: React.ReactNode }) {
  return (
    <ThreeCanvas orthographic flat width={w} height={h} camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <Cam zoom={zoom} fx={focus[0]} fy={focus[1]} />
      {children}
    </ThreeCanvas>
  );
}
