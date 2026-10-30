import React, { useEffect } from "react";
import * as THREE from "three";
import { Panel, Picture, Puppet, type Char } from "./sp-puppet";
import { ContactShadow, Steam, Water, inkAt, useCanvasTexture, useImages, type SteamCfg, type WaterCfg } from "./sp-fx";
import rig5 from "./pen-rig.json";
import { FPS, holdPush, poseAt, sprayAt, type Char as PenChar, type Pose } from "./pen-sched";
import { PHONE } from "./pen-ui";

// The stage of "I'm Just Not a Sales Person" (src/pen-scenes.tsx): what every shot is made of. A shot is one full-frame ortho canvas (Panel, 1080 x 1920) showing a plate (a 768 x 1344 picture of
// public/sp/pen-bg-*), the puppets (src/sp-puppet.tsx; the rig is src/pen-rig.json), painted props, strips of the plate that go over the puppets (the desk, the counter, the sofa), and what is drawn
// in code (src/pen-ui.tsx). Two ways to place a puppet: by its head (the frame px where the middle of the head goes, and the scale: a close-up is placed by the face, whatever plate is behind it) or on
// the plate (a point of the plate, so that it stands behind a strip or on a floor). All numbers are px of the frame (x right, y down) unless a name says plate px or puppet px; FX / FY turn frame
// px into the panel's (origin in the middle, y up). A puppet's scale E is frame px per picture px: a close-up stays under 2 (the hair of the heads shows its flecks past that).
export const W = 1080, H = 1920;
export const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;
export const D2R = Math.PI / 180;
export type View = { s: number; u0: number; v0: number; X: (u: number) => number; Y: (v: number) => number };
/** the view of a plate: s frame px per plate px, (u0, v0) the plate point at the frame's top left */
export const view = (s: number, u0: number, v0: number): View => ({ s, u0, v0, X: (u) => -W / 2 + (u - u0) * s, Y: (v) => H / 2 - (v - v0) * s });
/** a panel point (what a puppet's place or a prop's place is) as a plate point of the view: where the Water and Steam kits are told to draw */
export const plateAt = (m: View, px: number, py: number): [number, number] => [m.u0 + (px + W / 2) / m.s, m.v0 + (H / 2 - py) / m.s];
/** the view that shows the plate at scale s with the plate point (u, v) at frame (fx, fy), kept inside the plate (a plate's edge never shows) */
export const frameOn = (s: number, u: number, v: number, fx: number, fy: number): View => view(s, Math.max(0, Math.min(768 - W / s, u - fx / s)), Math.max(0, Math.min(1344 - H / s, v - fy / s)));
export const bg = (m: View, file: string, order = 0, tint?: string) => {
  if (m.u0 < -1e-6 || m.v0 < -1e-6 || m.u0 + W / m.s > 768 + 1e-6 || m.v0 + H / m.s > 1344 + 1e-6) throw new Error(`the view (${m.s}, ${m.u0}, ${m.v0}) runs past the plate (768 x 1344): black would show at the edge`);
  return <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} tint={tint} />;
};
/** the part of a plate from row y0 down, drawn over the puppets */
export const strip = (m: View, file: string, y0: number, order: number) => <Picture file={file} w={768 * m.s} h={(1344 - y0) * m.s} x={m.X(384)} y={m.Y((1344 + y0) / 2)} order={order} alpha />;
/** the frame's point (fx, fy) stays put while the camera pushes in */
export const focusOn = (fx: number, fy: number): [number, number] => [FX(fx), FY(fy)];
/** the children squashed (sx, sy) about the point (x, y) of the panel: a landing's squash, with the feet on the point */
export const Squash = ({ x, y, sx, sy, children }: { x: number; y: number; sx: number; sy: number; children: React.ReactNode }) => (
  <group position={[x, y, 0]} scale={[sx, sy, 1]}><group position={[-x, -y, 0]}>{children}</group></group>
);
export const Group = ({ x, y, rot = 0, sx = 1, sy = 1, children }: { x: number; y: number; rot?: number; sx?: number; sy?: number; children: React.ReactNode }) => (
  <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[sx, sy, 1]}>{children}</group>
);

