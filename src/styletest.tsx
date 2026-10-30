import React, { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Post, type Look } from "./stylepost";

// StyleTest: one 3D shot (Gary in the van, taco shop through the window), three looks.
// The scene graph is the same; `look` switches materials (toon / matcap) and the post shader in stylepost.tsx.
// Gary faces +z (the camera side), his left is +x (screen right: phone, window), his right is -x (screen left: burrito).

type V3 = [number, number, number];
const LookCtx = createContext<Look>("ink");
const FrameCtx = createContext(0);

// ── deterministic helpers ──
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash3 = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = (t: number) => t * t * (3 - 2 * t);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (i: number, j: number, k: number) => hash3(xi + i, yi + j, zi + k);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u(xf)), l(c(0, 1, 0), c(1, 1, 0), u(xf)), u(yf)), l(l(c(0, 0, 1), c(1, 0, 1), u(xf)), l(c(0, 1, 1), c(1, 1, 1), u(xf)), u(yf)), u(zf));
}
// push every vertex along its normal by smooth noise (same position -> same push, so UV seams stay closed)
function lumpGeo(g: THREE.BufferGeometry, seed: number, amt: number, freq = 3.2) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const d = (noise3(p.getX(i) * freq + seed, p.getY(i) * freq, p.getZ(i) * freq) - 0.5) * 2 * amt;
    p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  }
  p.needsUpdate = true;
  return g;
}

// ── materials per look ──
const toonGrad = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
function matcapTex(hex: string) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = hex; x.fillRect(0, 0, 256, 256);
  const shade = x.createRadialGradient(128, 128, 40, 128, 128, 132);
  shade.addColorStop(0, "rgba(70,30,10,0)"); shade.addColorStop(0.75, "rgba(70,30,10,0.28)"); shade.addColorStop(1, "rgba(50,20,10,0.6)");
  x.fillStyle = shade; x.fillRect(0, 0, 256, 256);
  const bounce = x.createRadialGradient(150, 236, 0, 150, 236, 120);
  bounce.addColorStop(0, "rgba(255,190,110,0.32)"); bounce.addColorStop(1, "rgba(255,190,110,0)");
  x.fillStyle = bounce; x.fillRect(0, 0, 256, 256);
  const lit = x.createRadialGradient(92, 80, 0, 92, 80, 110);
  lit.addColorStop(0, "rgba(255,246,228,0.62)"); lit.addColorStop(0.35, "rgba(255,240,220,0.22)"); lit.addColorStop(1, "rgba(255,240,220,0)");
  x.fillStyle = lit; x.fillRect(0, 0, 256, 256);
  const spec = x.createRadialGradient(86, 70, 0, 86, 70, 26);
  spec.addColorStop(0, "rgba(255,255,255,0.7)"); spec.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = spec; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// thumbprint / plasticine surface: fbm bumps plus a few concentric finger-ridge patches, as a normal map
const clayNormal = (() => {
  const N = 256, h = new Float32Array(N * N), r = rng(7);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, a = 0.5, f = 6;
    for (let o = 0; o < 4; o++) { v += a * noise3((x / N) * f + 5, (y / N) * f + 9, o * 3.1); a *= 0.5; f *= 2; }
    h[y * N + x] = v;
  }
  for (let k = 0; k < 7; k++) {
    const cx = r() * N, cy = r() * N, rx = 26 + r() * 30, ry = rx * (0.7 + r() * 0.4), ang = r() * 3;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - cx, dy = y - cy, ex = (dx * Math.cos(ang) + dy * Math.sin(ang)) / rx, ey = (-dx * Math.sin(ang) + dy * Math.cos(ang)) / ry;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d < 1) h[y * N + x] += 0.09 * Math.sin(d * 22) * (1 - d);
    }
  }
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const g = (xx: number, yy: number) => h[((yy + N) % N) * N + ((xx + N) % N)];
    const dx = (g(x + 1, y) - g(x - 1, y)) * 3.2, dy = (g(x, y + 1) - g(x, y - 1)) * 3.2;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * N + x) * 4;
    data[i] = (-dx / l * 0.5 + 0.5) * 255; data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; data[i + 2] = (1 / l * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; return t;
})();
const matCache = new Map<string, THREE.Material>();
function getMat(look: Look, hex: string, flat = false): THREE.Material {
  const key = `${look}${hex}${flat ? "f" : ""}`;
  let m = matCache.get(key);
  if (!m) {
    if (flat) m = new THREE.MeshBasicMaterial({ color: hex });
    else if (look === "clay") m = new THREE.MeshMatcapMaterial({ matcap: matcapTex(hex), normalMap: clayNormal, normalScale: new THREE.Vector2(0.55, 0.55) });
    else m = new THREE.MeshToonMaterial({ color: hex, gradientMap: toonGrad });
    matCache.set(key, m);
  }
  return m;
}

