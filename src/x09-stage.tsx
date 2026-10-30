import React from "react";
import { Inked, Picture, Poly, Puppet, ellipsePts, grow, ribbon, roundRect, xf, type Pt, type PuppetPose, type Rig } from "./sp-puppet";
import { Group, H, W, view, type View } from "./pen-stage";
import { AngerMark } from "./lips8-fx";
import rigJson from "./x09-rig.json" with { type: "json" };
import { FPS, plugState, twitchAt, veinAt, type MouthShape } from "./x09-sched";

// What the scenes of x09 (src/x09-scenes.tsx) are made of: the numbers of the cut pictures (src/x09-rig.json, scripts/x09-prep.py), a view of a plate (plate px -> frame px), a sprite placed by an anchor point, the crowd's seats, Ross and
// Denise as puppets, the guru's painted poses with a mouth that talks. Plates are 768 x 1344 pictures; a view `m` puts the plate point (u, v) in the middle of the frame at `s` frame px per plate px; a panel point is what `m.X(u)`,
// `m.Y(v)` give (origin in the middle, y up). A sprite's own pixels are "sprite px" (y down); `k` is plate px per sprite px.
export { W, H };
type Box = [number, number, number, number];
export type Img = { file: string; w: number; h: number; ox: number; oy: number };
export type CrowdImg = Img & { legs: [number, number]; foot: number; hand?: [number, number, number, Box] };
export type GuruImg = Img & { disc: [number, number, number]; eyes: number[][]; skin: string; teeth?: Box; liquid?: Box; reader?: number[]; card?: Box };
type Layer = { file: string; x: number; y: number; w: number; h: number };
type PupJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: { cx: number; cy: number; rx: number; ry: number; lid: number[][] }[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; face: string; ink: string; headFiles?: Record<string, string>; plugs?: number[][] };
export const RG = rigJson as unknown as {
  plates: { stage: { file: string; screen: Box; floor: number; columns: Box[] }; crowd: { file: string; rows: Box[][] }; board: { file: string; surface: Box; tray: number[]; floor: number; wall: string; floorColour: string } };
  props: { tub: Img & { ice: Box }; clock: Img & { face: number[]; bells: number[] }; notebook: Img & { page: Box; margin: number; lines: number[]; full: number[] } };
  inserts: { tax: { file: string; label: Box }; wash: { file: string; porthole: number[]; line: number[][] }; hit: { file: string } };
  crowd: Record<string, Record<"seat" | "up" | "turn", CrowdImg>>;
  guru: Record<"guru" | "cannon" | "smash" | "toast" | "caught" | "gold", GuruImg>;
  puppets: { ross: PupJson; rossHeadset: PupJson; denise: PupJson };
};
export const GU = RG.guru, CR = RG.crowd, PL = RG.plates, PROP = RG.props;
const D2R = Math.PI / 180;

/** the view that puts plate point (u, v) in the middle of the frame at s frame px per plate px */
export const cam = (s: number, u: number, v: number): View => view(s, u - W / 2 / s, v - H / 2 / s);
/** a rectangle of plate px (u0, v0, u1, v1) as panel points */
export const rect = (m: View, u0: number, v0: number, u1: number, v1: number): Pt[] => [[m.X(u0), m.Y(v0)], [m.X(u1), m.Y(v0)], [m.X(u1), m.Y(v1)], [m.X(u0), m.Y(v1)]];
export const FLAT = (color: string, order = -1): React.ReactNode => <Poly pts={[[-2400, 2400], [2400, 2400], [2400, -2400], [-2400, -2400]]} color={color} order={order} />;
/** a plate in a view; past its edges the colours in `edge` are carried on as flat colour (top, bottom, left, right) */
export function Plate({ m, file, order = 0, edge = {}, tint }: { m: View; file: string; order?: number; edge?: { top?: string; bottom?: string; side?: string; sideLow?: string; split?: number }; tint?: string }) {
  const E = 6000, sp = edge.split ?? 1344;                                      // the sides carry on in `side` above the plate row `split` and in `sideLow` below it (a wall and a floor)
  return (
    <>
      {edge.top && <Poly pts={rect(m, -E, -E, E, 0)} color={edge.top} order={order - 0.3} />}
      {edge.bottom && <Poly pts={rect(m, -E, 1344, E, E)} color={edge.bottom} order={order - 0.3} />}
      {edge.side && <Poly pts={rect(m, -E, -E, 0, sp)} color={edge.side} order={order - 0.3} />}
      {edge.side && <Poly pts={rect(m, 768, -E, E, sp)} color={edge.side} order={order - 0.3} />}
      {(edge.sideLow ?? edge.bottom) && sp < 1344 && <Poly pts={rect(m, -E, sp, 0, E)} color={(edge.sideLow ?? edge.bottom)!} order={order - 0.3} />}
      {(edge.sideLow ?? edge.bottom) && sp < 1344 && <Poly pts={rect(m, 768, sp, E, E)} color={(edge.sideLow ?? edge.bottom)!} order={order - 0.3} />}
      <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} tint={tint} />
    </>
  );
}

