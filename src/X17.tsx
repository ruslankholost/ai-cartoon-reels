import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, Label } from "./x17-ui";
import { FRAMES, shotAt } from "./x17-sched";
import { ART, SCENES } from "./x17-scenes";
import { MODE } from "./x17-shared";

// x17 "Seat Swap" (docs/x17-seat-swap.md, the shot list v3 and the build spec): Ross paid extra for window seat 12A and says yes when a honeymoon couple asks him to swap; a support peacock takes his middle seat, the flight attendant opens the exit for
// him and charges him for the legroom on the wing; he blows, the pilot sits down next to him for the legroom and hands him the plane, and the couple pops up again. Hard cuts, one scene per shot (src/x17-scenes.tsx), the shot chosen by the frame
// (src/x17-sched.ts SHOTS); the captions and the label POV: SEAT SWAP are DOM over the canvas (src/x17-ui.tsx); the sound is mixed later (scripts/sp-mix.py, scripts/render-x17.sh) and muxed in, so the render is silent.
// No share line, no end card; the last shot (the couple pops up behind his headrest) runs into the first (he drops into 12A again). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X17_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X17: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
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
