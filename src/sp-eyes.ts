// Where a pupil goes when it looks along g (-1..1 of its travel; x right, y down, px of the source picture), for the puppets and the crowd.
// The move starts at the drawn pupil p, which sits off the eye's centre (South Park pupils lean in toward the nose), but the travel is measured
// from the eye's centre: the pupil's centre stays in the ellipse that keeps a pupil of radius r at least m px inside rx/ry. A pupil that does
// not look stays on its drawn spot. scripts/eyes-check.mts holds every rig to this.
export type EyeBox = { cx: number; cy: number; rx: number; ry: number };
export function pupilAt(e: EyeBox, p: [number, number], r: number, g: [number, number], m: number): [number, number] {
  const ax = Math.max(0.01, e.rx - r - m), ay = Math.max(0.01, e.ry - r - m);
  let x = p[0] - e.cx + g[0] * ax, y = p[1] - e.cy + g[1] * ay;
  const s = Math.hypot(x / ax, y / ay);
  if (s > 1) { x /= s; y /= s; }
  return [e.cx + x, e.cy + y];
}
