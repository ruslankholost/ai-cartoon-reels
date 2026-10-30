import React from "react";
import { Picture, Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { AngerMark } from "./lips8-fx";
import rig15 from "./x15-rig.json" with { type: "json" };
import rig14 from "./x14-rig.json" with { type: "json" };
import rig13 from "./x13-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import rig08 from "./x08-rig.json" with { type: "json" };
import { H, Spr, W, cam, locOf } from "./x09-stage";
import { PL10, PlateM, ROSS_EARS, counterView, headPt } from "./x13-stage";
import { pupilAt } from "./sp-eyes";
import { MosaicMesh, mosaicCells, mosaicPop, type MosaicLook, type MosaicShape } from "./x15-draw";
import { bleepAt, bulgeAt, plugState, purpleAt, twitchAt, veinAt } from "./x15-sched";

// What the scenes of x15 (src/x15-scenes.tsx) are made of: the numbers of the cut pictures (src/x15-rig.json, scripts/x15-prep.py; the plates, the counter's front layer and Ross's wide body are x10's (src/x10-rig.json), his armless 'wideBare'
// is x13's, the counter without its jar and its front layer are x14's, x08's hand with the phone), and the people as puppets. The kit that places a plate in a view and keeps a wall's colour at its edges is src/x13-stage.tsx's, re-exported here.
// A person is placed by the frame point of the middle of the head or the eyes and a scale (frame px per picture px).
export { PL10, PlateM, ROSS_EARS, cam, counterView, headPt };
type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; headFiles?: Record<string, string>; plugs?: number[][]; purple?: Record<string, string>; brows?: number[][][]; browColour?: string };
type Crop = { file: string; x0: number; y0: number; w: number; h: number };
type Img = { file: string; w: number; h: number; ox: number; oy: number };
export const RG15 = rig15 as unknown as { props: { door: { file: string; door: number[]; slot: number[]; knob: number[]; glass: number[]; floor: number; mat: number[] }; invoice: Img & { paper: [number, number, number, number] }; envelope: Img; button: Img }; puppets: { ross: PupJson; chuckLick: PupJson; chuckPluck: PupJson; chuckPlate: PupJson; bleepGuy: PupJson; bleepGuyReceipt: PupJson } };
const RG14 = rig14 as unknown as { props: { counter: { file: string }; counterFront: Crop; counterFace: Crop } };
const RG13 = rig13 as unknown as { puppets: { ross: PupJson } };
const RG10 = rig10 as unknown as { puppets: { ross: PupJson } };
const RG08 = rig08 as unknown as { ross: PupJson; props: { hand: { file: string; screenFile: string; w: number; h: number; ox: number; oy: number; screen: [number, number, number, number] } } };
export const HAND = RG08.props.hand;
/** x14's counter plate without the glass jar and its front layer (the plate's own pixels from its top edge, row 795, down): it goes over whoever stands behind the counter, so that he is cut off by it; its face (the rows from 905 down) goes over a hand that comes down on it */
export const COUNTER = RG14.props.counter.file;
export function CounterFront({ m, order = 80 }: { m: ReturnType<typeof cam>; order?: number }) {
  const c = RG14.props.counterFront;
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={c.y0} k={1} order={order} />;
}
export function CounterFace({ m, order }: { m: ReturnType<typeof cam>; order: number }) {
  const c = RG14.props.counterFace;
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={c.y0} k={1} order={order} />;
}
export const D2R = Math.PI / 180;
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
export const PURPLE_FACE = "#b0468a";   // scripts/x12-prep.py purple_head: the furious purple on the skin's own lightness