// ── the rig: where a puppet's neck pivot is, how far its head's middle is above it, how far its picture goes below it (the feet, unless the picture cut them off)
type Layer = { file: string; x: number; y: number; w: number; h: number };
type RigC = { pivot: [number, number]; disc: [number, number, number]; layers: { body: Layer; head: Layer }; bodies?: Record<string, Layer>; mouth: { cx: number; cy: number; w: number } };
export const RIG = rig5 as unknown as Record<PenChar, RigC>;
export type PropDef = { file: string; w: number; h: number; pivot: [number, number]; tip?: [number, number]; end?: [number, number]; face?: number[]; deck?: number[] };
const RAW = rig5 as unknown as { props: Record<string, any>; scenes: Record<string, any> };
export const PR = RAW.props, SC = RAW.scenes;
export const up = (c: PenChar) => RIG[c].pivot[1] - RIG[c].disc[1];
export const below = (c: PenChar, body?: string) => { const b = RIG[c].bodies?.[body ?? ""] ?? RIG[c].layers.body; return b.y + b.h - RIG[c].pivot[1]; };
/** the pivot (panel px) and scale that put the middle of the head at frame (fx, fy) at scale E */
export const atHead = (c: PenChar, fx: number, fy: number, E: number) => ({ x: FX(fx), y: FY(fy + up(c) * E), scale: E });
/** the pivot and scale that put a puppet on a plate: its neck pivot cut puppet px above plate row v, at plate scale sc */
export const atPlate = (m: View, u: number, v: number, sc: number, cut: number) => ({ x: m.X(u), y: m.Y(v - cut * sc), scale: sc * m.s });
/** a puppet point (puppet px from the neck pivot, y down) as a frame point, for a puppet placed at (x, y) (panel px) at scale E */
export const onPuppet = (p: { x: number; y: number; scale: number }, dx: number, dy: number): [number, number] => [p.x + dx * p.scale, p.y - dy * p.scale];

export function Actor({ c, f, x, y, scale, order = 40, flip, tint, tweak }: { c: PenChar; f: number; x: number; y: number; scale: number; order?: number; flip?: boolean; tint?: string; tweak?: (p: Pose) => Pose }) {
  const p = poseAt(c, f);
  return <Puppet char={c as Char} pose={tweak ? tweak(p) : p} x={x} y={y} scale={scale} order={order} flip={flip} tint={tint} />;
}
/** the soft shadow under whatever stands on something: an ellipse of width w with its middle at (x, y) (panel px) */
export const Foot = ({ x, y, w, order = 30, op = 0.4, h }: { x: number; y: number; w: number; order?: number; op?: number; h?: number }) => <ContactShadow x={x} y={y} w={w} h={h ?? w * 0.16} blur={Math.max(6, w * 0.035)} op={op} round color="#14100a" order={order} />;

/** a textured plane multiplied by a tint (the dim warm light of the garage on a painted prop) */
export function TPlane({ tex, x, y, w, h, rot = 0, sx = 1, sy = 1, op = 1, order, tint = "#ffffff" }: { tex: THREE.Texture; x: number; y: number; w: number; h: number; rot?: number; sx?: number; sy?: number; op?: number; order: number; tint?: string }) {
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[sx, sy, 1]} renderOrder={order}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={tint} transparent opacity={op} alphaTest={0.01} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
// ── a painted prop with a pivot: the group's origin is the pivot, so it turns and squashes about it
export function Prop({ tex, def, x, y, k, rot = 0, sx = 1, sy = 1, order, op = 1, tint }: { tex: THREE.Texture; def: PropDef; x: number; y: number; k: number; rot?: number; sx?: number; sy?: number; order: number; op?: number; tint?: string }) {
  const [px, py] = def.pivot;
  return (
    <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[k * sx, k * sy, 1]}>
      <TPlane tex={tex} x={def.w / 2 - px} y={py - def.h / 2} w={def.w} h={def.h} order={order} op={op} tint={tint} />
    </group>
  );
}

