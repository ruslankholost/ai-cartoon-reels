import React from "react";
import { Panel } from "./sp-puppet";
import { H, W, focusOn } from "./pen-stage";
import { holdPush, shakeAt } from "./x13-sched";

// What the scenes of x13 (src/x13-scenes.tsx) share: the shot's canvas with the camera's zoom (src/x13-sched.ts holdPush) about a focus, and the shake of the hits on a group.
export { W, H };
/** set by the composition before its scene renders: the cover shows nothing yet (the cover has no flag in x13) */
export const FLAGS = { cover: false };
/** the camera's shake on a group (frame px of src/x13-sched.ts shakeAt) */
export function Shake({ f, children }: { f: number; children: React.ReactNode }) {
  const [sx, sy] = shakeAt(f);
  return <group position={[sx, sy, 0]}>{children}</group>;
}
/** a shot: its canvas, the zoom of the shot about a frame point, the scene inside (shaken by the hits); every scene that loads pictures is made by this (the shape of src/x08-shared.tsx shotX) */
export const shotX = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Shake f={f}><Inner f={f} /></Shake></Panel>
);
