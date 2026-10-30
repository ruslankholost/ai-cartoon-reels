// Where the things that carry words stand in a shot, in frame px (x right, y down): the labels of the boxes (PENS, STARTER KIT), so that no caption (src/pen-ui.tsx, the band src/pen-sched.ts capBand) lands on
// one and no box is left blank. Pure arithmetic, shared by the scenes (src/pen-scenes.tsx draws what this says) and by scripts/pen-check.mts (which holds every frame to it). The views are the garage's and
// the office's plates at the scale and the corner each shot shows (a plate is 768 x 1344; s frame px per plate px, (u0, v0) the plate point at the frame's top left).
import rig from "./pen-rig.json" with { type: "json" };
import { CAPS, SHOTS, boxAt, capBand, joltAt, type ShotId } from "./pen-sched.ts";

export const W = 1080, H = 1920;
export type V = { s: number; u0: number; v0: number };
export const vx = (m: V, u: number) => (u - m.u0) * m.s;
export const vy = (m: V, v: number) => (v - m.v0) * m.s;
/** the band of a shot's captions (y px), or null when the shot shows none */
export const bandOf = (id: ShotId): [number, number] | null => {
  const s = SHOTS.find((x) => x.id === id)!;
  return CAPS.some((c) => c.t0 < s.t1 - 1e-6 && c.t1 > s.t0 + 1e-6) ? capBand(id) : null;
};
export const captioned = (id: ShotId) => bandOf(id) !== null;

// ── a box (the painted one, 657 x 615 picture px, standing on its bottom middle) and its label (356 x 178 picture px on the face)
const BP = (rig as unknown as { props: { box: { w: number; h: number; pivot: [number, number]; face: number[] } } }).props.box;
const LAB_H = (BP.face[2] - BP.face[0]) * 0.28; // the label's height, picture px
export const LAB_MID = BP.pivot[1] - (BP.face[1] + BP.face[3]) / 2 - 6; // where it sits by default: its centre this far above the box's bottom
/** a box in the frame: its bottom middle (x, y), k frame px per picture px, the turn in degrees, the row of the wall (< 0: the front row), and the label's height (its centre above the bottom, picture px; null: no label) */
export type Box = { x: number; y: number; k: number; rot: number; r: number; lab: number | null };
const MARGIN = 10; // px of air between a label and the captions' band
/** the label's rect in the frame at height h */
export const labRect = (b: { x: number; y: number; k: number }, h: number): [number, number, number, number] => [b.x - LAB_H * b.k, b.y - (h + LAB_H / 2) * b.k, b.x + LAB_H * b.k, b.y - (h - LAB_H / 2) * b.k];
/** the height of a box's label: the default one, or, when the shot's captions would be on it, the nearest height on the face that is clear of the band (higher, lower); null when the face has no such stretch */
export function labelFor(b: { x: number; y: number; k: number }, band: [number, number] | null): number | null {
  const lo = BP.pivot[1] - BP.face[3] + LAB_H / 2 + 18, hi = BP.pivot[1] - BP.face[1] - LAB_H / 2 - 18; // the label stays on the face with 18 px to spare
  const clear = (h: number) => { const [, y0, , y1] = labRect(b, h); return !band || y1 <= band[0] - MARGIN || y0 >= band[1] + MARGIN; };
  if (clear(LAB_MID)) return LAB_MID;
  for (let d = 4; d <= hi - lo; d += 4) for (const h of [LAB_MID + d, LAB_MID - d]) if (h >= lo && h <= hi && clear(h)) return h;
  return null;
}
/** a box (x, y: its bottom middle) has some of itself in the frame */
export const inFrame = (b: { x: number; y: number; k: number }) => b.x + (BP.w / 2) * b.k > 0 && b.x - (BP.w / 2) * b.k < W && b.y > 0 && b.y - BP.h * b.k < H;

