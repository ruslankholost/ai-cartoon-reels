// Where a pupil stands against the lid. A half-closed eye shows its pupil only if the whole pupil sits below the lid's edge: its centre at least a radius below the line, or the eye reads as blank white. The
// lid is drawn by src/sp-puppet.tsx lidPts (the lid line cuts the eye's outline at the height that `lid` says, and its lower edge sags in the middle); this file repeats that curve in numbers so that the
// pose (src/pen-sched.ts poseAt) can keep every pupil clear of it and scripts/pen-check.mts can hold every frame to it. Pure arithmetic on src/pen-rig.json.
import rig from "./pen-rig.json" with { type: "json" };
import { pupilAt } from "./sp-eyes.ts";

type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
const RIG = rig as unknown as Record<string, { eyes?: Eye[]; pupils: number[][] }>;

/** the picture y (down) of the lid's lowest edge at picture x, for eye e shut by `lid` (0..1 of the eye's height from the top): the curve of lidPts */
export function lidEdge(e: Eye, lid: number, x: number): number {
  const poly = e.lid.map(([px, py]) => [px - e.cx, e.cy - py]);
  const top = Math.max(...poly.map((p) => p[1])), bot = Math.min(...poly.map((p) => p[1])), yc = top - (top - bot) * lid;
  const xs: number[] = [];
  poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; if ((a[1] >= yc) !== (b[1] >= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); });
  const x0 = Math.min(...xs), x1 = Math.max(...xs), hw = (x1 - x0) / 2, u = Math.max(-1, Math.min(1, (x - e.cx - (x0 + x1) / 2) / hw));
  return e.cy - (yc - 0.16 * hw * (1 - u * u));
}
/** how far (picture px) pupil i of `char` clears the lid for this lid, gaze and pupil size: >= 0 means the whole pupil is below the lid's edge (its centre at least a radius below it) */
export function clearance(char: string, i: number, lid: number, gaze: [number, number], pupil: number): number {
  const R = RIG[char], e = R.eyes![i], q = R.pupils[i];
  const [x, y] = pupilAt(e, [q[0], q[1]], q[2], gaze, 6);
  return y - lidEdge(e, lid, x) - q[2] * pupil;
}
/** the gaze (and, when even the lowest look hides a pupil, the lid) moved just far enough that every pupil is below the lid: first the eyes look lower, then the lid opens. A shut or shutting eye is left alone */
export function fitEyes(char: string, lid: number, gaze: [number, number], pupil: number): { lid: number; gaze: [number, number] } {
  const n = RIG[char]?.eyes?.length ?? 0;
  if (!n || lid <= 0 || lid >= 0.9) return { lid, gaze };
  const clear = (l: number, g: [number, number]) => Array.from({ length: n }, (_, i) => clearance(char, i, l, g, pupil)).every((c) => c >= 2); // 2 px of white between the lid and the pupil
  for (let l = lid; l > 0; l -= 0.02) for (let gy = gaze[1]; gy <= 1.0001; gy += 0.02) if (clear(l, [gaze[0], gy])) return { lid: l, gaze: [gaze[0], Math.min(1, gy)] };
  return { lid: 0, gaze };
}
