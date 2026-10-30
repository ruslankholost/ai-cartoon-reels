import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Grain } from "./sp-fx";
import { Caption, Cover, ShareLine } from "./pen-ui";
import { FRAMES, shotAt } from "./pen-sched";
import { SCENES } from "./pen-scenes";

// "I'm Just Not a Sales Person" v2, the satire cut (docs/x04-sell-me-this-pen.md): 29 shots in the South Park puppet look, hard cuts, one scene per shot (src/pen-scenes.tsx). The shot is chosen by the frame
// (pen-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py from scratch/cues.json, scripts/render-pen.sh) and muxed in, so the render is silent. No end card: the last shot carries the share line
// (Ross 10-20). A light film grain over everything. The story of v1 (the sepia shots, the projector's iris) is the Tup episode now (src/Tup.tsx, docs/x05).
export const PEN_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const Pen: React.FC<{ noCaps?: boolean; noShare?: boolean; cover?: boolean }> = ({ noCaps, noShare, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENES[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      <Grain f={f} on amount={0.11} />
      {!noCaps && <Caption f={f} />}
      {!noShare && <ShareLine f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
