import React from "react";
import { Picture, Poly, Puppet, ellipsePts, ribbon, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Squash } from "./pen-stage";
import { AngerMark } from "./lips8-fx";
import rig16 from "./x16-rig.json" with { type: "json" };
import rig13 from "./x13-rig.json" with { type: "json" };
import rig10 from "./x10-rig.json" with { type: "json" };
import rig08 from "./x08-rig.json" with { type: "json" };
import { H, W, cam, locOf } from "./x09-stage";
import { PL10, PlateM, ROSS_EARS, headPt } from "./x13-stage";
import { pupilAt } from "./sp-eyes";
import { bulgeAt, plugState, purpleAt, twitchAt, veinAt } from "./x16-sched";

// What the scenes of x16 (src/x16-scenes.tsx) are made of: the numbers of the cut pictures (src/x16-rig.json, scripts/x16-prep.py; the window plate of Kenzie's side is x10's (src/x10-rig.json), Ross's head and his plugs are x08's, the purple copies of
// his head are x15's), and the people as puppets. The kit that places a plate in a view and keeps a wall's colour at its edges is src/x13-stage.tsx's, re-exported here. A person is placed by the frame point of the middle of the head or the eyes and
// a scale (frame px per picture px).
export { H, W, PL10, PlateM, ROSS_EARS, cam, headPt, locOf };
type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; headFiles?: Record<string, string>; plugs?: number[][]; purple?: Record<string, string>; brows?: number[][][]; browColour?: string };
type Img = { file: string; w: number; h: number; ox: number; oy: number };
type Stick = { x: number; top: number; pinch: number; w: number };
type Table = { x0: number; x1: number; top: number; y: number };
export const RG16 = rig16 as unknown as {
  props: { hand_ross: Img & { stick: Stick }; hand_kenzie: Img & { stick: Stick }; mom_live: { file: string; w: number; h: number; mouth: { cx: number; cy: number; w: number }; skin: string }; mom_glasses: { file: string; w: number; h: number; mouth: { cx: number; cy: number; w: number }; skin: string };
    mom_arm: Img & { fist: [number, number, number, number] }; bg_line: { file: string; w: number; h: number; sign: [number, number, number, number] }; bg_line_duck: { file: string; w: number; h: number } };
  puppets: { ross: PupJson & { table: Record<string, Table> }; kenzie: PupJson; kenzieSip: PupJson };
};
const RG10 = rig10 as unknown as { puppets: { ross: PupJson } };
const RG08 = rig08 as unknown as { ross: PupJson };
void rig13; void RG08;
export const D2R = Math.PI / 180;
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
export const PURPLE_FACE = "#b0468a";   // scripts/x12-prep.py purple_head: the furious purple on the skin's own lightness

