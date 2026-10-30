import React from "react";
import { Panel } from "./sp-puppet";
import { H, W, focusOn } from "./pen-stage";
import { holdPush, shakeAt, shotAt } from "./x15-sched";

// What the scenes of x15 (src/x15-scenes.tsx) share: the shot's canvas with the camera's zoom (src/x15-sched.ts holdPush) about a focus, the shake of the hits on a group, and the way back from a point of the scene to the frame (the red
// pops and the counter are DOM over the canvas: they must start on the mosaic's place after the zoom and the shake).
export { W, H };
/** set by the composition before its scene renders: the cover shows nothing yet */
export const FLAGS = { cover: false };
/** the camera's shake on a group (frame px of src/x15-sched.ts shakeAt) */
export function Shake({ f, children }: { f: number; children: React.ReactNode }) {
  const [sx, sy] = shakeAt(f);
  return <group position={[sx, sy, 0]}>{children}</group>;
}
/** a shot: its canvas, the zoom of the shot about a frame point, the scene inside (shaken by the hits); every scene that loads pictures is made by this (the shape of src/x14-shared.tsx shotX) */
export const shotX = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Shake f={f}><Inner f={f} /></Shake></Panel>
);
/** where a point of the scene (frame px, before the camera) is in the finished frame of frame f: the camera's zoom about the shot's focus and the shake of the hits */
export function toView(f: number, focus: [number, number], p: [number, number]): [number, number] {
  const z = holdPush(f), [sx, sy] = shakeAt(f);
  return [focus[0] + z * (p[0] + sx - focus[0]), focus[1] + z * (p[1] - sy - focus[1])];
}
export { shotAt };
