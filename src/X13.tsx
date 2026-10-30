import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover } from "./x13-ui";
import { FRAMES, shotAt } from "./x13-sched";
import { ART, SCENES } from "./x13-scenes";
import { FLAGS } from "./x13-shared";

// x13 "Cheaper" (docs/x13-cheaper.md, the build spec): Chuck spits out his coffee at the price on the till's display and Ross, smiling through it, cuts it to free, pays him five and hands him the shop; behind the counter Chuck charges twelve, and when Ross spits it out he makes it thirteen.
// Hard cuts, one scene per shot (src/x13-scenes.tsx), the shot chosen by the frame (src/x13-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py, scripts/render-x13.sh) and muxed in, so the render is silent.
// No share line, no end card; the last shot runs into the first (the reel loops). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X13_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X13: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
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
