import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, Label } from "./x18-ui";
import { FRAMES, NO, shotAt } from "./x18-sched";
import { ART, SCENES } from "./x18-scenes";
import { MODE } from "./x18-shared";

// x18 "Unattended" (docs/x18-unattended.md, the shot list v3 and the build spec): Ross owns a café. A mom scrolls while her toddler pours oat milk into the till and her daughter licks the pastry case; he tapes up the famous sign (an espresso and a
// free puppy), she reads it as free daycare and tells the other moms, and the kids chant for the puppy. He serves the espresso first and flips the sign to NOW HIRING; the wired kids clean the café and he puts his feet up. An hour later the mom is
// back and her toddler charges her for a coffee ("Six fifty."); Ross gives her excuse back ("He was exploring."). Ross never blows up in this one. Hard cuts, one scene per shot (src/x18-scenes.tsx), the shot chosen by the frame (src/x18-sched.ts
// SHOTS); the captions and the label POV: YOU OWN A CAFÉ are DOM over the canvas (src/x18-ui.tsx); the sound is mixed later (scripts/sp-mix.py, scripts/render-x18.sh) and muxed in, so the render is silent. No share line, no end card; the last
// shot (the toddler tips the oat milk over the till again) runs into the first (the drawer springs open, the milk pours in). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X18_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X18: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
  MODE.cover = !!cover;
  const f = useCurrentFrame(), s = shotAt(f), Scene = SCENES[s.id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {animatic && !cover && <div style={{ position: "absolute", left: 24, top: 24, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>{`${NO[s.id]} ${s.id}: ${ART[s.id]}`}</div>}
      {!noCaps && !cover && <Caption f={f} />}
      {cover ? <Cover /> : <Label f={f} />}
    </AbsoluteFill>
  );
};
