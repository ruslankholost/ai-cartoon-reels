import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Grain } from "./sp-fx";
import { Caption, Cover, ShareLine } from "./tup-ui";
import { FRAMES, projectorAt, shotAt } from "./tup-sched";
import { SCENES } from "./tup-scenes";

// "I'm Just Supporting a Friend" (docs/x05-supporting-a-friend.md): the garage in colour, the Tupperware story in sepia (a filter, heavier grain, a vignette, the projector's flicker, one flicker into the past), in
// the South Park puppet look, hard cuts, one scene per shot (src/tup-scenes.tsx, src/tup-story.tsx). The shot is chosen by the frame (src/tup-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py from
// scratch/cues.json, scripts/render-tup.sh) and muxed in, so the render is silent. No end card: the last shot carries the share line (Ross 10-20).
export const TUP_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };
const VIGNETTE: React.CSSProperties = { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" };
/** one shot with the story's look: a sepia filter on the story's shots (the brightness flickers like a projector's lamp). The transition into the past is a flicker with the colour draining into sepia over the dive's last 0.15 s
 * (src/tup-sched.ts projectorAt); no frame of it is black */
const Look: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const { sepia, bright } = projectorAt(f);
  const style: React.CSSProperties = { ...full };
  if (sepia > 0 || bright !== 1) style.filter = `sepia(${(0.9 * sepia).toFixed(3)}) contrast(${(1 + 0.1 * sepia).toFixed(3)}) saturate(${(1 + 0.2 * sepia).toFixed(3)}) brightness(${bright.toFixed(3)})`;
  return <div style={style}>{children}{sepia > 0 && <div style={{ ...VIGNETTE, opacity: sepia }} />}</div>;
};

export const Tup: React.FC<{ noCaps?: boolean; noShare?: boolean; cover?: boolean }> = ({ noCaps, noShare, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENES[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Look f={f}><Scene f={f} /></Look>
      <Grain f={f} on amount={0.11 + 0.13 * projectorAt(f).sepia} />
      {!noCaps && <Caption f={f} />}
      {!noShare && <ShareLine f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