// ── Ross: the picture's body and x08's head (the plugs in or out, purple or not)
const ROSS = RG10.puppets.ross;
/** the pictures of his body: x16's table (sitting behind a round café table, the résumé held up) and thumb (the thumb jabbed back over his shoulder, the other hand flat on the table) */
export type RossBody = "table" | "thumb";
const bodyLayer = (b: RossBody): Layer => RG16.puppets.ross.bodies![b];
export function rossRig16(body: RossBody, head: "both" | "l" | "none", mouthW?: number): Rig {
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
/** what Ross wears on his head in this episode: the purple snap (the purple copy of the head over it), the twitching eyes (the lid of an eye jumps down and back), the vein, the bulging eyes */
function RossWear({ f, order, gaze, purple, face, head }: { f: number; order: number; gaze: [number, number]; purple: number; face: string; head: "both" | "l" | "none" }) {
  const v = veinAt(f), bulge = bulgeAt(f), tw = [twitchAt(f, 0), twitchAt(f, 1)], pf = RG16.puppets.ross.purple?.[head], L = ROSS.layers.head;
  return (
    <>
      {purple > 0.01 && pf && <Picture file={pf} w={L.w} h={L.h} x={L.x + L.w / 2 - ROSS.pivot[0]} y={ROSS.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} />}
      {bulge <= 0.02 && [0, 1].map((i) => tw[i] > 0 && <Lid key={i} ex={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[0]} ey={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[1]} rx={ROSS.eyes[i].rx + 3} ry={ROSS.eyes[i].ry + 3} c={tw[i]} face={face} ink={ROSS.ink} order={order + 12.6} />)}
      <Bulge k={bulge} gaze={gaze} order={order + 12.2} ink={ROSS.ink} white={ROSS.white ?? "#fdfaf3"} />
      {v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head (head px from the neck pivot, y up: the flags in his hair) */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach, mouthW }: { f: number; x: number; y: number; E: number; order?: number; body: RossBody; head?: "both" | "l" | "none"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  const hd = head ?? plugState(f), rig = rossRig16(body, hd, mouthW), purple = purpleAt(f), face = purple > 0.01 ? mixHex(ROSS.face, PURPLE_FACE, purple) : ROSS.face;
  const rg = purple > 0.01 ? ({ ...rig, face } as unknown as Rig) : rig;
  return <Puppet char="customer" rig={rg} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} gaze={pose.gaze ?? [0, 0]} purple={purple} face={face} head={hd} />{attach}</>} />;
}
/** the pivot (panel px) of Ross for the middle of his head at frame (cx, cy), scale E */
export const rossAt = (cx: number, cy: number, E: number) => ({ x: cx - W / 2, y: H / 2 - (cy + (ROSS.pivot[1] - ROSS.disc[1]) * E), E });
/** a point of a Ross picture (the padded picture's px, y down) as a frame point, for Ross placed by rossAt(cx, cy, E) */
export const rossPt = (cx: number, cy: number, E: number, X: number, Y: number): [number, number] => [cx + (X - ROSS.pivot[0]) * E, cy + (ROSS.pivot[1] - ROSS.disc[1]) * E + (Y - ROSS.pivot[1]) * E];
/** a point of his head (head px from the neck pivot, y up) as a FRAME point for Ross at head (cx, cy) scale E in pose `pose` (the head's tilt and dip): where the flags in his hair and the steam are */
export function headFrame(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, cx: number, cy: number, E: number, hp: [number, number]): [number, number] {
  const r = rossAt(cx, cy, E), p = headPt(pose, E, r.x, r.y, hp[0], hp[1]);
  return [p[0] + W / 2, H / 2 - p[1]];
}
export const ROSS_PIVOT = ROSS.pivot, ROSS_DISC = ROSS.disc;
/** where the top of his head is, head px from the neck pivot (y up): the flags and the pole are stuck in there */
export const HAIR_TOP = locOf(ROSS, ROSS.disc[0], ROSS.disc[1] - ROSS.disc[2] - 55);

// ── Kenzie: two pictures, each one puppet with its own head: the master (the tumbler at her chest, the talking mouth) and the sip (the straw in her mouth)
export type KenzieKind = "ring" | "sip";
const KENZIES = (): Record<KenzieKind, PupJson> => ({ ring: RG16.puppets.kenzie, sip: RG16.puppets.kenzieSip });
const EYES = (k: KenzieKind): [number, number] => { const R = KENZIES()[k]; return [(R.eyes[0].cx + R.eyes[1].cx) / 2, (R.eyes[0].cy + R.eyes[1].cy) / 2]; };
/** her brows (the picture has none, only the half-closed lids): two thick dark-brown strokes lying flat and low just above the lids; `lift` raises both, `asym` raises the left one into an arch (one eyebrow up), `angry` slopes them down towards the nose */
function KenzieBrows({ R, p, order }: { R: PupJson; p: PuppetPose; order: number }) {
  const lift = p.lift ?? 0, asym = p.asym ?? 0, angry = p.angry ?? 0;
  return (
    <>
      {R.eyes.map((e, i) => {
        const [cx, cy] = locOf(R, e.cx, e.cy), side = i === 0 ? 1 : -1, dy = 10 * lift + (i === 0 ? 30 * asym : -8 * asym), arch = 5 + (i === 0 ? 18 * asym : 0);
        const pts = Array.from({ length: 9 }, (_, k) => { const u = k / 4 - 1, inner = Math.max(0, u * side); return [cx + u * 46, cy + e.ry + 46 + dy + arch * (1 - u * u) - 16 * angry * inner, 14 * (1 - 0.45 * Math.abs(u) ** 3)]; });
        return <Poly key={i} pts={ribbon(pts)} color="#3a2512" order={order + 14} />;
      })}
    </>
  );
}
export function KenzieP({ kind, x, y, E, order = 90, pose, tint, flip = false, attach }: { kind: KenzieKind; x: number; y: number; E: number; order?: number; pose: PuppetPose; tint?: string; flip?: boolean; attach?: React.ReactNode }) {
  const R = KENZIES()[kind];
  const puppet = <Puppet char="customer" rig={R as unknown as Rig} pose={pose} x={x} y={y} scale={E} order={order} phone={null} tint={tint} headAttach={<><KenzieBrows R={R} p={pose} order={order} />{attach}</>} />;
  return flip ? <Squash x={x} y={y} sx={-1} sy={1}>{puppet}</Squash> : puppet;   // (the whole puppet is mirrored about her neck)
}
/** the pivot (panel px) of Kenzie for the middle of her eyes at frame (cx, cy), scale E */
export const kenzieAt = (kind: KenzieKind, cx: number, cy: number, E: number) => { const R = KENZIES()[kind], [ex, ey] = EYES(kind); return { x: cx - W / 2 - (ex - R.pivot[0]) * E, y: H / 2 - cy - (R.pivot[1] - ey) * E, E }; };
/** a point of a Kenzie picture (picture px) as a frame point, for Kenzie placed by kenzieAt(kind, cx, cy, E) */
export const kenziePt = (kind: KenzieKind, cx: number, cy: number, E: number, X: number, Y: number): [number, number] => { const [ex, ey] = EYES(kind); return [cx + (X - ex) * E, cy + (Y - ey) * E]; };
export const KENZIE_DISC = (kind: KenzieKind) => KENZIES()[kind].disc;