// ── a primitive with look-aware material, optional clay lumps ──
type PartProps = { g: () => THREE.BufferGeometry; c: string; p?: V3; r?: V3; s?: V3 | number; lump?: number; flat?: boolean; cast?: boolean; mat?: THREE.Material; flatShade?: boolean };
function Part({ g, c, p = [0, 0, 0], r = [0, 0, 0], s = 1, lump = 0.008, flat, cast = true, mat, flatShade, children }: React.PropsWithChildren<PartProps>) {
  const look = useContext(LookCtx);
  const geo = useMemo(() => { let x = g(); if (look === "clay" && lump > 0) lumpGeo(x, p[0] * 7 + p[1] * 3 + p[2], lump); if (flatShade) { if (x.index) x = x.toNonIndexed(); x.computeVertexNormals(); } return x; }, [look]); // eslint-disable-line react-hooks/exhaustive-deps
  const material = useMemo(() => {
    if (mat) return mat;
    return getMat(look, c, flat);
  }, [look, c, flat, mat]);
  return <mesh geometry={geo} material={material} position={p} rotation={r} scale={typeof s === "number" ? [s, s, s] : s} castShadow={cast && look !== "clay"} receiveShadow={look !== "clay"}>{children}</mesh>;
}
const sph = (r: number) => () => new THREE.SphereGeometry(r, 48, 32);
const cap = (r: number, len: number) => () => new THREE.CapsuleGeometry(r, len, 10, 24);
const rbox = (w: number, h: number, d: number, rad = 0.03) => () => new RoundedBoxGeometry(w, h, d, 5, rad);
const cyl = (r0: number, r1: number, h: number, seg = 32) => () => new THREE.CylinderGeometry(r0, r1, h, seg, 1);
const torus = (r: number, t: number, arc = Math.PI * 2) => () => new THREE.TorusGeometry(r, t, 16, 48, arc);

// limb between two points
function Limb({ a, b, r, c, lump }: { a: V3; b: V3; r: number; c: string; lump?: number }) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb), mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return <Part g={cap(r, Math.max(len - 2 * r, 0.001))} c={c} p={mid.toArray() as V3} r={[e.x, e.y, e.z]} lump={lump} />;
}

// ── colours ──
const SKIN = "#e8a584", SKIN_D = "#cf8465", HOOD = "#8b9199", HOOD_D = "#6f757d", STUB = "#5b5d64";
const SAUCE = "#d8321c", FOIL = "#cfd5dc", TORT = "#e7c78f";

// ── Gary's head: local origin = head centre, face toward +z ──
const HA: V3 = [0.42, 0.455, 0.4];
const hz = (x: number, y: number) => HA[2] * Math.sqrt(Math.max(0, 1 - (x / HA[0]) ** 2 - (y / HA[1]) ** 2));
const onHead = (x: number, y: number, o = 0): V3 => [x, y, hz(x, y) + o];

