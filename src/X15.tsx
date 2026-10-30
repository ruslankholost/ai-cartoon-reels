import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Counter, Cover, Payout, Pops } from "./x15-ui";
import { FRAMES, shotAt } from "./x15-sched";
import { ART, SCENES, payoutAnchor, popAnchor } from "./x15-scenes";
import { FLAGS } from "./x15-shared";

// x15 "Bleep Fee" (docs/x15-bleep-fee.md, the shot list v3 and the build spec): Ross rants to the viewers about everybody trying to scam him; every swear is bleeped, a pixel mosaic covers his mouth and each bleep costs double the last.
// The bleep guy next to him hands him the bill. Hard cuts, one scene per shot (src/x15-scenes.tsx), the shot chosen by the frame (src/x15-sched.ts SHOTS); the pops, the counter and the captions are DOM over the canvas (src/x15-ui.tsx);
// the sound is mixed later (scripts/sp-mix.py, scripts/render-x15.sh) and muxed in, so the render is silent.
// No share line, no end card; the last shot runs into the first (the reel loops). `animatic`: a debug label (the shot's number and name) in the corner; off in the render.
export const X15_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X15: React.FC<{ noCaps?: boolean; cover?: boolean; animatic?: boolean }> = ({ noCaps, cover, animatic = false }) => {
  FLAGS.cover = !!cover;
  const f = useCurrentFrame(), s = shotAt(f), Scene = SCENES[s.id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      <div style={full}>
        <Pops f={f} at={popAnchor} />
        <Payout f={f} at={payoutAnchor()} />
        <Counter f={f} settled={!!cover} />
      </div>
      {animatic && !cover && <div style={{ position: "absolute", left: 24, top: 24, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700, color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>{`${s.i + 1} ${s.id}: ${ART[s.id]}`}</div>}
      {!noCaps && <Caption f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
