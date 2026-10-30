import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";
import { staticFile } from "remotion";
import { ellipsePts, grow, type Pt } from "./sp-puppet";
import { fbm, fract, hash, lerp, smooth } from "./sp-math";

// Effects kit for the South Park puppets (the effects test of "Nobody Picks Up": shot 1's shower and steam, shot 8c's phone flip). Everything is a pure function of the
// time t (seconds) it is given: closed-form paths, hashed emission times, seeded noise; nothing reads a clock or Math.random, so a frame always comes out the same.
//   Water   drops with gravity that stretch along their velocity, splash, a thin film on the target, a tail that lets go when the water is turned off
//   Steam   particles rising on noise, drawn through Goo (soft discs added into an offscreen target, blurred, cut at a threshold) into flat white clouds
//   Goo     the goo pass itself, for any soft shapes
//   ContactShadow, Vignette, Grain   the finishing pass: a soft shadow under whatever sits on something, a light vignette, a seeded grain (off by default)
// Measures: INK_W is the ink line of the painted art (scripts/sp-ink.py), so code-drawn outlines match it at the scale the shape is shown at.

export const INK_W = 1.9; // px of a 768-px picture: the median ink line of the cast pictures, measured by scripts/sp-ink.py
export const inkAt = (scale: number) => INK_W * scale; // the same line, on screen, next to a picture shown at `scale`

// ── numbers (src/sp-math.ts)
export { fbm, hash, lerp, smooth, spring, springLand, vnoise } from "./sp-math";

export type View = { s: number; X: (u: number) => number; Y: (v: number) => number }; // picture px -> panel px (see nv3-scenes.tsx view())
const toPanel = (m: View, pts: Pt[]): Pt[] => pts.map(([u, v]) => [m.X(u), m.Y(v)] as Pt);