// ── a sheet that bends: a textured grid whose points go where `at` says (panel px; a and b are 0..1 across and down the sheet), shaded by `shade` (the poster's peel and curl)
export function Sheet({ tex, at, shade, nu = 12, nv = 16, order, op = 1 }: { tex: THREE.Texture; at: (a: number, b: number) => [number, number]; shade?: (a: number, b: number) => number; nu?: number; nv?: number; order: number; op?: number }) {
  const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const k = j * (nu + 1) + i, a = i / nu, b = j / nv, [x, y] = at(a, b), sh = shade ? shade(a, b) : 1;
    pos.set([x, y, 0], k * 3); uv.set([a, 1 - b], k * 2); col.set([sh, sh, sh], k * 3);
    if (i < nu && j < nv) idx.push(k, k + 1, k + nu + 1, k + 1, k + nu + 2, k + nu + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={order} frustumCulled={false}>
      <meshBasicMaterial map={tex} vertexColors transparent alphaTest={0.02} opacity={op} depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── effects in the show's style (src/sp-fx.tsx kits): the dust of the 1949 bowls (flat, outlined clouds of beige, small lumps that spread and thin, not foam) and the spray of a can's crack (drops with gravity)
export const DUST = { fill: "#ecdfc2", ink: "#7c6a47" };
/** dust: flat beige clouds with a thin brown outline (the Steam and Goo kit with small lumps, a quick burst that spreads and thins out), configured by the scene (src/pen-sched.ts dustAt gives the times) */
export function DustCloud({ m, f, cfg, order, fill = DUST.fill, ink = DUST.ink, ow = 1 }: { m: View; f: number; cfg: SteamCfg; order: number; fill?: string; ink?: string; ow?: number }) {
  return <Steam m={m} t={f / FPS} cfg={cfg} order={order} ow={inkAt(m.s) * ow} th={0.42} fill={fill} ink={ink} opacity={0.94} maxN={110} blur={1} res={0.5} />;
}
export function Spray({ m, f, at, t0, seed, k = 1, order }: { m: View; f: number; at: [number, number]; t0: number; seed: number; k?: number; order: number }) {
  const cfg: WaterCfg = { ...sprayAt(t0, seed), from: at, to: [at[0] + (seed % 2 ? 26 : -22) * k, at[1] + 6 * k], gravity: 2600 * k, spread: 14 * k };
  return <Water m={m} t={f / FPS} cfg={cfg} ink={inkAt(m.s)} order={order} />;
}

// ── a phone: the painted one of the effects test (public/sp/fx-phone-front.png, its glass is public/sp/fx-phone-screen.png) with a screen of src/pen-ui.tsx drawn on its glass
export const PHONE_PX = { w: 554, h: 1221, glass: { x: 32, y: 34, w: 486, h: 1159 } };
export function usePhone(draw: (g: CanvasRenderingContext2D) => void, key: string): { tex: THREE.Texture; back: THREE.Texture } {
  const [front, mask, back] = useImages(["sp/fx-phone-front.png", "sp/fx-phone-screen.png", "sp/fx-phone-back.png"]);
  const { x, y, w, h } = PHONE_PX.glass;
  const tex = useCanvasTexture(PHONE_PX.w, PHONE_PX.h, (g) => {
    g.drawImage(front.image as CanvasImageSource, 0, 0);
    const ui = document.createElement("canvas"); ui.width = PHONE_PX.w; ui.height = PHONE_PX.h;
    const ug = ui.getContext("2d")!;
    ug.save(); ug.translate(x, y); ug.scale(w / PHONE.w, h / PHONE.h); draw(ug); ug.restore();
    ug.globalCompositeOperation = "destination-in"; ug.drawImage(mask.image as CanvasImageSource, 0, 0); // only where the glass is (rounded corners, the notch)
    g.drawImage(ui, 0, 0);
  }, [front, mask, key]);
  return { tex, back };
}

// ── Denise's hand in the grey sleeve of her hoodie holding a phone (public/sp/tip-handPhone.png, 401 x 1067). A screen of src/pen-ui.tsx is drawn on the phone clipped to a clean rounded rectangle just inside the
// painted bezel (the phone's straight edges, fitted by scripts/pen-handphone.py: centre, turn in degrees clockwise, size in the picture's px), a notch and a status bar on top of it, the fingers and the
// palm (public/sp/pen-handphone-hand.png) over it all. The screen's design starts `top` px below the screen's top edge, under the notch.
export const HAND_PHONE = { w: 401, h: 1067, cx: 181.5, cy: 213.1, rot: 5.87, sw: 182, sh: 389, r: 27, top: 24 };
export function useHandPhone(draw: (g: CanvasRenderingContext2D) => void, key: string): THREE.Texture {
  const [pic, hand] = useImages(["sp/tip-handPhone.png", "sp/pen-handphone-hand.png"]), P = HAND_PHONE, K = 2;
  return useCanvasTexture(P.w * K, P.h * K, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
    const ui = document.createElement("canvas"); ui.width = P.w * K; ui.height = P.h * K;
    const u = ui.getContext("2d")!, x0 = -P.sw / 2, y0 = -P.sh / 2;
    u.save(); u.scale(K, K); u.translate(P.cx, P.cy); u.rotate(P.rot * D2R);
    u.beginPath(); u.roundRect(x0, y0, P.sw, P.sh, P.r); u.clip();
    u.fillStyle = "#ffffff"; u.fillRect(x0, y0, P.sw, P.sh);
    u.save(); u.translate(x0, y0 + P.top); u.scale(P.sw / PHONE.w, (P.sh - P.top) / PHONE.h); draw(u); u.restore(); // the screen, under the notch
    u.fillStyle = "#111"; u.font = "700 10.5px Arial, Helvetica, sans-serif"; u.textAlign = "left"; u.fillText("9:41", x0 + 22, y0 + 16); // the status bar's ears
    for (let i = 0; i < 4; i++) u.fillRect(P.sw / 2 - 40 + i * 3.4, y0 + 17 - (3 + i * 2), 2.2, 3 + i * 2); // signal and battery, small enough to clear the notch and the rounded corner
    u.beginPath(); u.roundRect(P.sw / 2 - 23, y0 + 10, 14, 7, 2); u.fill(); u.fillRect(P.sw / 2 - 8.7, y0 + 12, 1.6, 3);
    u.fillStyle = "#08090b"; u.beginPath(); u.roundRect(-46, y0 - 1, 92, 23, [0, 0, 11, 11]); u.fill(); // the notch, a clean shape
    u.fillStyle = "#26272c"; u.beginPath(); u.roundRect(-25, y0 + 8, 34, 5.5, 2.7); u.fill();
    u.fillStyle = "#171a22"; u.beginPath(); u.arc(27, y0 + 10.5, 4.4, 0, Math.PI * 2); u.fill();
    u.fillStyle = "#2c3a55"; u.beginPath(); u.arc(26, y0 + 9.5, 1.5, 0, Math.PI * 2); u.fill();
    u.restore();
    g.drawImage(ui, 0, 0);
    g.drawImage(hand.image as CanvasImageSource, 0, 0, P.w * K, P.h * K); // the fingers and the palm stay in front of the screen
  }, [pic, hand, key]);
}
/** a point of the screen's design (ux, uy of the 300 x 715 screen) as a panel point, for the hand's picture (its centre at frame (hx, hy), k frame px per picture px) */
export function handScreen(hx: number, hy: number, k: number, ux: number, uy: number): [number, number] {
  const P = HAND_PHONE, a = P.rot * D2R, dx = ((ux - PHONE.w / 2) * P.sw) / PHONE.w, dy = -P.sh / 2 + P.top + (uy * (P.sh - P.top)) / PHONE.h;
  return [FX(hx) + (P.cx + dx * Math.cos(a) - dy * Math.sin(a) - P.w / 2) * k, FY(hy) - (P.cy + dx * Math.sin(a) + dy * Math.cos(a) - P.h / 2) * k];
}

/** a shot: its canvas, a slow push in on a frame point (the hold's 1-3.5 %), the scene inside */
export const shot = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Inner f={f} /></Panel>
);
