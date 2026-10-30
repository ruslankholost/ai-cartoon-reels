import { makeStar } from "@remotion/shapes";
import { getLength, getPointAtLength, serializeInstructions } from "@remotion/paths";
import type { Pt } from "./sp-puppet";

// The star of x14 "Four Stars": the five-point star of @remotion/shapes (makeStar) with rounded tips, sampled once into a polygon of unit size (the tips are 1 from the middle, y up). The Three.js pieces (the golden star in the ring box, the dizzy
// stars, the big row of shot 19) draw it as a polygon, the review card draws the same outline as a Path2D, so that every star of the episode is one shape.
function build(inner: number, corner: number, n: number): Pt[] {
  const s = makeStar({ points: 5, innerRadius: inner, outerRadius: 1, cornerRadius: corner });
  const d = serializeInstructions(s.instructions);   // (the unreset path: the star's middle is at (1, 1), y down)
  const L = getLength(d);
  const raw = Array.from({ length: n }, (_, i) => { const p = getPointAtLength(d, (i / n) * L) as { x: number; y: number }; return [p.x - 1, 1 - p.y] as Pt; });
  const R = Math.max(...raw.map(([x, y]) => Math.hypot(x, y)));
  return raw.map(([x, y]) => [x / R, y / R] as Pt);
}
export const STAR_R: Pt[] = build(0.46, 0.12, 120);
/** the same outline as an SVG path string (y down), for a canvas */
export const STAR_PATH = "M " + STAR_R.map(([x, y]) => `${x.toFixed(4)} ${(-y).toFixed(4)}`).join(" L ") + " Z";