/** a sprite `d` placed so that its pixel (ax, ay) (sprite px, y down) lands on the plate point (u, v); k plate px per sprite px; turned `rot` degrees (counter-clockwise), mirrored by `flip`, squashed (sx, sy) about the anchor.
 * `children` are drawn in the sprite's own px about the anchor (x right, y UP: use `at`), in the same turn and scale */
export function Spr({ m, d, ax, ay, u, v, k, rot = 0, flip = false, sx = 1, sy = 1, order, op = 1, tint, children }: { m: View; d: Img; ax: number; ay: number; u: number; v: number; k: number; rot?: number; flip?: boolean; sx?: number; sy?: number; order: number; op?: number; tint?: string; children?: React.ReactNode }) {
  const s = k * m.s;
  return (
    <Group x={m.X(u)} y={m.Y(v)} rot={rot} sx={s * sx * (flip ? -1 : 1)} sy={s * sy}>
      <Picture file={d.file} w={d.w} h={d.h} x={d.w / 2 - ax} y={ay - d.h / 2} order={order} alpha op={op} tint={tint} />
      {children}
    </Group>
  );
}
/** a sprite px (px, py) as a point about the anchor (ax, ay) in a Spr's children (y up) */
export const at = (ax: number, ay: number, px: number, py: number): [number, number] => [px - ax, ay - py];
/** the plate point where a sprite's pixel (px, py) lands, for a sprite placed with (ax, ay) on (u, v) at k */
export const plateOf = (ax: number, ay: number, u: number, v: number, k: number, flip: boolean, px: number, py: number): [number, number] => [u + (px - ax) * k * (flip ? -1 : 1), v + (py - ay) * k];

// ── the crowd's seats: three rows of empty chairs in the plate bg-crowd (far to near: A, B, C). A chair's middle (u), its back's width, the row of its leg tips (v)
export const FOOT = [741, 1036, 1316];
const LEGS = 0.885; // a chair's legs spread / its back's width, measured on the plate
export type Seat = { u: number; back: number; foot: number; row: number };
export const seatOf = (row: number, i: number): Seat => {
  const [x0, , x1] = RG.plates.crowd.rows[row][i];
  let u = (x0 + x1) / 2, back = x1 - x0;
  if (row === 2 && i === 4) { back = 139; u = x0 + 69.5; }   // the last chair of the front row runs past the plate's edge
  if (row === 1 && i === 5) { back = 118; u = x0 + 59; }
  if (row === 1 && i === 0) { back = 118; u = x1 - 59; }
  return { u, back, foot: FOOT[row], row };
};
export const ROW_ORDER = [30, 60, 90];
/** plate px per sprite px that make a sprite's chair legs as wide as the chair they sit on */
export const seatK = (seat: Seat, legs: [number, number]) => (LEGS * seat.back) / (legs[1] - legs[0]);