// ── the garage's ending (41-49): a wall of PENS boxes to the ceiling (three columns, seven rows) and two columns two rows high under the poster, in plate px; Denise behind a front row of three boxes
const BXK = 0.157, ROWH = 548 * BXK; // plate px per box-picture px; a box stands on the face of the one under it
const jit = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const WALL = [
  ...Array.from({ length: 21 }, (_, i) => ({ r: Math.floor(i / 3), c: i % 3 })),
  ...[0, 1, 2, 3].map((i) => ({ r: i >> 1, c: 3 + (i & 1) })),
].map(({ r, c }, i) => ({ u: 52 + c * 103 + (jit(i + 3) - 0.5) * 4, v: 985 - r * ROWH + (jit(i + 40) - 0.5) * 2, rot: (jit(i + 80) - 0.5) * 2.4, r }));
export const BXK_PLATE = BXK;
export const DEN = { u: 215, v: 773, sc: 0.38 }; // Denise's neck pivot on the plate, and her scale (plate px per puppet px)
export const WIDE: V = { s: 1.4286, u0: 6, v0: 0 };
// Rhonda in the side door. The view is put where a row of the little stack of boxes under the poster ends in the middle of the captions' band (plate row 899 at frame y 1375): the box above keeps its label in the
// top of its face, the box below in the bottom of its face, none is blank
export const RHOV: V = { s: 2.8, u0: 382, v0: 408 };
const denView = (s: number, head: [number, number]): V => ({ s, u0: DEN.u - head[0] / s, v0: DEN.v - 173.4 * DEN.sc - head[1] / s });
/** Denise's close-ups: the scale of the view and where her head's middle is in the frame (shot 46 has her fist, with the pen, off the frame). The heads of 43 and 47 sit where the wall's rows leave every box a clear stretch of face for its label */
export const DEN_HEAD: Partial<Record<ShotId, { s: number; head: [number, number] }>> = { denClick: { s: 3.3, head: [430, 780] }, denEyes: { s: 5.0, head: [480, 800] }, denSwear: { s: 3.16, head: [500, 780] } };
export const ENDVIEW: Partial<Record<ShotId, V>> = {
  garageEnd: WIDE, wideEnd: WIDE, rhoPens: RHOV, rhoWall: RHOV, rhoCrack2: RHOV,
  ...Object.fromEntries(Object.entries(DEN_HEAD).map(([id, d]) => [id, denView(d!.s, d!.head)])),
};
/** every box of the garage's ending in the view m: the wall, then Denise's front row (r < 0); `band`: the shot's captions */
export function endBoxes(m: V, band: [number, number] | null): Box[] {
  const S = DEN.sc * m.s, ax = vx(m, DEN.u), ay = vy(m, DEN.v); // her neck pivot in the frame, and her scale
  const raw = [
    ...WALL.map((b) => ({ x: vx(m, b.u), y: vy(m, b.v), k: BXK * m.s, rot: b.rot, r: b.r })),
    ...[-405, 0, 405].map((dx, i) => ({ x: ax + dx * S, y: ay + 757 * S, k: 0.609 * S, rot: (i - 1) * 0.8, r: -1 - i })), // 400 puppet px wide each, the lids 383 puppet px below her neck
  ];
  return raw.map((b) => ({ ...b, lab: labelFor(b, band) }));
}

// ── the office: Denise behind the desk (its far edge is plate row 1022), at the scale E, her neck pivot `cut` puppet px above the edge; the box in her arms
export const DESK = 1022;
export type OffD = { m: V; E: number; cut: number; u: number; box?: boolean };
const OD: V = { s: 1.8, u0: 73, v0: 189 };
export const OFFD: Partial<Record<ShotId, OffD>> = {
  denResume: { m: OD, E: 1.2, cut: 520, u: 373 }, // her résumé above the captions
  denPockets: { m: OD, E: 1.2, cut: 430, u: 373 },
  boxCatch: { m: OD, E: 0.95, cut: 570, u: 373, box: true }, // her résumé above the captions
  denCount: { m: OD, E: 1.5, cut: 345, u: 373, box: true },
  denSure: { m: { s: 1.8, u0: 90, v0: 189 }, E: 1.5, cut: 345, u: 390, box: true },
  palletWide: { m: WIDE, E: 0.714, cut: 345, u: 373, box: true },
};
/** Denise's neck pivot in the frame (x, y) and her scale */
export const denAt = (d: OffD) => ({ x: vx(d.m, d.u), y: vy(d.m, DESK) - d.cut * d.E, scale: d.E });
/** the box in her arms at frame f: it falls in front of her, lands with a squash, sinks and jumps with her; its label is where the shot's captions are not (the same height all through the shot) */
export function heldBox(id: ShotId, f: number, band: [number, number] | null = bandOf(id)): Box | null {
  const d = OFFD[id];
  if (!d?.box) return null;
  const a = denAt(d), b = boxAt(f), up = joltAt(f).up, k = 0.6 * a.scale;
  const rest = { x: a.x + 6 * a.scale, y: a.y + 395 * a.scale, k };
  return { x: rest.x, y: rest.y + b.dip * 700 * a.scale - b.drop * 1500 - up * a.scale, k, rot: 0, r: 0, lab: labelFor(rest, band) };
}
/** every box that carries a label in the shot's frame f (the wall and the front row of the garage, the box in her arms); `avoid: false` leaves the labels where they sit by default (what the rule moves) */
export function boxesOf(id: ShotId, f: number, avoid = true): Box[] {
  const band = avoid ? bandOf(id) : null, m = ENDVIEW[id], held = heldBox(id, f, band);
  return m ? endBoxes(m, band) : held ? [held] : [];
}
/** every label that is on show in the shot's frame f, as a rect in the frame (x0, y0, x1, y1) */
export const labelRects = (id: ShotId, f: number, avoid = true): [number, number, number, number][] =>
  boxesOf(id, f, avoid).filter((b) => b.lab !== null).map((b) => labRect(b, b.lab!)).filter((r) => r[3] > 0 && r[1] < H);
/** the boxes that are in the frame and have no label: none may be */
export const blankBoxes = (id: ShotId, f: number): Box[] => boxesOf(id, f).filter((b) => b.lab === null && inFrame(b));

// ── shot 30: the card reader stands on the desk, big in the frame; the card comes in from the right edge (a hand off the frame holds it), so that at the tap its far end is on the frame's edge
export const READER = { x: 580, base: 1570, w: 700, h: 1176 };
export const CARD = { w: 500, h: 320, tapX: 830, tapY: 470, offX: 1400 };

// ── shot 45: the fine print. The line "*RESULTS NOT TYPICAL." ends the push in the middle of the frame, 920 px wide (letters about 85 px tall), and is held there
export const FINE = { w: 920, y: 960 };
