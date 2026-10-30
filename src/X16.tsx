import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, Label } from "./x16-ui";
import { FRAMES, shotAt } from "./x16-sched";
import { ART, SCENES } from "./x16-scenes";
import { MODE } from "./x16-shared";

// x16 "Hiring a Zoomer" (docs/x16-hiring-a-zoomer.md, the shot list v3 and the build spec): Ross interviews a zoomer who livestreams it and plants a red flag on every boss cliché; he plants them back, her mom joins the live with her terms, and the
// flag war grows until he blows. Then, desperate for staff, he hires her, and that gets a red flag too. Hard cuts, one scene per shot (src/x16-scenes.tsx), the shot chosen by the frame (src/x16-sched.ts SHOTS); the captions and the label POV: HIRING A
// ZOOMER are DOM over the canvas (src/x16-ui.tsx); the sound is mixed later (scripts/sp-mix.py, scripts/render-x16.sh) and muxed in, so the render is silent.
// No share line, no end card; the last shot (the ring light blazes, the frame blooms white) runs into the first (the reel loops). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X16_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X16: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
  MODE.cover = !!cover;
  const f = useCurrentFrame(), s = shotAt(f), Scene = SCENES[s.id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {animatic && !cover && <div style={{ position: "absolute", left: 24, top: 24, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>{`${s.i + 1} ${s.id}: ${ART[s.id]}`}</div>}
      {!noCaps && !cover && <Caption f={f} />}
      {cover ? <Cover /> : <Label f={f} />}
    </AbsoluteFill>
  );
};
