import React from "react";
import { Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { AngerMark } from "./lips8-fx";
import rigJson from "./x11-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect, type Img } from "./x09-stage";
import { BulgeEyes } from "./x11-draw";
import { bulgeAt, plugState, twitchAt, veinAt } from "./x11-sched";

// What the scenes of x11 (src/x11-scenes.tsx) are made of: the numbers of the cut pictures (src/x11-rig.json, scripts/x11-prep.py; x10's plates and its Chuck come from src/x10-rig.json), and the people as puppets. The placing kit (a view of a plate,
// a sprite placed by an anchor point) is src/x09-stage.tsx's, re-exported here. A person is placed by the frame point of the middle of his eyes and the scale E (frame px per picture px): the faces of x11 are close-ups.
export { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect };
export type { Img };
type Box = [number, number, number, number];
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; headFiles?: Record<string, string>; plugs?: number[][] };
export const RG = rigJson as unknown as {
  plates: { car: { file: string }; bedroom: { file: string }; bathroom: { file: string }; bathdoor: { file: string }; bedWindow: Box; bedClock: Box; carRear: Box; bedHole: string; carHole: string };
  props: Record<"dash" | "case" | "curtain", Img>;
  wallet: { file: string; box: Box };
  puppets: Record<"ross" | "chuckSmush" | "chuckCurtain" | "chuckWallet", PupJson>;
};
/** x10's plates (the shop front, the counter, the wall with the window and the door) and its Chuck */
export const RG10 = rig10 as unknown as {
  plates: { front: { file: string; sign: Box; window: Box; door: Box; sidewalk: number }; counter: { file: string; clock: [number, number, number] }; window: { file: string; window: Box; door: Box; handle: [number, number] } };
  puppets: { chuck: PupJson };
};
export const PL = RG.plates, PR = RG.props, PL10 = RG10.plates;
export const D2R = Math.PI / 180;
export type Kind = "smush" | "curtain" | "wallet" | "x10";
const CHUCKS: Record<Kind, PupJson> = { smush: RG.puppets.chuckSmush, curtain: RG.puppets.chuckCurtain, wallet: RG.puppets.chuckWallet, x10: RG10.puppets.chuck };
/** the middle of the eyes in each Chuck picture (picture px) */
const EYES: Record<Kind, [number, number]> = Object.fromEntries((Object.keys(CHUCKS) as Kind[]).map((k) => [k, [(CHUCKS[k].eyes[0].cx + CHUCKS[k].eyes[1].cx) / 2, (CHUCKS[k].eyes[0].cy + CHUCKS[k].eyes[1].cy) / 2]])) as Record<Kind, [number, number]>;

// ── Ross: the picture's body and x08's head (the plugs in or out)
const ROSS = RG.puppets.ross;
export function rossRig11(body: string, head: "both" | "l" | "none" | "red"): Rig {
  const R = ROSS, B = (R.bodies as Record<string, Layer>)[body], H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
  return { ...R, layers: { head: hl, body: B }, bodies: { [body]: B } } as unknown as Rig;
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
/** what Ross wears on his head in this episode: the twitching eye (shot 4), the vein (the car), the bulging eyes (the bedroom) */
function RossWear({ f, order }: { f: number; order: number }) {
  const v = veinAt(f), tw = twitchAt(f), bg = bulgeAt(f), eye: Eye = ROSS.eyes[1], [ex, ey] = locOf(ROSS, eye.cx, eye.cy);
  return (
    <>
      {tw > 0 && <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={ROSS.face} ink={ROSS.ink} order={order + 12.6} />}
      {v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
      {bg > 0.02 && <BulgeEyes eyes={ROSS.eyes.map((e) => ({ c: locOf(ROSS, e.cx, e.cy), rx: e.rx, ry: e.ry }))} pupils={ROSS.pupils.map((q) => ({ c: locOf(ROSS, q[0], q[1]), r: q[2] }))} k={bg} f={f} order={order + 12.8} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E (panel px per rig px) in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach }: { f: number; x: number; y: number; E: number; order?: number; body: string; head?: "both" | "l" | "none" | "red"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode }) {
  const rig = rossRig11(body, head ?? plugState(f));
  return <Puppet char="customer" rig={rig} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} />{attach}</>} />;
}
/** the pivot (panel px) of Ross for the middle of his head at frame (cx, cy), scale E */
export const rossAt = (cx: number, cy: number, E: number) => ({ x: cx - W / 2, y: H / 2 - (cy + (ROSS.pivot[1] - ROSS.disc[1]) * E), E });
/** a point of a Ross picture (the padded picture's px, y down) as a frame point, for Ross placed by rossAt(cx, cy, E) */
export const rossPt = (cx: number, cy: number, E: number, X: number, Y: number): [number, number] => [cx + (X - ROSS.pivot[0]) * E, cy + (ROSS.pivot[1] - ROSS.disc[1]) * E + (Y - ROSS.pivot[1]) * E];
export const ROSS_PIVOT = ROSS.pivot, ROSS_DISC = ROSS.disc;
/** a point of Ross's head (head px from the neck pivot, y up) for a pose (the head's tilt and dip) as a panel point, Ross placed at (x, y) at scale E */
export function headPt(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, E: number, x: number, y: number, hx: number, hy: number): [number, number] {
  const a = (pose.tilt * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x + (pose.dx ?? 0) + (hx * c - hy * s + (pose.hdx ?? 0)) * E, y + pose.breath * E + (hx * s + hy * c + pose.bob) * E];
}
export const ROSS_EARS: [number, number][] = [locOf(ROSS, 660.9, 647.0), locOf(ROSS, 997.7, 677.5)];   // the two tunnels in his ears (head px)
export const ROSS_EYES = ROSS.eyes.map((e) => locOf(ROSS, e.cx, e.cy)) as [number, number][];

// ── Chuck: four pictures, each one puppet with its own head
export function ChuckP({ kind, x, y, E, order = 90, pose, tint, attach }: { kind: Kind; x: number; y: number; E: number; order?: number; pose: PuppetPose; tint?: string; attach?: React.ReactNode }) {
  return <Puppet char="customer" rig={CHUCKS[kind] as unknown as Rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} headAttach={attach} />;
}
/** the pivot (panel px) of a Chuck for the middle of his eyes at frame (cx, cy), scale E */
export const chuckAt = (kind: Kind, cx: number, cy: number, E: number) => { const R = CHUCKS[kind], [ex, ey] = EYES[kind]; return { x: cx - W / 2 - (ex - R.pivot[0]) * E, y: H / 2 - cy - (R.pivot[1] - ey) * E, E }; };
/** a point of a Chuck picture (picture px) as a frame point, for Chuck placed by chuckAt(kind, cx, cy, E) */
export const chuckPt = (kind: Kind, cx: number, cy: number, E: number, X: number, Y: number): [number, number] => { const [ex, ey] = EYES[kind]; return [cx + (X - ex) * E, cy + (Y - ey) * E]; };
export const CHUCK_PIVOT = (kind: Kind) => CHUCKS[kind].pivot;
export const CHUCK_MOUTH = (kind: Kind) => CHUCKS[kind].mouth;
export const CHUCK_EYES = (kind: Kind) => CHUCKS[kind].eyes;
export const CHUCK_PUPILS = (kind: Kind) => CHUCKS[kind].pupils;
export const frameToPanel = (x: number, y: number): [number, number] => [x - W / 2, H / 2 - y];
