import React from "react";
import { Puppet, type PuppetPose, type Rig } from "./sp-puppet";
import rig19 from "./x19-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import { CROP, CounterFront, FV, Flat, H, PL, PX, PY, PlateM, RG18, ROSS_EARS, TalkMouth, W, cam, counterView, headFrame, headPt, kid, locOf, rossAt, rossPt, sp, type Img, type Pic } from "./x18-stage";

// What the scenes of x19 (src/x19-scenes.tsx) are made of: the numbers of the pictures cut for this episode (src/x19-rig.json, scripts/x19-prep.py), the reused ones (x18's mom, seating plate, hand and cup: src/x18-rig.json; x10's counter wall, apron
// body and the plates: src/x10-rig.json) and the people as puppets or flat cut-outs. The kit that places a plate in a view and keeps a wall's colour at its edges (PlateM), the counter's front layer, a flat person placed by an anchor point (Flat) and the
// mouth drawn over a painted one (TalkMouth) are src/x13-stage.tsx's and src/x17-stage.tsx's, as x18's. Frame px: x right, y down, 1080 x 1920; a panel point is PX(x), PY(y).
export { CROP, CounterFront, FV, Flat, H, PL, PX, PY, PlateM, RG18, ROSS_EARS, TalkMouth, W, cam, counterView, headFrame, headPt, kid, locOf, rossAt, rossPt, sp };
export type { Img, Pic };
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; brows?: number[][][]; browColour?: string };
/** the new pictures of x19 (scripts/x19-prep.py cuts them from out/x19-cast): a flat person or prop is a sprite with what the code needs measured on it (a mouth to draw over, the eyes, a place to letter) */
export const RG19 = rig19 as unknown as {
  people: Record<string, Pic>;
  props: Record<string, Pic>;
  plates: Record<string, { file: string; w: number; h: number } & Record<string, unknown>>;
  puppets: { ross: { bodies: Record<string, Layer> } };
};

// ── Ross: x08's head (his tunnels in) on a body picture: x10's apron (he holds its straps), or x19's own (headphones: scripts/x19-prep.py registers it on the same head); his blown and usher pictures have their own painted heads and are flat (src/x19-art.tsx RossFlat)
const ROSS = (rig10 as unknown as { puppets: { ross: PupJson } }).puppets.ross;
export type RossBody = "apron" | "headphones";
const bodyLayer = (b: RossBody): Layer => RG19.puppets.ross.bodies?.[b] ?? (ROSS.bodies as Record<string, Layer>).apron;
export function rossRig19(body: RossBody, mouthW?: number): Rig {
  const R = ROSS, B = bodyLayer(body), H0 = R.layers.head;
  return { ...R, layers: { head: H0, body: B }, bodies: { [body]: B }, mouthW: mouthW ?? R.mouthW } as unknown as Rig;
}
/** Ross by his neck pivot (panel px) at scale E (frame px per picture px) in a pose; `attach` more on the head (head px from the neck pivot, y up). He never wears the code-drawn vein, lid twitch or purple: the head is x08's as painted */
export function RossP({ x, y, E, order = 90, body, pose, flip = false, tint, attach, mouthW }: { x: number; y: number; E: number; order?: number; body: RossBody; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  return <Puppet char="customer" rig={rossRig19(body, mouthW)} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={attach} />;
}