/** a member of the crowd at a seat in a state (seated, arm up, head turned): the sprite's leg tips on the chair's, `lift` plate px up (a jump); children in the sprite's px about its chair's middle at the leg tips (y up) */
export function Person({ m, row, i, who, st = "seat", flip = false, lift = 0, sx = 1, sy = 1, order, children, tint }: { m: View; row: number; i: number; who: number; st?: "seat" | "up" | "turn"; flip?: boolean; lift?: number; sx?: number; sy?: number; order?: number; children?: (g: { k: number; ax: number; ay: number; hand?: [number, number]; flip: boolean }) => React.ReactNode; tint?: string }) {
  const d = CR[String(who)][st], seat = seatOf(row, i), k = seatK(seat, d.legs), ax = (d.legs[0] + d.legs[1]) / 2, ay = d.foot;
  const hand = d.hand ? at(ax, ay, d.hand[0], d.hand[1]) : undefined;
  return (
    <Spr m={m} d={d} ax={ax} ay={ay} u={seat.u} v={seat.foot - lift} k={k} flip={flip} sx={sx} sy={sy} order={order ?? ROW_ORDER[row] + i * 0.3} tint={tint}>
      {children?.({ k, ax, ay, hand, flip })}
    </Spr>
  );
}

// ── the puppets
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
/** a point of a rig's picture (px, y down) as a head-local point: puppet px from the neck pivot, y up */
export const locOf = (R: { pivot: [number, number] }, X: number, Y: number): [number, number] => [X - R.pivot[0], R.pivot[1] - Y];
const ROSS = RG.puppets.ross;
export function rossRig9(body: string, head: "both" | "l" | "none" | "red", mouthW?: number): Rig {
  const R = ROSS, B = (R.bodies as Record<string, Layer>)[body], H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
  return { ...R, layers: { head: hl, body: B }, bodies: { [body]: B }, mouthW: mouthW ?? R.mouthW } as unknown as Rig;
}
/** what Ross wears on his head in this episode: the vein (pops on VEIN_T and throbs), the twitching eye (the lid of his right eye of the picture jumps down and back) */
function RossWear({ f, order, vein = true, lidInk }: { f: number; order: number; vein?: boolean; lidInk?: string }) {
  const v = veinAt(f), tw = twitchAt(f), eye: Eye = ROSS.eyes[1], [ex, ey] = locOf(ROSS, eye.cx, eye.cy);
  return (
    <>
      {tw > 0 && <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={ROSS.face} ink={lidInk ?? ROSS.ink} order={order + 12.6} />}
      {vein && v > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * v} color="#a8321a" order={order + 14.8} op={Math.min(1, v * 1.5)} />}
    </>
  );
}
/** Ross by his neck pivot (panel px) at scale E (panel px per rig px) in a pose; `head` the picture of his head (plugs in or out) */
export function RossP({ f, x, y, E, order = 90, body = "chair", head, pose, vein = true, flip = false }: { f: number; x: number; y: number; E: number; order?: number; body?: string; head?: "both" | "l" | "none" | "red"; pose: PuppetPose; vein?: boolean; flip?: boolean }) {
  const rig = rossRig9(body, head ?? plugState(f));
  return <Puppet char="customer" rig={rig} pose={{ ...pose, body }} x={x} y={y} scale={E} order={order} flip={flip} headAttach={<RossWear f={f} order={order} vein={vein} />} />;
}
export const HEADSET = RG.puppets.rossHeadset as unknown as Rig;
export const RossHeadsetP = ({ x, y, E, order = 90, pose }: { x: number; y: number; E: number; order?: number; pose: PuppetPose }) => <Puppet char="customer" rig={HEADSET} pose={pose} x={x} y={y} scale={E} order={order} />;
export const DENISE = RG.puppets.denise as unknown as Rig;
export const DeniseP = ({ x, y, E, order = 90, pose, headAttach }: { x: number; y: number; E: number; order?: number; pose: PuppetPose; headAttach?: React.ReactNode }) => <Puppet char="customer" rig={DENISE} pose={{ ...pose, body: "note" }} x={x} y={y} scale={E} order={order} phone={null} headAttach={headAttach} />;

/** where a puppet's neck pivot goes (plate px) so that its chair's leg tips are on a seat's, and its scale k (plate px per rig px) */
export function seatedAt(who: "ross" | "denise", seat: Seat): { u: number; v: number; k: number } {
  if (who === "ross") { const k = (LEGS * seat.back) / 430; return { u: seat.u + (837 - 828) * k, v: seat.foot - (1288 - 782) * k, k }; }
  const k = (LEGS * seat.back) / 479;
  return { u: seat.u + (383 - 389.5) * k, v: seat.foot - (1302 - 641) * k, k };
}