function Stubble() {
  const look = useContext(LookCtx);
  const { mats, n } = useMemo(() => {
    const r = rng(11), out: THREE.Matrix4[] = [];
    let guard = 0;
    while (out.length < 620 && guard++ < 20000) {
      const z = r() * 2 - 1, th = r() * Math.PI * 2, rr = Math.sqrt(1 - z * z);
      const d = new THREE.Vector3(rr * Math.cos(th), z, rr * Math.sin(th)); // y-up unit dir, z toward face is d.z
      const scalp = d.y > 0.5 && (d.z < 0.5 || d.y > 0.86);
      const jaw = d.y < 0.0 && d.y > -0.9 && d.z > -0.15 && Math.abs(d.x) > 0.06 * 0 && !(d.y > -0.34 && d.y < -0.22 && Math.abs(d.x) < 0.38 && d.z > 0.7);
      const side = Math.abs(d.x) > 0.8 && d.y > -0.2 && d.y < 0.5 && d.z < 0.2 && d.z > -0.5;
      if (!(scalp || jaw || side)) continue;
      if (d.y > -0.08 && d.y < 0.5 && d.z > 0.45) continue; // eyes, nose, brows
      const pos = new THREE.Vector3(d.x * HA[0], d.y * HA[1], d.z * HA[2]);
      const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d), new THREE.Vector3(0.0105, 0.0105, 0.006));
      out.push(m);
    }
    return { mats: out, n: out.length };
  }, []);
  return (
    <instancedMesh args={[undefined, undefined, n]} ref={(m) => { if (m) { mats.forEach((mm, i) => m.setMatrixAt(i, mm)); m.instanceMatrix.needsUpdate = true; } }} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <primitive object={getMat(look, STUB)} attach="material" />
    </instancedMesh>
  );
}

function Eye({ sd, look, lid }: { sd: 1 | -1; look: V3; lid: number }) {
  const R = 0.085;
  const pos = onHead(sd * 0.158, 0.065, -0.012);
  return (
    <group position={pos} rotation={[0, sd * 0.32, 0]}>
      <Part g={sph(R)} c="#f6f0e4" s={[1, 0.95, 0.9]} lump={0} />
      <Part g={sph(0.04)} c="#2a1a12" p={[look[0] * 0.03, look[1] * 0.03, R * 0.82]} s={[1, 1, 0.5]} lump={0} />
      <Part g={sph(0.015)} c="#ffffff" p={[look[0] * 0.03 - 0.012, look[1] * 0.03 + 0.014, R * 0.9]} s={[1, 1, 0.4]} lump={0} flat />
      {/* heavy upper lid: a skin cap over the top of the eyeball, lowered to just past the pupil centre */}
      <Part g={() => new THREE.SphereGeometry(R * 1.045, 32, 20, 0, Math.PI * 2, 0, 1.45 + lid * 0.35)} c={SKIN} s={[1, 0.95, 0.9]} lump={0} />
      <Part g={torus(R * 1.045 * Math.sin(1.45 + lid * 0.35), 0.0075, Math.PI)} c="#4a2a22" p={[0, R * 1.045 * 0.95 * Math.cos(1.45 + lid * 0.35), 0]} r={[Math.PI / 2, 0, Math.PI]} s={[1, 1, 0.9]} lump={0} />
      {/* bag under the eye */}
      <Part g={sph(0.07)} c={SKIN_D} p={[0, -0.08, 0.015]} s={[1, 0.28, 0.5]} lump={0} />
    </group>
  );
}

