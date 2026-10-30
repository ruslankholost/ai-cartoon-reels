import React from "react";
import { Picture, Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { AngerMark } from "./lips8-fx";
import rig13 from "./x13-rig.json" with { type: "json" };
import rig12 from "./x12-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect, type Img } from "./x09-stage";
import { CoffeeFace13, type FaceGeo } from "./x13-draw";
import { bulgeAt, chuckWet, plugState, rossPurple, rossWet, twitchAt, veinAt, FPS } from "./x13-sched";
import { pupilAt } from "./sp-eyes";

// What the scenes of x13 (src/x13-scenes.tsx) are made of: the numbers of the cut pictures (src/x13-rig.json, scripts/x13-prep.py; Chuck's latte, point, cup and hold with their purple heads and the cup-and-mitten sprite are x12's (src/x12-rig.json);
// x10's plates, its counter's front layer and Ross's wide, till and apron bodies are src/x10-rig.json's), and the people as puppets. The placing kit (a view of a plate, a sprite placed by an anchor point) is src/x09-stage.tsx's, re-exported here.
// A person is placed by the frame point of the middle of the head or the eyes and a scale (frame px per picture px).
export { FLAT, H, Plate, Spr, W, at, cam, locOf, plateOf, rect };
export type { Img };
type Box = [number, number, number, number];
type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; headFiles?: Record<string, string>; plugs?: number[][]; purple?: string; purpleNone?: string; brows?: number[][][]; browColour?: string };
export const RG13 = rig13 as unknown as { props: { apron: Img; display: Img & { screen: Box } }; puppets: { ross: PupJson; chuckPhone: PupJson; chuckDrawer: PupJson; chuckApron: PupJson } };
const RG12 = rig12 as unknown as { props: { cupHand: Img }; puppets: { chuckLatte: PupJson; chuckPoint: PupJson; chuckCup: PupJson; chuckHold: PupJson } };
/** x10's plates (the counter wall, the wall with the window and the door, the shop's front), the counter's front layer and Ross's bodies */
const RG10 = rig10 as unknown as {
  plates: { counter: { file: string; clock: [number, number, number]; register: Box; top: [number, number] }; window: { file: string; window: Box; door: Box; floor: number }; front: { file: string; sign: Box; housing: Box; window: Box; door: Box; sidewalk: number } };
  crops: { counterFront: { file: string; x0: number; y0: number; w: number; h: number } };
  props: { cup: Img };
  puppets: { ross: PupJson };
};
export const PL10 = RG10.plates, CROP = RG10.crops;
export const CUP_HAND = { ...RG12.props.cupHand, file: "sp/x13-cupHand.png" }, ROSS_CUP = RG10.props.cup;   // (x12's cup-and-mitten sprite without the white halo and the flap at the lid: scripts/x13-prep.py clean_cuphand, the same size)
export const D2R = Math.PI / 180;
export type Kind = "latte" | "point" | "cup" | "hold" | "phone" | "drawer" | "apron";
const CHUCKS: Record<Kind, PupJson> = { latte: RG12.puppets.chuckLatte, point: RG12.puppets.chuckPoint, cup: RG12.puppets.chuckCup, hold: RG12.puppets.chuckHold, phone: RG13.puppets.chuckPhone, drawer: RG13.puppets.chuckDrawer, apron: RG13.puppets.chuckApron };
/** the middle of the eyes in each Chuck picture (picture px) */
const EYES: Record<Kind, [number, number]> = Object.fromEntries((Object.keys(CHUCKS) as Kind[]).map((k) => [k, [(CHUCKS[k].eyes[0].cx + CHUCKS[k].eyes[1].cx) / 2, (CHUCKS[k].eyes[0].cy + CHUCKS[k].eyes[1].cy) / 2]])) as Record<Kind, [number, number]>;
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
export const PURPLE_FACE = "#b0468a";   // scripts/x12-prep.py purple_head: the furious purple on the skin's own lightness