// ── pictures: loaded once, sRGB, no mipmaps (sprites)
/** the textures of several pictures in public/ (suspends until they are loaded); also the images, for drawing them onto a canvas */
export function useImages(files: string[]): THREE.Texture[] {
  const ts = useLoader(THREE.TextureLoader, files.map((f) => staticFile(f)));
  useMemo(() => ts.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; }), [ts]);
  return ts;
}
/** a canvas drawn once by `draw` (the loaded pictures are in `deps`) and used as a texture */
export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]): THREE.CanvasTexture {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
/** a textured plane at (x, y) (panel px, y up), w x h, turned by rot (degrees), squeezed by sx and sy; for pictures that move as one piece */
export function Plane({ tex, x, y, w, h, rot = 0, sx = 1, sy = 1, op = 1, order }: { tex: THREE.Texture; x: number; y: number; w: number; h: number; rot?: number; sx?: number; sy?: number; op?: number; order: number }) {
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, (rot * Math.PI) / 180]} scale={[sx, sy, 1]} renderOrder={order}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent opacity={op} alphaTest={0.01} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ── batches of triangles: one mesh per layer instead of one per shape
function PolyBatch({ tris, color, order, op = 1 }: { tris: number[]; color: string; order: number; op?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const a = new Float32Array((tris.length / 2) * 3);
    for (let i = 0, j = 0; i < tris.length; i += 2, j += 3) { a[j] = tris[i]; a[j + 1] = tris[i + 1]; }
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, [tris]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (!tris.length || op <= 0.004) return null;
  return (
    <mesh geometry={geo} renderOrder={order} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={op} side={THREE.DoubleSide} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
/** a capsule from `tail` (radius rt) to `head` (radius rh): both ends round, as a closed polygon */
function capsule(head: Pt, tail: Pt, rh: number, rt: number, n = 8): Pt[] {
  const dx = head[0] - tail[0], dy = head[1] - tail[1], L = Math.hypot(dx, dy);
  const ux = L > 1e-6 ? dx / L : 0, uy = L > 1e-6 ? dy / L : 1, nx = -uy, ny = ux;
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) { const a = (Math.PI * k) / n; out.push([head[0] + rh * (nx * Math.cos(a) + ux * Math.sin(a)), head[1] + rh * (ny * Math.cos(a) + uy * Math.sin(a))]); }
  for (let k = 0; k <= n; k++) { const a = (Math.PI * k) / n; out.push([tail[0] - rt * (nx * Math.cos(a) + ux * Math.sin(a)), tail[1] - rt * (ny * Math.cos(a) + uy * Math.sin(a))]); }
  return out;
}
/** a convex or star-shaped polygon as a triangle fan round its centre */
function fan(out: number[], pts: Pt[]) {
  if (pts.length < 3) return;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= pts.length; cy /= pts.length;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push(cx, cy, a[0], a[1], b[0], b[1]); }
}
/** a band along a polyline [x, y, width] as quads */
function strip(out: number[], pl: number[][], extra = 0) {
  const L: Pt[] = [], R: Pt[] = [];
  pl.forEach((q, i) => {
    const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const h = Math.max(0, q[2] + 2 * extra) / 2;
    L.push([q[0] - dy * h, q[1] + dx * h]); R.push([q[0] + dy * h, q[1] - dx * h]);
  });
  for (let i = 0; i + 1 < pl.length; i++) out.push(L[i][0], L[i][1], R[i][0], R[i][1], L[i + 1][0], L[i + 1][1], R[i][0], R[i][1], R[i + 1][0], R[i + 1][1], L[i + 1][0], L[i + 1][1]);
}

// ═══════════════════════════════════════════════════════════ Water
export type WaterCfg = {
  from: [number, number]; // where the water leaves (picture px)
  to: [number, number]; // where it lands
  t0: number; t1: number; // emission runs from t0 to t1 (seconds); t0 before the first frame means the stream is already running
  rate?: number; // drops per second
  gravity?: number; // picture px / s²
  flight?: number; // seconds from the nozzle to the target
  spread?: number; // scatter at the target, px
  film?: [number, number][]; // a path (offsets from `to`, px) along which a thin sheet of water runs down the target
  seed?: number;
};
const WATER_FILL = "#bfe8ff", WATER_HI = "#ffffff";
/** one drop, closed form: where it is at time t (null when it is not in the air), and how long its flight is */
function dropAt(c: Required<Pick<WaterCfg, "rate" | "gravity" | "flight" | "spread">> & WaterCfg, i: number, t: number) {
  const seed = c.seed ?? 0, h = (k: number) => hash(i * k + seed * 13.1);
  const te = c.t0 + (i + 0.9 * h(3.1)) / c.rate;
  if (te > c.t1) return null;
  if (h(8.9) < 0.8 * smooth(c.t1 - 0.2, c.t1, te)) return null; // the tail: fewer and fewer drops, so it breaks up instead of ending as one strip
  // the last drops before the water is turned off are limp: they fall short, onto the head instead of the foam's side
  const limp = smooth(c.t1 - 0.14, c.t1, te);
  const Tf = c.flight * (0.88 + 0.24 * h(5.3)) * (1 + 0.5 * limp);
  const p0: Pt = [c.from[0] + (h(2.7) - 0.5) * 14, c.from[1] + (h(4.1) - 0.5) * 22];
  const dst: Pt = [c.to[0] + (h(7.7) * 2 - 1) * c.spread - 70 * limp * (0.5 + h(1.9) * 0.5), c.to[1] + (h(9.1) * 2 - 1) * 5 + 95 * limp];
  const g = c.gravity;
  const vx = (dst[0] - p0[0]) / Tf, vy = (dst[1] - p0[1] - 0.5 * g * Tf * Tf) / Tf;
  const at = (age: number): Pt => [p0[0] + vx * age, p0[1] + vy * age + 0.5 * g * age * age];
  return { te, Tf, tl: te + Tf, dst, at, vel: (age: number): Pt => [vx, vy + g * age], r: 4.6 + 2.6 * h(6.1), limp };
}
export function waterShapes(cfg: WaterCfg, t: number, m: View, ink: number) {
  const c = { rate: 95, gravity: 3200, flight: 0.3, spread: 16, ...cfg };
  const tau = 2 / 30; // a drop is drawn stretched over 2 frames of its travel
  const fills: number[] = [], inks: number[] = [], lights: number[] = [];
  const add = (poly: Pt[], hi?: Pt[]) => { fan(fills, poly); fan(inks, grow(poly, ink)); if (hi) fan(lights, hi); };
  const i0 = Math.floor((t - c.t0 - c.flight * 1.8) * c.rate) - 1, i1 = Math.floor((t - c.t0) * c.rate) + 1;
  for (let i = Math.max(0, i0); i <= i1; i++) {
    const d = dropAt(c, i, t);
    if (!d) continue;
    const age = t - d.te;
    if (age >= 0 && age < d.Tf) { // in the air: a teardrop from where it was 2.5 frames ago to where it is
      const head = toPanel(m, [d.at(age)])[0], tail = toPanel(m, [d.at(Math.max(0, age - tau))])[0];
      const r = d.r * m.s, dx = head[0] - tail[0], dy = head[1] - tail[1], L = Math.hypot(dx, dy);
      const ux = L > 1e-6 ? dx / L : 0, uy = L > 1e-6 ? dy / L : -1, nx = -uy, ny = ux;
      const poly = capsule(head, tail, r, r * 0.62);
      const hc: Pt = [head[0] + nx * r * 0.4 - ux * r * 0.15, head[1] + ny * r * 0.4 - uy * r * 0.15];
      add(poly, capsule(hc, [hc[0] - ux * L * 0.55, hc[1] - uy * L * 0.55], r * 0.2, r * 0.16, 5));
    }
    // splash: droplets thrown up from the landing point, each on its own parabola
    const sa = t - d.tl;
    if (sa >= 0 && d.limp < 0.5) {
      const K = hash(i * 1.3 + 5) < 0.45 ? 1 : 2;
      for (let k = 0; k < K; k++) {
        const hk = (q: number) => hash(i * 17.3 + k * 31.7 + q);
        const life = 0.16 + 0.16 * hk(2);
        if (sa > life) continue;
        const ang = Math.PI * (0.1 + 0.55 * hk(1)), sp = 130 + 190 * hk(3);
        const ex = d.dst[0] + Math.cos(ang) * sp * sa * (hk(4) < 0.5 ? -1 : 1), ey = d.dst[1] - Math.sin(ang) * sp * sa + 0.5 * c.gravity * sa * sa;
        if (ey > d.dst[1] + 3) continue;
        const [px, py] = toPanel(m, [[ex, ey]])[0];
        const rr = (2.0 + 1.6 * hk(5)) * m.s * (1 - 0.3 * (sa / life));
        add(ellipsePts(px, py, rr, rr, 8), ellipsePts(px - rr * 0.3, py + rr * 0.3, rr * 0.3, rr * 0.3, 6));
      }
    }
  }
  // the film: a thin sheet running down the foam from the first landing; when the water is off it drains away behind its front
  const film: number[] = [], filmInk: number[] = [];
  if (c.film && c.film.length > 1) {
    const first = c.t0 + c.flight;
    const front = Math.min(1, Math.max(0, (t - first) / 0.5)), end = c.t1 + c.flight;
    const back = Math.min(front, Math.max(0, (t - end) / 0.35));
    const n = c.film.length;
    const sample = (s: number): number[] => {
      const x = s * (n - 1), k = Math.min(n - 2, Math.floor(x)), u = x - k;
      return [c.to[0] + lerp(c.film![k][0], c.film![k + 1][0], u), c.to[1] + lerp(c.film![k][1], c.film![k + 1][1], u)];
    };
    if (front - back > 0.01) {
      const K = 12;
      for (let k = 0; k <= K; k++) {
        const u = k / K, q = sample(back + (front - back) * u);
        const w = (3.4 * (1 - 0.4 * (back + (front - back) * u)) * Math.min(1, 0.45 + 3.2 * Math.min(u, 1 - u))) * m.s; // round at both ends
        const [px, py] = toPanel(m, [[q[0], q[1]]])[0];
        const disc = ellipsePts(px, py, w, w, 10);
        fan(film, disc); fan(filmInk, grow(disc, ink));
      }
    }
  }
  return { fills, inks, lights, film, filmInk };
}
/** Water in a panel: three flat layers (ink, light blue, white highlights) so overlapping drops merge into one outlined stream */
export function Water({ m, t, cfg, ink, order }: { m: View; t: number; cfg: WaterCfg; ink: number; order: number }) {
  const w = waterShapes(cfg, t, m, ink);
  return (
    <>
      <PolyBatch tris={[...w.filmInk, ...w.inks]} color="#241608" order={order} />
      <PolyBatch tris={[...w.film, ...w.fills]} color={WATER_FILL} order={order + 1} />
      <PolyBatch tris={w.lights} color={WATER_HI} order={order + 2} op={0.95} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════ Goo
export type Sprite = { x: number; y: number; r: number; a: number }; // panel px (y up), radius, strength 0..1
export type GooProps = { sprites: Sprite[]; order?: number; th?: number; ow?: number; fill?: string; ink?: string; opacity?: number; res?: number; blur?: number; maxN?: number };
const V_SPRITE = `
attribute vec4 aInst; varying vec2 vUv; varying float vA;
void main() { vUv = position.xy; vA = aInst.w; gl_Position = projectionMatrix * viewMatrix * vec4(aInst.xy + position.xy * aInst.z, 0.0, 1.0); }`;
const F_SPRITE = `
varying vec2 vUv; varying float vA;
void main() { float d = dot(vUv, vUv); if (d >= 1.0) discard; float k = 1.0 - d; gl_FragColor = vec4(vA * k * k, 0.0, 0.0, 1.0); }`;
const V_SCREEN = `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const F_BLUR = `
uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tIn, vUv) * 0.2270270270;
  c += (texture2D(tIn, vUv + uDir * 1.3846153846) + texture2D(tIn, vUv - uDir * 1.3846153846)) * 0.3162162162;
  c += (texture2D(tIn, vUv + uDir * 3.2307692308) + texture2D(tIn, vUv - uDir * 3.2307692308)) * 0.0702702703;
  gl_FragColor = c;
}`;
// the threshold cuts the blurred field; the distance to the cut, in pixels, is (v - th) / |grad v|, so the ink line is the same width on every cloud
const F_SHOW = `
uniform sampler2D tField; uniform float uTh, uOw, uOp, uPx; uniform vec3 uFill, uInk; varying vec2 vUv;
void main() {
  float v = texture2D(tField, vUv).r;
  float g = max(length(vec2(dFdx(v), dFdy(v))), 1e-4);
  float d = (v - uTh) / g / uPx;
  float a = clamp(d + 0.5, 0.0, 1.0);
  float inner = clamp(d - uOw + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(uInk, uFill, inner), a * uOp);
  #include <colorspace_fragment>
}`;
function makeGoo(maxN: number, w: number, h: number) {
  const rt = () => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.UnsignedByteType });
  const rtA = rt(), rtB = rt();
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const data = new Float32Array(maxN * 4);
  const inst = new THREE.InstancedBufferAttribute(data, 4); inst.setUsage(THREE.DynamicDrawUsage);
  quad.setAttribute("aInst", inst);
  const spriteMat = new THREE.ShaderMaterial({ vertexShader: V_SPRITE, fragmentShader: F_SPRITE, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const spriteMesh = new THREE.Mesh(quad, spriteMat); spriteMesh.frustumCulled = false;
  const spriteScene = new THREE.Scene(); spriteScene.add(spriteMesh);
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const blurMat = new THREE.ShaderMaterial({ vertexShader: V_SCREEN, fragmentShader: F_BLUR, uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  const blurMesh = new THREE.Mesh(tri, blurMat); blurMesh.frustumCulled = false;
  const blurScene = new THREE.Scene(); blurScene.add(blurMesh);
  const show = new THREE.ShaderMaterial({
    vertexShader: V_SCREEN, fragmentShader: F_SHOW, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { tField: { value: rtA.texture }, uTh: { value: 0.4 }, uOw: { value: 2.5 }, uOp: { value: 1 }, uPx: { value: 1 }, uFill: { value: new THREE.Color("#ffffff") }, uInk: { value: new THREE.Color("#9fb2bf") } },
  });
  const screen = new THREE.BufferGeometry(); screen.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); screen.setIndex([0, 1, 2, 0, 2, 3]);
  const cam = new THREE.Camera(), col = new THREE.Color();
  return {
    screen, show,
    render(r: THREE.WebGLRenderer, camera: THREE.Camera, p: Required<Omit<GooProps, "order" | "res" | "maxN">>) {
      const n = Math.min(p.sprites.length, maxN);
      for (let i = 0; i < n; i++) { const s = p.sprites[i]; data[i * 4] = s.x; data[i * 4 + 1] = s.y; data[i * 4 + 2] = s.r; data[i * 4 + 3] = s.a; }
      inst.needsUpdate = true; quad.instanceCount = n;
      const prevRT = r.getRenderTarget(), prevAuto = r.autoClear, prevA = r.getClearAlpha(); r.getClearColor(col);
      r.autoClear = true; r.setClearColor(0x000000, 0);
      r.setRenderTarget(rtA); r.render(spriteScene, camera);
      for (let k = 0; k < p.blur; k++) {
        blurMat.uniforms.tIn.value = rtA.texture; blurMat.uniforms.uDir.value.set(1 / w, 0); r.setRenderTarget(rtB); r.render(blurScene, cam);
        blurMat.uniforms.tIn.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1 / h); r.setRenderTarget(rtA); r.render(blurScene, cam);
      }
      r.setRenderTarget(prevRT); r.autoClear = prevAuto; r.setClearColor(col, prevA);
      const u = show.uniforms;
      u.tField.value = rtA.texture; u.uTh.value = p.th; u.uOw.value = p.ow; u.uOp.value = p.opacity; u.uPx.value = r.getPixelRatio();
      u.uFill.value.set(p.fill); u.uInk.value.set(p.ink);
    },
    dispose() { rtA.dispose(); rtB.dispose(); quad.dispose(); tri.dispose(); screen.dispose(); spriteMat.dispose(); blurMat.dispose(); show.dispose(); },
  };
}
/** The goo pass: soft discs are added into an offscreen target (half the panel's size), blurred, and cut at a threshold with an AA edge and an ink line of `ow` px;
 *  clouds that come close merge into one, clouds that thin out tear. Place it between a background and a puppet with `order`. */
export function Goo({ sprites, order = 5, th = 0.4, ow = 2.5, fill = "#ffffff", ink = "#9fb2bf", opacity = 1, res = 0.5, blur = 2, maxN = 160 }: GooProps) {
  const size = useThree((s) => s.size);
  const w = Math.max(2, Math.round(size.width * res)), h = Math.max(2, Math.round(size.height * res));
  const kit = useMemo(() => makeGoo(maxN, w, h), [maxN, w, h]);
  useEffect(() => () => kit.dispose(), [kit]);
  const live = useRef<Required<Omit<GooProps, "order" | "res" | "maxN">>>({ sprites, th, ow, fill, ink, opacity, blur });
  live.current = { sprites, th, ow, fill, ink, opacity, blur };
  const mesh = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => { mesh.current!.onBeforeRender = (renderer, _scene, camera) => kit.render(renderer, camera, live.current); }, [kit]);
  return <mesh ref={mesh} geometry={kit.screen} material={kit.show} renderOrder={order} frustumCulled={false} />;
}

// ═══════════════════════════════════════════════════════════ Steam
export type Emitter = {
  box?: [number, number, number, number]; // x0, y0, x1, y1 (picture px) where particles are born, or
  seg?: [number, number, number, number, number]; // x0, y0, x1, y1, jitter: along a line, scattered by `jitter` px
  n: number; // how many are born over t0..t1
  r: [number, number]; // radius at birth and at its biggest (picture px)
  rise: [number, number]; // px / s
  life: [number, number]; // seconds
  strength?: number; // 0..1
  drift?: number; // sideways px / s
  at?: number[]; // birth times (seconds), instead of an even stream of births between t0 and t1 (a puff of breath)
  burst?: number; // the sideways push dies out with this rate (1/s): a burst instead of a drift
  dir?: 1 | -1; // every particle goes this way sideways (0.6-1.0 of `drift`), instead of either way
  lobes?: number; // lumps per cloud (4: a cloud, 3: a small puff, which a 4-lump cluster would make look square)
};
export type SteamCfg = { emitters: Emitter[]; t0: number; t1: number; stop: number; breakDur?: number; seed?: number };
/** Particles at time t, in picture px. They are born over t0..t1 (t0 before the first frame: the room is already full of steam), rise on three octaves of noise,
 *  grow and thin out; at `stop` nothing is born any more and everything that is left is torn apart, thrown up and gone within breakDur seconds. */
export function steamSprites(cfg: SteamCfg, t: number): Sprite[] {
  const out: Sprite[] = [], bd = cfg.breakDur ?? 0.6, seed = cfg.seed ?? 0;
  const tau = Math.max(0, t - cfg.stop);
  if (tau >= bd) return out;
  cfg.emitters.forEach((e, ei) => {
    const rate = e.n / (cfg.t1 - cfg.t0);
    for (let i = 0; i < e.n; i++) {
      const h = (k: number) => hash(i * k + ei * 91.7 + seed * 7.3);
      const tb = e.at ? e.at[i % e.at.length] + 0.04 * h(3.3) : cfg.t0 + (i + h(3.3)) / rate;
      if (tb > cfg.stop) continue;
      const life = lerp(e.life[0], e.life[1], h(5.1)), a = t - tb, u = a / life;
      if (a < 0 || u > 1) continue;
      let x0: number, y0: number;
      if (e.seg) { const u0 = h(7.7); x0 = lerp(e.seg[0], e.seg[2], u0) + (h(9.9) * 2 - 1) * e.seg[4]; y0 = lerp(e.seg[1], e.seg[3], u0) + (h(8.3) * 2 - 1) * e.seg[4]; }
      else { const b = e.box!; x0 = lerp(b[0], b[2], h(7.7)); y0 = lerp(b[1], b[3], h(9.9)); }
      const vy = lerp(e.rise[0], e.rise[1], h(11.3)), vx = e.dir ? e.dir * (e.drift ?? 14) * (0.6 + 0.4 * h(13.1)) : (h(13.1) * 2 - 1) * (e.drift ?? 14);
      const s1 = h(17.3) * 40, s2 = h(19.7) * 40;
      // rising on noise: three octaves each way, slower and smaller than the rise itself
      const kd = e.burst ?? 0; // > 0: the sideways push dies out (a burst); 0: it stays (a drift)
      let x = x0 + (kd > 0 ? (vx * (1 - Math.exp(-a * kd))) / kd : vx * a) + 15 * fbm(a * 0.9 + s1, 1), y = y0 - (vy * a + 0.5 * 8 * a * a) + 8 * fbm(a * 1.1 + s2, 2);
      // the break: every particle gets its own throw, so the cloud tears
      x += (h(23.1) * 2 - 1) * 110 * tau * (1 + tau);
      y -= (40 + 120 * h(29.3)) * tau * (1 + 1.2 * tau);
      const bf = Math.max(0, Math.min(1, (tau - 0.3 * bd * h(53.3)) / (bd * 0.7))); // this particle's own share of the break: they go one after another, not on one frame
      const grow = smooth(0, 1, Math.pow(u, 0.6));
      const r = (lerp(e.r[0], e.r[1], grow)) * (1 - 0.25 * smooth(0, 1, bf));
      const k = (e.strength ?? 0.9) * smooth(0, 0.12, u) * (1 - smooth(0.62, 1, u)) * (1 - smooth(0, 1, bf));
      if (k > 0.01) {
        // four lobes round the centre, turning slowly: the cloud's outline is lumpy and changes as it ages
        const turn = h(31.9) * 6.283 + a * (h(37.1) - 0.5) * 1.6;
        const nl = e.lobes ?? 4;
        for (let q = 0; q < nl; q++) {
          const an = turn + (q * 6.283) / nl + 0.7 * h(41.3 + q), off = r * (0.5 + 0.36 * h(43.7 + q * 5));
          out.push({ x: x + Math.cos(an) * off, y: y + Math.sin(an) * off * 0.78, r: r * (0.5 + 0.2 * h(47.9 + q * 3)), a: k });
        }
      }
    }
  });
  return out;
}
/** Steam in a panel: the particles of `cfg` at time t, mapped through the view and drawn by Goo. */
export function Steam({ m, t, cfg, order, ow, ...goo }: { m: View; t: number; cfg: SteamCfg; order: number; ow: number } & Partial<GooProps>) {
  const sprites = steamSprites(cfg, t).map((s) => ({ x: m.X(s.x), y: m.Y(s.y), r: s.r * m.s * 1.7, a: s.a }));
  return <Goo sprites={sprites} order={order} ow={ow} {...goo} />;
}

// ═══════════════════════════════════════════════════════════ finishing: shadows, vignette, grain
const SHADOW = new Map<string, THREE.CanvasTexture>();
function shadowTex(w: number, h: number, r: number, blur: number, round: boolean): THREE.CanvasTexture {
  const key = `${Math.round(w)}|${Math.round(h)}|${Math.round(r)}|${blur}|${round}`;
  let t = SHADOW.get(key);
  if (!t) {
    const pad = Math.ceil(blur * 2.2), W = Math.ceil(w + pad * 2), H = Math.ceil(h + pad * 2);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.filter = `blur(${blur}px)`; g.fillStyle = "#000";
    g.beginPath();
    if (round) g.ellipse(W / 2, H / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else g.roundRect(pad, pad, w, h, Math.min(r, w / 2, h / 2));
    g.fill();
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    SHADOW.set(key, t);
  }
  return t;
}
/** A soft shadow of a w x h plate (a rounded rectangle, or an ellipse) at (x, y) in panel px: put it under whatever sits on something, a little off to the side
 *  the light comes from. `color` is the shadow's colour (a dark of the surface), `op` how strong it is. */
export function ContactShadow({ x, y, w, h, r = 0, rot = 0, blur = 14, op = 0.4, color = "#1a0a02", round = false, order }: { x: number; y: number; w: number; h: number; r?: number; rot?: number; blur?: number; op?: number; color?: string; round?: boolean; order: number }) {
  if (op <= 0.004) return null;
  const tex = shadowTex(w, h, r, blur, round), pad = Math.ceil(blur * 2.2);
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, (rot * Math.PI) / 180]} renderOrder={order}>
      <planeGeometry args={[w + pad * 2, h + pad * 2]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={op} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
const SIL = new Map<string, THREE.CanvasTexture>();
type Src = THREE.Texture;
type Img = { width: number; height: number } & CanvasImageSource;
/** the silhouette of a picture (its alpha) as a blurred black shadow texture, at `half` of its size; blur is in px of the source picture; cached per picture and blur */
function silTex(tex: Src, blur: number, half: number): { t: THREE.CanvasTexture; pad: number } {
  const b = Math.max(0.5, Math.round(blur * 2) / 2), key = `${tex.uuid}|${b}|${half}`;
  const pad = Math.ceil(b * 2.4);
  let t = SIL.get(key);
  if (!t) {
    const im = tex.image as Img, sw = im.width, sh = im.height;
    const c = document.createElement("canvas"); c.width = Math.ceil((sw + pad * 2) * half); c.height = Math.ceil((sh + pad * 2) * half);
    const g = c.getContext("2d")!;
    const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
    const mg = m.getContext("2d")!;
    mg.drawImage(im, pad * half, pad * half, sw * half, sh * half);
    mg.globalCompositeOperation = "source-in"; mg.fillStyle = "#000"; mg.fillRect(0, 0, m.width, m.height); // the picture's alpha, in black
    g.filter = `blur(${b * half}px)`; g.drawImage(m, 0, 0);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    SIL.set(key, t);
  }
  return { t, pad };
}
/** A soft shadow cast by a picture's own shape: put it under the picture it belongs to (same x, y, w, h, rot, sx, sy), moved by (dx, dy) away from the light.
 *  `blur` and `dx`, `dy` are in px of the frame; w x h is the size the picture is shown at, and `tex` the loaded texture of the picture. */
export function ShadowOf({ tex, x, y, w, h, dx = 8, dy = -12, rot = 0, sx = 1, sy = 1, blur = 10, op = 0.4, color = "#1a0a02", order }: { tex: Src; x: number; y: number; w: number; h: number; dx?: number; dy?: number; rot?: number; sx?: number; sy?: number; blur?: number; op?: number; color?: string; order: number }) {
  if (op <= 0.004) return null;
  const im = tex.image as Img;
  const k = w / im.width; // frame px per source px
  const { t, pad } = silTex(tex, blur / k, 0.5);
  const PW = (im.width + pad * 2) * k, PH = (im.height + pad * 2) * k;
  return (
    <group position={[x, y, 0]} rotation={[0, 0, (rot * Math.PI) / 180]} scale={[sx, sy, 1]}>
      <mesh position={[dx / sx, dy / sy, 0]} renderOrder={order}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial map={t} color={color} transparent opacity={op} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
const VIG = new Map<string, THREE.CanvasTexture>();
/** A light vignette: the frame's edges darken a little, the middle stays as painted. */
export function Vignette({ w, h, op = 0.35, order }: { w: number; h: number; op?: number; order: number }) {
  let t = VIG.get("v");
  if (!t) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d")!, r = g.createRadialGradient(128, 128, 60, 128, 128, 182);
    r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; VIG.set("v", t);
  }
  return (
    <mesh renderOrder={order} frustumCulled={false}>
      <planeGeometry args={[w * 1.5, h * 1.5]} />
      <meshBasicMaterial map={t} transparent opacity={op} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
/** A very light seeded grain over the picture (DOM, so it can sit under the captions): a 512 px tile of fixed noise (public/sp/grain.png, made by scripts/fx-prep.py)
 *  overlaid, moved to a hashed place on every second frame. Off unless `on`. */
export function Grain({ f, on = false, amount = 0.14 }: { f: number; on?: boolean; amount?: number }) {
  if (!on) return null;
  const k = Math.floor(f / 2), ox = Math.floor(hash(k * 1.7) * 512), oy = Math.floor(hash(k * 2.9 + 4) * 512);
  return <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("sp/grain.png")})`, backgroundSize: "512px 512px", backgroundPosition: `${-ox}px ${-oy}px`, mixBlendMode: "overlay", opacity: amount, pointerEvents: "none" }} />;
}