// ── the guru's painted poses: a sprite about his head's disc, scaled by the disc (the poses were painted at different sizes: one disc size makes the guru one size), a mouth that talks over the painted grin
export const GURU_DISC = GU.guru.disc[2]; // the master's head radius: sprite px
export function guruK(pose: keyof typeof GU, kk: number): number { return (kk * GURU_DISC) / GU[pose].disc[2]; }
const M_DARK = "#2b0e0e", M_TEETH = "#f3f0e6", M_TONGUE = "#d4636f";
/** the mouth drawn over a painted grin (box: sprite px of the grin with its outline; the anchor is the Spr's): a skin patch, then the open mouth: wide / mid / small / o. `closed` draws nothing */
export function GrinMouth({ box, ax, ay, skin, shape, order }: { box: Box; ax: number; ay: number; skin: string; shape: MouthShape; order: number }) {
  if (shape === "closed") return null;
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, [px, py] = at(ax, ay, cx, cy);
  const sz = shape === "wide" ? [1.02, 1.0, 0.0] : shape === "mid" ? [0.9, 0.78, 0.1] : shape === "small" ? [0.62, 0.48, 0.18] : [0.36, 0.7, 0.05]; // width, height, drop (fractions of the box)
  const mw = w * sz[0], mh = h * sz[1], my = py - h * sz[2];
  const round = shape === "o" ? ellipsePts(0, 0, mw / 2, mh / 2, 28) : roundRect(mw, mh, Math.min(mw, mh) * 0.42, 6);
  return (
    <>
      <Poly pts={xf(roundRect(w * 1.08, h * 1.16, h * 0.5, 8), px, py)} color={skin} order={order} />
      <Poly pts={xf(grow(round, 2.4), px, my)} color="#150608" order={order + 0.1} />
      <Poly pts={xf(round, px, my)} color={M_DARK} order={order + 0.2} />
      {shape !== "o" && shape !== "small" && <Poly pts={xf(roundRect(mw * 0.9, mh * 0.34, mh * 0.12, 4), px, my + mh * 0.3)} color={M_TEETH} order={order + 0.3} />}
      {(shape === "wide" || shape === "mid") && <Poly pts={xf(ellipsePts(0, 0, mw * 0.26, mh * 0.2, 18), px, my - mh * 0.28)} color={M_TONGUE} order={order + 0.3} />}
    </>
  );
}

// ── the code-drawn headset of the guru: a black band over the head, two ear cups, a boom with a ball (Ross picks it up in shot 27); `r` is a head's radius in the units of the group it is drawn in, (x, y) the head's middle
export function HeadsetProp({ x, y, r, rot = 0, order, op = 1 }: { x: number; y: number; r: number; rot?: number; order: number; op?: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot);
  const band: Pt[] = ribbon(Array.from({ length: 21 }, (_, i) => { const a = Math.PI * (0.06 + 0.88 * (i / 20)); return [Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * 0.07]; }));
  const cup = (sx: number) => xf(roundRect(r * 0.22, r * 0.42, r * 0.09, 5), sx * r * 1.02, -r * 0.02);
  return (
    <>
      <Poly pts={T(band)} color="#111216" order={order} op={op} />
      <Inked pts={T(cup(-1))} color="#1b1c21" ink="#05060a" w={r * 0.02} order={order + 0.2} op={op} />
      <Inked pts={T(cup(1))} color="#1b1c21" ink="#05060a" w={r * 0.02} order={order + 0.2} op={op} />
      <Poly pts={T(ribbon([[r * 1.02, -r * 0.2, r * 0.03], [r * 0.9, -r * 0.62, r * 0.03], [r * 0.52, -r * 0.8, r * 0.03]]))} color="#111216" order={order + 0.1} op={op} />
      <Inked pts={T(ellipsePts(r * 0.5, -r * 0.8, r * 0.1, r * 0.1, 14))} color="#1b1c21" ink="#05060a" w={r * 0.02} order={order + 0.3} op={op} />
    </>
  );
}

export const t = (f: number) => f / FPS;
