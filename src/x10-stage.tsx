import React from "react";
import { Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { AngerMark } from "./lips8-fx";
import rigJson from "./x10-rig.json" with { type: "json" };
import { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect, type Img } from "./x09-stage";
import { plugState, twitchAt, veinAt } from "./x10-sched";

// What the scenes of x10 (src/x10-scenes.tsx) are made of: the numbers of the cut pictures (src/x10-rig.json, scripts/x10-prep.py), and the people as puppets. The placing kit (a view of a plate, a sprite placed by an anchor point) is
// src/x09-stage.tsx's, re-exported here. A person is placed by the plate point of the neck pivot and the radius of the head in plate px (so that every person of a shot has a head of the size the shot wants).
export { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect };
export type { Img };
type Box = [number, number, number, number];
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; headFiles?: Record<string, string>; plugs?: number[][] };
type Crop = { file: string; x0: number; y0: number; w: number; h: number };
export const RG = rigJson as unknown as {
  plates: {
    front: { file: string; sign: Box; housing: Box; slats: Box; window: Box; door: Box; sidewalk: number; shutter: Box };
    counter: { file: string; chalk: Box; clock: [number, number, number]; espresso: Box; panini: Box; register: Box; jar: Box; jarMouth: number; top: [number, number] };
    window: { file: string; window: Box; door: Box; handle: [number, number]; slot: Box; walk: [number, number]; floor: number };
    till: { file: string };
  };
  crops: Record<"counterFront" | "wallL" | "wallM" | "wallR" | "glassTop" | "floor", Crop>;
  props: Record<"boxes" | "courier" | "cup" | "guyWalk" | "handSuit" | "handWork" | "handTiny" | "handGrey", Img>;
  apron: Img & { box: Box };
  puppets: Record<"ross" | "chuck" | "chuckWet" | "tyler" | "tylerSelfie" | "guy", PupJson>;
};
export const PR = RG.props, PL = RG.plates, CROP = RG.crops;
export type Who = keyof typeof RG.puppets;
/** the head's radius in the rig's px: how many plate px of head a puppet of this kind gets per rig px */
export const HEAD_R: Record<Who, number> = { ross: 195, chuck: 172, chuckWet: 171, tyler: 134, tylerSelfie: 134, guy: 161 };
export const D2R = Math.PI / 180;

/** a piece of a plate (a crop saved by scripts/x10-prep.py) drawn at its own place, over the people */
export function Over({ m, c, order, tint }: { m: ReturnType<typeof cam>; c: Crop; order: number; tint?: string }) {
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={c.x0} v={c.y0} k={1} order={order} tint={tint} />;
}

// ── Ross: the picture's body and x08's head (the plugs in or out)
const ROSS = RG.puppets.ross;
export function rossRig10(body: string, head: "both" | "l" | "none" | "red", mouthW?: number): Rig {
  const R = ROSS, B = (R.bodies as Record<string, Layer>)[body], H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
  return { ...R, layers: { head: hl, body: B }, bodies: { [body]: B }, mouthW: mouthW ?? R.mouthW } as unknown as Rig;
}
type Eye = PupJson["eyes"][number];
function Lid({ ex, ey, rx, ry, c, face, ink, order }: { ex: number; ey: number; rx: number; ry: number; c: number; face: string; ink: string; order: number }) {
  const yc = ey + ry - 2 * ry * c, hw = rx * Math.sqrt(Math.max(0, 1 - ((yc - ey) / ry) ** 2));
  const edge: Pt[] = Array.from({ length: 13 }, (_, i) => [ex - hw + (2 * hw * i) / 12, yc] as Pt);
  return (
    <>
      <Poly pts={ellipsePts(ex, (yc + ey + ry) / 2, Math.max(hw, rx * 0.7), (ey + ry - yc) / 2 + 2, 32)} color={face} order={order} />
      <Poly pts={ribbon(edge.map((p) => [p[0], p[1], 3.4]))} color={ink} order={order + 0.1} />
    </>
  );
}
/** what Ross wears on his head in this episode: the vein (pops at the fire, goes down when the phone rings), the twitching eye (the lid of his right eye of the picture jumps down and back) at the empty till */
function RossWear({ f, order, vein }: { f: number; order: number; vein: boolean }) {
  const v = veinAt(f), tw = twitchAt(f), eye: Eye = ROSS.eyes[1], [ex, ey] = locOf(ROSS, eye.cx, eye.cy);
  return (
    <>
      {tw > 0 && <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={ROSS.face} ink={ROSS.ink} order={order + 12.6} />}
      {vein && v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E (panel px per rig px) in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach }: { f: number; x: number; y: number; E: number; order?: number; body: string; head?: "both" | "l" | "none" | "red"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode }) {
  const rig = rossRig10(body, head ?? plugState(f));
  return <Puppet char="customer" rig={rig} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} vein />{attach}</>} />;
}
/** Chuck (dry or wet), Tyler (phone or selfie) and the guy: one puppet each */
export function PersonP({ who, x, y, E, order = 90, pose, flip = false, tint, attach }: { who: Exclude<Who, "ross">; x: number; y: number; E: number; order?: number; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode }) {
  return <Puppet char="customer" rig={RG.puppets[who] as unknown as Rig} pose={pose} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={attach} />;
}
/** a puppet's place from a plate point of its neck pivot and the radius of its head in plate px: the panel point and the scale in a view */
export function stand(m: ReturnType<typeof cam>, who: Who, u: number, v: number, headR: number) {
  return { x: m.X(u), y: m.Y(v), E: (headR / HEAD_R[who]) * m.s, k: headR / HEAD_R[who] };
}
/** a point of a puppet's head (puppet px from its neck pivot, y up) as a panel point, the puppet placed at (x, y) at scale E in `pose` (the head's tilt and dip, the body's breath) */
export function headPt(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, E: number, x: number, y: number, hx: number, hy: number): [number, number] {
  const a = (pose.tilt * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x + (pose.dx ?? 0) + (hx * c - hy * s + (pose.hdx ?? 0)) * E, y + pose.breath * E + (hx * s + hy * c + pose.bob) * E];
}
/** a point of a body picture (rig px of the padded picture, y down) as a puppet point (px from the neck pivot, y up): the pinch of the coin, the hand with the phone */
export const bodyLoc = (R: { pivot: [number, number] }, X: number, Y: number): [number, number] => locOf(R, X, Y);
export const ROSS_EARS: [number, number][] = [locOf(ROSS, 660.9, 647.0), locOf(ROSS, 997.7, 677.5)];   // the two tunnels in his ears (head px)