// ── Ross: the picture's body and x08's head (the plugs in or out, purple or not)
const ROSS = RG10.puppets.ross;
/** the pictures of his body: x15's call (the phone at his ear), lean (bent over, fists down), envelopes (a fistful), buried (up to his neck in them, one hand up) and receipt (the strip of paper in both hands); x13's armless wideBare */
export type RossBody = "call" | "lean" | "envelopes" | "buried" | "receipt" | "wideBare" | "wide";
const bodyLayer = (b: RossBody): Layer => (RG15.puppets.ross.bodies?.[b] ?? RG13.puppets.ross.bodies?.[b] ?? (ROSS.bodies as Record<string, Layer>)[b]);
export function rossRig15(body: RossBody, head: "both" | "l" | "none", mouthW?: number): Rig {
  const R = ROSS, B = bodyLayer(body), H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
  return { ...R, layers: { head: hl, body: B }, bodies: { [body]: B }, mouthW: mouthW ?? R.mouthW } as unknown as Rig;
}
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
/** the bulging eyes: each eye of the picture becomes a bigger round white ball with an ink rim (they push out past the face's outline and each other), a tiny pupil, and a few red veins; `k` 0..1.1 how far, `gaze` where he looks */
function Bulge({ k, gaze, order, ink, white }: { k: number; gaze: [number, number]; order: number; ink: string; white: string }) {
  if (k <= 0.02) return null;
  return (
    <>
      {ROSS.eyes.map((e, i) => {
        const [x, y] = locOf(ROSS, e.cx, e.cy), s = 1 + 0.3 * k, rx = e.rx * s, ry = e.ry * s * 1.02, side = i === 0 ? -1 : 1;
        const cx = x + side * 7 * k, cy = y + 6 * k;
        const q = ROSS.pupils[i], [qx, qy] = pupilAt({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry }, [e.cx, e.cy], q[2], gaze, 6), [lx, ly] = locOf(ROSS, qx, qy);
        const pr = q[2] * (1 - 0.42 * Math.min(1, k)), px = cx + (lx - x) * s, py = cy + (ly - y) * s;
        return (
          <React.Fragment key={i}>
            <Poly pts={ellipsePts(cx, cy, rx + 3.6, ry + 3.6, 40)} color={ink} order={order} />
            <Poly pts={ellipsePts(cx, cy, rx, ry, 40)} color={white} order={order + 0.1} />
            {[[-0.62, 0.52], [0.7, 0.4], [-0.15, -0.78], [0.5, -0.7]].map(([ax, ay], j) => <Poly key={j} pts={ribbon([[cx + ax * rx, cy + ay * ry, 2.4], [cx + ax * rx * 0.62, cy + ay * ry * 0.62, 1.6]])} color="#c7444a" order={order + 0.15} op={0.85} />)}
            <Poly pts={ellipsePts(px, py, pr + 0.8, pr + 0.8, 20)} color={ink} order={order + 0.2} />
            <Poly pts={ellipsePts(px, py, pr, pr, 20)} color="#060708" order={order + 0.25} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── the mosaic over his face (head px from the neck pivot, y up): the numbers come from his head (the disc, the eyes, the mouth). The mouth's box is the open furious mouth and a little more; half a face is the part of the face under the pupils; the face is the
// disc with the ears; the head is the disc, the ears and the hair on top
const [HX, HY] = locOf(ROSS, ROSS.disc[0], ROSS.disc[1]), HR = ROSS.disc[2];
const MOUTH_AT = locOf(ROSS, ROSS.mouth.cx, ROSS.mouth.cy);
const EYES_AT = ROSS.eyes.map((e) => [...locOf(ROSS, e.cx, e.cy), e.rx, e.ry] as [number, number, number, number]);
const MOSAIC: Record<string, MosaicShape> = {
  mouth: { cx: MOUTH_AT[0], cy: MOUTH_AT[1] - 33, a: 78, b: 47, ellipse: false, cell: 19 },   // (from 14 px over the lip line down to the chin line: the open mouth hangs about 74 px under the lip line, the chin is 78 px under it)
  half: { cx: HX, cy: HY, a: HR + 8, b: HR + 8, ellipse: true, cell: 27, cutY: HY - 12 },
  face: { cx: HX, cy: HY, a: HR + 22, b: HR + 15, ellipse: true, cell: 29 },
  head: { cx: HX, cy: HY + 32, a: HR + 46, b: HR + 56, ellipse: true, cell: 32 },
};
const LOOK: MosaicLook = { kind: "mouth", mouth: [MOUTH_AT[0], MOUTH_AT[1]], eyes: EYES_AT, top: HY + HR - 40 };
/** the mosaic of the bleep that is sounding on frame f: on the head, in the head's own group (it tilts and dips with it), over everything on the head */
export function RossMosaic({ f, order }: { f: number; order: number }) {
  const b = bleepAt(f);
  if (!b || b.stage === "word") return null;
  const sh = MOSAIC[b.stage], age = (f - b.f0) / 30, ph = Math.floor((f - b.f0) / 2), s = mosaicPop(age);
  return (
    <Group x={sh.cx} y={sh.cy} sx={s} sy={s}>
      <group position={[-sh.cx, -sh.cy, 0]}><MosaicMesh cells={mosaicCells(sh, { ...LOOK, kind: b.stage }, b.i * 3.7 + 1, ph)} order={order} /></group>
    </Group>
  );
}
/** the middle of the mosaic of a stage as a point of his head (head px), for the scenes that start the red pop from it */
export const mosaicAt = (stage: string): [number, number] => [MOSAIC[stage].cx, MOSAIC[stage].cy];

/** what Ross wears on his head in this episode: the purple snap (the purple copy of the head over it), the twitching eyes (the lid of an eye jumps down and back), the vein, the bulging eyes, the mosaic of the bleep */
function RossWear({ f, order, gaze, purple, face, head }: { f: number; order: number; gaze: [number, number]; purple: number; face: string; head: "both" | "l" | "none" }) {
  const v = veinAt(f), bulge = bulgeAt(f), tw = [twitchAt(f, 0), twitchAt(f, 1)], pf = RG15.puppets.ross.purple?.[head], L = ROSS.layers.head;
  return (
    <>
      {purple > 0.01 && pf && <Picture file={pf} w={L.w} h={L.h} x={L.x + L.w / 2 - ROSS.pivot[0]} y={ROSS.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} />}
      {bulge <= 0.02 && [0, 1].map((i) => tw[i] > 0 && <Lid key={i} ex={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[0]} ey={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[1]} rx={ROSS.eyes[i].rx + 3} ry={ROSS.eyes[i].ry + 3} c={tw[i]} face={face} ink={ROSS.ink} order={order + 12.6} />)}
      <Bulge k={bulge} gaze={gaze} order={order + 12.2} ink={ROSS.ink} white={ROSS.white ?? "#fdfaf3"} />
      {v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
      <RossMosaic f={f} order={order + 16} />
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach, mouthW }: { f: number; x: number; y: number; E: number; order?: number; body: RossBody; head?: "both" | "l" | "none"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  const hd = head ?? plugState(f), rig = rossRig15(body, hd, mouthW), purple = purpleAt(f), face = purple > 0.01 ? mixHex(ROSS.face, PURPLE_FACE, purple) : ROSS.face;
  const rg = purple > 0.01 ? ({ ...rig, face } as unknown as Rig) : rig;
  return <Puppet char="customer" rig={rg} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} gaze={pose.gaze ?? [0, 0]} purple={purple} face={face} head={hd} />{attach}</>} />;
}
/** the pivot (panel px) of Ross for the middle of his head at frame (cx, cy), scale E */
export const rossAt = (cx: number, cy: number, E: number) => ({ x: cx - W / 2, y: H / 2 - (cy + (ROSS.pivot[1] - ROSS.disc[1]) * E), E });
/** a point of a Ross picture (the padded picture's px, y down) as a frame point, for Ross placed by rossAt(cx, cy, E) */
export const rossPt = (cx: number, cy: number, E: number, X: number, Y: number): [number, number] => [cx + (X - ROSS.pivot[0]) * E, cy + (ROSS.pivot[1] - ROSS.disc[1]) * E + (Y - ROSS.pivot[1]) * E];
export const ROSS_PIVOT = ROSS.pivot, ROSS_DISC = ROSS.disc;
/** a point of his head (head px from the neck pivot, y up) as a FRAME point for Ross at head (cx, cy) scale E in pose `pose` (the head's tilt and dip): the mouth's mosaic is where the red pops start */
export function headFrame(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, cx: number, cy: number, E: number, hp: [number, number]): [number, number] {
  const r = rossAt(cx, cy, E), p = headPt(pose, E, r.x, r.y, hp[0], hp[1]);
  return [p[0] + W / 2, H / 2 - p[1]];
}

// ── Chuck: three pictures (lick, pluck, plate), each one puppet with its own head; `flip` mirrors the whole puppet about his neck
export type Kind = "lick" | "pluck" | "plate";
const CHUCKS: Record<Kind, PupJson> = { lick: RG15.puppets.chuckLick, pluck: RG15.puppets.chuckPluck, plate: RG15.puppets.chuckPlate };
const EYES: Record<Kind, [number, number]> = Object.fromEntries((Object.keys(CHUCKS) as Kind[]).map((k) => [k, [(CHUCKS[k].eyes[0].cx + CHUCKS[k].eyes[1].cx) / 2, (CHUCKS[k].eyes[0].cy + CHUCKS[k].eyes[1].cy) / 2]])) as Record<Kind, [number, number]>;
export function ChuckP({ kind, x, y, E, order = 90, pose, tint, flip = false, attach }: { kind: Kind; x: number; y: number; E: number; order?: number; pose: PuppetPose; tint?: string; flip?: boolean; attach?: React.ReactNode }) {
  const R = CHUCKS[kind];
  const puppet = <Puppet char="customer" rig={R as unknown as Rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} tint={tint} headAttach={attach} />;
  return flip ? <Squash x={x} y={y} sx={-1} sy={1}>{puppet}</Squash> : puppet;   // (the whole puppet is mirrored about his neck: the head layer of a picture holds the tops of the shoulders too, which a mirrored body alone would not match)
}
/** the pivot (panel px) of a Chuck for the middle of his eyes at frame (cx, cy), scale E */
export const chuckAt = (kind: Kind, cx: number, cy: number, E: number) => { const R = CHUCKS[kind], [ex, ey] = EYES[kind]; return { x: cx - W / 2 - (ex - R.pivot[0]) * E, y: H / 2 - cy - (R.pivot[1] - ey) * E, E }; };
/** a point of a Chuck picture (picture px) as a frame point, for Chuck placed by chuckAt(kind, cx, cy, E) */
export const chuckPt = (kind: Kind, cx: number, cy: number, E: number, X: number, Y: number): [number, number] => { const [ex, ey] = EYES[kind]; return [cx + (X - ex) * E, cy + (Y - ey) * E]; };

// ── the Bleep Guy: two pictures (his thumb on the button, the receipt in his hands), each one puppet with its own head; his face never moves but for the blink
export type BleepKind = "button" | "receipt";
const BLEEPS_RIG: Record<BleepKind, PupJson> = { button: RG15.puppets.bleepGuy, receipt: RG15.puppets.bleepGuyReceipt };
export function BleepP({ kind, x, y, E, order = 90, pose, flip = false }: { kind: BleepKind; x: number; y: number; E: number; order?: number; pose: PuppetPose; flip?: boolean }) {
  const puppet = <Puppet char="customer" rig={BLEEPS_RIG[kind] as unknown as Rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} />;
  return flip ? <Squash x={x} y={y} sx={-1} sy={1}>{puppet}</Squash> : puppet;
}
/** the pivot (panel px) of the Bleep Guy for the middle of his head at frame (cx, cy), scale E */
export const bleepAt2 = (kind: BleepKind, cx: number, cy: number, E: number) => { const R = BLEEPS_RIG[kind]; return { x: cx - W / 2, y: H / 2 - (cy + (R.pivot[1] - R.disc[1]) * E), E }; };
/** a point of the Bleep Guy's picture (picture px, y down) as a frame point, for him placed by bleepAt2(kind, cx, cy, E) */
export const bleepPt = (kind: BleepKind, cx: number, cy: number, E: number, X: number, Y: number): [number, number] => { const R = BLEEPS_RIG[kind]; return [cx + (X - R.pivot[0]) * E, cy + (R.pivot[1] - R.disc[1]) * E + (Y - R.pivot[1]) * E]; };
