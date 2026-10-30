// The pupils that src/x20-cast.tsx EyeDots draws over a painted face of x20 "One Coffee" (the camper looking up and out at the room, the sheepish guy looking down), as plain arithmetic so that scripts/eyes-check.mts holds the render to the same numbers: a dot of the painted pupil's size
// travels from the painted pupil's own spot to where `look` says, and stays inside the eye's white; the disc of the white that covers the painted pupil is the pupil's disc cut to the eye's oval. Picture px, y down. An eye's rx and ry run to the middle of an outline 1.5 px past the white
// (scripts/x20-prep.py): the white ends 1.5 px inside them.
export type Eye = { cx: number; cy: number; rx: number; ry: number };
export type V = [number, number];
/** a point pulled into an eye's oval (the oval shrunk by `shrink` px) */
export const inEye = (e: Eye, x: number, y: number, shrink: number): V => {
  const rx = Math.max(1, e.rx - shrink), ry = Math.max(1, e.ry - shrink), s = Math.hypot((x - e.cx) / rx, (y - e.cy) / ry);
  return s > 1 ? [e.cx + (x - e.cx) / s, e.cy + (y - e.cy) / s] : [x, y];
};
/** where the dot of radius `r` is: `look` (-1 .. 1 across and down the white) is where it goes at `mix` 1, at `mix` 0 it is on the painted pupil's own spot q */
export const dotAt = (e: Eye, q: number[], look: V, mix: number, r: number): V => {
  const [tx, ty] = inEye(e, e.cx + look[0] * (e.rx - r - 4), e.cy + look[1] * (e.ry - r - 4), r + 3);
  return [q[0] + (tx - q[0]) * mix, q[1] + (ty - q[1]) * mix];
};
/** the cover of the painted pupil: its disc (a little bigger) cut to the white */
export const coverPts = (e: Eye, q: number[], n = 24): V[] => Array.from({ length: n }, (_, j) => { const t = (j / n) * Math.PI * 2; return inEye(e, q[0] + (q[2] + 3.5) * Math.cos(t), q[1] + (q[2] + 3.5) * Math.sin(t), 1.5); });
