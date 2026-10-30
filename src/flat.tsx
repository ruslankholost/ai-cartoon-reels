import React, { createContext, useContext } from "react";
import * as THREE from "three";

// The flat cut-out kit. Everything on screen is a flat polygon (MeshBasicMaterial, one solid colour, no light) with a
// slightly larger black copy of itself just behind it: the construction-paper look. Units are pixels of the 1080x1920
// frame at zoom 1 (x right, y up, origin in the middle of the frame). z only orders the layers: higher = in front.
// Outlines keep one screen weight whatever scale a character is drawn at. Light is drawn as flat translucent
// zones (a polygon with some opacity), never as shading.

export type Pt = [number, number];
export type Shp = { key: string; pts: Pt[] };

export const INK = "#000000";
const OWK = 0.66; // outline px = ow * OWK: ow 5.5 is the big-shape line, 4 the small-detail line

// ── polygons ──
const area = (p: Pt[]) => p.reduce((a, q, i) => a + (q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1]), 0) / 2;
export function ccw(p: Pt[]): Pt[] {
  return area(p) < 0 ? [...p].reverse() : p;
}
function clean(p: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const q of p) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1e-3) out.push(q);
  }
  while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-3) out.pop();
  return area(out) < 0 ? out.reverse() : out;
}
const SHAPES = new Map<string, Shp>();
export function shp(key: string, make: () => Pt[]): Shp {
  let s = SHAPES.get(key);
  if (!s) {
    s = { key, pts: clean(make()) };
    SHAPES.set(key, s);
  }
  return s;
}

export const ell = (rx: number, ry: number, n = 64) =>
  shp(`e${rx},${ry},${n}`, () => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * rx, Math.sin((i / n) * Math.PI * 2) * ry] as Pt));

// a convex-ish polygon with every corner rounded by r
export function roundPts(pts: Pt[], r: number, n = 7): Pt[] {
  if (r <= 0) return pts;
  const out: Pt[] = [];
  const m = pts.length;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i + m - 1) % m], p1 = pts[i], p2 = pts[(i + 1) % m];
    const a = [p0[0] - p1[0], p0[1] - p1[1]], b = [p2[0] - p1[0], p2[1] - p1[1]];
    const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
    const d = Math.min(r, la / 2, lb / 2);
    const t1: Pt = [p1[0] + (a[0] / la) * d, p1[1] + (a[1] / la) * d];
    const t2: Pt = [p1[0] + (b[0] / lb) * d, p1[1] + (b[1] / lb) * d];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      out.push([(1 - u) * (1 - u) * t1[0] + 2 * u * (1 - u) * p1[0] + u * u * t2[0], (1 - u) * (1 - u) * t1[1] + 2 * u * (1 - u) * p1[1] + u * u * t2[1]]);
    }
  }
  return out;
}
export const rpoly = (key: string, pts: Pt[], r: number, n = 7) => shp(`${key}|${r},${n}`, () => roundPts(pts, r, n));
export const rrect = (w: number, h: number, r = 0, n = 7) =>
  shp(`rr${w},${h},${r},${n}`, () => roundPts([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], Math.min(r, w / 2, h / 2), n));
export const poly = (key: string, pts: Pt[]) => shp(`p${key}`, () => pts);

// a path in a few SVG-like commands (absolute): M x y, L x y, C x1 y1 x2 y2 x y, Q x1 y1 x y, Z. y is up.
export function pathPts(d: string, n = 14): Pt[] {
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? [];
  const out: Pt[] = [];
  let i = 0, cur: Pt = [0, 0];
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    const c = t[i++];
    if (c === "M" || c === "L") { cur = [num(), num()]; out.push(cur); }
    else if (c === "C") {
      const a: Pt = [num(), num()], b: Pt = [num(), num()], e: Pt = [num(), num()];
      for (let k = 1; k <= n; k++) {
        const u = k / n, v = 1 - u;
        out.push([v * v * v * cur[0] + 3 * v * v * u * a[0] + 3 * v * u * u * b[0] + u * u * u * e[0], v * v * v * cur[1] + 3 * v * v * u * a[1] + 3 * v * u * u * b[1] + u * u * u * e[1]]);
      }
      cur = e;
    } else if (c === "Q") {
      const a: Pt = [num(), num()], e: Pt = [num(), num()];
      for (let k = 1; k <= n; k++) {
        const u = k / n, v = 1 - u;
        out.push([v * v * cur[0] + 2 * v * u * a[0] + u * u * e[0], v * v * cur[1] + 2 * v * u * a[1] + u * u * e[1]]);
      }
      cur = e;
    }
  }
  return out;
}
export const path = (d: string, n = 14) => shp(`d${d}|${n}`, () => pathPts(d, n));
// mirror a right-half outline (listed from the top centre down to the bottom centre) into a symmetric shape
export const mirrored = (half: Pt[]): Pt[] => [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt)];

