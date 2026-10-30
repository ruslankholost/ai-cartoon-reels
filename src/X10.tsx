import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover } from "./x10-ui";
import { FRAMES, shotAt } from "./x10-sched";
import { ART, SCENES } from "./x10-scenes";
import { FLAGS } from "./x10-shared";

// x10 "My Own Business" (docs/x10-my-own-business.md, the build spec): Ross opens his own coffee shop with dollar signs in his eyes; from then on everybody needs something from him until the till holds one quarter and the tax office takes that too;
// then, at 5 pm, a guy walks home from his job, whistling. Hard cuts, one scene per shot (src/x10-scenes.tsx), the shot chosen by the frame (src/x10-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py, scripts/render-x10.sh) and muxed in,
// so the render is silent. No share line, no end card; the last shot runs into the first (the reel loops). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X10_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X10: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
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
