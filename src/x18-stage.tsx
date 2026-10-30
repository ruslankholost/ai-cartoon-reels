import React from "react";
import { Puppet, type PuppetPose, type Rig } from "./sp-puppet";
import rig18 from "./x18-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import { H, W, cam, locOf, type Img } from "./x09-stage";
import { CounterFront, PL10, PlateM, ROSS_EARS, CROP, counterView, headPt } from "./x13-stage";
import { FV, Flat, TalkMouth, headFrame, kid, rossAt, rossPt, sp } from "./x17-stage";
import { PX, PY } from "./x13-draw";

// What the scenes of x18 (src/x18-scenes.tsx) are made of: the numbers of the cut pictures (src/x18-rig.json, scripts/x18-prep.py; the counter wall with its clock and its register, the wall with the window and the door, the till seen from above and
// Ross's apron body are x10's (src/x10-rig.json), the pastry case is x11's, the hand is x16's), and the people as puppets or flat cut-outs. The kit that places a plate in a view and keeps a wall's colour at its edges (PlateM), the counter's front
// layer, a flat person placed by an anchor point (Flat) and the mouth drawn over a painted one (TalkMouth) are src/x13-stage.tsx's and src/x17-stage.tsx's, re-exported here. Frame px: x right, y down, 1080 x 1920; a panel point is PX(x), PY(y).
export { CROP, CounterFront, FV, Flat, H, PL10, PX, PY, PlateM, ROSS_EARS, TalkMouth, W, cam, counterView, headFrame, headPt, kid, locOf, rossAt, rossPt, sp };
export type { Img };
type Box = [number, number, number, number];
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; brows?: number[][][]; browColour?: string };
export type Grin = { box: Box; cx: number; cy: number; w: number; h: number; skin: string };
/** a flat cut-out of a painted picture (x18-prep.py): its file and size, where its top left is in the painted picture (ox, oy), and what the code needs measured on it (a mouth to draw over, the eyes, a place to letter) */
export type Pic = Img & { grin?: Grin; eyes?: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils?: number[][]; skin?: string; [k: string]: unknown };
export const RG18 = rig18 as unknown as {
  people: Record<string, Pic>;
  props: Record<string, Pic>;
  plates: Record<string, { file: string; w: number; h: number } & Record<string, unknown>>;
  puppets: { ross: { bodies: Record<string, Layer> } };
};
const RG10 = rig10 as unknown as {
  plates: { counter: { file: string; clock: [number, number, number]; espresso: Box; register: Box; jar: Box; jarMouth: number; top: [number, number] }; window: { file: string; window: Box; door: Box; handle: [number, number]; slot: Box; floor: number }; till: { file: string } };
  props: { handTiny: Img };
  apron: Img & { box: Box };
  puppets: { ross: PupJson };
};
export const PL = RG10.plates;
export const D2R = Math.PI / 180;

// ── Ross: x08's head (his tunnels in) on a body picture: x10's apron (he holds its straps), then x18's own four (tape, finger, feetup, wipe: scripts/x18-prep.py registers them on the same head)
const ROSS = RG10.puppets.ross;
export type RossBody = "apron" | "tape" | "finger" | "feetup" | "wipe";
const bodyLayer = (b: RossBody): Layer => RG18.puppets.ross.bodies?.[b] ?? (ROSS.bodies as Record<string, Layer>).apron;
export const hasBody = (b: RossBody) => b === "apron" || !!RG18.puppets.ross.bodies?.[b];
export function rossRig18(body: RossBody, mouthW?: number): Rig {
  const R = ROSS, B = bodyLayer(body), H0 = R.layers.head;
  return { ...R, layers: { head: H0, body: B }, bodies: { [body]: B }, mouthW: mouthW ?? R.mouthW } as unknown as Rig;
}
/** Ross by his neck pivot (panel px) at scale E (frame px per picture px) in a pose; `attach` more on the head (head px from the neck pivot, y up). He never wears the code-drawn vein, lid twitch or purple: the head is x08's as painted */
export function RossP({ x, y, E, order = 90, body, pose, flip = false, tint, attach, mouthW }: { x: number; y: number; E: number; order?: number; body: RossBody; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  return <Puppet char="customer" rig={rossRig18(body, mouthW)} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={attach} />;
}
export const ROSS_PIVOT = ROSS.pivot, ROSS_DISC = ROSS.disc;