function Head({ chew }: { chew: number }) {
  const mouthPts = [[-0.115, -0.2], [-0.06, -0.222], [0.02, -0.226], [0.09, -0.205], [0.15, -0.16], [0.172, -0.135]].map(([x, y]) => new THREE.Vector3(...onHead(x, y, 0.004)));
  return (
    <group>
      <Part g={sph(1)} c={SKIN} s={HA} lump={0.012} />
      <Stubble />
      {[-1, 1].map((sd) => <Part key={sd} g={sph(0.05)} c={SKIN_D} p={[sd * 0.425, -0.0, -0.02]} s={[0.7, 1.7, 1.2]} lump={0} />)}
      {/* cheeks and jowls */}
      {([-1, 1] as const).map((sd) => <Eye key={sd} sd={sd} look={[-0.7, -0.15, 0]} lid={0.55} />)}
      {/* brows: his left (screen right) cocked up */}
      <Part g={cap(0.019, 0.11)} c="#6a6c73" p={onHead(-0.165, 0.19, 0.022)} r={[0, 0, Math.PI / 2 + 0.1]} lump={0} />
      <Part g={cap(0.019, 0.11)} c="#6a6c73" p={onHead(0.165, 0.235, 0.02)} r={[0, 0, Math.PI / 2 - 0.34]} lump={0} />
      {/* nose */}
      <Part g={sph(0.085)} c="#e39878" p={onHead(0, -0.03, 0.025)} s={[0.95, 1.05, 1.05]} lump={0.004} />
      {/* half-smile: line pulled up on his left, a dimple at the end */}
      <Part g={() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 24, 0.0125, 8)} c="#5a2420" lump={0} />
      <Part g={torus(0.03, 0.008, 1.4)} c="#b9715a" p={onHead(0.165, -0.15, 0.0)} r={[0, 0.3, 3.4]} lump={0} />
      {/* open mouth cavity that follows the chew */}
      <Part g={sph(0.05)} c="#3a1210" p={onHead(0.0, -0.225, -0.012)} s={[1.5, 0.15 + chew * 0.55, 0.5]} lump={0} />
      {/* chin and the hot-sauce drip */}
      <group position={[0, -chew * 0.025, 0]}>
        <Part g={sph(0.12)} c={SKIN} p={onHead(0.0, -0.325, -0.03)} s={[1.15, 0.8, 0.9]} lump={0.006} />
        <Part g={sph(0.042)} c={SAUCE} p={[-0.05, -0.36, 0.33]} s={[1.2, 1, 0.55]} lump={0} />
        <Part g={cap(0.017, 0.07)} c={SAUCE} p={[-0.05, -0.425, 0.315]} lump={0} />
        <Part g={sph(0.027)} c={SAUCE} p={[-0.05, -0.49, 0.31]} s={[1, 1.2, 1]} lump={0} />
      </group>
    </group>
  );
}

