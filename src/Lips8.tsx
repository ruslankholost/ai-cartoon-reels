import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, MorningCard } from "./lips8-ui";
import { FRAMES, shotAt } from "./lips8-sched";
import { SCENES } from "./lips8-scenes";

// "Cold Lips" v8 (docs/x06-cold-lips.md, Script v8): she throws her coffee at Denise, threatens a bad review, wants her money and a tip she never left back, Todd hands her Denise's tips, Denise explodes, "Anything? Then rub my
// feet.", she melts and still posts one star: "Cold hands."; the next morning she sips the usual, snaps purple and winds up to throw, and the reel loops into the first frame. The South Park puppets of v2, hard cuts, one scene per
// shot (src/lips8-scenes.tsx), the shot chosen by the frame (src/lips8-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py, scripts/render-lips8.sh) and muxed in, so the render is silent. No share line, no end card.
export const LIPS8_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const Lips8: React.FC<{ noCaps?: boolean; cover?: boolean }> = ({ noCaps, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENES[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {shotAt(f).id === "morning" && <MorningCard f={f} />}
      {!noCaps && <Caption f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
