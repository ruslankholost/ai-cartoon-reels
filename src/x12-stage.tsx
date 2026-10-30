import React from "react";
import { Picture, Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Squash } from "./pen-stage";
import rigJson from "./x12-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect, type Img } from "./x09-stage";
import { HaloOnWire } from "./x12-draw";
import { haloAt, plugState, twitchAt } from "./x12-sched";

// What the scenes of x12 (src/x12-scenes.tsx) are made of: the numbers of the cut pictures (src/x12-rig.json, scripts/x12-prep.py; x10's plates, its counter's front layer and the apron body come from src/x10-rig.json), and the people as puppets.
// The placing kit (a view of a plate, a sprite placed by an anchor point) is src/x09-stage.tsx's, re-exported here. A person is placed by the frame point of the middle of the head or the eyes and the scale E (frame px per picture px).
export { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect };
export type { Img };
type Box = [number, number, number, number];
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; headFiles?: Record<string, string>; plugs?: number[][]; purple?: string };
export const RG = rigJson as unknown as {
  props: { crown: Img; beard: Img; cupHand: Img };
  tag: Box;
  puppets: { ross: PupJson; chuckLatte: PupJson; chuckPoint: PupJson; chuckScream: PupJson; chuckCup: PupJson; chuckHold: PupJson };
};
/** x10's plates (the counter wall, the wall with the window and the door), the counter's front layer and the apron body of Ross */
export const RG10 = rig10 as unknown as {
  plates: { counter: { file: string; clock: [number, number, number]; top: [number, number] }; window: { file: string; window: Box; door: Box; floor: number } };
  crops: { counterFront: { file: string; x0: number; y0: number; w: number; h: number } };
};
export const PL10 = RG10.plates, CROP = RG10.crops;
export const D2R = Math.PI / 180;
export type Kind = "latte" | "point" | "scream" | "cup" | "hold";
const CHUCKS: Record<Kind, PupJson> = { latte: RG.puppets.chuckLatte, point: RG.puppets.chuckPoint, scream: RG.puppets.chuckScream, cup: RG.puppets.chuckCup, hold: RG.puppets.chuckHold };
/** the middle of the eyes in each Chuck picture (picture px) */
const EYES: Record<Kind, [number, number]> = Object.fromEntries((Object.keys(CHUCKS) as Kind[]).map((k) => [k, [(CHUCKS[k].eyes[0].cx + CHUCKS[k].eyes[1].cx) / 2, (CHUCKS[k].eyes[0].cy + CHUCKS[k].eyes[1].cy) / 2]])) as Record<Kind, [number, number]>;
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
export const PURPLE_FACE = "#b0468a";   // scripts/x12-prep.py purple_head: the furious purple on the skin's own lightness

// ── the counter's front layer (the plate's own pixels from its top edge, y 795, down): it goes over whoever stands behind the counter, so that he drops out of sight behind it
export function CounterFront({ m, order = 80 }: { m: ReturnType<typeof cam>; order?: number }) {
  const c = CROP.counterFront;
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={c.y0} k={1} order={order} />;
}
/** the view of the counter plate at scale s with the counter's top edge (plate row 795) on the frame row `yc` and the plate's column `u` in the middle */
export const counterView = (s: number, yc: number, u = 384) => cam(s, u, CROP.counterFront.y0 - (yc - H / 2) / s);