// ── the burrito: fat tortilla roll bitten open at the top, lower half in crumpled foil ──
function Burrito() {
  const look = useContext(LookCtx);
  const foilGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.14, 0.126, 0.3, 14, 6, true);
    const p = g.attributes.position, r = rng(5);
    for (let i = 0; i < p.count; i++) {
      const k = (hash3(p.getX(i) * 40, p.getY(i) * 40, 3) - 0.5) * 0.026;
      const l = Math.hypot(p.getX(i), p.getZ(i));
      p.setX(i, p.getX(i) * (1 + k / l)); p.setZ(i, p.getZ(i) * (1 + k / l)); p.setY(i, p.getY(i) + (r() - 0.5) * 0.012);
    }
    const f = g.toNonIndexed(); f.computeVertexNormals();
    return f;
  }, []);
  const foilMat = useMemo(() => look === "clay" ? getMat(look, "#c8cdd3") : new THREE.MeshToonMaterial({ color: FOIL, gradientMap: toonGrad, side: THREE.DoubleSide }), [look]);
  const fill = ["#6b3f25", "#4d7a2e", "#c8442b", "#e6a93a"];
  return (
    <group>
      {/* tortilla (lathe, bulging) */}
      <Part g={() => new THREE.LatheGeometry([[0.0, -0.1], [0.1, -0.1], [0.125, 0.04], [0.136, 0.2], [0.122, 0.32], [0.108, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 36)} c={TORT} lump={0.006} />
      {/* torn rim and the filling */}
      <Part g={torus(0.112, 0.03)} c={TORT} p={[0, 0.358, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 1, 1.2]} lump={0.01} />
      <Part g={sph(0.1)} c={fill[0]} p={[0, 0.362, 0]} s={[1.05, 0.4, 1.05]} lump={0.01} />
      <Part g={sph(0.05)} c={fill[1]} p={[-0.045, 0.4, 0.03]} s={[1.2, 0.7, 1]} lump={0.01} />
      <Part g={sph(0.04)} c={fill[2]} p={[0.04, 0.405, 0.04]} lump={0.01} />
      <Part g={sph(0.036)} c={fill[3]} p={[0.0, 0.415, -0.045]} s={[1.3, 0.8, 1]} lump={0.01} />
      <Part g={sph(0.034)} c={fill[1]} p={[0.07, 0.39, -0.02]} lump={0.01} />
      {/* foil: crumpled sleeve over the lower half, flat crimp at the bottom */}
      <mesh geometry={foilGeo} material={foilMat} position={[0, -0.04, 0]} castShadow={look !== "clay"} />
      <Part g={torus(0.138, 0.016)} c={FOIL} p={[0, 0.115, 0]} r={[Math.PI / 2, 0, 0]} flatShade lump={0.01} />
      <Part g={rbox(0.25, 0.04, 0.05, 0.015)} c={FOIL} p={[0, -0.185, 0]} r={[0, 0, 0.1]} flatShade lump={0.004} />
    </group>
  );
}

// a fist seen from the front: palm behind, four finger blobs across the front, thumb to the side
function Hand({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      <Part g={sph(0.09)} c={SKIN} p={[0, 0, -0.07]} s={[1.1, 1, 0.9]} lump={0.004} />
      {[0, 1, 2, 3].map((i) => <Part key={i} g={cap(0.026, 0.1)} c={SKIN} p={[0.0, -0.065 + i * 0.05, 0.12]} r={[0, 0, Math.PI / 2]} lump={0.002} />)}
      <Part g={cap(0.026, 0.05)} c={SKIN} p={[0.1, 0.0, 0.03]} r={[0.3, 0, 0.5]} lump={0.002} />
    </group>
  );
}

// Gary
function Gary({ frame }: { frame: number }) {
  const chew = 0.5 + 0.5 * Math.sin(frame * 0.55);
  const bob = Math.sin(frame * 0.55 + 0.4) * 0.006;
  const burritoPos: V3 = [-0.5, 0.98, 0.74];
  const phonePos: V3 = [0.5, 1.76, 0.28];
  return (
    <group rotation={[0, -0.3, 0]}>
      {/* torso: stained hoodie */}
      <Part g={sph(1)} c={HOOD} p={[0, 0.9, 0]} s={[0.52, 0.56, 0.45]} lump={0.012} />
      <Part g={torus(0.4, 0.075)} c={HOOD_D} p={[0, 0.5, 0.0]} r={[Math.PI / 2, 0, 0]} s={[1.15, 1.0, 0.95]} lump={0.01} />
      <Part g={torus(0.26, 0.07)} c={HOOD_D} p={[0, 1.4, -0.06]} r={[Math.PI / 2 - 0.2, 0, 0]} s={[1.05, 1.0, 1]} lump={0.01} />
      <Part g={rbox(0.62, 0.22, 0.12, 0.06)} c={HOOD_D} p={[0, 0.68, 0.37]} r={[-0.4, 0, 0]} lump={0.006} />
      {/* stains: grease, hot sauce */}
      <Part g={sph(0.09)} c="#5a3d2b" p={[-0.2, 0.98, 0.4]} s={[1.3, 0.9, 0.18]} r={[0, -0.3, 0.3]} lump={0} />
      <Part g={sph(0.06)} c={SAUCE} p={[0.17, 1.1, 0.4]} s={[1, 1.2, 0.18]} r={[0, 0.3, 0]} lump={0} />
      <Part g={sph(0.045)} c="#5a3d2b" p={[0.4, 0.8, 0.22]} s={[1, 1, 0.2]} r={[0, 1.0, 0]} lump={0} />
      {/* drawstrings */}
      {[-1, 1].map((sd) => <Part key={sd} g={cap(0.012, 0.22)} c="#ecedf0" p={[sd * 0.07, 1.22, 0.42]} r={[0.05, 0, sd * 0.06]} lump={0} />)}
      {/* legs (mostly behind the dash) */}
      {/* right arm (screen left) holds the burrito */}
      <Limb a={[-0.5, 1.22, 0.0]} b={[-0.66, 0.92, 0.28]} r={0.125} c={HOOD} />
      <Limb a={[-0.66, 0.92, 0.28]} b={[-0.5, 0.96, 0.66]} r={0.105} c={HOOD} />
      <Part g={torus(0.1, 0.03)} c={HOOD_D} p={[-0.5, 0.96, 0.64]} r={[1.2, 0.3, 0.6]} lump={0} />
      <group position={burritoPos} rotation={[0.3, 0, -0.36]}>
        <Burrito />
        <group position={[0, 0.0, 0.0]}><Hand /></group>
      </group>
      {/* left arm (screen right): the one phone, at the ear */}
      <Limb a={[0.5, 1.22, 0.0]} b={[0.8, 1.0, 0.1]} r={0.125} c={HOOD} />
      <Limb a={[0.8, 1.0, 0.1]} b={[0.64, 1.62, 0.22]} r={0.105} c={HOOD} />
      <Part g={torus(0.1, 0.03)} c={HOOD_D} p={[0.65, 1.58, 0.21]} r={[1.0, 0, 0.3]} lump={0} />
      <group position={phonePos} rotation={[0, -0.98, -0.2]} scale={1.3}>
        <Part g={rbox(0.11, 0.22, 0.022, 0.012)} c="#1d2028" lump={0} />
        <Part g={() => new THREE.PlaneGeometry(0.092, 0.2)} c="#a9d8ff" p={[0, 0, 0.0115]} flat cast={false} lump={0} />
        <Part g={() => new THREE.CircleGeometry(0.022, 20)} c="#3fc46d" p={[0, -0.03, 0.012]} flat cast={false} lump={0} />
        <Part g={() => new THREE.PlaneGeometry(0.06, 0.012)} c="#ffffff" p={[0, 0.06, 0.012]} flat cast={false} lump={0} />
        <Part g={sph(0.075)} c={SKIN} p={[0.0, -0.07, -0.05]} lump={0.003} />
        {/* fingers round the phone edge */}
        {[0, 1, 2].map((i) => <Part key={i} g={cap(0.017, 0.035)} c={SKIN} p={[-0.066, 0.05 - i * 0.045, -0.012]} lump={0.002} />)}
        <Part g={cap(0.019, 0.06)} c={SKIN} p={[0.06, -0.01, 0.004]} r={[0, 0, 0.3]} lump={0.002} />
      </group>
      {/* head with chew and bob */}
      <group position={[0, 1.82 + bob, 0.02]} rotation={[0.03, -0.12, -0.04 + Math.sin(frame * 0.55) * 0.01]}>
        <Head chew={chew} />
      </group>
    </group>
  );
}

// ── the van cab ──
function Cab() {
  const look = useContext(LookCtx);
  return (
    <group>
      {/* seat */}
      <Part g={rbox(1.0, 0.24, 0.95, 0.1)} c="#8a6a52" p={[0, 0.4, -0.05]} />
      <Part g={rbox(0.95, 1.2, 0.24, 0.1)} c="#8a6a52" p={[0, 1.05, -0.6]} r={[-0.08, 0, 0]} />
      <Part g={rbox(0.5, 0.34, 0.2, 0.09)} c="#8a6a52" p={[0, 1.85, -0.68]} />
      {/* back wall */}
      <Part g={rbox(5.5, 3.5, 0.1, 0.01)} c="#8f9c94" p={[-1.8, 1.5, -1.2]} />
      {/* dash, steering wheel */}
      <Part g={rbox(3.4, 0.55, 0.6, 0.12)} c={look === "verse" ? "#2f8a9e" : "#59606d"} p={[-0.5, 0.78, 1.45]} />
      <Part g={rbox(3.4, 0.5, 0.2, 0.08)} c={look === "verse" ? "#1f6a80" : "#46505c"} p={[-0.5, 1.0, 1.7]} r={[0.25, 0, 0]} />
      <group position={[0.02, 1.0, 0.95]} rotation={[-0.42, 0, 0]}>
        <Part g={torus(0.21, 0.028)} c="#20232a" lump={0.004} />
        <Part g={cyl(0.07, 0.07, 0.05, 20)} c="#20232a" r={[Math.PI / 2, 0, 0]} lump={0} />
        {[0, 2.1, 4.2].map((a) => <Part key={a} g={cap(0.016, 0.16)} c="#20232a" p={[Math.sin(a) * 0.11, Math.cos(a) * 0.11, 0]} r={[0, 0, -a]} lump={0} />)}
      </group>
      {/* driver door: white panel with a window opening (x = 0.98) */}
      <Part g={rbox(0.12, 0.95, 3.2, 0.02)} c="#e4dfd2" p={[1.0, 0.475, 0.0]} />
      <Part g={rbox(0.12, 0.35, 3.2, 0.02)} c="#e4dfd2" p={[1.0, 2.62, 0.0]} />
      <Part g={rbox(0.12, 1.5, 0.5, 0.02)} c="#e4dfd2" p={[1.0, 1.7, -1.3]} />
      <Part g={rbox(0.12, 1.5, 0.5, 0.02)} c="#e4dfd2" p={[1.0, 1.7, 1.25]} />
      <Part g={rbox(0.16, 0.06, 2.0, 0.02)} c="#3a3f4c" p={[0.96, 0.98, 0.0]} />
      {/* door handle, armrest */}
      <Part g={rbox(0.1, 0.07, 0.3, 0.03)} c="#3a3f4c" p={[0.9, 0.8, 0.3]} />
      {/* crumpled wrapper on the dash */}
      <Part g={() => new THREE.IcosahedronGeometry(0.13, 1)} c="#e6b93c" p={[-0.62, 1.1, 1.5]} s={[1.3, 0.8, 1]} r={[0.3, 0.6, 0.2]} flatShade lump={0.03} />
      <Part g={() => new THREE.IcosahedronGeometry(0.075, 1)} c="#d9362a" p={[-0.4, 1.07, 1.44]} r={[0.2, 0.2, 0.5]} flatShade lump={0.02} />
      <Part g={() => new THREE.IcosahedronGeometry(0.06, 1)} c="#f1e2b4" p={[-0.78, 1.06, 1.35]} flatShade lump={0.02} />
    </group>
  );
}

// ── the taco shop across the street ──
function signTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 400;
  const x = c.getContext("2d")!;
  x.fillStyle = "#c9291f"; x.fillRect(0, 0, 1024, 400);
  x.strokeStyle = "#fff3cf"; x.lineWidth = 14; x.strokeRect(22, 22, 980, 356);
  for (let i = 0; i < 28; i++) { x.fillStyle = "#ffe27a"; x.beginPath(); x.arc(40 + i * 35.4, 11, 7, 0, 7); x.arc(40 + i * 35.4, 389, 7, 0, 7); x.fill(); }
  x.font = '900 270px "Arial Black", Impact, sans-serif'; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineJoin = "round"; x.lineWidth = 26; x.strokeStyle = "#3b0d0a"; x.strokeText("TACOS", 512, 212);
  x.fillStyle = "#ffd23a"; x.fillText("TACOS", 512, 212);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function skyTexture() {
  const c = document.createElement("canvas"); c.width = 16; c.height = 256;
  const x = c.getContext("2d")!; const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#6aa6d8"); g.addColorStop(0.55, "#f3c98a"); g.addColorStop(1, "#f08a5a");
  x.fillStyle = g; x.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function Shop() {
  const look = useContext(LookCtx);
  const sign = useMemo(signTexture, []);
  const sky = useMemo(skyTexture, []);
  const X = 5.5, Z = -4.3;
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <group>
      <mesh position={[30, 8, -4]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[80, 40]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
      {/* street and pavement */}
      <Part g={() => new THREE.BoxGeometry(30, 0.2, 40)} c="#4b4a52" p={[12, -0.35, -8]} lump={0} cast={false} />
      <Part g={() => new THREE.BoxGeometry(6, 0.3, 40)} c="#b9b1a4" p={[7, -0.15, -8]} lump={0} cast={false} />
      {/* building */}
      <Part g={() => new THREE.BoxGeometry(5, 3.3, 9)} c="#e8a36a" p={[X + 2.5, 1.65, Z]} lump={0} />
      <Part g={rbox(0.25, 1.15, 2.8, 0.05)} c="#9b2a1f" p={[X - 0.12, 2.15, Z]} />
      <mesh position={[X - 0.26, 2.15, Z]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2.6, 1.01]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      {/* striped awning */}
      {stripes.map((i) => <Part key={i} g={rbox(0.9, 0.12, 0.32, 0.03)} c={i % 2 ? "#fff3dc" : "#2f8f4e"} p={[X - 0.5, 1.25, Z - 1.6 + i * 0.355]} r={[0, 0, -0.35]} lump={0} />)}
      {/* order window with warm light, door */}
      <Part g={rbox(0.06, 0.8, 1.7, 0.02)} c="#ffcf7a" p={[X - 0.04, 0.75, Z - 0.3]} flat lump={0} cast={false} />
      <Part g={rbox(0.06, 1.5, 0.8, 0.02)} c="#2d5f64" p={[X - 0.04, 0.8, Z + 1.7]} lump={0} />
      {/* a menu board and a plant */}
      <Part g={rbox(0.06, 0.6, 0.7, 0.02)} c="#26323a" p={[X - 0.07, 1.45, Z - 1.5]} lump={0} />
      <Part g={sph(0.3)} c="#3d8a3f" p={[X - 0.6, 0.2, Z + 0.95]} s={[1, 1.2, 1]} lump={0.03} />
      {look === "clay" && null}
    </group>
  );
}

// ── pop accent for "verse": a spiky burst and motion lines beside the phone ──
function Pop({ frame }: { frame: number }) {
  const pts = useMemo(() => { const sh = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 0.07 : 0.15; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ShapeGeometry(sh); }, []);
  const k = 1 + 0.08 * Math.sin(frame * 0.9);
  return (
    <group position={[0.49, 1.78, 0.45]} rotation={[0, -0.85, 0]}>
      <group position={[-0.2, 0.45, 0]} scale={k}>
        <mesh geometry={pts} position={[0, 0, -0.002]} scale={1.12}><meshBasicMaterial color="#1a0f2e" /></mesh>
        <mesh geometry={pts}><meshBasicMaterial color="#ffe14a" /></mesh>
        <mesh geometry={pts} scale={0.45} position={[0, 0, 0.002]}><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
      {[-15, -40, -65].map((deg, i) => {
        const a = (deg * Math.PI) / 180, r0 = 0.24 + 0.03 * Math.sin(frame * 0.9 + i);
        return <mesh key={i} position={[Math.cos(a) * (r0 + 0.07), Math.sin(a) * (r0 + 0.07) + 0.02, 0]} rotation={[0, 0, a]}><boxGeometry args={[0.15, 0.03, 0.01]} /><meshBasicMaterial color="#ffffff" /></mesh>;
      })}
    </group>
  );
}

function Rig({ frame }: { frame: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const t = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
    const e = t * t * (3 - 2 * t);
    camera.fov = 54;
    camera.position.set(-2.0 + e * 0.22, 1.9 - e * 0.04, 3.2 - e * 0.85);
    camera.lookAt(1.0 - e * 0.3, 1.3 + e * 0.05, -0.5 + e * 0.5);
    camera.near = 0.1; camera.far = 80;
    camera.updateProjectionMatrix();
  });
  return null;
}

function Lights({ look }: { look: Look }) {
  if (look === "clay") return <ambientLight intensity={0.5} />;
  return (
    <>
      <ambientLight intensity={look === "verse" ? 0.75 : 0.65} color="#c9d4ff" />
      <directionalLight position={[-3, 4.5, 4.5]} intensity={2.3} color="#fff0d8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={3} shadow-camera-bottom={-1} shadow-camera-near={0.5} shadow-camera-far={14} />
      <directionalLight position={[4, 2, 0.5]} intensity={1.1} color="#ffc27a" />
    </>
  );
}

export const StyleTest: React.FC<{ look: Look }> = ({ look }) => {
  const frame = useCurrentFrame();
  const bg = look === "clay" ? "#d8b48a" : look === "verse" ? "#5b3aa0" : "#e9dcc0";
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: 54, near: 0.1, far: 80, position: [-2.0, 1.9, 3.2] }} gl={{ antialias: false, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }}>
        <LookCtx.Provider value={look}>
          <FrameCtx.Provider value={frame}>
            <color attach="background" args={[bg]} />
            <Rig frame={frame} />
            <Lights look={look} />
            <Cab />
            <Gary frame={frame} />
            <Shop />
            {look === "verse" && <Pop frame={frame} />}
            <Post look={look} frame={frame} focus={3.8} />
          </FrameCtx.Provider>
        </LookCtx.Provider>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
