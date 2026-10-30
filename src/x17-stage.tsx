import React from "react";
import { Picture, Poly, Puppet, ellipsePts, grow, ribbon, roundRect, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Group } from "./pen-stage";
import { AngerMark } from "./lips8-fx";
import rig17 from "./x17-rig.json" with { type: "json" };
import { H, W, Spr, at, cam, locOf, type Img } from "./x09-stage";
import { PlateM, ROSS_EARS, headPt } from "./x13-stage";
import { PX, PY } from "./x13-draw";
import { plugState, purpleAt, twitchAt, veinAt, type MouthShape } from "./x17-sched";

// What the scenes of x17 (src/x17-scenes.tsx) are made of: the numbers of the cut pictures (src/x17-rig.json, scripts/x17-prep.py; Ross's head is x08's, the purple copies of it are x15's, both read from the rig), Ross as a puppet, the flat people
// (a picture and a mouth drawn over the painted one) and the way a sprite is placed in the frame. Frame px: x right, y down, 1080 x 1920; a panel point (what a puppet's place is) is PX(x), PY(y). A person is placed by the frame point of the middle of the
// head (Ross) or by an anchor point of the picture (the flat people) and a scale (frame px per picture px).
export { H, W, PlateM, ROSS_EARS, cam, headPt, locOf };
type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; white?: string; pupilInk?: string; headFiles?: Record<string, string>; plugs?: number[][]; purple?: Record<string, string>; brows?: number[][][]; browColour?: string };
type Box = [number, number, number, number];
export type Grin = { box: Box; cx: number; cy: number; w: number; h: number; skin: string };
type Pic = Img & { grin?: Grin; scarf?: Box; bird?: { cx: number; cy: number; box: Box }; caps?: (Box | null)[]; eyes?: Record<"bride" | "groom", Eye[]>; pupils?: Record<"bride" | "groom", number[][]>; seat?: number };
export const RG17 = rig17 as unknown as {
  people: { couple_pop: Pic & { grin: Record<"bride" | "groom", Grin> }; couple_kiss: Pic; fa: Pic; fa_present: Pic; peacock_man: Pic; peacock_fan: Pic; pilot_stand: Pic; pilot_sit: Pic; pilot_sit_bare: Pic; pilot_hat: Pic };
  plates: {
    cabin: { file: string; glass: Img & { box: Box } }; seatback: { file: string; front: Img; box: Box; top: number[] }; row47: { file: string; handle: Box; exitRect: Box; toiRect: Box; exitGrey: string; exitPanel: Img; toiPanel: Img; noDoors: Img };
    wing: { file: string; front: Img; windows: Box[]; big: Box; skyTop: string; skyBottom: string }; cockpit: { file: string; seat: Box; windows: Box[] };
  };
  puppets: { ross: PupJson };
};
export const D2R = Math.PI / 180;
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
export const PURPLE_FACE = "#b0468a";   // scripts/x12-prep.py purple_head: the furious purple on the skin's own lightness