// points every `step` px along a closed polygon
export function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(l / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  return out;
}
// a fluffy edge: `count` bumps of height `amp` around a closed polygon
export function scallopPts(pts: Pt[], amp: number, count: number): Pt[] {
  const p = resample(ccw(pts), 3);
  const n = p.length;
  const cum: number[] = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(p[i % n][0] - p[i - 1][0], p[i % n][1] - p[i - 1][1]));
  const L = cum[n];
  return p.map((q, i) => {
    const a = p[(i + n - 1) % n], b = p[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const bump = amp * Math.abs(Math.sin((Math.PI * count * cum[i]) / L));
    return [q[0] + dy * bump, q[1] - dx * bump] as Pt;
  });
}
// a band along a path, thick at the start and thin at the end
export function taperPts(path: Pt[], w0: number, w1: number): Pt[] {
  const n = path.length;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    left.push([path[i][0] - dy * w, path[i][1] + dx * w]);
    right.push([path[i][0] + dy * w, path[i][1] - dx * w]);
  }
  return [...left, ...right.reverse()];
}
export function bezier(p: Pt[], n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    if (p.length === 3) return [v * v * p[0][0] + 2 * v * u * p[1][0] + u * u * p[2][0], v * v * p[0][1] + 2 * v * u * p[1][1] + u * u * p[2][1]] as Pt;
    return [v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0], v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1]] as Pt;
  });
}

// the outline: every vertex pushed out along the corner's bisector (a mitered offset)
function offsetPts(pts: Pt[], w: number): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    let d1x = p1[0] - p0[0], d1y = p1[1] - p0[1];
    let d2x = p2[0] - p1[0], d2y = p2[1] - p1[1];
    const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
    d1x /= l1; d1y /= l1; d2x /= l2; d2y /= l2;
    const n1x = d1y, n1y = -d1x, n2x = d2y, n2y = -d2x; // outward for a counter-clockwise polygon
    const k = 1 + n1x * n2x + n1y * n2y;
    const s = w / Math.max(k, 0.3);
    out.push([p1[0] + (n1x + n2x) * s, p1[1] + (n1y + n2y) * s]);
  }
  return out;
}

const GEO = new Map<string, THREE.BufferGeometry>();
const polyGeo = (key: string, pts: Pt[]) => {
  let g = GEO.get(key);
  if (!g) {
    g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), 1);
    GEO.set(key, g);
  }
  return g;
};

// ── materials ──
const MATS = new Map<string, THREE.MeshBasicMaterial>();
export function flatMat(color: string, op = 1, map?: THREE.Texture, id = ""): THREE.MeshBasicMaterial {
  const key = `${color}|${op}|${id}`;
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: op < 1 || !!map?.userData.alpha, opacity: op, depthWrite: op >= 1, toneMapped: false, map: map ?? null });
    MATS.set(key, m);
  }
  return m;
}

// ── a drawing from canvas (patterns, text, screens) ──
const TEX = new Map<string, THREE.CanvasTexture>();
export function paint(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, alpha = false): THREE.CanvasTexture {
  let t = TEX.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.userData.alpha = alpha;
    TEX.set(key, t);
  }
  return t;
}

// ── components ──
type Xf = { x?: number; y?: number; z?: number; r?: number; sx?: number; sy?: number; children?: React.ReactNode };
const D2R = Math.PI / 180;
const ScaleCtx = createContext(1); // the scale things are drawn at, so outlines keep one screen weight

// the camera zoom: outlines are drawn thinner in the world so they keep one weight on the screen
export function ZoomScale({ k, children }: { k: number; children?: React.ReactNode }) {
  return <ScaleCtx.Provider value={k}>{children}</ScaleCtx.Provider>;
}

export function G({ x = 0, y = 0, z = 0, r = 0, sx = 1, sy, children }: Xf) {
  const k = useContext(ScaleCtx);
  const node = (
    <group position={[x, y, z]} rotation={[0, 0, r * D2R]} scale={[sx, sy ?? sx, 1]}>
      {children}
    </group>
  );
  return sx === 1 ? node : <ScaleCtx.Provider value={k * sx}>{node}</ScaleCtx.Provider>;
}

type FillProps = Xf & { s: Shp; fill?: string; ow?: number; oc?: string; op?: number; map?: THREE.Texture; mapId?: string };
// a filled shape with its black outline: a copy pushed out by `ow`, just behind it
export function Fill({ s, fill = "#ffffff", ow = 5.5, oc = INK, op = 1, map, mapId, x = 0, y = 0, z = 0, r = 0, sx = 1, sy, children }: FillProps) {
  const k = useContext(ScaleCtx) * sx;
  const g = polyGeo(s.key, s.pts);
  const ow2 = Math.round(((ow * OWK) / k) * 10) / 10;
  const og = ow2 > 0 ? polyGeo(`${s.key}|o${ow2}`, offsetPts(s.pts, ow2)) : null;
  const node = (
    <group position={[x, y, z]} rotation={[0, 0, r * D2R]} scale={[sx, sy ?? sx, 1]}>
      {og && <mesh geometry={og} material={flatMat(oc, op < 1 ? op : 1)} position={[0, 0, -0.3]} />}
      <mesh geometry={g} material={flatMat(fill, op, map, mapId)} />
      {children}
    </group>
  );
  return sx === 1 ? node : <ScaleCtx.Provider value={k}>{node}</ScaleCtx.Provider>;
}

