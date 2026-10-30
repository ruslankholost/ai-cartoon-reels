import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, Label } from "./x19-ui";
import { FRAMES, NO, shotAt } from "./x19-sched";
import { ART, SCENES } from "./x19-scenes";
import { MODE } from "./x19-shared";

// x19 "Screen Time" (docs/x19-screen-time.md, the shot list v3 and the build spec), Part 2 of x18 "Unattended": the mom is back in Ross's café and her toddler's tablet plays a kids' song at full volume. Every polite fix Ross tries makes her bring a bigger
// screen: the stroller's canopy is a TV, and the whole café stares at it like the toddler. Ross dims the lights and sells popcorn; when the battery dies at 1% and the silence is worse than the noise, he sells her a charger ("Six fifty.") and it starts
// again. Ross never blows up in this one: the hurricane in shot 2 is the song's force, and he keeps a polite smile. Hard cuts, one scene per shot (src/x19-scenes.tsx), the shot chosen by the frame (src/x19-sched.ts SHOTS); the captions and the label
// POV: YOU OWN A CAFÉ / PART 2 are DOM over the canvas (src/x19-ui.tsx); the sound is mixed later (scripts/sp-mix.py, scripts/render-x19.sh) and muxed in, so the render is silent. No share line, no end card; the last shot (the plug goes in, the TV's volume
// overlay slams to MAX) runs into the first (the tablet's overlay slams to MAX). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X19_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X19: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
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