// ── Ross: the picture's body (the seat belted in, crammed in the seat, clinging spread-eagled, pointing and yelling) and x08's head (the plugs in or out, purple or not)
const ROSS = RG17.puppets.ross;
export type RossBody = "seat" | "cram" | "cling" | "point";
export function rossRig17(body: RossBody, head: "both" | "l" | "none", mouthW?: number): Rig {
  const R = ROSS, B = R.bodies![body], H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
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
/** what Ross wears on his head in this episode: the purple snap (the purple copy of the head over it), the twitching eyes (the lid of an eye jumps down and back), the vein */
function RossWear({ f, order, purple, face, head }: { f: number; order: number; purple: number; face: string; head: "both" | "l" | "none" }) {
  const v = veinAt(f), tw = [twitchAt(f, 0), twitchAt(f, 1)], pf = ROSS.purple?.[head], L = ROSS.layers.head;
  return (
    <>
      {purple > 0.01 && pf && <Picture file={pf} w={L.w} h={L.h} x={L.x + L.w / 2 - ROSS.pivot[0]} y={ROSS.pivot[1] - (L.y + L.h / 2)} order={order + 10.5} alpha op={purple} />}
      {[0, 1].map((i) => tw[i] > 0 && <Lid key={i} ex={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[0]} ey={locOf(ROSS, ROSS.eyes[i].cx, ROSS.eyes[i].cy)[1]} rx={ROSS.eyes[i].rx + 3} ry={ROSS.eyes[i].ry + 3} c={tw[i]} face={face} ink={ROSS.ink} order={order + 12.6} />)}
      {v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E in a pose; `head` the picture of his head (plugs in or out); `attach` more on the head (head px from the neck pivot, y up: the feathers in his hair, the captain's hat) */
export function RossP({ f, x, y, E, order = 90, body, head, pose, flip = false, tint, attach, mouthW }: { f: number; x: number; y: number; E: number; order?: number; body: RossBody; head?: "both" | "l" | "none"; pose: PuppetPose; flip?: boolean; tint?: string; attach?: React.ReactNode; mouthW?: number }) {
  const hd = head ?? plugState(f), rig = rossRig17(body, hd, mouthW), purple = purpleAt(f), face = purple > 0.01 ? mixHex(ROSS.face, PURPLE_FACE, purple) : ROSS.face;
  const rg = purple > 0.01 ? ({ ...rig, face } as unknown as Rig) : rig;
  return <Puppet char="customer" rig={rg} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} tint={tint} phone={null} headAttach={<><RossWear f={f} order={order} purple={purple} face={face} head={hd} />{attach}</>} />;
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
/** where the top of his hair is, head px from the neck pivot (y up): the feathers and the hat are put there */
export const HAIR_TOP = locOf(ROSS, ROSS.disc[0], ROSS.disc[1] - ROSS.disc[2] - 55);

// ── the flat people: a picture placed by an anchor point (the picture's px) on a frame point; what is drawn in the sprite's own px (the mouth, the lids, the lettering) goes in as children (src/x09-stage.tsx Spr)
/** the view that makes a plate point a frame point: Spr places a sprite on a "plate" (u, v) in frame px at scale 1 */
export const FV = cam(1, W / 2, H / 2);
/** a picture point (px of the whole painted picture) as a point of the cut sprite d (sprite px, y down) */
export const sp = (d: Img, px: number, py: number): [number, number] => [px - d.ox, py - d.oy];
/** the sprite `d` with its picture point (apx, apy) on the frame point (x, y), at scale k, turned `rot` degrees (counter-clockwise on the screen), squashed (sx, sy) about the anchor; children are drawn in the sprite's px about the anchor, y up (use `at`) */
export function Flat({ d, apx, apy, x, y, k, rot = 0, sx = 1, sy = 1, flip = false, order, op = 1, tint, children }: { d: Img; apx: number; apy: number; x: number; y: number; k: number; rot?: number; sx?: number; sy?: number; flip?: boolean; order: number; op?: number; tint?: string; children?: (g: { ax: number; ay: number }) => React.ReactNode }) {
  const [ax, ay] = sp(d, apx, apy);
  return <Spr m={FV} d={d} ax={ax} ay={ay} u={x} v={y} k={k} rot={rot} sx={sx} sy={sy} flip={flip} order={order} op={op} tint={tint}>{children?.({ ax, ay })}</Spr>;
}
/** a picture point as a point in the children of a Flat (about the anchor, y up) */
export const kid = (d: Img, ax: number, ay: number, px: number, py: number): [number, number] => { const [x, y] = sp(d, px, py); return at(ax, ay, x, y); };

// ── the mouth drawn over a painted grin (the couple, the attendant, the pilot): a patch of skin over the painted mouth, then the open mouth: its shape from the voice (closed draws nothing: the grin as painted stays). Sizes are fractions of the painted grin's box
// (width, height, how far it hangs below the box's top). `lips`: the colour of the ring round the dark inside (the attendant's red lipstick), else a thin dark line; `teeth` shows a white row on top of the open mouth
const MOUTH_SIZE: Record<MouthShape, [number, number, number]> = { closed: [0, 0, 0], small: [0.62, 0.42, 0.14], mid: [0.82, 0.7, 0.06], wide: [1.0, 0.98, 0], o: [0.38, 0.8, 0.04], pucker: [0.5, 0.5, 0.1] };
export function TalkMouth({ grin, d, ax, ay, shape, order, lips, teeth = true, patch = 1.05 }: { grin: Grin; d: Img; ax: number; ay: number; shape: MouthShape; order: number; lips?: string; teeth?: boolean; patch?: number }) {
  if (shape === "closed") return null;
  const [x0, y0, x1, y1] = grin.box, w = x1 - x0, h = y1 - y0, [px, py] = kid(d, ax, ay, (x0 + x1) / 2, (y0 + y1) / 2), sz = MOUTH_SIZE[shape];
  const mw = w * sz[0], mh = h * sz[1], my = py + h / 2 - h * sz[2] - mh / 2;   // the open mouth hangs from the top of the box
  const round: Pt[] = shape === "o" ? ellipsePts(0, 0, mw / 2, mh / 2, 28) : roundRect(mw, mh, Math.min(mw, mh) * 0.42, 6);
  const dx = (p: Pt[], x: number, y: number): Pt[] => p.map(([a, b]) => [a + x, b + y] as Pt);
  const ring = lips ?? "#150608", rw = lips ? Math.max(3, h * 0.07) : 2.4;
  return (
    <>
      <Poly pts={dx(roundRect(w * patch, h * (patch + 0.03), h * 0.5, 8), px, py - 0.025 * h)} color={grin.skin} order={order} />   {/* (its top edge stays at the grin's own top: higher, it cuts the flat bottoms of the eyes above it) */}
      <Poly pts={dx(grow(round, rw), px, my)} color={ring} order={order + 0.1} />
      <Poly pts={dx(round, px, my)} color="#2b0e0e" order={order + 0.2} />
      {teeth && shape !== "o" && shape !== "small" && <Poly pts={dx(roundRect(mw * 0.9, mh * 0.34, mh * 0.12, 4), px, my + mh * 0.3)} color="#f3f0e6" order={order + 0.3} />}
      {(shape === "wide" || shape === "mid") && <Poly pts={dx(ellipsePts(0, 0, mw * 0.26, mh * 0.2, 18), px, my - mh * 0.28)} color="#d4636f" order={order + 0.3} />}
    </>
  );
}

// ── the attendant's frozen grin: her painted grin stays as it is (the smile never breaks); her voice draws a dark gap between the two rows of teeth that widens by `open` (0 .. 1) and shuts again, so she talks through it
export function GrinTalk({ grin, d, ax, ay, open, order }: { grin: Grin; d: Img; ax: number; ay: number; open: number; order: number }) {
  if (open <= 0.05) return null;
  const [x0, y0, x1, y1] = grin.box, w = x1 - x0, h = y1 - y0, [px, py] = kid(d, ax, ay, (x0 + x1) / 2, y0 + 0.55 * h), gh = (0.1 + 0.3 * open) * h;
  return (
    <>
      <Poly pts={roundRect(w * 0.9, gh, gh * 0.45, 6).map(([a, b]) => [a + px, b + py] as Pt)} color="#2b0e0e" order={order} />
      {open > 0.6 && <Poly pts={ellipsePts(px, py - gh * 0.2, w * 0.16, gh * 0.22, 16)} color="#d4636f" order={order + 0.1} />}
    </>
  );
}

// ── the bride's lids (shot 4): over each of her eyes a skin-coloured lid that comes down by `c` (0 open .. 1 shut) with a dark lash line and three little lashes on it; the eye's numbers are the picture's (px)
export function BrideLids({ eyes, d, ax, ay, skin, c, order }: { eyes: Eye[]; d: Img; ax: number; ay: number; skin: string; c: number; order: number }) {
  if (c <= 0.02) return null;
  return (
    <>
      {eyes.map((e, i) => {
        const [x, y] = kid(d, ax, ay, e.cx, e.cy), rx = e.rx + 3, ry = e.ry + 3, yc = y + ry - 2 * ry * c, hw = rx * Math.sqrt(Math.max(0, 1 - ((yc - y) / ry) ** 2));
        const edge: Pt[] = Array.from({ length: 13 }, (_, j) => [x - hw + (2 * hw * j) / 12, yc - 0.1 * hw * (1 - ((j - 6) / 6) ** 2)] as Pt);
        return (
          <React.Fragment key={i}>
            <Poly pts={ellipsePts(x, (yc + y + ry) / 2, Math.max(hw, rx * 0.7), (y + ry - yc) / 2 + 2, 32)} color={skin} order={order} />
            <Poly pts={ribbon(edge.map((p) => [p[0], p[1], 4.4]))} color="#241608" order={order + 0.1} />
            {[-0.7, -0.15, 0.4].map((u, j) => <Poly key={j} pts={ribbon([[x + u * hw, yc - 3, 3.6], [x + (u + (i ? 0.16 : -0.16)) * hw * 1.2, yc - 3 - 0.32 * rx, 1.2]])} color="#241608" order={order + 0.15} />)}
          </React.Fragment>
        );
      })}
    </>
  );
}

export { PX, PY };