/** the geometry of a head for the code-drawn coffee: the head's middle and radius, the two eyes (centres, radii) and the mouth, as head px from the neck pivot, y up */
export function geoOf(R: PupJson): FaceGeo {
  const [px, py] = R.pivot;
  return { cx: R.disc[0] - px, cy: py - R.disc[1], r: R.disc[2], eyes: R.eyes.map((e) => ({ x: e.cx - px, y: py - e.cy, rx: e.rx, ry: e.ry })), mouth: { x: R.mouth.cx - px, y: py - R.mouth.cy, w: R.mouthW } };
}
export const CHUCK_GEO = (kind: Kind) => geoOf(CHUCKS[kind]);

/** a plate in a view, its left and right edges carried on by mirror copies of the plate (a wall that is not the plate's own colour showed as a strip when a person stands off the middle of the frame); the top and bottom are `edge`'s */
export function PlateM({ m, file, edge, order = 0 }: { m: ReturnType<typeof cam>; file: string; edge?: { top?: string; bottom?: string; side?: string; sideLow?: string; split?: number }; order?: number }) {
  const w = 768 * m.s, h = 1344 * m.s;
  return (
    <>
      <Plate m={m} file={file} edge={{ top: edge?.top, bottom: edge?.bottom }} order={order} />
      {m.X(0) > -W / 2 + 0.5 && <Group x={m.X(0)} y={0} sx={-1}><Picture file={file} w={w} h={h} x={w / 2} y={m.Y(672)} order={order} /></Group>}
      {m.X(768) < W / 2 - 0.5 && <Group x={m.X(768)} y={0} sx={-1}><Picture file={file} w={w} h={h} x={-w / 2} y={m.Y(672)} order={order} /></Group>}
    </>
  );
}

// ── the counter's front layer (the plate's own pixels from its top edge, y 795, down): it goes over whoever stands behind the counter, so that he is cut off by it
export function CounterFront({ m, order = 80 }: { m: ReturnType<typeof cam>; order?: number }) {
  const c = CROP.counterFront;
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={c.y0} k={1} order={order} />;
}
/** the view of the counter plate at scale s with the counter's top edge (plate row 795) on the frame row `yc` and the plate's column `u` in the middle */
export const counterView = (s: number, yc: number, u = 384) => cam(s, u, CROP.counterFront.y0 - (yc - H / 2) / s);