// ── Ross: the picture's body and x08's head (the plugs in or out)
const ROSS = RG.puppets.ross;
export function rossRig12(body: string, head: "both" | "l" | "none" | "red"): Rig {
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
/** the crown on his head (head px from the neck pivot, y up): its middle (x, y), width w, turned `rot` degrees; the hair's top is at about y 437 */
export const CROWN = { x: -2, y: 388, w: 284 };
export function Crown({ order, dx = 0, dy = 0, rot = 0 }: { order: number; dx?: number; dy?: number; rot?: number }) {
  const c = RG.props.crown, k = CROWN.w / c.w;
  return <Picture file={c.file} w={c.w * k} h={c.h * k} x={CROWN.x + dx} y={CROWN.y + dy} order={order} alpha rot={rot} />;
}
/** the cotton-ball beard on his chin, a wide U with its open gap round the code mouth (head px) */
export const BEARD = { x: -6, y: 96, w: 300 };
export function Beard({ order }: { order: number }) {
  const b = RG.props.beard, k = BEARD.w / b.w;
  return <Picture file={b.file} w={b.w * k} h={b.h * k} x={BEARD.x} y={BEARD.y} order={order} alpha />;
}
/** what Ross wears on his head in this episode: the twitching eye (shot 8), the crown (the king), the beard and the halo on its wire (God) */
function RossWear({ f, order, body, crownSlip }: { f: number; order: number; body: string; crownSlip: number }) {
  const tw = twitchAt(f), eye: Eye = ROSS.eyes[1], [ex, ey] = locOf(ROSS, eye.cx, eye.cy), h = haloAt(f);
  return (
    <>
      {tw > 0 && <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={ROSS.face} ink={ROSS.ink} order={order + 12.6} />}
      {body === "king" && <Crown order={order + 15} dy={-crownSlip * 18} rot={crownSlip * 6} dx={crownSlip * 10} />}
      {body === "god" && <Beard order={order + 12.9} />}
      {body === "god" && <HaloOnWire dx={h.dx} dy={h.dy} rot={h.rot} droop={h.droop} order={order + 16} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E (panel px per rig px) in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach, crownSlip = 0 }: { f: number; x: number; y: number; E: number; order?: number; body: string; head?: "both" | "l" | "none" | "red"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; crownSlip?: number }) {
  const rig = rossRig12(body, head ?? plugState(f));
  return <Puppet char="customer" rig={rig} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} body={body} crownSlip={crownSlip} />{attach}</>} />;
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
export const ROSS_MOUTH = locOf(ROSS, ROSS.mouth.cx, ROSS.mouth.cy);
/** the painted blank name tag on the tie picture: its middle (padded picture px) and its size */
export const TAG_BOX = RG.tag;

// ── Chuck: five pictures, each one puppet with its own head; `purple` 0..1 fades in the head's purple copy (and the colour of his lids); `flip` mirrors the whole puppet about his neck: the raised arm and the cup go to the other side
export function ChuckP({ kind, x, y, E, order = 90, pose, tint, purple = 0, flip = false, attach }: { kind: Kind; x: number; y: number; E: number; order?: number; pose: PuppetPose; tint?: string; purple?: number; flip?: boolean; attach?: React.ReactNode }) {
  const R = CHUCKS[kind], L = R.layers.head;
  const rig = purple > 0.01 ? ({ ...R, face: mixHex(R.face, PURPLE_FACE, purple) } as unknown as Rig) : (R as unknown as Rig);
  const puppet = (
    <Puppet char="customer" rig={rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} tint={tint}
      headAttach={<>{purple > 0.01 && R.purple && <Picture file={R.purple} w={L.w} h={L.h} x={L.x + L.w / 2 - R.pivot[0]} y={R.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} tint={tint} />}{attach}</>} />
  );
  return flip ? <Squash x={x} y={y} sx={-1} sy={1}>{puppet}</Squash> : puppet;   // (the whole puppet is mirrored about his neck: the head layer of a picture holds the tops of the shoulders too, which a mirrored body alone would not match)
}
/** the pivot (panel px) of a Chuck for the middle of his eyes at frame (cx, cy), scale E */
export const chuckAt = (kind: Kind, cx: number, cy: number, E: number) => { const R = CHUCKS[kind], [ex, ey] = EYES[kind]; return { x: cx - W / 2 - (ex - R.pivot[0]) * E, y: H / 2 - cy - (R.pivot[1] - ey) * E, E }; };
/** a point of a Chuck picture (picture px) as a frame point, for Chuck placed by chuckAt(kind, cx, cy, E) */
export const chuckPt = (kind: Kind, cx: number, cy: number, E: number, X: number, Y: number): [number, number] => { const [ex, ey] = EYES[kind]; return [cx + (X - ex) * E, cy + (Y - ey) * E]; };
export const CHUCK_PIVOT = (kind: Kind) => CHUCKS[kind].pivot;
export const CHUCK_MOUTH = (kind: Kind) => CHUCKS[kind].mouth;
export const CHUCK_EYES = (kind: Kind) => CHUCKS[kind].eyes;
export const frameToPanel = (x: number, y: number): [number, number] => [x - W / 2, H / 2 - y];
