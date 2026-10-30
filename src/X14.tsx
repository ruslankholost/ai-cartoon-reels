import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover } from "./x14-ui";
import { FRAMES, shotAt } from "./x14-sched";
import { ART, SCENES } from "./x14-scenes";
import { FLAGS } from "./x14-shared";

// x14 "Four Stars" (docs/x14-four-stars.md, the build spec): Chuck gives Ross's coffee four stars, and Ross, for whom four stars is one star with manners, goes from a free latte to a marriage proposal to a dive over the counter to get the fifth.
// He gets it, and Chuck changes it to three: "Owner tackled me."
// Hard cuts, one scene per shot (src/x14-scenes.tsx), the shot chosen by the frame (src/x14-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py, scripts/render-x14.sh) and muxed in, so the render is silent.
// No share line, no end card; the last shot runs into the first (the reel loops). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X14_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X14: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
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