// ── Ross: the picture's body (x10's wide, till, apron or x13's drawer) and x08's head (the plugs in or out)
const ROSS = RG10.puppets.ross;
export const ROSS_RIG = ROSS;
/** the pictures of his body: x10's wide, till and apron, x13's drawer, and four made from them (scripts/x13-prep.py repaint_bodies): wideBare (no arms: the cup shots), wideA, tillA and drawerA (the apron on, until he throws it) */
export type RossBody = "wide" | "till" | "apron" | "drawer" | "wideBare" | "wideA" | "tillA" | "drawerA";
export function rossRig13(body: RossBody, head: "both" | "l" | "none", mouthW?: number): Rig {
  const R = ROSS, B = RG13.puppets.ross.bodies?.[body] ?? (R.bodies as Record<string, Layer>)[body], H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
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
/** what Ross wears on his head in this episode: the coffee (stains, streams, drops off his chin), the twitching eyes (the lid of an eye jumps down and back), the vein, the bulging eyes, his own purple face (the next day) */
function RossWear({ f, order, gaze, purple, body, face }: { f: number; order: number; gaze: [number, number]; purple: number; body: RossBody; face: string }) {
  const v = veinAt(f), wet = rossWet(f), bulge = bulgeAt(f), geo = geoOf(ROSS), tw = [twitchAt(f, 0), twitchAt(f, 1)], pn = RG13.puppets.ross.purpleNone, L = ROSS.layers.head;
  void body;
  return (
    <>
      {purple > 0.01 && pn && <Picture file={pn} w={L.w} h={L.h} x={L.x + L.w / 2 - ROSS.pivot[0]} y={ROSS.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} />}
      {wet > 0.01 && <CoffeeFace13 geo={geo} wet={wet} t={f / FPS} f={f} who="ross" order={order + 12.7} />}
      {bulge <= 0.02 && [0, 1].map((i) => tw[i] > 0 && <Lid key={i} ex={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[0]} ey={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[1]} rx={ROSS.eyes[i].rx + 3} ry={ROSS.eyes[i].ry + 3} c={tw[i]} face={face} ink={ROSS.ink} order={order + 12.6} />)}
      <Bulge k={bulge} gaze={gaze} order={order + 12.2} ink={ROSS.ink} white={ROSS.white ?? "#fdfaf3"} />
      {v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach, mouthW }: { f: number; x: number; y: number; E: number; order?: number; body: RossBody; head?: "both" | "l" | "none"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  const hd = head ?? plugState(f), rig = rossRig13(body, hd, mouthW), purple = rossPurple(f), face = purple > 0.01 ? mixHex(ROSS.face, PURPLE_FACE, purple) : ROSS.face;
  const rg = purple > 0.01 ? ({ ...rig, face } as unknown as Rig) : rig;
  return <Puppet char="customer" rig={rg} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} gaze={pose.gaze ?? [0, 0]} purple={purple} body={body} face={face} />{attach}</>} />;
}
/** the pivot (panel px) of Ross for the middle of his head at frame (cx, cy), scale E */
export const rossAt = (cx: number, cy: number, E: number) => ({ x: cx - W / 2, y: H / 2 - (cy + (ROSS.pivot[1] - ROSS.disc[1]) * E), E });
/** a point of a Ross picture (the padded picture's px, y down) as a frame point, for Ross placed by rossAt(cx, cy, E) */
export const rossPt = (cx: number, cy: number, E: number, X: number, Y: number): [number, number] => [cx + (X - ROSS.pivot[0]) * E, cy + (ROSS.pivot[1] - ROSS.disc[1]) * E + (Y - ROSS.pivot[1]) * E];
/** a point of Ross's head (head px from the neck pivot, y up) for a pose (the head's tilt and dip) as a panel point, Ross placed at (x, y) at scale E */
export function headPt(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, E: number, x: number, y: number, hx: number, hy: number): [number, number] {
  const a = (pose.tilt * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x + (pose.dx ?? 0) + (hx * c - hy * s + (pose.hdx ?? 0)) * E, y + pose.breath * E + (hx * s + hy * c + pose.bob) * E];
}
export const ROSS_EARS: [number, number][] = [locOf(ROSS, 660.9, 647.0), locOf(ROSS, 997.7, 677.5)];   // the two tunnels in his ears (head px)
export const ROSS_GEO = geoOf(ROSS);

// ── Chuck: seven pictures, each one puppet with its own head; `purple` 0..1 fades in the head's purple copy (and the colour of his lids); `flip` mirrors the whole puppet about his neck: the raised arm goes to the other side
export function ChuckP({ kind, x, y, E, order = 90, pose, tint, purple = 0, flip = false, attach, wet = 0, f = 0 }: { kind: Kind; x: number; y: number; E: number; order?: number; pose: PuppetPose; tint?: string; purple?: number; flip?: boolean; attach?: React.ReactNode; wet?: number; f?: number }) {
  const R = CHUCKS[kind], L = R.layers.head;
  const rig = purple > 0.01 ? ({ ...R, face: mixHex(R.face, PURPLE_FACE, purple) } as unknown as Rig) : (R as unknown as Rig);
  const puppet = (
    <Puppet char="customer" rig={rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} tint={tint}
      headAttach={<>{purple > 0.01 && R.purple && <Picture file={R.purple} w={L.w} h={L.h} x={L.x + L.w / 2 - R.pivot[0]} y={R.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} tint={tint} />}
        {wet > 0.01 && <CoffeeFace13 geo={geoOf(R)} wet={wet} t={f / FPS} f={f} who="chuck" order={order + 12.7} />}{attach}</>} />
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
export const CHUCK_DISC = (kind: Kind) => CHUCKS[kind].disc;
export const frameToPanel = (x: number, y: number): [number, number] => [x - W / 2, H / 2 - y];
export { chuckWet };