// a line with thickness, as a ribbon along the points (round ends by default); `ow` puts a black ribbon behind it
function ribbon(pts: Pt[], w: number): THREE.BufferGeometry {
  const key = `rb${w}|${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}`;
  let g = GEO.get(key);
  if (g) return g;
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    pos.push(pts[i][0] - dy * (w / 2), pts[i][1] + dx * (w / 2), 0, pts[i][0] + dy * (w / 2), pts[i][1] - dx * (w / 2), 0);
    if (i > 0) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  }
  g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  GEO.set(key, g);
  return g;
}
type StrokeProps = Xf & { pts: Pt[]; w?: number; color?: string; ow?: number; round?: boolean; closed?: boolean; op?: number };
export function Stroke({ pts, w = 6, color = INK, ow = 0, round = true, closed = false, op = 1, x = 0, y = 0, z = 0, r = 0, sx = 1, sy, children }: StrokeProps) {
  const k = useContext(ScaleCtx) * sx;
  const o = Math.round(((ow * OWK) / k) * 10) / 10;
  const p = closed ? [...pts, pts[0], pts[1]] : pts;
  const dot = (ww: number, c: string, zz: number) => (round && !closed ? (
    <>
      <mesh geometry={polyGeo(`cd${ww}`, ell(ww / 2, ww / 2, 14).pts)} material={flatMat(c, op)} position={[pts[0][0], pts[0][1], zz]} />
      <mesh geometry={polyGeo(`cd${ww}`, ell(ww / 2, ww / 2, 14).pts)} material={flatMat(c, op)} position={[pts[pts.length - 1][0], pts[pts.length - 1][1], zz]} />
    </>
  ) : null);
  const node = (
    <group position={[x, y, z]} rotation={[0, 0, r * D2R]} scale={[sx, sy ?? sx, 1]}>
      {o > 0 && (
        <>
          <mesh geometry={ribbon(p, w + 2 * o)} material={flatMat(INK)} position={[0, 0, -0.3]} />
          {dot(w + 2 * o, INK, -0.3)}
        </>
      )}
      <mesh geometry={ribbon(p, w)} material={flatMat(color, op)} />
      {dot(w, color, 0)}
      {children}
    </group>
  );
  return sx === 1 ? node : <ScaleCtx.Provider value={k}>{node}</ScaleCtx.Provider>;
}

// a quad showing a drawing (text, a phone screen, a pattern)
type PicProps = Xf & { tex: THREE.Texture; w: number; h: number; op?: number };
export function Pic({ tex, w, h, op = 1, x = 0, y = 0, z = 0, r = 0, sx = 1, sy, children }: PicProps) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, r * D2R]} scale={[sx, sy ?? sx, 1]}>
      <mesh material={flatMat("#ffffff", op, tex, tex.uuid)} position={[0, 0, 0]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {children}
    </group>
  );
}

// text as a drawing; `size` is the cap height in px. Bold sans by default.
type TxtProps = Xf & { text: string; size?: number; color?: string; font?: string; weight?: number | string; stroke?: string; strokeW?: number; align?: "center" | "left" | "right"; op?: number; spacing?: number };
export function Txt({ text, size = 40, color = "#000", font = "Arial, Helvetica, sans-serif", weight = 700, stroke, strokeW = 0, align = "center", op = 1, spacing = 0, ...xf }: TxtProps) {
  const S = 2; // texture scale
  const lines = text.split("\n");
  const px = size * 1.25;
  const key = `t|${text}|${size}|${color}|${font}|${weight}|${stroke}|${strokeW}|${spacing}`;
  const probe = (() => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = `${weight} ${px * S}px ${font}`;
    return Math.max(...lines.map((l) => c.measureText(l).width + spacing * S * l.length));
  })();
  const pad = (strokeW + 6) * S;
  const w = Math.ceil(probe + pad * 2), h = Math.ceil(lines.length * px * 1.15 * S + pad * 2);
  const tex = paint(key, w, h, (g) => {
    g.font = `${weight} ${px * S}px ${font}`;
    g.textBaseline = "middle";
    g.textAlign = align;
    g.lineJoin = "round";
    (g as unknown as { letterSpacing: string }).letterSpacing = `${spacing * S}px`;
    lines.forEach((l, i) => {
      const yy = pad + (i + 0.5) * px * 1.15 * S;
      const xx = align === "center" ? w / 2 : align === "left" ? pad : w - pad;
      if (stroke && strokeW > 0) { g.lineWidth = strokeW * 2 * S; g.strokeStyle = stroke; g.strokeText(l, xx, yy); }
      g.fillStyle = color;
      g.fillText(l, xx, yy);
    });
  }, true);
  return <Pic tex={tex} w={w / S} h={h / S} op={op} {...xf} />;
}

// seeded noise for scatter (deterministic: the same frame always draws the same)
export const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7 + 74.7) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
