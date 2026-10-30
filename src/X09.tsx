import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover } from "./x09-ui";
import { FRAMES, shotAt } from "./x09-sched";
import { ART, SCENES } from "./x09-scenes";
import { FLAGS } from "./x09-shared";

// x09 "Habits of the Rich" (docs/x09-habits-of-the-rich.md, the build spec): at a get-rich seminar a guru in a gold suit sells the crowd ice baths and drinking their own pee; Ross snaps, takes the whiteboard and writes the real list, and
// line eleven is how the guru got rich; the crowd waves its cash at Ross, and Ross cannonballs into the ice. Hard cuts, one scene per shot (src/x09-scenes.tsx), the shot chosen by the frame (src/x09-sched.ts SHOTS); the sound is mixed later
// (scripts/sp-mix.py, scripts/render-x09.sh) and muxed in, so the render is silent. No share line, no end card. `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X09_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X09: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
  FLAGS.cover = !!cover;
  const f = useCurrentFrame(), s = shotAt(f), Scene = SCENES[s.id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {animatic && !cover && <div style={{ position: "absolute", left: 24, top: 24, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>{`${s.i + 1} ${s.id}: ${ART[s.id]}`}</div>}
      {!noCaps && <Caption f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
