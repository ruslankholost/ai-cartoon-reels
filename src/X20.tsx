import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, ClockReadout, Cover, Label } from "./x20-ui";
import { FRAMES, NO, shotAt } from "./x20-sched";
import { ART, SCENES } from "./x20-scenes";
import { MODE } from "./x20-shared";

// x20 "One Coffee" (docs/x20-one-coffee.md, the shot list v2 and the build spec): a guy buys one small drip at eight and is still on his laptop at three; every polite hint Ross drops gets an answer ("I bought a coffee.", "Who?"); the "someone" who might want the table
// turns out to be three more of him, and by evening the startup is sold for forty million at Ross's tables, and he asks whether refills are free. Ross never blows up in this one: he is polite, flat and dry, and under the champagne he keeps the polite smile. Hard cuts,
// one scene per shot (src/x20-scenes.tsx), the shot chosen by the frame (src/x20-sched.ts SHOTS); the captions, the label POV: YOU OWN A CAFÉ and the readout of the wall clock in shot 2 are DOM over the canvas (src/x20-ui.tsx); the sound is mixed later
// (scripts/sp-mix.py, scripts/render-x20.sh) and muxed in, so the render is silent. No share line, no end card; the last shot (his hand slaps coins on the counter) runs into the first (his hand slaps coins on the counter). `animatic`: a debug label (the shot's
// number and name) in the corner; off in the render.
export const X20_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X20: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
  MODE.cover = !!cover;
  const f = useCurrentFrame(), s = shotAt(f), Scene = SCENES[s.id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {animatic && !cover && <div style={{ position: "absolute", left: 24, top: 24, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>{`${NO[s.id]} ${s.id}: ${ART[s.id]}`}</div>}
      {!cover && s.id === "clock" && <ClockReadout f={f} />}
      {!noCaps && !cover && <Caption f={f} />}
      {cover ? <Cover /> : <Label f={f} />}
    </AbsoluteFill>
  );
};
